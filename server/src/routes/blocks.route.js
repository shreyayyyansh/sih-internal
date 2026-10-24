import express from "express";
import { fetchBlocks, updateBlock } from "../controllers/blocks.controller.js";

const router = express.Router();

router.post("/fetch", fetchBlocks);
router.post("/update", updateBlock);

export default router;
