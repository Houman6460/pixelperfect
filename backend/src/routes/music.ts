import { Router, Request, Response } from "express";
import multer from "multer";
import axios from "axios";
import https from "https";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

const REPLICATE_API_URL = "https://api.replicate.com/v1/predictions";
const httpsAgent = new https.Agent({ rejectUnauthorized: false });
const apiClient = axios.create({ httpsAgent });

// Model version IDs - some models need version ID, others work with model name
const MODEL_VERSIONS: Record<string, string> = {
  "suno-ai/bark": "b76242b40d67c76ab6742e987628a2a9ac019e11d56ab96c4e91ce03b79b2787",
  "lucataco/ace-step": "280fc4f9ee507577f880a167f639c02622421d8fecf492454320311217b688f1",
  "google/lyria-2": "bb621623ee2772c96d300b2a303c9e444b482f6b0fafcc7424923e1429971120",
  "meta/musicgen": "671ac645ce5e552cc63a54a2bbff63fcf798043055d2dac5fc9e36a837eedcfb",
  "zsxkib/realistic-voice-cloning": "0a9c7c558af4c0f20667c1bd1260ce32a2879944a0b9e44e1398660c077b1550",
};

function getReplicateToken(): string | undefined {
  return process.env.REPLICATE_API_TOKEN;
}

function getSunoToken(): string | undefined {
  return process.env.SUNO_API_KEY;
}

const SUNO_API_URL = "https://api.sunoapi.org";

// Suno API model version mapping
// API accepts: V5, V4_5PLUS, V4_5ALL, V4_5, V4
const SUNO_MODEL_VERSIONS: Record<string, string> = {
  "suno/v5": "V5",
  "suno/v4.5-plus": "V4_5PLUS",
  "suno/v4.5-all": "V4_5ALL",
  "suno/v4.5": "V4_5",
  "suno/v4": "V4",
};

// Model-specific limits for validation
const SUNO_MODEL_LIMITS: Record<string, { prompt: number; style: number; title: number }> = {
  "suno/v5": { prompt: 5000, style: 1000, title: 100 },
  "suno/v4.5-plus": { prompt: 5000, style: 1000, title: 100 },
  "suno/v4.5-all": { prompt: 5000, style: 1000, title: 80 },
  "suno/v4.5": { prompt: 5000, style: 1000, title: 100 },
  "suno/v4": { prompt: 3000, style: 200, title: 80 },
};

// Suno result type
interface SunoResult {
  audioUrl: string;
  tracks: Array<{
    audio_url?: string;
    audioUrl?: string;
    id?: string;
    audio_id?: string;
    title?: string;
    image_url?: string;
    imageUrl?: string;
  }>;
  taskId?: string;
}

