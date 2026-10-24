import express from "express";
import {
  createDonation,
  getNGODonations,
  updateDonationStatus,
  getDonationById,
  getDonorDonations
} from "../../controllers/kindshare/donationController.js";
import multer from "multer";
import { imagekindshare } from "../../services/uploadImage.js";
import { getAvailableDonationsByNGO } from "../../controllers/kindshare/donationController.js";



const router = express.Router();

// Create donation
router.post("/", createDonation);

// Get donations for NGO
router.get("/ngo/:ngoId", getNGODonations);

// Get donations by donor
router.get("/donor", getDonorDonations);

// Get donation status
router.get("/status/:id", getDonationById);

// Update donation status
router.put("/:id/status", updateDonationStatus)


const upload = multer({ dest: "uploads/" });

router.post("/upload-image", upload.single("image"), imagekindshare);
router.get("/available/:ngoId", getAvailableDonationsByNGO);


export default router;