-- Migration 011: Complete Scenario & Timeline Backend for Full Integration
-- Adds all missing columns for inline tags, extended segment settings, and proper connections

-- =============================================
-- 1. SCENARIOS TABLE: Add inline tags support
-- =============================================

-- Add tags_json column for storing inline scenario tags
ALTER TABLE scenarios ADD COLUMN tags_json TEXT; -- JSON: [{type, value, offset}]

-- Add storyboard_images for vision AI analysis
ALTER TABLE scenarios ADD COLUMN storyboard_images TEXT; -- JSON: [{url, caption}]

-- Add vision_model_id used for storyboard analysis  
ALTER TABLE scenarios ADD COLUMN vision_model_id TEXT;

-- Create index for faster scenario lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_model ON scenarios(target_model_id);

-- =============================================
-- 2. TIMELINES TABLE: Add target model and resolution
-- =============================================

-- Add target_model_id to timelines
ALTER TABLE timelines ADD COLUMN target_model_id TEXT;

-- Add target_resolution (already exists from migration 008, but ensure it exists)
-- ALTER TABLE timelines ADD COLUMN target_resolution TEXT DEFAULT '1080p';

-- Add final video URLs
ALTER TABLE timelines ADD COLUMN raw_video_url TEXT; -- R2: videos/final/{timeline_id}/raw.mp4
ALTER TABLE timelines ADD COLUMN enhanced_video_url TEXT; -- R2: videos/final/{timeline_id}/enhanced.mp4
ALTER TABLE timelines ADD COLUMN final_video_url TEXT; -- Final exported video

CREATE INDEX IF NOT EXISTS idx_timelines_model ON timelines(target_model_id);

-- =============================================
-- 3. SEGMENTS TABLE: Add extended settings from scenario tags
-- =============================================

-- Add negative prompt (for all models that support it)
ALTER TABLE segments ADD COLUMN negative_prompt TEXT;

-- Add style preset
ALTER TABLE segments ADD COLUMN style_preset TEXT; -- none, cinematic, realistic, dreamy, anime, vintage, noir

-- Add seed for reproducibility
ALTER TABLE segments ADD COLUMN seed INTEGER;

-- Add first frame mode
ALTER TABLE segments ADD COLUMN first_frame_mode TEXT DEFAULT 'auto'; -- auto, manual, none

-- Add inline tags JSON
ALTER TABLE segments ADD COLUMN inline_tags_json TEXT; -- JSON: [{type, value}]

-- Add tag metadata JSON (flattened for quick access)
ALTER TABLE segments ADD COLUMN tag_metadata_json TEXT; -- JSON: {camera: "close-up", mood: "tense", ...}

-- Add scene metadata from tags
ALTER TABLE segments ADD COLUMN lighting TEXT;
ALTER TABLE segments ADD COLUMN emotion TEXT;
ALTER TABLE segments ADD COLUMN sfx_cue TEXT;

-- Create indexes for segment queries
CREATE INDEX IF NOT EXISTS idx_segments_style ON segments(style_preset);
CREATE INDEX IF NOT EXISTS idx_segments_model ON segments(model_id);

-- =============================================
-- 4. SCENE_BREAKDOWNS: Add tag references
-- =============================================

-- Add inline tags that were parsed from this scene
ALTER TABLE scene_breakdowns ADD COLUMN inline_tags_json TEXT;

-- =============================================
-- 5. GENERATION_PLANS: Add tag awareness
-- =============================================

-- Add flag for whether inline tags were used
ALTER TABLE generation_plans ADD COLUMN inline_tags_used INTEGER DEFAULT 0;

-- Add tag summary JSON
ALTER TABLE generation_plans ADD COLUMN tag_summary_json TEXT; -- JSON: {camera: 5, mood: 3, ...}

-- =============================================
-- 6. STORYBOARD_IMAGES TABLE: Store uploaded storyboards
-- =============================================

