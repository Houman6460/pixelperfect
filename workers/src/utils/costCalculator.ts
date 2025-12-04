/**
 * Smart Cost Calculator
 * Automatically calculates provider costs based on:
 * - Which provider is being used (Direct vs Replicate)
 * - Model-specific pricing from each provider
 * - Actual API response metrics when available
 */

// Replicate pricing: $0.000225 per second for most models (CPU)
// GPU models vary: https://replicate.com/pricing
export const REPLICATE_PRICING = {
  // Per-second GPU pricing (approximate)
  'nvidia-t4': 0.000225,
  'nvidia-a40-small': 0.000575,
  'nvidia-a40-large': 0.00115,
  'nvidia-a100-40gb': 0.0023,
  'nvidia-h100': 0.0032,
  // Default fallback
  'default': 0.00115, // A40-large as reasonable default
};

// Direct API provider costs (per request or per unit)
export const DIRECT_API_COSTS: Record<string, Record<string, { cost: number; unit: string; notes: string }>> = {
  openai: {
    'dall-e-3': { cost: 0.04, unit: 'per_image', notes: 'Standard 1024x1024' },
    'dall-e-3-hd': { cost: 0.08, unit: 'per_image', notes: 'HD 1024x1024' },
    'dall-e-3-hd-wide': { cost: 0.12, unit: 'per_image', notes: 'HD 1792x1024' },
    'gpt-4o': { cost: 0.005, unit: 'per_1k_tokens', notes: 'Input: $5/1M, Output: $15/1M' },
    'gpt-4o-mini': { cost: 0.00015, unit: 'per_1k_tokens', notes: 'Input: $0.15/1M' },
    'gpt-4-turbo': { cost: 0.01, unit: 'per_1k_tokens', notes: 'Input: $10/1M' },
    'sora': { cost: 0.15, unit: 'per_second', notes: 'Video generation per second' },
    'whisper': { cost: 0.006, unit: 'per_minute', notes: 'Audio transcription' },
    'tts-1': { cost: 0.015, unit: 'per_1k_chars', notes: 'Text to speech' },
    'tts-1-hd': { cost: 0.03, unit: 'per_1k_chars', notes: 'HD text to speech' },
  },
  google: {
    'gemini-pro': { cost: 0.00025, unit: 'per_1k_tokens', notes: 'Input: $0.25/1M' },
    'gemini-pro-vision': { cost: 0.00025, unit: 'per_1k_tokens', notes: 'Input: $0.25/1M' },
    'gemini-1.5-pro': { cost: 0.00125, unit: 'per_1k_tokens', notes: 'Input: $1.25/1M' },
    'gemini-1.5-flash': { cost: 0.000075, unit: 'per_1k_tokens', notes: 'Input: $0.075/1M' },
    'veo-2': { cost: 0.35, unit: 'per_second', notes: 'Video generation (estimated)' },
    'imagen-3': { cost: 0.04, unit: 'per_image', notes: 'Image generation' },
  },
  anthropic: {
    'claude-3-opus': { cost: 0.015, unit: 'per_1k_tokens', notes: 'Input: $15/1M' },
    'claude-3-sonnet': { cost: 0.003, unit: 'per_1k_tokens', notes: 'Input: $3/1M' },
    'claude-3-haiku': { cost: 0.00025, unit: 'per_1k_tokens', notes: 'Input: $0.25/1M' },
    'claude-3.5-sonnet': { cost: 0.003, unit: 'per_1k_tokens', notes: 'Input: $3/1M' },
  },
  stability: {
    'sd3': { cost: 0.035, unit: 'per_image', notes: 'Stable Diffusion 3' },
    'sd3-turbo': { cost: 0.02, unit: 'per_image', notes: 'SD3 Turbo (faster)' },
    'sdxl': { cost: 0.02, unit: 'per_image', notes: 'Stable Diffusion XL' },
    'sd-ultra': { cost: 0.08, unit: 'per_image', notes: 'Ultra quality' },
    'upscale-4x': { cost: 0.02, unit: 'per_megapixel', notes: 'Image upscaling' },
  },
  kling: {
    'kling-v1.5': { cost: 0.28, unit: 'per_second', notes: '5s video = $1.40' },
    'kling-2.0': { cost: 0.35, unit: 'per_second', notes: '5s video = $1.75 (estimated)' },
  },
  suno: {
    'v3': { cost: 0.05, unit: 'per_clip', notes: 'Music generation per clip' },
    'v3.5': { cost: 0.05, unit: 'per_clip', notes: 'Music generation per clip' },
  },
  meshy: {
    'text-to-3d': { cost: 0.10, unit: 'per_model', notes: '3D model generation' },
    'image-to-3d': { cost: 0.08, unit: 'per_model', notes: 'Image to 3D' },
  },
  replicate: {
    // Replicate models - cost calculated from predict_time
    'stability-ai/sdxl': { cost: 0.00115, unit: 'per_second', notes: 'A40-large GPU' },
    'lucataco/realvisxl-v2.0': { cost: 0.00115, unit: 'per_second', notes: 'A40-large GPU' },
    'nightmareai/real-esrgan': { cost: 0.00115, unit: 'per_second', notes: 'A40-large GPU' },
    'black-forest-labs/flux-dev': { cost: 0.00115, unit: 'per_second', notes: 'A40-large GPU' },
    'black-forest-labs/flux-schnell': { cost: 0.00115, unit: 'per_second', notes: 'A40-large GPU' },
    'luma/ray-2': { cost: 0.0032, unit: 'per_second', notes: 'H100 GPU' },
    'runway/gen-3-alpha': { cost: 0.0032, unit: 'per_second', notes: 'H100 GPU (estimated)' },
    'minimax/video-01': { cost: 0.0032, unit: 'per_second', notes: 'H100 GPU' },
  },
};

