import Message from "../models/message.model.js";
import cloudinary from "./cloudinary.js";

// Default retention in days; can be overridden via env MEDIA_RETENTION_DAYS
const RETENTION_DAYS = parseInt(process.env.MEDIA_RETENTION_DAYS || "90", 10);
const BATCH_SIZE = 100;

function extractCloudinaryPublicId(url) {
  try {
    if (!url) return null;
    const regex = /\/v\d+\/(?:.*\/)?(.+?)\./;
    const match = url.match(regex);
    if (match && match[1]) return match[1];
    const parts = url.split('/')
    const filename = parts[parts.length - 1];
    return filename.split('.')[0];
  } catch {
    return null;
  }
}

export async function cleanupOldMedia() {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
  // Only target messages with media (image URL) not already cleaned and older than cutoff
  const query = {
    image: { $exists: true, $ne: null },
    createdAt: { $lt: cutoff },
    mediaDeletedAt: null
  };

  const messages = await Message.find(query).limit(BATCH_SIZE);
  let deleted = 0;

  for (const msg of messages) {
    const publicId = extractCloudinaryPublicId(msg.image);
    if (!publicId) {
      // Mark as handled even if we couldn't parse id to avoid retry loops
      await Message.updateOne({ _id: msg._id }, { mediaDeletedAt: new Date() });
      continue;
    }
    try {
      await cloudinary.uploader.destroy(publicId);
      await Message.updateOne({ _id: msg._id }, { mediaDeletedAt: new Date() });
      deleted++;
    } catch (e) {
      // On failure, skip; next run can retry
      // Optional: add retry count field in future
    }
  }

  return { scanned: messages.length, deleted };
}
