// In your Express router file (e.g., cityPulse.routes.js)
import express from 'express';
import SocialPulse from '../models/urbanconnect/socialPulseModel.js';

const router = express.Router();
router.get('/latest', async (req, res) => {
  try {
    const latestPulse = await SocialPulse.findOne({ city: "Prayagraj" }).sort({ createdAt: -1 });
    if (!latestPulse) {
      return res.status(404).json({ success: false, message: "No City Pulse data found yet." });
    }
    res.json({ success: true, data: latestPulse }); 
  } catch (error) {
    console.error("Error fetching latest city pulse:", error);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
});
export default router;