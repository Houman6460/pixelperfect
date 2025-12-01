import axios from "axios";
import https from "https";
import sharp from "sharp";
import { getSettings } from "./adminSettings";
import { openaiEditImage, openaiGenerateImage, isOpenAIConfigured } from "./openaiImageEditor";

// Read API keys dynamically
function getGeminiApiKey(): string | undefined {
  return process.env.GEMINI_API_KEY;
}

function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

// Create axios instance with SSL fix for macOS development
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

// API URLs
const IMAGEN_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";
const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";

interface GenerateOptions {
  prompt: string;
  referenceImages?: Buffer[];  // Up to 5 images for mix mode
  width?: number;
  height?: number;
  style?: "photorealistic" | "artistic" | "anime" | "digital-art";
  editMode?: "instruct" | "creative"; // instruct = small edits, creative = major transformations
}

interface GenerateResult {
  imageBase64: string;
  width: number;
  height: number;
  prompt: string;
}

/**
 * Generate an image using the configured AI provider
 * Supports: Replicate, OpenAI, Gemini (admin configurable)
 */
export async function generateImage(options: GenerateOptions): Promise<GenerateResult> {
  const settings = getSettings();
  const aiProvider = settings.aiProvider;
  
  console.log(`[Generate] Using AI provider: ${aiProvider}`);

  // Try OpenAI first if selected
  if (aiProvider === "openai" && isOpenAIConfigured()) {
    return generateWithOpenAI(options);
  }

  // Try Gemini if selected
  if (aiProvider === "gemini" && getGeminiApiKey()) {
    return generateWithGemini(options);
  }

  // Default to Replicate
  return generateWithReplicate(options);
}

/**
 * Generate using OpenAI (DALL-E 3 / GPT-Image-1)
 */
async function generateWithOpenAI(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, referenceImages = [], width = 1024, height = 1024 } = options;
  
  try {
    let resultBuffer: Buffer;
    
    if (referenceImages.length > 0) {
      // Edit existing image
      console.log(`[Generate] Using OpenAI for image editing`);
      resultBuffer = await openaiEditImage(referenceImages[0], prompt);
    } else {
      // Generate new image
      console.log(`[Generate] Using OpenAI for text-to-image`);
      resultBuffer = await openaiGenerateImage(prompt);
    }
    
    const metadata = await sharp(resultBuffer).metadata();
    const resultBase64 = resultBuffer.toString("base64");
    
    return {
      imageBase64: resultBase64,
      width: metadata.width || width,
      height: metadata.height || height,
      prompt,
    };
  } catch (error: any) {
    console.error("[Generate] OpenAI failed:", error.message);
    console.log("[Generate] Falling back to Replicate...");
    return generateWithReplicate(options);
  }
}

/**
 * Generate using Google Gemini
 */
