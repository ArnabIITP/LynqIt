import express from 'express';
import multer from 'multer';
import { uploadMemory } from '../middleware/multer.middleware.js';
import { protectRoute } from '../middleware/auth.middleware.js';
import { uploadToCloudinary, getFileTypeFromMimetype } from '../lib/cloudinary.js';
import { detectResourceTypeAndFolder } from '../lib/fileTypeHelper.js';
import path from 'path';
import fs from 'fs';
import util from 'util';

// Convert callback-based fs.unlink to Promise-based
const unlinkAsync = util.promisify(fs.unlink);

const router = express.Router();

// Error handler for file uploads
const uploadErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Files must be less than 100MB due to Cloudinary\'s free tier limits',
        details: {
          maxSize: '100MB',
          actualSize: Math.round(req.headers['content-length'] / (1024 * 1024)) + 'MB'
        }
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({ error: err.message });
  }
  next();
};

/**
 * Upload a file to Cloudinary
 * POST /api/upload
 */
router.post('/', protectRoute, uploadMemory.single('file'), uploadErrorHandler, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get file details
    const { originalname, mimetype, buffer, size } = req.file;
    // Log upload details
    console.log(`📤 Upload request received: ${originalname} (${(size/(1024*1024)).toFixed(2)}MB) - ${mimetype}`);
    // Detect resource type and folder based on extension and mimetype
    const { resource_type, folder } = detectResourceTypeAndFolder(originalname, mimetype);
    // Add timeout for large files
    const timeoutPromise = new Promise((_, reject) => {
      const timeout = size > 50 * 1024 * 1024 ? 300000 : 120000; // 5 min for large files, 2 min for smaller
      setTimeout(() => reject(new Error(`Upload timed out after ${timeout/1000} seconds`)), timeout);
    });
    // Upload to Cloudinary with timeout (using buffer)
    console.log(`🔄 Starting Cloudinary upload with ${resource_type} resource type to folder '${folder}' (memory buffer)`);
    const uploadPromise = uploadToCloudinary(buffer, resource_type, folder, originalname);
    // Race the upload against the timeout
    const result = await Promise.race([uploadPromise, timeoutPromise]);
    console.log(`✅ Upload complete: ${result.secure_url}`);
    // Determine media type for our database
    const mediaType = getFileTypeFromMimetype(mimetype);
    // Return the upload details including file metadata with enhanced info
    res.status(200).json({
      url: result.secure_url,
      mediaType,
      fileName: originalname,
      fileSize: size,
      publicId: result.public_id,
      format: result.format,
      resourceType: result.resource_type,
      width: result.width || null,
      height: result.height || null,
      duration: result.duration || null
    });
  } catch (error) {
    console.error('Error in file upload:', error);
    
    // Try to clean up any partial upload
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      try {
        await unlinkAsync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up partial upload:', cleanupError);
      }
    }
    
    // Return appropriate error based on type
    if (error.message && error.message.includes('timed out')) {
      res.status(504).json({ 
        error: 'Upload timeout', 
        message: 'The file upload took too long. Try with a smaller file or better connection.', 
        details: { originalError: error.message, fullError: error }
      });
    } else {
      // Always return the full error object for debugging
      res.status(500).json({ 
        error: 'File upload failed', 
        message: error.message || 'Unknown error occurred during upload',
        details: error
      });
    }
  }
});

export default router;
