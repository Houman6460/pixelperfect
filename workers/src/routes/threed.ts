import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

type Variables = {
  user: User;
  userId: string;
};

export const threedRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// 3D Model configurations
const THREED_MODELS: Record<string, { 
  tokenCost: number; 
  provider: string;
  type: 'text-to-3d' | 'image-to-3d' | '3d-to-3d' | '3d-enhancement';
  replicateVersion?: string;
}> = {
  // Text to 3D
  'cjwbw/shap-e': { 
    tokenCost: 10, 
    provider: 'openai', 
    type: 'text-to-3d',
    replicateVersion: 'cjwbw/shap-e:5957069d5c509126a73c7cb68abcddbb985aeefa4d318e7c63ec1352ce6da68c'
  },
  'openai/point-e': { 
    tokenCost: 8, 
    provider: 'openai', 
    type: 'text-to-3d',
    replicateVersion: 'cjwbw/point-e:placeholder'
  },
  'meshy/text-to-3d': { 
    tokenCost: 15, 
    provider: 'meshy', 
    type: 'text-to-3d',
    replicateVersion: 'placeholder-meshy'
  },
  'dreamgaussian': { 
    tokenCost: 12, 
    provider: 'research', 
    type: 'text-to-3d',
    replicateVersion: 'jiawei011/dreamgaussian:1548273773c96354c1b8e08ed6c7bf1c54d07270407b67a4b8fdba8b8b8d5dfa'
  },
  'luma/genie': { 
    tokenCost: 20, 
    provider: 'luma', 
    type: 'text-to-3d',
    replicateVersion: 'placeholder-luma-genie'
  },
  
  // Image to 3D
  'triposr': { 
    tokenCost: 8, 
    provider: 'stability', 
    type: 'image-to-3d',
    replicateVersion: 'camenduru/triposr:9d90e17aab9246ed9c5a54485553eb7e1f2c3e0b8d8c8e1a8f6e7d5c4b3a2190'
  },
  'one-2-3-45': { 
    tokenCost: 10, 
    provider: 'research', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-one-2-3-45'
  },
  'zero123plus': { 
    tokenCost: 12, 
    provider: 'stability', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-zero123plus'
  },
  'wonder3d': { 
    tokenCost: 15, 
    provider: 'research', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-wonder3d'
  },
  'instant-mesh': { 
    tokenCost: 10, 
    provider: 'tencent', 
    type: 'image-to-3d',
    replicateVersion: 'camenduru/instantmesh:placeholder'
  },
  'lgm': { 
    tokenCost: 8, 
    provider: 'research', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-lgm'
  },
  'crm': { 
    tokenCost: 10, 
    provider: 'research', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-crm'
  },
  'tsr': { 
    tokenCost: 8, 
    provider: 'stability', 
    type: 'image-to-3d',
    replicateVersion: 'placeholder-tsr'
  },
  
  // 3D Transform
  '3d-stylize': { 
    tokenCost: 6, 
    provider: 'internal', 
    type: '3d-to-3d'
  },
  '3d-optimize': { 
    tokenCost: 5, 
    provider: 'internal', 
    type: '3d-to-3d'
  },
  
  // 3D Enhancement
  '3d-texture': { 
    tokenCost: 8, 
    provider: 'internal', 
    type: '3d-enhancement'
  },
  '3d-upscale': { 
    tokenCost: 10, 
    provider: 'internal', 
    type: '3d-enhancement'
  },
};

