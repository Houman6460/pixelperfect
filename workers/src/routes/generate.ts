import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { calculateSmartCost, logActualProviderCost, calculateDirectApiCost } from '../utils/costCalculator';

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
    
    // Check if OPENAI_API_KEY is configured
    if (!c.env.OPENAI_API_KEY) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'OpenAI API key not configured');
      return c.json({ success: false, error: 'AI service not configured. Please contact admin.' }, 500);
    }
    
    // Call OpenAI DALL-E 3
    const response = await fetch('https://api.openai.com/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
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
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
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
        'Authorization': `Bearer ${c.env.OPENAI_API_KEY}`,
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
