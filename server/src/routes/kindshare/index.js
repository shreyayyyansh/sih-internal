import express from "express";
import { 
  registerNGO, 
  getNGOs, 
  verifyEmail, 
  getNGOStatus,
  getNGOsByAdminEmail
} from "../../controllers/kindshare/ngoController.js";

import donationRoutes from "./donationRoutes.js";
import adminRoutes from "./adminRoutes.js";
import userRoutes from "./userRoutes.js";
import complaintRoutes from "./complaintRoutes.js";
import requestRoutes from "./requestRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";



const router = express.Router();

/* NGO ROUTES */
router.post("/ngos/register", registerNGO);
router.get("/ngos", getNGOs);
router.get("/ngos/verify/:id", verifyEmail);
router.get("/ngos/status/:id", getNGOStatus);

/* ⭐ ADD THIS ROUTE */
router.get("/ngos/admin-ngos", getNGOsByAdminEmail);

/* DONATION ROUTES */
router.use("/donations", donationRoutes);

/* ADMIN ROUTES */
router.use("/admin", adminRoutes);

/* USER ROUTES */
router.use("/users", userRoutes);
router.use("/complaints",complaintRoutes);
router.use("/requests", requestRoutes);
router.use("/feedback",feedbackRoutes);

export default router;