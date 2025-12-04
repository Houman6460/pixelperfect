/**
 * Style Profiles Service
 * Manages director/animation/cinematic style profiles for Scenario & Timeline
 */

// ==================== TYPES ====================

export interface StyleProfile {
  id: string;
  type: 'director' | 'animation' | 'cinematic' | 'custom';
  label: string;
  description?: string;
  
  // Camera
  camera_default: string;
  camera_variants?: string[];
  camera_hints?: string[];
  
  // Motion
  motion_default: string;
  motion_variants?: string[];
  
  // Lighting
  lighting_profile?: string;
  lighting_hints?: string[];
  
  // Color
  color_grade?: string;
  color_hints?: string[];
  
  // Transitions
  transition_default: string;
  transition_hints?: string[];
  
  // Prompts
  prompt_hints: string[];
  negative_prompt_hints?: string[];
  
  // Composition
  composition_hints?: string[];
  
  // Pacing
  pacing: 'slow' | 'medium' | 'fast' | 'varied';
  
  // Visual
  visual_keywords: string[];
  
  // Enhancement
  enhance_profile: string;
  upscaler_preference?: string;
  
  // Metadata
  icon?: string;
  preview_image_url?: string;
}

// ==================== STYLE PROFILES REGISTRY ====================

export const STYLE_PROFILES: StyleProfile[] = [
  // ==================== DIRECTOR STYLES ====================
  {
    id: 'director-wes-anderson',
    type: 'director',
    label: 'Wes Anderson',
    description: 'Symmetrical compositions, pastel colors, whimsical aesthetics',
    camera_default: 'static',
    camera_hints: ['perfectly centered framing', 'symmetrical composition', 'tableau vivant staging'],
    motion_default: 'minimal',
    lighting_profile: 'soft-even',
    color_grade: 'pastel-saturated',
    transition_default: 'cut',
    prompt_hints: [
      'Wes Anderson style',
      'symmetrical framing',
      'pastel color palette',
      'whimsical aesthetic',
      'centered composition',
      'dollhouse staging'
    ],
    pacing: 'slow',
    visual_keywords: ['pastel', 'symmetry', 'whimsical', 'vintage', 'centered'],
    enhance_profile: 'clean',
    icon: '🎬',
  },
  {
    id: 'director-david-fincher',
    type: 'director',
    label: 'David Fincher',
    description: 'Dark, precise cinematography with desaturated colors',
    camera_default: 'dolly',
    camera_hints: ['precise camera movements', 'slow creeping dolly', 'controlled tracking shots'],
    motion_default: 'smooth',
    lighting_profile: 'low-key',
    color_grade: 'desaturated-green',
    transition_default: 'dissolve',
    prompt_hints: [
      'David Fincher style',
      'dark moody atmosphere',
      'desaturated color palette',
      'precision cinematography',
      'psychological intensity'
    ],
    pacing: 'slow',
    visual_keywords: ['dark', 'moody', 'desaturated', 'precise', 'tension'],
    enhance_profile: 'filmic',
    icon: '🎬',
  },
  {
    id: 'director-christopher-nolan',
    type: 'director',
    label: 'Christopher Nolan',
    description: 'IMAX-scale visuals, practical effects, time manipulation themes',
    camera_default: 'wide',
    camera_hints: ['IMAX-style wide shots', 'epic scale framing', 'practical cinematography'],
    motion_default: 'cinematic',
    lighting_profile: 'natural-dramatic',
    color_grade: 'rich-contrast',
    transition_default: 'cut',
    prompt_hints: [
      'Christopher Nolan style',
      'epic scale',
      'IMAX cinematography',
      'dramatic natural lighting',
      'practical effects aesthetic'
    ],
    pacing: 'medium',
    visual_keywords: ['epic', 'grand', 'intense', 'time', 'scale'],
    enhance_profile: 'clean',
    icon: '🎬',
  },
  {
    id: 'director-tarantino',
    type: 'director',
    label: 'Quentin Tarantino',
    description: 'Bold colors, intense dialogue scenes, stylized violence',
    camera_default: 'tracking',
    camera_hints: ['trunk shot perspective', 'low angle close-ups', 'long dialogue tracking'],
    motion_default: 'dynamic',
    lighting_profile: 'high-contrast',
    color_grade: 'saturated-bold',
    transition_default: 'cut',
    prompt_hints: [
      'Tarantino style',
      'bold saturated colors',
      'intense close-ups',
      'stylized cinematography',
      'pulp aesthetic'
    ],
    pacing: 'varied',
    visual_keywords: ['bold', 'saturated', 'intense', 'stylized', 'pulp'],
    enhance_profile: 'filmic',
    icon: '🎬',
  },
  {
    id: 'director-kubrick',
    type: 'director',
    label: 'Stanley Kubrick',
    description: 'One-point perspective, cold precision, unsettling symmetry',
    camera_default: 'tracking',
    camera_hints: ['one-point perspective', 'steady tracking shots', 'symmetrical framing'],
    motion_default: 'smooth',
    lighting_profile: 'cold-clinical',
    color_grade: 'neutral-cold',
    transition_default: 'fade',
    prompt_hints: [
      'Kubrick style',
      'one-point perspective',
      'cold clinical atmosphere',
      'unsettling symmetry',
      'sterile precision'
    ],
    pacing: 'slow',
    visual_keywords: ['cold', 'symmetry', 'precision', 'unsettling', 'clinical'],
    enhance_profile: 'clean',
    icon: '🎬',
  },
  {
    id: 'director-spielberg',
    type: 'director',
    label: 'Steven Spielberg',
    description: 'Emotional close-ups, lens flares, wonder and spectacle',
    camera_default: 'dolly',
    camera_hints: ['emotional reaction shots', 'lens flares', 'wonder reveal shots'],
    motion_default: 'smooth',
    lighting_profile: 'warm-golden',
    color_grade: 'warm-saturated',
    transition_default: 'dissolve',
    prompt_hints: [
      'Spielberg style',
      'emotional cinematography',
      'lens flares',
      'sense of wonder',
      'warm golden lighting',
      'heartfelt moments'
    ],
    pacing: 'medium',
    visual_keywords: ['warm', 'emotional', 'wonder', 'flare', 'heartfelt'],
    enhance_profile: 'clean',
    icon: '🎬',
  },
  {
    id: 'director-denis-villeneuve',
    type: 'director',
    label: 'Denis Villeneuve',
    description: 'Slow, contemplative, vast landscapes, minimal dialogue',
    camera_default: 'wide',
    camera_hints: ['vast landscape establishing shots', 'slow contemplative movements', 'minimalist framing'],
    motion_default: 'minimal',
    lighting_profile: 'natural-atmospheric',
    color_grade: 'muted-earthy',
    transition_default: 'dissolve',
    prompt_hints: [
      'Denis Villeneuve style',
      'contemplative pacing',
      'vast landscapes',
      'atmospheric cinematography',
      'minimal dialogue visual storytelling'
    ],
    pacing: 'slow',
    visual_keywords: ['vast', 'contemplative', 'atmospheric', 'minimal', 'earthy'],
    enhance_profile: 'filmic',
    icon: '🎬',
  },

  // ==================== ANIMATION STYLES ====================
  {
    id: 'anime-ghibli',
    type: 'animation',
    label: 'Studio Ghibli',
    description: 'Hand-drawn look, lush environments, magical realism',
    camera_default: 'pan',
    motion_default: 'gentle',
    lighting_profile: 'soft-natural',
    color_grade: 'warm-nostalgic',
    transition_default: 'dissolve',
    prompt_hints: [
      'Studio Ghibli style',
      'hand-drawn animation aesthetic',
      'lush detailed backgrounds',
      'magical realism',
      'warm nostalgic colors',
      'soft natural lighting'
    ],
    pacing: 'slow',
    visual_keywords: ['ghibli', 'hand-drawn', 'lush', 'magical', 'nostalgic', 'warmth'],
    enhance_profile: 'anime',
    icon: '🎨',
  },
  {
    id: 'anime-cyberpunk',
    type: 'animation',
    label: 'Cyberpunk Anime',
    description: 'Neon-lit, futuristic, high contrast anime style',
    camera_default: 'tracking',
    motion_default: 'dynamic',
    lighting_profile: 'neon-high-contrast',
    color_grade: 'neon-saturated',
    transition_default: 'cut',
    prompt_hints: [
      'cyberpunk anime style',
      'neon lighting',
      'futuristic cityscape',
      'high contrast',
      'rain-slicked streets',
      'holographic advertisements'
    ],
    pacing: 'fast',
    visual_keywords: ['neon', 'cyberpunk', 'futuristic', 'rain', 'holographic', 'contrast'],
    enhance_profile: 'anime',
    icon: '🎨',
  },
  {
    id: 'anime-shonen',
    type: 'animation',
    label: 'Shonen Action',
    description: 'Dynamic action, speed lines, dramatic poses',
    camera_default: 'dynamic',
    motion_default: 'fast',
    lighting_profile: 'dramatic-high',
    color_grade: 'vivid-saturated',
    transition_default: 'cut',
    prompt_hints: [
      'shonen anime style',
      'dynamic action poses',
      'speed lines',
      'dramatic lighting',
      'intense expressions',
      'power aura effects'
    ],
    pacing: 'fast',
    visual_keywords: ['action', 'dynamic', 'speed', 'dramatic', 'intense', 'power'],
    enhance_profile: 'anime',
    icon: '🎨',
  },
  {
    id: 'pixar-3d',
    type: 'animation',
    label: 'Pixar 3D Animation',
    description: 'Polished 3D, expressive characters, vibrant colors',
    camera_default: 'dolly',
    motion_default: 'smooth',
    lighting_profile: 'soft-cinematic',
    color_grade: 'vibrant-clean',
    transition_default: 'dissolve',
    prompt_hints: [
      'Pixar animation style',
      'polished 3D rendering',
      'expressive characters',
      'vibrant colors',
      'emotional storytelling',
      'soft cinematic lighting'
    ],
    pacing: 'medium',
    visual_keywords: ['pixar', '3D', 'polished', 'expressive', 'vibrant', 'emotional'],
    enhance_profile: 'clean',
    icon: '🎨',
  },
  {
    id: 'cartoon-classic',
    type: 'animation',
    label: 'Classic Cartoon',
    description: 'Exaggerated expressions, squash and stretch, bold outlines',
    camera_default: 'static',
    motion_default: 'exaggerated',
    lighting_profile: 'flat-bright',
    color_grade: 'primary-bold',
    transition_default: 'cut',
    prompt_hints: [
      'classic cartoon style',
      'exaggerated expressions',
      'squash and stretch',
      'bold outlines',
      'bright primary colors',
      'slapstick energy'
    ],
    pacing: 'fast',
    visual_keywords: ['cartoon', 'exaggerated', 'bold', 'bright', 'slapstick', 'fun'],
    enhance_profile: 'clean',
    icon: '🎨',
  },

  // ==================== CINEMATIC STYLES ====================
  {
    id: 'noir',
    type: 'cinematic',
    label: 'Film Noir',
    description: 'High contrast, shadows, mysterious atmosphere',
    camera_default: 'static',
    motion_default: 'minimal',
    lighting_profile: 'low-key-dramatic',
    color_grade: 'black-white-high-contrast',
    transition_default: 'dissolve',
    prompt_hints: [
      'film noir style',
      'high contrast black and white',
      'dramatic shadows',
      'venetian blind lighting',
      'mysterious atmosphere',
      'femme fatale aesthetic'
    ],
    pacing: 'slow',
    visual_keywords: ['noir', 'shadows', 'contrast', 'mystery', 'black-white', 'dramatic'],
    enhance_profile: 'grainy',
    icon: '🎞️',
  },
  {
    id: 'neo-noir',
    type: 'cinematic',
    label: 'Neo-Noir',
    description: 'Modern noir with neon accents and urban grit',
    camera_default: 'tracking',
    motion_default: 'smooth',
    lighting_profile: 'mixed-neon',
    color_grade: 'desaturated-neon-accents',
    transition_default: 'cut',
    prompt_hints: [
      'neo-noir style',
      'neon accents in darkness',
      'urban grit',
      'rain-soaked streets',
      'moral ambiguity',
      'modern noir aesthetic'
    ],
    pacing: 'medium',
    visual_keywords: ['neo-noir', 'neon', 'urban', 'rain', 'gritty', 'modern'],
    enhance_profile: 'filmic',
    icon: '🎞️',
  },
  {
    id: 'surreal',
    type: 'cinematic',
    label: 'Surrealist',
    description: 'Dreamlike, impossible geometries, symbolic imagery',
    camera_default: 'static',
    motion_default: 'minimal',
    lighting_profile: 'otherworldly',
    color_grade: 'dreamlike-muted',
    transition_default: 'morph',
    prompt_hints: [
      'surrealist style',
      'dreamlike atmosphere',
      'impossible geometries',
      'symbolic imagery',
      'Dali-esque',
      'subconscious visions'
    ],
    pacing: 'slow',
    visual_keywords: ['surreal', 'dream', 'impossible', 'symbolic', 'abstract', 'subconscious'],
    enhance_profile: 'clean',
    icon: '🎞️',
  },
  {
    id: 'retro-80s',
    type: 'cinematic',
    label: 'Retro 80s',
    description: 'Synthwave aesthetics, neon grids, VHS texture',
    camera_default: 'zoom',
    motion_default: 'smooth',
    lighting_profile: 'neon-sunset',
    color_grade: 'synthwave-gradient',
    transition_default: 'wipe',
    prompt_hints: [
      '80s retro aesthetic',
      'synthwave style',
      'neon grids',
      'sunset gradients',
      'VHS texture',
      'chrome reflections',
      'palm trees silhouette'
    ],
    pacing: 'medium',
    visual_keywords: ['80s', 'synthwave', 'neon', 'retro', 'VHS', 'chrome', 'sunset'],
    enhance_profile: 'grainy',
    icon: '🎞️',
  },
  {
    id: 'documentary',
    type: 'cinematic',
    label: 'Documentary',
    description: 'Naturalistic, handheld, observational',
    camera_default: 'handheld',
    motion_default: 'natural',
    lighting_profile: 'natural-available',
    color_grade: 'natural-minimal',
    transition_default: 'cut',
    prompt_hints: [
      'documentary style',
      'naturalistic lighting',
      'handheld camera',
      'observational cinematography',
      'authentic moments',
      'fly on wall perspective'
    ],
    pacing: 'medium',
    visual_keywords: ['documentary', 'natural', 'handheld', 'authentic', 'observational', 'real'],
    enhance_profile: 'clean',
    icon: '🎞️',
  },
  {
    id: 'horror',
    type: 'cinematic',
    label: 'Horror',
    description: 'Dark, unsettling, tension-building compositions',
    camera_default: 'slow-push',
    motion_default: 'creeping',
    lighting_profile: 'low-key-unsettling',
    color_grade: 'desaturated-cold',
    transition_default: 'cut',
    prompt_hints: [
      'horror style',
      'unsettling atmosphere',
      'creeping dread',
      'dark shadows',
      'cold desaturated colors',
      'tension-building cinematography'
    ],
    pacing: 'slow',
    visual_keywords: ['horror', 'dark', 'unsettling', 'tension', 'cold', 'dread'],
    enhance_profile: 'grainy',
    icon: '🎞️',
  },
  {
    id: 'romantic',
    type: 'cinematic',
    label: 'Romantic',
    description: 'Soft focus, warm tones, intimate framing',
    camera_default: 'dolly',
    motion_default: 'gentle',
    lighting_profile: 'soft-warm',
    color_grade: 'warm-soft-glow',
    transition_default: 'dissolve',
    prompt_hints: [
      'romantic style',
      'soft focus',
      'warm golden tones',
      'intimate close-ups',
      'lens flares',
      'dreamy atmosphere',
      'golden hour lighting'
    ],
    pacing: 'slow',
    visual_keywords: ['romantic', 'soft', 'warm', 'intimate', 'golden', 'dreamy'],
    enhance_profile: 'clean',
    icon: '🎞️',
  },
  {
    id: 'epic-fantasy',
    type: 'cinematic',
    label: 'Epic Fantasy',
    description: 'Grand vistas, dramatic lighting, mythical atmosphere',
    camera_default: 'crane',
    motion_default: 'cinematic',
    lighting_profile: 'dramatic-golden',
    color_grade: 'rich-saturated',
    transition_default: 'dissolve',
    prompt_hints: [
      'epic fantasy style',
      'grand sweeping vistas',
      'dramatic sky',
      'mythical atmosphere',
      'majestic landscapes',
      'heroic lighting'
    ],
    pacing: 'medium',
    visual_keywords: ['epic', 'fantasy', 'grand', 'mythical', 'majestic', 'heroic'],
    enhance_profile: 'clean',
    icon: '🎞️',
  },
  {
    id: 'sci-fi-clean',
    type: 'cinematic',
    label: 'Clean Sci-Fi',
    description: 'Minimalist futuristic, white spaces, sleek design',
    camera_default: 'dolly',
    motion_default: 'smooth',
    lighting_profile: 'soft-clinical',
    color_grade: 'cool-clinical',
    transition_default: 'dissolve',
    prompt_hints: [
      'clean sci-fi aesthetic',
      'minimalist futuristic design',
      'white spaces',
      'sleek technology',
      'sterile environments',
      'blue accents'
    ],
    pacing: 'medium',
    visual_keywords: ['sci-fi', 'clean', 'minimalist', 'futuristic', 'sleek', 'white'],
    enhance_profile: 'clean',
    icon: '🎞️',
  },
];

