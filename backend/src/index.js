import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import fs from "fs";

import path from "path";
import { fileURLToPath } from "url";

import { connectDB } from "./lib/db.js";

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

import authRoutes from "./routes/auth.route.js";
import linkPreviewRoutes from "./routes/linkPreview.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/group.route.js";
import twofaRoutes from "./routes/twofa.route.js";
import userRoutes from "./routes/user.route.js";
import statusRoutes from "./routes/status.route.js";
import supportRoutes from "./routes/support.route.js";
import aiRoutes from "./routes/ai.route.js";
import uploadRoutes from "./routes/upload.route.js";
import pollEventRoutes from "./routes/pollEvent.route.js";
import { app, server } from "./lib/socket.js";
import { cleanupOldMedia } from "./lib/cleanup.js";
import adminRoutes from "./routes/admin.route.js";

dotenv.config();

const PORT = process.env.PORT || 5001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Basic middleware
app.use(express.json({ limit: '100mb' }));  // Increased from 50mb to match Cloudinary limit
app.use(express.urlencoded({ extended: true, limit: '100mb' })); // Increased from 50mb
app.use(cookieParser());

// Function to get allowed origins based on environment
const getAllowedOrigins = () => {
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv === 'production') {
    return [
      process.env.PRODUCTION_URL || 'https://lynqit.onrender.com',
      'https://lynqit.onrender.com',
      'https://www.lynqit.onrender.com',
      // Also allow localhost for testing production builds locally
    ];
  } else {
    return [
      'http://localhost:5173',
      'http://localhost:3000',
      process.env.LOCAL_URL || 'http://localhost:5173'
    ];
  }
};

// Enhanced CORS configuration for Google OAuth compatibility
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = getAllowedOrigins();

    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));
console.log(`CORS configured for ${process.env.NODE_ENV || 'development'} with origins:`, getAllowedOrigins());

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`);
  next();
});

// API routes - important to define these before the static file middleware
app.use("/api/auth", authRoutes);
app.use("/api/link-preview", linkPreviewRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/2fa", twofaRoutes);
app.use("/api/users", userRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/support", supportRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api", pollEventRoutes);

// Import and use the download route
import downloadRoutes from "./routes/download.route.js";
app.use("/api/download", downloadRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "OK", message: "Server is running" });
});

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  try {
    // Path resolution for different environments including Render
    let frontendBuildPath;

    // Check if we're on Render (they have a specific path structure)
    if (process.env.RENDER) {
      frontendBuildPath = path.resolve('/opt/render/project/src/frontend/dist');
    } else {
      // Default path resolution for other environments
      frontendBuildPath = path.resolve(__dirname, "../../../frontend/dist");
    }

    console.log("Serving static files from:", frontendBuildPath);

    // Check if the directory exists
    if (!fs.existsSync(frontendBuildPath)) {
      console.error(`Frontend build directory not found at ${frontendBuildPath}`);
      console.error(`Current directory: ${process.cwd()}`);
      console.error(`__dirname: ${__dirname}`);
    }

    // Serve static files from the frontend build
    app.use(express.static(frontendBuildPath));

    // For any route not matching API routes, serve the frontend index.html
    // Use an explicit middleware instead of app.get("*") to avoid path-to-regexp issues
    app.use((req, res, next) => {
      // Skip API routes
      if (req.path.startsWith('/api')) {
        return next();
      }

      // Log the URL for debugging
      console.log(`Serving frontend for path: ${req.path}`);

      // Serve the index.html file
      res.sendFile(path.join(frontendBuildPath, "index.html"));
    });
  } catch (error) {
    console.error("Error setting up static file serving:", error);
    console.error("Stack trace:", error.stack);
  }
}

// Global error handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal Server Error", message: err.message });
});

server.listen(PORT, () => {
  console.log(`Server is running on PORT: ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Socket.IO: Configured with path: /socket.io`);
  console.log(`Allowed Origins:`, getAllowedOrigins());
  connectDB();
  // Schedule daily media cleanup at startup
  const dayMs = 24 * 60 * 60 * 1000;
  async function runCleanup(label = 'startup') {
    try {
      const { scanned, deleted } = await cleanupOldMedia();
      console.log(`[media-cleanup:${label}] scanned=${scanned} deleted=${deleted} retentionDays=${process.env.MEDIA_RETENTION_DAYS || 90}`);
    } catch (e) {
      console.error(`[media-cleanup:${label}] error`, e?.message);
    }
  }
  // Initial run after DB is connected (small delay)
  setTimeout(() => runCleanup('initial'), 10_000);
  // Repeat daily
  setInterval(() => runCleanup('interval'), dayMs);
});