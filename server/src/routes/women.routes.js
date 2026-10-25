import express from "express";
import { checkJwt } from "../auth/authMiddleware.js";
import { createSosEvent, resolveSosEvent } from "../controllers/women/sosEvent.controller.js";

const router = express.Router();

router.post("/sos-event", checkJwt, createSosEvent);
router.patch("/sos-event/:id/resolution", checkJwt, resolveSosEvent);

export default router;
