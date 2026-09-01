import Question from '../models/urbanconnect/questionModel.js';
import User from '../models/urbanconnect/userModel.js';
import Comment from '../models/urbanconnect/commentModel.js';
import { uploadImage as uploadToCloudinary } from '../services/uploadImage.js';
import QuestionVote from '../models/urbanconnect/questionVoteModel.js';
import Administration from '../models/urbanconnect/administrationModel.js';
import { getRedisClient } from '../config/redis.js';
import axios from 'axios';

const getTimeAgo = (date) => {
  if (!date) return 'Just now';
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m";
  return seconds > 0 ? Math.floor(seconds) + "s" : 'Just now';
};

export const fetchQuestions = async (req, res) => {
  try {
    console.log("fetch q hitted")
    const after = req.query.after;
    const limit = parseInt(req.query.limit || "20");
    const email = req.user?.email || req.query.email;

    // Check Cache first
    const redisClient = getRedisClient();
    const cacheKey = `urbanconnect:questions:after_${after || 'none'}:limit_${limit}:user_${email || 'anon'}`;

    if (redisClient) {
      const cachedData = await redisClient.get(cacheKey);
      if (cachedData) {
        return res.status(200).json(JSON.parse(cachedData));
      }
    }

    const query = {};
    if (after) {
      query._id = { $lt: after };
    }

    const questions = await Question.find(query)
      .populate('author', 'username avatar email')
      .populate('taggedAuthorities')
      .sort({ _id: -1 })
      .limit(limit)
      .lean();

    // Get user's votes if authenticated
    let userId = null;
    if (email) {
      const dbUser = await User.findOne({ email });
      if (dbUser) userId = dbUser._id;
    }

    const questionIds = questions.map(q => q._id);
    let voteMap = new Map();
    if (userId) {
      const votes = await QuestionVote.find({ userId, questionId: { $in: questionIds } }).lean();
      voteMap = new Map(votes.map(v => [v.questionId.toString(), v.value]));
    }

    // Enrich questions with author info, comment count, and user vote
    const enrichedQuestions = await Promise.all(
      questions.map(async (q) => {
        const commentCount = await Comment.countDocuments({ questionId: q._id });
        
        let authorName = q.author?.username || 'UrbanFlow User';
        let authorHandle = q.author?.email ? q.author.email.split('@')[0] : (q.author?.username || 'resident').toLowerCase().replace(/\s+/g, '');
        let authorAvatar = q.author?.avatar || '';
        console.log(q.author)

        // Spoof CivicConnect System User only if it's unmapped/dummy
        if (q.isCivicReport && (!q.author || q.author._id?.toString() === '000000000000000000000000' || authorName === 'UrbanFlow User')) {
          authorName = 'CivicConnect AI Verified';
          authorHandle = 'civicconnect';
        }

        return {
          ...q,
          authorName,
          authorHandle,
          authorAvatar,
          timeAgo: getTimeAgo(q.createdAt),
          commentCount,
          userVote: voteMap.get(q._id.toString()) || 0,
        };
      })
    );

    const nextCursor = questions.length > 0 ? questions[questions.length - 1]._id : null;

    const responsePayload = {
      data: enrichedQuestions,
      nextCursor,
      hasMore: questions.length === limit,
    };

    // Store in cache for 60 seconds
    if (redisClient) {
      await redisClient.setEx(cacheKey, 60, JSON.stringify(responsePayload));
    }

    res.status(200).json(responsePayload);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch questions", error: error.message });
  }
};

