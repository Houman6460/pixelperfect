import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const musicRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Music Model configurations
const MUSIC_MODELS: Record<string, { 
  tokenCost: number; 
  provider: string;
  maxDuration: number;
  type?: 'vocals' | 'instrumental' | 'both';
}> = {
  // With Vocals models
  'minimax-music-1.5': { tokenCost: 15, provider: 'minimax', maxDuration: 240, type: 'vocals' },
  'minimax-music-01': { tokenCost: 12, provider: 'minimax', maxDuration: 180, type: 'vocals' },
  'google-lyria-2': { tokenCost: 20, provider: 'google', maxDuration: 120, type: 'vocals' },
  'ace-step': { tokenCost: 10, provider: 'ace', maxDuration: 300, type: 'vocals' },
  'suno-v4': { tokenCost: 25, provider: 'suno', maxDuration: 240, type: 'vocals' },
  
  // Instrumental models
  'meta-musicgen': { tokenCost: 8, provider: 'meta', maxDuration: 30, type: 'instrumental' },
  'stable-audio-2.5': { tokenCost: 12, provider: 'stability', maxDuration: 180, type: 'instrumental' },
  'musicgen-stereo-chord': { tokenCost: 10, provider: 'meta', maxDuration: 30, type: 'instrumental' },
  'musicgen-looper': { tokenCost: 8, provider: 'meta', maxDuration: 30, type: 'instrumental' },
  'musicgen-remixer': { tokenCost: 10, provider: 'meta', maxDuration: 30, type: 'instrumental' },
  'riffusion': { tokenCost: 6, provider: 'riffusion', maxDuration: 30, type: 'instrumental' },
};

// Helper: Get token cost
async function getTokenCost(db: D1Database, model: string): Promise<number> {
  const modelConfig = MUSIC_MODELS[model];
  if (modelConfig) return modelConfig.tokenCost;
  
  const rule = await db.prepare(
    'SELECT tokens_cost FROM token_rules WHERE operation = ? AND is_active = 1'
  ).bind('music_generation').first<{ tokens_cost: number }>();
  
  return rule?.tokens_cost || 15;
}

