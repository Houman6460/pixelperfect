import fs from "fs";
import path from "path";

const SETTINGS_FILE = path.join(__dirname, "../../data/admin-settings.json");
const MODEL_SETTINGS_FILE = path.join(__dirname, "../../data/model-api-settings.json");

export interface AdminSettings {
  aiProvider: "replicate" | "openai" | "gemini";
  openaiModel: "dall-e-3" | "gpt-image-1";
  geminiModel: "imagen-3" | "gemini-2.0-flash";
  replicateModel: "instructpix2pix" | "sdxl";
  autoSaveToGallery: boolean;
  defaultUpscaleEnabled: boolean;
  defaultUpscaleFactor: 2 | 4;
}

// Per-model API provider toggle settings
export interface ModelApiSetting {
  modelId: string;
  modelName: string;
  category: "video" | "text" | "image" | "3d" | "music";
  provider: string;
  useDirectApi: boolean; // true = direct API, false = Replicate
  directApiAvailable: boolean;
  replicateAvailable: boolean;
  directApiKey?: string; // env var name for direct API
  replicateModelId?: string;
}

export interface ModelApiSettings {
  models: ModelApiSetting[];
  lastUpdated: string;
}

const DEFAULT_SETTINGS: AdminSettings = {
  aiProvider: "openai",
  openaiModel: "gpt-image-1",
  geminiModel: "gemini-2.0-flash",
  replicateModel: "instructpix2pix",
  autoSaveToGallery: true,
  defaultUpscaleEnabled: false,
  defaultUpscaleFactor: 2,
};