export const fetchQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('author', 'username avatar email')
      .populate('taggedAuthorities');
    if (!question) return res.status(404).json({ error: "Question not found" });

    const comments = await Comment.find({ questionId: question._id, parentId: null }).sort({ createdAt: -1 }).lean();
    
    const questionObj = question.toObject();
    
    let authorName = questionObj.author?.username || 'UrbanFlow User';
    let authorHandle = questionObj.author?.email ? questionObj.author.email.split('@')[0] : (questionObj.author?.username || 'resident').toLowerCase().replace(/\s+/g, '');
    let authorAvatar = questionObj.author?.avatar || '';

    // Spoof CivicConnect System User
    if (questionObj.isCivicReport && (!questionObj.author?._id || questionObj.author._id?.toString() === '000000000000000000000000' || authorName === 'UrbanFlow User')) {
      authorName = 'CivicConnect AI Verified';
      authorHandle = 'civicconnect';
    }

    const postData = {
      ...questionObj,
      authorName,
      authorHandle,
      authorAvatar,
      timeAgo: getTimeAgo(questionObj.createdAt),
      comments: comments.map(c => ({
        ...c,
        id: c._id.toString(),
        authorName: c.authorName || 'User',
        authorHandle: (c.authorName || 'user').toLowerCase().replace(/\s+/g, ''),
        text: c.body,
        timeAgo: getTimeAgo(c.createdAt)
      }))
    };

    res.status(200).json(postData);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch question", details: err.message });
  }
};




























export const createQuestion = async (req, res) => {
  try {
    const { title, description, image, taggedAuthorities } = req.body;

    // Extract user info from auth middleware or request body
    const email = req.body.author?.email || "mock@domain.com";
    const authorName = req.body.author?.name || req.body.author?.nickname || "Anonymous";
    const authorAvatar = req.body.author?.picture || null;

    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = await User.create({
        username: authorName,
        email: email,
        auth0Id: req.body.author?.sub || 'mock_auth0_id_' + Date.now(),
        avatar: authorAvatar
      });
    } else {
      // Update username and avatar if they were previously generic or missing
      const updates = {};
      if (authorName && authorName !== 'Anonymous' && (!dbUser.username || dbUser.username.startsWith('Anonymous'))) {
        updates.username = authorName;
      }
      if (authorAvatar && (!dbUser.avatar || dbUser.avatar === '')) {
        updates.avatar = authorAvatar;
      }
      if (Object.keys(updates).length > 0) {
        await User.findByIdAndUpdate(dbUser._id, updates);
        dbUser = await User.findById(dbUser._id);
      }
    }

    const newQuestion = await Question.create({
      author: dbUser._id,
      title: title,
      description: description,
      image: image || [],
      taggedAuthorities: taggedAuthorities || [],
    });

    // Invalidate Feed Cache
    const redisClient = getRedisClient();
    if (redisClient) {
      const keys = await redisClient.keys('urbanconnect:questions:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    res.status(201).json({ message: "Question uploaded to database", data: newQuestion });

    // Fire-and-forget: AI Civic Analysis (sentiment, urgency, misinformation, clustering)
    (async () => {
      try {
        const pyAgentUrl = process.env.PYTHON_SERVER;

        // Extract city from tagged authorities if available, otherwise default to Prayagraj
        let city = "Prayagraj";
        if (taggedAuthorities?.length) {
          const authority = await Administration.findById(taggedAuthorities[0]).lean();
          if (authority?.city) city = authority.city;
        }

        const payload = {
          postId: newQuestion._id.toString(),
          title: title,
          description: description,
          imageUrls: image || [],
          city: city
        };
        
        console.log(`\n[AGENT DISPATCH] Sending Post ${newQuestion._id} to Python Agent for analysis...`);
        console.log(`[AGENT DISPATCH] Payload Base: Title "${title}", City: "${city}"`);

        const aiResponse = await axios.post(`${pyAgentUrl}/analyze-post`, payload);

        const aiData = aiResponse.data;
        console.log(`[AGENT RECEIVE] Received analysis for Post ${newQuestion._id}. Status: ${aiData.status}`);
        if (aiData.status === "success") {
          await Question.findByIdAndUpdate(newQuestion._id, {
            aiAnalysis: {
              sentiment: aiData.sentiment,
              sentimentScore: aiData.sentiment_score,
              urgency: aiData.urgency,
              postType: aiData.post_type,
              isMisinformation: aiData.is_misinformation ?? null,
              contextNote: aiData.context_note ?? null,
              clusterId: aiData.cluster_id ?? null,
              analyzedAt: new Date()
            },
            embedding: aiData.embedding || null
          });
          console.log(`[CivicAnalysis] Post ${newQuestion._id} analyzed: ${aiData.post_type}, sentiment=${aiData.sentiment}`);
        }
      } catch (err) {
        console.error(`[CivicAnalysis] Failed for post ${newQuestion._id}:`, err.message);
      }
    })();

  } catch (error) {
    res.status(500).json({ message: "Failed to create question", error: error.message });
  }
};













































export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }
    const imageUrl = await uploadToCloudinary(req.file.buffer);
    res.status(200).json({ url: imageUrl });
  } catch (error) {
    res.status(500).json({ message: "Failed to upload image", error: error.message });
  }
};