// Helper: Deduct tokens
async function deductTokens(db: D1Database, userId: string, amount: number, operation: string, jobId: string) {
  await db.prepare(
    'UPDATE users SET tokens = tokens - ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(amount, userId).run();
  
  await db.prepare(`
    INSERT INTO token_usage_log (id, user_id, operation, tokens_used, job_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(`log_${nanoid(16)}`, userId, operation, amount, jobId).run();
}

// Generate music
musicRoutes.post('/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const contentType = c.req.header('content-type') || '';
    
    let model = 'minimax-music-1.5';
    let prompt = '';
    let style = '';
    let duration = 30;
    let vocals = true;
    let lyrics = '';
    let referenceAudio: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      model = formData.get('model') as string || model;
      prompt = formData.get('prompt') as string || '';
      style = formData.get('style') as string || '';
      duration = parseInt(formData.get('duration') as string) || 30;
      vocals = formData.get('vocals') !== 'false';
      lyrics = formData.get('lyrics') as string || '';
      referenceAudio = formData.get('referenceAudio') as File | null;
    } else {
      const body = await c.req.json();
      model = body.model || model;
      prompt = body.prompt || '';
      style = body.style || '';
      duration = body.duration || 30;
      vocals = body.vocals !== false;
      lyrics = body.lyrics || '';
    }
    
    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }
    
    const tokenCost = await getTokenCost(c.env.DB, model);
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens',
        tokensRequired: tokenCost,
        tokensAvailable: user.tokens 
      }, 402);
    }
    
    const jobId = `music_${nanoid(16)}`;
    
    // Store job in database
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'music', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ prompt, style, duration, vocals, lyrics }), 
      MUSIC_MODELS[model]?.provider || 'unknown', model).run();
    
    // For now, return a pending status (actual generation would need API integration)
    await deductTokens(c.env.DB, user.id, tokenCost, 'music_generation', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: `Music generation started with ${model}`,
      estimatedTime: duration * 2,
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Music generation error:', error);
    return c.json({ success: false, error: 'Failed to generate music' }, 500);
  }
});

// TTS Model configurations
const TTS_MODELS: Record<string, { 
  tokenCost: number; 
  provider: string; 
  supportsVoiceCloning: boolean;
  languages: number;
}> = {
  'xtts-v2': { tokenCost: 5, provider: 'coqui', supportsVoiceCloning: true, languages: 17 },
  'suno-bark': { tokenCost: 6, provider: 'suno', supportsVoiceCloning: false, languages: 13 },
  'tortoise-tts': { tokenCost: 8, provider: 'tortoise', supportsVoiceCloning: true, languages: 1 },
  'parler-tts': { tokenCost: 4, provider: 'parler', supportsVoiceCloning: false, languages: 1 },
  'seamless-m4t': { tokenCost: 5, provider: 'meta', supportsVoiceCloning: false, languages: 100 },
  'orpheus-tts': { tokenCost: 6, provider: 'orpheus', supportsVoiceCloning: true, languages: 1 },
  'openvoice': { tokenCost: 7, provider: 'openvoice', supportsVoiceCloning: true, languages: 5 },
  'elevenlabs-style': { tokenCost: 10, provider: 'elevenlabs', supportsVoiceCloning: true, languages: 29 },
};

// Text-to-Speech
musicRoutes.post('/tts', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const text = formData.get('text') as string;
    const model = formData.get('model') as string || 'xtts-v2';
    const language = formData.get('language') as string || 'en';
    const speed = parseFloat(formData.get('speed') as string) || 1.0;
    const pitch = parseFloat(formData.get('pitch') as string) || 1.0;
    const emotion = formData.get('emotion') as string || 'neutral';
    const referenceVoice = formData.get('referenceVoice') as unknown as File | null;
    
    if (!text) {
      return c.json({ success: false, error: 'Text is required' }, 400);
    }
    
    const modelConfig = TTS_MODELS[model] || TTS_MODELS['xtts-v2'];
    const tokenCost = modelConfig.tokenCost;
    
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens', tokensRequired: tokenCost }, 402);
    }
    
    const jobId = `tts_${nanoid(16)}`;
    let referenceVoiceKey: string | null = null;
    
    // Store reference voice in R2 if provided
    if (referenceVoice && modelConfig.supportsVoiceCloning) {
      referenceVoiceKey = `tts/${user.id}/${jobId}/reference.wav`;
      const voiceBuffer = await referenceVoice.arrayBuffer();
      await c.env.MEDIA_BUCKET.put(referenceVoiceKey, voiceBuffer, {
        httpMetadata: { contentType: referenceVoice.type || 'audio/wav' },
      });
    }
    
    // Create job
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'tts', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      text, language, speed, pitch, emotion, referenceVoiceKey 
    }), modelConfig.provider, model).run();
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'tts', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: `TTS generation started with ${model}`,
      model,
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('TTS error:', error);
    return c.json({ success: false, error: 'Failed to generate speech' }, 500);
  }
});

// Get available TTS models
musicRoutes.get('/tts/models', async (c) => {
  const models = Object.entries(TTS_MODELS).map(([id, config]) => ({
    id,
    ...config,
  }));
  return c.json({ success: true, models });
});

// Transcription model configurations
const TRANSCRIPTION_MODELS: Record<string, { tokenCost: number; provider: string }> = {
  'openai-whisper': { tokenCost: 5, provider: 'openai' },
  'incredibly-fast-whisper': { tokenCost: 3, provider: 'replicate' },
  'whisper-diarization': { tokenCost: 8, provider: 'replicate' },
  'whisperx': { tokenCost: 6, provider: 'replicate' },
  'whisper-video': { tokenCost: 7, provider: 'replicate' },
};

// Transcribe audio
musicRoutes.post('/transcribe', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const audio = formData.get('audio') as unknown as File;
    const model = formData.get('model') as string || 'openai-whisper';
    const language = formData.get('language') as string || 'auto';
    const modelSize = formData.get('modelSize') as string || 'large-v3';
    const translateToEnglish = formData.get('translate') === 'true';
    
    if (!audio) {
      return c.json({ success: false, error: 'Audio file is required' }, 400);
    }
    
    const modelConfig = TRANSCRIPTION_MODELS[model] || TRANSCRIPTION_MODELS['openai-whisper'];
    const tokenCost = modelConfig.tokenCost;
    
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens', tokensRequired: tokenCost }, 402);
    }
    
    const jobId = `transcribe_${nanoid(16)}`;
    
    // Store audio in R2
    const audioKey = `transcriptions/${user.id}/${jobId}/input${getExtension(audio.name)}`;
    const audioBuffer = await audio.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(audioKey, audioBuffer, {
      httpMetadata: { contentType: audio.type || 'audio/wav' },
    });
    
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'transcription', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      language, modelSize, translateToEnglish, audioKey, filename: audio.name 
    }), modelConfig.provider, model).run();
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'transcription', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: `Transcription started with ${model}`,
      model,
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return c.json({ success: false, error: 'Failed to transcribe' }, 500);
  }
});

// Helper to get file extension
function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '.wav';
}

// Sheet music OCR
musicRoutes.post('/sheet-ocr', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const image = formData.get('image') as unknown as File;
    
    if (!image) {
      return c.json({ success: false, error: 'Image is required' }, 400);
    }
    
    const tokenCost = 4;
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'sheet_ocr', `ocr_${nanoid(8)}`);
    
    // Placeholder response
    return c.json({
      success: true,
      result: {
        notes: [],
        tempo: 120,
        timeSignature: '4/4',
        keySignature: 'C',
      },
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('Sheet OCR error:', error);
    return c.json({ success: false, error: 'Failed to process sheet music' }, 500);
  }
});

// Get job status
musicRoutes.get('/status/:jobId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const jobId = c.req.param('jobId');
    
    const job = await c.env.DB.prepare(`
      SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?
    `).bind(jobId, user.id).first();
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    return c.json({
      success: true,
      status: job.status,
      result: job.output_data ? JSON.parse(job.output_data as string) : null,
      error: job.error_message,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ success: false, error: 'Failed to check status' }, 500);
  }
});

// ========== VOICE CLONE ROUTES ==========

// Voice clone with RVC
musicRoutes.post('/voice-clone', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const audio = formData.get('audio') as unknown as File;
    const modelUrl = formData.get('modelUrl') as string;
    const pitchChange = parseInt(formData.get('pitchChange') as string) || 0;
    const indexRate = parseFloat(formData.get('indexRate') as string) || 0.75;
    const filterRadius = parseInt(formData.get('filterRadius') as string) || 3;
    
    if (!audio) {
      return c.json({ success: false, error: 'Audio file is required' }, 400);
    }
    
    const tokenCost = 15;
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    const jobId = `rvc_${nanoid(16)}`;
    
    // Store original audio in R2
    const audioKey = `voice-clone/${user.id}/${jobId}/input.wav`;
    const audioBuffer = await audio.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(audioKey, audioBuffer, {
      httpMetadata: { contentType: audio.type || 'audio/wav' },
    });
    
    // Create job
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, created_at)
      VALUES (?, ?, 'voice_clone', 'processing', ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      modelUrl, pitchChange, indexRate, filterRadius, audioKey 
    })).run();
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'voice_clone', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Voice cloning started',
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('Voice clone error:', error);
    return c.json({ success: false, error: 'Failed to clone voice' }, 500);
  }
});

// Train RVC model
musicRoutes.post('/train-rvc', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const trainingAudio = formData.get('trainingAudio') as unknown as File;
    const modelName = formData.get('modelName') as string || 'custom-model';
    const epochs = parseInt(formData.get('epochs') as string) || 100;
    
    if (!trainingAudio) {
      return c.json({ success: false, error: 'Training audio is required' }, 400);
    }
    
    const tokenCost = 50; // Training is expensive
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    const jobId = `train_${nanoid(16)}`;
    
    // Store training audio in R2
    const audioKey = `rvc-training/${user.id}/${jobId}/training.wav`;
    const audioBuffer = await trainingAudio.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(audioKey, audioBuffer, {
      httpMetadata: { contentType: trainingAudio.type || 'audio/wav' },
    });
    
    // Create job
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, created_at)
      VALUES (?, ?, 'rvc_training', 'queued', ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      modelName, epochs, audioKey 
    })).run();
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'rvc_training', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'queued',
      message: `RVC model training queued. This may take several hours.`,
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('RVC training error:', error);
    return c.json({ success: false, error: 'Failed to start training' }, 500);
  }
});

// Get user's RVC models
musicRoutes.get('/rvc-models', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const models = await c.env.DB.prepare(`
      SELECT * FROM generation_jobs 
      WHERE user_id = ? AND type = 'rvc_training' AND status = 'completed'
      ORDER BY created_at DESC
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      models: models.results || [],
    });
  } catch (error) {
    console.error('Get RVC models error:', error);
    return c.json({ success: false, error: 'Failed to get models' }, 500);
  }
});

