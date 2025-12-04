/**
 * Model Capabilities Service
 * Manages video generation model registry and capabilities
 * Includes Sora, Veo, and all other video models
 */

import { Database, Cache } from '../db/index';

// ==================== TYPES ====================

export interface VideoModel {
  id: string;
  display_name: string;
  provider: string;
  max_duration_sec: number;
  min_duration_sec: number;
  supports_first_frame: boolean;
  supports_last_frame: boolean;
  supports_negative_prompt: boolean;
  resolution: string;
  priority: string;
  cost_per_second: number;
  quality_score: number;
  is_preview_model: boolean;
  is_active: boolean;
}

export interface ModelCapabilities {
  id: string;
  model_id: string;
  provider: string;
  
  // Input support
  supports_text_to_video: boolean;
  supports_image_to_video: boolean;
  supports_video_to_video: boolean;
  supports_first_frame: boolean;
  
  // Output
  supports_audio_generation: boolean;
  supports_variable_fps: boolean;
  default_fps: number;
  
  // Aspect ratios
  supported_aspects: string[];
  
  // Resolution
  max_width: number;
  max_height: number;
  preferred_resolution: string;
  
  // Duration
  min_duration_sec: number;
  max_duration_sec: number;
  duration_step_sec: number;
  
  // Prompt
  max_prompt_length: number;
  supports_negative_prompt: boolean;
  
  // Cost
  credits_per_second: number;
  base_credits: number;
}

export interface ModelWithCapabilities extends VideoModel {
  capabilities?: ModelCapabilities;
}

// ==================== MODEL REPOSITORY ====================

export class VideoModelRepository {
  constructor(
    private db: Database,
    private cache?: Cache
  ) {}

  /**
   * Get all active video models
   */
  async getAll(): Promise<VideoModel[]> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<VideoModel[]>('video_models:list');
      if (cached.data) return cached.data;
    }

    const result = await this.db.query<any>(
      'SELECT * FROM video_models WHERE is_active = 1 ORDER BY quality_score DESC, display_name'
    );

    const models = (result.data || []).map(m => ({
      ...m,
      supports_first_frame: m.supports_first_frame === 1,
      supports_last_frame: m.supports_last_frame === 1,
      supports_negative_prompt: m.supports_negative_prompt === 1,
      is_preview_model: m.is_preview_model === 1,
      is_active: m.is_active === 1,
    }));

    // Cache for 10 minutes
    if (this.cache) {
      await this.cache.set('video_models:list', models, { expirationTtl: 600 });
    }

    return models;
  }

  /**
   * Get model by ID
   */
  async getById(id: string): Promise<VideoModel | null> {
    const result = await this.db.queryFirst<any>(
      'SELECT * FROM video_models WHERE id = ?',
      [id]
    );

    if (!result.data) return null;

    return {
      ...result.data,
      supports_first_frame: result.data.supports_first_frame === 1,
      supports_last_frame: result.data.supports_last_frame === 1,
      supports_negative_prompt: result.data.supports_negative_prompt === 1,
      is_preview_model: result.data.is_preview_model === 1,
      is_active: result.data.is_active === 1,
    };
  }

  /**
   * Get models by provider
   */
  async getByProvider(provider: string): Promise<VideoModel[]> {
    const result = await this.db.query<any>(
      'SELECT * FROM video_models WHERE provider = ? AND is_active = 1 ORDER BY quality_score DESC',
      [provider]
    );

    return (result.data || []).map(m => ({
      ...m,
      supports_first_frame: m.supports_first_frame === 1,
      supports_last_frame: m.supports_last_frame === 1,
      supports_negative_prompt: m.supports_negative_prompt === 1,
      is_preview_model: m.is_preview_model === 1,
      is_active: m.is_active === 1,
    }));
  }

  /**
   * Get models that support text-to-video
   */
  async getTextToVideoModels(): Promise<ModelWithCapabilities[]> {
    const result = await this.db.query<any>(
      `SELECT m.*, c.supports_text_to_video, c.supports_image_to_video, c.supported_aspects
       FROM video_models m
       LEFT JOIN model_capabilities c ON m.id = c.model_id
       WHERE m.is_active = 1 AND c.supports_text_to_video = 1
       ORDER BY m.quality_score DESC`
    );

    return (result.data || []).map(m => ({
      ...m,
      supports_first_frame: m.supports_first_frame === 1,
      supports_last_frame: m.supports_last_frame === 1,
      is_active: m.is_active === 1,
      supported_aspects: m.supported_aspects ? JSON.parse(m.supported_aspects) : ['16:9'],
    }));
  }

  /**
   * Get models for first segment (supports multiple input types)
   */
  async getFirstSegmentModels(): Promise<ModelWithCapabilities[]> {
    const result = await this.db.query<any>(
      `SELECT m.*, c.supports_text_to_video, c.supports_image_to_video, c.supports_video_to_video,
              c.supported_aspects, c.max_prompt_length, c.credits_per_second, c.base_credits
       FROM video_models m
       LEFT JOIN model_capabilities c ON m.id = c.model_id
       WHERE m.is_active = 1 AND (c.supports_text_to_video = 1 OR c.supports_image_to_video = 1)
       ORDER BY m.quality_score DESC`
    );

    return (result.data || []).map(m => ({
      ...m,
      supports_first_frame: m.supports_first_frame === 1,
      supports_last_frame: m.supports_last_frame === 1,
      supports_text_to_video: m.supports_text_to_video === 1,
      supports_image_to_video: m.supports_image_to_video === 1,
      supports_video_to_video: m.supports_video_to_video === 1,
      is_active: m.is_active === 1,
      supported_aspects: m.supported_aspects ? JSON.parse(m.supported_aspects) : ['16:9'],
    }));
  }
}

