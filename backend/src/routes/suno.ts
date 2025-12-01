import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// Configure multer for audio file uploads
const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".mp3";
    cb(null, `${uuidv4()}${ext}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["audio/mpeg", "audio/wav", "audio/mp3", "audio/webm", "audio/ogg", "audio/flac", "audio/m4a", "audio/aac"];
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|webm|ogg|flac|m4a|aac)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed"));
    }
  },
});

const upload = multer({ storage: multer.memoryStorage() });

const SUNO_API_URL = "https://api.sunoapi.org";

function getSunoToken(): string | undefined {
  return process.env.SUNO_API_KEY;
}

// Helper to make Suno API requests
async function sunoRequest(
  endpoint: string,
  method: "GET" | "POST" = "POST",
  data?: Record<string, unknown>
): Promise<any> {
  const token = getSunoToken();
  if (!token) {
    throw new Error("SUNO_API_KEY not configured");
  }

  const config: any = {
    method,
    url: `${SUNO_API_URL}${endpoint}`,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  };

  if (data && method === "POST") {
    config.data = data;
  }

  console.log(`[SUNO] ${method} ${endpoint}`, data ? JSON.stringify(data).substring(0, 200) : "");
  
  const response = await axios(config);
  console.log(`[SUNO] Response:`, JSON.stringify(response.data).substring(0, 300));
  
  return response.data;
}

// Helper to poll for task completion using correct API endpoint
async function pollTaskCompletion(
  taskId: string,
  detailsEndpoint: string = "/api/v1/generate/record-info",
  maxAttempts: number = 120,
  intervalMs: number = 5000
): Promise<any> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    
    // Use query param format: /api/v1/generate/record-info?taskId=...
    const result = await sunoRequest(`${detailsEndpoint}?taskId=${taskId}`, "GET");
    const status = result?.data?.status || result?.status;
    console.log(`[SUNO] Poll ${attempt + 1}/${maxAttempts}: ${status}`);
    
    if (status === "SUCCESS" || status === "complete" || status === "completed") {
      // Return the nested data structure
      return result?.data || result;
    } else if (status === "FAILED" || status === "failed" || status === "error") {
      throw new Error(result?.data?.errorMessage || result?.errorMessage || "Task failed");
    }
  }
  
  throw new Error("Task timed out");
}

// ============================================================
// 1. GENERATE MUSIC (V5)
// ============================================================
router.post("/generate", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      style,
      title,
      model = "V5",
      customMode = true,
      instrumental = false,
      coverDescription,
      callbackUrl,
    } = req.body;

    console.log("[SUNO] Generate Music:", { prompt: prompt?.substring(0, 50), style, title, model, customMode, instrumental, coverDescription: coverDescription?.substring(0, 30) });

    const body: Record<string, unknown> = {
      model,
      customMode,
      instrumental,
      // Callback URL is required by the API - we use polling instead
      callBackUrl: callbackUrl || "https://example.com/callback",
    };

    if (customMode) {
      if (style) body.style = style;
      body.title = title || "Untitled";
      if (!instrumental && prompt) body.prompt = prompt;
    } else {
      if (prompt) body.prompt = prompt;
    }
    
    // Cover image description for album art
    if (coverDescription) {
      body.imageDescription = coverDescription;
    }

    const result = await sunoRequest("/api/v1/generate", "POST", body);

    // Response format: { code: 200, msg: "success", data: { taskId: "..." } }
    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    // Poll for completion using correct endpoint
    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    // Response format: { response: { data: [...] } }
    const tracks = completed?.response?.data || completed?.data || completed?.tracks || [];
    const audioUrl = tracks[0]?.audio_url || tracks[0]?.audioUrl;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Generate error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 2. EXTEND MUSIC
// ============================================================
router.post("/extend", async (req: Request, res: Response) => {
  try {
    const {
      audioId,
      prompt,
      style,
      title,
      continueAt,
      model = "V5",
      defaultParamFlag = false,
      callbackUrl,
    } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: "audioId is required" });
    }

    console.log("[SUNO] Extend Music:", { audioId, continueAt, model });

    const body: Record<string, unknown> = {
      audioId,
      model,
      defaultParamFlag,
    };

    if (!defaultParamFlag) {
      if (prompt) body.prompt = prompt;
      if (style) body.style = style || "pop, melodic";
      if (title) body.title = title;
      if (continueAt !== undefined) body.continueAt = continueAt;
    }

    // callBackUrl is required by the API
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/extend", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Extend error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 3. UPLOAD AND COVER AUDIO
// ============================================================
router.post("/upload-cover", async (req: Request, res: Response) => {
  try {
    const {
      uploadUrl,
      prompt,
      style,
      title,
      model = "V5",
      customMode = true,
      instrumental = false,
      callbackUrl,
    } = req.body;

    if (!uploadUrl) {
      return res.status(400).json({ success: false, error: "uploadUrl is required" });
    }

    console.log("[SUNO] Upload & Cover:", { uploadUrl: uploadUrl?.substring(0, 50), style, model });

    const body: Record<string, unknown> = {
      uploadUrl,
      model,
      customMode,
      instrumental,
    };

    if (customMode) {
      body.style = style || "pop, melodic";
      body.title = title || "Untitled";
      if (!instrumental && prompt) body.prompt = prompt;
    } else {
      if (prompt) body.prompt = prompt;
    }

    // callBackUrl is required
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/upload/cover", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Upload-Cover error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 4. UPLOAD AND EXTEND AUDIO
// ============================================================
router.post("/upload-extend", async (req: Request, res: Response) => {
  try {
    const {
      uploadUrl,
      prompt,
      style,
      title,
      continueAt,
      model = "V5",
      customMode = true,
      instrumental = false,
      callbackUrl,
    } = req.body;

    if (!uploadUrl) {
      return res.status(400).json({ success: false, error: "uploadUrl is required" });
    }

    console.log("[SUNO] Upload & Extend:", { uploadUrl: uploadUrl?.substring(0, 50), continueAt, model });

    const body: Record<string, unknown> = {
      uploadUrl,
      model,
      customMode,
      instrumental,
    };

    if (prompt) body.prompt = prompt;
    body.style = style || "pop, melodic";
    body.title = title || "Untitled";
    if (continueAt !== undefined) body.continueAt = continueAt;
    
    // callBackUrl is required
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/upload/extend", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Upload-Extend error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 5. ADD INSTRUMENTAL
// ============================================================
router.post("/add-instrumental", async (req: Request, res: Response) => {
  try {
    const {
      uploadUrl,
      prompt,
      style,
      title,
      tags,
      negativeTags,
      model = "V4_5PLUS",
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      callbackUrl,
    } = req.body;

    if (!uploadUrl) {
      return res.status(400).json({ success: false, error: "uploadUrl is required" });
    }

    console.log("[SUNO] Add Instrumental:", { uploadUrl: uploadUrl?.substring(0, 50), style, model });

    const body: Record<string, unknown> = {
      uploadUrl,
      model,
    };

    if (prompt) body.prompt = prompt;
    if (style) body.style = style;
    body.title = title || "Untitled";
    if (tags) body.tags = tags;
    if (negativeTags) body.negativeTags = negativeTags;
    if (vocalGender) body.vocalGender = vocalGender;
    if (styleWeight !== undefined) body.styleWeight = styleWeight;
    if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
    if (audioWeight !== undefined) body.audioWeight = audioWeight;
    
    // callBackUrl is required
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/add-instrumental", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Add-Instrumental error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 6. ADD VOCALS
// ============================================================
router.post("/add-vocals", async (req: Request, res: Response) => {
  try {
    const {
      uploadUrl,
      prompt,
      style,
      title,
      tags,
      negativeTags,
      model = "V4_5PLUS",
      vocalGender,
      styleWeight,
      weirdnessConstraint,
      audioWeight,
      callbackUrl,
    } = req.body;

    if (!uploadUrl) {
      return res.status(400).json({ success: false, error: "uploadUrl is required" });
    }

    console.log("[SUNO] Add Vocals:", { uploadUrl: uploadUrl?.substring(0, 50), style, vocalGender, model });

    const body: Record<string, unknown> = {
      uploadUrl,
      model,
    };

    if (prompt) body.prompt = prompt;
    if (style) body.style = style;
    body.title = title || "Untitled";
    if (tags) body.tags = tags;
    if (negativeTags) body.negativeTags = negativeTags;
    if (vocalGender) body.vocalGender = vocalGender;
    if (styleWeight !== undefined) body.styleWeight = styleWeight;
    if (weirdnessConstraint !== undefined) body.weirdnessConstraint = weirdnessConstraint;
    if (audioWeight !== undefined) body.audioWeight = audioWeight;
    
    // callBackUrl is required
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/add-vocals", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Add-Vocals error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 7. GET TIMESTAMPED LYRICS
// ============================================================
router.post("/timestamped-lyrics", async (req: Request, res: Response) => {
  try {
    const { taskId, audioId } = req.body;

    if (!taskId || !audioId) {
      return res.status(400).json({ success: false, error: "taskId and audioId are required" });
    }

    console.log("[SUNO] Get Timestamped Lyrics:", { taskId, audioId });

    const body: Record<string, unknown> = {
      taskId,
      audioId,
    };

    const result = await sunoRequest("/api/v1/timestamped-lyrics", "POST", body);

    res.json({
      success: true,
      lyrics: result.lyrics || result.data,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Timestamped-Lyrics error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 8. BOOST MUSIC STYLE
// ============================================================
router.post("/boost-style", async (req: Request, res: Response) => {
  try {
    const {
      audioId,
      style,
      boostIntensity = 0.5,
      model = "V5",
      callbackUrl,
    } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: "audioId is required" });
    }

    console.log("[SUNO] Boost Style:", { audioId, style, boostIntensity, model });

    const body: Record<string, unknown> = {
      audioId,
      model,
    };

    body.style = style || "pop, melodic";
    if (boostIntensity !== undefined) body.boostIntensity = boostIntensity;
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/boost-style", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Boost-Style error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 9. GENERATE MUSIC COVER
// ============================================================
router.post("/cover", async (req: Request, res: Response) => {
  try {
    const {
      audioId,
      prompt,
      style,
      title,
      model = "V5",
      customMode = true,
      instrumental = false,
      callbackUrl,
    } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: "audioId is required" });
    }

    console.log("[SUNO] Generate Cover:", { audioId, style, model });

    const body: Record<string, unknown> = {
      audioId,
      model,
      customMode,
      instrumental,
    };

    if (prompt) body.prompt = prompt;
    body.style = style || "pop, melodic";
    body.title = title || "Untitled";
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/cover", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/generate/record-info");
    
    const tracks = completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audioUrl || tracks[0]?.audio_url;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Cover error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 10. GENERATE LYRICS
// ============================================================
router.post("/lyrics/generate", async (req: Request, res: Response) => {
  try {
    const { prompt, callbackUrl } = req.body;

    if (!prompt) {
      return res.status(400).json({ success: false, error: "prompt is required" });
    }

    console.log("[SUNO] Generate Lyrics:", { prompt: prompt?.substring(0, 50) });

    const body: Record<string, unknown> = {
      prompt,
    };

    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/lyrics", "POST", body);

    const taskId = result?.data?.taskId || result?.taskId;
    if (!taskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(taskId, "/api/v1/lyrics/record-info", 60, 3000);

    // Extract lyrics from the response data array
    const lyricsData = completed.response?.data?.[0] || completed.data?.[0] || completed;
    const lyrics = lyricsData.text || completed.lyrics || completed.text;
    const title = lyricsData.title || completed.title;

    res.json({
      success: true,
      taskId: result.taskId || taskId,
      lyrics: lyrics,
      title: title,
      allVariations: completed.response?.data || completed.data, // Return all lyrics variations
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Lyrics error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 11. CONVERT TO WAV FORMAT
// ============================================================
router.post("/convert-wav", async (req: Request, res: Response) => {
  try {
    const { taskId, audioId, callbackUrl } = req.body;

    if (!taskId || !audioId) {
      return res.status(400).json({ success: false, error: "taskId and audioId are required" });
    }

    console.log("[SUNO] Convert to WAV:", { taskId, audioId });

    const body: Record<string, unknown> = {
      taskId,
      audioId,
    };

    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/convert-wav", "POST", body);

    const responseTaskId = result?.data?.taskId || result?.taskId;
    if (!responseTaskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(responseTaskId, "/api/v1/wav/record-info");

    res.json({
      success: true,
      taskId: responseTaskId,
      wavUrl: completed.wavUrl || completed.audioUrl || completed.response?.data?.[0]?.audio_url,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Convert-WAV error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 12. SEPARATE VOCALS FROM MUSIC
// ============================================================
router.post("/separate-vocals", async (req: Request, res: Response) => {
  try {
    const { taskId, audioId, callbackUrl } = req.body;

    if (!taskId || !audioId) {
      return res.status(400).json({ success: false, error: "taskId and audioId are required" });
    }

    console.log("[SUNO] Separate Vocals:", { taskId, audioId });

    const body: Record<string, unknown> = {
      taskId,
      audioId,
      type: "separate_vocal",
    };

    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/separate-vocals", "POST", body);

    const responseTaskId = result?.data?.taskId || result?.taskId;
    if (!responseTaskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(responseTaskId, "/api/v1/separate-vocals/record-info");

    res.json({
      success: true,
      taskId: responseTaskId,
      vocalUrl: completed.vocalUrl || completed.vocals || completed.response?.data?.[0]?.vocal_url,
      instrumentalUrl: completed.instrumentalUrl || completed.instrumental || completed.response?.data?.[0]?.instrumental_url,
      stems: completed.stems || completed.response?.data,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Separate-Vocals error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 13. SPLIT STEM (Up to 12 stems)
// ============================================================
router.post("/split-stem", async (req: Request, res: Response) => {
  try {
    const { taskId, audioId, callbackUrl } = req.body;

    if (!taskId || !audioId) {
      return res.status(400).json({ success: false, error: "taskId and audioId are required" });
    }

    console.log("[SUNO] Split Stem:", { taskId, audioId });

    const body: Record<string, unknown> = {
      taskId,
      audioId,
      type: "split_stem",
    };

    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/split-stem", "POST", body);

    const responseTaskId = result?.data?.taskId || result?.taskId;
    if (!responseTaskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(responseTaskId, "/api/v1/split-stem/record-info");

    res.json({
      success: true,
      taskId: responseTaskId,
      stems: completed.stems || completed.response?.data,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Split-Stem error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 14. CREATE MUSIC VIDEO
// ============================================================
router.post("/music-video", async (req: Request, res: Response) => {
  try {
    const { taskId, audioId, author, domainName, callbackUrl } = req.body;

    if (!taskId || !audioId) {
      return res.status(400).json({ success: false, error: "taskId and audioId are required" });
    }

    console.log("[SUNO] Create Music Video:", { taskId, audioId, author });

    const body: Record<string, unknown> = {
      taskId,
      audioId,
    };

    if (author) body.author = author;
    if (domainName) body.domainName = domainName;
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/music-video", "POST", body);

    const responseTaskId = result?.data?.taskId || result?.taskId;
    if (!responseTaskId) {
      return res.status(500).json({ success: false, error: "No taskId returned", response: result });
    }

    const completed = await pollTaskCompletion(responseTaskId, "/api/v1/music-video/record-info");

    res.json({
      success: true,
      taskId: responseTaskId,
      videoUrl: completed.videoUrl || completed.video_url || completed.response?.data?.video_url,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Music-Video error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 15. REPLACE MUSIC SECTION
// ============================================================
router.post("/replace-section", async (req: Request, res: Response) => {
  try {
    const {
      audioId,
      prompt,
      style,
      title,
      startTime,
      endTime,
      model = "V5",
      callbackUrl,
    } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: "audioId is required" });
    }

    console.log("[SUNO] Replace Section:", { audioId, startTime, endTime, model });

    const body: Record<string, unknown> = {
      audioId,
      model,
    };

    if (prompt) body.prompt = prompt;
    body.style = style || "pop, melodic";
    body.title = title || "Untitled";
    if (startTime !== undefined) body.startTime = startTime;
    if (endTime !== undefined) body.endTime = endTime;
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/replace-section", "POST", body);

    const responseTaskId = result?.data?.taskId || result?.taskId;
    if (!responseTaskId) {
      return res.status(500).json({ success: false, error: "No taskId returned" });
    }

    const completed = await pollTaskCompletion(responseTaskId, "/api/v1/generate/record-info");
    
    const tracks = completed.response?.data || completed.tracks || completed.data || [];
    const audioUrl = tracks[0]?.audio_url || tracks[0]?.audioUrl;

    res.json({
      success: true,
      taskId: result.taskId,
      audioUrl,
      tracks,
      data: completed,
    });
  } catch (error: any) {
    console.error("[SUNO] Replace-Section error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 16. GET MUSIC GENERATION DETAILS
// ============================================================
router.get("/music/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get Music Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/generate/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      tracks: result.tracks || result.data,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Music-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 17. GET MUSIC COVER DETAILS
// ============================================================
router.get("/cover/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get Cover Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/generate/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      tracks: result.tracks || result.data,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Cover-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 18. GET LYRICS GENERATION DETAILS
// ============================================================
router.get("/lyrics/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get Lyrics Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/lyrics/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      lyrics: result.lyrics || result.text,
      title: result.title,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Lyrics-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 19. GET WAV CONVERSION DETAILS
// ============================================================
router.get("/convert-wav/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get WAV Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/wav/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      wavUrl: result.wavUrl || result.audioUrl,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] WAV-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 20. GET VOCAL SEPARATION DETAILS
// ============================================================
router.get("/separate-vocals/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get Separation Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/separate-vocals/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      vocalUrl: result.vocalUrl,
      instrumentalUrl: result.instrumentalUrl,
      stems: result.stems,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Separation-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 21. GET MUSIC VIDEO DETAILS
// ============================================================
router.get("/music-video/details/:taskId", async (req: Request, res: Response) => {
  try {
    const { taskId } = req.params;
    
    console.log("[SUNO] Get Video Details:", { taskId });
    
    const result = await sunoRequest(`/api/v1/music-video/record-info?taskId=${taskId}`, "GET");

    res.json({
      success: true,
      status: result.status,
      videoUrl: result.videoUrl || result.video_url,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Video-Details error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// 22. GENERATE PERSONA
// ============================================================
router.post("/persona/generate", async (req: Request, res: Response) => {
  try {
    const { audioId, name, description, callbackUrl } = req.body;

    if (!audioId) {
      return res.status(400).json({ success: false, error: "audioId is required" });
    }

    console.log("[SUNO] Generate Persona:", { audioId, name });

    const body: Record<string, unknown> = {
      audioId,
    };

    if (name) body.name = name;
    if (description) body.description = description;
    body.callBackUrl = callbackUrl || "https://example.com/callback";

    const result = await sunoRequest("/api/v1/persona/generate", "POST", body);

    res.json({
      success: true,
      personaId: result.personaId || result.persona_id,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Persona error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// GET REMAINING CREDITS
// ============================================================
router.get("/credits", async (req: Request, res: Response) => {
  try {
    console.log("[SUNO] Get Credits");
    
    const result = await sunoRequest("/api/v1/generate/credit", "GET");

    res.json({
      success: true,
      credits: result.data || result.credits || result.remaining || 0,
      data: result,
    });
  } catch (error: any) {
    console.error("[SUNO] Credits error:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data?.message || error.message });
  }
});

// ============================================================
// AUDIO FILE UPLOAD
// ============================================================
router.post("/upload-audio", audioUpload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No audio file provided" });
    }

    console.log("[SUNO] Audio uploaded:", req.file.filename);
    
    // Generate public URL - this should be accessible from the internet
    // For local development, we use the local server URL
    // In production, you'd want to upload to a CDN like S3, Cloudinary, etc.
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
    const uploadUrl = `${baseUrl}/uploads/audio/${req.file.filename}`;
    
    res.json({
      success: true,
      uploadUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      message: "Audio uploaded successfully. Note: For Suno API, the URL must be publicly accessible.",
    });
  } catch (error: any) {
    console.error("[SUNO] Upload error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ============================================================
// VOICE RECORDING UPLOAD (Base64)
// ============================================================
router.post("/upload-recording", async (req: Request, res: Response) => {
  try {
    const { audioData, mimeType = "audio/webm", filename: customFilename } = req.body;
    
    if (!audioData) {
      return res.status(400).json({ success: false, error: "No audio data provided" });
    }
    
    // Remove data URL prefix if present
    const base64Data = audioData.replace(/^data:audio\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");
    
    // Determine extension from mime type
    const extMap: Record<string, string> = {
      "audio/webm": ".webm",
      "audio/mp3": ".mp3",
      "audio/mpeg": ".mp3",
      "audio/wav": ".wav",
      "audio/ogg": ".ogg",
    };
    const ext = extMap[mimeType] || ".webm";
    
    const uploadDir = path.join(process.cwd(), "uploads", "audio");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    const filename = customFilename || `recording_${uuidv4()}${ext}`;
    const filePath = path.join(uploadDir, filename);
    
    fs.writeFileSync(filePath, buffer);
    
    console.log("[SUNO] Recording uploaded:", filename);
    
    const baseUrl = process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 4000}`;
    const uploadUrl = `${baseUrl}/uploads/audio/${filename}`;
    
    res.json({
      success: true,
      uploadUrl,
      filename,
      size: buffer.length,
      message: "Recording uploaded successfully.",
    });
  } catch (error: any) {
    console.error("[SUNO] Recording upload error:", error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
