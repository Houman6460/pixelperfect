/**
 * Segment Auto-Configuration Service
 * 
 * Converts scenario inline tags into segment settings automatically.
 * Applies model constraints and generates complete segment configurations.
 */

import { getModelCapabilities } from './modelRegistry';

// ==================== TYPE DEFINITIONS ====================

export interface InlineTag {
  type: string;
  value: string;
  offset: number;
}

export interface SegmentSettings {
  // Core settings
  prompt: string;
  final_prompt?: string;
  negative_prompt?: string;
  duration_sec: number;
  
  // Motion & Camera
  motion: 'smooth' | 'slow' | 'dynamic' | 'jitter' | 'none' | 'fast' | 'cinematic';
  camera: 'static' | 'close-up' | 'wide' | 'dolly-in' | 'dolly-out' | 'tracking' | 'fpv' | 'crane' | 'pan' | 'tilt' | 'orbit' | 'handheld';
  
  // Transitions & Style
  transition: 'fade' | 'cut' | 'cross' | 'dissolve' | 'wipe' | 'none';
  style_preset: 'none' | 'cinematic' | 'realistic' | 'dreamy' | 'anime' | 'vintage' | 'noir';
  
  // Enhancement
  enhance_enabled: boolean;
  enhance_model?: string;
  
  // Technical
  seed?: number;
  model_id: string;
  
  // First frame linking
  first_frame_mode: 'auto' | 'manual' | 'none';
  first_frame_url?: string;
  
  // Metadata from tags
  inline_tags: { type: string; value: string }[];
  tag_metadata: Record<string, string>;
  
  // Scene info
  scene_id?: string;
  scene_number?: number;
  emotion?: string;
  lighting?: string;
  sfx_cue?: string;
}

export interface ModelConstraints {
  maxDurationSec: number;
  minDurationSec: number;
  supportsAudio: boolean;
  supportedMotions: string[];
  supportedCameras: string[];
  supportedStyles: string[];
  inputType: 'text' | 'image' | 'both';
  safetyRules: string[];
}

// ==================== TAG TO SETTING MAPPINGS ====================

const CAMERA_TAG_MAP: Record<string, SegmentSettings['camera']> = {
  'close-up': 'close-up',
  'extreme-close-up': 'close-up',
  'wide': 'wide',
  'extreme-wide': 'wide',
  'medium-shot': 'static',
  'dolly-in': 'dolly-in',
  'dolly-out': 'dolly-out',
  'push-in': 'dolly-in',
  'pull-out': 'dolly-out',
  'tracking': 'tracking',
  'pan-left': 'pan',
  'pan-right': 'pan',
  'tilt-up': 'tilt',
  'tilt-down': 'tilt',
  'crane-up': 'crane',
  'crane-down': 'crane',
  'fpv': 'fpv',
  '360-orbit': 'orbit',
  'arc-shot': 'orbit',
  'static': 'static',
  'handheld': 'handheld',
  'gimbal-smooth': 'tracking',
  'aerial': 'crane',
  'low-angle': 'static',
  'high-angle': 'static',
  'pov': 'fpv',
  'over-shoulder': 'static',
  'two-shot': 'static',
};

const MOTION_TAG_MAP: Record<string, SegmentSettings['motion']> = {
  'smooth': 'smooth',
  'slow': 'slow',
  'fast': 'fast',
  'dynamic': 'dynamic',
  'jitter': 'jitter',
  'none': 'none',
  'cinematic': 'cinematic',
  'static': 'none',
  'flowing': 'smooth',
  'building': 'dynamic',
  'frenetic': 'fast',
  'hypnotic': 'slow',
  'meditative': 'slow',
  'explosive': 'fast',
  'abrupt': 'jitter',
};

