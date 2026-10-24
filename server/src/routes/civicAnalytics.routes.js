import express from "express";
import Question from "../models/urbanconnect/questionModel.js";

const router = express.Router();

/**
 * GET /api/civic-analytics/sentiment-stats?days=7
 * Returns aggregated sentiment/urgency/postType counts
 */
router.get("/sentiment-stats", async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const stats = await Question.aggregate([
      {
        $match: {
          "aiAnalysis.analyzedAt": { $gte: since },
          "aiAnalysis.sentiment": { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          sentiments: {
            $push: "$aiAnalysis.sentiment",
          },
          urgencies: {
            $push: "$aiAnalysis.urgency",
          },
          postTypes: {
            $push: "$aiAnalysis.postType",
          },
          avgSentimentScore: { $avg: "$aiAnalysis.sentimentScore" },
        },
      },
    ]);

    if (!stats.length) {
      return res.json({
        total: 0,
        sentiment: {},
        urgency: {},
        postType: {},
        avgSentimentScore: 0,
      });
    }

    const data = stats[0];

    // Count occurrences
    const countOccurrences = (arr) =>
      arr.reduce((acc, val) => {
        acc[val] = (acc[val] || 0) + 1;
        return acc;
      }, {});

    res.json({
      total: data.total,
      sentiment: countOccurrences(data.sentiments),
      urgency: countOccurrences(data.urgencies),
      postType: countOccurrences(data.postTypes),
      avgSentimentScore: Math.round((data.avgSentimentScore || 0) * 100) / 100,
    });
  } catch (err) {
    console.error("Sentiment stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/civic-analytics/emerging-issues
 * Returns active clusters with post counts
 */
router.get("/emerging-issues", async (req, res) => {
  try {
    const clusters = await Question.aggregate([
      {
        $match: {
          "aiAnalysis.clusterId": { $ne: null },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "author",
          foreignField: "_id",
          as: "authorDetails",
        },
      },
      {
        $unwind: {
          path: "$authorDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $group: {
          _id: "$aiAnalysis.clusterId",
          postCount: { $sum: 1 },
          latestPost: { $last: "$title" },
          avgUrgency: { $push: "$aiAnalysis.urgency" },
          posts: {
            $push: {
              _id: "$_id",
              title: "$title",
              description: "$description",
              sentiment: "$aiAnalysis.sentiment",
              urgency: "$aiAnalysis.urgency",
              createdAt: "$createdAt",
              author: {
                username: "$authorDetails.username",
                avatar: "$authorDetails.avatar",
              },
            },
          },
        },
      },
      { $sort: { postCount: -1 } },
      { $limit: 20 },
      {
        $lookup: {
          from: "clusters",
          localField: "_id",
          foreignField: "clusterId",
          as: "clusterMetadata",
        },
      },
      {
        $unwind: {
          path: "$clusterMetadata",
          preserveNullAndEmptyArrays: true,
        },
      },
    ]);

    res.json({ success: true, data: clusters });
  } catch (err) {
    console.error("Emerging issues error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/civic-analytics/misinformation?limit=20
 * Returns posts flagged as misinformation
 */
router.get("/misinformation", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);

    const flagged = await Question.find({
      "aiAnalysis.isMisinformation": true,
    })
      .select("title description aiAnalysis createdAt author")
      .populate("author", "username email")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ success: true, data: flagged });
  } catch (err) {
    console.error("Misinformation query error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/civic-analytics/posts?page=1&limit=20
 * Paginated posts with AI analysis data for admin table
 */
router.get("/posts", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      Question.find({ "aiAnalysis.analyzedAt": { $ne: null } })
        .select("title description aiAnalysis createdAt author image")
        .populate("author", "username email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Question.countDocuments({ "aiAnalysis.analyzedAt": { $ne: null } }),
    ]);

    res.json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Analytics posts error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/civic-analytics/cluster/:clusterId
 * Returns detailed analysis for a specific cluster
 */
router.get("/cluster/:clusterId", async (req, res) => {
  try {
    const { clusterId } = req.params;

    // Fetch all posts belonging to this cluster
    const posts = await Question.find({ "aiAnalysis.clusterId": clusterId })
      .populate("author", "username email avatar")
      .sort({ createdAt: -1 })
      .lean();

    if (!posts.length) {
      return res.status(404).json({ success: false, error: "Cluster not found" });
    }

    // Compute breakdowns
    const sentimentCounts = {};
    const urgencyCounts = {};
    let misInfoCount = 0;
    const postTypeCounts = {};

    for (const p of posts) {
      const ai = p.aiAnalysis || {};
      if (ai.sentiment) sentimentCounts[ai.sentiment] = (sentimentCounts[ai.sentiment] || 0) + 1;
      if (ai.urgency) urgencyCounts[ai.urgency] = (urgencyCounts[ai.urgency] || 0) + 1;
      if (ai.postType) postTypeCounts[ai.postType] = (postTypeCounts[ai.postType] || 0) + 1;
      if (ai.isMisinformation === true) misInfoCount++;
    }

    // Fetch AI summary from clusters collection if generated
    const { default: Cluster } = await import("../models/urbanconnect/clusterModel.js");
    const clusterSummary = await Cluster.findOne({ clusterId }).lean();

    res.json({
      success: true,
      data: {
        clusterId,
        postCount: posts.length,
        sentimentBreakdown: sentimentCounts,
        urgencyBreakdown: urgencyCounts,
        postTypeBreakdown: postTypeCounts,
        misinformationCount: misInfoCount,
        aiSummary: clusterSummary || null,
        posts: posts.map((p) => ({
          _id: p._id,
          title: p.title,
          description: p.description,
          sentiment: p.aiAnalysis?.sentiment,
          urgency: p.aiAnalysis?.urgency,
          postType: p.aiAnalysis?.postType,
          isMisinformation: p.aiAnalysis?.isMisinformation,
          contextNote: p.aiAnalysis?.contextNote,
          createdAt: p.createdAt,
          author: {
            username: p.author?.username || "Anonymous",
            email: p.author?.email || "",
            avatar: p.author?.avatar || "",
          },
        })),
      },
    });
  } catch (err) {
    console.error("Cluster detail error:", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/civic-analytics/cluster/:clusterId/summarize
 * Manually trigger AI summary generation for a cluster
 */
router.post("/cluster/:clusterId/summarize", async (req, res) => {
  try {
    const { clusterId } = req.params;
    const { default: Cluster } = await import("../models/urbanconnect/clusterModel.js");
    const axios = (await import("axios")).default;

    const existing = await Cluster.findOne({ clusterId });
    if (existing) {
      return res.json({ success: true, message: "Summary already exists", data: existing });
    }

    const postsData = await Question.find({ "aiAnalysis.clusterId": clusterId }).select("title description").lean();
    if (!postsData.length) {
      return res.status(404).json({ success: false, error: "Cluster has no posts" });
    }

    const postsText = postsData.map(p => `${p.title}. ${p.description || ''}`.trim());
    
    const pyAgentUrl = process.env.PYTHON_SERVER;
    const aiRes = await axios.post(`${pyAgentUrl}/summarize-cluster`, {
      clusterId,
      postsText
    });
    
    if (aiRes.data?.status === "success") {
      const newCluster = await Cluster.create({
        clusterId,
        headline: aiRes.data.headline,
        summary: aiRes.data.summary
      });
      return res.json({ success: true, data: newCluster });
    }

    res.status(500).json({ success: false, error: "Summarization failed at agent level" });
  } catch (err) {
    console.error("Cluster summarize error:", err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
