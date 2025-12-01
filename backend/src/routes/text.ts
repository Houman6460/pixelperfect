import { Router, Request, Response } from "express";
import axios from "axios";
import https from "https";
import { shouldUseDirectApi, getModelApiSetting } from "../services/adminSettings";

const router = Router();

const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

// Get API keys
function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

function getAnthropicKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

function getGoogleKey(): string | undefined {
  return process.env.GOOGLE_API_KEY;
}

function getReplicateKey(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

function getMistralKey(): string | undefined {
  return process.env.MISTRAL_API_KEY;
}

function getDeepSeekKey(): string | undefined {
  return process.env.DEEPSEEK_API_KEY;
}

// Model ID to admin setting ID mapping
const MODEL_TO_SETTING_ID: Record<string, string> = {
  "gpt-4o": "gpt-4o",
  "gpt-4o-mini": "gpt-4o-mini",
  "o1-preview": "o1-preview",
  "o1-mini": "o1-preview",
  "claude-3-5-sonnet-20241022": "claude-3-5-sonnet",
  "claude-3-5-haiku-20241022": "claude-3-5-sonnet",
  "claude-3-opus-20240229": "claude-3-opus",
  "gemini-2.0-flash": "gemini-2.0-flash",
  "gemini-1.5-pro": "gemini-1.5-pro",
  "gemini-1.5-flash": "gemini-2.0-flash",
  "meta/llama-3.3-70b-instruct": "llama-3.3-70b",
  "meta/llama-3.1-405b-instruct": "llama-3.1-405b",
  "mistralai/mistral-large-2411": "mistral-large",
  "qwen/qwen-2.5-72b-instruct": "qwen-2.5-72b",
  "deepseek-ai/deepseek-v3": "deepseek-v3",
};

// OpenAI API
async function generateOpenAI(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getOpenAIKey();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const response = await apiClient.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    content: response.data.choices[0]?.message?.content || "",
    usage: response.data.usage,
  };
}

// Anthropic API
async function generateAnthropic(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getAnthropicKey();
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  // Extract system message
  const systemMessage = messages.find(m => m.role === "system")?.content || "";
  const chatMessages = messages.filter(m => m.role !== "system");

  const response = await apiClient.post(
    "https://api.anthropic.com/v1/messages",
    {
      model,
      max_tokens: maxTokens,
      temperature,
      system: systemMessage,
      messages: chatMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    },
    {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
    }
  );

  return {
    content: response.data.content[0]?.text || "",
    usage: response.data.usage,
  };
}

