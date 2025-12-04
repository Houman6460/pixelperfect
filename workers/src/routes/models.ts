/**
 * Video Models Routes
 * API endpoints for model registry and capabilities
 * Includes Sora, Veo, and all video generation models
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { Database, Cache } from '../db/index';
import {
  ModelCapabilitiesService,
  VideoModelRepository,
  ModelCapabilitiesRepository,
} from '../services/modelCapabilities';

type Variables = {
  user: User;
};

export const modelsRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== MODEL LIST ENDPOINTS ====================

// GET /models - Get all active video models
modelsRoutes.get('/models', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const models = await service.getAllModelsWithCapabilities();

    return c.json({
      success: true,
      data: models.map(m => ({
        id: m.id,
        displayName: m.display_name,
        provider: m.provider,
        maxDurationSec: m.max_duration_sec,
        minDurationSec: m.min_duration_sec,
        resolution: m.resolution,
        qualityScore: m.quality_score,
        costPerSecond: m.cost_per_second,
        isPreviewModel: m.is_preview_model,
        supportsTextToVideo: m.capabilities?.supports_text_to_video ?? false,
        supportsImageToVideo: m.capabilities?.supports_image_to_video ?? true,
        supportsVideoToVideo: m.capabilities?.supports_video_to_video ?? false,
        supportsFirstFrame: m.supports_first_frame,
        supportsNegativePrompt: m.supports_negative_prompt,
        supportedAspects: m.capabilities?.supported_aspects ?? ['16:9'],
        creditsPerSecond: m.capabilities?.credits_per_second ?? m.cost_per_second,
        baseCredits: m.capabilities?.base_credits ?? 5,
      })),
    });
  } catch (error: any) {
    console.error('Get models error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== SORA & VEO SPECIFIC (must be before :id route) ====================

// GET /models/sora - Get Sora model details
modelsRoutes.get('/models/sora', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const sora = await service.getModelWithCapabilities('sora');
    const soraTurbo = await service.getModelWithCapabilities('sora-turbo');

    return c.json({
      success: true,
      data: {
        sora: sora ? {
          id: sora.id,
          name: sora.display_name,
          provider: sora.provider,
          maxDuration: sora.max_duration_sec,
          minDuration: sora.min_duration_sec,
          supportedModes: ['text-to-video', 'image-to-video'],
          supportedAspects: sora.capabilities?.supported_aspects ?? ['16:9', '9:16', '1:1'],
          qualityScore: sora.quality_score,
        } : null,
        soraTurbo: soraTurbo ? {
          id: soraTurbo.id,
          name: soraTurbo.display_name,
          provider: soraTurbo.provider,
          maxDuration: soraTurbo.max_duration_sec,
          minDuration: soraTurbo.min_duration_sec,
          supportedModes: ['text-to-video', 'image-to-video'],
          supportedAspects: soraTurbo.capabilities?.supported_aspects ?? ['16:9', '9:16', '1:1'],
          qualityScore: soraTurbo.quality_score,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get Sora error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /models/veo - Get Veo model details
modelsRoutes.get('/models/veo', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const veo2 = await service.getModelWithCapabilities('veo-2');
    const veo2Flash = await service.getModelWithCapabilities('veo-2-flash');

    return c.json({
      success: true,
      data: {
        veo2: veo2 ? {
          id: veo2.id,
          name: veo2.display_name,
          provider: veo2.provider,
          maxDuration: veo2.max_duration_sec,
          minDuration: veo2.min_duration_sec,
          supportedModes: ['text-to-video', 'image-to-video', 'video-to-video'],
          supportedAspects: veo2.capabilities?.supported_aspects ?? ['16:9', '9:16', '1:1'],
          qualityScore: veo2.quality_score,
        } : null,
        veo2Flash: veo2Flash ? {
          id: veo2Flash.id,
          name: veo2Flash.display_name,
          provider: veo2Flash.provider,
          maxDuration: veo2Flash.max_duration_sec,
          minDuration: veo2Flash.min_duration_sec,
          supportedModes: ['text-to-video', 'image-to-video'],
          supportedAspects: veo2Flash.capabilities?.supported_aspects ?? ['16:9', '9:16'],
          qualityScore: veo2Flash.quality_score,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get Veo error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DYNAMIC MODEL ENDPOINT ====================

// GET /models/:id - Get model details with capabilities
modelsRoutes.get('/models/:id', async (c) => {
  try {
    const modelId = c.req.param('id');
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const model = await service.getModelWithCapabilities(modelId);

    if (!model) {
      return c.json({ success: false, error: 'Model not found' }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: model.id,
        displayName: model.display_name,
        provider: model.provider,
        maxDurationSec: model.max_duration_sec,
        minDurationSec: model.min_duration_sec,
        resolution: model.resolution,
        priority: model.priority,
        qualityScore: model.quality_score,
        costPerSecond: model.cost_per_second,
        isPreviewModel: model.is_preview_model,
        capabilities: model.capabilities ? {
          supportsTextToVideo: model.capabilities.supports_text_to_video,
          supportsImageToVideo: model.capabilities.supports_image_to_video,
          supportsVideoToVideo: model.capabilities.supports_video_to_video,
          supportsFirstFrame: model.capabilities.supports_first_frame,
          supportsAudioGeneration: model.capabilities.supports_audio_generation,
          supportedAspects: model.capabilities.supported_aspects,
          maxWidth: model.capabilities.max_width,
          maxHeight: model.capabilities.max_height,
          preferredResolution: model.capabilities.preferred_resolution,
          minDurationSec: model.capabilities.min_duration_sec,
          maxDurationSec: model.capabilities.max_duration_sec,
          maxPromptLength: model.capabilities.max_prompt_length,
          creditsPerSecond: model.capabilities.credits_per_second,
          baseCredits: model.capabilities.base_credits,
        } : null,
      },
    });
  } catch (error: any) {
    console.error('Get model error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /models/provider/:provider - Get models by provider
modelsRoutes.get('/models/provider/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const modelRepo = new VideoModelRepository(db, cache);

    const models = await modelRepo.getByProvider(provider);

    return c.json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    console.error('Get models by provider error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== CAPABILITY ENDPOINTS ====================

// GET /models/capabilities/text-to-video - Get models supporting text-to-video
modelsRoutes.get('/models/capabilities/text-to-video', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const modelRepo = new VideoModelRepository(db, cache);

    const models = await modelRepo.getTextToVideoModels();

    return c.json({
      success: true,
      data: models.map(m => ({
        id: m.id,
        name: m.display_name,
        provider: m.provider,
        maxDuration: m.max_duration_sec,
        qualityScore: m.quality_score,
      })),
    });
  } catch (error: any) {
    console.error('Get text-to-video models error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /models/for-segment/:position - Get models suitable for segment position
modelsRoutes.get('/models/for-segment/:position', async (c) => {
  try {
    const position = parseInt(c.req.param('position'));
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const models = await service.getModelsForSegment(position);

    return c.json({
      success: true,
      data: {
        position,
        isFirstSegment: position === 0,
        availableModes: position === 0 
          ? ['text-to-video', 'image-to-video', 'video-to-video']
          : ['image-to-video'],
        models: models.map(m => ({
          id: m.id,
          name: m.display_name,
          provider: m.provider,
          maxDuration: m.max_duration_sec,
          supportsText: m.capabilities?.supports_text_to_video ?? false,
          supportsImage: m.capabilities?.supports_image_to_video ?? true,
          supportsVideo: m.capabilities?.supports_video_to_video ?? false,
          supportedAspects: m.capabilities?.supported_aspects ?? ['16:9'],
        })),
      },
    });
  } catch (error: any) {
    console.error('Get models for segment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /models/validate - Validate model for use case
modelsRoutes.post('/models/validate', async (c) => {
  try {
    const body = await c.req.json();
    const { model_id, mode, aspect_ratio, duration_sec } = body;

    if (!model_id) {
      return c.json({ success: false, error: 'model_id is required' }, 400);
    }

    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const model = await service.getModelWithCapabilities(model_id);
    if (!model) {
      return c.json({ success: false, error: 'Model not found' }, 404);
    }

    const validations: { field: string; valid: boolean; message?: string }[] = [];

    // Validate mode
    if (mode) {
      const supportsMode = await service.supportsMode(model_id, mode);
      validations.push({
        field: 'mode',
        valid: supportsMode,
        message: supportsMode ? undefined : `Model does not support ${mode}`,
      });
    }

    // Validate aspect ratio
    if (aspect_ratio) {
      const supportsAspect = await service.supportsAspectRatio(model_id, aspect_ratio);
      validations.push({
        field: 'aspect_ratio',
        valid: supportsAspect,
        message: supportsAspect ? undefined : `Model does not support ${aspect_ratio} aspect ratio`,
      });
    }

    // Validate duration
    if (duration_sec) {
      const durationResult = await service.validateDuration(model_id, duration_sec);
      validations.push({
        field: 'duration',
        valid: durationResult.valid,
        message: durationResult.error,
      });
    }

    const allValid = validations.every(v => v.valid);

    return c.json({
      success: true,
      data: {
        modelId: model_id,
        valid: allValid,
        validations,
      },
    });
  } catch (error: any) {
    console.error('Validate model error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /models/recommend - Get recommended model for use case
modelsRoutes.post('/models/recommend', async (c) => {
  try {
    const body = await c.req.json();
    const { mode, aspect_ratio, max_duration, prefer_quality } = body;

    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    const recommended = await service.getRecommendedModel({
      mode,
      aspectRatio: aspect_ratio,
      maxDuration: max_duration,
      preferQuality: prefer_quality,
    });

    if (!recommended) {
      return c.json({
        success: false,
        error: 'No model matches the specified criteria',
      }, 404);
    }

    return c.json({
      success: true,
      data: {
        id: recommended.id,
        name: recommended.display_name,
        provider: recommended.provider,
        maxDuration: recommended.max_duration_sec,
        qualityScore: recommended.quality_score,
        costPerSecond: recommended.cost_per_second,
        supportsText: recommended.capabilities?.supports_text_to_video ?? false,
        supportsImage: recommended.capabilities?.supports_image_to_video ?? true,
      },
    });
  } catch (error: any) {
    console.error('Recommend model error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== CACHE MANAGEMENT ====================

// POST /models/cache/refresh - Refresh model cache in KV
modelsRoutes.post('/models/cache/refresh', authMiddleware(), async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const service = new ModelCapabilitiesService(db, cache);

    await service.cacheModelsToKV();

    return c.json({
      success: true,
      message: 'Model cache refreshed',
    });
  } catch (error: any) {
    console.error('Refresh cache error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default modelsRoutes;