// Model routing configuration (which provider to use)
export interface ModelRouting {
  modelId: string;
  provider: string;
  currentMode: 'direct' | 'replicate';
  replicateModel?: string; // Replicate model identifier if using replicate
}

/**
 * Calculate cost from Replicate prediction response
 */
export function calculateReplicateCost(
  predictTime: number, // in seconds
  modelId?: string,
): number {
  // If we know the specific model's GPU tier, use that
  const modelPricing = modelId ? DIRECT_API_COSTS.replicate[modelId] : null;
  const perSecondRate = (modelPricing && typeof modelPricing === 'object' && 'cost' in modelPricing) 
    ? modelPricing.cost 
    : REPLICATE_PRICING.default;
  
  return predictTime * perSecondRate;
}

/**
 * Calculate cost for direct API call
 */
export function calculateDirectApiCost(
  provider: string,
  modelId: string,
  usage: {
    inputTokens?: number;
    outputTokens?: number;
    imageCount?: number;
    durationSeconds?: number;
    megapixels?: number;
    characters?: number;
    clips?: number;
    models?: number;
  }
): number {
  const providerCosts = DIRECT_API_COSTS[provider];
  if (!providerCosts) return 0;
  
  const modelCost = providerCosts[modelId];
  if (!modelCost) return 0;
  
  switch (modelCost.unit) {
    case 'per_image':
      return modelCost.cost * (usage.imageCount || 1);
    case 'per_1k_tokens':
      const totalTokens = (usage.inputTokens || 0) + (usage.outputTokens || 0);
      return modelCost.cost * (totalTokens / 1000);
    case 'per_second':
      return modelCost.cost * (usage.durationSeconds || 1);
    case 'per_minute':
      return modelCost.cost * ((usage.durationSeconds || 60) / 60);
    case 'per_megapixel':
      return modelCost.cost * (usage.megapixels || 1);
    case 'per_1k_chars':
      return modelCost.cost * ((usage.characters || 1000) / 1000);
    case 'per_clip':
      return modelCost.cost * (usage.clips || 1);
    case 'per_model':
      return modelCost.cost * (usage.models || 1);
    default:
      return modelCost.cost;
  }
}

/**
 * Smart cost calculation based on model routing
 */
