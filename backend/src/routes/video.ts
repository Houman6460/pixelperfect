import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import https from "https";
import FormData from "form-data";
import { shouldUseDirectApi, getModelApiSetting } from "../services/adminSettings";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

function getGoogleKey(): string | undefined {
  return process.env.GOOGLE_API_KEY;
}

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function getLumaKey(): string | undefined {
  return process.env.LUMA_API_KEY;
}

function getRunwayKey(): string | undefined {
  return process.env.RUNWAY_API_KEY;
}

function getMiniMaxKey(): string | undefined {
  return process.env.MINIMAX_API_KEY;
}

function getStabilityKey(): string | undefined {
  return process.env.STABILITY_API_KEY;
}

// Model ID to admin setting ID mapping
const MODEL_TO_SETTING_ID: Record<string, string> = {
  "google/veo-3": "veo-3",
  "google/veo-3.1": "veo-3.1",
  "google/veo-3.1-fast": "veo-3.1",
  "google/veo-3-fast": "veo-3",
  "openai/sora-2": "sora-2",
  "kwaivgi/kling-v2.5-turbo-pro": "kling-2.5",
  "minimax/hailuo-2.3": "minimax-hailuo",
  "minimax/hailuo-2.3-fast": "minimax-hailuo",
  "luma/ray-2": "luma-ray2",
  "runway/gen-3-alpha": "runway-gen3",
  "stability-ai/stable-video-diffusion": "stable-video",
  "pixverse/pixverse-v5": "pixverse-v5",
  "wan-video/wan-2.5-t2v": "wan-2.5",
};

// Model version IDs for Replicate models
const VIDEO_MODEL_VERSIONS: Record<string, string> = {
  // Text-to-Video
  "google/veo-3.1-fast": "latest",
  "google/veo-3.1": "latest",
  "openai/sora-2": "latest",
  "kwaivgi/kling-v2.5-turbo-pro": "latest",
  "pixverse/pixverse-v5": "latest",
  "wan-video/wan-2.5-t2v": "latest",
  "wan-video/wan-2.5-t2v-fast": "latest",
  "bytedance/seedance-1-pro-fast": "latest",
  "minimax/hailuo-2.3": "latest",
  "minimax/hailuo-2.3-fast": "latest",
  "luma/ray-2": "latest",
  "fofr/cogvideox-5b": "latest",
  
  // Image-to-Video
  "wan-video/wan-2.5-i2v": "latest",
  "wan-video/wan-2.5-i2v-fast": "latest",
  "stability-ai/stable-video-diffusion": "3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438",
  "bytedance/animatediff-lightning": "latest",
  "ali-vilab/i2vgen-xl": "latest",
  
  // Video Enhancement
  "nightmareai/real-esrgan-video": "latest",
  "google-research/frame-interpolation": "latest",
  "arielreplicate/robust_video_matting": "latest",
};

// Helper to run Replicate prediction
async function runReplicatePrediction(
  model: string,
  input: Record<string, any>
): Promise<string | null> {
  const token = getReplicateToken();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  const version = VIDEO_MODEL_VERSIONS[model];
  
  // Use models endpoint for official models
  const isOfficialModel = model.includes("/") && !version.includes("-");
  const endpoint = isOfficialModel 
    ? `https://api.replicate.com/v1/models/${model}/predictions`
    : REPLICATE_API_URL;

  const body: any = { input };
  if (!isOfficialModel && version !== "latest") {
    body.version = version;
  }

  console.log(`[VIDEO] Starting prediction for model: ${model}`);
  console.log(`[VIDEO] Endpoint: ${endpoint}`);
  console.log(`[VIDEO] Input:`, JSON.stringify(input, null, 2));

  const response = await apiClient.post(endpoint, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    timeout: 600000, // 10 minutes timeout for video generation
  });

  console.log(`[VIDEO] Initial response status: ${response.data.status}`);

  // Poll for completion
  let prediction = response.data;
  let attempts = 0;
  const maxAttempts = 300; // 5 minutes of polling
  
  while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const statusResponse = await apiClient.get(prediction.urls.get, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    prediction = statusResponse.data;
    attempts++;
    
    if (attempts % 10 === 0) {
      console.log(`[VIDEO] Polling attempt ${attempts}, status: ${prediction.status}`);
    }
  }

  if (prediction.status === "failed") {
    console.error(`[VIDEO] Prediction failed:`, prediction.error);
    throw new Error(prediction.error || "Video generation failed");
  }

  if (prediction.status !== "succeeded") {
    throw new Error("Video generation timed out");
  }

  console.log(`[VIDEO] Prediction succeeded!`);

  // Extract video URL from output
  const output = prediction.output;
  if (typeof output === "string") {
    return output;
  } else if (Array.isArray(output) && output.length > 0) {
    return output[0];
  } else if (output?.video) {
    return output.video;
  } else if (output?.video_url) {
    return output.video_url;
  }

  return null;
}

