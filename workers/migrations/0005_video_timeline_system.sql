-- Video Timeline System Tables
-- Migration: 0005_video_timeline_system.sql

-- Timelines table
CREATE TABLE IF NOT EXISTS timelines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT 'Untitled Timeline',
    description TEXT DEFAULT '',
    version TEXT DEFAULT '1.0',
    target_resolution TEXT DEFAULT '1080p',
    global_style TEXT,
    total_duration_sec REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Timeline segments table
CREATE TABLE IF NOT EXISTS timeline_segments (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    duration_sec REAL NOT NULL DEFAULT 5,
    model_id TEXT NOT NULL DEFAULT 'wan-2.5-i2v',
    prompt TEXT DEFAULT '',
    negative_prompt TEXT,
    transition TEXT DEFAULT 'fade',
    motion_profile TEXT DEFAULT 'smooth',
    camera_path TEXT DEFAULT 'static',
    style_preset TEXT,
    seed INTEGER,
    status TEXT DEFAULT 'pending',
    preview_video_url TEXT,
    final_video_url TEXT,
    thumbnail_url TEXT,
    first_frame_url TEXT,
    last_frame_url TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

-- Timeline jobs table
CREATE TABLE IF NOT EXISTS timeline_jobs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    timeline_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('preview', 'render')),
    status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    progress REAL DEFAULT 0,
    current_segment INTEGER DEFAULT 0,
    total_segments INTEGER DEFAULT 0,
    output_video_url TEXT,
    error_message TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

-- Video models registry table
CREATE TABLE IF NOT EXISTS video_models (
    id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    provider TEXT NOT NULL,
    max_duration_sec INTEGER NOT NULL DEFAULT 5,
    min_duration_sec INTEGER NOT NULL DEFAULT 1,
    supports_first_frame INTEGER DEFAULT 1,
    supports_last_frame INTEGER DEFAULT 0,
    supports_negative_prompt INTEGER DEFAULT 1,
    resolution TEXT DEFAULT '720p',
    priority TEXT DEFAULT 'standard' CHECK (priority IN ('preview', 'budget', 'standard', 'high')),
    cost_per_second REAL DEFAULT 1,
    quality_score INTEGER DEFAULT 5,
    is_preview_model INTEGER DEFAULT 0,
    is_active INTEGER DEFAULT 1,
    backend_name TEXT,
    extra_config TEXT,
    created_at TEXT,
    updated_at TEXT
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_timelines_user_id ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_timelines_updated_at ON timelines(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_segments_timeline_id ON timeline_segments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_segments_position ON timeline_segments(timeline_id, position);
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON timeline_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_timeline_id ON timeline_jobs(timeline_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON timeline_jobs(status);

-- Insert default video models
INSERT OR IGNORE INTO video_models (id, display_name, provider, max_duration_sec, min_duration_sec, supports_first_frame, supports_last_frame, supports_negative_prompt, resolution, priority, cost_per_second, quality_score, is_preview_model, is_active, created_at, updated_at)
VALUES
    ('kling-2.5-i2v-pro', 'Kling 2.5 Pro', 'kling', 10, 2, 1, 1, 1, '1080p', 'high', 5, 9, 0, 1, datetime('now'), datetime('now')),
    ('kling-1.6-i2v-standard', 'Kling 1.6 Standard', 'kling', 5, 2, 1, 0, 1, '720p', 'standard', 2, 7, 0, 1, datetime('now'), datetime('now')),
    ('wan-2.5-i2v', 'Wan 2.5 I2V', 'replicate', 5, 1, 1, 1, 1, '720p', 'standard', 3, 8, 0, 1, datetime('now'), datetime('now')),
    ('wan-2.5-i2v-fast', 'Wan 2.5 Fast (Preview)', 'replicate', 4, 1, 1, 0, 1, '480p', 'preview', 1, 5, 1, 1, datetime('now'), datetime('now')),
    ('runway-gen3', 'Runway Gen-3 Alpha', 'runway', 10, 4, 1, 1, 1, '1080p', 'high', 8, 10, 0, 1, datetime('now'), datetime('now')),
    ('luma-dream-machine', 'Luma Dream Machine', 'luma', 5, 2, 1, 1, 1, '1080p', 'high', 6, 9, 0, 1, datetime('now'), datetime('now')),
    ('stable-video-diffusion', 'Stable Video Diffusion', 'stability', 4, 2, 1, 0, 0, '1024x576', 'standard', 2, 6, 0, 1, datetime('now'), datetime('now')),
    ('minimax-video-01', 'MiniMax Video-01', 'minimax', 6, 2, 1, 0, 1, '720p', 'standard', 3, 7, 0, 1, datetime('now'), datetime('now')),
    ('pixverse-v2', 'PixVerse V2', 'pixverse', 4, 2, 1, 0, 1, '720p', 'standard', 2, 6, 0, 1, datetime('now'), datetime('now')),
    ('animatediff-lightning', 'AnimateDiff Lightning (Preview)', 'replicate', 3, 1, 1, 0, 1, '480p', 'preview', 0.5, 4, 1, 1, datetime('now'), datetime('now'));
