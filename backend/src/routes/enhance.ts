import express from "express";
import multer from "multer";
import sharp from "sharp";
import { createTiles, EnhancedTile, enhanceTiles, ImageAnalysis } from "../services/tiler";
import { mergeTiles } from "../services/merger";
import { enhanceTile, postProcessImage, analyzeImage } from "../services/nanoBananaClient";
import { aiUpscale, aiEnhancePipeline, isReplicateConfigured, reimagineImage, codeFormerFaceRestore, clarityUpscale } from "../services/replicateUpscaler";

const router = express.Router();

// API status endpoint to verify configuration
router.get("/status", (_req, res) => {
  const replicateConfigured = isReplicateConfigured();
  const geminiKey = process.env.GEMINI_API_KEY;
  
  res.json({
    apiConfigured: replicateConfigured,
    replicateConfigured,
    geminiConfigured: Boolean(geminiKey),
    modelName: replicateConfigured ? "SDXL + CodeFormer + Clarity" : "Local Enhancement",
    status: replicateConfigured ? "ai_ready" : "local_only",
    modes: ["enhance", "reimagine", "faces"],
    message: replicateConfigured 
      ? "AI enhancement ready (Reimagine + Upscale + Face Restore)" 
      : "Set REPLICATE_API_TOKEN for AI features",
  });
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image uploads are allowed"));
      return;
    }
    cb(null, true);
  },
});