const TRANSITION_TAG_MAP: Record<string, SegmentSettings['transition']> = {
  'cut': 'cut',
  'crossfade': 'cross',
  'dissolve': 'dissolve',
  'wipe': 'wipe',
  'fade-to-black': 'fade',
  'fade-from-black': 'fade',
  'fade-to-white': 'fade',
  'fade': 'fade',
  'match-cut': 'cut',
  'jump-cut': 'cut',
  'whip-pan': 'cut',
  'morph': 'dissolve',
  'zoom-transition': 'cross',
  'glitch-cut': 'cut',
  'flash': 'fade',
  'blur-transition': 'dissolve',
  'none': 'none',
};

const STYLE_TAG_MAP: Record<string, SegmentSettings['style_preset']> = {
  'cinematic': 'cinematic',
  'realistic': 'realistic',
  'dreamy': 'dreamy',
  'anime': 'anime',
  'vintage': 'vintage',
  'noir': 'noir',
  'documentary': 'realistic',
  'music-video': 'cinematic',
  'commercial': 'cinematic',
  'art-film': 'dreamy',
  'ghibli': 'anime',
  'pixar-style': 'cinematic',
  'grindhouse': 'vintage',
  'film-photography': 'vintage',
  'polaroid': 'vintage',
  'modern': 'realistic',
  'minimalist': 'realistic',
  'hyperreal': 'realistic',
  'abstract': 'dreamy',
  'surreal': 'dreamy',
};

const MOOD_TO_MOTION: Record<string, SegmentSettings['motion']> = {
  'calm': 'slow',
  'peaceful': 'slow',
  'serene': 'slow',
  'tense': 'dynamic',
  'dramatic': 'cinematic',
  'suspenseful': 'slow',
  'mysterious': 'slow',
  'eerie': 'slow',
  'melancholic': 'slow',
  'nostalgic': 'smooth',
  'hopeful': 'smooth',
  'joyful': 'dynamic',
  'romantic': 'smooth',
  'intense': 'fast',
  'chaotic': 'jitter',
  'lonely': 'slow',
  'triumphant': 'cinematic',
  'ominous': 'slow',
  'whimsical': 'smooth',
  'dreamy': 'slow',
  'energetic': 'fast',
  'contemplative': 'slow',
  'anxious': 'jitter',
  'epic': 'cinematic',
};

// ==================== CORE FUNCTIONS ====================

/**
 * Get model constraints for a given model ID
 */
export function getModelConstraints(modelId: string): ModelConstraints {
  const model = getModelCapabilities(modelId);
  
  // Determine if model supports audio based on dialogue support
  const supportsAudio = model.supportsDialogue === 'full';
  
  // Determine input type based on model ID patterns
  let inputType: 'text' | 'image' | 'both' = 'text';
  const lowerModelId = modelId.toLowerCase();
  if (lowerModelId.includes('i2v') || lowerModelId.includes('img2vid')) {
    inputType = 'image';
  } else if (lowerModelId.includes('t2v') && lowerModelId.includes('i2v')) {
    inputType = 'both';
  }
  
  return {
    maxDurationSec: model.maxDurationSec,
    minDurationSec: 2, // Default minimum duration
    supportsAudio,
    supportedMotions: ['smooth', 'slow', 'dynamic', 'jitter', 'none', 'fast', 'cinematic'],
    supportedCameras: ['static', 'close-up', 'wide', 'dolly-in', 'dolly-out', 'tracking', 'fpv', 'crane', 'pan', 'tilt', 'orbit', 'handheld'],
    supportedStyles: ['none', 'cinematic', 'realistic', 'dreamy', 'anime', 'vintage', 'noir'],
    inputType,
    safetyRules: [],
  };
}

/**
 * Map inline tags to segment settings
 */
