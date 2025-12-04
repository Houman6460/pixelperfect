-- Migration 003: Add scenario columns to existing timelines table
-- Adds scenario_id and other missing columns

-- Add scenario_id to timelines if not exists
ALTER TABLE timelines ADD COLUMN scenario_id TEXT;

-- Add description if not exists  
ALTER TABLE timelines ADD COLUMN description TEXT;

-- Add global_style if not exists
ALTER TABLE timelines ADD COLUMN global_style TEXT;

-- Add continuity_settings if not exists
ALTER TABLE timelines ADD COLUMN continuity_settings TEXT;

-- Create index for scenario lookup
CREATE INDEX IF NOT EXISTS idx_timelines_scenario ON timelines(scenario_id);

-- Create scenarios table
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

-- Create scene_breakdowns table
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

-- Create generation_plans table
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
