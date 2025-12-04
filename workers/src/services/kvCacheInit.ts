/**
 * KV Cache Initialization Service
 * Populates KV namespaces with model registry, platform profiles, and upscalers
 */

// ==================== VIDEO MODELS ====================

export interface VideoModelKV {
  id: string;
  provider: string;
  display_name: string;
  max_duration_sec: number;
  min_duration_sec: number;
  max_prompt_chars: number;
  supports_text: boolean;
  supports_image: boolean;
  supports_audio: boolean;
  supports_dialogue: 'none' | 'limited' | 'full';
  recommended_aspects: string[];
  recommended_resolutions: string[];
  is_recommended: boolean;
  priority: number;
}

export const VIDEO_MODELS: VideoModelKV[] = [
  // Kling Models
  {
    id: 'kling-2.5-pro',
    provider: 'kling',
    display_name: 'Kling 2.5 Pro',
    max_duration_sec: 10,
    min_duration_sec: 2,
    max_prompt_chars: 600,
    supports_text: true,
    supports_image: true,
    supports_audio: true,
    supports_dialogue: 'full',
    recommended_aspects: ['16:9', '9:16', '1:1'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: true,
    priority: 100,
  },
  {
    id: 'kling-2.5-i2v-pro',
    provider: 'kling',
    display_name: 'Kling 2.5 I2V Pro',
    max_duration_sec: 10,
    min_duration_sec: 2,
    max_prompt_chars: 600,
    supports_text: true,
    supports_image: true,
    supports_audio: true,
    supports_dialogue: 'full',
    recommended_aspects: ['16:9', '9:16', '1:1'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: true,
    priority: 95,
  },
  {
    id: 'kling-1.5-pro',
    provider: 'kling',
    display_name: 'Kling 1.5 Pro',
    max_duration_sec: 10,
    min_duration_sec: 2,
    max_prompt_chars: 500,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9'],
    recommended_resolutions: ['1080p'],
    is_recommended: false,
    priority: 80,
  },
  // OpenAI Sora
  {
    id: 'sora',
    provider: 'openai',
    display_name: 'OpenAI Sora',
    max_duration_sec: 20,
    min_duration_sec: 5,
    max_prompt_chars: 1000,
    supports_text: true,
    supports_image: true,
    supports_audio: true,
    supports_dialogue: 'full',
    recommended_aspects: ['16:9', '9:16', '1:1', '21:9'],
    recommended_resolutions: ['1080p', '720p', '480p'],
    is_recommended: true,
    priority: 98,
  },
  {
    id: 'sora-turbo',
    provider: 'openai',
    display_name: 'OpenAI Sora Turbo',
    max_duration_sec: 10,
    min_duration_sec: 3,
    max_prompt_chars: 800,
    supports_text: true,
    supports_image: true,
    supports_audio: true,
    supports_dialogue: 'full',
    recommended_aspects: ['16:9', '9:16'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: false,
    priority: 92,
  },
  // Google Veo
  {
    id: 'veo-2',
    provider: 'google',
    display_name: 'Google Veo 2',
    max_duration_sec: 8,
    min_duration_sec: 2,
    max_prompt_chars: 600,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9', '9:16'],
    recommended_resolutions: ['1080p'],
    is_recommended: true,
    priority: 96,
  },
  {
    id: 'veo-2-flash',
    provider: 'google',
    display_name: 'Google Veo 2 Flash',
    max_duration_sec: 6,
    min_duration_sec: 2,
    max_prompt_chars: 400,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9', '9:16'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: false,
    priority: 88,
  },
  // Runway
  {
    id: 'runway-gen3',
    provider: 'runway',
    display_name: 'Runway Gen-3 Alpha',
    max_duration_sec: 10,
    min_duration_sec: 4,
    max_prompt_chars: 500,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9', '9:16'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: true,
    priority: 90,
  },
  {
    id: 'runway-gen3-turbo',
    provider: 'runway',
    display_name: 'Runway Gen-3 Turbo',
    max_duration_sec: 10,
    min_duration_sec: 4,
    max_prompt_chars: 400,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: false,
    priority: 85,
  },
  // Luma
  {
    id: 'luma-ray-2',
    provider: 'luma',
    display_name: 'Luma Ray 2',
    max_duration_sec: 5,
    min_duration_sec: 2,
    max_prompt_chars: 400,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'none',
    recommended_aspects: ['16:9', '9:16', '1:1'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: true,
    priority: 88,
  },
  {
    id: 'luma-dream-machine',
    provider: 'luma',
    display_name: 'Luma Dream Machine',
    max_duration_sec: 5,
    min_duration_sec: 2,
    max_prompt_chars: 350,
    supports_text: true,
    supports_image: false,
    supports_audio: false,
    supports_dialogue: 'none',
    recommended_aspects: ['16:9'],
    recommended_resolutions: ['720p'],
    is_recommended: false,
    priority: 75,
  },
  // Wan
  {
    id: 'wan-2.5-i2v',
    provider: 'wan',
    display_name: 'Wan 2.5 I2V',
    max_duration_sec: 5,
    min_duration_sec: 2,
    max_prompt_chars: 350,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9', '9:16'],
    recommended_resolutions: ['1080p', '720p'],
    is_recommended: true,
    priority: 85,
  },
  // Others
  {
    id: 'pixverse-v3.5',
    provider: 'pixverse',
    display_name: 'PixVerse V3.5',
    max_duration_sec: 8,
    min_duration_sec: 2,
    max_prompt_chars: 400,
    supports_text: true,
    supports_image: false,
    supports_audio: false,
    supports_dialogue: 'none',
    recommended_aspects: ['16:9'],
    recommended_resolutions: ['1080p'],
    is_recommended: false,
    priority: 70,
  },
  {
    id: 'minimax-video-01',
    provider: 'minimax',
    display_name: 'MiniMax Video-01',
    max_duration_sec: 6,
    min_duration_sec: 2,
    max_prompt_chars: 500,
    supports_text: true,
    supports_image: true,
    supports_audio: false,
    supports_dialogue: 'limited',
    recommended_aspects: ['16:9'],
    recommended_resolutions: ['1080p'],
    is_recommended: false,
    priority: 72,
  },
];

// ==================== UPSCALER MODELS ====================

export interface UpscalerModelKV {
  id: string;
  provider: string;
  display_name: string;
  description: string;
  scale_factors: number[];
  max_input_resolution: string;
  max_output_resolution: string;
  supports_video: boolean;
  quality_score: number;
  credits_per_use: number;
  is_active: boolean;
}

export const UPSCALER_MODELS: UpscalerModelKV[] = [
  {
    id: 'replicate-esrgan',
    provider: 'replicate',
    display_name: 'Real-ESRGAN Video',
    description: 'High-quality video upscaling using Real-ESRGAN',
    scale_factors: [2, 4],
    max_input_resolution: '1080p',
    max_output_resolution: '4k',
    supports_video: true,
    quality_score: 9,
    credits_per_use: 10,
    is_active: true,
  },
  {
    id: 'replicate-esrgan-anime',
    provider: 'replicate',
    display_name: 'Real-ESRGAN Anime',
    description: 'Optimized for anime and cartoon content',
    scale_factors: [2, 4],
    max_input_resolution: '1080p',
    max_output_resolution: '4k',
    supports_video: true,
    quality_score: 9,
    credits_per_use: 10,
    is_active: true,
  },
  {
    id: 'topaz-video-ai',
    provider: 'topaz',
    display_name: 'Topaz Video AI',
    description: 'Professional video enhancement suite',
    scale_factors: [2, 4, 8],
    max_input_resolution: '1080p',
    max_output_resolution: '8k',
    supports_video: true,
    quality_score: 10,
    credits_per_use: 20,
    is_active: true,
  },
  {
    id: 'stability-upscale',
    provider: 'stability',
    display_name: 'Stable Video Upscale',
    description: 'Stability AI video enhancement',
    scale_factors: [2, 4],
    max_input_resolution: '1080p',
    max_output_resolution: '4k',
    supports_video: true,
    quality_score: 8,
    credits_per_use: 8,
    is_active: true,
  },
];

// ==================== PLATFORM PROFILES ====================

export interface PlatformProfileKV {
  id: string;
  platform: string;
  display_name: string;
  recommended_aspect: string;
  supported_aspects: string[];
  max_resolution: string;
  max_duration_sec: number;
  max_file_size_mb: number;
  video_codec: string;
  audio_codec: string;
}

export const PLATFORM_PROFILES: PlatformProfileKV[] = [
  {
    id: 'youtube',
    platform: 'youtube',
    display_name: 'YouTube',
    recommended_aspect: '16:9',
    supported_aspects: ['16:9', '9:16', '1:1', '4:5'],
    max_resolution: '4k',
    max_duration_sec: 43200, // 12 hours
    max_file_size_mb: 256000,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'youtube-shorts',
    platform: 'youtube-shorts',
    display_name: 'YouTube Shorts',
    recommended_aspect: '9:16',
    supported_aspects: ['9:16'],
    max_resolution: '1080p',
    max_duration_sec: 60,
    max_file_size_mb: 10240,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'tiktok',
    platform: 'tiktok',
    display_name: 'TikTok',
    recommended_aspect: '9:16',
    supported_aspects: ['9:16', '1:1'],
    max_resolution: '1080p',
    max_duration_sec: 180,
    max_file_size_mb: 4096,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'instagram-reels',
    platform: 'instagram-reels',
    display_name: 'Instagram Reels',
    recommended_aspect: '9:16',
    supported_aspects: ['9:16', '4:5'],
    max_resolution: '1080p',
    max_duration_sec: 90,
    max_file_size_mb: 4096,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'instagram-feed',
    platform: 'instagram-feed',
    display_name: 'Instagram Feed',
    recommended_aspect: '1:1',
    supported_aspects: ['1:1', '4:5', '16:9'],
    max_resolution: '1080p',
    max_duration_sec: 60,
    max_file_size_mb: 4096,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'facebook',
    platform: 'facebook',
    display_name: 'Facebook',
    recommended_aspect: '16:9',
    supported_aspects: ['16:9', '9:16', '1:1', '4:5'],
    max_resolution: '1080p',
    max_duration_sec: 14400, // 4 hours
    max_file_size_mb: 10240,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'vimeo',
    platform: 'vimeo',
    display_name: 'Vimeo',
    recommended_aspect: '16:9',
    supported_aspects: ['16:9', '9:16', '1:1'],
    max_resolution: '4k',
    max_duration_sec: 43200,
    max_file_size_mb: 256000,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
  {
    id: 'twitch',
    platform: 'twitch',
    display_name: 'Twitch',
    recommended_aspect: '16:9',
    supported_aspects: ['16:9'],
    max_resolution: '1080p',
    max_duration_sec: 14400,
    max_file_size_mb: 10240,
    video_codec: 'h264',
    audio_codec: 'aac',
  },
];

// ==================== KV INITIALIZATION ====================

/**
 * Initialize all KV caches with model and platform data
 */
export async function initializeKVCache(cacheKV: KVNamespace): Promise<{
  success: boolean;
  initialized: string[];
  errors: string[];
}> {
  const initialized: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Video models list
    await cacheKV.put('video_models:list', JSON.stringify(VIDEO_MODELS), {
      expirationTtl: 86400, // 24 hours
    });
    initialized.push('video_models:list');

    // 2. Recommended models
    const recommended = VIDEO_MODELS.filter(m => m.is_recommended)
      .sort((a, b) => b.priority - a.priority);
    await cacheKV.put('video_models:recommended', JSON.stringify(recommended), {
      expirationTtl: 86400,
    });
    initialized.push('video_models:recommended');

    // 3. Models by provider
    const providers = [...new Set(VIDEO_MODELS.map(m => m.provider))];
    for (const provider of providers) {
      const providerModels = VIDEO_MODELS.filter(m => m.provider === provider);
      await cacheKV.put(`video_models:provider:${provider}`, JSON.stringify(providerModels), {
        expirationTtl: 86400,
      });
      initialized.push(`video_models:provider:${provider}`);
    }

    // 4. Upscalers list
    await cacheKV.put('upscalers:list', JSON.stringify(UPSCALER_MODELS), {
      expirationTtl: 86400,
    });
    initialized.push('upscalers:list');

    // 5. Platform profiles
    for (const platform of PLATFORM_PROFILES) {
      await cacheKV.put(`platform:${platform.platform}`, JSON.stringify(platform), {
        expirationTtl: 86400,
      });
      initialized.push(`platform:${platform.platform}`);
    }

    // 6. All platforms list
    await cacheKV.put('platforms:list', JSON.stringify(PLATFORM_PROFILES), {
      expirationTtl: 86400,
    });
    initialized.push('platforms:list');

  } catch (error: any) {
    errors.push(error.message);
  }

  return {
    success: errors.length === 0,
    initialized,
    errors,
  };
}

/**
 * Get video model from KV cache (with fallback to hardcoded)
 */
export async function getVideoModelFromKV(
  cacheKV: KVNamespace,
  modelId: string
): Promise<VideoModelKV | null> {
  try {
    const models = await cacheKV.get<VideoModelKV[]>('video_models:list', 'json');
    if (models) {
      return models.find(m => m.id === modelId) || null;
    }
  } catch (e) {
    console.warn('KV cache miss for video models');
  }
  
  // Fallback to hardcoded
  return VIDEO_MODELS.find(m => m.id === modelId) || null;
}

/**
 * Get platform profile from KV cache (with fallback)
 */
export async function getPlatformFromKV(
  cacheKV: KVNamespace,
  platformId: string
): Promise<PlatformProfileKV | null> {
  try {
    const profile = await cacheKV.get<PlatformProfileKV>(`platform:${platformId}`, 'json');
    if (profile) return profile;
  } catch (e) {
    console.warn('KV cache miss for platform');
  }
  
  return PLATFORM_PROFILES.find(p => p.platform === platformId) || null;
}

export default {
  VIDEO_MODELS,
  UPSCALER_MODELS,
  PLATFORM_PROFILES,
  initializeKVCache,
  getVideoModelFromKV,
  getPlatformFromKV,
};
