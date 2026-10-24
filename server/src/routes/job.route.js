import express from "express";
import { db, FieldValue } from "../firebaseadmin/firebaseadmin.js";
import axios from "axios";
import { checkJwt } from "../auth/authMiddleware.js";
import ngeohash from "ngeohash";
const router = express.Router();

router.post("/", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { description, amount, time, location, category, recommendation } = req.body;

    if (!amount || !time || !location || !category) {
      return res.status(400).json({ message: "Missing fields" });
    }
    const lat = Number(location?.lat);
    const lng = Number(location?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid location" });
    }

    const parsedAmount = Number(amount);
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: "Amount must be a positive whole number" });
    }

    // 1. Generate the document ID first so we can use it for both Job and Chat simultaneously
    const jobRef = db.collection("jobs").doc();
    const geohash = ngeohash.encode(lat, lng, 4);
    const geohash6 = ngeohash.encode(lat, lng, 6);

    // 2. Save the Job and create the Chat Room in PARALLEL (much faster)
    await Promise.all([
      jobRef.set({
        description: description || "",
        amount: Number(amount),
        time,
        category,
        recommendation: recommendation || null,
        geohash,
        geohash6,
        location,
        employerId: userId,
        status: "OPEN",
        createdAt: new Date(),
      }),
      db.collection("jobChats").doc(jobRef.id).set({
        participants: [userId],
        closed: false,
        createdAt: new Date(),
      })
    ]);

    // 3. Respond to the user IMMEDIATELY. UI stays fast and snappy.
    res.json({
      success: true,
      job: { id: jobRef.id },
      message: "Job posted! AI is enriching the description in the background."
    });

    // 4. Fire-and-Forget the AI Agent (runs in the background)
    // Notice we dropped the 'await' from the outer IIFE (Immediately Invoked Function Expression)
    (async () => {
      try {
        const pyAgentUrl = process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000";
        const aiResponse = await axios.post(`${pyAgentUrl}/process-job`, {
          jobId: jobRef.id,
          description: description || "",
          category: category,
          location: `${location.lat}, ${location.lng}`,
          amount: Number(amount),
          time: time,
          recommendation: recommendation || null
        });

        const aiData = aiResponse.data;

        if (aiData.status === "success") {
          // Update Job with proper VECTOR format and create feedback form
          await Promise.all([
            jobRef.update({
              // 🔥 CRITICAL FIX: Wrap the array in FieldValue.vector()
              job_embedding: FieldValue.vector(aiData.job_embedding),
              enriched_description: aiData.enriched_description,
              // 🆕 Graph RAG: Store extracted skills for graph-match
              extracted_skills: aiData.extracted_skills || null
            }),
            db.collection("jobFeedback").doc(jobRef.id).set({
              jobId: jobRef.id,
              employerId: userId,
              workerId: null,
              questions: aiData.feedback_form.map(q => ({ ...q, answer: null })),
              createdAt: new Date()
            })
          ]);
          console.log(`AI Processing complete for Job ${jobRef.id}`);
        }
      } catch (agentError) {
        console.error("Error calling Python AI Agent:", agentError.message);
      }
    })(); // Execute the background task

  } catch (err) {
    console.error(err);
    // Ensure we only send an error response if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to create job" });
    }
  }
});


router.get("/nearby", async (req, res) => {
  try {
    console.log(req)
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);

    console.log(lat, lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    const centerHash = ngeohash.encode(lat, lng, 4);

    const neighbors = ngeohash.neighbors(centerHash);
    const hashes = [centerHash, ...neighbors];

    const jobs = [];


    for (const hash of hashes) {
      const snap = await db
        .collection("jobs")
        .where("geohash", "==", hash)
        .where("status", "==", "OPEN")
        .get();

      snap.docs.forEach((doc) => {
        jobs.push({ id: doc.id, ...doc.data() });
      });
    }
    console.log(jobs);
    res.json({ jobs });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch nearby jobs" });
  }
});

// Helper: Haversine distance in km
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Helper: Cosine Similarity
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

