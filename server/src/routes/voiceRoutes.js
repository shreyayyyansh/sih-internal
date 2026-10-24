import express from 'express';
import { uploadMiddleware, uploadVoiceNote } from '../controllers/women/voiceController.js';
import { storeVoiceAnalysis, getVoiceHistory } from '../controllers/women/voiceAnalysisController.js';

const router = express.Router();

// Route: POST /api/voice/upload
router.post('/upload', uploadMiddleware.single('audio'), uploadVoiceNote);

// Route: GET /api/voice/history/:userId (for Python agent memory)
router.get('/history/:userId', getVoiceHistory);

// Route: PATCH /api/voice/:alertId/analysis (callback from Python agent)
router.patch('/:alertId/analysis', storeVoiceAnalysis);

export default router;
