import admin from 'firebase-admin';
import { db } from "../../firebaseadmin/firebaseadmin.js";

/**
 * PATCH /api/voice/:alertId/analysis
 * Callback from Python voice analysis agent — stores transcript + urgency + summary + pattern + actionItems.
 */
export const storeVoiceAnalysis = async (req, res) => {
  try {
    const { alertId } = req.params;
    const { transcript, urgency, summary, pattern, actionItems } = req.body;

    if (!alertId || !transcript) {
      return res.status(400).json({ error: "Missing alertId or transcript" });
    }

    const analysisData = {
      transcript,
      urgency,
      summary,
      pattern: pattern || "",
      actionItems: actionItems || [],
      analyzedAt: new Date().toISOString(),
    };

    // Update Firestore
    const docRef = db.collection('voice_alerts').doc(alertId);
    await docRef.update({ analysis: analysisData });

    // Update RTDB so admin panel sees it in real-time
    const rtdb = admin.database();
    await rtdb.ref(`voice_alerts/${alertId}/analysis`).set(analysisData);

    console.log(`🧠 Voice analysis stored for alert: ${alertId} | Urgency: ${urgency} | Pattern: ${pattern}`);

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("❌ Failed to store voice analysis:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

/**
 * GET /api/voice/history/:userId
 * Returns recent voice alerts for a user (used by Python agent for memory context).
 */
export const getVoiceHistory = async (req, res) => {
  try {
    const { userId } = req.params;

    const snapshot = await db.collection('voice_alerts')
      .where('userId', '==', userId)
      .orderBy('timestamp', 'desc')
      .limit(5)
      .get();

    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    return res.status(200).json({ success: true, alerts });
  } catch (error) {
    console.error("❌ Failed to fetch voice history:", error);
    return res.status(500).json({ error: "Internal Server Error", alerts: [] });
  }
};