// Upload file to temporary URL for Replicate
async function uploadToReplicate(file: Buffer, filename: string): Promise<string> {
  const token = getReplicateToken();
  if (!token) {
    throw new Error("REPLICATE_API_TOKEN not configured");
  }

  // Create upload URL
  const uploadResponse = await apiClient.post(
    "https://api.replicate.com/v1/files",
    {
      name: filename,
      content_type: filename.endsWith(".mp4") ? "video/mp4" : "image/png",
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    }
  );

  const uploadUrl = uploadResponse.data.upload_url;
  const fileUrl = uploadResponse.data.urls.get;

  // Upload file
  await apiClient.put(uploadUrl, file, {
    headers: {
      "Content-Type": filename.endsWith(".mp4") ? "video/mp4" : "image/png",
    },
  });

  return fileUrl;
}

// ===================== DIRECT API FUNCTIONS =====================

// Generate via Google Veo API directly
async function generateViaGoogleDirect(prompt: string, params: any): Promise<string> {
  const apiKey = getGoogleKey();
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");
  
  console.log("[VIDEO] Using Google Direct API for Veo");
  
  // Google Veo API endpoint (example - adjust as per actual API)
  const response = await apiClient.post(
    `https://generativelanguage.googleapis.com/v1beta/models/veo:generateVideo?key=${apiKey}`,
    {
      prompt: prompt,
      duration: params.duration || 5,
      aspectRatio: params.aspect_ratio || "16:9",
    },
    {
      headers: { "Content-Type": "application/json" },
      timeout: 600000,
    }
  );
  
  return response.data.videoUrl || response.data.video?.url;
}

// Generate via Luma AI Direct API
async function generateViaLumaDirect(prompt: string, params: any): Promise<string> {
  const apiKey = getLumaKey();
  if (!apiKey) throw new Error("LUMA_API_KEY not configured");
  
  console.log("[VIDEO] Using Luma AI Direct API");
  
  const response = await apiClient.post(
    "https://api.lumalabs.ai/dream-machine/v1/generations",
    {
      prompt: prompt,
      aspect_ratio: params.aspect_ratio || "16:9",
      loop: false,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 600000,
    }
  );
  
  // Poll for completion
  const generationId = response.data.id;
  let result = response.data;
  
  while (result.state === "queued" || result.state === "dreaming") {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusRes = await apiClient.get(
      `https://api.lumalabs.ai/dream-machine/v1/generations/${generationId}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );
    result = statusRes.data;
  }
  
  if (result.state === "completed") {
    return result.assets?.video || result.video?.url;
  }
  throw new Error("Luma generation failed");
}

// Generate via Runway Direct API
async function generateViaRunwayDirect(prompt: string, params: any): Promise<string> {
  const apiKey = getRunwayKey();
  if (!apiKey) throw new Error("RUNWAY_API_KEY not configured");
  
  console.log("[VIDEO] Using Runway Direct API");
  
  const response = await apiClient.post(
    "https://api.runwayml.com/v1/generations",
    {
      model: "gen-3-alpha",
      prompt: prompt,
      duration: params.duration || 5,
      aspect_ratio: params.aspect_ratio || "16:9",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 600000,
    }
  );
  
  return response.data.output?.video_url || response.data.video_url;
}

// Generate via MiniMax Direct API
async function generateViaMiniMaxDirect(prompt: string, params: any): Promise<string> {
  const apiKey = getMiniMaxKey();
  if (!apiKey) throw new Error("MINIMAX_API_KEY not configured");
  
  console.log("[VIDEO] Using MiniMax Direct API");
  
  const response = await apiClient.post(
    "https://api.minimax.chat/v1/video_generation",
    {
      prompt: prompt,
      model: "hailuo-2.3",
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 600000,
    }
  );
  
  return response.data.video_url;
}

// Generate via Stability AI Direct API
async function generateViaStabilityDirect(prompt: string, imageBuffer: Buffer | null, params: any): Promise<string> {
  const apiKey = getStabilityKey();
  if (!apiKey) throw new Error("STABILITY_API_KEY not configured");
  
  console.log("[VIDEO] Using Stability AI Direct API");
  
  const formData = new FormData();
  if (imageBuffer) {
    formData.append("image", imageBuffer, { filename: "input.png" });
  }
  formData.append("cfg_scale", params.cfg_scale || 2.5);
  formData.append("motion_bucket_id", 127);
  
  const response = await apiClient.post(
    "https://api.stability.ai/v2beta/image-to-video",
    formData,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...formData.getHeaders(),
      },
      timeout: 600000,
    }
  );
  
  // Poll for result
  const generationId = response.data.id;
  let result;
  
  while (true) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    const statusRes = await apiClient.get(
      `https://api.stability.ai/v2beta/image-to-video/result/${generationId}`,
      { 
        headers: { Authorization: `Bearer ${apiKey}` },
        responseType: 'arraybuffer'
      }
    );
    
    if (statusRes.status === 200) {
      // Return base64 video data URL
      const base64 = Buffer.from(statusRes.data).toString('base64');
      return `data:video/mp4;base64,${base64}`;
    }
  }
}

