import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';
import { protectRoute } from '../middleware/auth.middleware.js';

const router = express.Router();

/**
 * Download a file from a URL
 * GET /api/download?url=...&filename=...
 */
router.get('/', protectRoute, async (req, res) => {
  try {
    const { url, filename } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    console.log(`📥 Download request: ${filename || 'file'} from ${url}`);

    // Parse the URL
    const parsedUrl = new URL(url);
    
    // Determine the protocol module to use (http or https)
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    // Set filename for download (use query param or extract from URL)
    const downloadFilename = filename || url.split('/').pop() || 'document';
    
    // Proxy the request to avoid CORS issues and set proper headers
    protocol.get(url, (response) => {
      // Get content type from response
      const contentType = response.headers['content-type'] || 'application/octet-stream';
      
      // Set headers for download
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      
      if (response.headers['content-length']) {
        res.setHeader('Content-Length', response.headers['content-length']);
      }
      
      console.log(`🔄 Streaming download: ${downloadFilename} (${contentType})`);
      
      // Pipe the response directly to the client
      response.pipe(res);
      
      // Handle errors during streaming
      response.on('error', (err) => {
        console.error('Error streaming file:', err);
        // Only send error if headers not sent yet
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });
      
    }).on('error', (err) => {
      console.error('Error downloading file:', err);
      res.status(500).json({ error: 'Error downloading file' });
    });
    
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: 'Server error while processing download' });
  }
});

export default router;