async function generateWithGemini(options: GenerateOptions): Promise<GenerateResult> {
  const { prompt, referenceImages = [], width = 1024, height = 1024, style = "photorealistic" } = options;
  const geminiApiKey = getGeminiApiKey();
  
  if (!geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  
  const stylePrompts: Record<string, string> = {
    photorealistic: "photorealistic, high quality photograph, professional photography",
    artistic: "artistic painting, expressive colors",
    anime: "anime style, manga art",
    "digital-art": "digital art, modern illustration",
  };
  
  try {
    if (referenceImages.length > 0) {
      // Edit with Gemini
      console.log(`[Generate] Using Gemini 2.0 Flash for image editing`);
      const imageBase64 = referenceImages[0].toString("base64");
      
      const payload = {
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
            { text: `Edit this image: ${prompt}. Keep the person's identity exactly the same. Make it photorealistic.` }
          ]
        }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] }
      };
      
      const response = await apiClient.post(`${GEMINI_URL}?key=${geminiApiKey}`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      });
      
      const imagePart = response.data?.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inline_data?.mime_type?.startsWith("image/")
      );
      
      if (!imagePart?.inline_data?.data) {
        throw new Error("Gemini did not return an image");
      }
      
      const resultBuffer = Buffer.from(imagePart.inline_data.data, "base64");
      const metadata = await sharp(resultBuffer).metadata();
      
      return {
        imageBase64: imagePart.inline_data.data,
        width: metadata.width || width,
        height: metadata.height || height,
        prompt,
      };
    } else {
      // Generate with Imagen 3
      console.log(`[Generate] Using Imagen 3 for text-to-image`);
      const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.photorealistic}`;
      
      const payload = {
        instances: [{ prompt: enhancedPrompt }],
        parameters: { sampleCount: 1, aspectRatio: "1:1", personGeneration: "allow_adult" }
      };
      
      const response = await apiClient.post(`${IMAGEN_GENERATE_URL}?key=${geminiApiKey}`, payload, {
        headers: { "Content-Type": "application/json" },
        timeout: 120000,
      });
      
      const prediction = response.data?.predictions?.[0];
      if (!prediction?.bytesBase64Encoded) {
        throw new Error("Imagen 3 did not return an image");
      }
      
      const resultBuffer = Buffer.from(prediction.bytesBase64Encoded, "base64");
      const metadata = await sharp(resultBuffer).metadata();
      
      return {
        imageBase64: prediction.bytesBase64Encoded,
        width: metadata.width || width,
        height: metadata.height || height,
        prompt,
      };
    }
  } catch (error: any) {
    console.error("[Generate] Gemini failed:", error.response?.data || error.message);
    console.log("[Generate] Falling back to Replicate...");
    return generateWithReplicate(options);
  }
}

/**
 * Generate using Replicate (InstructPix2Pix / SDXL)
 */
async function generateWithReplicate(options: GenerateOptions): Promise<GenerateResult> {
  const replicateToken = getReplicateToken();
  if (!replicateToken) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  const { prompt, referenceImages = [], width = 1024, height = 1024, style = "photorealistic", editMode = "instruct" } = options;

  // Build style-enhanced prompt
  const stylePrompts: Record<string, string> = {
    photorealistic: "photorealistic, high quality photograph, professional photography, natural lighting, realistic details, 8k uhd",
    artistic: "artistic painting, expressive colors, creative style, painterly, fine art",
    anime: "anime style, manga art, clean lines, vibrant colors, japanese animation aesthetic",
    "digital-art": "digital art, digital illustration, modern, clean details, vibrant colors, artstation",
  };

  const negativePrompt = "blurry, low quality, distorted, deformed, ugly, bad anatomy, watermark, signature, text";

  // If reference image provided, use img2img editing
  const hasReferenceImage = referenceImages.length > 0;

  if (hasReferenceImage) {
    // Resize reference image to avoid memory issues (max 1024px)
    const refImage = referenceImages[0];
    const resizedImage = await sharp(refImage)
      .resize({ width: 1024, height: 1024, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 90 })
      .toBuffer();
    const imageBase64 = resizedImage.toString("base64");

    if (editMode === "creative") {
      // Creative mode: Use SDXL img2img for major transformations
      console.log(`[Generate] Using SDXL img2img (Creative mode)`);
      
      const replicateToken = getReplicateToken();
      if (!replicateToken) {
        throw new Error("REPLICATE_API_TOKEN is not configured");
      }
      
      const dataUri = `data:image/jpeg;base64,${imageBase64}`;
      const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.photorealistic}`;
      
      const sdxlPayload = {
        version: "8beff3369e81422112d93b89ca01426147de542cd4684c244b673b105188fe5f",
        input: {
          image: dataUri,
          prompt: enhancedPrompt,
          negative_prompt: negativePrompt,
          prompt_strength: 0.75,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          scheduler: "K_EULER",
        },
      };

      const createResponse = await apiClient.post(REPLICATE_API_URL, sdxlPayload, {
        headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
        timeout: 30000,
      });

      const predictionId = createResponse.data.id;
      let prediction = createResponse.data;
      const maxAttempts = 60;
      let attempts = 0;

      while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await apiClient.get(`${REPLICATE_API_URL}/${predictionId}`, {
          headers: { "Authorization": `Bearer ${replicateToken}` },
        });
        prediction = statusResponse.data;
        attempts++;
      }

      if (prediction.status === "failed") {
        throw new Error(prediction.error || "SDXL creative mode failed");
      }
      if (prediction.status !== "succeeded") {
        throw new Error("SDXL creative mode timed out");
      }

      const imageUrl = prediction.output?.[0];
      if (!imageUrl) {
        throw new Error("No image URL from SDXL");
      }

      const imageResponse = await apiClient.get(imageUrl, { responseType: "arraybuffer" });
      const resultBuffer = Buffer.from(imageResponse.data);
      const resultBase64 = resultBuffer.toString("base64");
      const resultMetadata = await sharp(resultBuffer).metadata();

      console.log(`[Generate] SDXL creative success: ${resultMetadata.width}x${resultMetadata.height}`);

      return {
        imageBase64: resultBase64,
        width: resultMetadata.width || width,
        height: resultMetadata.height || height,
        prompt,
      };
    } else {
      // Instruct mode: Use InstructPix2Pix with conservative settings
      console.log(`[Generate] Using InstructPix2Pix (conservative settings)`);
      
      const dataUri = `data:image/jpeg;base64,${imageBase64}`;
      
      const pix2pixPayload = {
        version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
        input: {
          image: dataUri,
          prompt: prompt,
          num_inference_steps: 100,
          guidance_scale: 7.5,
          image_guidance_scale: 1.5, // Balance between following prompt and preserving original
        },
      };

      const createResponse = await apiClient.post(REPLICATE_API_URL, pix2pixPayload, {
        headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
        timeout: 30000,
      });

      const predictionId = createResponse.data.id;
      let prediction = createResponse.data;
      const maxAttempts = 90; // 3 minutes
      let attempts = 0;

      while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const statusResponse = await apiClient.get(`${REPLICATE_API_URL}/${predictionId}`, {
          headers: { "Authorization": `Bearer ${replicateToken}` },
        });
        prediction = statusResponse.data;
        attempts++;
        if (attempts % 10 === 0) {
          console.log(`[Generate] Still processing... (${attempts * 2}s)`);
        }
      }

      if (prediction.status === "failed") {
        throw new Error(prediction.error || "InstructPix2Pix failed");
      }
      if (prediction.status !== "succeeded") {
        throw new Error("InstructPix2Pix timed out");
      }

      const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
      if (!outputUrl) {
        throw new Error("No image URL from InstructPix2Pix");
      }

      const imageResponse = await apiClient.get(outputUrl, { responseType: "arraybuffer" });
      let resultBuffer = Buffer.from(imageResponse.data);
      
      // Apply face restoration to fix distorted faces
      console.log(`[Generate] Applying face restoration (CodeFormer)...`);
      try {
        const editedDataUri = `data:image/png;base64,${resultBuffer.toString("base64")}`;
        
        const codeformerPayload = {
          version: "7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
          input: {
            image: editedDataUri,
            upscale: 1, // Don't upscale, just restore
            face_upsample: true,
            background_enhance: false,
            codeformer_fidelity: 0.7, // Balance between restoration and original
          },
        };

        const cfResponse = await apiClient.post(REPLICATE_API_URL, codeformerPayload, {
          headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
          timeout: 30000,
        });

        const cfId = cfResponse.data.id;
        let cfPrediction = cfResponse.data;
        let cfAttempts = 0;

        while (cfPrediction.status !== "succeeded" && cfPrediction.status !== "failed" && cfAttempts < 60) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const statusResponse = await apiClient.get(`${REPLICATE_API_URL}/${cfId}`, {
            headers: { "Authorization": `Bearer ${replicateToken}` },
          });
          cfPrediction = statusResponse.data;
          cfAttempts++;
        }

        if (cfPrediction.status === "succeeded" && cfPrediction.output) {
          const restoredUrl = cfPrediction.output;
          const restoredResponse = await apiClient.get(restoredUrl, { responseType: "arraybuffer" });
          resultBuffer = Buffer.from(restoredResponse.data);
          console.log(`[Generate] Face restoration complete`);
        } else {
          console.log(`[Generate] Face restoration failed, using original edit`);
        }
      } catch (cfError: any) {
        console.error(`[Generate] Face restoration error:`, cfError.message);
        // Continue with unrestored result
      }

      const resultBase64 = resultBuffer.toString("base64");
      const resultMetadata = await sharp(resultBuffer).metadata();

      console.log(`[Generate] Edit complete: ${resultMetadata.width}x${resultMetadata.height}`);

      return {
        imageBase64: resultBase64,
        width: resultMetadata.width || width,
        height: resultMetadata.height || height,
        prompt,
      };
    }
  } else {
    // No reference image: Use SDXL for text-to-image generation
    console.log(`[Generate] Using SDXL for text-to-image`);
    
    const enhancedPrompt = `${prompt}, ${stylePrompts[style] || stylePrompts.photorealistic}`;
    
    const sdxlPayload = {
      version: "39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      input: {
        prompt: enhancedPrompt,
        negative_prompt: negativePrompt,
        width: Math.min(width, 1024),
        height: Math.min(height, 1024),
        num_outputs: 1,
        scheduler: "K_EULER",
        num_inference_steps: 30,
        guidance_scale: 7.5,
      },
    };
    
    const createResponse = await apiClient.post(REPLICATE_API_URL, sdxlPayload, {
      headers: { "Authorization": `Bearer ${replicateToken}`, "Content-Type": "application/json" },
      timeout: 30000,
    });
    
    const predictionId = createResponse.data.id;
    let prediction = createResponse.data;
    const maxAttempts = 60;
    let attempts = 0;

    while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const statusResponse = await apiClient.get(`${REPLICATE_API_URL}/${predictionId}`, {
        headers: { "Authorization": `Bearer ${replicateToken}` },
      });
      prediction = statusResponse.data;
      attempts++;
    }

    if (prediction.status === "failed") {
      throw new Error(prediction.error || "SDXL generation failed");
    }
    if (prediction.status !== "succeeded") {
      throw new Error("SDXL generation timed out");
    }

    const imageUrl = prediction.output?.[0];
    if (!imageUrl) {
      throw new Error("No image URL from SDXL");
    }

    const imageResponse = await apiClient.get(imageUrl, { responseType: "arraybuffer" });
    const imageBuffer = Buffer.from(imageResponse.data);
    const sdxlBase64 = imageBuffer.toString("base64");
    const sdxlMetadata = await sharp(imageBuffer).metadata();

    console.log(`[Generate] SDXL success: ${sdxlMetadata.width}x${sdxlMetadata.height}`);

    return {
      imageBase64: sdxlBase64,
      width: sdxlMetadata.width || width,
      height: sdxlMetadata.height || height,
      prompt,
    };
  }
}

