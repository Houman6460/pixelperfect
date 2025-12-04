-- Token Economics Migration
-- Migration: 003_token_economics
-- Adds provider cost tracking, markup configuration, and enhanced analytics

-- Provider cost configurations (what we pay to AI providers)
CREATE TABLE IF NOT EXISTS provider_costs (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL, -- openai, replicate, stability, anthropic, google, suno, kling, meshy
  model_id TEXT NOT NULL, -- specific model identifier
  display_name TEXT NOT NULL,
  operation_type TEXT NOT NULL, -- image_generation, text_generation, audio_generation, video_generation, 3d_generation, upscale, etc.
  cost_per_unit REAL NOT NULL, -- Cost in USD per unit (e.g., per image, per 1k tokens)
  cost_unit TEXT NOT NULL DEFAULT 'per_request', -- per_request, per_1k_tokens, per_second, per_megapixel
  avg_units_per_request REAL DEFAULT 1, -- Average units consumed per typical request
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  UNIQUE(provider, model_id, operation_type)
);

CREATE INDEX IF NOT EXISTS idx_provider_costs_provider ON provider_costs(provider);
CREATE INDEX IF NOT EXISTS idx_provider_costs_operation ON provider_costs(operation_type);

-- Token pricing rules with markup (what we charge users)
CREATE TABLE IF NOT EXISTS token_pricing (
  id TEXT PRIMARY KEY,
  operation TEXT UNIQUE NOT NULL, -- image_generation, text_generation, upscale_2x, upscale_4x, etc.
  display_name TEXT NOT NULL,
  description TEXT,
  base_provider_cost REAL DEFAULT 0, -- Estimated provider cost per operation
  tokens_charged INTEGER NOT NULL, -- Tokens we charge the user
  markup_percent REAL DEFAULT 100, -- Markup percentage over provider cost
  min_tokens INTEGER DEFAULT 1,
  max_tokens INTEGER,
  is_active INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Subscription plan token allocations
CREATE TABLE IF NOT EXISTS plan_token_config (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  tokens_monthly INTEGER NOT NULL DEFAULT 0, -- Monthly token allocation
  tokens_bonus INTEGER DEFAULT 0, -- Bonus tokens on signup
  rollover_enabled INTEGER DEFAULT 0, -- Can unused tokens roll over?
  rollover_max_months INTEGER DEFAULT 1, -- Max months to roll over
  rollover_cap_percent INTEGER DEFAULT 100, -- Cap as % of monthly allocation
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (plan_id) REFERENCES subscription_plans(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_plan_token_config_plan_id ON plan_token_config(plan_id);

-- Enhanced token usage log with provider cost tracking
ALTER TABLE token_usage_log ADD COLUMN provider_cost REAL DEFAULT 0;
ALTER TABLE token_usage_log ADD COLUMN provider TEXT;
ALTER TABLE token_usage_log ADD COLUMN model TEXT;
ALTER TABLE token_usage_log ADD COLUMN metadata TEXT; -- JSON for additional details

-- Provider API usage tracking (aggregate for billing/analytics)
CREATE TABLE IF NOT EXISTS provider_usage_log (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  user_id TEXT,
  job_id TEXT,
  units_consumed REAL NOT NULL DEFAULT 1,
  cost_usd REAL NOT NULL DEFAULT 0,
  request_metadata TEXT, -- JSON: input tokens, output tokens, image size, etc.
  response_time_ms INTEGER,
  success INTEGER DEFAULT 1,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_provider_usage_log_provider ON provider_usage_log(provider);
CREATE INDEX IF NOT EXISTS idx_provider_usage_log_user_id ON provider_usage_log(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_usage_log_created_at ON provider_usage_log(created_at);

-- Admin token economics dashboard settings
INSERT OR IGNORE INTO admin_settings (key, value, description) VALUES
  ('default_markup_percent', '100', 'Default markup percentage for new operations'),
  ('token_usd_rate', '0.01', 'USD value per token (for display purposes)'),
  ('free_tier_tokens', '50', 'Free tokens for new users'),
  ('low_balance_warning', '10', 'Warn users when tokens below this amount');

-- Insert default provider costs (approximate values - admin should update)
INSERT OR IGNORE INTO provider_costs (id, provider, model_id, display_name, operation_type, cost_per_unit, cost_unit, notes) VALUES
  -- OpenAI
  ('pc_openai_dalle3', 'openai', 'dall-e-3', 'DALL-E 3', 'image_generation', 0.04, 'per_request', '$0.04 per image (1024x1024)'),
  ('pc_openai_dalle3_hd', 'openai', 'dall-e-3-hd', 'DALL-E 3 HD', 'image_generation', 0.08, 'per_request', '$0.08 per HD image'),
  ('pc_openai_gpt4o', 'openai', 'gpt-4o', 'GPT-4o', 'text_generation', 0.005, 'per_1k_tokens', '$5/1M input, $15/1M output'),
  ('pc_openai_gpt4o_mini', 'openai', 'gpt-4o-mini', 'GPT-4o Mini', 'text_generation', 0.00015, 'per_1k_tokens', '$0.15/1M input'),
  -- Replicate
  ('pc_replicate_sdxl', 'replicate', 'stability-ai/sdxl', 'Stable Diffusion XL', 'image_generation', 0.0023, 'per_request', 'Approx $0.0023/image'),
  ('pc_replicate_realvis', 'replicate', 'lucataco/realvisxl-v2.0', 'RealVisXL', 'image_generation', 0.003, 'per_request', 'Approx $0.003/image'),
  ('pc_replicate_upscale', 'replicate', 'nightmareai/real-esrgan', 'Real-ESRGAN', 'upscale', 0.0046, 'per_request', 'Approx $0.0046/upscale'),
  -- Stability AI
  ('pc_stability_sd3', 'stability', 'sd3', 'Stable Diffusion 3', 'image_generation', 0.035, 'per_request', '$0.035/image'),
  ('pc_stability_upscale', 'stability', 'esrgan', 'ESRGAN Upscale', 'upscale', 0.02, 'per_megapixel', '$0.02/megapixel'),
  -- Suno
  ('pc_suno_v3', 'suno', 'v3', 'Suno v3', 'audio_generation', 0.05, 'per_request', 'Approx $0.05/song clip'),
  -- Meshy
  ('pc_meshy_3d', 'meshy', 'text-to-3d', 'Meshy Text-to-3D', '3d_generation', 0.10, 'per_request', 'Approx $0.10/model');

-- Insert default token pricing with markup
INSERT OR IGNORE INTO token_pricing (id, operation, display_name, description, base_provider_cost, tokens_charged, markup_percent) VALUES
  ('tp_image_gen', 'image_generation', 'Image Generation', 'Generate images with AI', 0.04, 5, 150),
  ('tp_image_gen_hd', 'image_generation_hd', 'HD Image Generation', 'High quality image generation', 0.08, 10, 150),
  ('tp_text_gen', 'text_generation', 'Text Generation', 'Generate text with AI', 0.005, 2, 200),
  ('tp_upscale_2x', 'upscale_2x', '2x Upscale', 'Upscale image 2x', 0.01, 2, 200),
  ('tp_upscale_4x', 'upscale_4x', '4x Upscale', 'Upscale image 4x', 0.02, 4, 200),
  ('tp_audio_gen', 'audio_generation', 'Audio/Music Generation', 'Generate music or audio', 0.05, 8, 160),
  ('tp_video_gen', 'video_generation', 'Video Generation', 'Generate short videos', 0.20, 20, 150),
  ('tp_3d_gen', '3d_generation', '3D Model Generation', 'Generate 3D models', 0.10, 15, 150),
  ('tp_enhance', 'enhance', 'Image Enhancement', 'Enhance image quality', 0.01, 2, 200),
  ('tp_reimagine', 'reimagine', 'Reimagine Image', 'AI reimagine an image', 0.03, 4, 180);

-- Insert default plan token configurations
INSERT OR IGNORE INTO plan_token_config (id, plan_id, tokens_monthly, tokens_bonus, rollover_enabled) 
SELECT 
  'ptc_' || id,
  id,
  tokens_per_month,
  CASE WHEN tokens_per_month > 500 THEN 50 ELSE 0 END,
  CASE WHEN tokens_per_month >= 1000 THEN 1 ELSE 0 END
FROM subscription_plans WHERE tokens_per_month > 0;