export const postComment = async (req, res) => {
  try {
    const { comment, questionId, parentId } = req.body;

    // Simulate user extraction from auth middleware or body
    const email = req.body.authorEmail || req.user?.email || "commenter@domain.com";

    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      dbUser = await User.create({
        username: req.body.authorName || email.split('@')[0],
        email: email,
        auth0Id: 'mock_auth0_id_cmt_' + Date.now()
      });
    }

    const newComment = await Comment.create({
      body: comment,
      questionId: questionId || undefined,
      parentId: parentId || null,
      votes: 0,
      author: dbUser._id,
      authorName: dbUser.username,
      authorEmail: dbUser.email,
      replyCount: 0,
    });

    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, { $inc: { replyCount: 1 } });
    }

    // Invalidate Feed Cache
    const redisClient = getRedisClient();
    if (redisClient) {
      const keys = await redisClient.keys('urbanconnect:questions:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    res.status(201).json({ message: "Comment Added", newComment });
  } catch (error) {
    res.status(500).json({ message: "Failed to post comment", error: error.message });
  }
};

export const fetchAuthoritiesByCity = async (req, res) => {
  try {
    const { city } = req.params;
    if (!city) {
      return res.status(400).json({ error: "City is required" });
    }
    const authorities = await Administration.find({ city: { $regex: new RegExp('^' + city + '$', 'i') } }).lean();
    res.status(200).json(authorities);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch authorities", error: error.message });
  }
};

import Vote from '../models/urbanconnect/voteModel.js';
import Saved from '../models/urbanconnect/savedModel.js';

