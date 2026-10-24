import { db } from "../../firebaseadmin/firebaseadmin.js";
import { sendApprovalEmail, sendRejectionEmail } from "../../services/kindshare/emailService.js";
import * as adminService from "../../services/kindshare/adminService.js";




/* GET ALL PENDING NGOs */

export const getPendingNGOs = async (req, res) => {

  try {

    const ngos = await adminService.getPendingNGOs();

    res.json(ngos);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch NGOs"
    });

  }

};



/* APPROVE NGO */
export const approveNGO = async (req, res) => {

  try {

    const { id } = req.params;

    await adminService.approveNGO(id);

    res.json({
      message: "NGO approved successfully"
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to approve NGO"
    });

  }

};


/* REJECT NGO */

export const rejectNGO = async (req, res) => {

  const { id } = req.params;

  const ngoRef = db.collection("kindshare_ngos").doc(id);
  const ngoDoc = await ngoRef.get();

  const ngo = ngoDoc.data();

  await ngoRef.update({
    status: "rejected"
  });

  await sendRejectionEmail(ngo.email);

  res.json({
    message: "NGO rejected"
  });

};
export const getNGOStats = async (req, res) => {
  try {

    const snapshot = await db.collection("kindshare_ngos").get();

    let total = 0;
    let pending = 0;
    let approved = 0;
    let rejected = 0;

    snapshot.forEach(doc => {

      total++;

      const data = doc.data();

      if (data.status === "pending") pending++;
      if (data.status === "approved") approved++;
      if (data.status === "rejected") rejected++;

    });

    res.json({
      total,
      pending,
      approved,
      rejected
    });

  } catch (error) {

    res.status(500).json({
      error: "Failed to fetch stats"
    });

  }
};