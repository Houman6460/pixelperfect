/**
 * Gallery System Types
 * Store and manage video generation projects, scenarios, and published content
 */

// ==================== PROJECT TYPES ====================

export interface VideoProject {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  
  // Scenario data
  original_scenario?: string;
  improved_scenario?: string;
  
  // Generation data
  timeline_id?: string;
  generation_plan_id?: string;
  
  // Output
  video_url?: string;
  thumbnail_url?: string;
  preview_urls?: string[];
  
  // Metadata
  duration_sec?: number;
  resolution?: string;
  aspect_ratio?: string;
  fps?: number;
  model_used?: string;
  
  // Organization
  folder_id?: string;
  tags: string[];
  is_favorite: boolean;
  
  // Status
  status: 'draft' | 'generating' | 'completed' | 'published' | 'failed';
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface ProjectFolder {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_id?: string;
  project_count: number;
  created_at: string;
  updated_at: string;
}

export interface ProjectVersion {
  id: string;
  project_id: string;
  version_number: number;
  scenario?: string;
  timeline_snapshot?: string; // JSON stringified
  video_url?: string;
  notes?: string;
  created_at: string;
}

// ==================== PUBLISHING TYPES ====================

export type PublishPlatform = 
  | 'youtube'
  | 'tiktok'
  | 'instagram'
  | 'facebook'
  | 'vimeo'
  | 'twitch';

export type PublishStatus = 
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'published'
  | 'scheduled'
  | 'failed'
  | 'rate_limited';

export type Visibility = 'public' | 'unlisted' | 'private' | 'scheduled';

export interface PlatformCredentials {
  id: string;
  user_id: string;
  platform: PublishPlatform;
  access_token: string;
  refresh_token?: string;
  expires_at?: string;
  channel_id?: string;
  channel_name?: string;
  profile_image?: string;
  connected_at: string;
  updated_at: string;
}

export interface PublishJob {
  id: string;
  project_id: string;
  user_id: string;
  platform: PublishPlatform;
  
  // Content
  video_url: string;
  title: string;
  description: string;
  tags: string[];
  hashtags: string[];
  category?: string;
  thumbnail_url?: string;
  
  // Chapters (for YouTube)
  chapters?: {
    time_sec: number;
    title: string;
  }[];
  
  // Settings
  visibility: Visibility;
  scheduled_at?: string;
  
  // Status
  status: PublishStatus;
  platform_video_id?: string;
  platform_url?: string;
  error_message?: string;
  retry_count: number;
  
  // Timestamps
  created_at: string;
  updated_at: string;
  published_at?: string;
}

export interface PublishQueue {
  id: string;
  user_id: string;
  jobs: PublishJob[];
  rate_limit_reset?: string;
}

// ==================== METADATA TYPES ====================

export interface GeneratedMetadata {
  id: string;
  project_id: string;
  
  // AI-generated content
  suggested_titles: string[];
  suggested_descriptions: string[];
  suggested_tags: string[];
  suggested_hashtags: Record<PublishPlatform, string[]>;
  
  // SEO
  seo_keywords: string[];
  seo_score?: number;
  
  // Thumbnails
  thumbnail_suggestions: {
    url: string;
    style: string;
    score?: number;
  }[];
  
  // Social summaries
  social_posts: Record<PublishPlatform, string>;
  
  created_at: string;
}

// ==================== TEMPLATE TYPES ====================

export interface ScenarioTemplate {
  id: string;
  name: string;
  description: string;
  category: 'trailer' | 'episode' | 'vlog' | 'short_film' | 'commercial' | 'music_video' | 'documentary' | 'tutorial' | 'custom';
  scenario_template: string;
  style_hints: {
    genre?: string;
    mood?: string;
    pacing?: 'slow' | 'medium' | 'fast';
    visual_style?: string;
  };
  recommended_duration_sec?: number;
  example_prompts?: string[];
  is_public: boolean;
  user_id?: string;
  use_count: number;
  created_at: string;
}

// ==================== API REQUEST/RESPONSE ====================

export interface CreateProjectRequest {
  title: string;
  description?: string;
  scenario?: string;
  folder_id?: string;
  tags?: string[];
}

export interface UpdateProjectRequest {
  title?: string;
  description?: string;
  scenario?: string;
  improved_scenario?: string;
  video_url?: string;
  thumbnail_url?: string;
  folder_id?: string;
  tags?: string[];
  is_favorite?: boolean;
  status?: VideoProject['status'];
}

export interface PublishRequest {
  project_id: string;
  platform: PublishPlatform;
  title: string;
  description: string;
  tags?: string[];
  hashtags?: string[];
  category?: string;
  thumbnail_url?: string;
  visibility: Visibility;
  scheduled_at?: string;
}

export interface GenerateMetadataRequest {
  project_id: string;
  scenario: string;
  style?: string;
  target_platforms?: PublishPlatform[];
}

export interface GalleryFilters {
  folder_id?: string;
  status?: VideoProject['status'];
  tags?: string[];
  is_favorite?: boolean;
  search?: string;
  sort_by?: 'created_at' | 'updated_at' | 'title';
  sort_order?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}