router.get("/recommendations", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const timeFilter = req.query.time;
    const minPrice = req.query.minPrice ? Number(req.query.minPrice) : 0;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({ message: "Invalid coordinates" });
    }

    // 1. Fetch User Profile
    const userSnap = await db.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: "User profile not found" });
    }
    const userData = userSnap.data();
    const workerCategories = userData.workerCategories || [];
    const masterStringEmbedded = userData.master_string_embedded?.toArray
      ? userData.master_string_embedded.toArray()
      : userData.master_string_embedded;

    if (workerCategories.length === 0) {
      return res.json({ jobs: [] });
    }

    // 2. Fetch Jobs dynamically via geohash6 (🔥 OPTIMIZED READ)
    const centerHash = ngeohash.encode(lat, lng, 6);
    const neighbors = ngeohash.neighbors(centerHash);
    const hashes = [centerHash, ...neighbors]; // Exactly 9 hashes

    // 🔥 PRE-FILTER Note: Firestore limits 'in' queries to 10 items maximum.
    // MORE IMPORTANTLY: Firestore ONLY ALLOWS ONE 'in' or 'array-contains-any' clause per query!
    // Since we are already using an 'in' clause for geohash6, we CANNOT use another 'in' clause for category.
    // Therefore, category filtering MUST remain in-memory.
    let query = db.collection("jobs")
      .where("status", "==", "OPEN")
      // Fetch all 9 neighboring boxes in a single database round-trip (acts as our 1 allowed 'in' clause)
      .where("geohash6", "in", hashes);

    const snapResult = await query.get();

    const jobsMap = new Map();
    snapResult.docs.forEach(doc => {
      jobsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });

    // 3. Apply Strict Filters & Distance/Vector Scoring
    const filteredJobs = [];
    for (const job of jobsMap.values()) {

      // Exclude jobs created by the requesting user themselves
      if (job.employerId === userId) continue;

      // Category Match (Always needed because we can't pre-filter it in Firestore)
      if (!workerCategories.includes(job.category)) continue;

      // Time Filter Match (if provided and not "Flexible")
      if (timeFilter && timeFilter !== "" && timeFilter !== "Flexible") {
        if (job.time !== timeFilter) continue;
      }

      // Budget Match
      if (job.amount < minPrice) continue;

      // Distance Calculation (Haversine)
      const distKm = getDistanceFromLatLonInKm(lat, lng, job.location.lat, job.location.lng);

      // Similarity
      let similarity = 0;
      if (masterStringEmbedded && job.job_embedding) {
        const jobVec = job.job_embedding.toArray ? job.job_embedding.toArray() : job.job_embedding;
        similarity = cosineSimilarity(masterStringEmbedded, jobVec);
      }

      filteredJobs.push({
        ...job,
        distance: distKm,
        similarityScore: similarity
      });
    }

    // 4. Sort: Nearest First. If distance is very similar (< 1km diff), rank by similarity
    filteredJobs.sort((a, b) => {
      const distDiff = a.distance - b.distance;
      // if distance is roughly the same (within 2km), use AI similarity to break the tie
      if (Math.abs(distDiff) < 2) {
        return b.similarityScore - a.similarityScore; // Higher similarity first
      }
      return distDiff; // Nearest distance first
    });

    res.json({ jobs: filteredJobs });
  } catch (err) {
    console.error("Recommendations error:", err);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
});

router.get("/my", checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;

  const snap = await db
    .collection("jobs")
    .where("employerId", "==", userId)
    .orderBy("createdAt", "desc")
    .get();

  const jobs = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  res.json({ jobs });
});

