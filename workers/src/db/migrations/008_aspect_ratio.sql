-- Migration 008: Add Aspect Ratio Support to Timelines
-- Enables vertical video for TikTok, Reels, Shorts, etc.

-- Add aspect ratio columns to timelines table
ALTER TABLE timelines ADD COLUMN aspect_ratio TEXT DEFAULT '16:9';
ALTER TABLE timelines ADD COLUMN output_width INTEGER;
ALTER TABLE timelines ADD COLUMN output_height INTEGER;
ALTER TABLE timelines ADD COLUMN orientation TEXT DEFAULT 'landscape';

-- Create index for aspect ratio lookups
CREATE INDEX IF NOT EXISTS idx_timelines_aspect ON timelines(aspect_ratio);
CREATE INDEX IF NOT EXISTS idx_timelines_orientation ON timelines(orientation);

-- Platform video profiles for KV caching reference
-- This table stores platform-specific video requirements
CREATE TABLE IF NOT EXISTS platform_video_profiles (
    id TEXT PRIMARY KEY,
    platform TEXT NOT NULL UNIQUE,
    display_name TEXT NOT NULL,
    recommended_aspect TEXT DEFAULT '16:9',
    supported_aspects TEXT, -- JSON array
    max_resolution TEXT DEFAULT '1080p',
    max_duration_sec INTEGER,
    max_file_size_mb INTEGER,
    video_codec TEXT DEFAULT 'h264',
    audio_codec TEXT DEFAULT 'aac',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Insert default platform profiles
INSERT OR IGNORE INTO platform_video_profiles (id, platform, display_name, recommended_aspect, supported_aspects, max_resolution, max_duration_sec, max_file_size_mb)
VALUES
    ('youtube', 'youtube', 'YouTube', '16:9', '["16:9","9:16","1:1","4:5"]', '4k', 43200, 256000),
    ('youtube-shorts', 'youtube-shorts', 'YouTube Shorts', '9:16', '["9:16"]', '1080p', 60, 10240),
    ('tiktok', 'tiktok', 'TikTok', '9:16', '["9:16","1:1"]', '1080p', 180, 4096),
    ('instagram-reels', 'instagram-reels', 'Instagram Reels', '9:16', '["9:16","4:5"]', '1080p', 90, 4096),
    ('instagram-feed', 'instagram-feed', 'Instagram Feed', '1:1', '["1:1","4:5","16:9"]', '1080p', 60, 4096),
    ('facebook', 'facebook', 'Facebook', '16:9', '["16:9","9:16","1:1","4:5"]', '1080p', 14400, 10240),
    ('vimeo', 'vimeo', 'Vimeo', '16:9', '["16:9","9:16","1:1"]', '4k', 43200, 256000),
    ('twitch', 'twitch', 'Twitch', '16:9', '["16:9"]', '1080p', 14400, 10240);

CREATE INDEX IF NOT EXISTS idx_profiles_platform ON platform_video_profiles(platform);
