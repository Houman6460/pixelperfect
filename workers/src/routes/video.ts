import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const videoRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Model configurations with Replicate versions
const VIDEO_MODELS: Record<string, { 
  version: string; 
  tokenCost: number; 
  provider: string;
  supportsImage?: boolean;
  supportsVideo?: boolean;
}> = {
  'google/veo-3.1-fast': { 
    version: 'placeholder-veo-3.1-fast', 
    tokenCost: 20, 
    provider: 'google' 
  },
  'google/veo-3.1': { 
    version: 'placeholder-veo-3.1', 
    tokenCost: 30, 
    provider: 'google' 
  },
  'openai/sora-2': { 
    version: 'placeholder-sora-2', 
    tokenCost: 50, 
    provider: 'openai' 
  },
  'kling/2.5-turbo-pro': { 
    version: 'placeholder-kling-2.5', 
    tokenCost: 25, 
    provider: 'kling' 
  },
  'pixverse/v5': { 
    version: 'placeholder-pixverse-v5', 
    tokenCost: 15, 
    provider: 'pixverse' 
  },
  'wan/2.5-t2v': { 
    version: 'luma/ray', // Using Luma as placeholder
    tokenCost: 10, 
    provider: 'alibaba' 
  },
  'wan/2.5-t2v-fast': { 
    version: 'luma/ray', 
    tokenCost: 8, 
    provider: 'alibaba' 
  },
  'seedance/1-pro-fast': { 
    version: 'placeholder-seedance', 
    tokenCost: 12, 
    provider: 'bytedance' 
  },
  'minimax/hailuo-2.3': { 
    version: 'minimax/video-01', 
    tokenCost: 18, 
    provider: 'minimax' 
  },
  'minimax/hailuo-2.3-fast': { 
    version: 'minimax/video-01', 
    tokenCost: 12, 
    provider: 'minimax' 
  },
  // Image to Video models
  'wan-video/wan-2.5-i2v': {
    version: 'alibaba-pai/wan2.1-i2v-14b:placeholder',
    tokenCost: 10,
    provider: 'alibaba',
    supportsImage: true
  },
  'wan-video/wan-2.5-i2v-fast': {
    version: 'alibaba-pai/wan2.1-i2v-14b:placeholder',
    tokenCost: 8,
    provider: 'alibaba',
    supportsImage: true
  },
  'kling/2.5-i2v-pro': {
    version: 'placeholder-kling-i2v',
    tokenCost: 20,
    provider: 'kling',
    supportsImage: true
  },
  'stable-video/svd': {
    version: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
    tokenCost: 10,
    provider: 'stability',
    supportsImage: true
  },
  'animatediff/lightning': {
    version: 'lucataco/animate-diff:beecf59c4aee8d81bf04f0381033dfa10dc16e845b4ae00d281e2fa377e48a9f',
    tokenCost: 8,
    provider: 'bytedance',
    supportsImage: true
  },
  'i2vgen-xl': {
    version: 'ali-vilab/i2vgen-xl:5821a338d00033abaaba89080a17eb8783d9a17ed710a6b4246a18e0900ccad4',
    tokenCost: 12,
    provider: 'alibaba',
    supportsImage: true
  },
  'runway/gen3-turbo': {
    version: 'placeholder-runway-gen3',
    tokenCost: 25,
    provider: 'runway',
    supportsImage: true
  },
  // Video to Video models
  'chenxwh/video-to-video': {
    version: 'chenxwh/video-to-video:placeholder',
    tokenCost: 15,
    provider: 'replicate',
    supportsVideo: true
  },
  'deforum/deforum': {
    version: 'deforum-art/deforum-stable-diffusion:e22e77495f2fb83c34d5fae2ad8ab63c0a87b6b573b6208e1535b23b89ea66d6',
    tokenCost: 18,
    provider: 'community',
    supportsVideo: true
  },
  // Video Enhancement models
  'video-upscale/realesrgan': {
    version: 'nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b',
    tokenCost: 12,
    provider: 'replicate',
    supportsVideo: true
  },
  'video-interpolation/film': {
    version: 'google-research/frame-interpolation:4f88a16a13673a8b589c18866e540556170a5bcb2ccdc12de556e800e9456d3d',
    tokenCost: 10,
    provider: 'google',
    supportsVideo: true
  },
  'topaz/video-enhance': {
    version: 'placeholder-topaz',
    tokenCost: 20,
    provider: 'topaz',
    supportsVideo: true
  },
  'video-background-removal': {
    version: 'arielreplicate/robust_video_matting:73d2128a371922d5d1abf0712a1d974be0e4e2358cc1218e4e34714767232bac',
    tokenCost: 15,
    provider: 'replicate',
    supportsVideo: true
  },
};

