import express from "express";
import {
  getAnnouncements,
  searchAnnouncementsForRAG,
} from "../controllers/urbanconnect/announcement.controller.js";

const router = express.Router();

// GET /api/announcements?city=Delhi&limit=20
router.get("/", getAnnouncements);

// POST /api/announcements/search  (internal, used by Python agent for RAG)
router.post("/search", searchAnnouncementsForRAG);

export default router;
