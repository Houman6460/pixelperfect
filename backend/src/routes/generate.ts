import { Router, Request, Response } from "express";
import multer from "multer";
import { generateImage } from "../services/imageGenerator";
import { aiEnhancePipeline } from "../services/replicateUpscaler";
import { saveImage as saveToGallery } from "../services/galleryStorage";
import sharp from "sharp";

const router = Router();

// Simple rate limiter - one request at a time, with cooldown
let isGenerating = false;
let lastGenerateTime = 0;
const COOLDOWN_MS = 5000; // 5 second cooldown between requests

// Configure multer for multiple file uploads (up to 5 reference images)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB per file
}).array("referenceImages", 5);

import { getSettings, getApiKeys } from "../services/adminSettings";

/**
 * GET /api/generate/status
 * Get current AI provider status and settings
 */
router.get("/status", (_req: Request, res: Response) => {
  try {
    const settings = getSettings();
    const apiKeys = getApiKeys();
    res.json({
      aiProvider: settings.aiProvider,
      apiKeys,
      settings: {
        autoSaveToGallery: settings.autoSaveToGallery,
        defaultUpscaleEnabled: settings.defaultUpscaleEnabled,
        defaultUpscaleFactor: settings.defaultUpscaleFactor,
      }
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/generate
 * Generate an image from prompt, optionally with reference images
 * 
 * Body (form-data):
 * - prompt: string (required) - Text description of the image to generate
 * - referenceImages: File[] (optional) - Up to 5 reference images for mix mode
 * - style: string (optional) - "photorealistic" | "artistic" | "anime" | "digital-art"
 * - autoUpscale: boolean (optional) - Whether to upscale after generation
 * - upscaleFactor: number (optional) - Upscale factor if autoUpscale is true
 */
router.post("/", (req: Request, res: Response) => {
  // Rate limiting check
  const now = Date.now();
  if (isGenerating) {
    return res.status(429).json({ error: "A generation is already in progress. Please wait." });
  }
  if (now - lastGenerateTime < COOLDOWN_MS) {
    const waitTime = Math.ceil((COOLDOWN_MS - (now - lastGenerateTime)) / 1000);
    return res.status(429).json({ error: `Please wait ${waitTime} seconds before generating again.` });
  }

  upload(req, res, async (err) => {
    if (err) {
      console.error("[Generate] Upload error:", err);
      return res.status(400).json({ error: err.message });
    }

    // Mark as generating
    isGenerating = true;
    lastGenerateTime = Date.now();

    try {
      const { prompt, style = "photorealistic", autoUpscale, upscaleFactor, editMode = "instruct" } = req.body;

      if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        isGenerating = false;
        return res.status(400).json({ error: "Prompt is required" });
      }

      // Get reference images if provided
      const files = req.files as Express.Multer.File[] | undefined;
      const referenceImages = files?.map(f => f.buffer) || [];

      console.log(`[Generate] Request: prompt="${prompt.substring(0, 50)}...", style=${style}, mode=${editMode}, refs=${referenceImages.length}, upscale=${autoUpscale}`);

      const shouldUpscale = autoUpscale === "true" || autoUpscale === true;
      const scale = parseInt(upscaleFactor) || 2;

      // Step 1: Generate the image
      console.log(`[Generate] Step 1: Generating image...`);
      const generated = await generateImage({
        prompt: prompt.trim(),
        referenceImages,
        style: style as any,
        editMode: editMode as "instruct" | "creative",
      });
      console.log(`[Generate] Step 1 complete: ${generated.width}x${generated.height}`);

      let finalResult = {
        imageBase64: generated.imageBase64,
        width: generated.width,
        height: generated.height,
        prompt: generated.prompt,
        upscaled: false,
        upscaleFactor: 1,
      };

      // Step 2: Upscale if requested (sequential, using same pipeline as upscale section)
      if (shouldUpscale && scale > 1) {
        console.log(`[Generate] Step 2: Professional AI Enhancement (${scale}x)...`);
        try {
          const imageBuffer = Buffer.from(generated.imageBase64, "base64");
          
          // Use the same high-quality pipeline as the upscale section
          const upscaledBuffer = await aiEnhancePipeline(imageBuffer, {
            scale: Math.min(4, scale), // Real-ESRGAN max is 4x
            hasFaces: true, // Assume faces for generated portraits
            sharpen: true,
          });
          
          const upscaledMeta = await sharp(upscaledBuffer).metadata();
          const upscaledBase64 = upscaledBuffer.toString("base64");
          
          finalResult = {
            imageBase64: upscaledBase64,
            width: upscaledMeta.width || generated.width * scale,
            height: upscaledMeta.height || generated.height * scale,
            prompt: generated.prompt,
            upscaled: true,
            upscaleFactor: scale,
          };
          console.log(`[Generate] Step 2 complete: ${finalResult.width}x${finalResult.height}`);
        } catch (upscaleError: any) {
          console.error("[Generate] Upscale failed, returning original:", upscaleError.message);
          // Continue with non-upscaled result
        }
      }

      // Step 3: Auto-save to gallery
      console.log(`[Generate] Step 3: Saving to gallery...`);
      try {
        const imageBuffer = Buffer.from(finalResult.imageBase64, "base64");
        const filename = `generated_${Date.now()}.png`;
        saveToGallery(
          imageBuffer, 
          filename, 
          null, // root folder
          "generate", // source
          finalResult.width,
          finalResult.height,
          { prompt: finalResult.prompt, upscaleFactor: finalResult.upscaleFactor }
        );
        console.log(`[Generate] Saved to gallery: ${filename}`);
      } catch (saveError: any) {
        console.error("[Generate] Gallery save failed:", saveError.message);
        // Don't fail the request if gallery save fails
      }

      return res.json({
        success: true,
        imageBase64: finalResult.imageBase64,
        width: finalResult.width,
        height: finalResult.height,
        prompt: finalResult.prompt,
        upscaled: finalResult.upscaled,
        upscaleFactor: finalResult.upscaleFactor,
      });
    } catch (error: any) {
      console.error("[Generate] Error:", error);
      return res.status(500).json({ 
        error: error.message || "Failed to generate image",
        details: process.env.NODE_ENV === "development" ? error.stack : undefined,
      });
    } finally {
      // Always reset the generating flag
      isGenerating = false;
    }
  });
});

export default router;