export async function calculateSmartCost(
  db: D1Database,
  operation: string,
  modelId: string,
  apiResponse?: {
    // Replicate-specific
    predictTime?: number;
    // Token-based APIs
    inputTokens?: number;
    outputTokens?: number;
    // Media-based APIs
    imageCount?: number;
    durationSeconds?: number;
    megapixels?: number;
    characters?: number;
  }
): Promise<{ cost: number; provider: string; mode: 'direct' | 'replicate'; breakdown: string }> {
  
  // Get model routing configuration from database
  const modelConfig = await db.prepare(`
    SELECT provider, current_mode, replicate_model 
    FROM ai_model_configs 
    WHERE model_id = ? AND is_active = 1
  `).bind(modelId).first<{ provider: string; current_mode: string; replicate_model: string }>();
  
  if (!modelConfig) {
    // Fallback to default pricing from token_pricing table
    const pricing = await db.prepare(
      'SELECT base_provider_cost FROM token_pricing WHERE operation = ?'
    ).bind(operation).first<{ base_provider_cost: number }>();
    
    return {
      cost: pricing?.base_provider_cost || 0.01,
      provider: 'unknown',
      mode: 'direct',
      breakdown: 'Default pricing (model not configured)',
    };
  }
  
  const isReplicate = modelConfig.current_mode === 'replicate';
  const provider = isReplicate ? 'replicate' : modelConfig.provider;
  
  let cost = 0;
  let breakdown = '';
  
  if (isReplicate && apiResponse?.predictTime) {
    // Use actual Replicate predict time for accurate cost
    const replicateModelId = modelConfig.replicate_model || modelId;
    cost = calculateReplicateCost(apiResponse.predictTime, replicateModelId);
    breakdown = `Replicate: ${apiResponse.predictTime.toFixed(2)}s @ $${REPLICATE_PRICING.default}/s`;
  } else if (isReplicate) {
    // Estimate based on typical predict times
    const estimatedTime = getEstimatedPredictTime(operation);
    cost = calculateReplicateCost(estimatedTime);
    breakdown = `Replicate (est): ${estimatedTime}s @ $${REPLICATE_PRICING.default}/s`;
  } else {
    // Direct API cost
    cost = calculateDirectApiCost(provider, modelId, {
      inputTokens: apiResponse?.inputTokens,
      outputTokens: apiResponse?.outputTokens,
      imageCount: apiResponse?.imageCount,
      durationSeconds: apiResponse?.durationSeconds,
      megapixels: apiResponse?.megapixels,
      characters: apiResponse?.characters,
    });
    
    const modelPricing = DIRECT_API_COSTS[provider]?.[modelId];
    breakdown = `${provider}/${modelId}: $${modelPricing?.cost || 0} ${modelPricing?.unit || 'per_request'}`;
  }
  
  return {
    cost,
    provider,
    mode: isReplicate ? 'replicate' : 'direct',
    breakdown,
  };
}

/**
 * Get estimated predict time for operations when actual time isn't available
 */
function getEstimatedPredictTime(operation: string): number {
  const estimates: Record<string, number> = {
    'image_generation': 5,      // 5 seconds typical
    'image_generation_hd': 8,   // 8 seconds for HD
    'text_generation': 2,       // 2 seconds typical
    'upscale_2x': 3,           // 3 seconds
    'upscale_4x': 6,           // 6 seconds
    'audio_generation': 15,     // 15 seconds for music
    'video_generation': 60,     // 60 seconds for video
    '3d_generation': 30,        // 30 seconds for 3D
    'enhance': 4,              // 4 seconds
    'reimagine': 6,            // 6 seconds
  };
  
  return estimates[operation] || 5;
}

/**
 * Update provider costs in database based on actual API responses
 * Call this after each API call to keep costs accurate
 */
export async function logActualProviderCost(
  db: D1Database,
  data: {
    provider: string;
    model: string;
    operation: string;
    userId: string;
    jobId: string;
    actualCost: number;
    predictTime?: number;
    mode: 'direct' | 'replicate';
    breakdown: string;
  }
): Promise<void> {
  const { nanoid } = await import('nanoid');
  
  await db.prepare(`
    INSERT INTO provider_usage_log (
      id, provider, model, operation_type, user_id, job_id, 
      units_consumed, cost_usd, request_metadata, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    `plog_${nanoid(16)}`,
    data.provider,
    data.model,
    data.operation,
    data.userId,
    data.jobId,
    data.predictTime || 1,
    data.actualCost,
    JSON.stringify({ mode: data.mode, breakdown: data.breakdown }),
  ).run();
}
