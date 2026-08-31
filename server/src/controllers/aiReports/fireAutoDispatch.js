import { tryFireAutoDispatch } from '../../services/autoDispatch.js';

export const fireAutoDispatch = async (req, res) => {
  try {
    const { alertId, geohash, location } = req.body;

    if (!alertId || !geohash || !location) {
      return res.status(400).json({ message: "Missing required fields: alertId, geohash, location" });
    }

    // Fire-and-forget: do not await this, we just respond with 200 immediately
    tryFireAutoDispatch({ alertId, geohash, location }).catch(() => {});

    return res.status(200).json({
      status: "SUCCESS",
      message: "Fire auto-dispatch triggered"
    });

  } catch (error) {
    console.error("Error triggering fire auto-dispatch:", error);
    return res.status(500).json({
      status: "FAILED",
      message: error.message
    });
  }
};
