import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

export const generateRoutes = new Hono<{ Bindings: Env }>();

// Generate image
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
    
    // Update job and deduct tokens
    await updateJobStatus(c.env.DB, jobId, 'completed', { fileKey, imageUrl }, null);
    await deductTokens(c.env.DB, user.id, tokenCost, 'image_generation', jobId);
    
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
    
    const result = await response.json() as { choices: Array<{ message: { content: string } }> };
    const content = result.choices[0]?.message?.content;
    
    await updateJobStatus(c.env.DB, jobId, 'completed', { content }, null);
    await deductTokens(c.env.DB, user.id, tokenCost, 'text_generation', jobId);
    
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
  jobId: string
) {
  // Deduct tokens
  await db.prepare(
    'UPDATE users SET tokens = tokens - ?, updated_at = datetime("now") WHERE id = ?'
  ).bind(amount, userId).run();
  
  // Log usage
  await db.prepare(`
    INSERT INTO token_usage_log (id, user_id, operation, tokens_used, job_id, created_at)
    VALUES (?, ?, ?, ?, ?, datetime('now'))
  `).bind(`log_${nanoid(16)}`, userId, operation, amount, jobId).run();
}
