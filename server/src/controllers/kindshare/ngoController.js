import * as ngoService from "../../services/kindshare/ngoService.js";
import { sendVerificationEmail } from "../../services/kindshare/emailService.js";
import { db } from "../../firebaseadmin/firebaseadmin.js";



/* ----------------------------
REGISTER NGO
-----------------------------*/

export const registerNGO = async (req, res) => {

  try {

    const { name, adminName, email } = req.body;

    if (!name || !adminName || !email) {
      return res.status(400).json({
        error: "Missing required fields"
      });
    }

    console.log("Incoming NGO:", req.body);

    const ngo = await ngoService.registerNGO(req.body);

    await sendVerificationEmail(email, ngo.id);

    res.json({
      message: "NGO registered successfully",
      id: ngo.id
    });

  } catch (error) {

    console.error("REGISTER NGO ERROR:", error);

    res.status(500).json({
      error: "Failed to register NGO"
    });

  }

};

/* ----------------------------
VERIFY EMAIL
-----------------------------*/
export const verifyEmail = async (req, res) => {

  try {

    const { id } = req.params;

    await db.collection("kindshare_ngos")
      .doc(id)
      .update({
        emailVerified: true
      });

    res.send("Email verified successfully. You can now wait for admin approval.");

  } catch (error) {

    console.error(error);

    res.status(500).send("Verification failed");

  }

};


/* ----------------------------
GET NGOs
-----------------------------*/
export const getNGOs = async (req, res) => {

  try {

    const { category, lat, lon } = req.query;

    const ngos = await ngoService.getNGOs(category, lat, lon);

    res.json(ngos);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch NGOs"
    });

  }

};
export const getNGOStatus = async (req, res) => {

  const { id } = req.params;

  const doc = await db.collection("kindshare_ngos").doc(id).get();

  if (!doc.exists) {
    return res.status(404).json({ error: "NGO not found" });
  }

  res.json(doc.data());

};
export const getNGOByEmail = async (req, res) => {
  try {
    const { email } = req.query;
    const snapshot = await db.collection("kindshare_ngos")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Return 200 with isNGO: false so the frontend doesn't crash with a 404
      return res.status(200).json({ isNGO: false });
    }

    const doc = snapshot.docs[0];
    const data = doc.data();

    res.json({
      isNGO: true,
      id: doc.id,
      ngoName: data.name, // Mapping the database field 'name' to 'ngoName'
      status: data.status
    });
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
};
/* ----------------------------
GET ALL NGOs BY ADMIN EMAIL
-----------------------------*/
export const getNGOsByAdminEmail = async (req,res)=>{

try{

const { email } = req.query;

const snapshot = await db
.collection("kindshare_ngos")
.where("email","==",email)
.get();

const ngos = snapshot.docs.map(doc=>({
id:doc.id,
...doc.data()
}));

res.json(ngos);

}catch(error){

console.error(error);

res.status(500).json({
error:"Failed to fetch NGOs"
});

}

};