export const getComments = async (req, res) => {
  try {
    const { questionId, after, limit = 10 } = req.query;
    if (!questionId) return res.status(400).json({ error: "Missing questionId" });

    let query = { questionId, parentId: null };
    if (after) {
      query._id = { $lt: after };
    }

    let comments = await Comment.find(query)
      .sort({ votes: -1, createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    // Mock user auth layer logic for mapping saved and userVotes
    const email = req.user?.email || req.query.email;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        const commentIds = comments.map(c => c._id);
        const votes = await Vote.find({ userId: user._id, commentId: { $in: commentIds } }).lean();
        const saves = await Saved.find({ userId: user._id, commentId: { $in: commentIds } }).lean();

        const voteMap = new Map(votes.map(v => [v.commentId.toString(), v.value]));
        const saveSet = new Set(saves.map(s => s.commentId.toString()));

        comments = comments.map(c => ({
          ...c,
          userVote: voteMap.get(c._id.toString()) || 0,
          saved: saveSet.has(c._id.toString())
        }));
      }
    } else {
      comments = comments.map(c => ({ ...c, userVote: 0, saved: false }));
    }

    const nextCursor = comments.length > 0 ? comments[comments.length - 1]._id : null;
    res.status(200).json({ comments, nextCursor, hasMore: comments.length === parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments", details: err.message });
  }
};

export const getReplies = async (req, res) => {
  try {
    const { parentId, after, limit = 5 } = req.query;
    if (!parentId) return res.status(400).json({ error: "Missing parentId" });

    let query = { parentId };
    if (after) {
      query._id = { $lt: after };
    }

    let replies = await Comment.find(query)
      .sort({ createdAt: 1 })
      .limit(parseInt(limit))
      .lean();

    // Mock user auth layer logic for mapping saved and userVotes
    const email = req.user?.email || req.query.email;
    if (email) {
      const user = await User.findOne({ email });
      if (user) {
        const replyIds = replies.map(r => r._id);
        const votes = await Vote.find({ userId: user._id, commentId: { $in: replyIds } }).lean();
        const saves = await Saved.find({ userId: user._id, commentId: { $in: replyIds } }).lean();

        const voteMap = new Map(votes.map(v => [v.commentId.toString(), v.value]));
        const saveSet = new Set(saves.map(s => s.commentId.toString()));

        replies = replies.map(r => ({
          ...r,
          userVote: voteMap.get(r._id.toString()) || 0,
          saved: saveSet.has(r._id.toString())
        }));
      }
    } else {
      replies = replies.map(r => ({ ...r, userVote: 0, saved: false }));
    }

    const nextCursor = replies.length > 0 ? replies[replies.length - 1]._id : null;
    res.status(200).json({ replies, nextCursor, hasMore: replies.length === parseInt(limit) });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch replies", details: err.message });
  }
};

export const patchVote = async (req, res) => {
  try {
    const { commentId, questionId, value } = req.body;
    if (!commentId && !questionId) return res.status(400).json({ error: "Missing commentId or questionId" });

    // Simulate Auth
    const email = req.user?.email || req.body.email || "mock@domain.com";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: req.body.authorName || email.split('@')[0],
        email: email,
        auth0Id: 'mock_auth0_id_vote_' + Date.now()
      });
    }

    let delta = 0;
    const query = { userId: user._id };
    if (commentId) query.commentId = commentId;
    if (questionId) query.questionId = questionId;

    const existingVote = await Vote.findOne(query);

    if (!existingVote && value !== 0) {
      await Vote.create({ ...query, value });
      delta = value;
    } else if (existingVote && value === 0) {
      await existingVote.deleteOne();
      delta = -existingVote.value;
    } else if (existingVote && existingVote.value !== value) {
      delta = value - existingVote.value;
      existingVote.value = value;
      await existingVote.save();
    } else if (existingVote && existingVote.value === value) {
      // Vote already exists with the same value, no-op or toggle off (user preference)
      // Here we assume it toggles off if same value is sent again, or just stays same
      // Let's stick to the current logic: if value matches, no change.
      return res.status(200).json({ message: "No change", userVote: value });
    }

    const updatedComment = await Comment.findByIdAndUpdate(
      commentId,
      { $inc: { votes: delta } },
      { new: true }
    ).lean();

    res.status(200).json({ message: "Vote Updated", userVote: value, updatedComment });
  } catch (err) {
    res.status(500).json({ error: "Failed to update vote", details: err.message });
  }
};

export const patchQuestionVote = async (req, res) => {
  try {
    const { questionId, value } = req.body;
    if (!questionId) return res.status(400).json({ error: "Missing questionId" });

    // Simulate Auth
    const email = req.user?.email || req.body.email || "mock@domain.com";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: req.body.authorName || email.split('@')[0],
        email: email,
        auth0Id: 'mock_auth0_id_qvote_' + Date.now()
      });
    }

    let delta = 0;
    const existingVote = await QuestionVote.findOne({ userId: user._id, questionId });

    if (!existingVote && value !== 0) {
      await QuestionVote.create({ userId: user._id, questionId, value });
      delta = value;
    } else if (existingVote && value === 0) {
      await existingVote.deleteOne();
      delta = -existingVote.value;
    } else if (existingVote && existingVote.value !== value) {
      delta = value - existingVote.value;
      existingVote.value = value;
      await existingVote.save();
    }

    const updatedQuestion = await Question.findByIdAndUpdate(
      questionId,
      { $inc: { votes: delta } },
      { returnDocument: 'after' }
    ).lean();

    // --- CIVIC SYNDICATION PROXY (Option 3 Hybrid) ---
    if (updatedQuestion?.isCivicReport && updatedQuestion?.reportId && delta === 1) {
      try {
        const cat = updatedQuestion.reportCategory.toLowerCase();
        // Route naming convention: /updatewasteReports, /updatewaterReports, etc.
        const endpoint = `/api/reports/update${cat}Reports`;
        const base = process.env.BASE_URL || 'http://localhost:3000';
        
        await axios.post(`${base}${endpoint}`, {
          userId: 'urban_connect_voter', // Bypass reporter check
          email: user.email,
          reportId: updatedQuestion.reportId,
          geohash: updatedQuestion.geohash || ""
        });
        console.log(`[CivicSyndication] Proxied upvote to ${endpoint} for ${updatedQuestion.reportId}`);
      } catch (err) {
        console.error(`[CivicSyndication] Proxied upvote failed silently:`, err.message);
      }
    }
    // --- END CIVIC PROXY ---

    // Invalidate Feed Cache
    const redisClient = getRedisClient();
    if (redisClient) {
      const keys = await redisClient.keys('urbanconnect:questions:*');
      if (keys.length > 0) {
        await redisClient.del(keys);
      }
    }

    res.status(200).json({ message: "Question Vote Updated", userVote: value, updatedQuestion });
  } catch (err) {
    res.status(500).json({ error: "Failed to update question vote", details: err.message });
  }
};

