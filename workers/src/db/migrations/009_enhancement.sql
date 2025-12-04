-- Migration 009: AI Video Enhancement / Upscaler Support
-- Adds enhancement capabilities per segment

-- Add enhancement columns to segments table
ALTER TABLE segments ADD COLUMN enhance_enabled INTEGER DEFAULT 0;
ALTER TABLE segments ADD COLUMN enhance_model TEXT;
ALTER TABLE segments ADD COLUMN enhance_status TEXT DEFAULT 'none'; -- none, queued, processing, done, failed
ALTER TABLE segments ADD COLUMN raw_video_url TEXT;
ALTER TABLE segments ADD COLUMN enhanced_video_url TEXT;
ALTER TABLE segments ADD COLUMN enhance_started_at TEXT;
ALTER TABLE segments ADD COLUMN enhance_completed_at TEXT;
ALTER TABLE segments ADD COLUMN enhance_error TEXT;
ALTER TABLE segments ADD COLUMN enhance_duration_sec REAL;

-- Create index for enhancement status
CREATE INDEX IF NOT EXISTS idx_segments_enhance_status ON segments(enhance_status);
CREATE INDEX IF NOT EXISTS idx_segments_enhance_enabled ON segments(enhance_enabled);

-- Add enhancement columns to timeline_segments (existing table)
ALTER TABLE timeline_segments ADD COLUMN enhance_enabled INTEGER DEFAULT 0;
ALTER TABLE timeline_segments ADD COLUMN enhance_model TEXT;
ALTER TABLE timeline_segments ADD COLUMN enhance_status TEXT DEFAULT 'none';
ALTER TABLE timeline_segments ADD COLUMN raw_video_url TEXT;
ALTER TABLE timeline_segments ADD COLUMN enhanced_video_url TEXT;

-- Create enhancement jobs table for tracking
CREATE TABLE IF NOT EXISTS enhancement_jobs (
    id TEXT PRIMARY KEY,
    segment_id TEXT NOT NULL,
    timeline_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Model info
    model_id TEXT NOT NULL,
    model_provider TEXT,
    
    -- Input/Output
    input_url TEXT NOT NULL, -- R2 URL for raw video
    output_url TEXT, -- R2 URL for enhanced video
    
    -- Settings
    scale_factor INTEGER DEFAULT 2, -- 2x, 4x upscale
    target_resolution TEXT,
    preserve_audio INTEGER DEFAULT 1,
    
    -- Status
    status TEXT DEFAULT 'queued', -- queued, processing, done, failed
    progress INTEGER DEFAULT 0, -- 0-100
    error_message TEXT,
    
    -- Timing
    started_at TEXT,
    completed_at TEXT,
    processing_time_sec REAL,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_enhance_jobs_segment ON enhancement_jobs(segment_id);
CREATE INDEX IF NOT EXISTS idx_enhance_jobs_timeline ON enhancement_jobs(timeline_id);
CREATE INDEX IF NOT EXISTS idx_enhance_jobs_status ON enhancement_jobs(status);
CREATE INDEX IF NOT EXISTS idx_enhance_jobs_user ON enhancement_jobs(user_id);

-- Create upscaler models registry table
CREATE TABLE IF NOT EXISTS upscaler_models (
    id TEXT PRIMARY KEY,
    provider TEXT NOT NULL, -- replicate, google, stability, etc.
    display_name TEXT NOT NULL,
    description TEXT,
    
    -- Capabilities
    max_input_resolution TEXT,
    max_output_resolution TEXT,
    scale_factors TEXT, -- JSON array: [2, 4]
    supports_video INTEGER DEFAULT 1,
    supports_batch INTEGER DEFAULT 0,
    
    -- Performance
    avg_processing_time_sec REAL,
    quality_score INTEGER, -- 1-10
    
    -- Cost
    cost_per_second REAL,
    credits_per_use INTEGER DEFAULT 5,
    
    -- Status
    is_active INTEGER DEFAULT 1,
    priority INTEGER DEFAULT 0,
    
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default upscaler models
INSERT OR IGNORE INTO upscaler_models (id, provider, display_name, description, scale_factors, quality_score, cost_per_second, credits_per_use, priority)
VALUES
    ('replicate-esrgan', 'replicate', 'Real-ESRGAN Video', 'High-quality video upscaling using Real-ESRGAN', '[2, 4]', 9, 0.05, 10, 100),
    ('replicate-esrgan-anime', 'replicate', 'Real-ESRGAN Anime', 'Optimized for anime and cartoon content', '[2, 4]', 9, 0.05, 10, 90),
    ('topaz-video-ai', 'topaz', 'Topaz Video AI', 'Professional video enhancement suite', '[2, 4, 8]', 10, 0.10, 20, 95),
    ('google-frame-interp', 'google', 'Google FILM', 'Frame interpolation for smoother video', '[2]', 8, 0.03, 5, 80),
    ('stability-upscale', 'stability', 'Stable Video Upscale', 'Stability AI video enhancement', '[2, 4]', 8, 0.04, 8, 85),
    ('nightmareai-hd', 'replicate', 'NightmareAI HD', 'High-detail enhancement for realistic content', '[2, 4]', 9, 0.06, 12, 75),
    ('codeformer-face', 'replicate', 'CodeFormer Face', 'Specialized face restoration and enhancement', '[2]', 9, 0.04, 8, 70);

CREATE INDEX IF NOT EXISTS idx_upscaler_active ON upscaler_models(is_active);
CREATE INDEX IF NOT EXISTS idx_upscaler_provider ON upscaler_models(provider);
