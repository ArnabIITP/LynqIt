import express from 'express';
import { getLinkPreview } from 'link-preview-js';
import axios from 'axios';

const router = express.Router();

// GET /api/link-preview?url=https://example.com

router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing url parameter' });

  // YouTube link detection (robust for all formats)
  const isYouTube = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//.test(url);
  if (isYouTube) {
    try {
      const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
      if (!YOUTUBE_API_KEY) return res.status(500).json({ error: 'YouTube API key not configured' });
      // Extract video or playlist ID from all YouTube URL formats
      let videoId = null, playlistId = null;
      // youtu.be short link
      const youtuBeMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
      if (youtuBeMatch) videoId = youtuBeMatch[1];
      // youtube.com/watch?v=...
      const videoMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
      if (videoMatch) videoId = videoMatch[1];
      // youtube.com/playlist?list=...
      const playlistMatch = url.match(/[?&]list=([a-zA-Z0-9_-]+)/);
      if (playlistMatch) playlistId = playlistMatch[1];
      let apiUrl = null;
      if (playlistId) {
        apiUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet&id=${playlistId}&key=${YOUTUBE_API_KEY}`;
      } else if (videoId) {
        apiUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${YOUTUBE_API_KEY}`;
      }
      if (!apiUrl) return res.status(400).json({ error: 'Invalid YouTube URL' });
      const ytRes = await axios.get(apiUrl);
      if (ytRes.data.items && ytRes.data.items.length > 0) {
        const snippet = ytRes.data.items[0].snippet;
        return res.json({
          title: snippet.title,
          description: snippet.description,
          images: snippet.thumbnails ? [snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url] : [],
          siteName: 'YouTube',
          url,
        });
      } else {
        return res.status(404).json({ error: 'No preview available' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Failed to fetch YouTube preview', details: err.message });
    }
  }

  // Fallback: generic link preview
  try {
    // Use a browser-like User-Agent for better compatibility
    const data = await getLinkPreview(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });
    res.json(data);
  } catch (err) {
    let errorMsg = 'Failed to fetch link preview';
    if (err.code === 'ECONNREFUSED') {
      errorMsg = 'Could not connect to the target website (connection refused)';
    } else if (err.code === 'ENOTFOUND') {
      errorMsg = 'Could not resolve the target website (not found)';
    } else if (err.response && err.response.status === 403) {
      errorMsg = 'The target website blocked the preview request (forbidden)';
    }
    res.status(500).json({ error: errorMsg, details: err.message, url });
  }
});

export default router;
