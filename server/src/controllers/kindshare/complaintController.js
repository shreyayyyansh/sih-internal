import { db } from "../../firebaseadmin/firebaseadmin.js";

export const createComplaint = async (req,res)=>{

try{

const { ngoId, name, itemOrCategory, issue, complaintFrom } = req.body;

const ref = await db.collection("kindshare_complaints").add({
ngoId: ngoId || "",
name: name || "",
itemOrCategory: itemOrCategory || "",
issue: issue || "",
complaintFrom: complaintFrom || "",
createdAt: new Date()
});

res.json({
id: ref.id,
message:"Complaint submitted"
});

}catch(error){

console.error("Complaint error:",error);

res.status(500).json({
error:"Failed to submit complaint"
});

}

};

export const getNGOComplaints = async (req,res)=>{

try{

const { ngoId } = req.params;

const snapshot = await db
.collection("kindshare_complaints")
.where("ngoId","==",ngoId)
.get();

const complaints = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
}));

res.json(complaints);

}catch(error){

res.status(500).json({
error:"Failed to fetch complaints"
});

}

};