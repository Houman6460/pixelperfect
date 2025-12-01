// Fix SSL certificate issues for some Node.js environments
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import path from "path";
import enhanceRouter from "./routes/enhance";
import generateRouter from "./routes/generate";
import galleryRouter from "./routes/gallery";
import authRouter from "./routes/auth";
import adminRouter from "./routes/admin";
import editRouter from "./routes/edit";
import musicRouter from "./routes/music";
import promptRouter from "./routes/prompt";
import sunoRouter from "./routes/suno";
import workflowsRouter from "./routes/workflows";
import musicGalleryRouter from "./routes/musicGallery";
import videoRouter from "./routes/video";
import textRouter from "./routes/text";
import threeDRouter from "./routes/threeD";
import subscriptionsRouter from "./routes/subscriptions";
import { initDatabase } from "./database/db";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Serve uploaded files
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api", enhanceRouter);
app.use("/api/generate", generateRouter);
app.use("/api/gallery", galleryRouter);
app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/edit", editRouter);
app.use("/api/music", musicRouter);
app.use("/api/prompt", promptRouter);
app.use("/api/suno", sunoRouter);
app.use("/api/workflows", workflowsRouter);
app.use("/api/music-gallery", musicGalleryRouter);
app.use("/api/video", videoRouter);
app.use("/api/text", textRouter);
app.use("/api/3d", threeDRouter);
app.use("/api/subscriptions", subscriptionsRouter);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

const port = process.env.PORT || 4000;

// Initialize database and start server
initDatabase().then(() => {
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
    console.log(`API: http://localhost:${port}/api`);
  });
}).catch(err => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});