router.post("/enhance", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }

    const upscaleFactor = Number(req.body.upscaleFactor || 2);
    const imageType = (req.body.imageType as "portrait" | "object" | "nature" | "landscape") || "portrait";
    const imageBuffer = req.file.buffer;
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    if (!width || !height) {
      res.status(400).json({ error: "Unable to read image dimensions" });
      return;
    }

    // ==========================================
    // USE REAL-ESRGAN AI UPSCALING (if configured)
    // ==========================================
    if (isReplicateConfigured()) {
      console.log("=".repeat(50));
      console.log("[AI UPSCALE] Using Real-ESRGAN via Replicate API");
      console.log(`[AI UPSCALE] Input: ${width}x${height}, Scale: ${upscaleFactor}x, Type: ${imageType}`);
      console.log("=".repeat(50));

      // For nature/landscape, skip face detection
      let hasFaces = false;
      if (imageType !== "nature" && imageType !== "landscape") {
        // Analyze image to detect faces
        const analysis = await analyzeImage(imageBuffer);
        hasFaces = analysis.subjects.some(s => 
          s.toLowerCase().includes("face") || 
          s.toLowerCase().includes("person") ||
          s.toLowerCase().includes("portrait")
        ) || analysis.textures.some(t => 
          t.toLowerCase().includes("skin") ||
          t.toLowerCase().includes("face")
        );
        console.log(`[AI UPSCALE] Analysis: ${analysis.description}`);
        console.log(`[AI UPSCALE] Has faces: ${hasFaces}`);
      } else {
        console.log(`[AI UPSCALE] Nature mode - skipping face detection`);
      }

      // Use Real-ESRGAN AI enhancement with imageType
      const scale = Math.min(4, Math.max(2, upscaleFactor));
      const enhancedBuffer = await aiEnhancePipeline(imageBuffer, {
        scale,
        hasFaces,
        sharpen: true,
        imageType,
      });

      const finalMeta = await sharp(enhancedBuffer).metadata();
      const pngBuffer = await sharp(enhancedBuffer).png({ quality: 100 }).toBuffer();

      console.log(`[AI UPSCALE] Output: ${finalMeta.width}x${finalMeta.height}`);
      console.log("[AI UPSCALE] COMPLETE - Real-ESRGAN enhancement done!");

      res.json({
        imageBase64: pngBuffer.toString("base64"),
        width: finalMeta.width,
        height: finalMeta.height,
        aiEnhanced: true,
        model: "Real-ESRGAN",
        tilesProcessed: 1,
      });
      return;
    }

    // ==========================================
    // FALLBACK: Tile-based local enhancement
    // ==========================================
    console.log("[LOCAL] Replicate not configured, using local enhancement");

    const tileSize = Number(req.body.tileSize || 256);
    const overlap = Number(req.body.overlap || 64);
    const prompt = String(req.body.prompt || "enhance detail, keep the original style");
    const finalPass = String(req.body.finalPass || "false") === "true";
    
    // Quality controls
    const sharpness = Math.max(0, Math.min(100, Number(req.body.sharpness ?? 50)));
    const denoise = Math.max(0, Math.min(100, Number(req.body.denoise ?? 0)));
    const contrast = Math.max(0, Math.min(100, Number(req.body.contrast ?? 50)));
    const enhancementPasses = Math.max(1, Math.min(3, Number(req.body.enhancementPasses ?? 1)));

    console.log(`Processing: ${tileSize}px tiles, ${overlap}px overlap, ${upscaleFactor}x upscale, ${enhancementPasses} passes`);

    if (!Number.isFinite(tileSize) || tileSize <= 0) {
      res.status(400).json({ error: "Invalid tileSize" });
      return;
    }
    if (!Number.isFinite(overlap) || overlap < 0 || overlap >= tileSize) {
      res.status(400).json({ error: "Invalid overlap" });
      return;
    }
    if (!Number.isFinite(upscaleFactor) || upscaleFactor <= 0) {
      res.status(400).json({ error: "Invalid upscaleFactor" });
      return;
    }

    // Step 1: Analyze the image
    console.log("Step 1: Analyzing image...");
    const imageAnalysis = await analyzeImage(imageBuffer);
    console.log(`Textures: ${imageAnalysis.textures.join(", ")}`);

    // Step 2: Create tiles
    const { tiles, imageWidth, imageHeight } = await createTiles(imageBuffer, tileSize, overlap);

    if (tiles.length > 500) {
      res.status(400).json({ error: "Tile count too large. Please increase tile size or reduce overlap." });
      return;
    }

    console.log(`Step 2: Created ${tiles.length} tiles from ${imageWidth}x${imageHeight} image`);

    // Step 3: Enhance tiles with context-aware processing
    console.log("Step 3: Enhancing tiles with semantic understanding...");
    let enhancedTiles: EnhancedTile[] = await enhanceTiles(
      tiles,
      prompt,
      upscaleFactor,
      imageAnalysis,
      imageWidth,
      imageHeight
    );
    
    // For multiple passes, we re-enhance tiles for better detail
    for (let pass = 2; pass <= enhancementPasses; pass++) {
      console.log(`Running enhancement pass ${pass}/${enhancementPasses}...`);
      const passPrompt = `${prompt}. Pass ${pass}: Refine details further, enhance micro-textures, increase clarity.`;
      
      // Re-enhance already enhanced tiles (upscale factor 1 since already upscaled)
      for (let i = 0; i < enhancedTiles.length; i++) {
        enhancedTiles[i].enhancedBuffer = await enhanceTile(
          enhancedTiles[i].enhancedBuffer,
          passPrompt,
          1 // No additional upscaling in subsequent passes
        );
      }
    }

    const mergedBuffer = await mergeTiles(
      enhancedTiles,
      width,
      height,
      tileSize,
      overlap,
      upscaleFactor
    );

    let finalBuffer = mergedBuffer;

    if (finalPass) {
      // Improved final pass prompt for global consistency
      const finalPrompt = `${prompt}. CRITICAL: Ensure global consistency across the entire image. Fix any visible seams, color discontinuities, or artifacts. Enhance overall sharpness and detail uniformity. Do NOT change the content.`;
      finalBuffer = await enhanceTile(finalBuffer, finalPrompt, 1);
    }

    // Apply post-processing with user's quality settings
    // Use GENTLER settings to avoid pixelation
    const sharpnessStrength = Math.min(1.0, sharpness / 100); // 0-1 range (gentler)
    const denoiseStrength = denoise > 20; // Only apply if > 20%
    const contrastStrength = contrast > 55 || contrast < 45; // Only if notably different

    console.log("Step 5: Applying anti-pixelation post-processing...");
    finalBuffer = await postProcessImage(finalBuffer, {
      antiPixelate: true, // Always apply anti-pixelation smoothing
      sharpen: sharpness > 10,
      sharpnessAmount: sharpnessStrength,
      denoise: denoiseStrength,
      denoiseAmount: denoise,
      enhanceContrast: contrastStrength,
      contrastAmount: contrast / 50,
    });

    const finalMeta = await sharp(finalBuffer).metadata();

    const pngBuffer = await sharp(finalBuffer).png({ quality: 100 }).toBuffer();

    // Check if AI enhancement was used (env vars are set)
    const aiEnhanced = Boolean(process.env.NANOBANANA_API_KEY && process.env.NANOBANANA_API_URL);

    res.json({
      imageBase64: pngBuffer.toString("base64"),
      width: finalMeta.width,
      height: finalMeta.height,
      aiEnhanced,
      tilesProcessed: tiles.length,
    });
  } catch (err: any) {
    console.error(err);
    if (err instanceof multer.MulterError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: "Failed to enhance image" });
  }
});

