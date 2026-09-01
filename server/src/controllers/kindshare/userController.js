import { db } from "../../firebaseadmin/firebaseadmin.js";

export const getUserRole = async (req, res) => {

  const { email } = req.query;

  const snapshot = await db
    .collection("kindshare_users")
    .where("email", "==", email)
    .get();

  if (snapshot.empty) {
    return res.json({ role: "USER" });
  }

  const user = snapshot.docs[0].data();

  res.json(user);

};