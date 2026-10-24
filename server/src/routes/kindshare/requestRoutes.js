import express from "express";
import {
  createRequest,
  getNGORequests
} from "../../controllers/kindshare/requestController.js";
import { updateRequestStatus } from "../../controllers/kindshare/requestController.js";
import { getReceiverRequests } from "../../controllers/kindshare/requestController.js";





const router = express.Router();

router.post("/", createRequest);

router.get("/ngo/:ngoId", getNGORequests);

router.put("/:id/status", updateRequestStatus);
router.get("/receiver", getReceiverRequests);

export default router;