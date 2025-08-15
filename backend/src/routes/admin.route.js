import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { cleanupOldMedia } from "../lib/cleanup.js";

const router = express.Router();

// Simple admin endpoint to trigger media cleanup manually
router.post("/media/cleanup", protectRoute, async (req, res) => {
  try {
    const result = await cleanupOldMedia();
    res.status(200).json({ ok: true, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message });
  }
});

export default router;