router.get("/:jobId/match-workers", checkJwt, async (req, res) => {
  try {
    const employerId = req.auth.payload.sub;
    const { jobId } = req.params;

    // 1. Fetch the Job details
    const jobSnap = await db.collection("jobs").doc(jobId).get();
    if (!jobSnap.exists) {
      return res.status(404).json({ message: "Job not found" });
    }
    const jobData = jobSnap.data();

    // Only allow employer to match workers
    if (jobData.employerId !== employerId) {
      return res.status(403).json({ message: "Unauthorized: You are not the owner of this job." });
    }

    const jobCategory = jobData.category;
    let jobEmbedding = jobData.job_embedding?.toArray
      ? jobData.job_embedding.toArray()
      : jobData.job_embedding;

    if (!jobEmbedding) {
      console.warn(`Job ${jobId} doesn't have an embedding yet.`);
      jobEmbedding = null;
    }

    // 🆕 Graph RAG: Try graph-match first, fallback to old vector scoring
    const jobSkillIds = jobData.extracted_skills?.skills?.map(s => s.skill_id) || [];
    const pyAgentUrl = process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000";

    let graphWorkers = [];
    if (jobSkillIds.length > 0) {
      try {
        const graphRes = await axios.post(`${pyAgentUrl}/graph-match`, {
          job_id: jobId,
          job_description: jobData.enriched_description || jobData.description || jobData.category || '',
          job_skill_ids: jobSkillIds,
          employer_id: employerId,
          lat: jobData.location?.lat || 0,
          lng: jobData.location?.lng || 0,
          radius_km: 10.0
        });
        graphWorkers = graphRes.data?.candidates || [];
      } catch (graphErr) {
        console.warn('[Graph Match] Failed, falling back to vector scoring:', graphErr.message);
      }
    }

    // If graph returned candidates, enrich them with Firestore profile data
    if (graphWorkers.length > 0) {
      const enrichedWorkers = [];
      for (const gw of graphWorkers) {
        const wSnap = await db.collection("users").doc(gw.worker_id).get();
        if (!wSnap.exists) continue;
        const wData = wSnap.data();
        enrichedWorkers.push({
          id: gw.worker_id,
          name: wData.name,
          picture: wData.picture,
          completedJobs: wData.completedJobs || 0,
          rating: wData.rating || 0,
          description: wData.description || "",
          similarityScore: gw.confidence || 0,
          match_reason: gw.match_reason || "",
          confidence: gw.confidence || 0,
        });
      }
      return res.json({ workers: enrichedWorkers });
    }

    // FALLBACK: Old vector scoring (if graph has no data yet)
    const workersSnap = await db.collection("users")
      .where("interestedToWork", "==", true)
      .where("workerCategories", "array-contains", jobCategory)
      .get();

    const scoredWorkers = [];
    workersSnap.docs.forEach(doc => {
      const workerId = doc.id;
      if (workerId === employerId) return;

      const wData = doc.data();
      const wEmbedding = wData.master_string_embedded?.toArray
        ? wData.master_string_embedded.toArray()
        : wData.master_string_embedded;

      let score = 0;
      if (jobEmbedding && wEmbedding) {
        score = cosineSimilarity(jobEmbedding, wEmbedding);
      } else {
        score = 0.1;
      }

      scoredWorkers.push({
        id: workerId,
        name: wData.name,
        picture: wData.picture,
        completedJobs: wData.completedJobs || 0,
        rating: wData.rating || 0,
        description: wData.description || "",
        similarityScore: score
      });
    });

    scoredWorkers.sort((a, b) => b.similarityScore - a.similarityScore);
    res.json({ workers: scoredWorkers });

  } catch (err) {
    console.error("Match workers error:", err);
    res.status(500).json({ message: "Failed to match workers" });
  }
});

router.get("/:jobId/feedback-form", checkJwt, async (req, res) => {
  try {
    const { jobId } = req.params;
    const docSnap = await db.collection("jobFeedback").doc(jobId).get();
    if (!docSnap.exists) {
      return res.status(404).json({ message: "Feedback form not found for this job." });
    }
    const data = docSnap.data();
    res.json({ questions: data.questions || [] });
  } catch (err) {
    console.error("Fetch feedback form error:", err);
    res.status(500).json({ message: "Failed to fetch feedback form" });
  }
});

