import express from "express";
import {
createComplaint,
getNGOComplaints
} from "../../controllers/kindshare/complaintController.js";

const router = express.Router();

router.post("/",createComplaint);

router.get("/ngo/:ngoId",getNGOComplaints);

export default router;