// ==================== HELPER FUNCTIONS ====================

/**
 * Get all style profiles
 */
export function getAllStyleProfiles(): StyleProfile[] {
  return STYLE_PROFILES;
}

/**
 * Get style profiles by type
 */
export function getStyleProfilesByType(type: StyleProfile['type']): StyleProfile[] {
  return STYLE_PROFILES.filter(s => s.type === type);
}

/**
 * Get style profile by ID
 */
export function getStyleProfileById(id: string): StyleProfile | undefined {
  return STYLE_PROFILES.find(s => s.id === id);
}

/**
 * Get grouped style profiles for UI
 */
export function getGroupedStyleProfiles(): Record<string, StyleProfile[]> {
  return {
    director: getStyleProfilesByType('director'),
    animation: getStyleProfilesByType('animation'),
    cinematic: getStyleProfilesByType('cinematic'),
  };
}

/**
 * Build style prompt additions for a given style
 */
export function buildStylePromptAdditions(styleId: string, customPrompt?: string): string {
  const style = getStyleProfileById(styleId);
  if (!style && !customPrompt) return '';
  
  const hints: string[] = [];
  
  if (style) {
    hints.push(...style.prompt_hints);
    if (style.camera_hints) hints.push(...style.camera_hints.slice(0, 2));
    if (style.lighting_profile) hints.push(`${style.lighting_profile} lighting`);
    if (style.color_grade) hints.push(`${style.color_grade} color grading`);
  }
  
  if (customPrompt) {
    hints.push(customPrompt);
  }
  
  return hints.join(', ');
}

