import express from 'express';
import { askQuestion, chatWithPDF, analyzeImage, getConversationHistory, generateNotes } from '../controllers/aiController.js';

const router = express.Router();

/**
 * POST /api/ai/ask
 * Body: { userId, pdfId, text, question }
 * Purpose: Sends user question + PDF text to Gemini API, saves conversation, returns answer
 */
router.post('/ask', askQuestion);

/**
 * POST /api/ai/chat
 * Body: { pdfId, message, conversationId? }
 * Purpose: Chat with PDF content
 */
router.post('/chat', chatWithPDF);

/**
 * GET /api/ai/conversation/:pdfId
 * Query: { page?, limit? }
 * Purpose: Get conversation history for a PDF with pagination
 */
router.get('/conversation/:pdfId', getConversationHistory);

/**
 * POST /api/ai/analyze-image
 * Body: { imageData }
 * Purpose: Analyze image with AI
 */
router.post('/analyze-image', analyzeImage);

/**
 * POST /api/ai/generate-notes
 * Body: { pdfId }
 * Purpose: Generate comprehensive notes from PDF content
 */
router.post('/generate-notes', generateNotes);

export default router;
