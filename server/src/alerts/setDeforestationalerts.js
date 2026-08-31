import { db } from "../firebaseadmin/firebaseAdmin.js";

export const setDeforestationAlert = async (req, res) => {
  try {
    const {
      reportRef, 
    } = req.body;

    const userId = req.auth?.payload?.sub;


    if (!userId ) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields:  or userId",
      });
    }

    if (!reportRef) {
      return res.status(400).json({
        success: false,
        error: "Missing required field: reportRef",
      });
    }
    const alertRef = await db
      .collection("Alerts")
      .doc(userId)
      .collection("deforestation_alerts")
      .add({
        reportRef,
        createdAt: new Date(),
      });

    return res.status(201).json({
      success: true,
      alertId: alertRef.id, 
    });

  } catch (error) {
    console.error("Set Deforestation Alert Error:", error);

    return res.status(500).json({
      success: false,
      error: "Failed to create deforestation alert",
    });
  }
};