// ==================== CAPABILITIES REPOSITORY ====================

export class ModelCapabilitiesRepository {
  constructor(
    private db: Database,
    private cache?: Cache
  ) {}

  /**
   * Get capabilities for a model
   */
  async getByModelId(modelId: string): Promise<ModelCapabilities | null> {
    // Check cache
    if (this.cache) {
      const cached = await this.cache.get<ModelCapabilities>(`model_cap:${modelId}`);
      if (cached.data) return cached.data;
    }

    const result = await this.db.queryFirst<any>(
      'SELECT * FROM model_capabilities WHERE model_id = ?',
      [modelId]
    );

    if (!result.data) return null;

    const cap: ModelCapabilities = {
      ...result.data,
      supports_text_to_video: result.data.supports_text_to_video === 1,
      supports_image_to_video: result.data.supports_image_to_video === 1,
      supports_video_to_video: result.data.supports_video_to_video === 1,
      supports_first_frame: result.data.supports_first_frame === 1,
      supports_audio_generation: result.data.supports_audio_generation === 1,
      supports_variable_fps: result.data.supports_variable_fps === 1,
      supports_negative_prompt: result.data.supports_negative_prompt === 1,
      supported_aspects: result.data.supported_aspects 
        ? JSON.parse(result.data.supported_aspects) 
        : ['16:9'],
    };

    // Cache for 10 minutes
    if (this.cache) {
      await this.cache.set(`model_cap:${modelId}`, cap, { expirationTtl: 600 });
    }

    return cap;
  }

  /**
   * Get all capabilities
   */
  async getAll(): Promise<ModelCapabilities[]> {
    const result = await this.db.query<any>(
      'SELECT * FROM model_capabilities'
    );

    return (result.data || []).map(c => ({
      ...c,
      supports_text_to_video: c.supports_text_to_video === 1,
      supports_image_to_video: c.supports_image_to_video === 1,
      supports_video_to_video: c.supports_video_to_video === 1,
      supports_first_frame: c.supports_first_frame === 1,
      supports_audio_generation: c.supports_audio_generation === 1,
      supports_variable_fps: c.supports_variable_fps === 1,
      supports_negative_prompt: c.supports_negative_prompt === 1,
      supported_aspects: c.supported_aspects ? JSON.parse(c.supported_aspects) : ['16:9'],
    }));
  }
}

// ==================== MODEL CAPABILITIES SERVICE ====================

export class ModelCapabilitiesService {
  private modelRepo: VideoModelRepository;
  private capRepo: ModelCapabilitiesRepository;

  constructor(
    private db: Database,
    private cache?: Cache
  ) {
    this.modelRepo = new VideoModelRepository(db, cache);
    this.capRepo = new ModelCapabilitiesRepository(db, cache);
  }

  /**
   * Get all models with their capabilities
   */
  async getAllModelsWithCapabilities(): Promise<ModelWithCapabilities[]> {
    const models = await this.modelRepo.getAll();
    const result: ModelWithCapabilities[] = [];

    for (const model of models) {
      const cap = await this.capRepo.getByModelId(model.id);
      result.push({
        ...model,
        capabilities: cap || undefined,
      });
    }

    return result;
  }

  /**
   * Get model with capabilities by ID
   */
  async getModelWithCapabilities(modelId: string): Promise<ModelWithCapabilities | null> {
    const model = await this.modelRepo.getById(modelId);
    if (!model) return null;

    const cap = await this.capRepo.getByModelId(modelId);
    return {
      ...model,
      capabilities: cap || undefined,
    };
  }

