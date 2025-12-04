import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { getApiKey } from '../services/apiKeyManager';

type Variables = {
  user: User;
  userId: string;
};

export const enhanceRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// Enhance image (upscale with Real-ESRGAN or similar)
enhanceRoutes.post('/', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const contentType = c.req.header('content-type') || '';
    
    let imageData: ArrayBuffer | null = null;
    let upscaleFactor = 2;
    let tileSize = 256;
    let overlap = 80;
    let prompt = '';
    let sharpness = 50;
    let denoise = 15;
    let contrast = 55;
    let enhancementPasses = 2;
    let imageType = 'portrait';
    let enhancementMode = 'upscale';
    let finalPass = true;
    
    // Handle FormData
    if (contentType.includes('multipart/form-data')) {
      const formData = await c.req.formData();
      const file = formData.get('image') as File | null;
      
      if (file) {
        imageData = await file.arrayBuffer();
      }
      
      upscaleFactor = parseInt(formData.get('upscaleFactor') as string || formData.get('scale') as string) || 2;
      tileSize = parseInt(formData.get('tileSize') as string) || 256;
      overlap = parseInt(formData.get('overlap') as string) || 80;
      prompt = formData.get('prompt') as string || '';
      sharpness = parseInt(formData.get('sharpness') as string) || 50;
      denoise = parseInt(formData.get('denoise') as string) || 15;
      contrast = parseInt(formData.get('contrast') as string) || 55;
      enhancementPasses = parseInt(formData.get('enhancementPasses') as string) || 2;
      imageType = formData.get('imageType') as string || 'portrait';
      enhancementMode = formData.get('enhancementMode') as string || 'upscale';
      finalPass = formData.get('finalPass') !== 'false';
    }
    
    if (!imageData) {
      return c.json({ success: false, error: 'No image provided' }, 400);
    }
    
    // Check token balance
    const tokenCost = await getTokenCost(c.env.DB, upscaleFactor > 2 ? 'upscale_4x' : 'upscale_2x');
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
      VALUES (?, ?, 'image', 'processing', ?, 'replicate', 'real-esrgan', datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      upscaleFactor, tileSize, overlap, prompt, sharpness, denoise, contrast, enhancementPasses, imageType 
    })).run();
    
    // Get Replicate API key from centralized manager
    const replicateKey = await getApiKey(c.env, 'replicate');
    if (!replicateKey) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Replicate API key not configured');
      return c.json({ success: false, error: 'Enhancement service not configured. Please add Replicate API key in Admin > API Keys.' }, 500);
    }
    
    // Convert image to base64
    const base64Image = arrayBufferToBase64(imageData);
    const dataUrl = `data:image/png;base64,${base64Image}`;
    
    // Call Replicate Real-ESRGAN
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${replicateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'f121d640bd286e1fdc67f9799164c1d5be36ff74576ee11c803ae5b665dd46aa', // Real-ESRGAN
        input: {
          image: dataUrl,
          scale: upscaleFactor,
          face_enhance: imageType === 'portrait',
        },
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Replicate API error:', errorData);
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Enhancement failed');
      return c.json({ success: false, error: 'Enhancement failed' }, 500);
    }
    
    const prediction = await response.json() as { id: string; status: string; urls: { get: string } };
    
    // Poll for result
    let result: { status: string; output?: string; error?: string } | null = null;
    for (let i = 0; i < 60; i++) { // Max 60 seconds
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResponse = await fetch(prediction.urls.get, {
        headers: { 'Authorization': `Bearer ${replicateKey}` },
      });
      
      result = await statusResponse.json() as { status: string; output?: string; error?: string };
      
      if (result.status === 'succeeded') {
        break;
      } else if (result.status === 'failed') {
        await updateJobStatus(c.env.DB, jobId, 'failed', null, result.error || 'Enhancement failed');
        return c.json({ success: false, error: result.error || 'Enhancement failed' }, 500);
      }
    }
    
    if (!result || result.status !== 'succeeded' || !result.output) {
      await updateJobStatus(c.env.DB, jobId, 'failed', null, 'Enhancement timed out');
      return c.json({ success: false, error: 'Enhancement timed out' }, 500);
    }
    
    // Download the result image
    const resultImageResponse = await fetch(result.output);
    const resultImageBuffer = await resultImageResponse.arrayBuffer();
    const resultBase64 = arrayBufferToBase64(resultImageBuffer);
    
    // Deduct tokens
    await deductTokens(c.env.DB, user.id, tokenCost, upscaleFactor > 2 ? 'upscale_4x' : 'upscale_2x', jobId, {
      provider: 'replicate',
      model: 'real-esrgan',
      cost: 0.0046,
    });
    
    // Update job status
    await updateJobStatus(c.env.DB, jobId, 'completed', { outputUrl: result.output }, null);
    
    // Get image dimensions (approximate based on scale)
    const originalSize = Math.sqrt(imageData.byteLength / 4); // Rough estimate
    const newWidth = Math.round(originalSize * upscaleFactor);
    const newHeight = Math.round(originalSize * upscaleFactor);
    
    return c.json({
      success: true,
      imageBase64: resultBase64,
      width: newWidth,
      height: newHeight,
      aiEnhanced: true,
      jobId,
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('Enhancement error:', error);
    return c.json({ success: false, error: 'Failed to enhance image' }, 500);
  }
});

// Reimagine image (creative regeneration with SDXL img2img)
enhanceRoutes.post('/reimagine', async (c) => {
  // For now, redirect to enhance with different settings
  // This would use SDXL img2img in production
  return c.json({ 
    success: false, 
    error: 'Reimagine feature coming soon. Please use Enhance mode for now.' 
  }, 501);
});

// Helper functions
async function getTokenCost(db: D1Database, operation: string): Promise<number> {
  const rule = await db.prepare(
    'SELECT tokens_cost FROM token_rules WHERE operation = ? AND is_active = 1'
  ).bind(operation).first<{ tokens_cost: number }>();
  
  // Default costs if not in database
  const defaults: Record<string, number> = {
    'upscale_2x': 3,
    'upscale_4x': 6,
    'enhance': 4,
    'reimagine': 5,
  };
  
  return rule?.tokens_cost || defaults[operation] || 3;
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
  
  // Log usage
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
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