CREATE TABLE IF NOT EXISTS storyboard_images (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Image info
    file_url TEXT NOT NULL, -- R2 URL
    thumbnail_url TEXT,
    caption TEXT,
    position INTEGER DEFAULT 0,
    
    -- AI Analysis results
    vision_analysis TEXT, -- JSON: AI description of the image
    extracted_tags TEXT, -- JSON: [{type, value}] extracted by vision AI
    
    -- Metadata
    width INTEGER,
    height INTEGER,
    file_size INTEGER,
    
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_storyboard_scenario ON storyboard_images(scenario_id);
CREATE INDEX IF NOT EXISTS idx_storyboard_user ON storyboard_images(user_id);

-- =============================================
-- 7. VIDEO_MODELS TABLE: Store model registry in D1 (backup to KV)
-- =============================================

CREATE TABLE IF NOT EXISTS video_models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL,
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Capabilities
    max_duration_sec INTEGER DEFAULT 10,
    min_duration_sec INTEGER DEFAULT 2,
    max_prompt_chars INTEGER DEFAULT 500,
    supports_dialogue TEXT DEFAULT 'none', -- none, limited, full
    supports_audio INTEGER DEFAULT 0,
    supports_image_input INTEGER DEFAULT 0,
    supports_video_input INTEGER DEFAULT 0,
    
    -- Resolution support
    supported_resolutions TEXT, -- JSON: ["720p", "1080p", "4k"]
    supported_aspects TEXT, -- JSON: ["16:9", "9:16", "1:1"]
    
    -- Style/motion
    prompt_style TEXT DEFAULT 'plain', -- plain, cinematic_blocks, runway_format
    style_tokens TEXT, -- JSON: ["cinematic", "realistic", ...]
    
    -- Cost
    tokens_per_second INTEGER DEFAULT 10,
    
    -- Status
    is_active INTEGER DEFAULT 1,
    is_recommended INTEGER DEFAULT 0,
    priority INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_models_provider ON video_models(provider);
CREATE INDEX IF NOT EXISTS idx_models_active ON video_models(is_active);

-- Insert core video models
INSERT OR IGNORE INTO video_models (id, provider, display_name, max_duration_sec, max_prompt_chars, supports_dialogue, prompt_style, is_recommended, priority)
VALUES
    ('kling-2.5-pro', 'kling', 'Kling 2.5 Pro', 10, 600, 'full', 'cinematic_blocks', 1, 100),
    ('kling-2.5-i2v-pro', 'kling', 'Kling 2.5 I2V Pro', 10, 600, 'full', 'cinematic_blocks', 1, 95),
    ('kling-1.5-pro', 'kling', 'Kling 1.5 Pro', 10, 500, 'limited', 'plain', 0, 80),
    ('runway-gen3', 'runway', 'Runway Gen-3 Alpha', 10, 500, 'limited', 'runway_format', 1, 90),
    ('runway-gen3-turbo', 'runway', 'Runway Gen-3 Turbo', 10, 400, 'limited', 'runway_format', 0, 85),
    ('luma-ray-2', 'luma', 'Luma Ray 2', 5, 400, 'none', 'plain', 1, 88),
    ('luma-dream-machine', 'luma', 'Luma Dream Machine', 5, 350, 'none', 'plain', 0, 75),
    ('wan-2.5-i2v', 'wan', 'Wan 2.5 I2V', 5, 350, 'limited', 'plain', 1, 85),
    ('pixverse-v3.5', 'pixverse', 'PixVerse V3.5', 8, 400, 'none', 'plain', 0, 70),
    ('minimax-video-01', 'minimax', 'MiniMax Video-01', 6, 500, 'limited', 'plain', 0, 72),
    ('sora', 'openai', 'OpenAI Sora', 20, 1000, 'full', 'plain', 1, 98),
    ('sora-turbo', 'openai', 'OpenAI Sora Turbo', 10, 800, 'full', 'plain', 0, 92),
    ('veo-2', 'google', 'Google Veo 2', 8, 600, 'limited', 'plain', 1, 96),
    ('veo-2-flash', 'google', 'Google Veo 2 Flash', 6, 400, 'limited', 'plain', 0, 88);

-- =============================================
-- 8. R2 PATH REFERENCE TABLE: Document all R2 paths
-- =============================================

CREATE TABLE IF NOT EXISTS r2_path_registry (
    id TEXT PRIMARY KEY,
    path_template TEXT NOT NULL,
    description TEXT,
    content_type TEXT,
    example_path TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Insert documented R2 paths
INSERT OR IGNORE INTO r2_path_registry (id, path_template, description, content_type, example_path)
VALUES
    ('segment_raw', 'videos/raw/{user_id}/{timeline_id}/{segment_id}.mp4', 'Raw generated segment video', 'video/mp4', 'videos/raw/u123/tl456/seg789.mp4'),
    ('segment_enhanced', 'videos/enhanced/{user_id}/{timeline_id}/{segment_id}.mp4', 'Enhanced segment video', 'video/mp4', 'videos/enhanced/u123/tl456/seg789.mp4'),
    ('timeline_raw', 'videos/final/{user_id}/{timeline_id}/raw.mp4', 'Final concatenated raw video', 'video/mp4', 'videos/final/u123/tl456/raw.mp4'),
    ('timeline_enhanced', 'videos/final/{user_id}/{timeline_id}/enhanced.mp4', 'Final concatenated enhanced video', 'video/mp4', 'videos/final/u123/tl456/enhanced.mp4'),
    ('frame_first', 'frames/{user_id}/{timeline_id}/{segment_id}/first.png', 'First frame of segment', 'image/png', 'frames/u123/tl456/seg789/first.png'),
    ('frame_last', 'frames/{user_id}/{timeline_id}/{segment_id}/last.png', 'Last frame of segment', 'image/png', 'frames/u123/tl456/seg789/last.png'),
    ('thumbnail', 'thumbnails/{user_id}/{timeline_id}/{segment_id}.jpg', 'Segment thumbnail', 'image/jpeg', 'thumbnails/u123/tl456/seg789.jpg'),
    ('audio_original', 'audio/{user_id}/{timeline_id}/original.{format}', 'Original uploaded audio', 'audio/*', 'audio/u123/tl456/original.mp3'),
    ('audio_processed', 'audio/{user_id}/{timeline_id}/processed.mp3', 'Processed/mixed audio', 'audio/mpeg', 'audio/u123/tl456/processed.mp3'),
    ('cover', 'covers/{user_id}/{timeline_id}/{platform}.png', 'Platform-specific cover image', 'image/png', 'covers/u123/tl456/youtube.png'),
    ('storyboard', 'storyboard/{user_id}/{scenario_id}/{position}.png', 'Uploaded storyboard image', 'image/png', 'storyboard/u123/sc456/0.png');

-- =============================================
-- 9. KV KEY REFERENCE TABLE: Document all KV keys
-- =============================================

CREATE TABLE IF NOT EXISTS kv_key_registry (
    id TEXT PRIMARY KEY,
    namespace TEXT NOT NULL, -- SESSIONS, CACHE
    key_pattern TEXT NOT NULL,
    description TEXT,
    ttl_seconds INTEGER,
    example_value TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

-- Insert documented KV keys
INSERT OR IGNORE INTO kv_key_registry (id, namespace, key_pattern, description, ttl_seconds, example_value)
VALUES
    ('session', 'SESSIONS', 'session:{token_hash}', 'User session data', 86400, '{"userId": "...", "email": "..."}'),
    ('models_list', 'CACHE', 'video_models:list', 'Cached list of all video models', 3600, '[{id, name, ...}]'),
    ('models_recommended', 'CACHE', 'video_models:recommended', 'Cached recommended models', 3600, '[{id, name, ...}]'),
    ('upscalers_list', 'CACHE', 'upscalers:list', 'Cached list of upscaler models', 3600, '[{id, name, ...}]'),
    ('platform_profile', 'CACHE', 'platform:{platform_id}', 'Platform video requirements', 86400, '{"aspect": "16:9", ...}'),
    ('user_usage', 'CACHE', 'user:{user_id}:usage', 'User token usage cache', 300, '{"used": 100, "remaining": 900}'),
    ('timeline_cache', 'CACHE', 'timeline:{timeline_id}:data', 'Cached timeline data', 60, '{...timeline...}'),
    ('scenario_tags', 'CACHE', 'scenario:{scenario_id}:tags', 'Parsed inline tags cache', 300, '[{type, value, offset}]');

-- =============================================
-- 10. Ensure timeline_segments table exists (fallback for older schemas)
-- =============================================

CREATE TABLE IF NOT EXISTS timeline_segments (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    duration_sec INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    prompt TEXT,
    final_prompt TEXT,
    negative_prompt TEXT,
    dialogue TEXT,
    dialogue_handling_mode TEXT,
    motion_profile TEXT,
    camera_path TEXT,
    transition_type TEXT,
    style_preset TEXT,
    seed INTEGER,
    first_frame_url TEXT,
    last_frame_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    style_lock TEXT,
    continuity_notes TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    generation_time_sec REAL,
    -- Enhancement fields
    enhance_enabled INTEGER DEFAULT 0,
    enhance_model TEXT,
    enhance_status TEXT DEFAULT 'none',
    raw_video_url TEXT,
    enhanced_video_url TEXT,
    -- Inline tag fields
    inline_tags_json TEXT,
    tag_metadata_json TEXT,
    lighting TEXT,
    emotion TEXT,
    sfx_cue TEXT,
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_timeline_segments_timeline ON timeline_segments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_timeline_segments_position ON timeline_segments(timeline_id, position);
CREATE INDEX IF NOT EXISTS idx_timeline_segments_status ON timeline_segments(status);
