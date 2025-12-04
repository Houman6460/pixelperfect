import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { calculateSmartCost, logActualProviderCost, calculateDirectApiCost } from '../utils/costCalculator';
import { getApiKey } from '../services/apiKeyManager';

type Variables = {
  user: User;
  userId: string;
};

export const generateRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Direct POST to /api/generate (for frontend compatibility)
generateRoutes.post('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const contentType = c.req.header('content-type') || '';
    
    let prompt: string;
    let style = 'photo';
    let autoUpscale = false;
    let upscaleFactor = 2;
    let editMode = 'instruct';
    let referenceImages: Blob[] = [];
    
    // Handle both JSON and FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      prompt = formData.get('prompt') as string || '';
      style = formData.get('style') as string || 'photo';
      autoUpscale = formData.get('autoUpscale') === 'true';
      upscaleFactor = parseInt(formData.get('upscaleFactor') as string) || 2;
      editMode = formData.get('editMode') as string || 'instruct';
      // Get reference images if any
      const refs = formData.getAll('referenceImages') as unknown as (string | Blob)[];
      referenceImages = refs.filter((r): r is Blob => r !== null && typeof r === 'object' && 'size' in r);
    } else {
      const body = await c.req.json();
      prompt = body.prompt || '';
      style = body.style || 'photo';
      autoUpscale = body.autoUpscale || false;
      upscaleFactor = body.upscaleFactor || 2;
      editMode = body.editMode || 'instruct';
    }
    
    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }
    
    // Check token balance
    const tokenCost = await getTokenCost(c.env.DB, 'image_generation');
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens', tokensRequired: tokenCost, tokensAvailable: user.tokens }, 402);
    }
    
    // Create job record
    const jobId = `job_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'image', 'processing', ?, 'openai', 'dall-e-3', datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ prompt, style, autoUpscale, upscaleFactor })).run();
    
    // Get OpenAI API key from centralized manager
    const openaiKey = await getApiKey(c.env, 'openai');
    if (!openaiKey) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'OpenAI API key not configured');
      return c.json({ success: false, error: 'AI service not configured. Please add OpenAI API key in Admin > API Keys.' }, 500);
    }
    
    // Call OpenAI DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'dall-e-3',
        prompt: `${style === 'artistic' ? 'Artistic style: ' : style === 'anime' ? 'Anime style: ' : style === 'digital' ? 'Digital art style: ' : ''}${prompt}`,
        size: '1024x1024',
        quality: 'standard',
        n: 1,
        response_format: 'b64_json'
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Image generation failed');
      return c.json({ success: false, error: 'Image generation failed' }, 500);
    }
    
    const result = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };
    const imageData = result.data[0];
    
    if (!imageData?.b64_json) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'No image returned');
      return c.json({ success: false, error: 'No image generated' }, 500);
    }
    
    // Deduct tokens
    await deductTokens(c.env.DB, user.id, tokenCost, 'image_generation', jobId, {
      provider: 'openai',
      model: 'dall-e-3',
      cost: 0.04,
    });
    
    // Update job status
    await updateJobStatus(c.env.DB, jobId, 'completed', { prompt, style }, null);
    
    return c.json({
      success: true,
      imageBase64: imageData.b64_json,
      width: 1024,
      height: 1024,
      jobId,
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return c.json({ success: false, error: 'Failed to generate image' }, 500);
  }
});

// Generate image (explicit /image path)
generateRoutes.post('/image', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { prompt, model = 'dall-e-3', size = '1024x1024', quality = 'standard' } = await c.req.json();
    
    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }
    
    // Check token balance
    const tokenCost = await getTokenCost(c.env.DB, 'image_generation');
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    // Get OpenAI API key
    const openaiKey = await getApiKey(c.env, 'openai');
    if (!openaiKey) {
      return c.json({ success: false, error: 'OpenAI API not configured' }, 500);
    }
    
    // Create job record
    const jobId = `job_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'image', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ prompt, size, quality }), 'openai', model).run();
    
    // Call AI API (example with OpenAI)
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, prompt, size, quality, n: 1 }),
    });
    
    if (!response.ok) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'API request failed');
      return c.json({ success: false, error: 'Image generation failed' }, 500);
    }
    
    const result = await response.json() as { data: Array<{ url: string }> };
    const imageUrl = result.data[0]?.url;
    
    if (!imageUrl) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'No image returned');
      return c.json({ success: false, error: 'No image generated' }, 500);
    }
    
    // Download and store in R2
    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const fileKey = `${user.id}/image/${nanoid(16)}.png`;
    
    await c.env.MEDIA_BUCKET.put(fileKey, imageBuffer, {
      httpMetadata: { contentType: 'image/png' },
    });
    
    // Update job and deduct tokens with smart cost tracking
    await updateJobStatus(c.env.DB, jobId, 'completed', { fileKey, imageUrl }, null);
    
    // Calculate actual provider cost
    const costResult = await calculateSmartCost(c.env.DB, 'image_generation', model, {
      imageCount: 1,
    });
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'image_generation', jobId, {
      provider: costResult.provider,
      model: model,
      cost: costResult.cost,
    });
    
    // Log for analytics
    await logActualProviderCost(c.env.DB, {
      provider: costResult.provider,
      model: model,
      operation: 'image_generation',
      userId: user.id,
      jobId: jobId,
      actualCost: costResult.cost,
      mode: costResult.mode,
      breakdown: costResult.breakdown,
    });
    
    // Save to gallery
    const galleryId = `item_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO gallery_items (id, user_id, type, file_key, mime_type, prompt, model, created_at, updated_at)
      VALUES (?, ?, 'image', ?, 'image/png', ?, ?, datetime('now'), datetime('now'))
    `).bind(galleryId, user.id, fileKey, prompt, model).run();
    
    return c.json({
      success: true,
      data: {
        jobId,
        galleryId,
        url: `https://media.pixelperfect.ai/${fileKey}`,
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return c.json({ success: false, error: 'Failed to generate image' }, 500);
  }
});

