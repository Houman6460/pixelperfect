-- Migration 005: Add generation_mode to segments table
-- Supports multi-mode generation for first segment

-- Add generation_mode column
ALTER TABLE segments ADD COLUMN generation_mode TEXT DEFAULT 'image-to-video';

-- Add source_url column (for video-to-video or first-frame input)
ALTER TABLE segments ADD COLUMN source_url TEXT;

-- Add is_first_segment flag
ALTER TABLE segments ADD COLUMN is_first_segment INTEGER DEFAULT 0;

-- Create index for first segments
CREATE INDEX IF NOT EXISTS idx_segments_first ON segments(timeline_id, is_first_segment);
