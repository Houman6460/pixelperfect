import axios from "axios";
import sharp from "sharp";

const OPENAI_API_URL = "https://api.openai.com/v1/images";

function getOpenAIKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function isOpenAIConfigured(): boolean {
  return Boolean(getOpenAIKey());
}

/**
 * Edit an image using OpenAI's GPT-Image-1 model
 * This produces high-quality, realistic edits
 */
export async function openaiEditImage(
  imageBuffer: Buffer,
  prompt: string,
  options: { model?: string } = {}
): Promise<Buffer> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { model = "gpt-image-1" } = options;

  // Resize image if needed (OpenAI has size limits)
  const metadata = await sharp(imageBuffer).metadata();
  let processedBuffer = imageBuffer;
  
  if ((metadata.width || 0) > 1024 || (metadata.height || 0) > 1024) {
    processedBuffer = await sharp(imageBuffer)
      .resize({ width: 1024, height: 1024, fit: "inside" })
      .png()
      .toBuffer();
  } else {
    processedBuffer = await sharp(imageBuffer).png().toBuffer();
  }

  const base64Image = processedBuffer.toString("base64");

  console.log(`[OpenAI] Editing image with ${model}...`);
  console.log(`[OpenAI] Prompt: "${prompt.substring(0, 100)}..."`);

  try {
    // Use the images/edits endpoint for GPT-Image-1
    const response = await axios.post(
      `${OPENAI_API_URL}/edits`,
      {
        model: model,
        image: `data:image/png;base64,${base64Image}`,
        prompt: `Edit this image: ${prompt}. Keep the person's identity exactly the same. Make the edit look natural and photorealistic.`,
        n: 1,
        size: "1024x1024",
      },
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 120000,
      }
    );

    const imageData = response.data?.data?.[0];
    if (!imageData) {
      throw new Error("No image returned from OpenAI");
    }

    let resultBuffer: Buffer;
    
    if (imageData.b64_json) {
      resultBuffer = Buffer.from(imageData.b64_json, "base64");
    } else if (imageData.url) {
      const imgResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
      resultBuffer = Buffer.from(imgResponse.data);
    } else {
      throw new Error("Invalid response format from OpenAI");
    }

    console.log(`[OpenAI] Edit complete`);
    return resultBuffer;

  } catch (error: any) {
    console.error("[OpenAI] Error:", error.response?.data || error.message);
    
    // If edits endpoint fails, try generate with reference
    if (error.response?.status === 404 || error.response?.status === 400) {
      console.log("[OpenAI] Falling back to generate endpoint...");
      return openaiGenerateWithReference(base64Image, prompt, apiKey, model);
    }
    
    throw new Error(error.response?.data?.error?.message || error.message || "OpenAI edit failed");
  }
}

/**
 * Generate a new image based on a reference using DALL-E 3
 */
async function openaiGenerateWithReference(
  base64Image: string,
  prompt: string,
  apiKey: string,
  model: string
): Promise<Buffer> {
  // For DALL-E 3, we describe the image and ask for a similar one with changes
  const generatePrompt = `Create a photorealistic image: ${prompt}. The result should look like a real photograph, natural lighting, high quality.`;

  const response = await axios.post(
    `${OPENAI_API_URL}/generations`,
    {
      model: model === "gpt-image-1" ? "dall-e-3" : model,
      prompt: generatePrompt,
      n: 1,
      size: "1024x1024",
      quality: "hd",
      style: "natural",
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );

  const imageData = response.data?.data?.[0];
  if (!imageData) {
    throw new Error("No image returned from OpenAI");
  }

  if (imageData.b64_json) {
    return Buffer.from(imageData.b64_json, "base64");
  } else if (imageData.url) {
    const imgResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
    return Buffer.from(imgResponse.data);
  }

  throw new Error("Invalid response format from OpenAI");
}

/**
 * Generate a new image from text using DALL-E 3
 */
export async function openaiGenerateImage(
  prompt: string,
  options: { model?: string; size?: string } = {}
): Promise<Buffer> {
  const apiKey = getOpenAIKey();
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const { model = "dall-e-3", size = "1024x1024" } = options;

  console.log(`[OpenAI] Generating image with ${model}...`);

  const response = await axios.post(
    `${OPENAI_API_URL}/generations`,
    {
      model: model,
      prompt: prompt,
      n: 1,
      size: size,
      quality: "hd",
      style: "natural",
    },
    {
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 120000,
    }
  );

  const imageData = response.data?.data?.[0];
  if (!imageData) {
    throw new Error("No image returned from OpenAI");
  }

  if (imageData.b64_json) {
    return Buffer.from(imageData.b64_json, "base64");
  } else if (imageData.url) {
    const imgResponse = await axios.get(imageData.url, { responseType: "arraybuffer" });
    return Buffer.from(imgResponse.data);
  }

  throw new Error("Invalid response format from OpenAI");
}
