-- Migration 007: Audio Tracks Table
-- Stores audio track settings for video export

CREATE TABLE IF NOT EXISTS audio_tracks (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Audio file
    file_url TEXT NOT NULL, -- R2 URL
    file_name TEXT,
    file_size INTEGER,
    duration_sec REAL,
    format TEXT, -- mp3, wav, etc.
    sample_rate INTEGER,
    
    -- Volume settings
    volume INTEGER DEFAULT 100, -- 0-100%
    video_audio_volume INTEGER DEFAULT 100, -- 0-100% (0 = mute)
    mute_video_audio INTEGER DEFAULT 0,
    
    -- Fade settings
    fade_in_sec REAL DEFAULT 0,
    fade_out_sec REAL DEFAULT 0,
    video_fade_in_sec REAL DEFAULT 0,
    video_fade_out_sec REAL DEFAULT 0,
    
    -- Trimming/looping
    trim_to_video INTEGER DEFAULT 1, -- Trim audio to match video length
    loop_if_shorter INTEGER DEFAULT 0, -- Loop audio if shorter than video
    start_offset_sec REAL DEFAULT 0, -- Start audio at offset
    
    -- Processing status
    status TEXT DEFAULT 'uploaded', -- uploaded, processing, processed, error
    processed_url TEXT, -- R2 URL for processed audio
    error_message TEXT,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    
    UNIQUE(timeline_id) -- One audio track per timeline
);

CREATE INDEX IF NOT EXISTS idx_audio_timeline ON audio_tracks(timeline_id);
CREATE INDEX IF NOT EXISTS idx_audio_user ON audio_tracks(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_status ON audio_tracks(status);

-- Add audio_track_id to timelines for quick lookup
-- Note: SQLite doesn't support ALTER TABLE ADD CONSTRAINT, so we add column only
-- ALTER TABLE timelines ADD COLUMN audio_track_id TEXT;