// Helper: Get token cost
function getTokenCost(model: string): number {
  return THREED_MODELS[model]?.tokenCost || 10;
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

// Helper: Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Generate 3D model
threedRoutes.post('/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const formData = await c.req.formData();
    
    const model = formData.get('model') as string || 'cjwbw/shap-e';
    const prompt = formData.get('prompt') as string || '';
    const outputFormat = formData.get('output_format') as string || 'glb';
    const guidanceScale = parseFloat(formData.get('guidance_scale') as string) || 15;
    const numSteps = parseInt(formData.get('num_steps') as string) || 64;
    const negativePrompt = formData.get('negative_prompt') as string || '';
    const inputImage = formData.get('image') as unknown as File | null;
    const modelFile = formData.get('model_file') as unknown as File | null;
    
    const modelConfig = THREED_MODELS[model];
    if (!modelConfig) {
      return c.json({ success: false, error: 'Unknown model' }, 400);
    }
    
    // Validate based on model type
    if (modelConfig.type === 'text-to-3d' && !prompt) {
      return c.json({ success: false, error: 'Prompt is required for text-to-3D' }, 400);
    }
    if (modelConfig.type === 'image-to-3d' && !inputImage) {
      return c.json({ success: false, error: 'Image is required for image-to-3D' }, 400);
    }
    
    const tokenCost = getTokenCost(model);
    if (user.tokens < tokenCost) {
      return c.json({ 
        success: false, 
        error: 'Insufficient tokens',
        tokensRequired: tokenCost,
        tokensAvailable: user.tokens 
      }, 402);
    }
    
    const jobId = `3d_${nanoid(16)}`;
    
    // Store input files in R2 if provided
    let imageKey: string | null = null;
    let modelFileKey: string | null = null;
    
    if (inputImage) {
      imageKey = `3d/${user.id}/${jobId}/input.png`;
      const imageBuffer = await inputImage.arrayBuffer();
      await c.env.MEDIA_BUCKET.put(imageKey, imageBuffer, {
        httpMetadata: { contentType: inputImage.type || 'image/png' },
      });
    }
    
    if (modelFile) {
      modelFileKey = `3d/${user.id}/${jobId}/input.${outputFormat}`;
      const modelBuffer = await modelFile.arrayBuffer();
      await c.env.MEDIA_BUCKET.put(modelFileKey, modelBuffer);
    }
    
    // Create job record
    await c.env.DB.prepare(`
      INSERT INTO generation_jobs (id, user_id, type, status, input_data, provider, model, created_at)
      VALUES (?, ?, '3d', 'processing', ?, ?, ?, datetime('now'))
    `).bind(jobId, user.id, JSON.stringify({ 
      prompt, outputFormat, guidanceScale, numSteps, negativePrompt, imageKey, modelFileKey 
    }), modelConfig.provider, model).run();
    
    // Check if we have Replicate API key and model has a version
    if (!c.env.REPLICATE_API_KEY || !modelConfig.replicateVersion || modelConfig.replicateVersion.startsWith('placeholder')) {
      // Return pending status for models not yet integrated
      await deductTokens(c.env.DB, user.id, tokenCost, '3d_generation', jobId);
      
      return c.json({
        success: true,
        jobId,
        status: 'pending',
        message: `${model} generation queued. Some models are coming soon.`,
        tokensUsed: tokenCost,
        tokensRemaining: user.tokens - tokenCost,
      });
    }
    
    // Call Replicate API
    let inputData: Record<string, unknown> = {};
    
    if (modelConfig.type === 'text-to-3d') {
      inputData = {
        prompt,
        guidance_scale: guidanceScale,
        num_inference_steps: numSteps,
      };
      if (negativePrompt) inputData.negative_prompt = negativePrompt;
    } else if (modelConfig.type === 'image-to-3d' && inputImage) {
      const imageBuffer = await inputImage.arrayBuffer();
      const imageBase64 = `data:${inputImage.type || 'image/png'};base64,${arrayBufferToBase64(imageBuffer)}`;
      inputData = {
        image: imageBase64,
      };
    }
    
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: modelConfig.replicateVersion.split(':')[1] || modelConfig.replicateVersion,
        input: inputData,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.text();
      console.error('Replicate API error:', errorData);
      await c.env.DB.prepare(
        'UPDATE generation_jobs SET status = ?, error_message = ? WHERE id = ?'
      ).bind('failed', '3D generation failed', jobId).run();
      
      return c.json({ success: false, error: '3D generation failed' }, 500);
    }
    
    const prediction = await response.json() as { id: string; urls: { get: string } };
    
    // Update job with prediction info
    await c.env.DB.prepare(
      'UPDATE generation_jobs SET output_data = ? WHERE id = ?'
    ).bind(JSON.stringify({ replicateId: prediction.id, pollUrl: prediction.urls.get }), jobId).run();
    
    await deductTokens(c.env.DB, user.id, tokenCost, '3d_generation', jobId);
    
    return c.json({
      success: true,
      jobId,
      status: 'processing',
      message: '3D model generation started',
      estimatedTime: 60, // seconds
      tokensUsed: tokenCost,
      tokensRemaining: user.tokens - tokenCost,
    });
  } catch (error) {
    console.error('3D generation error:', error);
    return c.json({ success: false, error: 'Failed to generate 3D model' }, 500);
  }
});

// Get job status
threedRoutes.get('/status/:jobId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const jobId = c.req.param('jobId');
    
    const job = await c.env.DB.prepare(`
      SELECT * FROM generation_jobs WHERE id = ? AND user_id = ?
    `).bind(jobId, user.id).first();
    
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }
    
    // If processing, check Replicate
    if (job.status === 'processing' && job.output_data && c.env.REPLICATE_API_KEY) {
      const outputData = JSON.parse(job.output_data as string);
      if (outputData.pollUrl) {
        const statusResponse = await fetch(outputData.pollUrl, {
          headers: { 'Authorization': `Bearer ${c.env.REPLICATE_API_KEY}` },
        });
        const result = await statusResponse.json() as { 
          status: string; 
          output?: string | string[] | { mesh?: string };
          error?: string;
        };
        
        if (result.status === 'succeeded' && result.output) {
          // Get model URL from output
          let modelUrl: string | undefined;
          if (typeof result.output === 'string') {
            modelUrl = result.output;
          } else if (Array.isArray(result.output)) {
            modelUrl = result.output[0];
          } else if (result.output.mesh) {
            modelUrl = result.output.mesh;
          }
          
          if (modelUrl) {
            await c.env.DB.prepare(
              'UPDATE generation_jobs SET status = ?, output_data = ?, completed_at = datetime("now") WHERE id = ?'
            ).bind('completed', JSON.stringify({ ...outputData, modelUrl }), jobId).run();
            
            return c.json({
              success: true,
              status: 'completed',
              modelUrl,
            });
          }
        } else if (result.status === 'failed') {
          await c.env.DB.prepare(
            'UPDATE generation_jobs SET status = ?, error_message = ? WHERE id = ?'
          ).bind('failed', result.error || 'Generation failed', jobId).run();
          
          return c.json({
            success: false,
            status: 'failed',
            error: result.error || 'Generation failed',
          });
        }
      }
    }
    
    const outputData = job.output_data ? JSON.parse(job.output_data as string) : null;
    
    return c.json({
      success: true,
      status: job.status,
      modelUrl: outputData?.modelUrl,
      error: job.error_message,
    });
  } catch (error) {
    console.error('Status check error:', error);
    return c.json({ success: false, error: 'Failed to check status' }, 500);
  }
});

// Get available models
threedRoutes.get('/models', async (c) => {
  const models = Object.entries(THREED_MODELS).map(([id, config]) => ({
    id,
    ...config,
    available: config.replicateVersion && !config.replicateVersion.startsWith('placeholder'),
  }));
  return c.json({ success: true, models });
});
