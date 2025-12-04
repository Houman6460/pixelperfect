-- =============================================
-- PixelPerfect AI Video Studio - D1 Database Schema
-- Cloudflare D1 SQLite Database
-- =============================================

-- Note: SQLite doesn't enforce foreign keys by default
-- Run: PRAGMA foreign_keys = ON; to enable

-- =============================================
-- CORE TABLES (no dependencies)
-- =============================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    avatar_url TEXT,
    subscription_tier TEXT DEFAULT 'free',
    credits_remaining INTEGER DEFAULT 100,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- =============================================
-- SCENARIO MODE TABLES
-- =============================================

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
    style_hints TEXT, -- JSON: genre, mood, pacing
    status TEXT DEFAULT 'draft', -- draft, improved, planned, completed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_scenarios_user ON scenarios(user_id);
CREATE INDEX IF NOT EXISTS idx_scenarios_status ON scenarios(status);

-- Scene breakdowns (parsed from scenarios)
CREATE TABLE IF NOT EXISTS scene_breakdowns (
    id TEXT PRIMARY KEY,
    scenario_id TEXT NOT NULL,
    scene_number INTEGER NOT NULL,
    title TEXT,
    summary TEXT,
    environment_description TEXT,
    characters TEXT, -- JSON array
    dialogue_blocks TEXT, -- JSON array
    emotions TEXT, -- JSON array
    visual_style TEXT,
    lighting TEXT,
    camera_suggestions TEXT, -- JSON array
    estimated_duration_sec INTEGER,
    transition_to_next TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_breakdowns_scenario ON scene_breakdowns(scenario_id);

-- =============================================
-- TIMELINE TABLES
-- =============================================

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
    status TEXT DEFAULT 'draft', -- draft, generating, ready, rendered
    global_style TEXT, -- JSON: genre, mood, color_palette
    continuity_settings TEXT, -- JSON: character/lighting/style consistency
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scenario_id) REFERENCES scenarios(id) ON DELETE SET NULL
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
    dialogue_handling_mode TEXT, -- full, compressed, narrative, visual_only, none
    motion_profile TEXT, -- smooth, dynamic, subtle, dramatic, static
    camera_path TEXT, -- static, pan, dolly, crane, tracking, zoom, orbit
    transition_type TEXT, -- none, cut, fade, dissolve, wipe, morph
    first_frame_url TEXT, -- R2 URL
    last_frame_url TEXT, -- R2 URL
    video_url TEXT, -- R2 URL for generated segment
    thumbnail_url TEXT, -- R2 URL
    style_lock TEXT, -- JSON: character/lighting/color consistency
    continuity_notes TEXT,
    status TEXT DEFAULT 'pending', -- pending, generating, generated, error
    error_message TEXT,
    generation_time_sec REAL,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
    FOREIGN KEY (scene_id) REFERENCES scene_breakdowns(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_segments_timeline ON segments(timeline_id);
CREATE INDEX IF NOT EXISTS idx_segments_position ON segments(timeline_id, position);
CREATE INDEX IF NOT EXISTS idx_segments_status ON segments(status);

-- Generation plans
CREATE TABLE IF NOT EXISTS generation_plans (
    id TEXT PRIMARY KEY,
    timeline_id TEXT NOT NULL,
    plan_json TEXT NOT NULL, -- Full plan object
    execution_order TEXT, -- JSON array of segment IDs
    models_used TEXT, -- JSON array
    estimated_time_sec INTEGER,
    frame_chaining_enabled INTEGER DEFAULT 1,
    status TEXT DEFAULT 'pending', -- pending, running, paused, completed, failed
    progress_completed INTEGER DEFAULT 0,
    progress_total INTEGER DEFAULT 0,
    current_segment_id TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plans_timeline ON generation_plans(timeline_id);

-- =============================================
-- PROJECTS & GALLERY TABLES
-- =============================================

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
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES project_folders(id) ON DELETE SET NULL
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
    video_url TEXT, -- R2 URL
    thumbnail_url TEXT, -- R2 URL
    preview_urls TEXT, -- JSON array of R2 URLs
    duration_sec INTEGER,
    resolution TEXT,
    aspect_ratio TEXT,
    fps INTEGER,
    model_used TEXT,
    tags TEXT, -- JSON array
    is_favorite INTEGER DEFAULT 0,
    status TEXT DEFAULT 'draft', -- draft, generating, completed, published, failed
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (folder_id) REFERENCES project_folders(id) ON DELETE SET NULL,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_projects_user ON video_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_folder ON video_projects(folder_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON video_projects(status);

-- Project versions (for history)
CREATE TABLE IF NOT EXISTS project_versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    version_number INTEGER NOT NULL,
    scenario TEXT,
    timeline_snapshot TEXT, -- JSON
    video_url TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_versions_project ON project_versions(project_id);

-- =============================================
-- COVER GENERATION TABLES
-- =============================================

-- Cover variants
CREATE TABLE IF NOT EXISTS covers (
    id TEXT PRIMARY KEY,
    timeline_id TEXT,
    project_id TEXT,
    platform TEXT NOT NULL, -- youtube, tiktok, instagram, facebook, vimeo, twitch
    cover_url TEXT NOT NULL, -- R2 URL
    prompt_used TEXT,
    model_used TEXT,
    variant_number INTEGER DEFAULT 1,
    style TEXT,
    dominant_colors TEXT, -- JSON array
    has_text_overlay INTEGER DEFAULT 0,
    is_selected INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_covers_timeline ON covers(timeline_id);
CREATE INDEX IF NOT EXISTS idx_covers_project ON covers(project_id);
CREATE INDEX IF NOT EXISTS idx_covers_platform ON covers(platform);

-- =============================================
-- PUBLISHING TABLES
-- =============================================

-- Platform credentials
CREATE TABLE IF NOT EXISTS platform_credentials (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    platform TEXT NOT NULL, -- youtube, tiktok, instagram, facebook, vimeo, twitch
    access_token TEXT NOT NULL,
    refresh_token TEXT,
    expires_at TEXT,
    channel_id TEXT,
    channel_name TEXT,
    profile_image TEXT,
    connected_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
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
    tags TEXT, -- JSON array
    hashtags TEXT, -- JSON array
    category TEXT,
    thumbnail_url TEXT, -- R2 URL
    cover_id TEXT,
    chapters TEXT, -- JSON array
    visibility TEXT DEFAULT 'public', -- public, unlisted, private, scheduled
    scheduled_at TEXT,
    status TEXT DEFAULT 'pending', -- pending, uploading, processing, published, scheduled, failed, rate_limited
    platform_video_id TEXT,
    platform_url TEXT,
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    published_at TEXT,
    FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (cover_id) REFERENCES covers(id) ON DELETE SET NULL
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
    cover_images TEXT, -- JSON: {youtube: url, tiktok: url, ...}
    cover_variants TEXT, -- JSON: {youtube: [url1, url2], ...}
    cover_prompts TEXT, -- JSON: {youtube: prompt, ...}
    scenario TEXT,
    final_prompts TEXT, -- JSON array
    timeline_snapshot TEXT, -- JSON
    generation_plan_id TEXT,
    model_used TEXT,
    publish_platforms TEXT, -- JSON array
    publish_jobs TEXT, -- JSON array of job IDs
    publish_status TEXT DEFAULT 'pending', -- pending, partial, complete, failed
    publish_date TEXT,
    tags TEXT, -- JSON array
    hashtags TEXT, -- JSON: {youtube: [...], tiktok: [...]}
    categories TEXT, -- JSON: {youtube: cat, ...}
    view_stats TEXT, -- JSON: {youtube: {views, likes, ...}}
    version INTEGER DEFAULT 1,
    previous_versions TEXT, -- JSON array of IDs
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (project_id) REFERENCES video_projects(id) ON DELETE CASCADE,
    FOREIGN KEY (timeline_id) REFERENCES timelines(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_published_user ON published_items(user_id);
CREATE INDEX IF NOT EXISTS idx_published_project ON published_items(project_id);
CREATE INDEX IF NOT EXISTS idx_published_status ON published_items(publish_status);

-- =============================================
-- PROMPT MANAGEMENT TABLES
-- =============================================

-- Saved prompts library
CREATE TABLE IF NOT EXISTS prompt_library (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    prompt_text TEXT NOT NULL,
    category TEXT, -- scene, character, environment, action, dialogue
    tags TEXT, -- JSON array
    use_count INTEGER DEFAULT 0,
    is_favorite INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prompts_user ON prompt_library(user_id);
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompt_library(category);

-- Scenario templates
CREATE TABLE IF NOT EXISTS scenario_templates (
    id TEXT PRIMARY KEY,
    user_id TEXT, -- NULL for system templates
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL, -- trailer, episode, vlog, short_film, commercial, etc.
    scenario_template TEXT NOT NULL,
    style_hints TEXT, -- JSON
    recommended_duration_sec INTEGER,
    example_prompts TEXT, -- JSON array
    is_public INTEGER DEFAULT 0,
    use_count INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_templates_category ON scenario_templates(category);
CREATE INDEX IF NOT EXISTS idx_templates_public ON scenario_templates(is_public);

-- =============================================
-- AUDIT & ANALYTICS TABLES
-- =============================================

-- Generation history (for analytics)
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
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (segment_id) REFERENCES segments(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_history_user ON generation_history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_date ON generation_history(created_at);

-- API usage logs
CREATE TABLE IF NOT EXISTS api_usage_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT,
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    status_code INTEGER,
    response_time_ms INTEGER,
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_logs_user ON api_usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_logs_endpoint ON api_usage_logs(endpoint);
CREATE INDEX IF NOT EXISTS idx_logs_date ON api_usage_logs(created_at);
