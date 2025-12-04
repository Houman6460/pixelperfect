/**
 * Cover Generation Service
 * AI-powered thumbnail generation using Nano Banana or similar models
 */

import {
  ChannelTemplate,
  GeneratedCover,
  CoverVariantSet,
  CoverGenerationRequest,
  CoverGenerationResponse,
  PublishedItem,
  SavePublishedRequest,
} from '../types/cover';
import { PublishPlatform } from '../types/gallery';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== CHANNEL TEMPLATE REGISTRY ====================

export const CHANNEL_TEMPLATES: Record<PublishPlatform, ChannelTemplate> = {
  youtube: {
    id: 'youtube-default',
    platform: 'youtube',
    name: 'YouTube Thumbnail',
    aspect_ratio: '16:9',
    width: 1280,
    height: 720,
    style: 'bright',
    color_preferences: {
      primary: '#FF0000',
      background: '#000000',
      text: '#FFFFFF',
    },
    composition: {
      character_position: 'right',
      text_position: 'left',
      safe_zone_percent: 10,
      max_objects: 3,
    },
    text_style: {
      font_family: 'Impact',
      font_weight: 'bold',
      text_transform: 'uppercase',
      shadow: true,
      outline: true,
      max_chars: 40,
    },
    overlay_style: {
      gradient: 'linear-gradient(135deg, rgba(0,0,0,0.3) 0%, transparent 50%)',
      vignette: true,
      blur_background: false,
    },
  },
  
  tiktok: {
    id: 'tiktok-default',
    platform: 'tiktok',
    name: 'TikTok Cover',
    aspect_ratio: '9:16',
    width: 1080,
    height: 1920,
    style: 'bold',
    color_preferences: {
      primary: '#00F2EA',
      secondary: '#FF0050',
      background: '#000000',
      text: '#FFFFFF',
    },
    composition: {
      character_position: 'center',
      text_position: 'bottom',
      safe_zone_percent: 15,
      max_objects: 1,
    },
    text_style: {
      font_family: 'Proxima Nova',
      font_weight: 'black',
      text_transform: 'none',
      shadow: true,
      outline: false,
      max_chars: 30,
    },
    overlay_style: {
      gradient: 'linear-gradient(0deg, rgba(0,0,0,0.7) 0%, transparent 40%)',
      vignette: false,
      blur_background: false,
    },
  },
  
  instagram: {
    id: 'instagram-default',
    platform: 'instagram',
    name: 'Instagram Reel Cover',
    aspect_ratio: '9:16',
    width: 1080,
    height: 1920,
    style: 'aesthetic',
    color_preferences: {
      primary: '#E1306C',
      secondary: '#833AB4',
      background: '#FAFAFA',
      text: '#262626',
    },
    composition: {
      character_position: 'center',
      text_position: 'none',
      safe_zone_percent: 10,
      max_objects: 2,
    },
    text_style: {
      font_family: 'Helvetica Neue',
      font_weight: 'normal',
      text_transform: 'none',
      shadow: false,
      outline: false,
      max_chars: 0, // No text on Instagram aesthetic covers
    },
    overlay_style: {
      vignette: true,
      blur_background: false,
    },
  },
  
  facebook: {
    id: 'facebook-default',
    platform: 'facebook',
    name: 'Facebook Video Cover',
    aspect_ratio: '16:9',
    width: 1280,
    height: 720,
    style: 'bright',
    color_preferences: {
      primary: '#1877F2',
      background: '#FFFFFF',
      text: '#1C1E21',
    },
    composition: {
      character_position: 'center',
      text_position: 'bottom',
      safe_zone_percent: 10,
      max_objects: 3,
    },
    text_style: {
      font_family: 'Segoe UI',
      font_weight: 'bold',
      text_transform: 'capitalize',
      shadow: true,
      outline: false,
      max_chars: 50,
    },
    overlay_style: {
      vignette: false,
      blur_background: false,
    },
  },
  
  vimeo: {
    id: 'vimeo-default',
    platform: 'vimeo',
    name: 'Vimeo Thumbnail',
    aspect_ratio: '16:9',
    width: 1280,
    height: 720,
    style: 'professional',
    color_preferences: {
      primary: '#1AB7EA',
      background: '#1A1A2E',
      text: '#FFFFFF',
    },
    composition: {
      character_position: 'center',
      text_position: 'none',
      safe_zone_percent: 5,
      max_objects: 2,
    },
    text_style: {
      font_family: 'Lato',
      font_weight: 'normal',
      text_transform: 'none',
      shadow: false,
      outline: false,
      max_chars: 60,
    },
    overlay_style: {
      vignette: true,
      blur_background: false,
    },
  },
  
  twitch: {
    id: 'twitch-default',
    platform: 'twitch',
    name: 'Twitch Thumbnail',
    aspect_ratio: '16:9',
    width: 1280,
    height: 720,
    style: 'gaming',
    color_preferences: {
      primary: '#9146FF',
      secondary: '#00FF7F',
      background: '#0E0E10',
      text: '#FFFFFF',
    },
    composition: {
      character_position: 'left',
      text_position: 'right',
      safe_zone_percent: 10,
      max_objects: 2,
    },
    text_style: {
      font_family: 'Roobert',
      font_weight: 'black',
      text_transform: 'uppercase',
      shadow: true,
      outline: true,
      max_chars: 30,
    },
    overlay_style: {
      gradient: 'linear-gradient(90deg, rgba(145,70,255,0.3) 0%, transparent 100%)',
      vignette: true,
      blur_background: false,
    },
  },
};

