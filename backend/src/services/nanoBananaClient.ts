import sharp from "sharp";
import axios from "axios";

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiApiUrl = process.env.GEMINI_API_URL;

interface GeminiInlineDataPart {
  inlineData?: {
    mimeType?: string;
    data?: string;
  };
  text?: string;
}

interface GeminiContent {
  parts?: GeminiInlineDataPart[];
}

interface GeminiCandidate {
  content?: GeminiContent;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// Store image analysis results for context-aware enhancement
let cachedImageAnalysis: {
  description: string;
  textures: string[];
  subjects: string[];
} | null = null;

/**
 * Analyze the full image to understand its content, textures, and subjects.
 * This provides context for intelligent tile enhancement.
 */
export async function analyzeImage(imageBuffer: Buffer): Promise<{
  description: string;
  textures: string[];
  subjects: string[];
}> {
  if (!geminiApiUrl || !geminiApiKey) {
    return {
      description: "Image content",
      textures: ["general"],
      subjects: ["unknown"],
    };
  }

  try {
    // Resize image for faster analysis (we don't need full resolution)
    const analysisImage = await sharp(imageBuffer)
      .resize({ width: 512, height: 512, fit: "inside" })
      .jpeg({ quality: 80 })
      .toBuffer();

    const imageBase64 = analysisImage.toString("base64");

    const analysisPrompt = `Analyze this image in detail. Respond in this EXACT JSON format only, no other text:
{
  "description": "A brief description of what's in the image",
  "textures": ["list", "of", "textures", "present"],
  "subjects": ["list", "of", "main", "subjects"]
}

Identify ALL textures present such as: hair, skin, eyes, fabric, leather, metal, wood, stone, glass, water, grass, fur, feathers, paper, plastic, concrete, brick, sand, clouds, sky, foliage, etc.

Identify main subjects: person, face, animal, building, landscape, object, food, vehicle, etc.`;

    // Use text-only response for analysis
    const payload = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              text: analysisPrompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT"],
      },
    };

    const headers = {
      "x-goog-api-key": geminiApiKey,
      "Content-Type": "application/json",
    };

    const response = await axios.post(geminiApiUrl!, payload, {
      headers,
      timeout: 30000,
    });

    const candidates = response.data?.candidates || [];
    if (!candidates.length) {
      throw new Error("No analysis response");
    }

    const parts = candidates[0].content?.parts || [];
    const textPart = parts.find((p: any) => p.text);
    
    if (!textPart || !textPart.text) {
      throw new Error("No text in analysis response");
    }

    // Parse JSON from response
    const jsonMatch = textPart.text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      cachedImageAnalysis = {
        description: parsed.description || "Image content",
        textures: Array.isArray(parsed.textures) ? parsed.textures : ["general"],
        subjects: Array.isArray(parsed.subjects) ? parsed.subjects : ["unknown"],
      };
      console.log("Image analysis:", cachedImageAnalysis);
      return cachedImageAnalysis;
    }
  } catch (err) {
    console.error("Image analysis failed:", err);
  }

  return {
    description: "Image content",
    textures: ["general"],
    subjects: ["unknown"],
  };
}

/**
 * Get texture-specific REGENERATION instructions.
 * These prompts tell the AI to ADD realistic details that may be missing.
 */
