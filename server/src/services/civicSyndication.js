import Question from '../models/urbanconnect/questionModel.js';
import axios from 'axios';
import mongoose from 'mongoose';

/**
 * Fire-and-forget service that bridges CivicConnect reports into UrbanConnect.
 */
export async function civicSyndication(payload) {
  try {
    const {
      reportId,
      assigned_category,
      title,
      description,
      aiAnalysis,
      imageUrl,
      geohash,
      location,
      userId
    } = payload;

    if (!reportId) return;

    // 1. Guard against UNCERTAIN reports
    if (assigned_category === 'UNCERTAIN') {
      console.log(`[CivicSyndication] Ignored UNCERTAIN report ${reportId}`);
      return;
    }

    // 2. Guard against duplicate syndication (e.g. from locality updates)
    const exists = await Question.exists({ reportId });
    if (exists) {
      console.log(`[CivicSyndication] Report ${reportId} already syndicated. Skipping new Question creation.`);
      return;
    }

    // 3. Create the initial Question document
    // Find the actual User in UrbanConnect if they exist
    let authorId = new mongoose.Types.ObjectId('000000000000000000000000');
    if (payload.email) {
       const uUser = await import('../models/urbanconnect/userModel.js').then(m => m.default.findOne({ email: payload.email.toLowerCase() }));
       if (uUser) {
           authorId = uUser._id;
           console.log(`[CivicSyndication] Mapped reporter email ${payload.email} to ObjectId ${authorId}`);
       }
    }

    const combinedDescription = aiAnalysis ? `${description}\n\nAI Notes:\n${aiAnalysis}` : description;

    const newQuestion = await Question.create({
      author: authorId,
      title: title || 'Civic Issue Reported',
      description: combinedDescription || 'No description provided.',
      image: imageUrl ? [imageUrl] : [],
      isCivicReport: true,
      reportId: reportId,
      reportCategory: assigned_category,
      reportStatus: 'PENDING',
      geohash: geohash
    });

    console.log(`[CivicSyndication] Created Question doc ${newQuestion._id} for report ${reportId}`);

    // ---> INJECT CACHE CLEARING <---
    try {
      const { getRedisClient } = await import('../config/redis.js');
      const redisClient = getRedisClient();
      if (redisClient) {
        const keys = await redisClient.keys('urbanconnect:questions:*');
        if (keys.length > 0) {
          await redisClient.del(keys);
          console.log(`[CivicSyndication] Relieved ${keys.length} cached UrbanConnect feeds`);
        }
      }
    } catch (cacheErr) {
      console.error(`[CivicSyndication] Cache reset bypass failed`, cacheErr.message);
    }

    // 4. Run through UrbanConnect AI Pipeline via Python endpoint
    const pyUrl = process.env.PYTHON_SERVER || 'http://localhost:8000';
    const aiResponse = await axios.post(`${pyUrl}/analyze-civic`, {
      postId: newQuestion._id.toString(),
      title: newQuestion.title,
      description: newQuestion.description,
      imageUrls: newQuestion.image,
      city: geohash || "" 
    });

    const aiData = aiResponse.data;

    // 5. Update Question with AI results
    if (aiData.status === 'success') {
      await Question.findByIdAndUpdate(newQuestion._id, {
        $set: {
          'aiAnalysis.sentiment': aiData.sentiment,
          'aiAnalysis.sentimentScore': aiData.sentiment_score,
          'aiAnalysis.urgency': aiData.urgency,
          'aiAnalysis.clusterId': aiData.cluster_id,
          embedding: aiData.embedding
        }
      });
      console.log(`[CivicSyndication] Successfully ran AI pipeline for ${reportId}`);
    }

  } catch (err) {
    // Silent failure
    console.error(`[CivicSyndication] Error during syndication:`, err.message);
  }
}