// ========== SUNO-SPECIFIC ROUTES ==========

export const sunoRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Upload audio for Suno
sunoRoutes.post('/upload-audio', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const audio = formData.get('audio') as unknown as File;
    
    if (!audio) {
      return c.json({ success: false, error: 'Audio file is required' }, 400);
    }
    
    // Store in R2
    const fileId = `audio_${nanoid(16)}`;
    const key = `suno/${user.id}/${fileId}`;
    
    const arrayBuffer = await audio.arrayBuffer();
    await c.env.MEDIA_BUCKET.put(key, arrayBuffer, {
      httpMetadata: { contentType: audio.type },
    });
    
    return c.json({
      success: true,
      fileId,
      url: `/api/media/${key}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return c.json({ success: false, error: 'Failed to upload audio' }, 500);
  }
});

// Upload recording
sunoRoutes.post('/upload-recording', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    
    const { audioData, format } = body;
    
    if (!audioData) {
      return c.json({ success: false, error: 'Audio data is required' }, 400);
    }
    
    // Store base64 audio in R2
    const fileId = `rec_${nanoid(16)}`;
    const key = `recordings/${user.id}/${fileId}.${format || 'webm'}`;
    
    // Decode base64 if needed
    const buffer = audioData.startsWith('data:') 
      ? Uint8Array.from(atob(audioData.split(',')[1]), c => c.charCodeAt(0))
      : Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
    
    await c.env.MEDIA_BUCKET.put(key, buffer, {
      httpMetadata: { contentType: `audio/${format || 'webm'}` },
    });
    
    return c.json({
      success: true,
      fileId,
      url: `/api/media/${key}`,
    });
  } catch (error) {
    console.error('Recording upload error:', error);
    return c.json({ success: false, error: 'Failed to upload recording' }, 500);
  }
});

// Generate lyrics
sunoRoutes.post('/lyrics/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { theme, style, mood, language } = await c.req.json();
    
    const tokenCost = 3;
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    // Would use GPT to generate lyrics
    const prompt = `Generate song lyrics about ${theme || 'love'} in ${style || 'pop'} style with ${mood || 'upbeat'} mood`;
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'lyrics_generation', `lyrics_${nanoid(8)}`);
    
    return c.json({
      success: true,
      lyrics: `[Verse 1]\nPlaceholder lyrics about ${theme || 'life'}\n\n[Chorus]\nPlaceholder chorus\n\n[Verse 2]\nMore placeholder lyrics`,
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('Lyrics generation error:', error);
    return c.json({ success: false, error: 'Failed to generate lyrics' }, 500);
  }
});

// Boost style prompt
sunoRoutes.post('/boost-style', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { style, genre, mood } = await c.req.json();
    
    const tokenCost = 2;
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'style_boost', `boost_${nanoid(8)}`);
    
    // Enhanced style suggestion
    const enhanced = `${style || 'modern'} ${genre || 'pop'} with ${mood || 'energetic'} vibes, professional production, radio-ready mix`;
    
    return c.json({
      success: true,
      enhanced,
      tokensUsed: tokenCost,
    });
  } catch (error) {
    console.error('Style boost error:', error);
    return c.json({ success: false, error: 'Failed to boost style' }, 500);
  }
});

// Get credits (placeholder)
sunoRoutes.get('/credits', authMiddleware(), async (c) => {
  const user = c.get('user') as User;
  
  return c.json({
    success: true,
    credits: user.tokens,
    subscription: 'free',
  });
});

// ========== MUSIC GALLERY ROUTES ==========

export const musicGalleryRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Get user's music tracks
musicGalleryRoutes.get('/tracks', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    // Get from gallery items with type 'audio'
    const tracks = await c.env.DB.prepare(`
      SELECT * FROM gallery_items 
      WHERE user_id = ? AND (metadata LIKE '%"type":"audio"%' OR metadata LIKE '%"type":"music"%')
      ORDER BY created_at DESC
      LIMIT 100
    `).bind(user.id).all();
    
    return c.json({
      success: true,
      tracks: tracks.results || [],
    });
  } catch (error) {
    console.error('Get tracks error:', error);
    return c.json({ success: false, error: 'Failed to get tracks' }, 500);
  }
});

// Save Suno track
musicGalleryRoutes.post('/tracks/save-suno', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { audioUrl, title, prompt, style, duration, model } = await c.req.json();
    
    if (!audioUrl || !title) {
      return c.json({ success: false, error: 'Audio URL and title are required' }, 400);
    }
    
    const trackId = `track_${nanoid(16)}`;
    
    await c.env.DB.prepare(`
      INSERT INTO gallery_items (id, user_id, filename, original_name, url, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).bind(
      trackId,
      user.id,
      `${title}.mp3`,
      title,
      audioUrl,
      JSON.stringify({ type: 'music', prompt, style, duration, model })
    ).run();
    
    return c.json({
      success: true,
      track: {
        id: trackId,
        title,
        url: audioUrl,
      },
    });
  } catch (error) {
    console.error('Save track error:', error);
    return c.json({ success: false, error: 'Failed to save track' }, 500);
  }
});

// Delete track
musicGalleryRoutes.delete('/tracks/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const trackId = c.req.param('id');
    
    await c.env.DB.prepare(
      'DELETE FROM gallery_items WHERE id = ? AND user_id = ?'
    ).bind(trackId, user.id).run();
    
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete track error:', error);
    return c.json({ success: false, error: 'Failed to delete track' }, 500);
  }
});
