import { db } from "../../firebaseadmin/firebaseadmin.js";

export const submitFeedback = async (req,res)=>{

try{

const feedback = {
...req.body,
rating:Number(req.body.rating),
createdAt:new Date()
};

await db.collection("kindshare_feedback").add(feedback);

/* update NGO rating */

const snapshot = await db
.collection("kindshare_feedback")
.where("ngoId","==",feedback.ngoId)
.get();

let total = 0;

snapshot.forEach(doc=>{
total += doc.data().rating;
});

const avg = total / snapshot.size;

await db
.collection("kindshare_ngos")
.doc(feedback.ngoId)
.update({
rating:avg
});

res.json({
message:"Feedback submitted"
});

}catch(error){

console.error(error);

res.status(500).json({
error:"Failed to submit feedback"
});

}

};