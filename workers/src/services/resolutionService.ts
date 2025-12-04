/**
 * Resolution & Aspect Ratio Service
 * Handles video dimensions, aspect ratios, and platform profiles
 */

import { Database, Cache } from '../db/index';

// ==================== TYPES ====================

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5' | '4:3' | '21:9';
export type Resolution = '480p' | '720p' | '1080p' | '4k';
export type Orientation = 'landscape' | 'portrait' | 'square';

export interface VideoDimensions {
  width: number;
  height: number;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  orientation: Orientation;
  displayName: string;
}

export interface PlatformProfile {
  id: string;
  platform: string;
  display_name: string;
  recommended_aspect: AspectRatio;
  supported_aspects: AspectRatio[];
  max_resolution: Resolution;
  max_duration_sec: number;
  max_file_size_mb: number;
  video_codec: string;
  audio_codec: string;
}

export interface AspectRatioOption {
  id: AspectRatio;
  name: string;
  description: string;
  orientation: Orientation;
  ratio: number; // width/height
  useCases: string[];
}

export interface ResolutionOption {
  id: Resolution;
  name: string;
  baseDimension: number; // The larger dimension value
  qualityLabel: string;
}

// ==================== CONSTANTS ====================

export const ASPECT_RATIOS: AspectRatioOption[] = [
  {
    id: '16:9',
    name: 'Landscape (16:9)',
    description: 'Standard widescreen',
    orientation: 'landscape',
    ratio: 16 / 9,
    useCases: ['YouTube', 'TV', 'Desktop'],
  },
  {
    id: '9:16',
    name: 'Vertical (9:16)',
    description: 'Mobile-first vertical',
    orientation: 'portrait',
    ratio: 9 / 16,
    useCases: ['TikTok', 'Reels', 'Shorts', 'Stories'],
  },
  {
    id: '1:1',
    name: 'Square (1:1)',
    description: 'Perfect square',
    orientation: 'square',
    ratio: 1,
    useCases: ['Instagram Feed', 'Facebook', 'Carousel'],
  },
  {
    id: '4:5',
    name: 'Vertical Feed (4:5)',
    description: 'Optimized for feeds',
    orientation: 'portrait',
    ratio: 4 / 5,
    useCases: ['Instagram Feed', 'Facebook', 'Pinterest'],
  },
  {
    id: '4:3',
    name: 'Classic (4:3)',
    description: 'Classic aspect ratio',
    orientation: 'landscape',
    ratio: 4 / 3,
    useCases: ['Presentations', 'Old TV'],
  },
  {
    id: '21:9',
    name: 'Ultrawide (21:9)',
    description: 'Cinematic ultrawide',
    orientation: 'landscape',
    ratio: 21 / 9,
    useCases: ['Cinema', 'Trailers'],
  },
];

export const RESOLUTIONS: ResolutionOption[] = [
  {
    id: '480p',
    name: '480p (SD)',
    baseDimension: 480,
    qualityLabel: 'Standard Definition',
  },
  {
    id: '720p',
    name: '720p (HD)',
    baseDimension: 720,
    qualityLabel: 'High Definition',
  },
  {
    id: '1080p',
    name: '1080p (Full HD)',
    baseDimension: 1080,
    qualityLabel: 'Full High Definition',
  },
  {
    id: '4k',
    name: '4K (Ultra HD)',
    baseDimension: 2160,
    qualityLabel: 'Ultra High Definition',
  },
];

// ==================== DIMENSION CALCULATIONS ====================

/**
 * Calculate output dimensions from resolution and aspect ratio
 */