// Default model API settings - comprehensive list of all models
const DEFAULT_MODEL_SETTINGS: ModelApiSettings = {
  models: [
    // ==================== VIDEO MODELS ====================
    { modelId: "veo-3", modelName: "Google Veo 3", category: "video", provider: "Google", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "GOOGLE_API_KEY", replicateModelId: "google/veo-3" },
    { modelId: "veo-3.1", modelName: "Google Veo 3.1", category: "video", provider: "Google", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "GOOGLE_API_KEY", replicateModelId: "google/veo-3.1" },
    { modelId: "sora-2", modelName: "OpenAI Sora 2", category: "video", provider: "OpenAI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "OPENAI_API_KEY", replicateModelId: "openai/sora-2" },
    { modelId: "kling-2.5", modelName: "Kling 2.5 Turbo Pro", category: "video", provider: "Kuaishou", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "kwaivgi/kling-v2.5-turbo-pro" },
    { modelId: "minimax-hailuo", modelName: "MiniMax Hailuo 2.3", category: "video", provider: "MiniMax", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "MINIMAX_API_KEY", replicateModelId: "minimax/hailuo-2.3" },
    { modelId: "wan-2.5", modelName: "Wan Video 2.5", category: "video", provider: "Alibaba", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "wan-video/wan-2.5-t2v" },
    { modelId: "pixverse-v5", modelName: "PixVerse V5", category: "video", provider: "PixVerse", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "PIXVERSE_API_KEY", replicateModelId: "pixverse/pixverse-v5" },
    { modelId: "luma-ray2", modelName: "Luma Ray 2", category: "video", provider: "Luma AI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "LUMA_API_KEY", replicateModelId: "luma/ray2" },
    { modelId: "runway-gen3", modelName: "Runway Gen-3 Alpha", category: "video", provider: "Runway", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "RUNWAY_API_KEY", replicateModelId: "runway/gen-3-alpha" },
    { modelId: "stable-video", modelName: "Stable Video Diffusion", category: "video", provider: "StabilityAI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "STABILITY_API_KEY", replicateModelId: "stability-ai/stable-video-diffusion" },
    
    // ==================== TEXT/LLM MODELS ====================
    { modelId: "gpt-4o", modelName: "GPT-4o", category: "text", provider: "OpenAI", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "OPENAI_API_KEY" },
    { modelId: "gpt-4o-mini", modelName: "GPT-4o Mini", category: "text", provider: "OpenAI", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "OPENAI_API_KEY" },
    { modelId: "o1-preview", modelName: "o1 Preview", category: "text", provider: "OpenAI", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "OPENAI_API_KEY" },
    { modelId: "claude-3-5-sonnet", modelName: "Claude 3.5 Sonnet", category: "text", provider: "Anthropic", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "ANTHROPIC_API_KEY" },
    { modelId: "claude-3-opus", modelName: "Claude 3 Opus", category: "text", provider: "Anthropic", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "ANTHROPIC_API_KEY" },
    { modelId: "gemini-2.0-flash", modelName: "Gemini 2.0 Flash", category: "text", provider: "Google", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "GOOGLE_API_KEY" },
    { modelId: "gemini-1.5-pro", modelName: "Gemini 1.5 Pro", category: "text", provider: "Google", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "GOOGLE_API_KEY" },
    { modelId: "llama-3.3-70b", modelName: "Llama 3.3 70B", category: "text", provider: "Meta", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "meta/llama-3.3-70b-instruct" },
    { modelId: "llama-3.1-405b", modelName: "Llama 3.1 405B", category: "text", provider: "Meta", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "meta/llama-3.1-405b-instruct" },
    { modelId: "mistral-large", modelName: "Mistral Large 2", category: "text", provider: "Mistral", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "MISTRAL_API_KEY", replicateModelId: "mistralai/mistral-large-2411" },
    { modelId: "qwen-2.5-72b", modelName: "Qwen 2.5 72B", category: "text", provider: "Alibaba", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "qwen/qwen-2.5-72b-instruct" },
    { modelId: "deepseek-v3", modelName: "DeepSeek V3", category: "text", provider: "DeepSeek", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "DEEPSEEK_API_KEY", replicateModelId: "deepseek-ai/deepseek-v3" },
    
    // ==================== IMAGE MODELS ====================
    { modelId: "dall-e-3", modelName: "DALL-E 3", category: "image", provider: "OpenAI", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "OPENAI_API_KEY" },
    { modelId: "gpt-image-1", modelName: "GPT Image 1", category: "image", provider: "OpenAI", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "OPENAI_API_KEY" },
    { modelId: "imagen-3", modelName: "Imagen 3", category: "image", provider: "Google", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "GOOGLE_API_KEY", replicateModelId: "google/imagen-3" },
    { modelId: "flux-pro", modelName: "FLUX Pro", category: "image", provider: "Black Forest Labs", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "BFL_API_KEY", replicateModelId: "black-forest-labs/flux-pro" },
    { modelId: "flux-dev", modelName: "FLUX Dev", category: "image", provider: "Black Forest Labs", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "black-forest-labs/flux-dev" },
    { modelId: "sdxl", modelName: "Stable Diffusion XL", category: "image", provider: "StabilityAI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "STABILITY_API_KEY", replicateModelId: "stability-ai/sdxl" },
    { modelId: "sd3", modelName: "Stable Diffusion 3", category: "image", provider: "StabilityAI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "STABILITY_API_KEY", replicateModelId: "stability-ai/stable-diffusion-3" },
    { modelId: "midjourney", modelName: "Midjourney", category: "image", provider: "Midjourney", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "midjourney/midjourney" },
    { modelId: "ideogram", modelName: "Ideogram 2.0", category: "image", provider: "Ideogram", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "IDEOGRAM_API_KEY", replicateModelId: "ideogram-ai/ideogram-v2" },
    
    // ==================== 3D MODELS ====================
    { modelId: "shap-e", modelName: "Shap-E", category: "3d", provider: "OpenAI", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "cjwbw/shap-e" },
    { modelId: "point-e", modelName: "Point-E", category: "3d", provider: "OpenAI", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "cjwbw/point-e" },
    { modelId: "triposr", modelName: "TripoSR", category: "3d", provider: "StabilityAI", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "camenduru/triposr" },
    { modelId: "instantmesh", modelName: "InstantMesh", category: "3d", provider: "TencentARC", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "camenduru/instantmesh" },
    { modelId: "meshy-text-to-3d", modelName: "Meshy Text-to-3D", category: "3d", provider: "Meshy", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "MESHY_API_KEY", replicateModelId: "meshy-ai/meshy-text-to-3d" },
    { modelId: "luma-genie", modelName: "Luma Genie", category: "3d", provider: "Luma AI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "LUMA_API_KEY", replicateModelId: "luma/genie" },
    
    // ==================== MUSIC MODELS ====================
    { modelId: "suno-v4", modelName: "Suno V4", category: "music", provider: "Suno", useDirectApi: true, directApiAvailable: true, replicateAvailable: false, directApiKey: "SUNO_API_KEY" },
    { modelId: "udio", modelName: "Udio", category: "music", provider: "Udio", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "UDIO_API_KEY", replicateModelId: "udio/udio" },
    { modelId: "musicgen", modelName: "MusicGen", category: "music", provider: "Meta", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "meta/musicgen" },
    { modelId: "stable-audio", modelName: "Stable Audio", category: "music", provider: "StabilityAI", useDirectApi: false, directApiAvailable: true, replicateAvailable: true, directApiKey: "STABILITY_API_KEY", replicateModelId: "stability-ai/stable-audio" },
    { modelId: "audiocraft", modelName: "AudioCraft", category: "music", provider: "Meta", useDirectApi: false, directApiAvailable: false, replicateAvailable: true, replicateModelId: "meta/audiocraft" },
  ],
  lastUpdated: new Date().toISOString(),
};

// Ensure data directory exists
function ensureDataDir() {
  const dataDir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

export function getSettings(): AdminSettings {
  ensureDataDir();
  try {
    if (fs.existsSync(SETTINGS_FILE)) {
      const data = fs.readFileSync(SETTINGS_FILE, "utf-8");
      return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error("[AdminSettings] Error reading settings:", e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettings(settings: Partial<AdminSettings>): AdminSettings {
  ensureDataDir();
  const current = getSettings();
  const updated = { ...current, ...settings };
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2));
  console.log("[AdminSettings] Settings saved:", updated);
  return updated;
}

export function getApiKeys() {
  return {
    replicate: process.env.REPLICATE_API_TOKEN ? "configured" : "not_configured",
    openai: process.env.OPENAI_API_KEY ? "configured" : "not_configured",
    anthropic: process.env.ANTHROPIC_API_KEY ? "configured" : "not_configured",
    google: process.env.GOOGLE_API_KEY ? "configured" : "not_configured",
    gemini: process.env.GEMINI_API_KEY ? "configured" : "not_configured",
    stability: process.env.STABILITY_API_KEY ? "configured" : "not_configured",
    mistral: process.env.MISTRAL_API_KEY ? "configured" : "not_configured",
    deepseek: process.env.DEEPSEEK_API_KEY ? "configured" : "not_configured",
    suno: process.env.SUNO_API_KEY ? "configured" : "not_configured",
    luma: process.env.LUMA_API_KEY ? "configured" : "not_configured",
    runway: process.env.RUNWAY_API_KEY ? "configured" : "not_configured",
    meshy: process.env.MESHY_API_KEY ? "configured" : "not_configured",
    minimax: process.env.MINIMAX_API_KEY ? "configured" : "not_configured",
    pixverse: process.env.PIXVERSE_API_KEY ? "configured" : "not_configured",
    ideogram: process.env.IDEOGRAM_API_KEY ? "configured" : "not_configured",
    bfl: process.env.BFL_API_KEY ? "configured" : "not_configured",
    udio: process.env.UDIO_API_KEY ? "configured" : "not_configured",
  };
}

// ==================== MODEL API SETTINGS ====================

export function getModelApiSettings(): ModelApiSettings {
  ensureDataDir();
  try {
    if (fs.existsSync(MODEL_SETTINGS_FILE)) {
      const data = fs.readFileSync(MODEL_SETTINGS_FILE, "utf-8");
      const saved = JSON.parse(data);
      // Merge saved settings with defaults to include any new models
      const mergedModels = DEFAULT_MODEL_SETTINGS.models.map(defaultModel => {
        const savedModel = saved.models?.find((m: ModelApiSetting) => m.modelId === defaultModel.modelId);
        return savedModel ? { ...defaultModel, useDirectApi: savedModel.useDirectApi } : defaultModel;
      });
      return { models: mergedModels, lastUpdated: saved.lastUpdated || new Date().toISOString() };
    }
  } catch (e) {
    console.error("[AdminSettings] Error reading model settings:", e);
  }
  return DEFAULT_MODEL_SETTINGS;
}

export function saveModelApiSettings(updates: { modelId: string; useDirectApi: boolean }[]): ModelApiSettings {
  ensureDataDir();
  const current = getModelApiSettings();
  
  for (const update of updates) {
    const modelIndex = current.models.findIndex(m => m.modelId === update.modelId);
    if (modelIndex !== -1) {
      current.models[modelIndex].useDirectApi = update.useDirectApi;
    }
  }
  
  current.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MODEL_SETTINGS_FILE, JSON.stringify(current, null, 2));
  console.log("[AdminSettings] Model API settings saved");
  return current;
}

export function toggleModelApi(modelId: string): ModelApiSetting | null {
  const settings = getModelApiSettings();
  const model = settings.models.find(m => m.modelId === modelId);
  
  if (!model) return null;
  
  // Only toggle if both APIs are available
  if (model.directApiAvailable && model.replicateAvailable) {
    model.useDirectApi = !model.useDirectApi;
    saveModelApiSettings([{ modelId, useDirectApi: model.useDirectApi }]);
    console.log(`[AdminSettings] Toggled ${modelId} to ${model.useDirectApi ? 'Direct API' : 'Replicate'}`);
    return model;
  }
  
  return model;
}

export function getModelApiSetting(modelId: string): ModelApiSetting | undefined {
  const settings = getModelApiSettings();
  return settings.models.find(m => m.modelId === modelId);
}

export function shouldUseDirectApi(modelId: string): boolean {
  const model = getModelApiSetting(modelId);
  if (!model) return false;
  return model.useDirectApi && model.directApiAvailable;
}
