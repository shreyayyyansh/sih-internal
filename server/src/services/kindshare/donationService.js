import { db } from "../../firebaseadmin/firebaseadmin.js";

export const createDonation = async (data) => {

  if (!data.ngoId) {
    throw new Error("NGO ID missing");
  }

  console.log("Saving donation:", data);

  const ref = await db.collection("kindshare_donations").add({

    ngoId: data.ngoId,

    donorName: data.donorName || "",
    donorEmail: data.donorEmail || "",
    donorPhone: data.donorPhone || "",
    donorAddress: data.donorAddress || "",

    itemName: data.itemName || "",
    category: data.category || "",   // IMPORTANT

    quantity: data.quantity || "",
    description: data.description || "",
    imageUrl: data.imageUrl || "",

    status: "pending",
    available: false,

    createdAt: new Date()

  });

  return {
    id: ref.id
  };

};

export const getNGODonations = async (ngoId) => {

  const snapshot = await db
    .collection("kindshare_donations")
    .where("ngoId","==",ngoId)
    .get();

  const donations = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  return donations;

};

export const updateDonationStatus = async (id,status) => {

  await db.collection("kindshare_donations")
  .doc(id)
  .update({status});

};

export const markAvailable = async (id) => {

  await db.collection("kindshare_donations")
  .doc(id)
  .update({available:true});

};