export function calculateDimensions(
  resolution: Resolution,
  aspectRatio: AspectRatio
): VideoDimensions {
  const aspectOption = ASPECT_RATIOS.find(a => a.id === aspectRatio);
  const resOption = RESOLUTIONS.find(r => r.id === resolution);

  if (!aspectOption || !resOption) {
    throw new Error(`Invalid resolution (${resolution}) or aspect ratio (${aspectRatio})`);
  }

  let width: number;
  let height: number;

  const baseDim = resOption.baseDimension;
  const ratio = aspectOption.ratio;

  if (aspectOption.orientation === 'landscape' || aspectOption.orientation === 'square') {
    // For landscape/square, height is the base dimension
    height = baseDim;
    width = Math.round(height * ratio);
  } else {
    // For portrait, width is the smaller dimension based on base
    // 1080p vertical = 1080×1920
    height = baseDim;
    width = Math.round(height * ratio);
    
    // Swap for vertical
    if (aspectOption.orientation === 'portrait') {
      [width, height] = [height, Math.round(height / ratio)];
    }
  }

  // Ensure even dimensions for video encoding
  width = Math.round(width / 2) * 2;
  height = Math.round(height / 2) * 2;

  return {
    width,
    height,
    aspectRatio,
    resolution,
    orientation: aspectOption.orientation,
    displayName: `${width}×${height}`,
  };
}

/**
 * Get dimensions for specific aspect + resolution combinations
 * Returns pre-calculated common combinations for accuracy
 */
export function getPresetDimensions(
  resolution: Resolution,
  aspectRatio: AspectRatio
): { width: number; height: number } {
  // Pre-defined common combinations for accuracy
  const presets: Record<string, { width: number; height: number }> = {
    // 16:9 Landscape
    '480p-16:9': { width: 854, height: 480 },
    '720p-16:9': { width: 1280, height: 720 },
    '1080p-16:9': { width: 1920, height: 1080 },
    '4k-16:9': { width: 3840, height: 2160 },
    
    // 9:16 Vertical
    '480p-9:16': { width: 270, height: 480 },
    '720p-9:16': { width: 405, height: 720 },
    '1080p-9:16': { width: 1080, height: 1920 },
    '4k-9:16': { width: 2160, height: 3840 },
    
    // 1:1 Square
    '480p-1:1': { width: 480, height: 480 },
    '720p-1:1': { width: 720, height: 720 },
    '1080p-1:1': { width: 1080, height: 1080 },
    '4k-1:1': { width: 2160, height: 2160 },
    
    // 4:5 Vertical Feed
    '480p-4:5': { width: 384, height: 480 },
    '720p-4:5': { width: 576, height: 720 },
    '1080p-4:5': { width: 864, height: 1080 },
    '4k-4:5': { width: 1728, height: 2160 },
    
    // 4:3 Classic
    '480p-4:3': { width: 640, height: 480 },
    '720p-4:3': { width: 960, height: 720 },
    '1080p-4:3': { width: 1440, height: 1080 },
    '4k-4:3': { width: 2880, height: 2160 },
    
    // 21:9 Ultrawide
    '480p-21:9': { width: 1120, height: 480 },
    '720p-21:9': { width: 1680, height: 720 },
    '1080p-21:9': { width: 2520, height: 1080 },
    '4k-21:9': { width: 5040, height: 2160 },
  };

  const key = `${resolution}-${aspectRatio}`;
  return presets[key] || calculateDimensions(resolution, aspectRatio);
}

/**
 * Get orientation from aspect ratio
 */
export function getOrientation(aspectRatio: AspectRatio): Orientation {
  const option = ASPECT_RATIOS.find(a => a.id === aspectRatio);
  return option?.orientation || 'landscape';
}

/**
 * Check if dimensions fit within platform limits
 */
export function fitsWithinPlatform(
  dimensions: VideoDimensions,
  profile: PlatformProfile
): boolean {
  const maxDim = getPresetDimensions(profile.max_resolution, dimensions.aspectRatio);
  return dimensions.width <= maxDim.width && dimensions.height <= maxDim.height;
}

// ==================== PLATFORM PROFILES ====================

export class PlatformProfileService {
  constructor(
    private db: Database,
    private cache?: Cache
  ) {}

  /**
   * Get all platform profiles
   */
  async getAll(): Promise<PlatformProfile[]> {
    const result = await this.db.query<PlatformProfile>(
      'SELECT * FROM platform_video_profiles ORDER BY display_name'
    );
    
    return (result.data || []).map(p => ({
      ...p,
      supported_aspects: p.supported_aspects 
        ? JSON.parse(p.supported_aspects as unknown as string) 
        : [],
    }));
  }

