import sharp from "sharp";
import axios from "axios";
import https from "https";

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

// Create axios instance with SSL fix for macOS development
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

function isReplicateConfigured(): boolean {
  return !!getReplicateToken();
}

// Helper to run Replicate model and wait for result
async function runReplicateModel(
  modelOrVersion: string,
  input: Record<string, unknown>
): Promise<string | null> {
  const token = getReplicateToken();
  if (!token) return null;

  try {
    // Determine if this is a model name (contains /) or version hash
    const isModelName = modelOrVersion.includes("/");
    
    let createUrl = REPLICATE_API_URL;
    let requestBody: Record<string, unknown>;
    
    if (isModelName) {
      // Use the models API for named models
      createUrl = `https://api.replicate.com/v1/models/${modelOrVersion}/predictions`;
      requestBody = { input };
    } else {
      // Use version hash
      requestBody = { version: modelOrVersion, input };
    }
    
    // Create prediction
    const createResponse = await apiClient.post(
      createUrl,
      requestBody,
      {
        headers: {
          Authorization: `Token ${token}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    const predictionId = createResponse.data.id;
    const getUrl = createResponse.data.urls?.get || `${REPLICATE_API_URL}/${predictionId}`;

    // Poll for completion - allow more time for cold starts
    let attempts = 0;
    const maxAttempts = 180; // 3 minutes max for cold starts

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000)); // Check every 2 seconds
      attempts++;

      try {
        const statusResponse = await apiClient.get(getUrl, {
          headers: { Authorization: `Token ${token}` },
        });

        const status = statusResponse.data.status;
        
        // Log progress every 10 attempts
        if (attempts % 10 === 0) {
          console.log(`[Replicate] Status: ${status} (attempt ${attempts}/${maxAttempts})`);
        }
        
        if (status === "succeeded") {
          const output = statusResponse.data.output;
          return Array.isArray(output) ? output[0] : output;
        } else if (status === "failed" || status === "canceled") {
          console.error("[Replicate] Prediction failed:", statusResponse.data.error);
          return null;
        }
        // Continue waiting for "starting" or "processing" status
      } catch (pollError: any) {
        console.warn(`[Replicate] Poll error (attempt ${attempts}):`, pollError.message);
        // Continue polling even if individual poll fails
      }
    }

    console.error("[Replicate] Prediction timed out after 3 minutes");
    return null;
  } catch (error: any) {
    // Handle rate limiting with retry
    if (error.response?.status === 429) {
      console.log("[Replicate] Rate limited (429), waiting 10 seconds before retry...");
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      // Retry once after waiting
      const isModel = modelOrVersion.includes("/");
      try {
        const retryResponse = await apiClient.post(
          isModel ? `https://api.replicate.com/v1/models/${modelOrVersion}/predictions` : REPLICATE_API_URL,
          isModel ? { input } : { version: modelOrVersion, input },
          {
            headers: {
              Authorization: `Token ${token}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );
        
        const predictionId = retryResponse.data.id;
        const getUrl = retryResponse.data.urls?.get || `${REPLICATE_API_URL}/${predictionId}`;
        
        // Poll for completion
        let attempts = 0;
        while (attempts < 90) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          attempts++;
          
          const statusResponse = await apiClient.get(getUrl, {
            headers: { Authorization: `Token ${token}` },
          });
          
          if (statusResponse.data.status === "succeeded") {
            const output = statusResponse.data.output;
            return Array.isArray(output) ? output[0] : output;
          } else if (statusResponse.data.status === "failed" || statusResponse.data.status === "canceled") {
            console.error("[Replicate] Retry failed:", statusResponse.data.error);
            return null;
          }
        }
      } catch (retryError: any) {
        console.error("[Replicate] Retry also failed:", retryError.message);
      }
    }
    
    console.error("[Replicate] API error:", error.message);
    return null;
  }
}

/**
 * Build enhanced prompt with perspective, depth, and focal point awareness
 * Based on best practices from professional tools like Photoshop Generative Fill and FLUX
 */
function buildEnhancedPrompt(userPrompt: string): string {
  const lowerPrompt = userPrompt.toLowerCase();
  
  // Detect what type of object is being added and build specific prompts
  // Based on FLUX Fill best practices
  
  if (lowerPrompt.includes("sunglasses") || lowerPrompt.includes("glasses")) {
    // Specific prompt for sunglasses - from FLUX best practices
    return "stylish sunglasses, metallic frame, slight reflection, perfectly positioned on face, natural shadows, matching face angle and perspective, photorealistic, high quality fashion photography";
  }
  
  if (lowerPrompt.includes("hat") || lowerPrompt.includes("cap")) {
    return "stylish hat, properly fitted, natural shadows, matching head angle and perspective, photorealistic, high quality fashion photography";
  }
  
  if (lowerPrompt.includes("earring") || lowerPrompt.includes("jewelry") || lowerPrompt.includes("necklace")) {
    return `${userPrompt}, metallic shine, proper scale, natural shadows, matching skin tone lighting, photorealistic jewelry photography`;
  }
  
  if (lowerPrompt.includes("makeup") || lowerPrompt.includes("lipstick")) {
    return `${userPrompt}, matching skin texture, natural gradients, following facial contours, photorealistic makeup, seamless blend`;
  }
  
  // Generic enhancement for other prompts
  return `${userPrompt}, natural integration, proper shadows, matching original photo lighting and style, photorealistic, high quality`;
}

/**
 * Inpainting - Regenerate masked area with a prompt
 * Uses Stable Diffusion Inpainting for proper masked area regeneration
 */
export async function inpaintImage(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  prompt: string,
  options: {
    negativePrompt?: string;
    strength?: number;
    guidance?: number;
  } = {}
): Promise<Buffer> {
  const {
    negativePrompt = "blurry, low quality, distorted, ugly, bad anatomy, watermark, text",
    strength = 0.75,
    guidance = 7.5,
  } = options;

  console.log("=".repeat(60));
  console.log("[INPAINT] Starting AI Inpainting");
  console.log(`[INPAINT] Prompt: ${prompt}`);
  console.log(`[INPAINT] Strength: ${strength}, Guidance: ${guidance}`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }

  // Get original dimensions to preserve size
  const meta = await sharp(imageBuffer).metadata();
  const originalWidth = meta.width || 512;
  const originalHeight = meta.height || 512;
  
  console.log(`[INPAINT] Original size: ${originalWidth}x${originalHeight}`);

  // Convert buffers to base64 data URLs
  const imageBase64 = imageBuffer.toString("base64");
  const maskBase64 = maskBuffer.toString("base64");
  
  const format = meta.format || "png";
  const imageDataUrl = `data:image/${format};base64,${imageBase64}`;
  const maskDataUrl = `data:image/png;base64,${maskBase64}`;

  try {
    console.log("[INPAINT] Running Inpainting...");
    console.log(`[INPAINT] Prompt: "${prompt}"`);
    
    // Detect if this is a removal or editing task
    const lowerPrompt = prompt.toLowerCase();
    const isRemoval = !prompt.trim() || 
      lowerPrompt.includes("remove") || 
      lowerPrompt.includes("delete") || 
      lowerPrompt.includes("erase") || 
      lowerPrompt.includes("clean") ||
      lowerPrompt.includes("fill") ||
      lowerPrompt.includes("seamless");
    
    let resultUrl: string | null = null;
    
    console.log(`[INPAINT] Mode: ${isRemoval ? 'REMOVAL' : 'EDIT'}`);
    
    if (isRemoval) {
      // REMOVAL MODE: Try Nano-banana first for automatic watermark detection & removal
      console.log("[INPAINT] Using Nano-banana for automatic watermark removal...");
      
      // Nano-banana can detect and remove watermarks automatically (no mask needed)
      resultUrl = await runReplicateModel(
        "d05a591283da31be3eea28d5634ef9e26989b351718b6489bd308426ebd0a3e8",
        {
          prompt: "Remove any visible watermark or text overlay from this image. Keep the rest of the image exactly the same. Output a clean image.",
          image_input: [imageDataUrl],
          aspect_ratio: "match_input_image",
          output_format: "jpg",
        }
      );
      
      // Fallback to SDXL with mask if Nano-banana fails (content filter)
      if (!resultUrl) {
        console.log("[INPAINT] Nano-banana failed, trying SDXL with mask...");
        resultUrl = await runReplicateModel(
          "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
          {
            image: imageDataUrl,
            mask: maskDataUrl,
            prompt: "clean natural background, same texture and lighting, seamless blend",
            negative_prompt: "text, watermark, logo, artifacts",
            num_inference_steps: 25,
            guidance_scale: 7.5,
            strength: 0.99,
          }
        );
      }
      
      // Second fallback to LaMa
      if (!resultUrl) {
        console.log("[INPAINT] SDXL failed, trying LaMa fallback...");
        resultUrl = await runReplicateModel(
          "cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72",
          {
            image: imageDataUrl,
            mask: maskDataUrl,
          }
        );
      }
    } else {
      // EDIT MODE: Use FLUX Fill (best for context-aware inpainting)
      console.log("[INPAINT] Using FLUX Fill for context-aware inpainting...");
      console.log(`[INPAINT] Edit prompt: "${prompt}"`);
      
      // Build a context-aware prompt that considers the whole scene
      const contextPrompt = `In this image, ${prompt}. Blend naturally with the existing scene, matching lighting, perspective, and style.`;
      
      // FLUX Fill - best at understanding scene context and following prompts
      resultUrl = await runReplicateModel(
        "black-forest-labs/flux-fill-dev",
        {
          image: imageDataUrl,
          mask: maskDataUrl,
          prompt: contextPrompt,
          guidance: 30,
        }
      );
      
      // Fallback to SDXL inpainting if FLUX Fill fails
      if (!resultUrl) {
        console.log("[INPAINT] FLUX Fill failed, trying SDXL inpaint fallback...");
        resultUrl = await runReplicateModel(
          "95b7223104132402a9ae91cc677285bc5eb997834bd2349fa486f53910fd68b3",
          {
            image: imageDataUrl,
            mask: maskDataUrl,
            prompt: contextPrompt,
            negative_prompt: "blurry, low quality, distorted, deformed, watermark, text, logo",
            num_inference_steps: 30,
            guidance_scale: 7.5,
            strength: 0.95,
          }
        );
      }
    }

    if (!resultUrl) {
      throw new Error("Inpainting failed - models timed out. Replicate may be overloaded. Please try again later.");
    }

    console.log("[INPAINT] Inpainting complete, downloading result...");

    const response = await apiClient.get(resultUrl, {
      responseType: "arraybuffer",
    });

    let resultBuffer = Buffer.from(response.data);
    
    // Resize back to original dimensions to preserve size
    const resultMeta = await sharp(resultBuffer).metadata();
    if (resultMeta.width !== originalWidth || resultMeta.height !== originalHeight) {
      console.log(`[INPAINT] Resizing from ${resultMeta.width}x${resultMeta.height} to ${originalWidth}x${originalHeight}`);
      resultBuffer = await sharp(resultBuffer)
        .resize(originalWidth, originalHeight, { fit: "fill" })
        .png()
        .toBuffer();
    } else {
      resultBuffer = await sharp(resultBuffer).png().toBuffer();
    }
    
    console.log("[INPAINT] SUCCESS");
    return resultBuffer;
  } catch (error: any) {
    console.error("[INPAINT] Error:", error.message);
    throw error;
  }
}

/**
 * Object Removal - Remove objects from image using AI
 * Uses LaMa model for high quality object removal
 */
export async function removeObject(
  imageBuffer: Buffer,
  maskBuffer: Buffer
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[REMOVE] Starting AI Object Removal");
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }

  // Get original dimensions to preserve size
  const meta = await sharp(imageBuffer).metadata();
  const originalWidth = meta.width || 512;
  const originalHeight = meta.height || 512;
  const format = meta.format || "png";
  
  console.log(`[REMOVE] Original size: ${originalWidth}x${originalHeight}`);

  // Convert buffers to base64 data URLs
  const imageBase64 = imageBuffer.toString("base64");
  const maskBase64 = maskBuffer.toString("base64");
  
  const imageDataUrl = `data:image/${format};base64,${imageBase64}`;
  const maskDataUrl = `data:image/png;base64,${maskBase64}`;

  try {
    // Use LaMa - pure pixel-based inpainting, NO AI generation, just fills based on surrounding pixels
    console.log("[REMOVE] Running Object Removal with LaMa (pixel-based, no AI changes)...");
    
    let resultUrl = await runReplicateModel(
      "cdac78a1bec5b23c07fd29692fb70baa513ea403a39e643c48ec5edadb15fe72",
      {
        image: imageDataUrl,
        mask: maskDataUrl,
      }
    );

    if (!resultUrl) {
      throw new Error("Object removal failed - LaMa model failed. Please try again.");
    }

    console.log("[REMOVE] Object removal complete, downloading result...");

    const response = await apiClient.get(resultUrl, {
      responseType: "arraybuffer",
    });

    let resultBuffer = Buffer.from(response.data);
    
    // Resize back to original dimensions to preserve size
    const resultMeta = await sharp(resultBuffer).metadata();
    if (resultMeta.width !== originalWidth || resultMeta.height !== originalHeight) {
      console.log(`[REMOVE] Resizing from ${resultMeta.width}x${resultMeta.height} to ${originalWidth}x${originalHeight}`);
      resultBuffer = await sharp(resultBuffer)
        .resize(originalWidth, originalHeight, { fit: "fill" })
        .png()
        .toBuffer();
    } else {
      resultBuffer = await sharp(resultBuffer).png().toBuffer();
    }
    
    console.log("[REMOVE] SUCCESS");
    return resultBuffer;
  } catch (error: any) {
    console.error("[REMOVE] Error:", error.message);
    
    // Fallback to simple inpainting if LaMa fails
    console.log("[REMOVE] Trying fallback with inpainting...");
    return inpaintImage(imageBuffer, maskBuffer, "clean background, seamless fill, no watermark", {
      strength: 0.9,
    });
  }
}

/**
 * Magic Expand - Outpainting to extend image borders
 * Uses SDXL for high quality expansion
 */
export async function expandImage(
  imageBuffer: Buffer,
  direction: "left" | "right" | "top" | "bottom" | "all",
  expandAmount: number = 256,
  prompt?: string
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[EXPAND] Starting Magic Expand");
  console.log(`[EXPAND] Direction: ${direction}, Amount: ${expandAmount}px`);
  if (prompt) console.log(`[EXPAND] Prompt: ${prompt}`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }

  const meta = await sharp(imageBuffer).metadata();
  const originalWidth = meta.width || 512;
  const originalHeight = meta.height || 512;

  // Calculate new dimensions based on direction
  let newWidth = originalWidth;
  let newHeight = originalHeight;
  let offsetX = 0;
  let offsetY = 0;

  switch (direction) {
    case "left":
      newWidth += expandAmount;
      offsetX = expandAmount;
      break;
    case "right":
      newWidth += expandAmount;
      break;
    case "top":
      newHeight += expandAmount;
      offsetY = expandAmount;
      break;
    case "bottom":
      newHeight += expandAmount;
      break;
    case "all":
      newWidth += expandAmount * 2;
      newHeight += expandAmount * 2;
      offsetX = expandAmount;
      offsetY = expandAmount;
      break;
  }

  console.log(`[EXPAND] New dimensions: ${newWidth}x${newHeight}`);
  console.log(`[EXPAND] Original placed at offset: (${offsetX}, ${offsetY})`);

  // Create expanded canvas with the original image centered/positioned
  const expandedCanvas = await sharp({
    create: {
      width: newWidth,
      height: newHeight,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 1 },
    },
  })
    .composite([
      {
        input: imageBuffer,
        left: offsetX,
        top: offsetY,
      },
    ])
    .png()
    .toBuffer();

  // Create mask for the expanded areas (white = areas to generate)
  const maskCanvas = await sharp({
    create: {
      width: newWidth,
      height: newHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }, // White = inpaint
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: originalWidth,
            height: originalHeight,
            channels: 4,
            background: { r: 0, g: 0, b: 0, alpha: 1 }, // Black = keep
          },
        })
          .png()
          .toBuffer(),
        left: offsetX,
        top: offsetY,
      },
    ])
    .png()
    .toBuffer();

  // Generate the expansion prompt if not provided
  const expansionPrompt = prompt || "seamless extension of the image, natural continuation, photorealistic, high quality, same style and lighting";

  try {
    console.log("[EXPAND] Running outpainting...");
    
    const imageBase64 = expandedCanvas.toString("base64");
    const maskBase64 = maskCanvas.toString("base64");
    
    const imageDataUrl = `data:image/png;base64,${imageBase64}`;
    const maskDataUrl = `data:image/png;base64,${maskBase64}`;

    const resultUrl = await runReplicateModel(
      "7762fd07cf82c948538e41f63f77d685e02b063e37e496e96eefd46c929f9bdc",
      {
        image: imageDataUrl,
        mask: maskDataUrl,
        prompt: expansionPrompt,
        negative_prompt: "blurry, low quality, distorted, visible seam, obvious boundary",
        strength: 0.99,
        guidance_scale: 7.5,
        num_inference_steps: 35,
        scheduler: "K_EULER",
      }
    );

    if (!resultUrl) {
      throw new Error("Expansion failed - no result");
    }

    console.log("[EXPAND] Expansion complete, downloading result...");

    const response = await apiClient.get(resultUrl, {
      responseType: "arraybuffer",
    });

    const resultBuffer = Buffer.from(response.data);
    const pngBuffer = await sharp(resultBuffer).png().toBuffer();
    
    console.log("[EXPAND] SUCCESS");
    return pngBuffer;
  } catch (error: any) {
    console.error("[EXPAND] Error:", error.message);
    throw error;
  }
}

/**
 * Generative Fill - Fill selected area with AI-generated content
 * Similar to Photoshop's generative fill
 */
export async function generativeFill(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  prompt: string
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[GEN-FILL] Starting Generative Fill");
  console.log(`[GEN-FILL] Prompt: ${prompt}`);
  console.log("=".repeat(60));

  // Use inpainting with higher strength for generative fill
  return inpaintImage(imageBuffer, maskBuffer, prompt, {
    strength: 0.95,
    guidance: 8,
  });
}

/**
 * Smart Select - Auto-detect subject using remove-bg
 * Returns mask for the main subject (person/object)
 */
export async function smartSelect(
  imageBuffer: Buffer,
  prompt: string = "subject"
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log(`[SMART] Smart Select - detecting subject`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;
  
  console.log(`[SMART] Image size: ${width}x${height}`);

  // Convert to base64
  const imageBase64 = imageBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[SMART] Using remove-bg to detect subject...");
    
    // Use remove-bg model - it's fast and always finds the subject
    const resultUrl = await runReplicateModel(
      "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      {
        image: imageDataUrl,
      }
    );
    
    if (!resultUrl) {
      throw new Error("Smart select failed - please try again");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    const resultBuffer = Buffer.from(response.data);
    
    // Extract alpha channel as mask (subject is white, background is black)
    let maskBuffer = await sharp(resultBuffer)
      .extractChannel('alpha')
      .toColorspace('b-w')
      .png()
      .toBuffer();
    
    // Resize mask to original size if needed
    const maskMeta = await sharp(maskBuffer).metadata();
    if (maskMeta.width !== width || maskMeta.height !== height) {
      maskBuffer = await sharp(maskBuffer)
        .resize(width, height)
        .png()
        .toBuffer();
    }
    
    console.log("[SMART] SUCCESS - Subject mask generated");
    return maskBuffer;
  } catch (error: any) {
    console.error("[SMART] Error:", error.message);
    throw error;
  }
}

/**
 * Detect faces in image - returns true if face detected
 */
export async function detectFace(imageBuffer: Buffer): Promise<boolean> {
  console.log("[FACE] Checking for faces in image...");
  
  // Use the smart select (remove-bg) to check if there's a person/subject
  // If alpha covers significant area, likely has a face
  try {
    const meta = await sharp(imageBuffer).metadata();
    const width = meta.width || 512;
    const height = meta.height || 512;
    
    // Quick check - resize small for fast detection
    const smallBuffer = await sharp(imageBuffer)
      .resize(256, 256, { fit: 'inside' })
      .png()
      .toBuffer();
    
    const imageBase64 = smallBuffer.toString("base64");
    const imageDataUrl = `data:image/png;base64,${imageBase64}`;
    
    const resultUrl = await runReplicateModel(
      "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      { image: imageDataUrl }
    );
    
    if (!resultUrl) return false;
    
    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    const resultBuffer = Buffer.from(response.data);
    
    // Check alpha channel - if significant non-transparent area, has subject (likely face)
    const { data, info } = await sharp(resultBuffer)
      .extractChannel('alpha')
      .raw()
      .toBuffer({ resolveWithObject: true });
    
    let nonTransparent = 0;
    for (let i = 0; i < data.length; i++) {
      if (data[i] > 128) nonTransparent++;
    }
    
    const coverage = nonTransparent / data.length;
    console.log(`[FACE] Subject coverage: ${(coverage * 100).toFixed(1)}%`);
    
    // If subject covers 5-80% of image, likely a portrait
    const hasFace = coverage > 0.05 && coverage < 0.8;
    console.log(`[FACE] Face detected: ${hasFace}`);
    return hasFace;
  } catch (error: any) {
    console.error("[FACE] Detection error:", error.message);
    return false;
  }
}

/**
 * Enhance skin/face using GFPGAN face restoration
 */
export async function enhanceSkin(
  imageBuffer: Buffer,
  prompt: string = "enhance"
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[SKIN] Enhancing face/skin with GFPGAN");
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;
  
  // Convert to base64
  const imageBase64 = imageBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[SKIN] Using GFPGAN for face restoration...");
    
    // GFPGAN - Practical Face Restoration
    const resultUrl = await runReplicateModel(
      "0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c",
      {
        img: imageDataUrl,
        scale: 2,
        version: "v1.4",
      }
    );
    
    if (!resultUrl) {
      throw new Error("Face enhancement failed - please try again");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    let resultBuffer = Buffer.from(response.data);
    
    // Resize back to original dimensions (GFPGAN upscales by 2x)
    resultBuffer = await sharp(resultBuffer)
      .resize(width, height)
      .png()
      .toBuffer();
    
    console.log("[SKIN] SUCCESS - Face enhanced");
    return resultBuffer;
  } catch (error: any) {
    console.error("[SKIN] Error:", error.message);
    throw error;
  }
}

/**
 * Generate text/content on image using nano-banana (same as generative fill)
 * Uses mask to place AI-generated content on specific area
 */
export async function generateTextOnImage(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  textPrompt: string
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log(`[TEXT] Generating content: "${textPrompt}"`);
  console.log("=".repeat(60));

  // Use the existing generativeFill function which is proven to work
  return generativeFill(imageBuffer, maskBuffer, textPrompt);
}

/**
 * Crystal Upscaler - 2x upscale with enhanced details
 */
export async function crystalUpscale(imageBuffer: Buffer): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[UPSCALE] Crystal Upscaler 2x");
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 512;
  const height = meta.height || 512;
  
  console.log(`[UPSCALE] Original size: ${width}x${height}`);
  
  // Convert to base64
  const imageBase64 = imageBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[UPSCALE] Using Crystal Upscaler...");
    
    const resultUrl = await runReplicateModel(
      "676970c41ea5c90570e8f723374b9a394c446cc34a353b8dddf1a41083471943",
      {
        image: imageDataUrl,
        scale_factor: 2,
        output_format: "png",
      }
    );
    
    if (!resultUrl) {
      throw new Error("Upscale failed - please try again");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    const resultBuffer = Buffer.from(response.data);
    
    const resultMeta = await sharp(resultBuffer).metadata();
    console.log(`[UPSCALE] SUCCESS - New size: ${resultMeta.width}x${resultMeta.height}`);
    
    return resultBuffer;
  } catch (error: any) {
    console.error("[UPSCALE] Error:", error.message);
    throw error;
  }
}

/**
 * Pro Focus - Add professional depth of field effect using AI
 * Uses nano-banana to intelligently apply natural bokeh based on scene understanding
 * Intensity: 'subtle', 'medium', 'strong'
 */
export async function proFocus(
  imageBuffer: Buffer,
  intensity: 'subtle' | 'medium' | 'strong' = 'medium'
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log(`[FOCUS] Pro Focus (AI) - Intensity: ${intensity}`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const origWidth = meta.width || 512;
  const origHeight = meta.height || 512;
  
  console.log(`[FOCUS] Original size: ${origWidth}x${origHeight}`);
  
  // Resize large images for processing (max 1536px)
  const maxDim = 1536;
  let workWidth = origWidth;
  let workHeight = origHeight;
  let workBuffer = imageBuffer;
  
  if (origWidth > maxDim || origHeight > maxDim) {
    const scale = Math.min(maxDim / origWidth, maxDim / origHeight);
    workWidth = Math.round(origWidth * scale);
    workHeight = Math.round(origHeight * scale);
    workBuffer = await sharp(imageBuffer)
      .resize(workWidth, workHeight)
      .png()
      .toBuffer();
    console.log(`[FOCUS] Resized to ${workWidth}x${workHeight} for processing`);
  }
  
  // Create prompts based on intensity
  const promptMap = {
    subtle: "same image with subtle shallow depth of field, slight background blur, maintain sharp focus on main subject, professional photography, natural bokeh",
    medium: "same image with professional portrait-style depth of field, soft background blur, sharp focus on main subject, beautiful natural bokeh, DSLR quality",
    strong: "same image with dramatic shallow depth of field, strong creamy background blur, razor sharp focus on main subject, cinematic bokeh, f/1.4 aperture look"
  };
  
  const focusPrompt = promptMap[intensity];
  console.log(`[FOCUS] Using prompt: "${focusPrompt}"`);
  
  // Convert to base64
  const imageBase64 = workBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[FOCUS] Applying AI depth of field with nano-banana...");
    
    // Use nano-banana for intelligent depth of field - instruction-based editing
    const resultUrl = await runReplicateModel(
      "d05a591283da31be3eea28d5634ef9e26989b351718b6489bd308426ebd0a3e8",
      {
        prompt: focusPrompt,
        image_input: [imageDataUrl],
        aspect_ratio: "match_input_image",
        output_format: "jpg",
      }
    );
    
    // Fallback to standard inpainting approach if nano-banana fails
    if (!resultUrl) {
      console.log("[FOCUS] Primary model unavailable, using fallback approach...");
      
      // Use remove-bg to get subject, then composite with blur
      const bgResultUrl = await runReplicateModel(
        "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
        { image: imageDataUrl }
      );
      
      if (!bgResultUrl) {
        throw new Error("Depth of field processing failed - please try again");
      }
      
      const bgResponse = await apiClient.get(bgResultUrl, { responseType: "arraybuffer" });
      const subjectBuffer = Buffer.from(bgResponse.data);
      
      // Blur intensity based on setting
      const blurMap = { subtle: 8, medium: 15, strong: 25 };
      const blurRadius = blurMap[intensity];
      
      // Get subject with alpha
      const subjectWithAlpha = await sharp(subjectBuffer)
        .resize(workWidth, workHeight)
        .ensureAlpha()
        .png()
        .toBuffer();
      
      // Create blurred background
      const blurredBackground = await sharp(workBuffer)
        .blur(blurRadius)
        .png()
        .toBuffer();
      
      // Composite
      let resultBuffer = await sharp(blurredBackground)
        .composite([{ input: subjectWithAlpha, blend: 'over' }])
        .png()
        .toBuffer();
      
      // Resize back to original if needed
      if (origWidth !== workWidth || origHeight !== workHeight) {
        resultBuffer = await sharp(resultBuffer)
          .resize(origWidth, origHeight)
          .png()
          .toBuffer();
      }
      
      console.log("[FOCUS] SUCCESS - Fallback depth of field applied");
      return resultBuffer;
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    let resultBuffer = Buffer.from(response.data);
    
    // Resize back to original dimensions if needed
    if (origWidth !== workWidth || origHeight !== workHeight) {
      resultBuffer = await sharp(resultBuffer)
        .resize(origWidth, origHeight)
        .png()
        .toBuffer();
      console.log(`[FOCUS] Resized back to ${origWidth}x${origHeight}`);
    }
    
    console.log("[FOCUS] SUCCESS - AI depth of field applied");
    return resultBuffer;
  } catch (error: any) {
    console.error("[FOCUS] Error:", error.message);
    throw error;
  }
}

/**
 * Style Transfer - Apply artistic styles or textures to images
 * Preserves subject/form while changing the visual style
 */
export async function styleTransfer(
  imageBuffer: Buffer,
  maskBuffer: Buffer | null,
  style: string,
  intensity: number = 70
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log(`[STYLE] Style Transfer - Style: ${style}, Intensity: ${intensity}%`);
  console.log(`[STYLE] Using mask: ${maskBuffer ? 'Yes' : 'No (whole image)'}`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const origWidth = meta.width || 512;
  const origHeight = meta.height || 512;
  
  // Resize large images for processing (max 1536px)
  const maxDim = 1536;
  let workWidth = origWidth;
  let workHeight = origHeight;
  let workBuffer = imageBuffer;
  
  if (origWidth > maxDim || origHeight > maxDim) {
    const scale = Math.min(maxDim / origWidth, maxDim / origHeight);
    workWidth = Math.round(origWidth * scale);
    workHeight = Math.round(origHeight * scale);
    workBuffer = await sharp(imageBuffer)
      .resize(workWidth, workHeight)
      .png()
      .toBuffer();
    console.log(`[STYLE] Resized to ${workWidth}x${workHeight} for processing`);
  }
  
  // Intensity descriptors
  const intensityDesc = intensity <= 40 ? "subtly" : intensity <= 70 ? "moderately" : "strongly";
  const keepOriginal = intensity <= 40 ? "Keep most original details, only add slight style hints." : 
                       intensity <= 70 ? "Balance between original and styled look." : 
                       "Apply full style transformation while keeping the subject recognizable.";
  
  // Style prompts - designed to preserve subject while changing style
  const stylePrompts: Record<string, string> = {
    // ===== ANIME STYLES =====
    anime: `${intensityDesc} convert to classic anime style. Keep exact subject and pose. Apply clean cel-shaded look with bold outlines, large expressive eyes, smooth skin, and vibrant anime colors. ${keepOriginal}`,
    
    ghibli: `${intensityDesc} convert to Studio Ghibli anime style. Keep exact subject. Apply Hayao Miyazaki's soft watercolor backgrounds, gentle lighting, whimsical atmosphere, and hand-painted anime look. ${keepOriginal}`,
    
    shonen: `${intensityDesc} convert to shonen manga/anime style. Keep exact subject. Apply dynamic action-oriented look with sharp lines, intense expressions, dramatic shading like Dragon Ball or Naruto. ${keepOriginal}`,
    
    shojo: `${intensityDesc} convert to shojo manga style. Keep exact subject. Apply soft romantic aesthetic with sparkling eyes, flowery backgrounds, delicate lines, and pastel colors. ${keepOriginal}`,
    
    chibi: `${intensityDesc} convert to chibi anime style. Keep subject recognizable but make cute and small with oversized head, tiny body, simple features, and kawaii expression. ${keepOriginal}`,
    
    cyberpunkanime: `${intensityDesc} convert to cyberpunk anime style like Ghost in the Shell or Akira. Keep exact subject. Apply neon-lit futuristic anime aesthetic with tech elements. ${keepOriginal}`,
    
    makoto: `${intensityDesc} convert to Makoto Shinkai anime style. Keep exact subject. Apply photorealistic backgrounds, beautiful lighting, lens flares, and hyper-detailed anime aesthetic like Your Name. ${keepOriginal}`,
    
    jojo: `${intensityDesc} convert to JoJo's Bizarre Adventure style. Keep exact subject. Apply dramatic poses, heavy shading, bold outlines, masculine features, and intense color palette. ${keepOriginal}`,
    
    // ===== MODERN/DIGITAL STYLES =====
    cartoon: `${intensityDesc} convert to cartoon style. Keep exact subject. Apply bold black outlines, simplified shapes, bright flat colors, and clean vector-like aesthetic. ${keepOriginal}`,
    
    pixar: `${intensityDesc} transform into Pixar 3D animation style. Keep exact subject and pose. Create smooth subsurface scattering skin, large expressive eyes, soft rounded features, and cinematic lighting like a Pixar movie character render. ${keepOriginal}`,
    
    disney: `${intensityDesc} convert to Disney animation style. Keep exact subject. Apply classic Disney aesthetic with expressive features, smooth curves, and magical animated movie look. ${keepOriginal}`,
    
    comic: `${intensityDesc} convert to American comic book style. Keep exact subject. Apply bold ink lines, Ben-Day dots, dramatic shadows, superhero comic aesthetic like Marvel or DC. ${keepOriginal}`,
    
    manga: `${intensityDesc} convert to black and white manga style. Keep exact subject. Apply screentone shading, expressive linework, dramatic panel-style composition. ${keepOriginal}`,
    
    cyberpunk: `${intensityDesc} convert to cyberpunk style. Keep exact subject. Apply neon pink and cyan lighting, futuristic tech elements, dark atmosphere, blade runner aesthetic. ${keepOriginal}`,
    
    synthwave: `${intensityDesc} convert to synthwave/retrowave style. Keep exact subject. Apply neon grid, sunset gradients, 80s retro-futuristic aesthetic, chrome and neon. ${keepOriginal}`,
    
    vintage: `${intensityDesc} convert to vintage photo style. Keep exact subject. Apply sepia tones, film grain, faded colors, and nostalgic 1950s photograph look. ${keepOriginal}`,
    
    // ===== FAMOUS ARTISTS =====
    vangogh: `${intensityDesc} paint in Vincent van Gogh style. Keep exact subject. Apply thick impasto brushstrokes, swirling patterns, bold yellows and blues, post-impressionist texture like Starry Night. ${keepOriginal}`,
    
    monet: `${intensityDesc} paint in Claude Monet impressionist style. Keep exact subject. Apply soft dappled light, visible brushstrokes, pastel colors, water lily garden aesthetic, outdoor natural lighting. ${keepOriginal}`,
    
    picasso: `${intensityDesc} paint in Pablo Picasso cubist style. Keep subject recognizable. Apply geometric fragmentation, multiple viewpoints, angular abstract shapes, bold colors, analytical cubism. ${keepOriginal}`,
    
    warhol: `${intensityDesc} create Andy Warhol pop art style. Keep exact subject. Apply flat bold colors, high contrast, screen-print aesthetic, repetition style, bright neon color blocks like Marilyn Monroe prints. ${keepOriginal}`,
    
    rembrandt: `${intensityDesc} paint in Rembrandt baroque style. Keep exact subject. Apply dramatic chiaroscuro lighting, rich dark browns and golds, masterful portraiture, Dutch Golden Age oil painting. ${keepOriginal}`,
    
    magritte: `${intensityDesc} create René Magritte surrealist style. Keep subject but add surreal elements. Apply dreamlike impossible scenes, mysterious atmosphere, Belgian surrealism, thought-provoking imagery. ${keepOriginal}`,
    
    dali: `${intensityDesc} paint in Salvador Dalí surrealist style. Keep subject recognizable. Apply melting forms, dreamscape backgrounds, hyper-realistic surreal elements, Spanish surrealism. ${keepOriginal}`,
    
    hokusai: `${intensityDesc} create Katsushika Hokusai ukiyo-e style. Keep exact subject. Apply Japanese woodblock print aesthetic, flat bold colors, strong outlines, Great Wave style, Edo period art. ${keepOriginal}`,
    
    klimt: `${intensityDesc} paint in Gustav Klimt Art Nouveau style. Keep exact subject. Apply golden decorative patterns, ornamental Byzantine mosaics, sensual figures, The Kiss aesthetic. ${keepOriginal}`,
    
    munch: `${intensityDesc} paint in Edvard Munch expressionist style. Keep exact subject. Apply emotional distortion, anxious wavy lines, bold colors, The Scream aesthetic, psychological intensity. ${keepOriginal}`,
    
    kahlo: `${intensityDesc} paint in Frida Kahlo style. Keep exact subject. Apply vibrant Mexican colors, symbolic elements, folk art influences, surreal self-portrait aesthetic. ${keepOriginal}`,
    
    basquiat: `${intensityDesc} create Jean-Michel Basquiat neo-expressionist style. Keep subject recognizable. Apply raw graffiti elements, crown motifs, anatomical drawings, bold text, street art aesthetic. ${keepOriginal}`,
    
    banksy: `${intensityDesc} create Banksy street art style. Keep exact subject. Apply stencil graffiti aesthetic, political satire, black and white with color accents, urban wall texture. ${keepOriginal}`,
    
    kusama: `${intensityDesc} create Yayoi Kusama style. Keep exact subject. Apply polka dots patterns, infinity net motifs, vibrant psychedelic colors, repetitive patterns covering everything. ${keepOriginal}`,
    
    lautrec: `${intensityDesc} paint in Henri de Toulouse-Lautrec style. Keep exact subject. Apply Art Nouveau poster aesthetic, bold outlines, flat colors, Moulin Rouge cabaret style, Japanese influence. ${keepOriginal}`,
    
    haring: `${intensityDesc} create Keith Haring style. Keep subject recognizable. Apply bold black outlines, simple figures, radiant lines, pop art graffiti, colorful energetic movement. ${keepOriginal}`,
    
    pollock: `${intensityDesc} create Jackson Pollock abstract expressionist style. Keep subject visible beneath. Apply drip painting technique, chaotic splatter patterns, action painting aesthetic. ${keepOriginal}`,
    
    davinci: `${intensityDesc} paint in Leonardo da Vinci Renaissance style. Keep exact subject. Apply sfumato technique, realistic proportions, subtle earth tones, Mona Lisa aesthetic, classical mastery. ${keepOriginal}`,
    
    vermeer: `${intensityDesc} paint in Johannes Vermeer style. Keep exact subject. Apply soft natural window lighting, Dutch interior scene, pearl-like luminosity, Girl with Pearl Earring aesthetic. ${keepOriginal}`,
    
    caravaggio: `${intensityDesc} paint in Caravaggio baroque style. Keep exact subject. Apply dramatic tenebrism, stark light and shadow contrast, theatrical spotlighting, Italian Baroque drama. ${keepOriginal}`,
    
    mucha: `${intensityDesc} create Alphonse Mucha Art Nouveau style. Keep exact subject. Apply decorative halos, flowing hair, ornamental borders, elegant poster aesthetic, Byzantine patterns. ${keepOriginal}`,
    
    rockwell: `${intensityDesc} paint in Norman Rockwell illustration style. Keep exact subject. Apply American realism, warm nostalgic scenes, Saturday Evening Post aesthetic, detailed storytelling. ${keepOriginal}`,
    
    kaws: `${intensityDesc} create KAWS contemporary art style. Keep subject recognizable. Apply X-eyes motif, cartoon-like figures, bold pop colors, street art meets fine art aesthetic. ${keepOriginal}`,
    
    obey: `${intensityDesc} create Shepard Fairey OBEY style. Keep exact subject. Apply propaganda poster aesthetic, red/black/cream palette, Andre the Giant face style, street art political. ${keepOriginal}`,
    
    // ===== PAINTING MOVEMENTS =====
    impressionism: `${intensityDesc} paint in Impressionist style. Keep exact subject. Apply visible brushstrokes, pure unmixed colors, emphasis on light, outdoor scene feeling, Monet/Renoir aesthetic. ${keepOriginal}`,
    
    expressionism: `${intensityDesc} paint in Expressionist style. Keep exact subject. Apply emotional intensity, distorted forms, bold unnatural colors, psychological drama, Die Brücke aesthetic. ${keepOriginal}`,
    
    realism: `${intensityDesc} paint in Realism style. Keep exact subject. Apply photorealistic detail, accurate representation, classical technique, museum-quality oil painting. ${keepOriginal}`,
    
    surrealism: `${intensityDesc} paint in Surrealist style. Keep subject recognizable. Apply dreamlike impossible elements, subconscious imagery, unexpected combinations, melting reality. ${keepOriginal}`,
    
    cubism: `${intensityDesc} paint in Cubist style. Keep subject visible but fragmented. Apply geometric deconstruction, multiple simultaneous viewpoints, angular planes, monochromatic browns and grays, analytical cubism technique. ${keepOriginal}`,
    
    renaissance: `${intensityDesc} paint in Renaissance style. Keep exact subject. Apply classical proportions, sfumato shading, religious grandeur, rich earth tones, Italian masters aesthetic. ${keepOriginal}`,
    
    baroque: `${intensityDesc} paint in Baroque style. Keep exact subject. Apply dramatic chiaroscuro, rich deep colors, theatrical composition, ornate details, 17th century grandeur. ${keepOriginal}`,
    
    artnouveau: `${intensityDesc} create Art Nouveau style. Keep exact subject. Apply flowing organic lines, nature motifs, decorative elegance, whiplash curves, botanical patterns. ${keepOriginal}`,
    
    artdeco: `${intensityDesc} create Art Deco style. Keep exact subject. Apply geometric patterns, bold symmetry, gold and black palette, 1920s glamour, Gatsby aesthetic. ${keepOriginal}`,
    
    minimalism: `${intensityDesc} create Minimalist art style. Keep subject essence. Apply simplified forms, limited color palette, clean lines, negative space, less is more aesthetic. ${keepOriginal}`,
    
    fauvism: `${intensityDesc} paint in Fauvist style. Keep exact subject. Apply wild bold colors, simplified forms, expressive brushwork, Matisse aesthetic, pure color expression. ${keepOriginal}`,
    
    pointillism: `${intensityDesc} paint in Pointillist style. Keep exact subject. Apply tiny dots of color, optical mixing, Seurat technique, stippled texture, Neo-Impressionism. ${keepOriginal}`,
    
    romanticism: `${intensityDesc} paint in Romantic style. Keep exact subject. Apply dramatic landscapes, emotional intensity, sublime nature, Turner/Delacroix aesthetic, heroic drama. ${keepOriginal}`,
    
    // ===== TRADITIONAL TECHNIQUES =====
    oilpainting: `${intensityDesc} convert to classical oil painting. Keep exact subject. Apply visible brushstrokes, rich impasto texture, glazed layers, museum-quality fine art. ${keepOriginal}`,
    
    watercolor: `${intensityDesc} paint in traditional watercolor style. Keep exact subject. Apply translucent washes, soft wet edges, white paper showing through, delicate color bleeding, loose spontaneous brushwork on textured paper. ${keepOriginal}`,
    
    sketch: `${intensityDesc} convert to pencil sketch. Keep exact subject. Apply graphite shading, crosshatching, paper texture, hand-drawn line work, artist sketchbook aesthetic. ${keepOriginal}`,
    
    charcoal: `${intensityDesc} convert to charcoal drawing. Keep exact subject. Apply dramatic blacks, smudged shading, expressive marks, fine art drawing aesthetic. ${keepOriginal}`,
    
    pastel: `${intensityDesc} convert to pastel painting. Keep exact subject. Apply soft powdery texture, blended colors, gentle gradients, Degas-like aesthetic. ${keepOriginal}`,
    
    inkwash: `${intensityDesc} convert to ink wash painting. Keep exact subject. Apply Chinese/Japanese sumi-e style, flowing black ink, minimalist brushwork, Zen aesthetic. ${keepOriginal}`,
    
    ukiyoe: `${intensityDesc} convert to Ukiyo-e woodblock print. Keep exact subject. Apply flat color areas, bold black outlines, Japanese aesthetic, Edo period art style. ${keepOriginal}`,
    
    // ===== TEXTURE/MATERIAL STYLES =====
    glass: `${intensityDesc} transform subject into clear glass sculpture. Keep exact form and pose. Make entirely translucent crystal glass with visible light refraction, caustic reflections, transparent material catching light beautifully. ${keepOriginal}`,
    
    metal: `${intensityDesc} transform into polished chrome metal. Keep exact form. Apply mirror-like metallic surface, sharp reflections, liquid metal aesthetic. ${keepOriginal}`,
    
    gold: `${intensityDesc} transform into solid gold. Keep exact form. Apply luxurious 24k gold material, warm golden reflections, precious metal shine. ${keepOriginal}`,
    
    marble: `${intensityDesc} transform into marble sculpture. Keep exact form. Apply white Carrara marble texture, subtle gray veins, classical statue aesthetic. ${keepOriginal}`,
    
    wood: `${intensityDesc} transform into carved wooden sculpture. Keep exact form. Apply rich wood grain texture, warm brown tones, hand-carved artisan aesthetic, visible natural wood patterns. ${keepOriginal}`,
    
    ice: `${intensityDesc} transform into frozen ice sculpture. Keep exact form. Create translucent frozen ice with crisp crystalline texture, cold blue tints, frost patterns, frozen water catching light. ${keepOriginal}`,
    
    ceramic: `${intensityDesc} transform into glazed ceramic. Keep exact form. Apply shiny porcelain finish, artistic pottery aesthetic, smooth glazed surface. ${keepOriginal}`,
    
    bronze: `${intensityDesc} transform into bronze sculpture. Keep exact form. Apply aged bronze patina, green oxidation accents, classical sculpture aesthetic. ${keepOriginal}`,
    
    neon: `${intensityDesc} add neon glow effect. Keep exact subject. Apply vibrant neon tube lighting, glowing outlines, dark background with bright neon colors. ${keepOriginal}`,
    
    holographic: `${intensityDesc} add holographic effect. Keep exact subject. Create shimmering prismatic rainbow iridescence, color-shifting surface, futuristic hologram card aesthetic with spectral colors. ${keepOriginal}`,
    
    glitter: `${intensityDesc} add glitter texture. Keep exact subject. Apply sparkling glitter particles, shimmering highlights, magical sparkle effect. ${keepOriginal}`,
    
    wireframe: `${intensityDesc} convert to 3D wireframe. Keep exact form. Apply geometric mesh lines, technical blueprint aesthetic, no solid surfaces just edges. ${keepOriginal}`,
    
    lowpoly: `${intensityDesc} convert to low-poly 3D style. Keep subject recognizable. Apply geometric faceted surfaces, triangular polygons, modern 3D game aesthetic. ${keepOriginal}`,
    
    voxel: `${intensityDesc} convert to voxel/Minecraft style. Keep subject recognizable. Apply cubic 3D blocks, pixel art in 3D, retro game aesthetic. ${keepOriginal}`,
    
    // ===== GRAPHIC DESIGN PIONEERS =====
    paulrand: `${intensityDesc} create in Paul Rand graphic design style. Keep subject. Apply bold geometric shapes, playful modernism, IBM logo aesthetic, clean corporate design. ${keepOriginal}`,
    
    saulbass: `${intensityDesc} create in Saul Bass movie poster style. Keep subject. Apply bold geometric shapes, striking silhouettes, limited color palette, iconic film title sequence aesthetic. ${keepOriginal}`,
    
    miltonglaser: `${intensityDesc} create in Milton Glaser style. Keep subject. Apply psychedelic colors, rainbow gradients, I Love NY aesthetic, expressive illustration. ${keepOriginal}`,
    
    vignelli: `${intensityDesc} create in Massimo Vignelli style. Keep subject. Apply strict grid system, Helvetica typography, NYC subway map aesthetic, minimalist modernism. ${keepOriginal}`,
    
    mullerbrockmann: `${intensityDesc} create in Josef Müller-Brockmann Swiss style. Keep subject. Apply mathematical grid, geometric precision, Swiss International poster aesthetic. ${keepOriginal}`,
    
    tschichold: `${intensityDesc} create in Jan Tschichold typography style. Keep subject. Apply asymmetric layout, Bauhaus influence, new typography movement aesthetic. ${keepOriginal}`,
    
    lubalin: `${intensityDesc} create in Herb Lubalin style. Keep subject. Apply expressive typography, letterform art, playful type manipulation, avant-garde magazine aesthetic. ${keepOriginal}`,
    
    lissitzky: `${intensityDesc} create in El Lissitzky constructivist style. Keep subject. Apply Russian avant-garde, geometric abstraction, red and black, revolutionary poster aesthetic. ${keepOriginal}`,
    
    cassandre: `${intensityDesc} create in A.M. Cassandre Art Deco poster style. Keep subject. Apply streamlined geometric forms, bold shadows, vintage travel poster aesthetic. ${keepOriginal}`,
    
    crouwel: `${intensityDesc} create in Wim Crouwel style. Keep subject. Apply systematic grid design, new alphabet typography, Dutch modernist poster aesthetic. ${keepOriginal}`,
    
    // ===== MODERN GRAPHIC DESIGNERS =====
    nevillebrody: `${intensityDesc} create in Neville Brody style. Keep subject. Apply experimental typography, The Face magazine aesthetic, punk-influenced graphic design. ${keepOriginal}`,
    
    davidcarson: `${intensityDesc} create in David Carson deconstructivist style. Keep subject. Apply chaotic typography, grunge aesthetic, Ray Gun magazine style, anti-design. ${keepOriginal}`,
    
    paulascher: `${intensityDesc} create in Paula Scher style. Keep subject. Apply bold expressive typography, painted lettering, Public Theater poster aesthetic. ${keepOriginal}`,
    
    sagmeister: `${intensityDesc} create in Stefan Sagmeister style. Keep subject. Apply provocative conceptual design, hand-crafted elements, unconventional materials aesthetic. ${keepOriginal}`,
    
    bierut: `${intensityDesc} create in Michael Bierut Pentagram style. Keep subject. Apply intelligent conceptual design, witty visual solutions, modern corporate identity. ${keepOriginal}`,
    
    chipkidd: `${intensityDesc} create in Chip Kidd book cover style. Keep subject. Apply innovative book jacket design, clever visual concepts, literary aesthetic. ${keepOriginal}`,
    
    kalman: `${intensityDesc} create in Tibor Kalman style. Keep subject. Apply subversive design, Colors magazine aesthetic, socially conscious graphic design. ${keepOriginal}`,
    
    thorgerson: `${intensityDesc} create in Storm Thorgerson album art style. Keep subject. Apply surreal photo manipulation, Pink Floyd aesthetic, iconic album cover design. ${keepOriginal}`,
    
    aicher: `${intensityDesc} create in Otl Aicher Olympic style. Keep subject. Apply systematic pictograms, Munich 1972 Olympics aesthetic, functional modernism. ${keepOriginal}`,
    
    wyman: `${intensityDesc} create in Lance Wyman style. Keep subject. Apply Mexico 68 Olympics aesthetic, bold geometric patterns, wayfinding design. ${keepOriginal}`,
    
    // ===== CONTEMPORARY DESIGNERS =====
    jessicawalsh: `${intensityDesc} create in Jessica Walsh style. Keep subject. Apply bold colorful compositions, 3D typography, playful conceptual design aesthetic. ${keepOriginal}`,
    
    fairey: `${intensityDesc} create in Shepard Fairey OBEY style. Keep subject. Apply propaganda poster aesthetic, red/black/cream palette, Hope poster style. ${keepOriginal}`,
    
    draplin: `${intensityDesc} create in Aaron Draplin style. Keep subject. Apply thick bold lines, retro Americana, Field Notes aesthetic, chunky vintage logos. ${keepOriginal}`,
    
    petersaville: `${intensityDesc} create in Peter Saville style. Keep subject. Apply Joy Division Unknown Pleasures aesthetic, minimalist album art, Factory Records design. ${keepOriginal}`,
    
    mikeperry: `${intensityDesc} create in Mike Perry style. Keep subject. Apply hand-drawn psychedelic patterns, colorful organic shapes, illustrative lettering. ${keepOriginal}`,
    
    trochut: `${intensityDesc} create in Alex Trochut style. Keep subject. Apply intricate typographic illustrations, liquid letterforms, 3D decorative type. ${keepOriginal}`,
    
    // ===== TYPE DESIGNERS =====
    frutiger: `${intensityDesc} create in Adrian Frutiger typography style. Keep subject. Apply Univers/Frutiger typeface aesthetic, Swiss precision, airport signage clarity. ${keepOriginal}`,
    
    miedinger: `${intensityDesc} create in Max Miedinger style. Keep subject. Apply Helvetica aesthetic, neutral Swiss typography, clean modernist design. ${keepOriginal}`,
    
    carter: `${intensityDesc} create in Matthew Carter typography style. Keep subject. Apply Georgia/Verdana aesthetic, screen-optimized legibility, classic modern type. ${keepOriginal}`,
    
    hoefler: `${intensityDesc} create in Hoefler & Co style. Keep subject. Apply refined editorial typography, elegant letterforms, premium type design aesthetic. ${keepOriginal}`,
    
    licko: `${intensityDesc} create in Zuzana Licko Emigre style. Keep subject. Apply experimental digital typography, bitmap fonts, postmodern type design. ${keepOriginal}`,
    
    gill: `${intensityDesc} create in Eric Gill style. Keep subject. Apply Gill Sans aesthetic, humanist typography, Arts and Crafts influenced letterforms. ${keepOriginal}`,
    
    // ===== JAPANESE DESIGNERS =====
    fukuda: `${intensityDesc} create in Shigeo Fukuda style. Keep subject. Apply optical illusion posters, clever visual paradoxes, Japanese graphic wit. ${keepOriginal}`,
    
    nagai: `${intensityDesc} create in Kazumasa Nagai style. Keep subject. Apply geometric animal illustrations, spiritual Japanese modernism, cosmic poster art. ${keepOriginal}`,
    
    tanaka: `${intensityDesc} create in Ikko Tanaka style. Keep subject. Apply Japanese minimalism, bold geometric faces, Nihon Buyo poster aesthetic. ${keepOriginal}`,
    
    yokoo: `${intensityDesc} create in Tadanori Yokoo style. Keep subject. Apply psychedelic Japanese pop art, collage aesthetic, 60s counterculture posters. ${keepOriginal}`,
    
    // ===== BRANDING LEGENDS =====
    chermayeff: `${intensityDesc} create in Chermayeff & Geismar style. Keep subject. Apply iconic corporate identity, NBC peacock/Chase logo aesthetic, timeless marks. ${keepOriginal}`,
    
    landor: `${intensityDesc} create in Walter Landor style. Keep subject. Apply strategic brand identity, FedEx/BP aesthetic, corporate branding excellence. ${keepOriginal}`,
    
    behrens: `${intensityDesc} create in Peter Behrens style. Keep subject. Apply early corporate identity, AEG aesthetic, proto-modernist industrial design. ${keepOriginal}`,
    
    pentagram: `${intensityDesc} create in Pentagram design style. Keep subject. Apply multi-disciplinary design excellence, sophisticated visual identity, architectural graphic design. ${keepOriginal}`,
    
    // ===== ADDITIONAL ART MOVEMENTS =====
    popart: `${intensityDesc} transform into Pop Art style. Keep subject. Apply bold primary colors, Ben-Day dots, comic book aesthetics, mass media imagery, Andy Warhol/Roy Lichtenstein influence. ${keepOriginal}`,
    
    // ===== ADDITIONAL MATERIALS =====
    paper: `${intensityDesc} transform into paper craft style. Keep subject. Apply paper cutout aesthetic, origami folds, layered paper texture, handcrafted paper sculpture look. ${keepOriginal}`,
  };
  
  const stylePrompt = stylePrompts[style] || stylePrompts.anime;
  console.log(`[STYLE] Using prompt: "${stylePrompt}"`);
  
  // Convert to base64
  const imageBase64 = workBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[STYLE] Applying style transfer with nano-banana...");
    
    // Use nano-banana for style transfer
    const resultUrl = await runReplicateModel(
      "d05a591283da31be3eea28d5634ef9e26989b351718b6489bd308426ebd0a3e8",
      {
        prompt: stylePrompt,
        image_input: [imageDataUrl],
        aspect_ratio: "match_input_image",
        output_format: "png",
      }
    );
    
    if (!resultUrl) {
      throw new Error("Style transfer failed - please try again");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    let resultBuffer = Buffer.from(response.data);
    
    // If mask provided, composite styled area with original
    if (maskBuffer) {
      console.log("[STYLE] Applying mask to blend styled area...");
      
      // Resize mask to match work dimensions
      const resizedMask = await sharp(maskBuffer)
        .resize(workWidth, workHeight)
        .grayscale()
        .png()
        .toBuffer();
      
      // Resize result to work dimensions
      resultBuffer = await sharp(resultBuffer)
        .resize(workWidth, workHeight)
        .png()
        .toBuffer();
      
      // Composite: original where mask is black, styled where mask is white
      resultBuffer = await sharp(workBuffer)
        .composite([
          {
            input: resultBuffer,
            blend: 'over',
          },
          {
            input: resizedMask,
            blend: 'dest-in',
          }
        ])
        .png()
        .toBuffer();
      
      // Need to do proper masking - composite styled onto original using mask
      resultBuffer = await sharp(workBuffer)
        .composite([
          {
            input: await sharp(resultBuffer).ensureAlpha().png().toBuffer(),
            blend: 'over',
          }
        ])
        .png()
        .toBuffer();
    }
    
    // Resize back to original dimensions if needed
    if (origWidth !== workWidth || origHeight !== workHeight) {
      resultBuffer = await sharp(resultBuffer)
        .resize(origWidth, origHeight)
        .png()
        .toBuffer();
      console.log(`[STYLE] Resized back to ${origWidth}x${origHeight}`);
    }
    
    console.log("[STYLE] SUCCESS - Style transfer applied");
    return resultBuffer;
  } catch (error: any) {
    console.error("[STYLE] Error:", error.message);
    throw error;
  }
}

/**
 * Pro Lighting - Relight images with different moods
 * Uses Qwen Relight LoRA for cinematic lighting effects
 * Mood: 'golden', 'moody', 'soft', 'dramatic', 'natural'
 */
export async function proLighting(
  imageBuffer: Buffer,
  mood: 'golden' | 'moody' | 'soft' | 'dramatic' | 'natural' | 'spotlight' = 'golden',
  intensity: number = 50
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log(`[LIGHT] Pro Lighting - Mood: ${mood}, Intensity: ${intensity}%`);
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  const meta = await sharp(imageBuffer).metadata();
  const origWidth = meta.width || 512;
  const origHeight = meta.height || 512;
  
  console.log(`[LIGHT] Original size: ${origWidth}x${origHeight}`);
  
  // Resize large images for processing (max 1536px)
  const maxDim = 1536;
  let workWidth = origWidth;
  let workHeight = origHeight;
  let workBuffer = imageBuffer;
  
  if (origWidth > maxDim || origHeight > maxDim) {
    const scale = Math.min(maxDim / origWidth, maxDim / origHeight);
    workWidth = Math.round(origWidth * scale);
    workHeight = Math.round(origHeight * scale);
    workBuffer = await sharp(imageBuffer)
      .resize(workWidth, workHeight)
      .png()
      .toBuffer();
    console.log(`[LIGHT] Resized to ${workWidth}x${workHeight} for processing`);
  }
  
  // Intensity descriptors
  const intensityDesc = intensity <= 30 ? "subtly" : intensity <= 60 ? "moderately" : "strongly";
  const intensityAdj = intensity <= 30 ? "slight" : intensity <= 60 ? "noticeable" : "dramatic";
  const bgEffect = intensity <= 30 ? "slightly adjust" : intensity <= 60 ? "adjust" : "significantly change";
  
  // Create prompts based on mood and intensity - designed for nano-banana instruction-following
  // All prompts explicitly mention subject vs background for better results
  const promptMap: Record<string, string> = {
    golden: `${intensityDesc} add golden hour lighting. Keep the main subject sharp and well-lit with ${intensityAdj} warm golden tones. ${bgEffect} the background with warm sunset colors. The subject should remain the focus while the overall scene gets ${intensity < 50 ? 'subtle warmth' : 'beautiful golden hour glow'}.`,
    
    moody: `${intensityDesc} create moody lighting. Keep the main subject visible and properly exposed, but ${bgEffect} the background to be darker with ${intensityAdj} shadows. Add ${intensity < 50 ? 'subtle atmospheric depth' : 'dramatic noir-style darkness'} to the background while the subject stays clear.`,
    
    soft: `${intensityDesc} add soft diffused lighting. The main subject should have ${intensityAdj} flattering soft light. ${bgEffect} the background with gentle even illumination. Create ${intensity < 50 ? 'subtle softness' : 'beautiful soft-box style lighting'} throughout while keeping subject details sharp.`,
    
    dramatic: `${intensityDesc} add dramatic lighting. Light the main subject with ${intensityAdj} contrast and rim lighting. ${bgEffect} the background to enhance depth. Create ${intensity < 50 ? 'subtle professional lighting' : 'strong studio-style dramatic effect'} with the subject as the clear focal point.`,
    
    natural: `${intensityDesc} enhance natural lighting. Improve how light falls on the main subject with ${intensityAdj} natural enhancement. ${bgEffect} the background lighting to be more balanced. Make the overall image ${intensity < 50 ? 'slightly more professionally lit' : 'look like high-end natural photography'}.`,
    
    spotlight: `Add a ${intensityAdj} spotlight effect on the main subject. Keep the subject brightly lit and in focus. ${bgEffect} the background to be ${intensity < 50 ? 'slightly darker' : 'significantly darker'} to create a spotlight effect. The subject should ${intensity < 50 ? 'subtly stand out' : 'dramatically pop'} from the darker surroundings.`
  };
  
  const lightPrompt = promptMap[mood];
  console.log(`[LIGHT] Using prompt: "${lightPrompt}"`);
  
  // Convert to base64
  const imageBase64 = workBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[LIGHT] Applying relighting with nano-banana...");
    
    // Use nano-banana for intelligent relighting
    const resultUrl = await runReplicateModel(
      "d05a591283da31be3eea28d5634ef9e26989b351718b6489bd308426ebd0a3e8",
      {
        prompt: lightPrompt,
        image_input: [imageDataUrl],
        aspect_ratio: "match_input_image",
        output_format: "png",
      }
    );
    
    if (!resultUrl) {
      throw new Error("Relighting failed - please try again");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    let resultBuffer = Buffer.from(response.data);
    
    // Resize back to original dimensions if needed
    if (origWidth !== workWidth || origHeight !== workHeight) {
      resultBuffer = await sharp(resultBuffer)
        .resize(origWidth, origHeight)
        .png()
        .toBuffer();
      console.log(`[LIGHT] Resized back to ${origWidth}x${origHeight}`);
    }
    
    console.log("[LIGHT] SUCCESS - Pro Lighting applied");
    return resultBuffer;
  } catch (error: any) {
    console.error("[LIGHT] Error:", error.message);
    throw error;
  }
}

/**
 * Remove Background - Uses Bria RMBG model
 * Returns transparent PNG
 */
export async function removeBackground(
  imageBuffer: Buffer
): Promise<Buffer> {
  console.log("=".repeat(60));
  console.log("[RMBG] Starting Background Removal");
  console.log("=".repeat(60));

  if (!isReplicateConfigured()) {
    throw new Error("Replicate API not configured");
  }
  
  // Get original dimensions
  const meta = await sharp(imageBuffer).metadata();
  const originalWidth = meta.width || 512;
  const originalHeight = meta.height || 512;
  
  console.log(`[RMBG] Original size: ${originalWidth}x${originalHeight}`);

  // Convert to base64
  const imageBase64 = imageBuffer.toString("base64");
  const imageDataUrl = `data:image/png;base64,${imageBase64}`;

  try {
    console.log("[RMBG] Using remove-bg model...");
    
    // lucataco/remove-bg - popular and always warm
    let resultUrl = await runReplicateModel(
      "95fcc2a26d3899cd6c2691c900465aaeff466285a65c14638cc5f36f34befaf1",
      {
        image: imageDataUrl,
      }
    );
    
    // Fallback to Bria if remove-bg fails
    if (!resultUrl) {
      console.log("[RMBG] remove-bg failed, trying Bria RMBG...");
      resultUrl = await runReplicateModel(
        "72f56bed447eb529e699e32e5e80beea5b75482fad390fdd3bd40e218db88ea0",
        {
          image: imageDataUrl,
        }
      );
    }
    
    if (!resultUrl) {
      throw new Error("Background removal failed - all models timed out. Please try again.");
    }

    const response = await apiClient.get(resultUrl, { responseType: "arraybuffer" });
    let resultBuffer = Buffer.from(response.data);
    
    // Ensure output is PNG with transparency preserved
    resultBuffer = await sharp(resultBuffer)
      .png()
      .toBuffer();
    
    console.log("[RMBG] SUCCESS");
    return resultBuffer;
  } catch (error: any) {
    console.error("[RMBG] Error:", error.message);
    throw error;
  }
}
