-- Migration 002: Gallery and Publishing Tables
-- Creates tables for projects, covers, and publishing

-- Project folders
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

-- Video projects
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

-- Project versions
CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    scenario TEXT,
    timeline_snapshot TEXT,
    video_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id);

-- Cover variants
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

-- Platform credentials
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

-- Publish jobs
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
CREATE INDEX IF NOT EXISTS idx_jobs_platform ON publish_jobs(platform);

-- Published items (gallery)
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
CREATE INDEX IF NOT EXISTS idx_published_status ON published_items(publish_status);

-- Prompt library
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
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompt_library(category);

-- Scenario templates
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
CREATE INDEX IF NOT EXISTS idx_templates_public ON scenario_templates(is_public);

-- Generation history
CREATE TABLE IF NOT EXISTS generation_history (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    segment_id TEXT,
    model_id TEXT NOT NULL,
    prompt_text TEXT,
    generation_time_sec REAL,
    success INTEGER DEFAULT 1,
    error_message TEXT,
    credits_used INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_history_user ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON generation_history(created_at);