// ==================== COVER PROMPT GENERATION ====================

/**
 * Build Nano Banana prompt from scenario and template
 */
export function buildCoverPrompt(
  request: CoverGenerationRequest,
  template: ChannelTemplate
): string {
  const {
    scenario_summary,
    main_characters,
    visual_style,
    key_scene,
    dominant_colors,
    emotional_tone,
    title,
  } = request;

  const parts: string[] = [];

  // Style prefix
  parts.push(`Cinematic cover image, ${template.style} style`);
  
  // Aspect ratio
  parts.push(`${template.aspect_ratio} aspect ratio`);
  
  // Characters
  if (main_characters && main_characters.length > 0) {
    if (main_characters.length === 1) {
      parts.push(`main character: ${main_characters[0]}`);
    } else {
      parts.push(`featuring: ${main_characters.slice(0, template.composition.max_objects).join(', ')}`);
    }
  }
  
  // Character position
  if (template.composition.character_position !== 'none') {
    parts.push(`character positioned ${template.composition.character_position}`);
  }
  
  // Emotion
  parts.push(`emotion: ${emotional_tone}`);
  
  // Key scene
  if (key_scene) {
    parts.push(`scene: ${key_scene}`);
  }
  
  // Colors
  if (dominant_colors && dominant_colors.length > 0) {
    parts.push(`dominant colors: ${dominant_colors.join(', ')}`);
  } else if (template.color_preferences.primary) {
    parts.push(`color accent: ${template.color_preferences.primary}`);
  }
  
  // Visual style
  parts.push(`visual style: ${visual_style}`);
  
  // Platform-specific
  switch (template.platform) {
    case 'youtube':
      parts.push('eye-catching, high contrast, attention-grabbing');
      parts.push('dramatic lighting, sharp focus');
      break;
    case 'tiktok':
      parts.push('bold, vibrant, trendy, vertical composition');
      parts.push('high energy, dynamic');
      break;
    case 'instagram':
      parts.push('aesthetic, clean, minimalist, curated');
      parts.push('soft lighting, beautiful composition');
      break;
    case 'vimeo':
      parts.push('professional, cinematic, film-like');
      parts.push('artistic, refined, sophisticated');
      break;
    case 'twitch':
      parts.push('gaming aesthetic, neon accents, dark background');
      parts.push('energetic, bold, character-focused');
      break;
    case 'facebook':
      parts.push('engaging, shareable, clear composition');
      parts.push('bright, friendly, approachable');
      break;
  }
  
  // Quality
  parts.push('4K quality, professional photography, masterpiece');
  
  return parts.join(', ');
}

/**
 * Extract key info from scenario for cover generation
 */
export function extractScenarioInfo(scenario: string): {
  summary: string;
  characters: string[];
  key_scene: string;
  emotions: string[];
  colors: string[];
} {
  const words = scenario.toLowerCase();
  
  // Extract characters (names starting with capital in dialogue)
  const characterMatches = scenario.match(/^([A-Z][a-z]+):/gm);
  const characters = characterMatches 
    ? [...new Set(characterMatches.map(m => m.replace(':', '').trim()))]
    : [];
  
  // Extract emotions
  const emotionWords = [
    'happy', 'sad', 'angry', 'fearful', 'excited', 'calm', 'tense',
    'romantic', 'mysterious', 'dramatic', 'peaceful', 'anxious', 'joyful'
  ];
  const emotions = emotionWords.filter(e => words.includes(e));
  
  // Extract colors
  const colorWords = [
    'red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink',
    'gold', 'silver', 'black', 'white', 'dark', 'bright', 'neon'
  ];
  const colors = colorWords.filter(c => words.includes(c));
  
  // Get first scene as key scene
  const sceneMatch = scenario.match(/SCENE\s*\d*[:\s]*([^.]+\.)/i);
  const key_scene = sceneMatch ? sceneMatch[1].trim() : scenario.substring(0, 100);
  
  // Summary is first 200 chars
  const summary = scenario.replace(/\n/g, ' ').substring(0, 200).trim();
  
  return {
    summary,
    characters,
    key_scene,
    emotions,
    colors,
  };
}

// ==================== COVER GENERATION ====================

/**
 * Generate cover variants for multiple platforms
 */
