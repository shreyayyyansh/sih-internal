import express from "express";
import { registerNGO, getNGOs,verifyEmail,getNGOByEmail} from "../../controllers/kindshare/ngoController.js";

const router = express.Router();

router.post("/register", registerNGO);

router.get("/", getNGOs);
router.get("/verify/:id", verifyEmail);
router.get("/by-email", getNGOByEmail);

export default router;