// Generate text
generateRoutes.post('/text', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const { messages, model = 'gpt-4o', maxTokens = 1000 } = await c.req.json();
    
    if (!messages || !messages.length) {
      return c.json({ success: false, error: 'Messages are required' }, 400);
    }
    
    const tokenCost = await getTokenCost(c.env.DB, 'text_generation');
    if (user.tokens < tokenCost) {
      return c.json({ success: false, error: 'Insufficient tokens' }, 402);
    }
    
    // Get OpenAI API key
    const openaiKey = await getApiKey(c.env, 'openai');
    if (!openaiKey) {
      return c.json({ success: false, error: 'OpenAI API not configured' }, 500);
    }
    
    // Create job
    const jobId = `job_${nanoid(16)}`;
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, 'text', 'processing', ?, 'openai', ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ messages, maxTokens }), model).run();
    
    // Call OpenAI
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
    });
    
    if (!response.ok) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'API request failed');
      return c.json({ success: false, error: 'Text generation failed' }, 500);
    }
    
    const result = await response.json() as { 
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };
    const content = result.choices[0]?.message?.content;
    
    await updateJobStatus(c.env.DB, jobId, 'completed', { content }, null);
    
    // Calculate actual provider cost using token counts from API response
    const costResult = await calculateSmartCost(c.env.DB, 'text_generation', model, {
      inputTokens: result.usage?.prompt_tokens || 0,
      outputTokens: result.usage?.completion_tokens || 0,
    });
    
    await deductTokens(c.env.DB, user.id, tokenCost, 'text_generation', jobId, {
      provider: costResult.provider,
      model: model,
      cost: costResult.cost,
    });
    
    // Log for analytics
    await logActualProviderCost(c.env.DB, {
      provider: costResult.provider,
      model: model,
      operation: 'text_generation',
      userId: user.id,
      jobId: jobId,
      actualCost: costResult.cost,
      mode: costResult.mode,
      breakdown: costResult.breakdown,
    });
    
    return c.json({
      success: true,
      data: { jobId, content },
    });
  } catch (error) {
    console.error('Text generation error:', error);
    return c.json({ success: false, error: 'Failed to generate text' }, 500);
  }
});