export async function generateCovers(
  request: CoverGenerationRequest,
  replicateKey?: string
): Promise<CoverGenerationResponse> {
  const { project_id, platforms, scenario_summary } = request;
  const numVariants = 3; // Default to 3 variants
  
  const covers: Record<PublishPlatform, CoverVariantSet> = {} as any;
  const promptsUsed: Record<PublishPlatform, string> = {} as any;
  const warnings: string[] = [];
  
  for (const platform of platforms) {
    const template = CHANNEL_TEMPLATES[platform];
    if (!template) {
      warnings.push(`No template for platform: ${platform}`);
      continue;
    }
    
    const prompt = request.custom_prompt || buildCoverPrompt(request, template);
    promptsUsed[platform] = prompt;
    
    const variants: GeneratedCover[] = [];
    
    // Generate variants
    for (let i = 0; i < numVariants; i++) {
      // In production, this would call Nano Banana or another image model
      const coverUrl = await generateSingleCover(
        prompt,
        template.width,
        template.height,
        replicateKey
      );
      
      variants.push({
        id: `cover-${generateId()}`,
        project_id,
        platform,
        url: coverUrl,
        width: template.width,
        height: template.height,
        prompt_used: prompt,
        model_used: 'nano-banana', // or actual model
        variant_number: i + 1,
        style: template.style,
        dominant_colors: request.dominant_colors || [],
        has_text_overlay: false,
        is_selected: i === 0, // First variant selected by default
        created_at: new Date().toISOString(),
      });
    }
    
    covers[platform] = {
      id: `variant-set-${generateId()}`,
      project_id,
      platform,
      variants,
      selected_variant_id: variants[0]?.id,
      created_at: new Date().toISOString(),
    };
  }
  
  return {
    success: true,
    covers,
    prompts_used: promptsUsed,
    warnings,
  };
}

/**
 * Generate a single cover image (stub for actual API call)
 */
async function generateSingleCover(
  prompt: string,
  width: number,
  height: number,
  replicateKey?: string
): Promise<string> {
  // In production, this would call:
  // - Replicate's Nano Banana API
  // - Or DALL-E 3
  // - Or Stable Diffusion
  // - Or Midjourney API
  
  if (replicateKey) {
    try {
      // Placeholder for actual Replicate API call
      // const response = await fetch('https://api.replicate.com/v1/predictions', {...});
      console.log('Generating cover with prompt:', prompt.substring(0, 100) + '...');
    } catch (error) {
      console.error('Cover generation failed:', error);
    }
  }
  
  // Return placeholder for now
  const aspectSuffix = width > height ? 'landscape' : width < height ? 'portrait' : 'square';
  return `https://placehold.co/${width}x${height}/333/fff?text=Cover+${aspectSuffix}`;
}

/**
 * Score and auto-select best cover variant
 */
export function autoSelectBestCover(variants: GeneratedCover[]): GeneratedCover | null {
  if (variants.length === 0) return null;
  if (variants.length === 1) return variants[0];
  
  // Scoring criteria (would use actual image analysis in production):
  // - Color vibrancy
  // - Composition balance
  // - Face detection quality
  // - Text readability (if overlay)
  
  // For now, just return first variant
  return variants[0];
}

// ==================== PUBLISHED GALLERY ====================

/**
 * Create a published item record
 */
export function createPublishedItem(
  request: SavePublishedRequest,
  userId: string
): PublishedItem {
  return {
    id: `pub-${generateId()}`,
    user_id: userId,
    project_id: request.project_id,
    video_id: `vid-${generateId()}`,
    video_url: request.video_url,
    title: request.title,
    description: request.description,
    cover_images: request.cover_images,
    cover_variants: {},
    cover_prompts: {},
    scenario: request.scenario,
    final_prompts: [],
    model_used: '',
    publish_platforms: request.platforms,
    publish_jobs: request.publish_jobs,
    publish_status: 'pending',
    publish_date: new Date().toISOString(),
    tags: [],
    hashtags: {},
    categories: {},
    version: 1,
    previous_versions: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ==================== DATABASE QUERIES ====================

export const coverQueries = {
  saveVariantSet: `
    INSERT INTO cover_variant_sets (
      id, project_id, platform, variants, selected_variant_id, created_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `,
  
  getVariantSets: `
    SELECT * FROM cover_variant_sets WHERE project_id = ?
  `,
  
  updateSelectedVariant: `
    UPDATE cover_variant_sets SET selected_variant_id = ? WHERE id = ?
  `,
};

export const publishedQueries = {
  create: `
    INSERT INTO published_items (
      id, user_id, project_id, video_id, video_url, title, description,
      cover_images, scenario, publish_platforms, publish_status,
      publish_date, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  
  list: `
    SELECT * FROM published_items WHERE user_id = ?
    ORDER BY publish_date DESC
    LIMIT ? OFFSET ?
  `,
  
  getById: `SELECT * FROM published_items WHERE id = ? AND user_id = ?`,
  
  update: `
    UPDATE published_items SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      cover_images = COALESCE(?, cover_images),
      publish_status = COALESCE(?, publish_status),
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `,
  
  delete: `DELETE FROM published_items WHERE id = ? AND user_id = ?`,
  
  getByPlatform: `
    SELECT * FROM published_items 
    WHERE user_id = ? AND publish_platforms LIKE ?
    ORDER BY publish_date DESC
  `,
};

export default {
  CHANNEL_TEMPLATES,
  buildCoverPrompt,
  extractScenarioInfo,
  generateCovers,
  autoSelectBestCover,
  createPublishedItem,
  coverQueries,
  publishedQueries,
};