// ===================== ROUTES =====================

// Generate video
router.post(
  "/generate",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const {
        model,
        prompt,
        negative_prompt,
        duration,
        aspect_ratio,
        cfg_scale,
        steps,
        fps,
      } = req.body;

      if (!model) {
        return res.status(400).json({ error: "Model is required" });
      }

      console.log(`[VIDEO] Generate request for model: ${model}`);
      console.log(`[VIDEO] Prompt: ${prompt}`);
      
      // Check admin settings for API routing
      const settingId = MODEL_TO_SETTING_ID[model];
      const useDirectApi = settingId ? shouldUseDirectApi(settingId) : false;
      
      console.log(`[VIDEO] Admin setting: ${settingId}, Use Direct API: ${useDirectApi}`);

      // Build input based on model type
      const input: Record<string, any> = {};

      // Common parameters
      if (prompt) {
        input.prompt = prompt;
      }
      
      if (negative_prompt) {
        input.negative_prompt = negative_prompt;
      }

      // Duration handling
      if (duration) {
        const durationNum = parseFloat(duration);
        // Different models use different parameter names
        if (model.includes("wan") || model.includes("cogvideo")) {
          input.num_frames = Math.round(durationNum * 24); // Assume 24fps
        } else {
          input.duration = durationNum;
        }
      }

      // Aspect ratio
      if (aspect_ratio) {
        input.aspect_ratio = aspect_ratio;
      }

      // CFG Scale
      if (cfg_scale) {
        input.guidance_scale = parseFloat(cfg_scale);
      }

      // Steps
      if (steps) {
        input.num_inference_steps = parseInt(steps);
      }

      // FPS
      if (fps) {
        input.fps = parseInt(fps);
      }

      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      
      if (files?.image?.[0]) {
        const imageFile = files.image[0];
        const imageUrl = await uploadToReplicate(imageFile.buffer, imageFile.originalname);
        input.image = imageUrl;
        input.image_url = imageUrl; // Some models use this
      }

      if (files?.video?.[0]) {
        const videoFile = files.video[0];
        const videoUrl = await uploadToReplicate(videoFile.buffer, videoFile.originalname);
        input.video = videoUrl;
        input.video_url = videoUrl; // Some models use this
      }

      let videoUrl: string | null = null;
      const params = { duration, aspect_ratio, cfg_scale, steps, fps };
      const imageBuffer = files?.image?.[0]?.buffer || null;

      // Route to Direct API or Replicate based on admin toggle
      if (useDirectApi) {
        console.log(`[VIDEO] Routing to Direct API for: ${settingId}`);
        
        try {
          switch (settingId) {
            case "veo-3":
            case "veo-3.1":
              videoUrl = await generateViaGoogleDirect(prompt, params);
              break;
            case "luma-ray2":
              videoUrl = await generateViaLumaDirect(prompt, params);
              break;
            case "runway-gen3":
              videoUrl = await generateViaRunwayDirect(prompt, params);
              break;
            case "minimax-hailuo":
              videoUrl = await generateViaMiniMaxDirect(prompt, params);
              break;
            case "stable-video":
              videoUrl = await generateViaStabilityDirect(prompt, imageBuffer, params);
              break;
            default:
              // Fallback to Replicate if no direct API handler
              console.log(`[VIDEO] No direct API handler for ${settingId}, falling back to Replicate`);
              videoUrl = await runReplicatePrediction(model, input);
          }
        } catch (directApiError: any) {
          console.error(`[VIDEO] Direct API failed, falling back to Replicate:`, directApiError.message);
          videoUrl = await runReplicatePrediction(model, input);
        }
      } else {
        // Use Replicate
        console.log(`[VIDEO] Using Replicate for: ${model}`);
        videoUrl = await runReplicatePrediction(model, input);
      }

      if (!videoUrl) {
        return res.status(500).json({ error: "No video URL in response" });
      }

      console.log(`[VIDEO] Generated video URL: ${videoUrl}`);

      return res.json({
        success: true,
        videoUrl,
        model,
        apiUsed: useDirectApi ? "direct" : "replicate",
      });
    } catch (error: any) {
      console.error("[VIDEO] Generation error:", error.message);
      return res.status(500).json({
        error: error.message || "Video generation failed",
      });
    }
  }
);