function getTextureRegenerationInstructions(textures: string[]): string {
  const instructions: string[] = [];
  
  // These prompts focus on ADDING and REGENERATING realistic details
  const textureMap: Record<string, string> = {
    hair: "REGENERATE hair with individual strands, natural shine, subtle flyaways, and realistic highlights. Add micro-details like hair follicles and natural color variation.",
    skin: "REGENERATE skin with realistic pores, subtle wrinkles, natural subsurface scattering, and micro-texture. Add realistic skin details like fine lines, natural oil sheen, and color variation.",
    eyes: "REGENERATE eyes with detailed iris patterns, realistic catchlights, individual eyelashes, tear film reflection, and natural depth. Add the wet, glossy quality of real eyes.",
    fabric: "REGENERATE fabric with visible thread patterns, weave texture, natural creases, and realistic material properties. Add micro-fibers and textile detail.",
    leather: "REGENERATE leather with natural grain, pores, wear patterns, creases, and realistic sheen. Add the organic texture of real leather.",
    metal: "REGENERATE metal with realistic reflections, surface scratches, patina, and material-appropriate shine. Add micro-texture and weathering.",
    wood: "REGENERATE wood with detailed grain patterns, knots, natural color variation, and surface texture. Add the organic detail of real wood.",
    stone: "REGENERATE stone with natural texture, cracks, mineral patterns, and weathering. Add realistic surface detail and depth.",
    glass: "REGENERATE glass with realistic reflections, refractions, surface imperfections, and transparency. Add caustics and light interaction.",
    water: "REGENERATE water with realistic ripples, reflections, transparency, and light caustics. Add natural water movement and surface detail.",
    grass: "REGENERATE grass with individual blades, natural variation, shadows, and depth. Add realistic botanical detail.",
    fur: "REGENERATE fur with individual strands, natural direction, underlayer, and realistic sheen. Add the softness and depth of real fur.",
    feathers: "REGENERATE feathers with individual barbs, natural patterns, iridescence, and realistic structure. Add micro-detail and natural variation.",
    foliage: "REGENERATE foliage with detailed leaves, veins, natural variation, and depth. Add realistic plant texture and light interaction.",
    sky: "REGENERATE sky with realistic cloud detail, atmospheric depth, color gradients, and natural lighting. Add volumetric quality.",
    face: "REGENERATE facial features with natural skin texture, pores, subtle expression lines, and realistic depth. Make the face look like a real high-quality photograph.",
    person: "REGENERATE all human features: realistic skin pores, individual hair strands, natural eye detail, and lifelike texture throughout.",
  };

  for (const texture of textures) {
    const lowerTexture = texture.toLowerCase();
    for (const [key, instruction] of Object.entries(textureMap)) {
      if (lowerTexture.includes(key)) {
        instructions.push(instruction);
        break;
      }
    }
  }

  return instructions.length > 0 
    ? instructions.join(" ") 
    : "REGENERATE all textures with photorealistic detail. Add fine micro-textures, natural imperfections, and realistic material properties.";
}

/**
 * Build a context-aware prompt for tile REGENERATION.
 * This tells the AI to add realistic details that are missing from low-quality images.
 */
function buildContextAwarePrompt(
  userPrompt: string,
  tileContext: {
    position: string;
    imageDescription: string;
    textures: string[];
    subjects: string[];
  }
): string {
  const textureInstructions = getTextureRegenerationInstructions(tileContext.textures);
  
  const contextInfo = [
    `CONTEXT: This tile is from the ${tileContext.position} of an image showing: ${tileContext.imageDescription}.`,
    `Main subjects: ${tileContext.subjects.join(", ")}.`,
    `Textures to regenerate: ${tileContext.textures.join(", ")}.`,
  ].join(" ");

  // REGENERATION-focused instructions
  const coreInstructions = [
    "IMAGE REGENERATION TASK: This is a low-quality image. Your job is to REGENERATE it as a high-quality, photorealistic version.",
    "IMAGINE what this would look like as a professional photograph and ADD those realistic details.",
    "Keep the same subject, pose, composition, and colors - but ADD the fine details that are missing.",
    textureInstructions,
    "Add realistic micro-textures, natural imperfections, and material properties.",
    "The result should look like it was taken with a high-end camera, not upscaled from low quality.",
    "Make it photorealistic with natural lighting and depth.",
  ].join(" ");

  if (userPrompt && userPrompt.trim()) {
    return `${contextInfo} ${coreInstructions} Additional: ${userPrompt.trim()}`;
  }
  
  return `${contextInfo} ${coreInstructions}`;
}

/**
 * Build the UNIVERSAL regeneration prompt that works for any image.
 * This is a fallback when specific texture detection fails.
 */
function buildUniversalRegenerationPrompt(userPrompt: string): string {
  const universalInstructions = [
    "PHOTOREALISTIC REGENERATION: Transform this low-quality image into a high-quality, photorealistic version.",
    "IMAGINE this image was taken with a professional camera and ADD all the fine details that would be visible:",
    "- For SKIN: Add realistic pores, subtle wrinkles, natural texture, and subsurface scattering",
    "- For HAIR: Add individual strands, natural shine, flyaways, and color variation", 
    "- For EYES: Add detailed iris patterns, realistic catchlights, wet reflections, and individual lashes",
    "- For FABRIC: Add thread patterns, weave texture, and realistic material properties",
    "- For ANY SURFACE: Add appropriate micro-textures, natural wear, and realistic material detail",
    "Keep the same subject, pose, lighting direction, and colors.",
    "The goal is to make this look like a real high-resolution photograph, not an upscaled low-quality image.",
    "Add depth, dimension, and photorealistic quality throughout.",
  ].join(" ");

  if (userPrompt && userPrompt.trim()) {
    return `${universalInstructions} Focus especially on: ${userPrompt.trim()}`;
  }
  
  return universalInstructions;
}

