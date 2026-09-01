import Question from "../../models/urbanconnect/questionModel.js";
import Cluster from "../../models/urbanconnect/clusterModel.js";
import { v4 as uuidv4 } from "uuid";
import axios from "axios";

/**
 * cosine similarity helper
 */
function cosineSimilarity(a, b) {
  if (!a?.length || !b?.length || a.length !== b.length) return 0;
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

const CLUSTER_SIMILARITY_THRESHOLD = 0.75;
const CLUSTER_MIN_SIZE = 3;
const CLUSTER_TIME_WINDOW_HOURS = 12;

/**
 * POST /api/urbanconnect/cluster-check
 * Checks whether a new post forms part of an emerging issue cluster.
 * Body: { postId, embedding, city }
 */
export const clusterCheck = async (req, res) => {
  try {
    const { postId, embedding, city } = req.body;
    console.log(`\n[CLUSTER CHECK] Received request for Post: ${postId} | City: ${city || 'None'}`);

    if (!embedding?.length) {
      console.log(`[CLUSTER CHECK] Failed: No embedding provided for Post ${postId}`);
      return res.json({ clusterId: null });
    }

    // Time window: last 12 hours
    const timeThreshold = new Date(
      Date.now() - CLUSTER_TIME_WINDOW_HOURS * 60 * 60 * 1000
    );

    // Fetch recent posts that have embeddings (excluding current post)
    const filter = {
      createdAt: { $gte: timeThreshold },
      "embedding.0": { $exists: true },
      _id: { $ne: postId },
    };
    
    // Optional: Only cluster within the same city if city is provided
    if (city) {
      console.log(`[CLUSTER CHECK] Scoping search to city: ${city}`);
    }

    const recentPosts = await Question.find(filter)
      .select("_id embedding aiAnalysis.clusterId")
      .lean();

    console.log(`[CLUSTER CHECK] Found ${recentPosts.length} recent posts with embeddings in the last 12 hours.`);

    // Find posts similar to the new one
    const similarPosts = recentPosts
      .map((p) => {
        const sim = cosineSimilarity(embedding, p.embedding);
        return {
          _id: p._id,
          clusterId: p.aiAnalysis?.clusterId || null,
          similarity: sim,
        };
      })
      .filter((p) => p.similarity >= CLUSTER_SIMILARITY_THRESHOLD);

    console.log(`[CLUSTER CHECK] Found ${similarPosts.length} posts matching the similarity threshold (>= ${CLUSTER_SIMILARITY_THRESHOLD}).`);

    // If enough similar posts form a cluster
    if (similarPosts.length >= CLUSTER_MIN_SIZE - 1) {
      // Check if any of them already belong to a cluster
      const existingCluster = similarPosts.find((p) => p.clusterId);

      const clusterId = existingCluster
        ? existingCluster.clusterId
        : `cluster_${uuidv4().slice(0, 8)}`;

      // Update all similar posts that don't have a clusterId yet
      const unclusteredIds = similarPosts
        .filter((p) => !p.clusterId)
        .map((p) => p._id);

      if (unclusteredIds.length > 0) {
        console.log(`[CLUSTER CHECK] Associating ${unclusteredIds.length} previously unclustered posts to new cluster ${clusterId}.`);
        await Question.updateMany(
          { _id: { $in: unclusteredIds } },
          { $set: { "aiAnalysis.clusterId": clusterId } }
        );
      }

      const totalSize = similarPosts.length + 1;
      console.log(`[CLUSTER CHECK] SUCCESS! Post assigned to Cluster: ${clusterId}. Total cluster size: ${totalSize}`);

      // If cluster hits MIN_SIZE (3), generate an AI summary (fire-and-forget)
      if (totalSize >= CLUSTER_MIN_SIZE) {
        (async () => {
          try {
            const existing = await Cluster.findOne({ clusterId });
            if (!existing) {
              const allIds = [...similarPosts.map(p => p._id), postId];
              const postsData = await Question.find({ _id: { $in: allIds } }).select("title description").lean();
              const postsText = postsData.map(p => `${p.title}. ${p.description || ''}`.trim());
              
              const pyAgentUrl = process.env.PYTHON_SERVER;
              const aiRes = await axios.post(`${pyAgentUrl}/summarize-cluster`, {
                clusterId,
                postsText
              });
              
              if (aiRes.data?.status === "success") {
                await Cluster.create({
                  clusterId,
                  headline: aiRes.data.headline,
                  summary: aiRes.data.summary
                });
                console.log(`[CLUSTER SUMMARY] Generated headline for ${clusterId}: "${aiRes.data.headline}"`);
              }
            }
          } catch (err) {
            console.error("[CLUSTER SUMMARY] Generation failed:", err.message);
          }
        })();
      }

      return res.json({
        clusterId,
        clusterSize: totalSize,
      });
    }

    console.log(`[CLUSTER CHECK] No cluster formed. Not enough similar posts (Required: ${CLUSTER_MIN_SIZE}, Found: ${similarPosts.length + 1}).`);
    return res.json({ clusterId: null });
  } catch (err) {
    console.error("Cluster check failed:", err);
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/urbanconnect/clusters
 * Returns all emerging issue clusters with their headline, summary, and post count.
 */
export const getClusters = async (req, res) => {
  try {
    const clusters = await Cluster.find({}).sort({ createdAt: -1 }).lean();

    // Enrich each cluster with its post count
    const enriched = await Promise.all(
      clusters.map(async (c) => {
        const postCount = await Question.countDocuments({ "aiAnalysis.clusterId": c.clusterId });
        return {
          _id: c._id,
          clusterId: c.clusterId,
          headline: c.headline,
          summary: c.summary,
          postCount,
          createdAt: c.createdAt,
        };
      })
    );

    res.json({ success: true, data: enriched });
  } catch (err) {
    console.error("Failed to fetch clusters:", err);
    res.status(500).json({ error: err.message });
  }
};