// Helper to run Suno API
async function runSunoModel(
  sunoVersion: string, // V5, V4_5PLUS, V4_5ALL, V4_5, V4
  params: {
    prompt?: string;
    lyrics?: string;
    style?: string;
    title?: string;
    customMode: boolean;
    instrumental: boolean;
    uploadUrl?: string; // Optional audio input for cover/extend
    vocalGender?: string; // m or f for cover
  }
): Promise<SunoResult | null> {
  const token = getSunoToken();
  if (!token) {
    console.error("[SUNO] No API key found in SUNO_API_KEY");
    return null;
  }

  // Validate version - default to V5 if invalid
  const validVersions = ["V5", "V4_5PLUS", "V4_5ALL", "V4_5", "V4"];
  if (!validVersions.includes(sunoVersion)) {
    console.warn(`[SUNO] Invalid version "${sunoVersion}", defaulting to V5`);
    sunoVersion = "V5";
  }
  const hasAudioInput = !!params.uploadUrl;
  
  console.log(`[SUNO] Starting ${hasAudioInput ? 'COVER' : 'GENERATE'} with model: ${sunoVersion}`);
  console.log(`[SUNO] Params:`, { 
    customMode: params.customMode, 
    instrumental: params.instrumental,
    style: params.style,
    title: params.title,
    promptLength: params.prompt?.length,
    lyricsLength: params.lyrics?.length,
    hasUploadUrl: hasAudioInput
  });

  try {
    // Build request body based on mode
    const body: Record<string, unknown> = {
      model: sunoVersion,
      customMode: params.customMode,
      instrumental: params.instrumental,
      // Callback URL is required by the API - we'll use polling instead
      callBackUrl: "https://example.com/callback",
    };
    
    // Add upload URL if provided (for cover/extend functionality)
    if (params.uploadUrl) {
      body.uploadUrl = params.uploadUrl;
    }

    if (params.customMode) {
      // Custom mode requires: style (always), title (always), prompt (if not instrumental)
      // Style is REQUIRED - use instruments/vocals description as fallback
      body.style = params.style || "pop, melodic";
      body.title = params.title || "Untitled";
      
      if (!params.instrumental && params.lyrics) {
        // In custom mode with vocals, prompt is the lyrics
        body.prompt = params.lyrics;
      }
    } else {
      // Auto mode: only prompt is required (describes the song)
      // Use prompt or build from style if no prompt
      body.prompt = params.prompt || params.style || "Create a beautiful song";
    }

    console.log(`[SUNO] Request body:`, body);

    // Use upload-cover endpoint if uploadUrl is provided, otherwise use generate
    const apiEndpoint = hasAudioInput 
      ? `${SUNO_API_URL}/api/v1/generate/upload-cover`
      : `${SUNO_API_URL}/api/v1/generate`;
    
    console.log(`[SUNO] Using endpoint: ${apiEndpoint}`);
    
    const createResponse = await axios.post(
      apiEndpoint,
      body,
      {
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log(`[SUNO] Create response:`, createResponse.data);

    // Response format: { code: 200, msg: "success", data: { taskId: "..." } }
    const taskId = createResponse.data?.data?.taskId || createResponse.data?.taskId;
    if (!taskId) {
      console.error("[SUNO] No taskId in response:", createResponse.data);
      return null;
    }

    console.log(`[SUNO] Task ID: ${taskId}`);

    // Poll for completion - correct API endpoint: /api/v1/generate/record-info?taskId=...
    const maxAttempts = 140; // ~11.5 minutes max (5s intervals)
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s

      const statusResponse = await axios.get(
        `${SUNO_API_URL}/api/v1/generate/record-info?taskId=${taskId}`,
        {
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      const status = statusResponse.data?.data?.status || statusResponse.data?.status;
      console.log(`[SUNO] Poll attempt ${attempt + 1}:`, status);

      if (status === "SUCCESS" || status === "complete") {
        // Log full response to understand structure
        console.log(`[SUNO] SUCCESS! Full response:`, JSON.stringify(statusResponse.data, null, 2));
        
        // Try multiple paths to find the audio data - Suno response structure varies
        const data = statusResponse.data?.data;
        let tracks = data?.response?.sunoData || 
                     data?.response?.data ||
                     data?.sunoData ||
                     data?.data ||
                     statusResponse.data?.tracks ||
                     [];
        
        // If tracks is not an array, check if it's nested differently
        if (!Array.isArray(tracks) && data?.response) {
          // Sometimes sunoData is the array directly
          tracks = Array.isArray(data.response) ? data.response : [];
        }
        
        console.log(`[SUNO] Found ${tracks?.length || 0} tracks`);
        
        if (tracks && tracks.length > 0) {
          // Get audio URL from first track - try multiple field names
          const firstTrack = tracks[0];
          const audioUrl = firstTrack.audio_url || firstTrack.audioUrl || 
                          firstTrack.song_url || firstTrack.songUrl ||
                          firstTrack.url || firstTrack.audio;
          
          if (audioUrl) {
            console.log(`[SUNO] Complete! Audio URL: ${audioUrl}`);
            console.log(`[SUNO] Track IDs:`, tracks.map((t: any) => t.id || t.audio_id));
            
            // Return full result with tracks containing audio_id
            return {
              audioUrl,
              taskId,
              tracks: tracks.map((t: any) => ({
                audio_url: t.audio_url || t.audioUrl || t.song_url || t.url,
                id: t.id || t.audio_id,
                title: t.title || t.name,
                image_url: t.image_url || t.imageUrl || t.cover_url,
              })),
            };
          }
        }
        
        // If we got SUCCESS but no audio URL, log and continue polling
        console.log(`[SUNO] SUCCESS status but no audio URL found yet, continuing...`);
      } else if (status === "FAILED" || status === "failed" || status === "error" || 
                 status === "GENERATE_AUDIO_FAILED" || status?.includes?.("FAILED")) {
        console.error("[SUNO] Generation failed with status:", status);
        console.error("[SUNO] Full response:", JSON.stringify(statusResponse.data, null, 2));
        throw new Error(`Suno generation failed: ${status}. This may be due to content policy, invalid audio URL, or API issues.`);
      }
    }

    console.error("[SUNO] Timeout waiting for generation");
    return null;
  } catch (error: any) {
    console.error("[SUNO] Error:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || error.message);
  }
}

// Helper to run Replicate model
async function runReplicateModel(
  modelOrVersion: string,
  input: Record<string, unknown>
): Promise<string | null> {
  const token = getReplicateToken();
  if (!token) return null;

  try {
    // Check if we have a version ID for this model (some models require version instead of model name)
    const versionId = MODEL_VERSIONS[modelOrVersion];
    const isModelName = modelOrVersion.includes("/") && !versionId;
    
    // Use version endpoint if we have a version ID, otherwise try model endpoint
    const createUrl = versionId 
      ? REPLICATE_API_URL  // Use /predictions with version
      : isModelName 
        ? `https://api.replicate.com/v1/models/${modelOrVersion}/predictions`
        : REPLICATE_API_URL;
    
    const requestBody = versionId 
      ? { version: versionId, input }  // Use version ID
      : isModelName 
        ? { input } 
        : { version: modelOrVersion, input };

    console.log(`[MUSIC] Starting model: ${modelOrVersion}${versionId ? ` (version: ${versionId.substring(0, 12)}...)` : ""}`);
    console.log(`[MUSIC] Input:`, JSON.stringify(input, null, 2));

    const createResponse = await apiClient.post(createUrl, requestBody, {
      headers: {
        Authorization: `Token ${token}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });

    const predictionId = createResponse.data.id;
    const getUrl = createResponse.data.urls?.get || `${REPLICATE_API_URL}/${predictionId}`;

    // Poll for completion - music generation can take longer
    let attempts = 0;
    const maxAttempts = 300; // 10 minutes max

    while (attempts < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      attempts++;

      try {
        const statusResponse = await apiClient.get(getUrl, {
          headers: { Authorization: `Token ${token}` },
        });

        const status = statusResponse.data.status;

        if (attempts % 15 === 0) {
          console.log(`[MUSIC] Status: ${status} (attempt ${attempts}/${maxAttempts})`);
        }

        if (status === "succeeded") {
          const output = statusResponse.data.output;
          console.log(`[MUSIC] Success! Output:`, output);
          // Handle different output formats
          if (typeof output === "string") return output;
          if (Array.isArray(output)) return output[0];
          if (output?.audio) return output.audio;
          if (output?.output) return output.output;
          return null;
        } else if (status === "failed" || status === "canceled") {
          const errorMsg = statusResponse.data.error || "Prediction failed";
          console.error("[MUSIC] Prediction failed:", errorMsg);
          throw new Error(errorMsg);
        }
      } catch (pollError: any) {
        // Re-throw prediction failures
        if (pollError.message && !pollError.message.includes("Poll error")) {
          throw pollError;
        }
        console.warn(`[MUSIC] Poll error (attempt ${attempts}):`, pollError.message);
      }
    }

    console.error("[MUSIC] Prediction timed out");
    throw new Error("Music generation timed out. Please try again.");
  } catch (error: any) {
    console.error("[MUSIC] API error:", error.message);
    
    // Check for rate limit (429) error
    if (error.response?.status === 429) {
      const retryAfter = error.response?.data?.retry_after || 60;
      throw new Error(`Rate limited by Replicate. You have low credit (<$5). Please wait ${retryAfter} seconds and try again, or add credit at replicate.com/account/billing`);
    }
    
    // Check for 404 error
    if (error.response?.status === 404) {
      throw new Error(`Model not found. The model may be unavailable or require a specific version.`);
    }
    
    throw error;
  }
}

// Convert file buffer to base64 data URL
function bufferToDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

// Build enhanced prompt with instruments and vocals
function buildEnhancedPrompt(basePrompt: string, instruments?: string, vocals?: string): string {
  let enhancedPrompt = basePrompt;
  
  if (instruments) {
    enhancedPrompt += `. Featuring instruments: ${instruments}`;
  }
  
  if (vocals) {
    enhancedPrompt += `. Vocals: ${vocals}`;
  }
  
  return enhancedPrompt;
}

// POST /api/music/generate
router.post(
  "/generate",
  upload.fields([
    { name: "melody_audio", maxCount: 1 },
    { name: "reference_audio", maxCount: 1 },
    { name: "input_audio", maxCount: 1 },
    { name: "song_input", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const model = req.body.model as string;
      if (!model) {
        return res.status(400).json({ success: false, error: "Model is required" });
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`[MUSIC] Generate request for model: ${model}`);
      console.log(`[MUSIC] Body:`, req.body);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      console.log(`[MUSIC] Files received:`, files ? Object.keys(files) : "none");
      let input: Record<string, unknown> = {};
      
      // Get instruments and vocals from request
      const instruments = req.body.instruments as string | undefined;
      const vocals = req.body.vocals as string | undefined;

      // Build input based on model
      switch (model) {
        case "minimax/music-1.5":
        case "minimax/music-01": {
          // MiniMax has strict 300 char limit - use prompt as-is (frontend already condensed it with instruments/vocals included)
          const basePrompt = req.body.prompt || "instrumental music";
          console.log(`[MUSIC] MiniMax prompt (${basePrompt.length} chars): "${basePrompt}"`);
          input = {
            prompt: basePrompt,  // Don't re-enhance - already condensed by frontend
          };
          if (req.body.lyrics) {
            input.lyrics = req.body.lyrics;
          }
          // MiniMax requires one of: song_file, voice_file, or instrumental_file
          if (files?.reference_audio?.[0]) {
            const audioDataUrl = bufferToDataUrl(
              files.reference_audio[0].buffer,
              files.reference_audio[0].mimetype
            );
            // Use song_file as the reference (includes both music and vocals)
            input.song_file = audioDataUrl;
            console.log(`[MUSIC] Added song_file reference (${files.reference_audio[0].size} bytes)`);
          }
          break;
        }

        case "google/lyria-2": {
          const basePrompt = req.body.prompt || "instrumental music";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
          };
          if (req.body.duration) {
            input.duration = parseInt(req.body.duration);
          }
          break;
        }

        case "lucataco/ace-step": {
          const basePrompt = req.body.prompt || "instrumental music";
          
          // Build tags - ACE-Step requires this field
          let tagsStr = req.body.tags || "pop, ballad";
          if (instruments) {
            tagsStr += `, ${instruments}`;
          }
          if (vocals) {
            tagsStr += `, ${vocals}`;
          }
          
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            tags: tagsStr,  // Required field
          };
          
          if (req.body.lyrics) {
            input.lyrics = req.body.lyrics;
          }
          if (req.body.duration) {
            input.duration = parseInt(req.body.duration);
          }
          
          console.log(`[MUSIC] ACE-Step input:`, JSON.stringify(input, null, 2));
          break;
        }

        case "suno-ai/bark": {
          // Bark in music mode - use ♪ notation for singing
          let musicPrompt = req.body.prompt || "";
          const barkLyrics = req.body.lyrics || "";
          
          // If lyrics provided, use them as the main content
          if (barkLyrics) {
            // Wrap lyrics in ♪ notation for singing mode
            musicPrompt = barkLyrics.includes("♪") 
              ? barkLyrics 
              : `♪ ${barkLyrics} ♪`;
          } else if (!musicPrompt.includes("♪") && vocals) {
            // If no lyrics but prompt exists, wrap in music notation
            musicPrompt = `♪ ${musicPrompt} ♪`;
          }
          
          // Add vocal type context
          if (vocals) {
            musicPrompt = `[${vocals} voice] ${musicPrompt}`;
          }
          
          console.log(`[MUSIC] Bark prompt: "${musicPrompt.substring(0, 200)}..."`);
          
          // Valid Bark voice presets (without v2/ prefix)
          const validBarkVoices = [
            "announcer",
            ...["en", "de", "es", "fr", "hi", "it", "ja", "ko", "pl", "pt", "ru", "tr", "zh"]
              .flatMap(lang => Array.from({length: 10}, (_, i) => `${lang}_speaker_${i}`))
          ];
          
          // Clean up voice preset - remove v2/ prefix if present
          let voicePreset = req.body.voice_preset || "announcer";
          if (voicePreset.startsWith("v2/")) {
            voicePreset = voicePreset.replace("v2/", "");
          }
          // Fallback to announcer if invalid
          if (!validBarkVoices.includes(voicePreset)) {
            console.log(`[MUSIC] Invalid voice preset "${voicePreset}", using announcer`);
            voicePreset = "announcer";
          }
          
          console.log(`[MUSIC] Using voice preset: ${voicePreset}`);
          
          input = {
            prompt: musicPrompt,
            history_prompt: voicePreset,
          };
          
          if (req.body.text_temp) {
            input.text_temp = parseFloat(req.body.text_temp);
          }
          if (req.body.waveform_temp) {
            input.waveform_temp = parseFloat(req.body.waveform_temp);
          }
          break;
        }

        case "meta/musicgen": {
          const basePrompt = req.body.prompt || "instrumental music";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            duration: parseInt(req.body.duration) || 8,
            model_version: "stereo-large",
            output_format: "mp3",
            normalization_strategy: "peak",
          };
          if (req.body.temperature) {
            input.temperature = parseFloat(req.body.temperature);
          }
          if (req.body.top_k) {
            input.top_k = parseInt(req.body.top_k);
          }
          if (req.body.top_p) {
            input.top_p = parseFloat(req.body.top_p);
          }
          if (files?.melody_audio?.[0]) {
            input.input_audio = bufferToDataUrl(
              files.melody_audio[0].buffer,
              files.melody_audio[0].mimetype
            );
            input.continuation = false;
            input.continuation_start = 0;
          }
          break;
        }

        case "stability-ai/stable-audio-2.5": {
          const basePrompt = req.body.prompt || "instrumental music";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            duration: parseFloat(req.body.duration) || 30,
          };
          if (req.body.negative_prompt) {
            input.negative_prompt = req.body.negative_prompt;
          }
          break;
        }

        case "sakemin/musicgen-stereo-chord": {
          const basePrompt = req.body.prompt || "instrumental music";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            duration: parseInt(req.body.duration) || 8,
            model_version: "stereo-chord",
            output_format: "mp3",
          };
          if (req.body.chords) {
            input.chords = req.body.chords;
          }
          if (req.body.bpm) {
            input.bpm = parseInt(req.body.bpm);
          }
          if (req.body.temperature) {
            input.temperature = parseFloat(req.body.temperature);
          }
          break;
        }

        case "andreasjansson/musicgen-looper": {
          const basePrompt = req.body.prompt || "instrumental music";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            bpm: parseInt(req.body.bpm) || 120,
            bars: parseInt(req.body.bars) || 4,
          };
          break;
        }

        case "sakemin/musicgen-remixer": {
          if (!files?.input_audio?.[0] && !files?.reference_audio?.[0]) {
            return res.status(400).json({
              success: false,
              error: "Reference audio is required for remixing",
            });
          }
          const audioFile = files.input_audio?.[0] || files.reference_audio?.[0];
          const basePrompt = req.body.prompt || "remix in new style";
          input = {
            prompt: buildEnhancedPrompt(basePrompt, instruments, vocals),
            music_input: bufferToDataUrl(audioFile!.buffer, audioFile!.mimetype),
            duration: parseInt(req.body.duration) || 8,
          };
          break;
        }

        case "riffusion/riffusion": {
          const basePromptA = req.body.prompt_a || req.body.prompt || "piano music";
          const basePromptB = req.body.prompt_b || basePromptA;
          input = {
            prompt_a: buildEnhancedPrompt(basePromptA, instruments, vocals),
            prompt_b: buildEnhancedPrompt(basePromptB, instruments, vocals),
            denoising: parseFloat(req.body.denoising) || 0.75,
            seed_image_id: "vibes",
          };
          break;
        }

        case "zsxkib/realistic-voice-cloning": {
          if (!files?.song_input?.[0]) {
            return res.status(400).json({
              success: false,
              error: "Song input is required for voice cloning",
            });
          }
          if (!req.body.rvc_model) {
            return res.status(400).json({
              success: false,
              error: "RVC model URL is required",
            });
          }
          input = {
            song_input: bufferToDataUrl(files.song_input[0].buffer, files.song_input[0].mimetype),
            rvc_model: req.body.rvc_model,
            pitch_change: parseInt(req.body.pitch_change) || 0,
            index_rate: parseFloat(req.body.index_rate) || 0.5,
            filter_radius: parseInt(req.body.filter_radius) || 3,
            rms_mix_rate: 0.25,
            pitch_detection_algorithm: "rmvpe",
            crepe_hop_length: 128,
            protect: 0.33,
            main_vocals_volume_change: 0,
            backup_vocals_volume_change: 0,
            instrumental_volume_change: 0,
            pitch_change_all: 0,
            reverb_size: 0.15,
            reverb_wetness: 0.2,
            reverb_dryness: 0.8,
            reverb_damping: 0.7,
            output_format: "mp3",
          };
          break;
        }

        case "replicate/train-rvc-model": {
          // This is a training model - it returns a model URL, not audio
          const datasetUrl = req.body.dataset_url;
          const modelName = req.body.model_name;
          const epochs = parseInt(req.body.epochs) || 100;

          if (!datasetUrl) {
            return res.status(400).json({
              success: false,
              error: "Dataset URL is required for training",
            });
          }
          if (!modelName) {
            return res.status(400).json({
              success: false,
              error: "Model name is required",
            });
          }

          input = {
            dataset_url: datasetUrl,
            model_name: modelName,
            epochs: epochs,
            sample_rate: 40000,
            f0_method: "rmvpe",
            batch_size: 6,
            save_every_epoch: 10,
          };
          break;
        }

        // Suno Official API models
        case "suno/ai": // New unified Suno model - uses sunoModel param for version
        case "suno/v5":
        case "suno/v4.5-plus":
        case "suno/v4.5-all":
        case "suno/v4.5":
        case "suno/v4": {
          // Determine actual Suno version from either sunoModel param or model ID
          const sunoModelParam = req.body.sunoModel; // V5, V4_5PLUS, V4_5ALL, V4_5, V4
          let actualSunoVersion = "V5"; // Default to latest
          
          if (sunoModelParam) {
            // Direct version from dropdown: V5, V4_5PLUS, V4_5ALL, V4_5, V4
            actualSunoVersion = sunoModelParam;
          } else if (model !== "suno/ai") {
            // Legacy: map from model ID
            actualSunoVersion = SUNO_MODEL_VERSIONS[model] || "V5";
          }
          
          console.log(`[MUSIC] Suno version: ${actualSunoVersion} (from param: ${sunoModelParam}, model: ${model})`);
          
          // Build style from style + instruments + vocals
          const instruments = req.body.instruments || "";
          const vocals = req.body.vocals || "";
          const baseStyle = req.body.style || "";
          const isInstrumental = req.body.instrumental === "true";
          
          // Build combined style with clear sections for Suno
          let styleParts: string[] = [];
          
          // Add base style/genre first
          if (baseStyle) {
            styleParts.push(baseStyle);
          }
          
          // Add instruments with their priority levels
          if (instruments) {
            styleParts.push(`Instruments: ${instruments}`);
          }
          
          // Add vocals with their priority levels (only if not instrumental)
          if (vocals && !isInstrumental) {
            styleParts.push(`Vocals: ${vocals}`);
          }
          
          let combinedStyle = styleParts.join(". ");
          
          // Enforce style limits per model
          const styleLimit = model === "suno/v4" ? 200 : 1000;
          if (combinedStyle.length > styleLimit) {
            // Truncate but try to keep structure
            combinedStyle = combinedStyle.substring(0, styleLimit - 3) + "...";
          }
          
          console.log(`[MUSIC] Instruments received: "${instruments}"`);
          console.log(`[MUSIC] Vocals received: "${vocals}"`);
          console.log(`[MUSIC] Base style: "${baseStyle}"`);
          console.log(`[MUSIC] Combined style: "${combinedStyle}" (${combinedStyle.length} chars)`);
          
          const sunoParams = {
            prompt: req.body.prompt || "",
            lyrics: req.body.lyrics || "",
            style: combinedStyle,
            title: req.body.title || "Untitled Song",
            customMode: req.body.customMode === "true",
            instrumental: isInstrumental,
            uploadUrl: req.body.uploadUrl || undefined, // Optional audio input for cover
            vocalGender: req.body.vocalGender || undefined, // m or f for cover
          };
          
          console.log(`[MUSIC] Suno params:`, sunoParams);
          if (sunoParams.uploadUrl) {
            console.log(`[MUSIC] Audio input provided - will use cover endpoint`);
          }
          
          try {
            const result = await runSunoModel(actualSunoVersion, sunoParams);
            
            if (!result) {
              return res.status(500).json({
                success: false,
                error: "Suno generation failed - check API key or try again",
              });
            }
            
            console.log(`[MUSIC] Suno Complete! Audio URL: ${result.audioUrl}`);
            console.log(`[MUSIC] Tracks with IDs:`, result.tracks.map(t => ({ id: t.id, title: t.title })));
            
            // Return full response with tracks containing audio_id for gallery storage
            return res.json({ 
              success: true, 
              audioUrl: result.audioUrl,
              taskId: result.taskId,
              tracks: result.tracks,
            });
          } catch (sunoError: any) {
            console.error("[MUSIC] Suno Error:", sunoError.message);
            return res.status(500).json({ success: false, error: sunoError.message });
          }
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown model: ${model}` });
      }

      // For Replicate models
      const audioUrl = await runReplicateModel(model, input);

      if (!audioUrl) {
        return res.status(500).json({
          success: false,
          error: "Music generation failed - model timed out or returned no output",
        });
      }

      console.log(`[MUSIC] Complete! Audio URL: ${audioUrl}`);
      res.json({ success: true, audioUrl });
    } catch (error: any) {
      console.error("[MUSIC] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// Transcription endpoint
router.post(
  "/transcribe",
  upload.single("audio"),
  async (req: Request, res: Response) => {
    try {
      const { model, language, model_size, translate, num_speakers, batch_size, timestamp, align_output, temperature } = req.body;
      const audioFile = req.file;

      if (!audioFile) {
        return res.status(400).json({ success: false, error: "Audio file is required" });
      }

      console.log(`[TRANSCRIBE] Model: ${model}, Language: ${language}`);

      // Upload audio file to temporary storage for Replicate
      const audioBase64 = audioFile.buffer.toString("base64");
      const audioDataUri = `data:${audioFile.mimetype};base64,${audioBase64}`;

      let input: Record<string, any> = {};

      switch (model) {
        case "openai/whisper":
          input = {
            audio: audioDataUri,
            model: model_size || "large-v3",
            language: language === "auto" ? undefined : language,
            transcription: "plain text",
            translate: translate === "true",
            temperature: parseFloat(temperature) || 0,
          };
          break;

        case "vaibhavs10/incredibly-fast-whisper":
          input = {
            audio: audioDataUri,
            language: language === "auto" ? "None" : language,
            batch_size: parseInt(batch_size) || 24,
            timestamp: timestamp === "true" ? "chunk" : "none",
          };
          break;

        case "thomasmol/whisper-diarization":
          input = {
            file_url: audioDataUri,
            language: language === "auto" ? undefined : language,
            num_speakers: parseInt(num_speakers) || 2,
            group_segments: true,
          };
          break;

        case "m-bain/whisperx":
          input = {
            audio: audioDataUri,
            language: language === "auto" ? undefined : language,
            batch_size: parseInt(batch_size) || 16,
            align_output: align_output === "true",
          };
          break;

        case "turian/insanely-fast-whisper-with-video":
          input = {
            url: audioDataUri,
            language: language === "auto" ? undefined : language,
            batch_size: parseInt(batch_size) || 24,
          };
          break;

        default:
          return res.status(400).json({ success: false, error: `Unknown transcription model: ${model}` });
      }

      // Run transcription
      const result: any = await runReplicateModel(model, input);

      // Process result - different models return different formats
      let transcription = "";
      
      if (typeof result === "string") {
        transcription = result;
      } else if (result && typeof result === "object") {
        // Handle different output formats
        if (result.text) {
          transcription = result.text;
        } else if (result.transcription) {
          transcription = result.transcription;
        } else if (Array.isArray(result.segments)) {
          transcription = result.segments.map((seg: any) => {
            if (seg.speaker) {
              return `[${seg.speaker}] ${seg.text}`;
            }
            return seg.text;
          }).join("\n");
        } else if (Array.isArray(result)) {
          transcription = result.map((item: any) => item.text || item).join("\n");
        } else {
          transcription = JSON.stringify(result, null, 2);
        }
      }

      console.log(`[TRANSCRIBE] Complete! Length: ${transcription.length} characters`);
      res.json({ success: true, transcription });
    } catch (error: any) {
      console.error("[TRANSCRIBE] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/music/tts - Text to Speech
router.post(
  "/tts",
  upload.fields([
    { name: "speaker_wav", maxCount: 1 },
    { name: "reference_audio", maxCount: 1 },
  ]),
  async (req: Request, res: Response) => {
    try {
      const model = req.body.model as string;
      const text = req.body.text as string;

      if (!model || !text) {
        return res.status(400).json({ success: false, error: "Model and text are required" });
      }

      console.log(`\n${"=".repeat(60)}`);
      console.log(`[TTS] Request for model: ${model}`);
      console.log(`[TTS] Text length: ${text.length} characters`);

      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      let input: Record<string, unknown> = {};

      // Build input based on model
      switch (model) {
        case "lucataco/xtts-v2": {
          input = {
            text: text,
            language: req.body.language || "en",
            speaker: files?.speaker_wav?.[0] 
              ? bufferToDataUrl(files.speaker_wav[0].buffer, files.speaker_wav[0].mimetype)
              : undefined,
          };
          if (req.body.speed) {
            input.speed = parseFloat(req.body.speed);
          }
          break;
        }

        case "suno-ai/bark": {
          input = {
            prompt: text,
            history_prompt: req.body.voice_preset || "v2/en_speaker_0",
          };
          if (req.body.text_temp) {
            input.text_temp = parseFloat(req.body.text_temp);
          }
          if (req.body.waveform_temp) {
            input.waveform_temp = parseFloat(req.body.waveform_temp);
          }
          break;
        }

        case "afiaka87/tortoise-tts": {
          input = {
            text: text,
            voice: req.body.voice || "random",
            preset: req.body.preset || "fast",
          };
          if (req.body.seed) {
            input.seed = parseInt(req.body.seed);
          }
          break;
        }

        case "jbilcke-hf/parler-tts-mini-v1": {
          input = {
            prompt: text,
            description: req.body.description || "A female speaker with a clear and pleasant voice",
          };
          break;
        }

        case "cjwbw/seamless_communication": {
          input = {
            text_input: text,
            task_name: "T2ST (Text to Speech)",
            input_text_language: req.body.language || "English",
            target_language: req.body.target_language || "English",
            speaker_id: parseInt(req.body.speaker_id) || 0,
          };
          break;
        }

        case "lucataco/orpheus-3b-0.1-ft": {
          input = {
            prompt: text,
            voice: req.body.voice || "tara",
          };
          if (req.body.emotion) {
            input.emotion = req.body.emotion;
          }
          if (req.body.speed) {
            input.speed = parseFloat(req.body.speed);
          }
          break;
        }

        case "myshell-ai/openvoice": {
          input = {
            text: text,
            language: req.body.language || "EN",
            speed: parseFloat(req.body.speed) || 1.0,
          };
          if (files?.reference_audio?.[0]) {
            input.audio = bufferToDataUrl(
              files.reference_audio[0].buffer,
              files.reference_audio[0].mimetype
            );
          }
          break;
        }

        case "elevenlabs/speech-synthesis": {
          input = {
            text: text,
            voice_id: req.body.voice_id || "21m00Tcm4TlvDq8ikWAM",
            model_id: "eleven_monolingual_v1",
          };
          if (req.body.stability) {
            input.stability = parseFloat(req.body.stability);
          }
          if (req.body.similarity_boost) {
            input.similarity_boost = parseFloat(req.body.similarity_boost);
          }
          break;
        }

        default:
          return res.status(400).json({ success: false, error: `Unknown TTS model: ${model}` });
      }

      console.log("[TTS] Input:", JSON.stringify(input, null, 2).substring(0, 500));

      const result = await runReplicateModel(model, input);

      if (!result) {
        throw new Error("TTS generation failed - no result returned");
      }

      // Handle different result formats
      let audioUrl = result;
      if (typeof result === "object") {
        audioUrl = (result as any).audio_out || (result as any).audio || (result as any).output || result;
      }
      if (Array.isArray(audioUrl)) {
        audioUrl = audioUrl[0];
      }

      console.log(`[TTS] Complete! Audio URL: ${String(audioUrl).substring(0, 100)}...`);
      res.json({ success: true, audioUrl });
    } catch (error: any) {
      console.error("[TTS] Error:", error.message);
      res.status(500).json({ success: false, error: error.message });
    }
  }
);

// POST /api/music/sheet-ocr - Process multiple sheet music images/PDFs to notation
router.post(
  "/sheet-ocr",
  upload.array("images", 20), // Allow up to 20 pages (images or PDFs)
  async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      
      if (!files || files.length === 0) {
        return res.status(400).json({ success: false, error: "At least one file is required" });
      }

      // Check total file size (limit to 20MB total for Gemini)
      const totalSize = files.reduce((sum, f) => sum + f.size, 0);
      const maxSize = 20 * 1024 * 1024; // 20MB
      if (totalSize > maxSize) {
        return res.status(400).json({ 
          success: false, 
          error: `Total file size (${(totalSize / 1024 / 1024).toFixed(1)}MB) exceeds limit of 20MB. Please use smaller or fewer files.` 
        });
      }

      // Count file types
      const pdfCount = files.filter(f => f.mimetype === "application/pdf").length;
      const imageCount = files.length - pdfCount;

      console.log(`\n${"=".repeat(60)}`);
      console.log(`[SHEET-OCR] Processing ${files.length} file(s): ${imageCount} image(s), ${pdfCount} PDF(s)`);
      console.log(`[SHEET-OCR] Total size: ${(totalSize / 1024 / 1024).toFixed(2)}MB`);

      // Check API key
      if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not configured");
      }

      // Use Gemini to analyze the sheet music
      const { GoogleGenerativeAI } = await import("@google/generative-ai");
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      // Build image parts for all files
      const imageParts = files.map((file, index) => ({
        inlineData: {
          mimeType: file.mimetype,
          data: file.buffer.toString("base64"),
        },
      }));

      const fileDescription = pdfCount > 0 
        ? `${files.length} file(s) (${imageCount} image(s), ${pdfCount} PDF(s))`
        : `${files.length} image(s)`;

      const prompt = `You are analyzing ${fileDescription} of sheet music that form a complete musical piece.
The files are in order from page 1 to page ${files.length}. PDF files may contain multiple pages - analyze all pages within each PDF.

Please analyze ALL pages together as a single continuous piece of music and extract:

1. **Key Signature**: (e.g., C major, G minor) - note any key changes
2. **Time Signature**: (e.g., 4/4, 3/4, 6/8) - note any time signature changes
3. **Tempo/BPM**: If indicated anywhere
4. **Structure**: Describe the song structure (intro, verse, chorus, bridge, etc.) across all pages
5. **Chords Progression**: List the full chord progression in order as it appears
6. **Melody**: Describe the main melody themes and how they develop
7. **ABC Notation**: If possible, provide the complete melody in ABC notation format
8. **Musical Description**: Overall description of the piece's character, style, and dynamics

IMPORTANT: Treat all files as ONE continuous piece. The musical content flows from one page/file to the next.

Format the output as a comprehensive reference that an AI music model can use to recreate or be inspired by this piece.
If any file is not sheet music, note which one and describe what you see instead.`;

      console.log(`[SHEET-OCR] Sending to Gemini API...`);
      
      const result = await model.generateContent([
        prompt,
        ...imageParts,
      ]);

      const response = result.response;
      const notation = response.text();

      if (notation.includes("NOT_SHEET_MUSIC") && files.length === 1) {
        return res.status(400).json({ 
          success: false, 
          error: "The uploaded image does not appear to be sheet music" 
        });
      }

      console.log(`[SHEET-OCR] Successfully analyzed ${files.length} page(s)`);
      console.log(`[SHEET-OCR] Combined notation length: ${notation.length} characters`);

      res.json({ success: true, notation, pageCount: files.length });
    } catch (error: any) {
      console.error("[SHEET-OCR] Error:", error.message);
      
      // Provide more helpful error messages
      let userMessage = error.message;
      if (error.message.includes("fetch failed")) {
        userMessage = "Network error connecting to AI service. Please check your internet connection and try again.";
      } else if (error.message.includes("API key")) {
        userMessage = "AI service configuration error. Please contact support.";
      } else if (error.message.includes("quota") || error.message.includes("rate")) {
        userMessage = "AI service is temporarily busy. Please try again in a moment.";
      } else if (error.message.includes("too large") || error.message.includes("size")) {
        userMessage = "Files are too large. Please use smaller images or fewer files.";
      }
      
      res.status(500).json({ success: false, error: userMessage });
    }
  }
);

export default router;