// NEW: AI Upscale endpoint using Real-ESRGAN (professional quality like Topaz/Magnific)
router.post("/ai-upscale", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }

    const scale = Math.max(2, Math.min(4, Number(req.body.scale || 4)));
    const faceEnhance = String(req.body.faceEnhance || "true") === "true";

    console.log(`[AI Upscale] Starting Real-ESRGAN upscale (${scale}x, faceEnhance=${faceEnhance})`);

    const imageBuffer = req.file.buffer;
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    if (!width || !height) {
      res.status(400).json({ error: "Unable to read image dimensions" });
      return;
    }

    console.log(`[AI Upscale] Input image: ${width}x${height}`);

    // Analyze image to detect if it has faces
    const analysis = await analyzeImage(imageBuffer);
    const hasFaces = analysis.subjects.some(s => 
      s.toLowerCase().includes("face") || 
      s.toLowerCase().includes("person") ||
      s.toLowerCase().includes("portrait")
    ) || analysis.textures.some(t => 
      t.toLowerCase().includes("skin") ||
      t.toLowerCase().includes("face")
    );

    console.log(`[AI Upscale] Detected faces: ${hasFaces}`);

    // Use AI enhancement pipeline
    const enhancedBuffer = await aiEnhancePipeline(imageBuffer, {
      scale,
      hasFaces: hasFaces && faceEnhance,
      sharpen: true,
    });

    const finalMeta = await sharp(enhancedBuffer).metadata();
    const pngBuffer = await sharp(enhancedBuffer).png({ quality: 100 }).toBuffer();

    console.log(`[AI Upscale] Output image: ${finalMeta.width}x${finalMeta.height}`);

    res.json({
      imageBase64: pngBuffer.toString("base64"),
      width: finalMeta.width,
      height: finalMeta.height,
      aiEnhanced: isReplicateConfigured(),
      model: isReplicateConfigured() ? "Real-ESRGAN" : "Local",
      facesDetected: hasFaces,
    });
  } catch (err: any) {
    console.error("[AI Upscale] Error:", err);
    res.status(500).json({ error: "Failed to upscale image: " + err.message });
  }
});

