import { db } from "../../firebaseadmin/firebaseadmin.js";

export const createComplaint = async (data) => {

  const ref = await db.collection("kindshare_complaints").add({

    ngoId: data.ngoId,
    ngoName: data.ngoName,
    donorEmail: data.donorEmail,
    issue: data.issue,
    description: data.description,
    createdAt: new Date()

  });

  return { id: ref.id };

};


export const getNGOComplaints = async (ngoId) => {

  const snapshot = await db
    .collection("kindshare_complaints")
    .where("ngoId","==",ngoId)
    .get();

  const complaints = [];

  snapshot.forEach(doc=>{
    complaints.push({
      id: doc.id,
      ...doc.data()
    });
  });

  return complaints;

};