export const toggleSave = async (req, res) => {
  try {
    const { commentId } = req.body;
    if (!commentId) return res.status(400).json({ error: "Missing commentId" });

    const email = req.user?.email || req.body.email || "mock@domain.com";
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        username: req.body.authorName || email.split('@')[0],
        email: email,
        auth0Id: 'mock_auth0_id_save_' + Date.now()
      });
    }

    const existing = await Saved.findOne({ userId: user._id, commentId });

    if (existing) {
      await existing.deleteOne();
      console.log(`[SAVE] Unsaved comment ${commentId} for user ${email}`);
      return res.status(200).json({ saved: false, message: "Comment unsaved" });
    } else {
      await Saved.create({ userId: user._id, commentId });
      console.log(`[SAVE] Saved comment ${commentId} for user ${email}`);
      return res.status(201).json({ saved: true, message: "Comment saved" });
    }
  } catch (err) {
    console.error('[SAVE] Error toggling save:', err.message);
    res.status(500).json({ error: "Failed to toggle save", details: err.message });
  }
};

export const searchQuestions = async (req, res) => {
  try {
    const search = req.body.search || req.query.search;

    if (!search || search.trim() === "") {
      return res.status(200).json([]);
    }

    const regex = new RegExp(search, 'i');

    let searchResults = await Question.find({
      $or: [
        { title: { $regex: regex } },
        { description: { $regex: regex } },
        { tags: { $regex: regex } }
      ]
    })
      .populate('author', 'username avatar email')
      .populate('taggedAuthorities')
      .sort({ _id: -1 })
      .lean();

    searchResults = searchResults.map(q => {
      let authorName = q.author?.username || q.author?.name || 'UrbanFlow User';
      let authorHandle = q.author?.email ? q.author.email.split('@')[0] : (q.author?.username || q.author?.name || 'resident').toLowerCase().replace(/\s+/g, '');
      let authorAvatar = q.author?.avatar || q.author?.picture || '';

      if (q.isCivicReport && (!q.author || q.author._id?.toString() === '000000000000000000000000' || authorName === 'UrbanFlow User')) {
        authorName = 'CivicConnect AI Verified';
        authorHandle = 'civicconnect';
      }

      return {
        ...q,
        authorName,
        authorHandle,
        authorAvatar,
        timeAgo: getTimeAgo(q.createdAt),
      };
    });

    res.status(200).json(searchResults);
  } catch (err) {
    res.status(500).json({ error: "Failed to search questions", details: err.message });
  }
};

