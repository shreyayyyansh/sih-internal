import { db } from "../../firebaseadmin/firebaseadmin.js";
import * as donationService from "../../services/kindshare/donationService.js";

export const createDonation = async (req,res)=>{

  try{

    const donation = await donationService.createDonation(req.body);

    res.json(donation);

  }catch(error){

    console.error(error);

    res.status(500).json({
      error:"Donation failed"
    });

  }

};




export const getNGODonations = async (req, res) => {

  try {

    const { ngoId } = req.params;

    const snapshot = await db
      .collection("kindshare_donations")
      .where("ngoId", "==", ngoId)
      .get();

    const donations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.json(donations);

  } catch (error) {

    res.status(500).json({
      error: "Failed to fetch donations"
    });

  }

};

import { sendDonationStatusEmail } from "../../services/kindshare/emailService.js";

export const updateDonationStatus = async (req, res) => {

  try {

    const { id } = req.params;
    const { status } = req.body;

    const donationRef = db.collection("kindshare_donations").doc(id);
    const doc = await donationRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Donation not found" });
    }

    const donation = doc.data();

    // Update status
    await donationRef.update({ status });

    // Send email
    await sendDonationStatusEmail(
      donation.donorEmail,
      donation.donorName,
      status
    );

    res.json({ message: "Status updated and email sent" });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to update donation"
    });

  }

};
export const getDonationById = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await db.collection("kindshare_donations").doc(id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: "Donation not found" });
    }

    res.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch donation" });
  }
};
export const getDonorDonations = async (req, res) => {

  const { email } = req.query;

  const snapshot = await db
    .collection("kindshare_donations")
    .where("donorEmail", "==", email)
    .get();

  const donations = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  res.json(donations);

};
export const getAvailableDonationsByNGO = async (req, res) => {

  try {

    const { ngoId } = req.params;
    const { category } = req.query;

    const snapshot = await db
      .collection("kindshare_donations")
      .where("ngoId", "==", ngoId)
      .where("status", "==", "available")
      .get();

    let donations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // filter category safely
   if (category) {
  donations = donations.filter(d => d.category === category);
}

    res.json(donations);

  } catch (error) {

    console.error(error);

    res.status(500).json({
      error: "Failed to fetch donations"
    });

  }

};