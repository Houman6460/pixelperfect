/**
 * Scenario Assistant Types
 * Complete type definitions for the Scenario-to-Timeline system
 */

// ==================== SCENARIO TYPES ====================

export interface Scenario {
  id: string;
  title: string;
  raw_text: string;
  improved_text?: string;
  total_duration_sec: number;
  target_model_id?: string;
  language: string;
  created_at: string;
  updated_at: string;
  status: 'draft' | 'improved' | 'planned' | 'generating' | 'completed';
}

export interface DialogueBlock {
  character: string;
  line: string;
  emotion?: string;
  action?: string;
}

export interface CameraSuggestion {
  type: 'static' | 'pan' | 'dolly' | 'crane' | 'tracking' | 'zoom' | 'orbit' | 'handheld';
  direction?: string;
  speed?: 'slow' | 'medium' | 'fast';
  notes?: string;
}

export interface SceneBreakdown {
  scene_id: string;
  scene_number: number;
  title?: string;
  estimated_duration_sec: number;
  summary: string;
  environment_description: string;
  characters: string[];
  dialogue_blocks: DialogueBlock[];
  actions: string[];
  emotions: string[];
  visual_style: string;
  lighting?: string;
  time_of_day?: string;
  weather?: string;
  camera_suggestions: CameraSuggestion[];
  transition_to_next?: 'cut' | 'fade' | 'dissolve' | 'wipe' | 'morph';
  continuity_notes?: string;
}

export interface ScenarioBreakdown {
  scenario_id: string;
  title: string;
  total_duration_sec: number;
  scene_count: number;
  scenes: SceneBreakdown[];
  global_style: {
    genre?: string;
    mood?: string;
    color_palette?: string;
    era?: string;
  };
  characters: {
    name: string;
    description: string;
    visual_notes?: string;
  }[];
  warnings: string[];
}

// ==================== TIMELINE GENERATION TYPES ====================

export type DialogueHandlingMode = 'full' | 'compressed' | 'narrative' | 'visual_only' | 'none';
export type MotionProfile = 'smooth' | 'dynamic' | 'subtle' | 'dramatic' | 'static';
export type CameraPath = 'static' | 'pan' | 'dolly' | 'crane' | 'tracking' | 'zoom' | 'orbit' | 'handheld';
export type TransitionType = 'none' | 'cut' | 'fade' | 'dissolve' | 'wipe' | 'morph';

export interface TimelineSegment {
  segment_id: string;
  segment_number: number;
  scene_id: string;
  duration_sec: number;
  model_id: string;
  prompt: string;
  final_prompt?: string;
  dialogue?: string;
  dialogue_handling_mode: DialogueHandlingMode;
  motion_profile: MotionProfile;
  camera_path: CameraPath;
  transition: TransitionType;
  first_frame?: string;
  last_frame?: string;
  style_lock?: {
    character_consistency: boolean;
    lighting_consistency: boolean;
    color_consistency: boolean;
  };
  continuity_notes?: string;
  status: 'pending' | 'generating' | 'generated' | 'error';
}

export interface GeneratedTimeline {
  timeline_id: string;
  scenario_id: string;
  total_duration_sec: number;
  segment_count: number;
  segments: TimelineSegment[];
  models_used: string[];
  global_style_lock: {
    genre?: string;
    mood?: string;
    color_palette?: string;
  };
  continuity_settings: {
    character_consistency: boolean;
    lighting_consistency: boolean;
    style_consistency: boolean;
  };
  warnings: string[];
  created_at: string;
}

// ==================== VIDEO GENERATION PLAN ====================

export interface VideoGenerationPlan {
  plan_id: string;
  timeline_id: string;
  execution_order: string[]; // segment_ids in order
  models_used: string[];
  estimated_generation_time_sec: number;
  frame_chaining_enabled: boolean;
  global_style_lock: {
    genre?: string;
    mood?: string;
    color_palette?: string;
  };
  continuity_settings: {
    character_consistency: boolean;
    lighting_consistency: boolean;
    style_consistency: boolean;
  };
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress: {
    completed_segments: number;
    total_segments: number;
    current_segment_id?: string;
  };
}

// ==================== API REQUEST/RESPONSE TYPES ====================

export interface ImproveScenarioRequest {
  scenario_text: string;
  target_duration_sec?: number;
  target_model_id?: string;
  language?: string;
  style_hints?: {
    genre?: string;
    mood?: string;
    pacing?: 'slow' | 'medium' | 'fast';
  };
}

export interface ImproveScenarioResponse {
  improved_scenario: string;
  original_length: number;
  improved_length: number;
  changes_made: string[];
  warnings: string[];
  estimated_duration_sec: number;
  scene_count_estimate: number;
}

export interface GeneratePlanRequest {
  scenario_text: string;
  target_duration_sec: number;
  target_model_id: string;
  language?: string;
  options?: {
    enable_frame_chaining: boolean;
    style_consistency: boolean;
    character_consistency: boolean;
  };
}

export interface GeneratePlanResponse {
  timeline: GeneratedTimeline;
  generation_plan: VideoGenerationPlan;
  breakdown: ScenarioBreakdown;
  warnings: string[];
}

export interface ParseScenarioRequest {
  scenario_text: string;
  language?: string;
}

export interface ParseScenarioResponse {
  breakdown: ScenarioBreakdown;
  parsing_notes: string[];
  warnings: string[];
}
