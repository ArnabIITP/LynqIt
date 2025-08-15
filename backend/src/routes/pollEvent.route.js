import express from 'express';
import {
	createPoll,
	votePoll,
	createEvent,
	rsvpEvent
} from '../controllers/pollEvent.controller.js';
import { protectRoute as requireAuth } from "../middleware/auth.middleware.js";

const router = express.Router();

// Create poll in group
router.post('/poll', requireAuth, createPoll);
// Vote on poll
router.post('/poll/:messageId/vote', requireAuth, votePoll);

// Create event in group
router.post('/event', requireAuth, createEvent);
// RSVP to event
router.post('/event/:messageId/rsvp', requireAuth, rsvpEvent);

export default router;