export function mapTagsToSettings(tags: InlineTag[]): Partial<SegmentSettings> {
  const settings: Partial<SegmentSettings> = {
    inline_tags: tags.map(t => ({ type: t.type, value: t.value })),
    tag_metadata: {},
  };
  
  for (const tag of tags) {
    const { type, value } = tag;
    const lowerValue = value.toLowerCase();
    
    switch (type.toLowerCase()) {
      case 'camera':
        if (CAMERA_TAG_MAP[lowerValue]) {
          settings.camera = CAMERA_TAG_MAP[lowerValue];
          settings.tag_metadata!.camera = value;
        }
        break;
        
      case 'motion':
      case 'pace':
        if (MOTION_TAG_MAP[lowerValue]) {
          settings.motion = MOTION_TAG_MAP[lowerValue];
          settings.tag_metadata!.motion = value;
        }
        break;
        
      case 'transition':
        if (TRANSITION_TAG_MAP[lowerValue]) {
          settings.transition = TRANSITION_TAG_MAP[lowerValue];
          settings.tag_metadata!.transition = value;
        }
        break;
        
      case 'style':
        if (STYLE_TAG_MAP[lowerValue]) {
          settings.style_preset = STYLE_TAG_MAP[lowerValue];
          settings.tag_metadata!.style = value;
        }
        break;
        
      case 'mood':
        settings.emotion = value;
        settings.tag_metadata!.mood = value;
        // Also influence motion based on mood
        if (MOOD_TO_MOTION[lowerValue] && !settings.motion) {
          settings.motion = MOOD_TO_MOTION[lowerValue];
        }
        break;
        
      case 'lighting':
        settings.lighting = value;
        settings.tag_metadata!.lighting = value;
        break;
        
      case 'fx':
        settings.tag_metadata!.fx = value;
        // Enable enhancement for certain effects
        if (['slow-motion', 'time-lapse', 'speed-ramp'].includes(lowerValue)) {
          settings.enhance_enabled = true;
        }
        break;
        
      case 'sfx':
        settings.sfx_cue = value;
        settings.tag_metadata!.sfx = value;
        break;
        
      case 'genre':
        settings.tag_metadata!.genre = value;
        // Map certain genres to styles
        if (['noir', 'cyberpunk'].includes(lowerValue)) {
          settings.style_preset = 'noir';
        } else if (['anime', 'animation'].includes(lowerValue)) {
          settings.style_preset = 'anime';
        } else if (['documentary', 'realism'].includes(lowerValue)) {
          settings.style_preset = 'realistic';
        }
        break;
        
      case 'weather':
        settings.tag_metadata!.weather = value;
        break;
        
      case 'lens':
        settings.tag_metadata!.lens = value;
        break;
    }
  }
  
  return settings;
}

/**
 * Generate a complete segment configuration with defaults
 */
export function createDefaultSegmentSettings(
  modelId: string,
  segmentIndex: number,
  totalSegments: number
): SegmentSettings {
  const constraints = getModelConstraints(modelId);
  
  return {
    prompt: '',
    negative_prompt: generateDefaultNegativePrompt(),
    duration_sec: Math.min(5, constraints.maxDurationSec),
    motion: 'smooth',
    camera: 'static',
    transition: segmentIndex === totalSegments - 1 ? 'fade' : 'cut',
    style_preset: 'cinematic',
    enhance_enabled: false,
    seed: Math.floor(Math.random() * 2147483647),
    model_id: modelId,
    first_frame_mode: segmentIndex === 0 ? 'none' : 'auto',
    inline_tags: [],
    tag_metadata: {},
  };
}

/**
 * Generate default negative prompt for video generation
 */
export function generateDefaultNegativePrompt(): string {
  return [
    'blurry',
    'distorted',
    'low quality',
    'watermark',
    'text overlay',
    'extra limbs',
    'deformed',
    'flickering',
    'inconsistent lighting',
    'jarring cuts',
    'unnatural motion',
  ].join(', ');
}

/**
 * Generate enhanced negative prompt based on scene content
 */