  /**
   * Check if model supports a generation mode
   */
  async supportsMode(
    modelId: string,
    mode: 'text-to-video' | 'image-to-video' | 'video-to-video'
  ): Promise<boolean> {
    const cap = await this.capRepo.getByModelId(modelId);
    if (!cap) return false;

    switch (mode) {
      case 'text-to-video':
        return cap.supports_text_to_video;
      case 'image-to-video':
        return cap.supports_image_to_video;
      case 'video-to-video':
        return cap.supports_video_to_video;
      default:
        return false;
    }
  }

  /**
   * Check if model supports an aspect ratio
   */
  async supportsAspectRatio(modelId: string, aspectRatio: string): Promise<boolean> {
    const cap = await this.capRepo.getByModelId(modelId);
    if (!cap) return true; // Allow if no capabilities defined
    return cap.supported_aspects.includes(aspectRatio);
  }

  /**
   * Validate duration for model
   */
  async validateDuration(modelId: string, durationSec: number): Promise<{
    valid: boolean;
    adjustedDuration?: number;
    error?: string;
  }> {
    const cap = await this.capRepo.getByModelId(modelId);
    if (!cap) {
      return { valid: true }; // Allow if no capabilities
    }

    if (durationSec < cap.min_duration_sec) {
      return {
        valid: false,
        adjustedDuration: cap.min_duration_sec,
        error: `Duration must be at least ${cap.min_duration_sec}s for this model`,
      };
    }

    if (durationSec > cap.max_duration_sec) {
      return {
        valid: false,
        adjustedDuration: cap.max_duration_sec,
        error: `Duration cannot exceed ${cap.max_duration_sec}s for this model`,
      };
    }

    return { valid: true };
  }

  /**
   * Get models suitable for a segment position
   */
  async getModelsForSegment(position: number): Promise<ModelWithCapabilities[]> {
    if (position === 0) {
      // First segment - can use text-to-video or image-to-video
      return this.modelRepo.getFirstSegmentModels();
    } else {
      // Subsequent segments - only image-to-video (frame chaining)
      const all = await this.getAllModelsWithCapabilities();
      return all.filter(m => m.capabilities?.supports_image_to_video);
    }
  }

  /**
   * Get recommended model for a use case
   */
  async getRecommendedModel(options: {
    mode?: 'text-to-video' | 'image-to-video';
    aspectRatio?: string;
    maxDuration?: number;
    preferQuality?: boolean;
  }): Promise<ModelWithCapabilities | null> {
    const models = await this.getAllModelsWithCapabilities();

    let filtered = models;

    // Filter by mode
    if (options.mode === 'text-to-video') {
      filtered = filtered.filter(m => m.capabilities?.supports_text_to_video);
    } else if (options.mode === 'image-to-video') {
      filtered = filtered.filter(m => m.capabilities?.supports_image_to_video);
    }

    // Filter by aspect ratio
    if (options.aspectRatio) {
      filtered = filtered.filter(m => 
        m.capabilities?.supported_aspects.includes(options.aspectRatio!) ?? true
      );
    }

    // Filter by duration
    if (options.maxDuration) {
      filtered = filtered.filter(m => 
        (m.capabilities?.max_duration_sec ?? m.max_duration_sec) >= options.maxDuration!
      );
    }

    // Sort by quality or cost
    if (options.preferQuality) {
      filtered.sort((a, b) => b.quality_score - a.quality_score);
    } else {
      filtered.sort((a, b) => a.cost_per_second - b.cost_per_second);
    }

    return filtered[0] || null;
  }

  /**
   * Cache model list to KV for frontend use
   */
  async cacheModelsToKV(): Promise<void> {
    if (!this.cache) return;

    const models = await this.getAllModelsWithCapabilities();
    
    // Format for frontend consumption
    const modelList = models.map(m => ({
      id: m.id,
      name: m.display_name,
      provider: m.provider,
      max_duration: m.max_duration_sec,
      min_duration: m.min_duration_sec,
      supports_text: m.capabilities?.supports_text_to_video ?? false,
      supports_image: m.capabilities?.supports_image_to_video ?? true,
      supports_video: m.capabilities?.supports_video_to_video ?? false,
      supported_aspects: m.capabilities?.supported_aspects ?? ['16:9'],
      quality_score: m.quality_score,
      cost_per_second: m.cost_per_second,
      is_preview: m.is_preview_model,
    }));

    await this.cache.set('video_models:list', modelList, { expirationTtl: 3600 });
  }
}

// ==================== EXPORT ====================

export default {
  VideoModelRepository,
  ModelCapabilitiesRepository,
  ModelCapabilitiesService,
};
