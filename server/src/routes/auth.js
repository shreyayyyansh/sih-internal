import express from "express";
import axios from "axios";
import {db} from "../firebaseadmin/firebaseadmin.js";
import User from "../models/urbanconnect/userModel.js";

import { checkJwt } from "../auth/authMiddleware.js";

const router = express.Router();

router.post("/sync-user", checkJwt, async (req, res) => {
  try {
    // Get access token from header
    const accessToken = req.headers.authorization?.split(" ")[1];

    if (!accessToken) {
      return res.status(401).json({ message: "Missing access token" });
    }

    // Fetch user profile from Auth0
    const { data: user } = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/userinfo`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    // 1. Sync to MongoDB (UrbanConnect)
    const email = user.email?.toLowerCase();
    if (email) {
      let mongoUser = await User.findOne({ email });
      const userData = {
        auth0Id: user.sub,
        username: user.name || user.nickname || "UrbanFlow User",
        email: email,
        avatar: user.picture || null
      };

      if (!mongoUser) {
        await User.create(userData);
        console.log(`[AuthSync] Created new MongoDB user for ${email}`);
      } else {
        // Update existing user with latest info from Auth0
        mongoUser.auth0Id = userData.auth0Id;
        if (userData.avatar) mongoUser.avatar = userData.avatar;
        if (userData.username && (!mongoUser.username || mongoUser.username === 'UrbanFlow User')) {
            mongoUser.username = userData.username;
        }
        await mongoUser.save();
        console.log(`[AuthSync] Updated MongoDB user for ${email}`);
      }
    }

    // 2. Firestore reference
    const userRef = db.collection("users").doc(user.sub);
    let doc = await userRef.get();

    if (!doc.exists) {
      const newUser = {
        uid: user.sub,
        email: user.email ?? null,
        name: user.name ?? null,
        picture: user.picture ?? null,
        createdAt: new Date(),
        rating: 3,
        interestedToWork: false,
        hasSeenWorkerPrompt: false,
        completedJobs: 0,
        workerCategories: [],
        safe_walk_streak: 0,
        false_sos_count: 0,
        trust_score: 5.0,
        is_verified: false,
      };
      await userRef.set(newUser);
      doc = await userRef.get(); // Refresh doc
    }

    const userData = doc.data();

    return res.json({
      success: true,
      safe_walk_streak: userData.safe_walk_streak ?? 0,
      false_sos_count: userData.false_sos_count ?? 0,
      is_verified: userData.is_verified ?? false,
      trust_score: userData.trust_score ?? 5.0,
    });
  } catch (error) {
    console.error("SYNC USER ERROR:", error.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

export default router;
