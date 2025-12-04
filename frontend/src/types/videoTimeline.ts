// AI Video Studio - Long Video Timeline Types

export type SegmentStatus = 'pending' | 'generating' | 'generated' | 'modified' | 'error';
export type TransitionType = 'none' | 'fade' | 'morph' | 'warp' | 'dissolve';
export type MotionProfile = 'smooth' | 'fast' | 'cinematic' | 'dramatic' | 'gentle';
export type CameraPath = 'static' | 'pan' | 'zoom' | 'orbit' | 'dolly' | 'flyover' | 'chase' | 'custom';
export type RenderPriority = 'preview' | 'standard' | 'high';
export type Resolution = '480p' | '720p' | '1080p' | '4k' | '1024x576' | '1280x720' | '1920x1080';

// Segment in a timeline
export interface TimelineSegment {
  segment_id: number;
  duration_sec: number;
  model: string;
  prompt: string;
  negative_prompt?: string;
  first_frame: string | null; // base64 or URL
  last_frame: string | null; // base64 or URL
  generated_video_url?: string;
  thumbnail_url?: string;
  status: SegmentStatus;
  transition: TransitionType;
  motion_profile: MotionProfile;
  camera_path: CameraPath;
  priority: RenderPriority;
  seed?: number;
  style_preset?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

// Full timeline structure
export interface VideoTimeline {
  timeline_id: string;
  name: string;
  description?: string;
  version: string;
  segments: TimelineSegment[];
  global_style?: string;
  total_duration_sec: number;
  target_resolution: Resolution;
  created_at: string;
  updated_at: string;
  user_id?: string;
  is_template?: boolean;
  tags?: string[];
}

// Model capability definition
export interface ModelCapability {
  model_id: string;
  display_name: string;
  provider: string;
  max_duration: number; // seconds
  min_duration: number;
  supports_first_frame: boolean;
  supports_last_frame: boolean;
  supports_negative_prompt: boolean;
  resolution: Resolution;
  supported_resolutions: Resolution[];
  backend: string;
  priority: RenderPriority;
  cost_per_second: number; // token cost
  avg_generation_time: number; // seconds
  quality_score: number; // 1-10
  style_presets?: string[];
  motion_profiles?: MotionProfile[];
  camera_paths?: CameraPath[];
  is_preview_model: boolean;
  is_available: boolean;
}

// Model Capability Registry - Updated Dec 2024
export const MODEL_CAPABILITY_REGISTRY: Record<string, ModelCapability> = {
  // ==================== OPENAI SORA ====================
  'sora': {
    model_id: 'sora',
    display_name: 'Sora',
    provider: 'openai',
    max_duration: 20,
    min_duration: 5,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'openai_api',
    priority: 'high',
    cost_per_second: 15,
    avg_generation_time: 300,
    quality_score: 10,
    style_presets: ['cinematic', 'realistic', 'artistic', 'fantasy', 'documentary'],
    motion_profiles: ['smooth', 'fast', 'cinematic', 'dramatic', 'gentle'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly', 'flyover', 'chase'],
    is_preview_model: false,
    is_available: true,
  },
  'sora-turbo': {
    model_id: 'sora-turbo',
    display_name: 'Sora Turbo',
    provider: 'openai',
    max_duration: 10,
    min_duration: 3,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '720p',
    supported_resolutions: ['480p', '720p'],
    backend: 'openai_api',
    priority: 'high',
    cost_per_second: 10,
    avg_generation_time: 120,
    quality_score: 8,
    style_presets: ['cinematic', 'realistic', 'artistic'],
    motion_profiles: ['smooth', 'fast', 'cinematic'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  // ==================== GOOGLE VEO ====================
  'veo-2': {
    model_id: 'veo-2',
    display_name: 'Veo 2',
    provider: 'google',
    max_duration: 10,
    min_duration: 4,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'google_api',
    priority: 'high',
    cost_per_second: 12,
    avg_generation_time: 180,
    quality_score: 10,
    style_presets: ['cinematic', 'realistic', 'artistic', 'documentary'],
    motion_profiles: ['smooth', 'fast', 'cinematic', 'dramatic', 'gentle'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly', 'flyover'],
    is_preview_model: false,
    is_available: true,
  },
  'veo-2-flash': {
    model_id: 'veo-2-flash',
    display_name: 'Veo 2 Flash',
    provider: 'google',
    max_duration: 6,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: false,
    resolution: '720p',
    supported_resolutions: ['480p', '720p'],
    backend: 'google_api',
    priority: 'high',
    cost_per_second: 8,
    avg_generation_time: 60,
    quality_score: 7,
    style_presets: ['cinematic', 'realistic'],
    motion_profiles: ['smooth', 'fast'],
    camera_paths: ['static', 'pan', 'zoom'],
    is_preview_model: true,
    is_available: true,
  },
  // ==================== KLING ====================
  'kling-2.5-pro': {
    model_id: 'kling-2.5-pro',
    display_name: 'Kling 2.5 Pro',
    provider: 'kling',
    max_duration: 10,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'kling_api',
    priority: 'high',
    cost_per_second: 5,
    avg_generation_time: 120,
    quality_score: 9,
    style_presets: ['cinematic', 'anime', 'realistic', 'artistic'],
    motion_profiles: ['smooth', 'fast', 'cinematic', 'dramatic'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  'kling-2.5-i2v-pro': {
    model_id: 'kling-2.5-i2v-pro',
    display_name: 'Kling 2.5 I2V Pro',
    provider: 'kling',
    max_duration: 10,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'kling_api',
    priority: 'high',
    cost_per_second: 5,
    avg_generation_time: 120,
    quality_score: 9,
    style_presets: ['cinematic', 'anime', 'realistic', 'artistic'],
    motion_profiles: ['smooth', 'fast', 'cinematic', 'dramatic'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  'kling-1.5-pro': {
    model_id: 'kling-1.5-pro',
    display_name: 'Kling 1.5 Pro',
    provider: 'kling',
    max_duration: 10,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: false,
    supports_negative_prompt: true,
    resolution: '720p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'kling_api',
    priority: 'standard',
    cost_per_second: 3,
    avg_generation_time: 90,
    quality_score: 7,
    style_presets: ['cinematic', 'realistic'],
    motion_profiles: ['smooth', 'fast'],
    camera_paths: ['static', 'pan', 'zoom'],
    is_preview_model: false,
    is_available: true,
  },
  // ==================== RUNWAY ====================
  'runway-gen3': {
    model_id: 'runway-gen3',
    display_name: 'Runway Gen-3 Alpha',
    provider: 'runway',
    max_duration: 10,
    min_duration: 4,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'runway_api',
    priority: 'high',
    cost_per_second: 8,
    avg_generation_time: 180,
    quality_score: 10,
    style_presets: ['cinematic', 'realistic', 'artistic', 'fantasy'],
    motion_profiles: ['smooth', 'fast', 'cinematic', 'dramatic', 'gentle'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly', 'flyover', 'chase'],
    is_preview_model: false,
    is_available: true,
  },
  'runway-gen3-turbo': {
    model_id: 'runway-gen3-turbo',
    display_name: 'Runway Gen-3 Turbo',
    provider: 'runway',
    max_duration: 10,
    min_duration: 4,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '720p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'runway_api',
    priority: 'high',
    cost_per_second: 5,
    avg_generation_time: 90,
    quality_score: 8,
    style_presets: ['cinematic', 'realistic', 'artistic'],
    motion_profiles: ['smooth', 'fast', 'cinematic'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  // ==================== LUMA ====================
  'luma-ray-2': {
    model_id: 'luma-ray-2',
    display_name: 'Luma Ray 2',
    provider: 'luma',
    max_duration: 5,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'luma_api',
    priority: 'high',
    cost_per_second: 7,
    avg_generation_time: 100,
    quality_score: 9,
    style_presets: ['cinematic', 'realistic', 'dreamy', 'artistic'],
    motion_profiles: ['smooth', 'cinematic', 'gentle', 'dramatic'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  'luma-dream-machine': {
    model_id: 'luma-dream-machine',
    display_name: 'Luma Dream Machine',
    provider: 'luma',
    max_duration: 5,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'luma_api',
    priority: 'standard',
    cost_per_second: 6,
    avg_generation_time: 120,
    quality_score: 8,
    style_presets: ['cinematic', 'realistic', 'dreamy'],
    motion_profiles: ['smooth', 'cinematic', 'gentle'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit', 'dolly'],
    is_preview_model: false,
    is_available: true,
  },
  'minimax-video-01': {
    model_id: 'minimax-video-01',
    display_name: 'MiniMax Video-01',
    provider: 'minimax',
    max_duration: 6,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: false,
    supports_negative_prompt: true,
    resolution: '720p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'minimax_api',
    priority: 'standard',
    cost_per_second: 3,
    avg_generation_time: 90,
    quality_score: 7,
    style_presets: ['cinematic', 'realistic'],
    motion_profiles: ['smooth', 'fast'],
    camera_paths: ['static', 'pan', 'zoom'],
    is_preview_model: false,
    is_available: true,
  },
  'pixverse-v3.5': {
    model_id: 'pixverse-v3.5',
    display_name: 'PixVerse V3.5',
    provider: 'pixverse',
    max_duration: 8,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: false,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'pixverse_api',
    priority: 'standard',
    cost_per_second: 3,
    avg_generation_time: 75,
    quality_score: 7,
    style_presets: ['anime', 'realistic', '3d', 'cinematic'],
    motion_profiles: ['smooth', 'fast', 'cinematic'],
    camera_paths: ['static', 'pan', 'zoom'],
    is_preview_model: false,
    is_available: true,
  },
  // ==================== WAN ====================
  'wan-2.5-i2v': {
    model_id: 'wan-2.5-i2v',
    display_name: 'Wan 2.5 I2V',
    provider: 'wan',
    max_duration: 5,
    min_duration: 2,
    supports_first_frame: true,
    supports_last_frame: true,
    supports_negative_prompt: true,
    resolution: '1080p',
    supported_resolutions: ['720p', '1080p'],
    backend: 'replicate_api',
    priority: 'high',
    cost_per_second: 4,
    avg_generation_time: 90,
    quality_score: 8,
    style_presets: ['cinematic', 'anime', 'realistic'],
    motion_profiles: ['smooth', 'cinematic', 'gentle'],
    camera_paths: ['static', 'pan', 'zoom', 'orbit'],
    is_preview_model: false,
    is_available: true,
  },
  'animatediff-lightning': {
    model_id: 'animatediff-lightning',
    display_name: 'AnimateDiff Lightning (Preview)',
    provider: 'replicate',
    max_duration: 3,
    min_duration: 1,
    supports_first_frame: true,
    supports_last_frame: false,
    supports_negative_prompt: true,
    resolution: '480p',
    supported_resolutions: ['480p', '720p'],
    backend: 'replicate_api',
    priority: 'preview',
    cost_per_second: 0.5,
    avg_generation_time: 15,
    quality_score: 4,
    style_presets: ['anime', 'realistic'],
    motion_profiles: ['smooth', 'fast'],
    camera_paths: ['static'],
    is_preview_model: true,
    is_available: true,
  },
};

// Timeline generation request
export interface GenerateSegmentRequest {
  segment: TimelineSegment;
  model_capability: ModelCapability;
  use_fallback: boolean;
  fallback_models?: string[];
}

// Timeline generation response
export interface GenerateSegmentResponse {
  success: boolean;
  segment_id: number;
  video_url?: string;
  thumbnail_url?: string;
  last_frame?: string;
  duration_actual?: number;
  model_used: string;
  generation_time_ms: number;
  tokens_used: number;
  error?: string;
}

// Backend routing decision
export interface RoutingDecision {
  recommended_model: string;
  reason: string;
  requires_split: boolean;
  suggested_segments?: number;
  warnings: string[];
  fallback_models: string[];
}

// Frame extraction result
export interface FrameExtractionResult {
  success: boolean;
  frame_data: string; // base64
  frame_index: number;
  timestamp_ms: number;
  resolution: string;
  enhanced: boolean;
}

// Transition config
export interface TransitionConfig {
  type: TransitionType;
  duration_ms: number;
  easing: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  params?: Record<string, any>;
}

// Render job
export interface RenderJob {
  job_id: string;
  timeline_id: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress_percent: number;
  current_segment: number;
  total_segments: number;
  output_url?: string;
  started_at?: string;
  completed_at?: string;
  error?: string;
  estimated_time_remaining_sec?: number;
}

// Story consistency check result
export interface ConsistencyCheckResult {
  is_consistent: boolean;
  issues: {
    segment_id: number;
    issue_type: 'character_mismatch' | 'lighting_inconsistency' | 'motion_discontinuity' | 'style_mismatch' | 'temporal_gap';
    description: string;
    severity: 'low' | 'medium' | 'high';
    suggestion: string;
  }[];
  overall_score: number; // 0-100
}

// Template
export interface TimelineTemplate {
  template_id: string;
  name: string;
  description: string;
  category: string;
  thumbnail_url: string;
  timeline: VideoTimeline;
  author: string;
  downloads: number;
  rating: number;
  tags: string[];
  is_premium: boolean;
  price_tokens?: number;
}