  /**
   * Get profile for a specific platform
   */
  async getByPlatform(platform: string): Promise<PlatformProfile | null> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<PlatformProfile>(`platform:${platform}`);
      if (cached.data) return cached.data;
    }

    const result = await this.db.queryFirst<PlatformProfile>(
      'SELECT * FROM platform_video_profiles WHERE platform = ?',
      [platform]
    );

    if (result.data) {
      const profile = {
        ...result.data,
        supported_aspects: result.data.supported_aspects 
          ? JSON.parse(result.data.supported_aspects as unknown as string) 
          : [],
      };

      // Cache for 1 hour
      if (this.cache) {
        await this.cache.set(`platform:${platform}`, profile, { expirationTtl: 3600 });
      }

      return profile;
    }

    return null;
  }

  /**
   * Get recommended aspect ratio for platform
   */
  async getRecommendedAspect(platform: string): Promise<AspectRatio> {
    const profile = await this.getByPlatform(platform);
    return (profile?.recommended_aspect as AspectRatio) || '16:9';
  }

  /**
   * Check if aspect ratio is supported by platform
   */
  async isAspectSupported(platform: string, aspectRatio: AspectRatio): Promise<boolean> {
    const profile = await this.getByPlatform(platform);
    if (!profile) return true; // Allow if profile not found
    return profile.supported_aspects.includes(aspectRatio);
  }

  /**
   * Get platforms that support an aspect ratio
   */
  async getPlatformsForAspect(aspectRatio: AspectRatio): Promise<PlatformProfile[]> {
    const all = await this.getAll();
    return all.filter(p => p.supported_aspects.includes(aspectRatio));
  }
}

// ==================== STORAGE KEY HELPERS ====================

/**
 * Generate R2 storage key with aspect ratio awareness
 */
export function getAspectAwareStorageKey(
  type: 'videos' | 'previews' | 'frames' | 'covers',
  userId: string,
  timelineId: string,
  aspectRatio: AspectRatio,
  filename: string
): string {
  return `${type}/${userId}/${timelineId}/${aspectRatio.replace(':', 'x')}/${filename}`;
}

/**
 * Generate quality-aware storage key
 */
export function getQualityAwareStorageKey(
  type: 'videos' | 'previews',
  userId: string,
  timelineId: string,
  aspectRatio: AspectRatio,
  resolution: Resolution,
  filename: string
): string {
  return `${type}/${userId}/${timelineId}/${aspectRatio.replace(':', 'x')}/${resolution}/${filename}`;
}

// ==================== PROMPT HELPERS ====================

/**
 * Get orientation-aware prompt suffix
 */
export function getOrientationPromptSuffix(aspectRatio: AspectRatio): string {
  const orientation = getOrientation(aspectRatio);
  
  switch (orientation) {
    case 'portrait':
      return 'vertical social video, framed for mobile, 9:16 aspect ratio, center-focused composition, single subject emphasis';
    case 'square':
      return 'square format video, 1:1 aspect ratio, balanced composition, centered framing';
    case 'landscape':
    default:
      return 'landscape cinematic video, 16:9 widescreen, wide establishing shots, environmental detail';
  }
}

/**
 * Get framing suggestions based on aspect ratio
 */
export function getFramingSuggestions(aspectRatio: AspectRatio): string[] {
  const orientation = getOrientation(aspectRatio);
  
  switch (orientation) {
    case 'portrait':
      return [
        'Close-up shots',
        'Single subject focus',
        'Vertical movement (tilt)',
        'Rule of thirds: center column',
        'Face/body filling frame',
      ];
    case 'square':
      return [
        'Centered composition',
        'Symmetrical framing',
        'Equal headroom/footroom',
        'Corner-to-corner diagonals',
        'Circular compositions',
      ];
    case 'landscape':
    default:
      return [
        'Wide establishing shots',
        'Horizon line placement',
        'Pan movements',
        'Multiple subjects',
        'Environmental context',
      ];
  }
}

// ==================== EXPORT ====================

export default {
  ASPECT_RATIOS,
  RESOLUTIONS,
  calculateDimensions,
  getPresetDimensions,
  getOrientation,
  fitsWithinPlatform,
  PlatformProfileService,
  getAspectAwareStorageKey,
  getQualityAwareStorageKey,
  getOrientationPromptSuffix,
  getFramingSuggestions,
};
