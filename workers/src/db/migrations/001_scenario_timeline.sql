-- Migration 001: Scenario and Timeline Tables
-- Creates tables for Scenario Mode and Timeline features

-- Scenarios table
CREATE TABLE IF NOT EXISTS scenarios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    original_text TEXT NOT NULL,
    improved_text TEXT,
    target_model_id TEXT,
    target_duration_sec INTEGER,
    language TEXT DEFAULT 'en',
    style_hints TEXT,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);

-- Scene breakdowns
CREATE TABLE IF NOT EXISTS scene_breakdowns (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    scene_number INTEGER NOT NULL,
    title TEXT,
    summary TEXT,
    environment_description TEXT,
    characters TEXT,
    dialogue_blocks TEXT,
    emotions TEXT,
    visual_style TEXT,
    lighting TEXT,
    camera_suggestions TEXT,
    estimated_duration_sec INTEGER,
    transition_to_next TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_breakdowns_scenario ON scene_breakdowns(scenario_id);

-- Timelines table
CREATE TABLE IF NOT EXISTS timelines (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    scenario_id TEXT,
    name TEXT,
    description TEXT,
    total_duration_sec INTEGER DEFAULT 0,
    segment_count INTEGER DEFAULT 0,
    version INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft',
    global_style TEXT,
    continuity_settings TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_timelines_user ON timelines(user_id);
CREATE INDEX IF NOT EXISTS idx_timelines_scenario ON timelines(scenario_id);

-- Timeline segments
CREATE TABLE IF NOT EXISTS segments (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    scene_id TEXT,
    position INTEGER NOT NULL,
    scene_number INTEGER,
    duration_sec INTEGER NOT NULL,
    model_id TEXT NOT NULL,
    prompt_text TEXT,
    final_prompt_text TEXT,
    dialogue TEXT,
    dialogue_handling_mode TEXT,
    motion_profile TEXT,
    camera_path TEXT,
    transition_type TEXT,
    first_frame_url TEXT,
    last_frame_url TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    style_lock TEXT,
    continuity_notes TEXT,
    status TEXT DEFAULT 'pending',
    error_message TEXT,
    generation_time_sec REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_segments_timeline ON segments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_segments_position ON segments(timeline_id, position);
CREATE INDEX IF NOT EXISTS idx_segments_status ON segments(status);

-- Generation plans
CREATE TABLE IF NOT EXISTS generation_plans (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    plan_json TEXT NOT NULL,
    execution_order TEXT,
    models_used TEXT,
    estimated_time_sec INTEGER,
    frame_chaining_enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending',
    progress_completed INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    current_segment_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_plans_timeline ON generation_plans(timeline_id);
