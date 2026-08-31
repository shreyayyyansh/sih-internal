import { db } from "../../firebaseadmin/firebaseAdmin.js";
import { sendApprovalEmail, sendRejectionEmail } from "./emailService.js";

export const getPendingNGOs = async () => {

  const snapshot = await db
    .collection("kindshare_ngos")
    .where("emailVerified", "==", true)
    .where("status", "==", "pending")
    .get();

  const ngos = [];

  snapshot.forEach((doc) => {
    ngos.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return ngos;

};
export const approveNGO = async (ngoId) => {

  const ngoRef = db.collection("kindshare_ngos").doc(ngoId);

  const doc = await ngoRef.get();

  if (!doc.exists) {
    throw new Error("NGO not found");
  }

  const ngo = doc.data();

  await ngoRef.update({
    status: "approved"
  });

  // create NGO admin user
  await db.collection("kindshare_users").add({

    email: ngo.email,
    role: "NGO_ADMIN",
    ngoId: ngoId,
    createdAt: new Date()

  });

  // send approval email
  await sendApprovalEmail(ngo.email, ngo.name);

};
export const rejectNGO = async (ngoId) => {

  const ngoRef = db.collection("kindshare_ngos").doc(ngoId);

  const doc = await ngoRef.get();

  if (!doc.exists) {
    throw new Error("NGO not found");
  }

  const ngo = doc.data();

  await ngoRef.update({
    status: "rejected"
  });

  // send rejection email
  await sendRejectionEmail(ngo.email, ngo.name);

};