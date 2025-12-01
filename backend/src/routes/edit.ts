import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import {
  inpaintImage,
  removeObject,
  expandImage,
  generativeFill,
  removeBackground,
  smartSelect,
  detectFace,
  enhanceSkin,
  crystalUpscale,
  generateTextOnImage,
  proFocus,
  proLighting,
  styleTransfer,
} from "../services/imageEditor";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

/**
 * POST /api/edit/inpaint
 * Regenerate masked area with a prompt
 */
router.post(
  "/inpaint",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: "Image is required" });
      }
      if (!files.mask || !files.mask[0]) {
        return res.status(400).json({ error: "Mask is required" });
      }

      const prompt = req.body.prompt || "high quality, detailed";
      const negativePrompt = req.body.negativePrompt;
      const strength = parseFloat(req.body.strength) || 0.85;
      const guidance = parseFloat(req.body.guidance) || 7.5;

      console.log("[EDIT API] Inpaint request received");
      console.log(`[EDIT API] Prompt: ${prompt}`);

      const imageBuffer = files.image[0].buffer;
      const maskBuffer = files.mask[0].buffer;

      // Ensure mask is grayscale PNG
      const processedMask = await sharp(maskBuffer)
        .grayscale()
        .png()
        .toBuffer();

      const result = await inpaintImage(imageBuffer, processedMask, prompt, {
        negativePrompt,
        strength,
        guidance,
      });

      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Inpaint error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/remove
 * Remove object from masked area
 */
router.post(
  "/remove",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: "Image is required" });
      }
      if (!files.mask || !files.mask[0]) {
        return res.status(400).json({ error: "Mask is required" });
      }

      console.log("[EDIT API] Remove object request received");

      const imageBuffer = files.image[0].buffer;
      const maskBuffer = files.mask[0].buffer;

      // Ensure mask is grayscale PNG
      const processedMask = await sharp(maskBuffer)
        .grayscale()
        .png()
        .toBuffer();

      const result = await removeObject(imageBuffer, processedMask);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Remove error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/expand
 * Magic expand - extend image borders
 */
router.post("/expand", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Image is required" });
    }

    const direction = (req.body.direction as "left" | "right" | "top" | "bottom" | "all") || "all";
    const expandAmount = parseInt(req.body.expandAmount) || 256;
    const prompt = req.body.prompt || undefined;

    console.log("[EDIT API] Expand request received");
    console.log(`[EDIT API] Direction: ${direction}, Amount: ${expandAmount}`);

    const result = await expandImage(req.file.buffer, direction, expandAmount, prompt);
    const meta = await sharp(result).metadata();

    res.json({
      success: true,
      imageBase64: result.toString("base64"),
      width: meta.width,
      height: meta.height,
    });
  } catch (error: any) {
    console.error("[EDIT API] Expand error:", error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/edit/generative-fill
 * Fill selected area with AI-generated content
 */
router.post(
  "/generative-fill",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: "Image is required" });
      }
      if (!files.mask || !files.mask[0]) {
        return res.status(400).json({ error: "Mask is required" });
      }

      const prompt = req.body.prompt;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required for generative fill" });
      }

      console.log("[EDIT API] Generative fill request received");
      console.log(`[EDIT API] Prompt: ${prompt}`);

      const imageBuffer = files.image[0].buffer;
      const maskBuffer = files.mask[0].buffer;

      const processedMask = await sharp(maskBuffer)
        .grayscale()
        .png()
        .toBuffer();

      const result = await generativeFill(imageBuffer, processedMask, prompt);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Generative fill error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/smart-select
 * Auto-detect and select objects using Grounded-SAM
 * Returns mask for detected objects
 */