/**
 * Get position description for a tile.
 */
export function getTilePosition(
  tileX: number,
  tileY: number,
  tileWidth: number,
  tileHeight: number,
  imageWidth: number,
  imageHeight: number
): string {
  const centerX = tileX + tileWidth / 2;
  const centerY = tileY + tileHeight / 2;
  
  const horizontal = centerX < imageWidth / 3 ? "left" : centerX > (imageWidth * 2 / 3) ? "right" : "center";
  const vertical = centerY < imageHeight / 3 ? "top" : centerY > (imageHeight * 2 / 3) ? "bottom" : "middle";
  
  if (horizontal === "center" && vertical === "middle") return "center";
  if (vertical === "middle") return horizontal + " side";
  if (horizontal === "center") return vertical + " center";
  return vertical + "-" + horizontal + " corner";
}

/**
 * High-quality local upscale using Lanczos interpolation.
 * Uses gentle processing to avoid pixelation artifacts.
 * Used as fallback when API is not configured.
 */
async function localEnhance(
  tileBuffer: Buffer,
  upscale: number
): Promise<Buffer> {
  const image = sharp(tileBuffer);
  const meta = await image.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) {
    return tileBuffer;
  }

  const targetWidth = Math.max(1, Math.round(width * upscale));
  const targetHeight = Math.max(1, Math.round(height * upscale));

  // Use Lanczos3 for best quality interpolation
  // Apply VERY gentle sharpening to avoid pixelation
  const enhanced = await image
    .resize({
      width: targetWidth,
      height: targetHeight,
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    // Apply subtle blur first to smooth any interpolation artifacts
    .blur(0.3)
    // Then apply gentle sharpening
    .sharpen({
      sigma: 0.5,  // Smaller radius for finer detail
      m1: 0.8,     // Gentler on flat areas
      m2: 0.3,     // Gentler on edges to avoid halos
    })
    .png()
    .toBuffer();

  return enhanced;
}

export interface TileContext {
  position: string;
  imageDescription: string;
  textures: string[];
  subjects: string[];
}

export async function enhanceTile(
  tileBuffer: Buffer,
  prompt: string,
  upscale: number,
  context?: TileContext
): Promise<Buffer> {
  // Use high-quality local enhancement with texture-aware processing
  // Note: True AI regeneration would require Stability AI, Replicate, or similar services
  console.log(`[Enhance] Using advanced local enhancement (upscale: ${upscale}x)`);
  if (context) {
    console.log(`[Enhance] Context: ${context.position}, textures: ${context.textures.join(", ")}`);
  }
  
  return advancedLocalEnhance(tileBuffer, upscale, context);
}

/**
 * Advanced local enhancement with texture-aware processing.
 * Uses multiple passes for better quality.
 */
async function advancedLocalEnhance(
  tileBuffer: Buffer,
  upscale: number,
  context?: TileContext
): Promise<Buffer> {
  const safeUpscale = upscale > 0 ? upscale : 1;
  
  const baseImage = sharp(tileBuffer);
  const meta = await baseImage.metadata();
  const width = meta.width || 0;
  const height = meta.height || 0;

  if (!width || !height) {
    return tileBuffer;
  }

  const targetWidth = Math.max(1, Math.round(width * safeUpscale));
  const targetHeight = Math.max(1, Math.round(height * safeUpscale));

  // Determine enhancement parameters based on detected textures
  let sigma = 0.5;
  let m1 = 0.8;
  let m2 = 0.3;
  
  if (context?.textures) {
    const textures = context.textures.map(t => t.toLowerCase());
    
    if (textures.some(t => t.includes("skin") || t.includes("face"))) {
      // Softer sharpening for skin - avoid making pores too harsh
      sigma = 0.4;
      m1 = 0.6;
      m2 = 0.2;
    } else if (textures.some(t => t.includes("hair") || t.includes("fur"))) {
      // More sharpening for hair details
      sigma = 0.6;
      m1 = 1.0;
      m2 = 0.4;
    } else if (textures.some(t => t.includes("fabric") || t.includes("textile"))) {
      // Medium sharpening for fabric patterns
      sigma = 0.5;
      m1 = 0.9;
      m2 = 0.35;
    } else if (textures.some(t => t.includes("metal") || t.includes("glass"))) {
      // Sharp edges for hard surfaces
      sigma = 0.7;
      m1 = 1.2;
      m2 = 0.5;
    }
  }

  // Step 1: High-quality upscale with Lanczos3
  let enhanced = await baseImage
    .resize({
      width: targetWidth,
      height: targetHeight,
      kernel: sharp.kernel.lanczos3,
      fit: "fill",
    })
    .toBuffer();

  // Step 2: Light noise reduction to smooth interpolation artifacts
  enhanced = await sharp(enhanced)
    .blur(0.3)
    .toBuffer();

  // Step 3: Texture-aware sharpening
  enhanced = await sharp(enhanced)
    .sharpen({
      sigma,
      m1,
      m2,
    })
    .toBuffer();

  // Step 4: Subtle contrast enhancement
  enhanced = await sharp(enhanced)
    .modulate({
      brightness: 1.0,
      saturation: 1.02, // Very subtle saturation boost
    })
    .png()
    .toBuffer();

  console.log(`[Enhance] Tile enhanced: ${width}x${height} -> ${targetWidth}x${targetHeight}`);
  
  return enhanced;
}


/**
 * Post-process the final merged image for better quality.
 * Focuses on reducing pixelation and creating smooth, natural results.
 */
export async function postProcessImage(
  imageBuffer: Buffer,
  options: {
    sharpen?: boolean;
    sharpnessAmount?: number; // 0-2 range, 1 = normal
    denoise?: boolean;
    denoiseAmount?: number; // 1-4 range for median filter size
    enhanceContrast?: boolean;
    contrastAmount?: number; // 0-2 range, 1 = normal
    antiPixelate?: boolean; // Apply anti-pixelation smoothing
  } = {}
): Promise<Buffer> {
  let pipeline = sharp(imageBuffer);

  // FIRST: Apply light smoothing to reduce pixelation artifacts
  // This helps blend any blocky artifacts from tile processing
  if (options.antiPixelate !== false) {
    // Use a subtle blur to smooth pixelation, then re-sharpen
    pipeline = pipeline.blur(0.5);
  }

  // Apply denoising if requested (median filter)
  if (options.denoise && options.denoiseAmount && options.denoiseAmount > 0) {
    const filterSize = Math.max(3, Math.min(5, Math.ceil(options.denoiseAmount / 25) + 2));
    // Only use odd numbers for median filter
    const oddFilterSize = filterSize % 2 === 0 ? filterSize + 1 : filterSize;
    pipeline = pipeline.median(oddFilterSize);
  }

  // Apply GENTLE sharpening - avoid aggressive sharpening that causes pixelation
  if (options.sharpen !== false && (options.sharpnessAmount || 0) > 0) {
    const amount = Math.min(1.5, options.sharpnessAmount || 0.5);
    
    // Use very gentle sharpening to avoid halos and pixelation
    // Lower sigma = finer detail sharpening
    // Lower m1/m2 = less aggressive sharpening
    const sigma = 0.3 + (amount * 0.3); // 0.3 - 0.75 (gentler)
    const m1 = amount * 0.8; // 0 - 1.2 (much gentler)
    const m2 = amount * 0.3; // 0 - 0.45 (gentler on edges)
    
    pipeline = pipeline.sharpen({
      sigma: Math.max(0.3, Math.min(1.0, sigma)),
      m1: Math.max(0, Math.min(1.5, m1)),
      m2: Math.max(0, Math.min(0.5, m2)),
    });
  }

  // Apply contrast enhancement (gentler)
  if (options.enhanceContrast && options.contrastAmount !== undefined) {
    const amount = options.contrastAmount;
    
    if (amount > 1) {
      // Very subtle contrast boost
      const satBoost = 1 + ((amount - 1) * 0.05); // 1.0 - 1.05
      pipeline = pipeline.modulate({
        brightness: 1.0,
        saturation: Math.min(1.1, satBoost),
      });
    }
  }

  return pipeline.png().toBuffer();
}

/**
 * Apply anti-pixelation smoothing to an image.
 * This helps reduce blocky artifacts without losing too much detail.
 */
export async function smoothImage(imageBuffer: Buffer): Promise<Buffer> {
  return sharp(imageBuffer)
    .blur(0.3) // Very subtle blur
    .sharpen({ sigma: 0.5, m1: 0.5, m2: 0.2 }) // Gentle re-sharpening
    .png()
    .toBuffer();
}
