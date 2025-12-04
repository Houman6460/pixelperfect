-- Migration 004: Create new tables only
-- Skip ALTER TABLE statements that might fail

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

-- Create project_folders table
CREATE TABLE IF NOT EXISTS project_folders (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    icon TEXT,
    parent_id TEXT,
    project_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_folders_user ON project_folders(user_id);

-- Create video_projects table
CREATE TABLE IF NOT EXISTS video_projects (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    folder_id TEXT,
    timeline_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    original_scenario TEXT,
    improved_scenario TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    preview_urls TEXT,
    duration_sec INTEGER,
    resolution TEXT,
    aspect_ratio TEXT,
    fps INTEGER,
    model_used TEXT,
    tags TEXT,
    is_favorite INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON video_projects(folder_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON video_projects(status);

-- Create covers table
CREATE TABLE IF NOT EXISTS covers (
    id TEXT PRIMARY KEY,
    timeline_id TEXT,
    project_id TEXT,
    platform TEXT NOT NULL,
    cover_url TEXT NOT NULL,
    prompt_used TEXT,
    model_used TEXT,
    variant_number INTEGER DEFAULT 1,
    style TEXT,
    dominant_colors TEXT,
    has_text_overlay INTEGER DEFAULT 0,
    is_selected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_covers_timeline ON covers(timeline_id);
CREATE INDEX IF NOT EXISTS idx_covers_project ON covers(project_id);
CREATE INDEX IF NOT EXISTS idx_covers_platform ON covers(platform);

-- Create platform_credentials table
CREATE TABLE IF NOT EXISTS platform_credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    channel_id TEXT,
    channel_name TEXT,
    profile_image TEXT,
    connected_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    UNIQUE(user_id, platform)
);

CREATE INDEX IF NOT EXISTS idx_credentials_user ON platform_credentials(user_id);

-- Create publish_jobs table
CREATE TABLE IF NOT EXISTS publish_jobs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL,
    video_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    tags TEXT,
    hashtags TEXT,
    category TEXT,
    thumbnail_url TEXT,
    cover_id TEXT,
    chapters TEXT,
    visibility TEXT DEFAULT 'public',
    scheduled_at TEXT,
    status TEXT DEFAULT 'pending',
    platform_video_id TEXT,
    platform_url TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_jobs_project ON publish_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_user ON publish_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON publish_jobs(status);

-- Create published_items table
CREATE TABLE IF NOT EXISTS published_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    timeline_id TEXT,
    video_id TEXT,
    video_url TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    cover_images TEXT,
    cover_variants TEXT,
    cover_prompts TEXT,
    scenario TEXT,
    final_prompts TEXT,
    timeline_snapshot TEXT,
    generation_plan_id TEXT,
    model_used TEXT,
    publish_platforms TEXT,
    publish_jobs TEXT,
    publish_status TEXT DEFAULT 'pending',
    publish_date TEXT,
    tags TEXT,
    hashtags TEXT,
    categories TEXT,
    view_stats TEXT,
    version INTEGER DEFAULT 1,
    previous_versions TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_published_user ON published_items(user_id);
CREATE INDEX IF NOT EXISTS idx_published_project ON published_items(project_id);

-- Create prompt_library table
CREATE TABLE IF NOT EXISTS prompt_library (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    category TEXT,
    tags TEXT,
    use_count INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompt_library(user_id);

-- Create scenario_templates table
CREATE TABLE IF NOT EXISTS scenario_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL,
    scenario_template TEXT NOT NULL,
    style_hints TEXT,
    recommended_duration_sec INTEGER,
    example_prompts TEXT,
    is_public INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON scenario_templates(category);
