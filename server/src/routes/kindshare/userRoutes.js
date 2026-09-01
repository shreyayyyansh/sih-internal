import express from "express";
import { getUserRole } from "../../controllers/kindshare/userController.js";

const router = express.Router();

router.get("/role", getUserRole);

export default router;