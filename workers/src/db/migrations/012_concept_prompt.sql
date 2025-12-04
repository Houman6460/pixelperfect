-- Migration 012: Add concept_prompt field for "Prompt → Scenario" feature
-- Allows users to write a simple prompt that AI converts into a full scenario

-- =============================================
-- 1. SCENARIOS TABLE: Add concept_prompt field
-- =============================================

-- Add concept_prompt column for storing the original user idea
ALTER TABLE scenarios ADD COLUMN concept_prompt TEXT;

-- Add generation_source to track how scenario was created
ALTER TABLE scenarios ADD COLUMN generation_source TEXT DEFAULT 'manual'; -- manual, from_prompt, from_storyboard

-- Add concept_prompt_model_id to track which AI model generated the scenario
ALTER TABLE scenarios ADD COLUMN concept_prompt_model_id TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_scenarios_source ON scenarios(generation_source);

-- =============================================
-- 2. Add prompt generation history table
-- =============================================

CREATE TABLE IF NOT EXISTS scenario_prompt_history (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    
    -- Original prompt
    concept_prompt TEXT NOT NULL,
    
    -- Generation settings used
    target_model_id TEXT,
    target_duration_sec INTEGER,
    style_hints TEXT, -- JSON
    
    -- Generated outputs
    raw_scenario TEXT,
    improved_scenario TEXT,
    
    -- AI model used for generation
    ai_model_id TEXT DEFAULT 'gpt-4o',
    
    -- Generation stats
    generation_time_ms INTEGER,
    tokens_used INTEGER,
    
    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),
    
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompt_history_scenario ON scenario_prompt_history(scenario_id);
CREATE INDEX IF NOT EXISTS idx_prompt_history_user ON scenario_prompt_history(user_id);