/**
 * Map style to segment settings
 */
export function mapStyleToSegmentSettings(styleId: string): {
  motion_profile: string;
  camera_path: string;
  transition_type: string;
  style_preset: string;
} {
  const style = getStyleProfileById(styleId);
  if (!style) {
    return {
      motion_profile: 'smooth',
      camera_path: 'static',
      transition_type: 'cut',
      style_preset: 'cinematic',
    };
  }
  
  // Map style to standard segment settings
  const motionMap: Record<string, string> = {
    'minimal': 'subtle',
    'smooth': 'smooth',
    'dynamic': 'dynamic',
    'cinematic': 'cinematic',
    'gentle': 'gentle',
    'fast': 'dynamic',
    'exaggerated': 'dynamic',
    'creeping': 'subtle',
    'natural': 'smooth',
  };
  
  const cameraMap: Record<string, string> = {
    'static': 'static',
    'dolly': 'dolly',
    'tracking': 'tracking',
    'wide': 'static',
    'pan': 'pan',
    'zoom': 'zoom',
    'handheld': 'handheld',
    'crane': 'crane',
    'dynamic': 'tracking',
    'slow-push': 'dolly',
  };
  
  // Map enhance_profile to style_preset
  const stylePresetMap: Record<string, string> = {
    'clean': 'cinematic',
    'filmic': 'cinematic',
    'grainy': 'vintage',
    'anime': 'anime',
  };
  
  return {
    motion_profile: motionMap[style.motion_default] || 'smooth',
    camera_path: cameraMap[style.camera_default] || 'static',
    transition_type: style.transition_default || 'cut',
    style_preset: stylePresetMap[style.enhance_profile] || 'cinematic',
  };
}