router.post("/:jobId/close-and-rate", checkJwt, async (req, res) => {
  try {
    const employerId = req.auth.payload.sub;
    const { jobId } = req.params;
    const { ratings, workerId, pairedQuestions } = req.body;

    if (!ratings || ratings.length !== 3) {
      return res.status(400).json({ message: "Invalid payload. Expected 3 ratings." });
    }
    if (!workerId) {
      return res.status(400).json({ message: "Missing workerId in payload." });
    }

    const jobRef = db.collection("jobs").doc(jobId);
    const jobSnap = await jobRef.get();
    if (!jobSnap.exists) {
      return res.status(404).json({ message: "Job not found" });
    }
    const jobData = jobSnap.data();

    if (jobData.employerId !== employerId) {
      return res.status(403).json({ message: "Unauthorized: Only the employer can close & rate." });
    }
    if (jobData.status === "CLOSED") {
      return res.status(400).json({ message: "Job is already closed." });
    }

    const fbSnap = await db.collection("jobFeedback").doc(jobId).get();
    const questions = fbSnap.exists ? fbSnap.data().questions.map(q => q.question || q) : ["Rating 1", "Rating 2", "Rating 3"];

    await Promise.all([
      jobRef.update({ status: "CLOSED" }),
      db.collection("jobChats").doc(jobId).update({ closed: true })
    ]);

    const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
    const workerRef = db.collection("users").doc(workerId);

    await db.runTransaction(async (transaction) => {
      const workerSnap = await transaction.get(workerRef);
      if (!workerSnap.exists) return;

      const wData = workerSnap.data();
      let currentRating = wData.rating || 0;
      let reviewCount = wData.reviewCount || 0;

      let newCount = reviewCount + 1;
      let newRating = ((currentRating * reviewCount) + avgRating) / newCount;
      newRating = Math.round(newRating * 10) / 10;

      transaction.update(workerRef, {
        rating: newRating,
        reviewCount: newCount,
        completedJobs: (wData.completedJobs || 0) + 1
      });
    });

    await db.collection("jobFeedback").doc(jobId).update({
      ratings,
      workerId,
      submittedAt: FieldValue.serverTimestamp()
    });

    res.json({ success: true, message: "Job closed successfully. AI is processing the skill gap analysis." });

    // BACKGROUND TASK: Lock all RTDB chats for this Job
    (async () => {
      try {
        const adminDb = (await import("firebase-admin")).default.database();
        const roomsRef = adminDb.ref(`jobs/rooms`);
        const snapshot = await roomsRef.get();
        if (snapshot.exists()) {
          const rooms = snapshot.val();
          const updates = {};
          Object.keys(rooms).forEach(roomId => {
            if (roomId.startsWith(`${jobId}_chat`)) {
              updates[`${roomId}/status`] = "closed";
            }
          });
          if (Object.keys(updates).length > 0) {
            await roomsRef.update(updates);
            console.log(`Locked ${Object.keys(updates).length} RTDB rooms for Job ${jobId}`);
          }
        }
      } catch (err) {
        console.error("Failed to sync closed status to RTDB:", err);
      }
    })();

    const agentEndpoint = `${process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000"}/process-skill-gap`;

    // Build question strings for the agent — use pairedQuestions if available, otherwise fallback
    const agentQuestions = pairedQuestions
      ? pairedQuestions.map(pq => pq.question)
      : questions;

    axios.post(agentEndpoint, {
      questions: agentQuestions,
      ratings,
      pairedQuestions: pairedQuestions || null
    }).then(async (agentRes) => {
      const aiData = agentRes.data;
      if (aiData.status === "success" && aiData.skill_gap_string) {
        const wSnap = await workerRef.get();
        if (!wSnap.exists) return;
        const currentSkillGapStr = wSnap.data().skill_gap_string || "";
        const combinedStr = currentSkillGapStr
          ? `${currentSkillGapStr} | ${aiData.skill_gap_string}`
          : aiData.skill_gap_string;

        const updatePayload = { skill_gap_string: combinedStr };

        if (aiData.skill_gap_embeddings && aiData.skill_gap_embeddings.length > 0) {
          updatePayload.skill_gap_embeddings = FieldValue.vector(aiData.skill_gap_embeddings);
        }

        await workerRef.update(updatePayload);
        console.log(`Successfully patched skill gap arrays for Worker ${workerId} on Job ${jobId}`);
      }
    }).catch(err => {
      console.error("Background Agent Skill Gap failed:", err.message);
    });

    // 🆕 Graph RAG: Fire-and-forget graph writeback
    const pyAgentUrl = process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000";
    const extractedSkillIds = jobData.extracted_skills?.skills?.map(s => s.skill_id) || [];
    const graphAvgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;

    if (extractedSkillIds.length > 0) {
      axios.post(`${pyAgentUrl}/graph-writeback`, {
        worker_id: workerId,
        employer_id: employerId,
        job_id: jobId,
        skill_ids: extractedSkillIds,
        rating: graphAvgRating
      }).catch(err => console.error('[Graph Writeback] Failed:', err.message));
    }

  } catch (err) {
    console.error("Close and Rate error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to close job and submit feedback" });
    }
  }
});

