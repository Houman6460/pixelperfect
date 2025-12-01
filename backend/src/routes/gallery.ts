import { Router, Request, Response } from "express";
import multer from "multer";
import sharp from "sharp";
import * as gallery from "../services/galleryStorage";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ============== FOLDER ROUTES ==============

// Get all folders
router.get("/folders", (_req: Request, res: Response) => {
  try {
    const folders = gallery.getAllFolders();
    res.json({ success: true, folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get folders in a specific parent (null for root)
router.get("/folders/list", (req: Request, res: Response) => {
  try {
    const parentId = req.query.parentId as string | undefined;
    const folders = gallery.getFolders(parentId === "null" || !parentId ? null : parentId);
    res.json({ success: true, folders });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Create folder
router.post("/folders", (req: Request, res: Response) => {
  try {
    const { name, parentId } = req.body;
    if (!name) {
      return res.status(400).json({ error: "Folder name is required" });
    }
    const folder = gallery.createFolder(name, parentId || null);
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rename folder
router.patch("/folders/:folderId", (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "New name is required" });
    }
    const folder = gallery.renameFolder(folderId, name);
    if (!folder) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ success: true, folder });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete folder
router.delete("/folders/:folderId", (req: Request, res: Response) => {
  try {
    const { folderId } = req.params;
    const deleteContents = req.query.deleteContents === "true";
    const success = gallery.deleteFolder(folderId, deleteContents);
    if (!success) {
      return res.status(404).json({ error: "Folder not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== IMAGE ROUTES ==============

// Get all images
router.get("/images", (req: Request, res: Response) => {
  try {
    const folderId = req.query.folderId as string | undefined;
    const all = req.query.all === "true";
    
    let images;
    if (all) {
      images = gallery.getAllImages();
    } else {
      images = gallery.getImages(folderId === "null" || !folderId ? null : folderId);
    }
    
    // Add URLs to images
    const imagesWithUrls = images.map(img => ({
      ...img,
      url: gallery.getImageUrl(img.id),
    }));
    
    res.json({ success: true, images: imagesWithUrls });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get single image metadata
router.get("/images/:imageId", (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const image = gallery.getImage(imageId);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ 
      success: true, 
      image: { ...image, url: gallery.getImageUrl(image.id) } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get image file
router.get("/images/:imageId/file", (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const image = gallery.getImage(imageId);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    
    const buffer = gallery.getImageBuffer(imageId);
    if (!buffer) {
      return res.status(404).json({ error: "Image file not found" });
    }
    
    const ext = image.filename.split(".").pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      png: "image/png",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      gif: "image/gif",
      webp: "image/webp",
    };
    
    res.setHeader("Content-Type", mimeTypes[ext || "png"] || "image/png");
    res.setHeader("Content-Disposition", `inline; filename="${image.originalName}"`);
    res.send(buffer);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Upload image to gallery
router.post("/images/upload", upload.single("image"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image provided" });
    }
    
    const { folderId } = req.body;
    const metadata = await sharp(req.file.buffer).metadata();
    
    const image = gallery.saveImage(
      req.file.buffer,
      req.file.originalname,
      folderId === "null" || !folderId ? null : folderId,
      "upload",
      metadata.width || 0,
      metadata.height || 0
    );
    
    res.json({ 
      success: true, 
      image: { ...image, url: gallery.getImageUrl(image.id) } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Save generated/enhanced image to gallery
router.post("/images/save", async (req: Request, res: Response) => {
  try {
    const { imageBase64, name, folderId, source, width, height, metadata } = req.body;
    
    if (!imageBase64) {
      return res.status(400).json({ error: "Image data is required" });
    }
    
    const buffer = Buffer.from(imageBase64, "base64");
    
    const image = gallery.saveImage(
      buffer,
      name || `image_${Date.now()}.png`,
      folderId === "null" || !folderId ? null : folderId,
      source || "upload",
      width || 0,
      height || 0,
      metadata
    );
    
    res.json({ 
      success: true, 
      image: { ...image, url: gallery.getImageUrl(image.id) } 
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Rename image
router.patch("/images/:imageId", (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: "New name is required" });
    }
    const image = gallery.renameImage(imageId, name);
    if (!image) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ success: true, image });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete single image
router.delete("/images/:imageId", (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const success = gallery.deleteImage(imageId);
    if (!success) {
      return res.status(404).json({ error: "Image not found" });
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete multiple images
router.post("/images/delete-batch", (req: Request, res: Response) => {
  try {
    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: "imageIds must be an array" });
    }
    const deleted = gallery.deleteImages(imageIds);
    res.json({ success: true, deleted });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Move single image
router.post("/images/:imageId/move", (req: Request, res: Response) => {
  try {
    const { imageId } = req.params;
    const { targetFolderId } = req.body;
    
    const image = gallery.moveImage(
      imageId, 
      targetFolderId === "null" || targetFolderId === undefined ? null : targetFolderId
    );
    
    if (!image) {
      return res.status(404).json({ error: "Image or target folder not found" });
    }
    res.json({ success: true, image });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Move multiple images
router.post("/images/move-batch", (req: Request, res: Response) => {
  try {
    const { imageIds, targetFolderId } = req.body;
    if (!Array.isArray(imageIds)) {
      return res.status(400).json({ error: "imageIds must be an array" });
    }
    
    const moved = gallery.moveImages(
      imageIds,
      targetFolderId === "null" || targetFolderId === undefined ? null : targetFolderId
    );
    res.json({ success: true, moved });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============== STATS ==============

router.get("/stats", (_req: Request, res: Response) => {
  try {
    const stats = gallery.getGalleryStats();
    res.json({ success: true, stats });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