/**
 * Build AI system prompt for style-aware scenario improvement
 */
export function buildStyleAwareSystemPrompt(styleId: string, customPrompt?: string): string {
  const style = getStyleProfileById(styleId);
  
  let styleInstructions = '';
  
  if (style) {
    styleInstructions = `
STYLE PROFILE: ${style.label}
${style.description ? `Description: ${style.description}` : ''}

VISUAL STYLE REQUIREMENTS:
- Camera: ${style.camera_default} as default. Hints: ${style.camera_hints?.join(', ') || 'none'}
- Motion: ${style.motion_default}
- Lighting: ${style.lighting_profile || 'natural'}
- Color grade: ${style.color_grade || 'neutral'}
- Pacing: ${style.pacing}
- Transitions: prefer ${style.transition_default}

STYLE KEYWORDS TO INCORPORATE:
${style.visual_keywords.join(', ')}

PROMPT HINTS (use these phrases naturally):
${style.prompt_hints.join('\n- ')}

APPLY THIS STYLE CONSISTENTLY across all scenes. Inject appropriate inline tags:
[style: ${styleId}], [camera: ${style.camera_default}], [lighting: ${style.lighting_profile}], [color-grade: ${style.color_grade}], [pacing: ${style.pacing}]
`;
  }
  
  if (customPrompt) {
    styleInstructions += `\n\nCUSTOM STYLE INSTRUCTIONS:\n${customPrompt}`;
  }
  
  return styleInstructions;
}

