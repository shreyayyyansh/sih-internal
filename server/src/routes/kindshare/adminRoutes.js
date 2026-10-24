import express from "express";

import {
  getPendingNGOs,
  approveNGO,
  rejectNGO, 
  getNGOStats
  
 
} from "../../controllers/kindshare/adminController.js";

const router = express.Router();


router.get("/pending-ngos", getPendingNGOs);

router.patch("/approve/:id", approveNGO);

router.patch("/reject/:id", rejectNGO);
router.get("/stats", getNGOStats);
router.put("/approve/:id", approveNGO);


export default router;