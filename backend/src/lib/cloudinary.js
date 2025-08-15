import { v2 as cloudinary } from "cloudinary";
import { config } from "dotenv";
import fs from "fs";

config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a file to Cloudinary from a local file path
 * @param {string} filePath - Path to the file to upload
 * @param {string} resourceType - Type of resource (auto, image, video, raw)
 * @param {string} folder - Folder to upload to
 * @returns {Promise<object>} - Cloudinary upload response
 * 
 * Note: For video and audio files, use resource_type: "video"
 *       For images, use resource_type: "image"
 *       For documents and other files, use resource_type: "raw"
 *       Use "auto" only when the type is uncertain
 */
export const uploadToCloudinary = async (fileOrBuffer, resourceType = "auto", folder = "lynqit_assistant", originalname = null) => {
  try {
    let uploadOptions = {
      resource_type: resourceType,
      folder: folder,
      timeout: 300000,
      use_filename: true,
      unique_filename: true,
      chunk_size: 10000000
    };
    if (originalname) {
      uploadOptions.filename_override = originalname;
    }
    let result;
    if (Buffer.isBuffer(fileOrBuffer)) {
      // Log buffer info for debugging
      console.log('Buffer length:', fileOrBuffer.length);
      console.log('Buffer first 32 bytes:', fileOrBuffer.slice(0, 32));
      // Upload from buffer (memory storage)
      result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
        stream.end(fileOrBuffer);
      });
    } else {
      // Fallback: upload from file path (should not be used with memory storage)
      result = await cloudinary.uploader.upload(fileOrBuffer, uploadOptions);
    }
    console.log(`✅ Successfully uploaded to Cloudinary: ${result.secure_url}`);
    console.log(`📊 Resource type: ${result.resource_type}, Format: ${result.format}, Size: ${result.bytes} bytes`);
    return result;
  } catch (error) {
    console.error("❌ Error uploading to Cloudinary:", error.message);
    console.error("Stack trace:", error.stack);
    throw error;
  }
};

/**
 * Determine the appropriate resource type for Cloudinary upload based on file mimetype
 * @param {string} mimetype - The MIME type of the file
 * @returns {string} - Cloudinary resource type
 */
export const getCloudinaryResourceType = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    console.log(`🖼️ Resource type for ${mimetype}: image`);
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    console.log(`🎬 Resource type for ${mimetype}: video`);
    return 'video';
  } else if (mimetype.startsWith('audio/')) {
    console.log(`🔊 Resource type for ${mimetype}: video (for audio files)`);
    return 'video'; // Cloudinary handles audio files under the "video" resource type
  } else {
    console.log(`📄 Resource type for ${mimetype}: raw`);
    return 'raw'; // For documents and other files
  }
};

/**
 * Get the file type category based on mimetype
 * @param {string} mimetype - The MIME type of the file
 * @returns {string} - File type category
 */
export const getFileTypeFromMimetype = (mimetype) => {
  if (mimetype.startsWith('image/')) {
    return 'image';
  } else if (mimetype.startsWith('video/')) {
    return 'video';
  } else if (mimetype.startsWith('audio/')) {
    return 'music';
  } else {
    return 'document';
  }
};

export default cloudinary;