/**
 * Generate with automatic upscaling
 */
export async function generateAndUpscale(
  options: GenerateOptions,
  upscaleOptions: {
    upscaleFactor: number;
    useAI: boolean;
  }
): Promise<GenerateResult & { upscaled: boolean }> {
  // First generate the image
  const generated = await generateImage(options);

  if (!upscaleOptions.useAI || upscaleOptions.upscaleFactor <= 1) {
    return { ...generated, upscaled: false };
  }

  // Import the upscaler dynamically to avoid circular deps
  const { aiUpscale } = await import("./replicateUpscaler");

  console.log(`[Generate] Upscaling ${upscaleOptions.upscaleFactor}x...`);

  const imageBuffer = Buffer.from(generated.imageBase64, "base64");
  const upscaledBuffer = await aiUpscale(imageBuffer, { scale: upscaleOptions.upscaleFactor, faceEnhance: true });

  const upscaledMeta = await sharp(upscaledBuffer).metadata();
  const upscaledBase64 = upscaledBuffer.toString("base64");

  return {
    imageBase64: upscaledBase64,
    width: upscaledMeta.width || generated.width * upscaleOptions.upscaleFactor,
    height: upscaledMeta.height || generated.height * upscaleOptions.upscaleFactor,
    prompt: generated.prompt,
    upscaled: true,
  };
}