// Google Gemini API
async function generateGoogle(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getGoogleKey();
  if (!apiKey) throw new Error("GOOGLE_API_KEY not configured");

  // Convert messages to Gemini format
  const systemInstruction = messages.find(m => m.role === "system")?.content || "";
  const contents = messages
    .filter(m => m.role !== "system")
    .map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const response = await apiClient.post(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      systemInstruction: systemInstruction ? { parts: [{ text: systemInstruction }] } : undefined,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  return {
    content: response.data.candidates?.[0]?.content?.parts?.[0]?.text || "",
    usage: response.data.usageMetadata,
  };
}

// Replicate API (for Llama, Mistral, etc.)
async function generateReplicate(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getReplicateKey();
  if (!apiKey) throw new Error("REPLICATE_API_TOKEN not configured");

  // Build prompt from messages
  const systemMessage = messages.find(m => m.role === "system")?.content || "";
  const chatMessages = messages.filter(m => m.role !== "system");
  
  let prompt = "";
  if (systemMessage) {
    prompt += `<|system|>\n${systemMessage}\n`;
  }
  for (const msg of chatMessages) {
    prompt += `<|${msg.role}|>\n${msg.content}\n`;
  }
  prompt += "<|assistant|>\n";

  // Create prediction
  const createResponse = await apiClient.post(
    `https://api.replicate.com/v1/models/${model}/predictions`,
    {
      input: {
        prompt,
        max_tokens: maxTokens,
        temperature,
      },
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      timeout: 120000,
    }
  );

  let prediction = createResponse.data;

  // Poll for completion if needed
  while (prediction.status !== "succeeded" && prediction.status !== "failed") {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const statusResponse = await apiClient.get(prediction.urls.get, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    prediction = statusResponse.data;
  }

  if (prediction.status === "failed") {
    throw new Error(prediction.error || "Generation failed");
  }

  // Extract text from output
  const output = prediction.output;
  let content = "";
  if (typeof output === "string") {
    content = output;
  } else if (Array.isArray(output)) {
    content = output.join("");
  }

  return { content };
}

// Mistral Direct API
async function generateViaMistralDirect(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getMistralKey();
  if (!apiKey) throw new Error("MISTRAL_API_KEY not configured");

  console.log("[TEXT] Using Mistral Direct API");

  const response = await apiClient.post(
    "https://api.mistral.ai/v1/chat/completions",
    {
      model: "mistral-large-latest",
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    content: response.data.choices[0]?.message?.content || "",
    usage: response.data.usage,
  };
}

// DeepSeek Direct API
async function generateViaDeepSeekDirect(
  model: string,
  messages: { role: string; content: string }[],
  temperature: number,
  maxTokens: number
): Promise<{ content: string; usage?: any }> {
  const apiKey = getDeepSeekKey();
  if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");

  console.log("[TEXT] Using DeepSeek Direct API");

  const response = await apiClient.post(
    "https://api.deepseek.com/v1/chat/completions",
    {
      model: "deepseek-chat",
      messages,
      temperature,
      max_tokens: maxTokens,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  return {
    content: response.data.choices[0]?.message?.content || "",
    usage: response.data.usage,
  };
}

// Main generate endpoint
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const { model, apiType, messages, temperature = 0.7, maxTokens = 4096 } = req.body;

    if (!model || !messages) {
      return res.status(400).json({ error: "Model and messages are required" });
    }

    // Check admin settings for API routing
    const settingId = MODEL_TO_SETTING_ID[model];
    const useDirectApi = settingId ? shouldUseDirectApi(settingId) : true;
    
    console.log(`[TEXT] Generate request: model=${model}, apiType=${apiType}, messages=${messages.length}`);
    console.log(`[TEXT] Admin setting: ${settingId}, Use Direct API: ${useDirectApi}`);

    let result: { content: string; usage?: any };
    let actualApiUsed = apiType;

    // Determine actual API to use based on admin toggle
    // For models that support both Replicate and Direct API
    if (apiType === "replicate" && useDirectApi) {
      // Check if we have a direct API available for this model
      if (settingId === "mistral-large" && getMistralKey()) {
        console.log("[TEXT] Routing Mistral to Direct API");
        result = await generateViaMistralDirect(model, messages, temperature, maxTokens);
        actualApiUsed = "mistral-direct";
      } else if (settingId === "deepseek-v3" && getDeepSeekKey()) {
        console.log("[TEXT] Routing DeepSeek to Direct API");
        result = await generateViaDeepSeekDirect(model, messages, temperature, maxTokens);
        actualApiUsed = "deepseek-direct";
      } else {
        // Fallback to Replicate
        result = await generateReplicate(model, messages, temperature, maxTokens);
      }
    } else if (apiType !== "replicate" && !useDirectApi) {
      // Admin wants to use Replicate instead of Direct API
      console.log("[TEXT] Admin toggled to Replicate, but model may not be available on Replicate");
      // Most direct API models aren't on Replicate, so just use direct
      switch (apiType) {
        case "openai":
          result = await generateOpenAI(model, messages, temperature, maxTokens);
          break;
        case "anthropic":
          result = await generateAnthropic(model, messages, temperature, maxTokens);
          break;
        case "google":
          result = await generateGoogle(model, messages, temperature, maxTokens);
          break;
        default:
          return res.status(400).json({ error: `Unsupported API type: ${apiType}` });
      }
    } else {
      // Normal routing based on apiType
      switch (apiType) {
        case "openai":
          result = await generateOpenAI(model, messages, temperature, maxTokens);
          break;
        case "anthropic":
          result = await generateAnthropic(model, messages, temperature, maxTokens);
          break;
        case "google":
          result = await generateGoogle(model, messages, temperature, maxTokens);
          break;
        case "replicate":
          result = await generateReplicate(model, messages, temperature, maxTokens);
          break;
        default:
          return res.status(400).json({ error: `Unsupported API type: ${apiType}` });
      }
    }

    console.log(`[TEXT] Generated ${result.content.length} chars via ${actualApiUsed}`);

    return res.json({
      success: true,
      content: result.content,
      text: result.content,
      usage: result.usage,
      model,
      apiUsed: actualApiUsed,
    });
  } catch (error: any) {
    console.error("[TEXT] Generation error:", error.response?.data || error.message);
    return res.status(500).json({
      error: error.response?.data?.error?.message || error.message || "Generation failed",
    });
  }
});

// Get available models
router.get("/models", async (_req: Request, res: Response) => {
  const models = {
    openai: [
      { id: "gpt-4o", name: "GPT-4o" },
      { id: "gpt-4o-mini", name: "GPT-4o Mini" },
      { id: "gpt-4-turbo", name: "GPT-4 Turbo" },
      { id: "o1-preview", name: "o1 Preview" },
      { id: "o1-mini", name: "o1 Mini" },
    ],
    anthropic: [
      { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet" },
      { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku" },
      { id: "claude-3-opus-20240229", name: "Claude 3 Opus" },
    ],
    google: [
      { id: "gemini-2.0-flash", name: "Gemini 2.0 Flash" },
      { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro" },
      { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash" },
    ],
    replicate: [
      { id: "meta/llama-3.3-70b-instruct", name: "Llama 3.3 70B" },
      { id: "meta/llama-3.1-405b-instruct", name: "Llama 3.1 405B" },
      { id: "mistralai/mistral-large-2411", name: "Mistral Large 2" },
      { id: "qwen/qwen-2.5-72b-instruct", name: "Qwen 2.5 72B" },
    ],
  };

  return res.json(models);
});

export default router;
