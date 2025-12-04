-- Migration 010: Add Sora and Veo Video Models
-- Extends model registry with OpenAI Sora and Google Veo

-- Add capability columns to video_models if not exists
-- These may already exist from previous schema
-- Using INSERT OR REPLACE for idempotency

-- First, ensure video_models table has all required columns
-- SQLite doesn't support IF NOT EXISTS for columns, so we try/catch via INSERT

-- Insert/Update Sora model
INSERT OR REPLACE INTO video_models (
    id, display_name, provider, 
    max_duration_sec, min_duration_sec,
    supports_first_frame, supports_last_frame, supports_negative_prompt,
    resolution, priority, cost_per_second, quality_score,
    is_preview_model, is_active
) VALUES (
    'sora',
    'Sora (OpenAI)',
    'openai',
    20, 5,
    1, 1, 1,
    '1080p', 'high',
    15, 10,
    0, 1
);

-- Insert/Update Sora Turbo (faster variant)
INSERT OR REPLACE INTO video_models (
    id, display_name, provider,
    max_duration_sec, min_duration_sec,
    supports_first_frame, supports_last_frame, supports_negative_prompt,
    resolution, priority, cost_per_second, quality_score,
    is_preview_model, is_active
) VALUES (
    'sora-turbo',
    'Sora Turbo (Fast)',
    'openai',
    10, 3,
    1, 1, 1,
    '720p', 'high',
    10, 8,
    0, 1
);

-- Insert/Update Veo 2 model
INSERT OR REPLACE INTO video_models (
    id, display_name, provider,
    max_duration_sec, min_duration_sec,
    supports_first_frame, supports_last_frame, supports_negative_prompt,
    resolution, priority, cost_per_second, quality_score,
    is_preview_model, is_active
) VALUES (
    'veo-2',
    'Veo 2 (Google)',
    'google',
    10, 4,
    1, 1, 1,
    '1080p', 'high',
    12, 10,
    0, 1
);

-- Insert/Update Veo 2 Flash (faster variant)
INSERT OR REPLACE INTO video_models (
    id, display_name, provider,
    max_duration_sec, min_duration_sec,
    supports_first_frame, supports_last_frame, supports_negative_prompt,
    resolution, priority, cost_per_second, quality_score,
    is_preview_model, is_active
) VALUES (
    'veo-2-flash',
    'Veo 2 Flash',
    'google',
    6, 2,
    1, 1, 0,
    '720p', 'high',
    8, 7,
    1, 1
);

-- Create model_capabilities table for detailed capability tracking
CREATE TABLE IF NOT EXISTS model_capabilities (
    id TEXT PRIMARY KEY,
    model_id TEXT NOT NULL,
    
    -- Input support
    supports_text_to_video INTEGER DEFAULT 0,
    supports_image_to_video INTEGER DEFAULT 1,
    supports_video_to_video INTEGER DEFAULT 0,
    supports_first_frame INTEGER DEFAULT 1,
    
    -- Output capabilities
    supports_audio_generation INTEGER DEFAULT 0,
    supports_variable_fps INTEGER DEFAULT 0,
    default_fps INTEGER DEFAULT 24,
    
    -- Aspect ratios supported (JSON array)
    supported_aspects TEXT DEFAULT '["16:9", "9:16", "1:1"]',
    
    -- Resolution limits
    max_width INTEGER,
    max_height INTEGER,
    preferred_resolution TEXT,
    
    -- Duration
    min_duration_sec INTEGER DEFAULT 2,
    max_duration_sec INTEGER DEFAULT 10,
    duration_step_sec REAL DEFAULT 1,
    
    -- Prompt settings
    max_prompt_length INTEGER DEFAULT 500,
    supports_negative_prompt INTEGER DEFAULT 1,
    
    -- Quality settings
    quality_presets TEXT, -- JSON array of presets
    
    -- Cost
    credits_per_second REAL DEFAULT 1,
    base_credits INTEGER DEFAULT 5,
    
    -- Provider info
    provider TEXT NOT NULL,
    api_endpoint TEXT,
    requires_api_key INTEGER DEFAULT 1,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(model_id)
);