router.post("/:jobId/join", checkJwt, async (req, res) => {
  const userId = req.auth?.payload?.sub;
  const { jobId } = req.params;

  if (!userId) {
    return res.status(401).json({ message: "Invalid token" });
  }

  const jobRef = db.collection("jobs").doc(jobId);
  const chatRef = db.collection("jobChats").doc(jobId);

  const [jobSnap, chatSnap] = await Promise.all([jobRef.get(), chatRef.get()]);

  if (!jobSnap.exists || !chatSnap.exists) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (jobSnap.data().status === "CLOSED") {
    return res.status(403).json({ message: "Job closed" });
  }

  await chatRef.update({
    participants: FieldValue.arrayUnion(userId),
  });

  res.json({ success: true });
});
router.patch("/:jobId/close", checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;
  const { jobId } = req.params;

  const jobRef = db.collection("jobs").doc(jobId);
  const jobSnap = await jobRef.get();

  if (!jobSnap.exists) {
    return res.status(404).json({ message: "Job not found" });
  }

  if (jobSnap.data()?.employerId !== userId) {
    return res.status(403).json({ message: "Not allowed" });
  }

  await jobRef.update({ status: "CLOSED" });
  await db.collection("jobChats").doc(jobId).update({ closed: true });

  res.json({ success: true });
});

router.post("/:jobId/report-chat", checkJwt, async (req, res) => {
  try {
    const reporterId = req.auth.payload.sub;
    const { jobId } = req.params;
    const { description, messages, reportedUserId } = req.body;

    if (!description || !messages || messages.length === 0) {
      return res.status(400).json({ message: "Description and chat history are required." });
    }

    // 1. Log the preliminary report quickly
    const reportRef = db.collection("chatReports").doc();
    await reportRef.set({
      reportId: reportRef.id,
      jobId,
      reporterId,
      reportedUserId: reportedUserId || 'unknown',
      description,
      messages,
      status: "PENDING_AI",
      severity: "UNKNOWN",
      aiAnalysis: null,
      createdAt: FieldValue.serverTimestamp()
    });

    // 2. Respond immediately so the user isn't stuck waiting
    res.json({ success: true, message: "Report filed successfully." });

    // 3. Fire-and-forget AI Agent call
    (async () => {
      try {
        const agentEndpoint = `${process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000"}/analyze-safety`;

        // We only need an array of text messages for the agent instead of full objects
        const chatLogs = messages.map(m => `${m.userName}: ${m.text}`);

        const aiResponse = await axios.post(agentEndpoint, {
          reportId: reportRef.id,
          description,
          chatLogs
        });

        const aiData = aiResponse.data;
        if (aiData.status === "success") {
          await reportRef.update({
            status: "REVIEW_REQUIRED",
            severity: aiData.severity, // Should be LOW, MEDIUM, HIGH, CRITICAL
            aiAnalysis: aiData.summary
          });
          console.log(`Safety Agent successfully analyzed report ${reportRef.id}`);

          // 🆕 Graph RAG: Write safety flag for HIGH/CRITICAL
          if (['HIGH', 'CRITICAL'].includes(aiData.severity)) {
            const graphPyUrl = process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000";
            axios.post(`${graphPyUrl}/graph-safety-flag`, {
              worker_id: reportedUserId || 'unknown',
              employer_id: reporterId,
              severity: aiData.severity,
              job_id: jobId
            }).catch(err => console.error('[Safety Flag] Failed:', err.message));
          }
        }
      } catch (agentErr) {
        console.error("AI Safety Check failed in background:", agentErr.message);
        await reportRef.update({
          status: "MANUAL_REVIEW", // Fallback if AI is down
          aiAnalysis: "AI Analysis failed to complete."
        });
      }
    })();

  } catch (err) {
    console.error("Report Chat Error:", err);
    if (!res.headersSent) {
      res.status(500).json({ message: "Failed to submit report" });
    }
  }
});

export default router;