// REIMAGINE endpoint - AI-powered image reimagination using Gemini + SDXL
router.post("/reimagine", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }

    const scale = Math.max(1, Math.min(4, Number(req.body.scale || 2)));
    const creativity = Math.max(0.1, Math.min(0.9, Number(req.body.creativity || 0.5)));
    const imageType = (req.body.imageType as "portrait" | "object" | "nature" | "landscape") || "portrait";

    console.log("=".repeat(60));
    console.log("[REIMAGINE API] Starting Reimagine Mode");
    console.log(`[REIMAGINE API] Creativity: ${creativity}, Scale: ${scale}x, Type: ${imageType}`);
    console.log("=".repeat(60));

    const imageBuffer = req.file.buffer;
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 0;
    const height = meta.height || 0;

    if (!width || !height) {
      res.status(400).json({ error: "Unable to read image dimensions" });
      return;
    }

    console.log(`[REIMAGINE API] Input image: ${width}x${height}`);

    const isNature = imageType === "nature" || imageType === "landscape";
    let enhancedBuffer: Buffer;
    let hasFaces = false;
    let detailedDescription = "Image";

    // For nature/landscape: Skip face detection, use standard upscaling
    if (isNature) {
      console.log("[REIMAGINE API] Nature mode - using standard upscaling");
      enhancedBuffer = await aiEnhancePipeline(imageBuffer, {
        scale,
        hasFaces: false,
        imageType: "nature",
      });
    } else {
      // STEP 1: Use Gemini to analyze and understand the image deeply
      console.log("[REIMAGINE API] Step 1: Analyzing image with Gemini AI...");
      const analysis = await analyzeImage(imageBuffer);
      
      // Build a detailed description for reimagination
      detailedDescription = [
        analysis.description,
        analysis.subjects.length > 0 ? `featuring ${analysis.subjects.join(", ")}` : "",
        analysis.textures.length > 0 ? `with ${analysis.textures.join(", ")} textures` : "",
      ].filter(Boolean).join(", ");

      console.log(`[REIMAGINE API] Analysis: ${detailedDescription.substring(0, 150)}...`);

      // Check if image has faces for special handling
      hasFaces = analysis.subjects.some(s => 
        s.toLowerCase().includes("face") || 
        s.toLowerCase().includes("person") ||
        s.toLowerCase().includes("portrait") ||
        s.toLowerCase().includes("woman") ||
        s.toLowerCase().includes("man")
      );

      if (hasFaces) {
        // For faces: Use CodeFormer for best face restoration
        console.log("[REIMAGINE API] Step 2: Face detected - using CodeFormer for restoration");
        enhancedBuffer = await codeFormerFaceRestore(imageBuffer);
        
        // Check if we need additional upscaling
        const newMeta = await sharp(enhancedBuffer).metadata();
        const currentScale = (newMeta.width || 1) / width;
        
        if (currentScale < scale * 0.9) {
          console.log("[REIMAGINE API] Step 3: Additional upscaling needed");
          enhancedBuffer = await aiUpscale(enhancedBuffer, { 
            scale: Math.ceil(scale / currentScale), 
            faceEnhance: true 
          });
        }
      } else {
        // For non-face images: Use SDXL reimagine for creative enhancement
        console.log("[REIMAGINE API] Step 2: Using SDXL Reimagine for creative enhancement");
        enhancedBuffer = await reimagineImage(imageBuffer, detailedDescription, {
          scale,
          creativity,
        });
      }
    }

    const finalMeta = await sharp(enhancedBuffer).metadata();
    const pngBuffer = await sharp(enhancedBuffer).png({ quality: 100 }).toBuffer();

    console.log("=".repeat(60));
    console.log(`[REIMAGINE API] COMPLETE: ${finalMeta.width}x${finalMeta.height}`);
    console.log("=".repeat(60));

    res.json({
      imageBase64: pngBuffer.toString("base64"),
      width: finalMeta.width,
      height: finalMeta.height,
      aiEnhanced: isReplicateConfigured(),
      model: isNature ? "Real-ESRGAN" : (hasFaces ? "CodeFormer" : "SDXL Reimagine"),
      mode: "reimagine",
      description: detailedDescription.substring(0, 200),
      facesDetected: hasFaces,
    });
  } catch (err: any) {
    console.error("[REIMAGINE API] Error:", err);
    res.status(500).json({ error: "Failed to reimagine image: " + err.message });
  }
});

export default router;
