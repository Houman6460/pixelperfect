import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import https from "https";
import { shouldUseDirectApi, getModelApiSetting } from "../services/adminSettings";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

function getMeshyKey(): string | undefined {
  return process.env.MESHY_API_KEY;
}

function getLumaKey(): string | undefined {
  return process.env.LUMA_API_KEY;
}

// Model ID to admin setting ID mapping
const MODEL_TO_SETTING_ID: Record<string, string> = {
  "cjwbw/shap-e": "shap-e",
  "cjwbw/point-e": "point-e",
  "camenduru/triposr": "triposr",
  "camenduru/instantmesh": "instantmesh",
  "meshy-ai/meshy-text-to-3d": "meshy-text-to-3d",
  "meshy-ai/meshy-image-to-3d": "meshy-text-to-3d",
  "luma/genie": "luma-genie",
};

// Model version mappings
const MODEL_VERSIONS: Record<string, string> = {
  // Text-to-3D
  "cjwbw/shap-e": "5957069d5c509126a73c7cb68abcddbb985aeefa4d318e7c63ec1352ce6da68c",
  "cjwbw/point-e": "c1c95e98e23c0b4e7488c1deee45ce23566a3c2c47c04cfe2d23e09ff8f5ea0a",
  "jiawei011/dreamgaussian": "latest",
  
  // Image-to-3D
  "camenduru/triposr": "latest",
  "camenduru/instantmesh": "latest",
  "camenduru/lgm": "latest",
  "camenduru/wonder3d": "latest",
  "camenduru/one-2-3-45": "latest",
  "stability-ai/zero123plus": "latest",
};

// Upload file to Replicate
async function uploadToReplicate(file: Buffer, filename: string): Promise<string> {
  const token = getReplicateToken();
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");

  const uploadResponse = await apiClient.post(
    "https://api.replicate.com/v1/files",
    { name: filename, content_type: filename.endsWith(".glb") ? "model/gltf-binary" : "image/png" },
    { headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" } }
  );

  const uploadUrl = uploadResponse.data.upload_url;
  const fileUrl = uploadResponse.data.urls.get;

  await apiClient.put(uploadUrl, file, {
    headers: { "Content-Type": filename.endsWith(".glb") ? "model/gltf-binary" : "image/png" },
  });

  return fileUrl;
}

// Run Replicate prediction
async function runReplicatePrediction(model: string, input: Record<string, any>): Promise<string | null> {
  const token = getReplicateToken();
  if (!token) throw new Error("REPLICATE_API_TOKEN not configured");

  const version = MODEL_VERSIONS[model];
  const isOfficialModel = !version || version === "latest";
  const endpoint = isOfficialModel
    ? `https://api.replicate.com/v1/models/${model}/predictions`
    : REPLICATE_API_URL;

  const body: any = { input };
  if (!isOfficialModel && version !== "latest") body.version = version;

  console.log(`[3D] Starting prediction for model: ${model}`);
  console.log(`[3D] Input:`, JSON.stringify(input, null, 2));

  const response = await apiClient.post(endpoint, body, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    timeout: 600000, // 10 minutes
  });

  let prediction = response.data;
  let attempts = 0;
  const maxAttempts = 600; // 10 minutes of polling

  while (prediction.status !== "succeeded" && prediction.status !== "failed" && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    const statusResponse = await apiClient.get(prediction.urls.get, {
      headers: { Authorization: `Bearer ${token}` },
    });
    prediction = statusResponse.data;
    attempts++;
    if (attempts % 15 === 0) console.log(`[3D] Polling attempt ${attempts}, status: ${prediction.status}`);
  }

  if (prediction.status === "failed") {
    console.error(`[3D] Prediction failed:`, prediction.error);
    throw new Error(prediction.error || "3D generation failed");
  }

  if (prediction.status !== "succeeded") throw new Error("3D generation timed out");

  console.log(`[3D] Prediction succeeded!`);

  // Extract output URL
  const output = prediction.output;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) return output[0];
  if (output?.mesh) return output.mesh;
  if (output?.glb) return output.glb;
  if (output?.model) return output.model;

  return null;
}

// Generate 3D model
router.post(
  "/generate",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "model_file", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const { model, prompt, output_format, guidance_scale, num_steps, negative_prompt } = req.body;

      if (!model) return res.status(400).json({ error: "Model is required" });

      console.log(`[3D] Generate request for model: ${model}`);
      console.log(`[3D] Prompt: ${prompt}`);

      const input: Record<string, any> = {};

      // Common parameters
      if (prompt) input.prompt = prompt;
      if (negative_prompt) input.negative_prompt = negative_prompt;
      if (guidance_scale) input.guidance_scale = parseFloat(guidance_scale);
      if (num_steps) input.num_inference_steps = parseInt(num_steps);
      if (output_format) input.output_format = output_format;

      // Handle file uploads
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      if (files?.image?.[0]) {
        const imageFile = files.image[0];
        const imageUrl = await uploadToReplicate(imageFile.buffer, imageFile.originalname);
        input.image = imageUrl;
        input.input_image = imageUrl;
      }

      if (files?.model_file?.[0]) {
        const modelFile = files.model_file[0];
        const modelUrl = await uploadToReplicate(modelFile.buffer, modelFile.originalname);
        input.model_file = modelUrl;
        input.input_mesh = modelUrl;
      }

      // Run prediction
      const modelUrl = await runReplicatePrediction(model, input);

      if (!modelUrl) return res.status(500).json({ error: "No model URL in response" });

      console.log(`[3D] Generated model URL: ${modelUrl}`);

      return res.json({ success: true, modelUrl, model });
    } catch (error: any) {
      console.error("[3D] Generation error:", error.message);
      return res.status(500).json({ error: error.message || "3D generation failed" });
    }
  }
);

// Get available models
router.get("/models", async (_req: Request, res: Response) => {
  const models = {
    "text-to-3d": [
      { id: "cjwbw/shap-e", name: "Shap-E", provider: "OpenAI" },
      { id: "cjwbw/point-e", name: "Point-E", provider: "OpenAI" },
      { id: "jiawei011/dreamgaussian", name: "DreamGaussian", provider: "Research" },
    ],
    "image-to-3d": [
      { id: "camenduru/triposr", name: "TripoSR", provider: "StabilityAI" },
      { id: "camenduru/instantmesh", name: "InstantMesh", provider: "TencentARC" },
      { id: "camenduru/lgm", name: "LGM", provider: "Research" },
      { id: "camenduru/wonder3d", name: "Wonder3D", provider: "Research" },
      { id: "camenduru/one-2-3-45", name: "One-2-3-45", provider: "Research" },
      { id: "stability-ai/zero123plus", name: "Zero123++", provider: "StabilityAI" },
    ],
  };

  return res.json(models);
});

// Check status
router.get("/status/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const token = getReplicateToken();

    if (!token) return res.status(500).json({ error: "REPLICATE_API_TOKEN not configured" });

    const response = await apiClient.get(`${REPLICATE_API_URL}/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    return res.json(response.data);
  } catch (error: any) {
    console.error("[3D] Status check error:", error.message);
    return res.status(500).json({ error: error.message });
  }
});

export default router;
