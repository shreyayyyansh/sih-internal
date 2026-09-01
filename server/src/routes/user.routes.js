import express from "express";
import { getUserById } from "../controllers/user.controller.js";
import { checkJwt } from "../auth/authMiddleware.js";
import { fetchReportsByUserId } from "../controllers/user/getRepots.js"
import { db, FieldValue } from "../firebaseadmin/firebaseadmin.js";
import axios from "axios";


const router = express.Router();
const pyAgentUrl =process.env.PYTHON_SERVER;

router.get("/reports",checkJwt,fetchReportsByUserId);

// ─── Get authenticated user's profile from Firestore ───
router.get("/profile", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const userRef = db.collection("users").doc(userId);
    const snap = await userRef.get();
    if (!snap.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.json({ profile: snap.data() });
  } catch (err) {
    console.error("GET /profile error:", err);
    return res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// ─── Update worker interest ───
router.patch("/worker-interest", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { interestedToWork, workerCategories, experience, description } = req.body;
    
    if (typeof interestedToWork !== "boolean") {
      return res.status(400).json({ message: "interestedToWork must be a boolean" });
    }

    const userRef = db.collection("users").doc(userId);
    const snap = await userRef.get();
    const existingData = snap.exists ? snap.data() : {};

    const updateData = {
      interestedToWork,
      hasSeenWorkerPrompt: true,
    };

    if (interestedToWork) {
      // 1. Update Categories
      updateData.workerCategories = Array.isArray(workerCategories) ? workerCategories : [];

      // 2. Update Description
      updateData.description = description || "";

      // 3. Update Experience
      if (experience !== undefined) {
        updateData.experience = experience;
      }

      // 4. Build master_string
      const expStr = updateData.experience ? `${updateData.experience} years` : "";
      updateData.master_string = `${updateData.workerCategories.join(', ')} ${expStr} ${updateData.description}`.replace(/\s+/g, ' ').trim();

      // 5. Initialize completedJobs if not present
      if (existingData.completedJobs === undefined) {
        updateData.completedJobs = 0;
      }
    }

    await userRef.set(updateData, { merge: true });


    // 6. Fire-and-Forget the AI Agent (runs in the background)
    if (interestedToWork && updateData.master_string) {
      (async () => {
        try {
          console.log("pyagenturl",pyAgentUrl);
          const aiResponse = await axios.post(`${pyAgentUrl}/embed`, {
            text: updateData.master_string
          });
          console.log("aiResponse",aiResponse);

          const aiData = aiResponse.data;

          if (aiData.status === "success") {
            await userRef.update({
              master_string_embedded: FieldValue.vector(aiData.embedding)
            });
            console.log(`✅ AI Embedding complete for User ${userId}`);
          }
        } catch (agentError) {
          console.error("Error calling Python AI Agent for embedding:", agentError.message);
        }
      })();

      // 🆕 Graph RAG: Extract skills from profile and write has_skill edges
      const profileText = [
        description || '',
        (Array.isArray(workerCategories) ? workerCategories : []).join(' ')
      ].join(' ').trim();

      if (profileText) {
        axios.post(`${pyAgentUrl}/graph-extract-skills`, {
          worker_id: userId,
          text: profileText,
        }).catch(err => console.error('[Graph Skills] Worker skill extraction failed:', err.message));
      }
    }

    return res.json({ success: true, updateData });
  } catch (err) {
    console.error("PATCH /worker-interest error:", err);
    return res.status(500).json({ message: "Failed to update worker interest" });
  }
});

// ─── Get all interested workers (sorted) ───
router.get("/workers", checkJwt, async (req, res) => {
  try {
    const snap = await db
      .collection("users")
      .where("interestedToWork", "==", true)
      .get();

    let workers = [];
    snap.forEach((doc) => workers.push({ id: doc.id, ...doc.data() }));

    // Sort: rating desc → completedJobs desc → name asc
    workers.sort((a, b) => {
      const ratingA = a.rating || 3;
      const ratingB = b.rating || 3;
      if (ratingA !== ratingB) return ratingB - ratingA;

      const jobsA = a.completedJobs || 0;
      const jobsB = b.completedJobs || 0;
      if (jobsA !== jobsB) return jobsB - jobsA;

      return (a.name || "").localeCompare(b.name || "");
    });

    return res.json({ workers });
  } catch (err) {
    console.error("GET /workers error:", err);
    return res.status(500).json({ message: "Failed to fetch workers" });
  }
});

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