// Get job status
generateRoutes.get('/job/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const jobId = c.req.param('id');
    
    const job = await c.env.DB.prepare(
      'SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?'
    ).bind(jobId, user.id).first();
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    return c.json({ success: true, data: job });
  } catch (error) {
    console.error('Get job error:', error);
    return c.json({ success: false, error: 'Failed to get job' }, 500);
  }
});

// Helper functions
async function getTokenCost(db: D1Database, operation: string): Promise<number> {
  const rule = await db.prepare(
    'SELECT tokens_cost FROM token_rules WHERE operation = ? AND is_active = 1'
  ).bind(operation).first<{ tokens_cost: number }>();
  return rule?.tokens_cost || 1;
}

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

async function deductTokens(
  db: D1Database,
  userId: string,
  amount: number,
  operation: string,
  jobId: string,
  providerInfo?: { provider: string; model: string; cost: number }
) {
  // Deduct tokens
  await db.prepare(
    'UPDATE users SET tokens = tokens - ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(amount, userId).run();
  
  // Log usage with provider cost
  await db.prepare(`
    INSERT INTO token_usage_log (id, user_id, operation, tokens_used, job_id, provider, model, provider_cost, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    `log_${nanoid(16)}`, 
    userId, 
    operation, 
    amount, 
    jobId,
    providerInfo?.provider || null,
    providerInfo?.model || null,
    providerInfo?.cost || 0
  ).run();
  
  // Log provider usage separately for cost analytics
  if (providerInfo) {
    await db.prepare(`
      INSERT INTO provider_usage_log (id, provider, model, operation_type, user_id, job_id, units_consumed, cost_usd, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 1, ?, datetime('now'))
    `).bind(
      `plog_${nanoid(16)}`,
      providerInfo.provider,
      providerInfo.model,
      operation,
      userId,
      jobId,
      providerInfo.cost
    ).run();
  }
}

// Helper to get provider cost from config
async function getProviderCost(db: D1Database, provider: string, modelId: string): Promise<number> {
  const cost = await db.prepare(
    'SELECT cost_per_unit FROM provider_costs WHERE provider = ? AND model_id = ? AND is_active = 1'
  ).bind(provider, modelId).first<{ cost_per_unit: number }>();
  return cost?.cost_per_unit || 0;
}

// Helper to get token pricing
async function getTokenPricing(db: D1Database, operation: string): Promise<{ tokens: number; providerCost: number }> {
  const pricing = await db.prepare(
    'SELECT tokens_charged, base_provider_cost FROM token_pricing WHERE operation = ? AND is_active = 1'
  ).bind(operation).first<{ tokens_charged: number; base_provider_cost: number }>();
  return {
    tokens: pricing?.tokens_charged || 1,
    providerCost: pricing?.base_provider_cost || 0,
  };
}

// ============== FIRST FRAME GENERATION ==============

// Style presets for first frame generation
const FRAME_STYLE_PRESETS: Record<string, { model: string; suffix: string; aspect?: string }> = {
  'cinematic': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', cinematic film still, professional cinematography, dramatic lighting, 8k, highly detailed'
  },
  'anime': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', anime style, studio ghibli inspired, vibrant colors, detailed anime artwork'
  },
  'realistic': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', photorealistic, ultra detailed, professional photography, 8k resolution'
  },
  'artistic': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', digital art, concept art, painterly style, trending on artstation'
  },
  'nono-banna': { 
    model: 'nono-ai/flux-1.1-nono-banna',
    suffix: ', high quality, detailed'
  },
  '3d-render': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', 3D render, octane render, unreal engine 5, photorealistic 3D, volumetric lighting'
  },
  'vintage': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', vintage film grain, retro aesthetic, nostalgic, 35mm film photography'
  },
  'fantasy': { 
    model: 'black-forest-labs/flux-1.1-pro',
    suffix: ', fantasy art, magical atmosphere, ethereal lighting, concept art style'
  },
};

// POST /generate/first-frame - Generate first frame for timeline segment
generateRoutes.post('/first-frame', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    const { 
      prompt, 
      style = 'cinematic',
      aspect_ratio = '16:9',
      segment_id,
    } = body;

    if (!prompt) {
      return c.json({ success: false, error: 'Prompt is required' }, 400);
    }

    // Check token balance
    const tokenCost = await getTokenCost(c.env.DB, 'first_frame_generation');
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens', 
        tokensRequired: tokenCost, 
        tokensAvailable: user.tokens 
      }, 402);
    }

    // Get Replicate API key
    const replicateKey = await getApiKey(c.env, 'replicate');
    if (!replicateKey) {
      return c.json({ 
        success: false, 
        error: 'Replicate API not configured. Please add your Replicate API key in Admin > API Keys.' 
      }, 500);
    }

    // Get style preset
    const stylePreset = FRAME_STYLE_PRESETS[style] || FRAME_STYLE_PRESETS['cinematic'];
    const enhancedPrompt = prompt + stylePreset.suffix;

    // Map aspect ratio to dimensions
    const aspectDimensions: Record<string, { width: number; height: number }> = {
      '16:9': { width: 1280, height: 720 },
      '9:16': { width: 720, height: 1280 },
      '1:1': { width: 1024, height: 1024 },
      '4:3': { width: 1024, height: 768 },
      '3:4': { width: 768, height: 1024 },
      '21:9': { width: 1344, height: 576 },
    };
    const dimensions = aspectDimensions[aspect_ratio] || aspectDimensions['16:9'];

    // Create prediction on Replicate
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: stylePreset.model,
        input: {
          prompt: enhancedPrompt,
          width: dimensions.width,
          height: dimensions.height,
          num_outputs: 1,
          output_format: 'webp',
          output_quality: 90,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Replicate API error:', errorText);
      return c.json({ 
        success: false, 
        error: 'Failed to generate image. Please try again.' 
      }, 500);
    }

    const prediction = await response.json() as any;

    // Poll for completion (max 60 seconds)
    let result = prediction;
    const maxAttempts = 30;
    let attempts = 0;

    while (result.status !== 'succeeded' && result.status !== 'failed' && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const statusResponse = await fetch(result.urls.get, {
        headers: { 'Authorization': `Bearer ${replicateKey}` },
      });
      result = await statusResponse.json() as any;
      attempts++;
    }

    if (result.status === 'failed') {
      console.error('Replicate prediction failed:', result.error);
      return c.json({ 
        success: false, 
        error: result.error || 'Image generation failed' 
      }, 500);
    }

    if (result.status !== 'succeeded') {
      return c.json({ 
        success: false, 
        error: 'Image generation timed out. Please try again.' 
      }, 500);
    }

    // Get the generated image URL
    const imageUrl = Array.isArray(result.output) ? result.output[0] : result.output;

    // Deduct tokens
    await c.env.DB.prepare(
      'UPDATE users SET tokens = tokens - ? WHERE id = ?'
    ).bind(tokenCost, user.id).run();

    // Log the generation
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, output_data, provider, model, created_at, completed_at)
      VALUES (?, ?, 'first_frame', 'completed', ?, ?, 'replicate', ?, datetime('now'), datetime('now'))
    `).bind(
      `job_${nanoid(16)}`,
      user.id,
      JSON.stringify({ prompt, style, aspect_ratio, segment_id }),
      JSON.stringify({ image_url: imageUrl }),
      stylePreset.model
    ).run();

    return c.json({
      success: true,
      data: {
        image_url: imageUrl,
        style,
        aspect_ratio,
        model: stylePreset.model,
        tokens_used: tokenCost,
      },
    });

  } catch (error: any) {
    console.error('First frame generation error:', error);
    return c.json({ 
      success: false, 
      error: error.message || 'Failed to generate first frame' 
    }, 500);
  }
});

// GET /generate/first-frame/styles - Get available style presets
generateRoutes.get('/first-frame/styles', async (c) => {
  const styles = Object.entries(FRAME_STYLE_PRESETS).map(([id, preset]) => ({
    id,
    name: id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    model: preset.model,
  }));

  return c.json({
    success: true,
    data: styles,
  });
});
