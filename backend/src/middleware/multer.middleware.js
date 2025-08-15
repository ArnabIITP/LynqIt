import multer from "multer";
import path from "path";
import fs from "fs";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory from middleware:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Use absolute path to uploads directory
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname);
    console.log(`Multer generated filename: ${fileName}`);
    cb(null, fileName);
  }
});

// File filter for all media types (images, videos, documents, audio)
const fileFilter = (req, file, cb) => {
  // Get the file extension
  const ext = path.extname(file.originalname).toLowerCase();
  
  // Get the mime type
  const mimetype = file.mimetype;
  
  // Allowed file types by category
  const allowedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg'];
  const allowedDocumentTypes = ['application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/vnd.ms-excel', 
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/plain'];
  const allowedAudioTypes = ['audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/webm'];
  
  // Check if file type is allowed
  if (
    allowedImageTypes.includes(mimetype) || 
    allowedVideoTypes.includes(mimetype) || 
    allowedDocumentTypes.includes(mimetype) || 
    allowedAudioTypes.includes(mimetype)
  ) {
    cb(null, true);
  } else {
    cb(new Error('File type not supported. Please upload images, videos, documents, or audio files.'), false);
  }
};

// Error handler for multer to provide detailed errors
const multerErrorHandler = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // A Multer error occurred when uploading
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        message: 'Files must be less than 100MB due to Cloudinary\'s free tier limits',
        details: err.message
      });
    }
    return res.status(400).json({ error: err.message });
  } else if (err) {
    // An unknown error occurred
    return res.status(500).json({ error: err.message });
  }
  next();
};

// Configure multer for general uploads (all media types) with improved error handling
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit (Cloudinary free tier limit)
    fieldSize: 100 * 1024 * 1024 // Also increase field size limit
  }
});

// Image-only filter
const imageFileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

// Configure multer for AI assistant uploads (images only)
export const uploadAI = multer({
  storage: storage,
  fileFilter: imageFileFilter, // Only accept images for AI assistant
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

// Memory storage for direct Cloudinary upload (alternative)
const memoryStorage = multer.memoryStorage();

export const uploadMemory = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
  fileFilter: fileFilter // Use same filter for memory storage
});
