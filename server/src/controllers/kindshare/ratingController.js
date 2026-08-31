export const submitRating = async(req,res)=>{

const {ngoId,rating,review,donorEmail}=req.body;

await db.collection("kindshare_ratings").add({

ngoId,
rating,
review,
donorEmail,
createdAt:new Date()

});

res.json({message:"Rating submitted"});

};