// ─── Get Recommended Learning Schemes for Worker ───
router.get("/learning-schemes", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    
    // 1. Fetch User Data
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    
    const userData = userSnap.data();
    
    const masterEmbedding = userData.master_string_embedded?.toArray 
      ? userData.master_string_embedded.toArray() 
      : userData.master_string_embedded;
      
    const skillGapEmbedding = userData.skill_gap_embeddings?.toArray 
      ? userData.skill_gap_embeddings.toArray() 
      : userData.skill_gap_embeddings;

    // 2. Fetch all Government Schemes
    const schemesSnap = await db.collection("gov_schemes").get();
    const allSchemes = [];
    
    schemesSnap.forEach(doc => {
      const data = doc.data();
      // Ensure we extract the embedding array properly
      const schemeEmbedding = data.scheme_embedding?.toArray 
        ? data.scheme_embedding.toArray() 
        : data.scheme_embedding;
        
      if (schemeEmbedding) {
         allSchemes.push({
           id: doc.id,
           ...data,
           scheme_embedding: schemeEmbedding
         });
      }
    });

    // 3. Calculate Similarities
    const upgradationCourses = [];
    const improvementCourses = [];

    allSchemes.forEach(scheme => {
      // Upgradation Match (based on master profile)
      if (masterEmbedding) {
        const upScore = cosineSimilarity(masterEmbedding, scheme.scheme_embedding);
        if (upScore > 0) { // Keep everything that has *some* correlation to sort later
           upgradationCourses.push({ ...scheme, similarityScore: upScore });
        }
      }

      // Improvement Match (based on skill gap/feedback)
      if (skillGapEmbedding) {
        const impScore = cosineSimilarity(skillGapEmbedding, scheme.scheme_embedding);
        if (impScore > 0) {
           improvementCourses.push({ ...scheme, similarityScore: impScore });
        }
      }
    });

    // 4. Sort and return top 10
    upgradationCourses.sort((a, b) => b.similarityScore - a.similarityScore);
    improvementCourses.sort((a, b) => b.similarityScore - a.similarityScore);

    // Strip embeddings from response to save bandwidth
    const topUpgradation = upgradationCourses.slice(0, 10).map(s => {
      const { scheme_embedding, ...rest } = s; return rest;
    });
    const topImprovement = improvementCourses.slice(0, 10).map(s => {
      const { scheme_embedding, ...rest } = s; return rest;
    });

    return res.json({
      success: true,
      upgradationCourses: topUpgradation,
      improvementCourses: topImprovement
    });

  } catch (err) {
    console.error("GET /learning-schemes error:", err);
    return res.status(500).json({ message: "Failed to fetch learning schemes" });
  }
});

// ─── Graph RAG: Learning Schemes with graph-aware context ───
router.get("/learning-schemes-graph", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;

    // 1. Fetch User Data
    const userRef = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      return res.status(404).json({ message: "User not found" });
    }
    const userData = userSnap.data();

    // 2. Call Python agent to get graph-based skill gaps
    const pyAgentUrl = process.env.AGENT_URL || process.env.PYTHON_SERVER || "http://127.0.0.1:10000";

    // Get worker's gap embedding with graph context
    const gapContext = userData.skill_gap_string || "";
    const workerCategories = userData.workerCategories || [];

    const embedRes = await axios.post(`${pyAgentUrl}/embed`, {
      text: `Worker needs improvement in: ${gapContext}. Primary category: ${workerCategories.join(', ')}`
    });
    const gapVector = embedRes.data.embedding;

    if (!gapVector || gapVector.length === 0) {
      return res.json({ success: true, upgradationCourses: [], improvementCourses: [] });
    }

    // 3. Fetch all Government Schemes and score them
    const schemesSnap = await db.collection("gov_schemes").get();
    const allSchemes = [];

    schemesSnap.forEach(doc => {
      const data = doc.data();
      const schemeEmbedding = data.scheme_embedding?.toArray
        ? data.scheme_embedding.toArray()
        : data.scheme_embedding;

      if (schemeEmbedding) {
        allSchemes.push({
          id: doc.id,
          ...data,
          scheme_embedding: schemeEmbedding
        });
      }
    });

    // 4. Score with gap vector
    const scoredSchemes = allSchemes.map(scheme => {
      const score = cosineSimilarity(gapVector, scheme.scheme_embedding);
      // Boost schemes that mention weak skills in their searchable text
      const gapBoost = (gapContext && scheme.searchable_text?.toLowerCase().includes(gapContext.toLowerCase().split(' ')[0]))
        ? 0.15 : 0;
      return { ...scheme, similarityScore: score + gapBoost };
    });

    scoredSchemes.sort((a, b) => b.similarityScore - a.similarityScore);

    // 5. Split into upgradation and improvement
    const topSchemes = scoredSchemes.slice(0, 10).map(s => {
      const { scheme_embedding, ...rest } = s;
      return rest;
    });

    return res.json({
      success: true,
      upgradationCourses: topSchemes.slice(0, 5),
      improvementCourses: topSchemes.slice(5)
    });

  } catch (err) {
    console.error("GET /learning-schemes-graph error:", err);
    return res.status(500).json({ message: "Failed to fetch graph-based learning schemes" });
  }
});

// ─── Sisterhood: flush trust score fields to Firestore on session exit ───
router.patch("/sisterhood-exit", checkJwt, async (req, res) => {
  try {
    const userId = req.auth.payload.sub;
    const { trust_score, false_sos_count, safe_walk_streak } = req.body;

    const updates = {};
    if (trust_score !== undefined && typeof trust_score === 'number') updates.trust_score = trust_score;
    if (false_sos_count !== undefined && typeof false_sos_count === 'number') updates.false_sos_count = false_sos_count;
    if (safe_walk_streak !== undefined && typeof safe_walk_streak === 'number') updates.safe_walk_streak = safe_walk_streak;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update." });
    }

    await db.collection("users").doc(userId).update(updates);
    console.log(`✅ Trust score flushed for user ${userId}:`, updates);
    return res.json({ success: true });
  } catch (err) {
    console.error("PATCH /sisterhood-exit error:", err);
    return res.status(500).json({ message: "Failed to flush trust score." });
  }
});

router.get("/:id", getUserById);

export default router;