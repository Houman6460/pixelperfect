/**
 * Cover Generation Types
 * AI-powered thumbnail/cover generation for video publishing
 */

import { PublishPlatform } from './gallery';

// ==================== CHANNEL TEMPLATE TYPES ====================

export type AspectRatio = '16:9' | '9:16' | '1:1' | '4:5';

export interface ChannelTemplate {
  id: string;
  platform: PublishPlatform;
  name: string;
  
  // Dimensions
  aspect_ratio: AspectRatio;
  width: number;
  height: number;
  
  // Style
  style: 'bright' | 'dark' | 'professional' | 'gaming' | 'aesthetic' | 'bold';
  color_preferences: {
    primary?: string;
    secondary?: string;
    background?: string;
    text?: string;
  };
  
  // Composition
  composition: {
    character_position: 'center' | 'left' | 'right' | 'none';
    text_position: 'top' | 'bottom' | 'center' | 'left' | 'right' | 'none';
    safe_zone_percent: number; // Percentage from edges
    max_objects: number;
  };
  
  // Text overlay
  text_style: {
    font_family: string;
    font_weight: 'normal' | 'bold' | 'black';
    text_transform: 'none' | 'uppercase' | 'capitalize';
    shadow: boolean;
    outline: boolean;
    max_chars: number;
  };
  
  // Overlay
  overlay_style: {
    gradient?: string;
    vignette: boolean;
    blur_background: boolean;
  };
}

// ==================== COVER GENERATION TYPES ====================

export interface CoverGenerationRequest {
  project_id: string;
  scenario_summary: string;
  main_characters?: string[];
  visual_style: string;
  key_scene?: string;
  dominant_colors?: string[];
  emotional_tone: string;
  title?: string;
  platforms: PublishPlatform[];
  custom_prompt?: string;
}

export interface GeneratedCover {
  id: string;
  project_id: string;
  platform: PublishPlatform;
  
  // Image data
  url: string;
  width: number;
  height: number;
  
  // Generation info
  prompt_used: string;
  model_used: string;
  variant_number: number;
  
  // Metadata
  style: string;
  dominant_colors: string[];
  has_text_overlay: boolean;
  
  // Status
  is_selected: boolean;
  created_at: string;
}

export interface CoverVariantSet {
  id: string;
  project_id: string;
  platform: PublishPlatform;
  variants: GeneratedCover[];
  selected_variant_id?: string;
  created_at: string;
}

export interface CoverGenerationResponse {
  success: boolean;
  covers: Record<PublishPlatform, CoverVariantSet>;
  prompts_used: Record<PublishPlatform, string>;
  warnings: string[];
}

// ==================== PUBLISHED ITEM TYPES ====================

export interface PublishedCoverSet {
  youtube?: string;
  tiktok?: string;
  instagram?: string;
  facebook?: string;
  vimeo?: string;
  twitch?: string;
}

export interface PublishedItem {
  id: string;
  user_id: string;
  project_id: string;
  
  // Video info
  video_id: string;
  video_url: string;
  title: string;
  description: string;
  
  // Covers
  cover_images: PublishedCoverSet;
  cover_variants: Partial<Record<PublishPlatform, string[]>>;
  cover_prompts: Partial<Record<PublishPlatform, string>>;
  
  // Content
  scenario: string;
  final_prompts: string[];
  timeline_snapshot?: string;
  generation_plan_id?: string;
  model_used: string;
  
  // Publishing
  publish_platforms: PublishPlatform[];
  publish_jobs: string[]; // Job IDs
  publish_status: 'pending' | 'partial' | 'complete' | 'failed';
  publish_date: string;
  
  // Metadata
  tags: string[];
  hashtags: Partial<Record<PublishPlatform, string[]>>;
  categories: Partial<Record<PublishPlatform, string>>;
  
  // Analytics (future)
  view_stats?: Record<PublishPlatform, {
    views: number;
    likes: number;
    comments: number;
    shares: number;
    last_updated: string;
  }>;
  
  // Versioning
  version: number;
  previous_versions: string[];
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

// ==================== API TYPES ====================

export interface GenerateCoverRequest {
  project_id: string;
  scenario: string;
  video_plan?: any;
  platforms: PublishPlatform[];
  style_override?: string;
  num_variants?: number; // 1-6, default 3
}

export interface ApplyTemplateRequest {
  cover_url: string;
  platform: PublishPlatform;
  title?: string;
  add_text_overlay: boolean;
}

export interface ApplyTemplateResponse {
  url: string;
  platform: PublishPlatform;
  template_applied: string;
}

export interface SavePublishedRequest {
  project_id: string;
  video_url: string;
  title: string;
  description: string;
  cover_images: PublishedCoverSet;
  scenario: string;
  platforms: PublishPlatform[];
  publish_jobs: string[];
}