-- Insert capabilities for all models
INSERT OR REPLACE INTO model_capabilities (
    id, model_id, provider,
    supports_text_to_video, supports_image_to_video, supports_video_to_video, supports_first_frame,
    supported_aspects, max_width, max_height, preferred_resolution,
    min_duration_sec, max_duration_sec, max_prompt_length,
    credits_per_second, base_credits
) VALUES
-- Sora
('cap-sora', 'sora', 'openai',
 1, 1, 0, 1,
 '["16:9", "9:16", "1:1", "4:3", "21:9"]', 1920, 1080, '1080p',
 5, 20, 1000,
 15, 50),

-- Sora Turbo
('cap-sora-turbo', 'sora-turbo', 'openai',
 1, 1, 0, 1,
 '["16:9", "9:16", "1:1"]', 1280, 720, '720p',
 3, 10, 500,
 10, 30),

-- Veo 2
('cap-veo-2', 'veo-2', 'google',
 1, 1, 1, 1,
 '["16:9", "9:16", "1:1", "4:5"]', 1920, 1080, '1080p',
 4, 10, 800,
 12, 40),

-- Veo 2 Flash
('cap-veo-2-flash', 'veo-2-flash', 'google',
 1, 1, 0, 1,
 '["16:9", "9:16"]', 1280, 720, '720p',
 2, 6, 400,
 8, 20),

-- Kling 2.5 Pro
('cap-kling-2.5-pro', 'kling-2.5-i2v-pro', 'kling',
 1, 1, 0, 1,
 '["16:9", "9:16", "1:1"]', 1920, 1080, '1080p',
 2, 10, 500,
 5, 20),

-- Wan 2.5 I2V
('cap-wan-2.5-i2v', 'wan-2.5-i2v', 'replicate',
 0, 1, 0, 1,
 '["16:9", "9:16"]', 1280, 720, '720p',
 1, 5, 300,
 3, 10),

-- Runway Gen-3
('cap-runway-gen3', 'runway-gen3', 'runway',
 1, 1, 0, 1,
 '["16:9", "9:16", "1:1"]', 1920, 1080, '1080p',
 4, 10, 500,
 8, 30),

-- Stable Video Diffusion
('cap-svd', 'stable-video-diffusion', 'stability',
 0, 1, 0, 1,
 '["16:9"]', 1024, 576, '576p',
 2, 4, 200,
 2, 8),

-- Luma Dream Machine
('cap-luma', 'luma-dream-machine', 'luma',
 1, 1, 0, 1,
 '["16:9", "9:16", "1:1"]', 1920, 1080, '1080p',
 2, 5, 400,
 6, 25);

CREATE INDEX IF NOT EXISTS idx_cap_model ON model_capabilities(model_id);
CREATE INDEX IF NOT EXISTS idx_cap_provider ON model_capabilities(provider);

-- Add model capability columns to segments for snapshot storage
-- These store the capability snapshot at generation time
ALTER TABLE segments ADD COLUMN model_cap_json TEXT;
ALTER TABLE segments ADD COLUMN supports_text_to_video INTEGER DEFAULT 0;
ALTER TABLE segments ADD COLUMN supports_image_to_video INTEGER DEFAULT 1;
ALTER TABLE segments ADD COLUMN supports_video_to_video INTEGER DEFAULT 0;
ALTER TABLE segments ADD COLUMN max_duration_sec_cap INTEGER;

-- Same for timeline_segments
ALTER TABLE timeline_segments ADD COLUMN model_cap_json TEXT;
ALTER TABLE timeline_segments ADD COLUMN supports_text_to_video INTEGER DEFAULT 0;
ALTER TABLE timeline_segments ADD COLUMN supports_image_to_video INTEGER DEFAULT 1;