router.post(
  "/smart-select",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      const prompt = req.body.prompt || "person, face, object";
      console.log(`[EDIT API] Smart select request - prompt: "${prompt}"`);

      const imageBuffer = req.file.buffer;
      const result = await smartSelect(imageBuffer, prompt);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        maskBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Smart select error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/remove-background
 * Remove background from image using Bria RMBG model
 * Returns transparent PNG
 */
router.post(
  "/remove-background",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      console.log("[EDIT API] Background removal request received");

      const imageBuffer = req.file.buffer;
      const result = await removeBackground(imageBuffer);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Background removal error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/detect-face
 * Detect if image contains a face/portrait
 */
router.post(
  "/detect-face",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      console.log("[EDIT API] Face detection request received");

      const imageBuffer = req.file.buffer;
      const hasFace = await detectFace(imageBuffer);

      res.json({
        success: true,
        hasFace,
      });
    } catch (error: any) {
      console.error("[EDIT API] Face detection error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/enhance-skin
 * Enhance skin using Qwen Image Edit Skin LoRA
 */
router.post(
  "/enhance-skin",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      const prompt = req.body.prompt || "smooth skin, clear complexion, natural look, preserve details";
      console.log(`[EDIT API] Skin enhancement request - prompt: "${prompt}"`);

      const imageBuffer = req.file.buffer;
      const result = await enhanceSkin(imageBuffer, prompt);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Skin enhancement error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/upscale
 * Crystal Upscaler - 2x upscale with enhanced details
 */
router.post(
  "/upscale",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      console.log("[EDIT API] Crystal Upscale request received");

      const imageBuffer = req.file.buffer;
      const result = await crystalUpscale(imageBuffer);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Upscale error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/generate-text
 * Generate text on image using FLUX Fill Pro
 */
router.post(
  "/generate-text",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: "Image is required" });
      }
      if (!files.mask || !files.mask[0]) {
        return res.status(400).json({ error: "Mask is required - draw where text should appear" });
      }

      const textPrompt = req.body.prompt;
      if (!textPrompt) {
        return res.status(400).json({ error: "Text prompt is required" });
      }

      console.log(`[EDIT API] Generate text request: "${textPrompt}"`);

      const imageBuffer = files.image[0].buffer;
      const maskBuffer = files.mask[0].buffer;

      const processedMask = await sharp(maskBuffer)
        .grayscale()
        .png()
        .toBuffer();

      const result = await generateTextOnImage(imageBuffer, processedMask, textPrompt);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Generate text error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/pro-focus
 * Apply professional depth of field effect
 */
router.post(
  "/pro-focus",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      const intensity = (req.body.intensity || 'medium') as 'subtle' | 'medium' | 'strong';
      console.log(`[EDIT API] Pro Focus request - Intensity: ${intensity}`);

      const imageBuffer = req.file.buffer;
      const result = await proFocus(imageBuffer, intensity);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Pro Focus error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/pro-lighting
 * Apply cinematic relighting effects
 */
router.post(
  "/pro-lighting",
  upload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Image is required" });
      }

      const mood = (req.body.mood || 'golden') as 'golden' | 'moody' | 'soft' | 'dramatic' | 'natural' | 'spotlight';
      const intensity = parseInt(req.body.intensity) || 50;
      console.log(`[EDIT API] Pro Lighting request - Mood: ${mood}, Intensity: ${intensity}%`);

      const imageBuffer = req.file.buffer;
      const result = await proLighting(imageBuffer, mood, intensity);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Pro Lighting error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

/**
 * POST /api/edit/style-transfer
 * Apply artistic styles or textures to images
 */
router.post(
  "/style-transfer",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "mask", maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (!files.image || !files.image[0]) {
        return res.status(400).json({ error: "Image is required" });
      }

      const style = req.body.style || 'anime';
      const intensity = parseInt(req.body.intensity) || 70;
      const hasMask = files.mask && files.mask[0];
      
      console.log(`[EDIT API] Style Transfer request - Style: ${style}, Intensity: ${intensity}%, Has Mask: ${hasMask ? 'Yes' : 'No'}`);

      const imageBuffer = files.image[0].buffer;
      let maskBuffer: Buffer | null = null;
      
      if (hasMask) {
        maskBuffer = await sharp(files.mask[0].buffer)
          .grayscale()
          .png()
          .toBuffer();
      }

      const result = await styleTransfer(imageBuffer, maskBuffer, style, intensity);
      const meta = await sharp(result).metadata();

      res.json({
        success: true,
        imageBase64: result.toString("base64"),
        width: meta.width,
        height: meta.height,
      });
    } catch (error: any) {
      console.error("[EDIT API] Style Transfer error:", error);
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