export function generateEnhancedNegativePrompt(
  sceneContent: string,
  tags: InlineTag[]
): string {
  const base = generateDefaultNegativePrompt().split(', ');
  const additional: string[] = [];
  
  // Add scene-specific negatives
  const lowerContent = sceneContent.toLowerCase();
  
  if (lowerContent.includes('person') || lowerContent.includes('character') || lowerContent.includes('human')) {
    additional.push('bad anatomy', 'wrong proportions', 'clone artifacts');
  }
  
  if (lowerContent.includes('face') || lowerContent.includes('portrait')) {
    additional.push('asymmetric eyes', 'distorted face', 'uncanny valley');
  }
  
  if (lowerContent.includes('text') || lowerContent.includes('sign') || lowerContent.includes('logo')) {
    additional.push('misspelled text', 'gibberish text', 'wrong letters');
  }
  
  // Style-specific negatives
  const styleTag = tags.find(t => t.type === 'style');
  if (styleTag) {
    if (styleTag.value === 'realistic') {
      additional.push('cartoon', 'anime style', 'stylized');
    } else if (styleTag.value === 'anime') {
      additional.push('photorealistic', 'hyperreal');
    }
  }
  
  return [...base, ...additional].join(', ');
}

/**
 * Apply model constraints to segment settings
 */
export function applyModelConstraints(
  settings: SegmentSettings,
  modelId: string
): SegmentSettings {
  const constraints = getModelConstraints(modelId);
  
  // Clamp duration
  settings.duration_sec = Math.max(
    constraints.minDurationSec,
    Math.min(settings.duration_sec, constraints.maxDurationSec)
  );
  
  // Validate motion
  if (!constraints.supportedMotions.includes(settings.motion)) {
    settings.motion = 'smooth';
  }
  
  // Validate style
  if (!constraints.supportedStyles.includes(settings.style_preset)) {
    settings.style_preset = 'cinematic';
  }
  
  return settings;
}

/**
 * Merge tag-based settings with defaults, applying constraints
 */
export function mergeSegmentSettings(
  defaults: SegmentSettings,
  tagSettings: Partial<SegmentSettings>,
  prompt: string,
  modelId: string
): SegmentSettings {
  const merged: SegmentSettings = {
    ...defaults,
    ...tagSettings,
    prompt,
    model_id: modelId,
    inline_tags: tagSettings.inline_tags || [],
    tag_metadata: tagSettings.tag_metadata || {},
  };
  
  // Generate enhanced negative prompt
  merged.negative_prompt = generateEnhancedNegativePrompt(
    prompt,
    merged.inline_tags.map(t => ({ ...t, offset: 0 }))
  );
  
  // Apply model constraints
  return applyModelConstraints(merged, modelId);
}

/**
 * Infer settings from prompt content when no tags are present
 */
export function inferSettingsFromPrompt(prompt: string): Partial<SegmentSettings> {
  const settings: Partial<SegmentSettings> = {};
  const lowerPrompt = prompt.toLowerCase();
  
  // Infer motion from action words
  if (/\b(run|chase|fight|explode|crash|race)\b/.test(lowerPrompt)) {
    settings.motion = 'fast';
  } else if (/\b(slowly|gentle|calm|peaceful|quiet|still)\b/.test(lowerPrompt)) {
    settings.motion = 'slow';
  } else if (/\b(dramatic|intense|powerful|epic)\b/.test(lowerPrompt)) {
    settings.motion = 'cinematic';
  }
  
  // Infer camera from descriptions
  if (/\b(close[- ]?up|face|eyes|detail)\b/.test(lowerPrompt)) {
    settings.camera = 'close-up';
  } else if (/\b(wide|landscape|vista|panorama|vast)\b/.test(lowerPrompt)) {
    settings.camera = 'wide';
  } else if (/\b(follow|chase|track|pursue)\b/.test(lowerPrompt)) {
    settings.camera = 'tracking';
  } else if (/\b(fly|aerial|above|bird[- ]?eye)\b/.test(lowerPrompt)) {
    settings.camera = 'crane';
  }
  
  // Infer style from mood words
  if (/\b(dream|fantasy|surreal|magical|ethereal)\b/.test(lowerPrompt)) {
    settings.style_preset = 'dreamy';
  } else if (/\b(noir|shadow|dark|mystery|detective)\b/.test(lowerPrompt)) {
    settings.style_preset = 'noir';
  } else if (/\b(anime|cartoon|animated)\b/.test(lowerPrompt)) {
    settings.style_preset = 'anime';
  } else if (/\b(old|vintage|retro|classic|film)\b/.test(lowerPrompt)) {
    settings.style_preset = 'vintage';
  } else if (/\b(real|authentic|documentary|true)\b/.test(lowerPrompt)) {
    settings.style_preset = 'realistic';
  }
  
  // Infer enhancement need
  if (/\b(action|vfx|explosion|slow[- ]?motion|time[- ]?lapse)\b/.test(lowerPrompt)) {
    settings.enhance_enabled = true;
  }
  
  return settings;
}

