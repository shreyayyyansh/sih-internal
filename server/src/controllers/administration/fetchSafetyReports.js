import { db } from "../../firebaseadmin/firebaseadmin.js";

export const fetchSafetyReports = async (req, res) => {
  try {
    const reportsRef = db.collection("chatReports");
    const snapshot = await reportsRef.orderBy("createdAt", "desc").get();
    
    const reports = [];
    snapshot.forEach((doc) => {
      reports.push({ id: doc.id, ...doc.data() });
    });

    res.status(200).json({
      success: true,
      data: reports
    });
  } catch (error) {
    console.error("Error fetching safety reports:", error);
    res.status(500).json({ success: false, message: "Failed to fetch safety reports." });
  }
};