// Get available models
router.get("/models", async (req: Request, res: Response) => {
  const models = {
    "text-to-video": [
      { id: "google/veo-3.1-fast", name: "Google Veo 3.1 Fast", hasAudio: true },
      { id: "google/veo-3.1", name: "Google Veo 3.1", hasAudio: true },
      { id: "openai/sora-2", name: "OpenAI Sora 2", hasAudio: true },
      { id: "kwaivgi/kling-v2.5-turbo-pro", name: "Kling 2.5 Turbo Pro", hasAudio: false },
      { id: "pixverse/pixverse-v5", name: "PixVerse V5", hasAudio: false },
      { id: "wan-video/wan-2.5-t2v", name: "Wan 2.5 T2V", hasAudio: false },
      { id: "wan-video/wan-2.5-t2v-fast", name: "Wan 2.5 T2V Fast", hasAudio: false },
      { id: "bytedance/seedance-1-pro-fast", name: "Seedance 1 Pro Fast", hasAudio: false },
      { id: "minimax/hailuo-2.3", name: "MiniMax Hailuo 2.3", hasAudio: false },
      { id: "minimax/hailuo-2.3-fast", name: "MiniMax Hailuo 2.3 Fast", hasAudio: false },
      { id: "luma/ray-2", name: "Luma Ray 2", hasAudio: false },
      { id: "fofr/cogvideox-5b", name: "CogVideoX-5B", hasAudio: false },
    ],
    "image-to-video": [
      { id: "wan-video/wan-2.5-i2v", name: "Wan 2.5 I2V", hasAudio: true },
      { id: "wan-video/wan-2.5-i2v-fast", name: "Wan 2.5 I2V Fast", hasAudio: false },
      { id: "stability-ai/stable-video-diffusion", name: "Stable Video Diffusion", hasAudio: false },
      { id: "bytedance/animatediff-lightning", name: "AnimateDiff Lightning", hasAudio: false },
      { id: "ali-vilab/i2vgen-xl", name: "I2VGen-XL", hasAudio: false },
    ],
    "video-enhancement": [
      { id: "nightmareai/real-esrgan-video", name: "Video Upscaler", hasAudio: true },
      { id: "google-research/frame-interpolation", name: "Frame Interpolation", hasAudio: true },
      { id: "arielreplicate/robust_video_matting", name: "Video Background Removal", hasAudio: true },
    ],
  };

  return res.json(models);
});

// Check generation status
router.get("/status/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = getReplicateToken();

    if (!token) {
      return res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });
    }

    const response = await apiClient.get(`${REPLICATE_API_URL}/${id}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return res.json(response.data);
  } catch (error: any) {
    console.error("[VIDEO] Status check error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