/**
 * Calculate optimal segment durations based on content
 */
export function calculateOptimalDuration(
  promptLength: number,
  hasDialogue: boolean,
  tags: InlineTag[],
  modelConstraints: ModelConstraints
): number {
  // Base duration on prompt complexity
  let baseDuration = Math.min(5, Math.max(3, Math.floor(promptLength / 50)));
  
  // Add time for dialogue
  if (hasDialogue) {
    baseDuration += 2;
  }
  
  // Adjust for pace tags
  const paceTag = tags.find(t => t.type === 'pace');
  if (paceTag) {
    const pace = paceTag.value.toLowerCase();
    if (pace === 'slow' || pace === 'very-slow') {
      baseDuration = Math.ceil(baseDuration * 1.5);
    } else if (pace === 'fast' || pace === 'very-fast') {
      baseDuration = Math.ceil(baseDuration * 0.7);
    }
  }
  
  // Clamp to model constraints
  return Math.max(
    modelConstraints.minDurationSec,
    Math.min(baseDuration, modelConstraints.maxDurationSec)
  );
}

/**
 * Build a complete prompt with embedded style instructions
 */
export function buildEnhancedPrompt(
  basePrompt: string,
  settings: Partial<SegmentSettings>
): string {
  const parts: string[] = [basePrompt.trim()];
  
  // Add lighting instruction
  if (settings.lighting) {
    parts.push(`${settings.lighting} lighting`);
  }
  
  // Add camera instruction
  if (settings.camera && settings.camera !== 'static') {
    const cameraDescriptions: Record<string, string> = {
      'close-up': 'close-up shot',
      'wide': 'wide-angle shot',
      'dolly-in': 'camera slowly pushing in',
      'dolly-out': 'camera slowly pulling out',
      'tracking': 'tracking shot following the subject',
      'fpv': 'first-person perspective',
      'crane': 'sweeping crane shot',
      'pan': 'smooth panning shot',
      'tilt': 'tilting camera movement',
      'orbit': 'orbiting around the subject',
      'handheld': 'handheld camera style',
    };
    if (cameraDescriptions[settings.camera]) {
      parts.push(cameraDescriptions[settings.camera]);
    }
  }
  
  // Add motion quality
  if (settings.motion && settings.motion !== 'none') {
    const motionDescriptions: Record<string, string> = {
      'smooth': 'smooth fluid motion',
      'slow': 'slow deliberate movement',
      'fast': 'fast dynamic action',
      'dynamic': 'dynamic energetic movement',
      'cinematic': 'cinematic motion',
      'jitter': 'subtle camera shake',
    };
    if (motionDescriptions[settings.motion]) {
      parts.push(motionDescriptions[settings.motion]);
    }
  }
  
  // Add style
  if (settings.style_preset && settings.style_preset !== 'none') {
    parts.push(`${settings.style_preset} style`);
  }
  
  // Add mood/emotion
  if (settings.emotion) {
    parts.push(`${settings.emotion} atmosphere`);
  }
  
  return parts.join('. ') + '.';
}

export default {
  getModelConstraints,
  mapTagsToSettings,
  createDefaultSegmentSettings,
  generateDefaultNegativePrompt,
  generateEnhancedNegativePrompt,
  applyModelConstraints,
  mergeSegmentSettings,
  inferSettingsFromPrompt,
  calculateOptimalDuration,
  buildEnhancedPrompt,
};