// Helper: Get token cost
async function getTokenCost(db: D1Database, model: string): Promise<number> {
  const modelConfig = VIDEO_MODELS[model];
  if (modelConfig) return modelConfig.tokenCost;
  
  const rule = await db.prepare(
    'SELECT tokens_cost FROM token_rules WHERE operation = ? AND is_active = 1'
  ).bind('video_generation').first<{ tokens_cost: number }>();
  
  return rule?.tokens_cost || 20;
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

// Generate video
videoRoutes.post('/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const contentType = c.req.header('content-type') || '';
    
    let model = 'minimax/hailuo-2.3-fast';
    let prompt = '';
    let negativePrompt = '';
    let duration = 5;
    let aspectRatio = '16:9';
    let imageFile: File | null = null;
    let videoFile: File | null = null;
    
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      model = formData.get('model') as string || model;
      prompt = formData.get('prompt') as string || '';
      negativePrompt = formData.get('negativePrompt') as string || '';
      duration = parseInt(formData.get('duration') as string) || 5;
      aspectRatio = formData.get('aspectRatio') as string || '16:9';
      imageFile = formData.get('image') as File | null;
      videoFile = formData.get('video') as File | null;
    } else {
      const body = await c.req.json();
      model = body.model || model;
      prompt = body.prompt || '';
      negativePrompt = body.negativePrompt || '';
      duration = body.duration || 5;
      aspectRatio = body.aspectRatio || '16:9';
    }
    
    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }
    
    // Check token balance
    const tokenCost = await getTokenCost(c.env.DB, model);
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens',
        tokensRequired: tokenCost,
        tokensAvailable: user.tokens 
      }, 402);
    }
    
    // Create job record
    const jobId = `job_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'video', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ prompt, negativePrompt, duration, aspectRatio }), 
      VIDEO_MODELS[model]?.provider || 'unknown', model).run();
    
    if (!c.env.REPLICATE_API_KEY) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Video service not configured');
      return c.json({ success: false, error: 'Video generation service not configured' }, 500);
    }
    
    const modelConfig = VIDEO_MODELS[model];
    if (!modelConfig || modelConfig.version.startsWith('placeholder')) {
      // Return a placeholder response for models not yet integrated
      await updateJobStatus(c.env.DB, jobId, 'pending', null, 'Model coming soon');
      return c.json({
        success: true,
        jobId,
        status: 'pending',
        message: `${model} is coming soon. Your request has been queued.`,
        tokensReserved: tokenCost,
      });
    }
    
    // Call Replicate for supported models
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: modelConfig.version,
        input: {
          prompt: prompt,
          negative_prompt: negativePrompt,
          num_frames: Math.min(duration * 24, 120), // Approximate frames
          width: aspectRatio === '16:9' ? 1024 : aspectRatio === '9:16' ? 576 : 768,
          height: aspectRatio === '16:9' ? 576 : aspectRatio === '9:16' ? 1024 : 768,
        },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Replicate API error:', errorData);
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Video generation failed');
      return c.json({ success: false, error: 'Video generation failed' }, 500);
    }
    
    const prediction = await response.json() as { id: string; urls: { get: string } };
    
    // Store prediction info for polling
    await updateJobStatus(c.env.DB, jobId, 'processing', { 
      replicateId: prediction.id, 
      pollUrl: prediction.urls.get 
    }, null);
    
    // Deduct tokens
    await deductTokens(c.env.DB, user.id, tokenCost, 'video_generation', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: 'Video generation started',
      estimatedTime: duration * 10, // Rough estimate in seconds
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Video generation error:', error);
    return c.json({ success: false, error: 'Failed to generate video' }, 500);
  }
});

// Get job status
videoRoutes.get('/status/:jobId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const jobId = c.req.param('jobId');
    
    const job = await c.env.DB.prepare(`
      SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?
    `).bind(jobId, user.id).first();
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    // If still processing, check Replicate
    if (job.status === 'processing' && job.output_data) {
      const outputData = JSON.parse(job.output_data as string);
      if (outputData.pollUrl && c.env.REPLICATE_API_KEY) {
        const statusResponse = await fetch(outputData.pollUrl, {
          headers: { 'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}` },
        });
        const result = await statusResponse.json() as { 
          status: string; 
          output?: string | string[];
          error?: string;
        };
        
        if (result.status === 'succeeded' && result.output) {
          const videoUrl = Array.isArray(result.output) ? result.output[0] : result.output;
          await updateJobStatus(c.env.DB, jobId, 'completed', { videoUrl }, null);
          
          return c.json({
            success: true,
            status: 'completed',
            videoUrl,
          });
        } else if (result.status === 'failed') {
          await updateJobStatus(c.env.DB, jobId, 'failed', null, result.error || 'Generation failed');
          return c.json({
            success: false,
            status: 'failed',
            error: result.error || 'Generation failed',
          });
        }
      }
    }
    
    return c.json({
      success: true,
      status: job.status,
      ...(job.output_data ? { output: JSON.parse(job.output_data as string) } : {}),
      ...(job.error_message ? { error: job.error_message } : {}),
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ success: false, error: 'Failed to check status' }, 500);
  }
});

// List available models
videoRoutes.get('/models', async (c) => {
  const models = Object.entries(VIDEO_MODELS).map(([id, config]) => ({
    id,
    provider: config.provider,
    tokenCost: config.tokenCost,
    available: !config.version.startsWith('placeholder'),
    supportsImage: config.supportsImage || false,
    supportsVideo: config.supportsVideo || false,
  }));
  
  return c.json({ success: true, models });
});

// Helper: Update job status
async function updateJobStatus(
  db: D1Database,
  jobId: string,
  status: string,
  outputData: any,
  errorMessage: string | null
) {
  await db.prepare(`
    UPDATE generation_jobs 
    SET status = ?, output_data = ?, error_message = ?, 
        completed_at = CASE WHEN ? IN ('completed', 'failed') THEN datetime('now') ELSE NULL END
    WHERE id = ?
  `).bind(status, outputData ? JSON.stringify(outputData) : null, errorMessage, status, jobId).run();
}
