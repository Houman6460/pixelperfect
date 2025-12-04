-- Migration 006: Create segments table with generation_mode
-- Full segment table with all features

CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    scene_id TEXT,
    position INTEGER NOT NULL,
    scene_number INTEGER,
    duration_sec INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    
    -- Generation mode (text-to-video, image-to-video, video-to-video, first-frame-to-video)
    generation_mode TEXT DEFAULT 'image-to-video',
    is_first_segment INTEGER DEFAULT 0,
    source_url TEXT, -- For video-to-video or first-frame input
    
    -- Prompts
    prompt_text TEXT,
    final_prompt_text TEXT,
    dialogue TEXT,
    dialogue_handling_mode TEXT,
    
    -- Motion & Camera
    motion_profile TEXT,
    camera_path TEXT,
    transition_type TEXT,
    
    -- Frame URLs (R2)
    first_frame_url TEXT,
    last_frame_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    
    -- Style
    style_lock TEXT,
    continuity_notes TEXT,
    
    -- Status
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    generation_time_sec REAL,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_segments_timeline ON segments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_segments_position ON segments(timeline_id, position);
CREATE INDEX IF NOT EXISTS idx_segments_status ON segments(status);
CREATE INDEX IF NOT EXISTS idx_segments_first ON segments(timeline_id, is_first_segment);