// ==================== KV CACHE FUNCTIONS ====================

/**
 * Initialize style profiles in KV cache
 */
export async function initializeStylesInKV(cacheKV: KVNamespace): Promise<{
  success: boolean;
  count: number;
}> {
  try {
    await cacheKV.put('styles:list', JSON.stringify(STYLE_PROFILES), {
      expirationTtl: 86400, // 24 hours
    });
    
    // Also cache by type
    const grouped = getGroupedStyleProfiles();
    for (const [type, profiles] of Object.entries(grouped)) {
      await cacheKV.put(`styles:type:${type}`, JSON.stringify(profiles), {
        expirationTtl: 86400,
      });
    }
    
    return { success: true, count: STYLE_PROFILES.length };
  } catch (error) {
    console.error('Failed to initialize styles in KV:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Get style profiles from KV (with fallback to hardcoded)
 */
export async function getStylesFromKV(cacheKV: KVNamespace): Promise<StyleProfile[]> {
  try {
    const cached = await cacheKV.get<StyleProfile[]>('styles:list', 'json');
    if (cached) return cached;
  } catch (e) {
    console.warn('KV cache miss for styles');
  }
  return STYLE_PROFILES;
}

export default {
  STYLE_PROFILES,
  getAllStyleProfiles,
  getStyleProfilesByType,
  getStyleProfileById,
  getGroupedStyleProfiles,
  buildStylePromptAdditions,
  mapStyleToSegmentSettings,
  buildStyleAwareSystemPrompt,
  initializeStylesInKV,
  getStylesFromKV,
};