export const fetchUserProfile = async (req, res) => {
  try {
    const { email, name, nickname, picture } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    let dbUser = await User.findOne({ email });
    if (!dbUser) {
      if (name) {
        // Auto-bootstrap their mongo profile!
        dbUser = await User.create({
          username: name || 'Local Resident',
          email: email,
          auth0Id: req.auth?.payload?.sub || 'auto_bootstrap_' + Date.now(),
          avatar: picture || null
        });
      } else {
        return res.status(404).json({ error: "User not found" });
      }
    } else if (picture && (!dbUser.avatar || dbUser.avatar === '')) {
      // Auto-heal missing avatars!
      dbUser.avatar = picture;
      await dbUser.save();
    }

    // Fetch user's posts
    let userPosts = await Question.find({ author: dbUser._id })
      .populate('author', 'username avatar email')
      .populate('taggedAuthorities')
      .sort({ createdAt: -1 })
      .lean();

    // Inject PostCard schema fields
    userPosts = await Promise.all(userPosts.map(async (q) => {
      const commentCount = await Comment.countDocuments({ questionId: q._id });
      const vote = await QuestionVote.findOne({ userId: dbUser._id, questionId: q._id }).lean();
      
      let authorName = q.author?.username || q.author?.name || 'UrbanFlow User';
      let authorHandle = q.author?.email ? q.author.email.split('@')[0] : (q.author?.username || q.author?.name || 'resident').toLowerCase().replace(/\s+/g, '');
      let authorAvatar = q.author?.avatar || q.author?.picture || '';

      if (q.isCivicReport && (!q.author || q.author._id?.toString() === '000000000000000000000000' || authorName === 'UrbanFlow User')) {
        authorName = 'CivicConnect AI Verified';
        authorHandle = 'civicconnect';
      }

      return {
        ...q,
        authorName,
        authorHandle,
        authorAvatar,
        timeAgo: getTimeAgo(q.createdAt),
        commentCount,
        userVote: vote ? vote.value : 0,
      };
    }));

    // Fetch user's replies
    const userReplies = await Comment.find({ authorEmail: email })
      .sort({ createdAt: -1 })
      .lean();

    // Fetch user's liked posts
    const likes = await QuestionVote.find({ userId: dbUser._id, value: 1 }).lean();
    const likedQuestionIds = likes.map(v => v.questionId);

    let likedPosts = await Question.find({ _id: { $in: likedQuestionIds } })
      .populate('author', 'username avatar email')
      .populate('taggedAuthorities')
      .sort({ createdAt: -1 })
      .lean();

    likedPosts = await Promise.all(likedPosts.map(async (q) => {
      const commentCount = await Comment.countDocuments({ questionId: q._id });
      return {
        ...q,
        authorName: q.author?.username || q.author?.name || 'UrbanFlow User',
        authorHandle: (q.author?.username || q.author?.name || 'resident').toLowerCase().replace(/\s+/g, ''),
        authorAvatar: q.author?.avatar || q.author?.picture || '',
        timeAgo: getTimeAgo(q.createdAt),
        commentCount,
        userVote: 1, // We know they liked it because it's in their liked list
      };
    }));

    // Fetch user's saved comments with parent question context
    const savedDocs = await Saved.find({ userId: dbUser._id }).sort({ createdAt: -1 }).lean();
    const savedCommentIds = savedDocs.map(s => s.commentId);
    console.log(`[PROFILE] Fetching saved comments for ${email}, found ${savedDocs.length} saved items`);

    let savedComments = await Comment.find({ _id: { $in: savedCommentIds } }).lean();

    // Enrich each saved comment with its parent question info
    savedComments = await Promise.all(savedComments.map(async (c) => {
      const parentQuestion = await Question.findById(c.questionId)
        .populate('author', 'username avatar email')
        .lean();
      return {
        ...c,
        timeAgo: getTimeAgo(c.createdAt),
        savedAt: savedDocs.find(s => s.commentId.toString() === c._id.toString())?.createdAt,
        parentQuestion: parentQuestion ? {
          _id: parentQuestion._id,
          title: parentQuestion.title,
          authorName: parentQuestion.author?.username || 'UrbanFlow User',
          authorAvatar: parentQuestion.author?.avatar || '',
        } : null
      };
    }));

    console.log(`[PROFILE] Returning profile for ${email}: ${userPosts.length} posts, ${likedPosts.length} likes, ${savedComments.length} saved`);

    res.status(200).json({
      posts: userPosts,
      replies: userReplies,
      likes: likedPosts,
      saved: savedComments
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user profile", details: err.message });
  }
};
