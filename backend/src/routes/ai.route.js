import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { processAIQuery, getConversations, getConversation, deleteConversation } from "../controllers/ai.controller.js";
import { uploadAI } from "../middleware/multer.middleware.js";

const router = express.Router();

// Process AI queries (with optional file uploads)
router.post("/query", protectRoute, uploadAI.array('attachments', 8), processAIQuery);

// Get all conversations for a user
router.get("/conversations", protectRoute, getConversations);

// Get a specific conversation
router.get("/conversations/:conversationId", protectRoute, getConversation);

// Delete a conversation
router.delete("/conversations/:conversationId", protectRoute, deleteConversation);

export default router;
