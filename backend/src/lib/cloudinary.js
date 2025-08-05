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
 * @returns {Promise<object>} - Cloudinary upload response
 */
export const uploadToCloudinary = async (filePath) => {
  try {
    // Verify the file exists first
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist at path: ${filePath}`);
    }
    
    console.log(`Starting Cloudinary upload for: ${filePath}`);
    
    const result = await cloudinary.uploader.upload(filePath, {
      resource_type: "auto", // Automatically detect resource type
      folder: "lynqit_assistant",
      timeout: 60000 // 60 second timeout
    });
    
    console.log(`Successfully uploaded to Cloudinary: ${result.secure_url}`);
    return result;
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error.message);
    throw error;
  }
};

export default cloudinary;