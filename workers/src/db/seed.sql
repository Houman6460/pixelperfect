-- PixelPerfect Seed Data

-- Billing periods
INSERT OR REPLACE INTO billing_periods (id, period, label, months, discount_percent) VALUES
  ('bp_monthly', 'monthly', 'Monthly', 1, 0),
  ('bp_quarterly', 'quarterly', '3 Months', 3, 10),
  ('bp_biannual', 'biannual', '6 Months', 6, 15),
  ('bp_annual', 'annual', 'Annual', 12, 20);

-- Individual Studio Plans
INSERT OR REPLACE INTO subscription_plans (id, name, description, type, base_price, tokens_per_month, studios, features) VALUES
  ('plan_image', 'Image Studio', 'Full access to AI image generation and editing', 'individual', 9.99, 500, '["image"]', '["AI Image Generation", "Image Enhancement", "Background Removal", "Style Transfer", "500 tokens/month"]'),
  ('plan_video', 'Video Studio', 'Full access to AI video generation', 'individual', 14.99, 750, '["video"]', '["AI Video Generation", "Video Enhancement", "Text-to-Video", "Image-to-Video", "750 tokens/month"]'),
  ('plan_sound', 'Sound Studio', 'Full access to AI music and audio tools', 'individual', 12.99, 600, '["sound"]', '["AI Music Generation", "Voice Cloning", "Audio Enhancement", "Stem Separation", "600 tokens/month"]'),
  ('plan_text', 'Text Studio', 'Full access to AI text generation', 'individual', 7.99, 400, '["text"]', '["GPT-4o & Claude Access", "AI Chat & Completion", "Content Writing", "Code Generation", "400 tokens/month"]'),
  ('plan_3d', '3D Studio', 'Full access to AI 3D model generation', 'individual', 14.99, 500, '["3d"]', '["Text-to-3D Generation", "Image-to-3D Conversion", "3D Model Export", "Multiple Formats", "500 tokens/month"]');

-- Collection Bundle Plans
INSERT OR REPLACE INTO subscription_plans (id, name, description, type, base_price, tokens_per_month, studios, features) VALUES
  ('plan_creative', 'Creative Collection', 'Image, Video, and Sound studios bundled together', 'collection', 29.99, 1500, '["image", "video", "sound"]', '["Image Studio - Full Access", "Video Studio - Full Access", "Sound Studio - Full Access", "Priority Processing", "1,500 tokens/month", "Save 20% vs Individual"]'),
  ('plan_advanced', 'Advanced Collection', 'All 5 studios with full access', 'advanced', 49.99, 3000, '["image", "video", "sound", "text", "3d"]', '["All 5 Studios - Full Access", "Priority Processing", "API Access", "3,000 tokens/month", "Dedicated Support", "Save 35% vs Individual"]');

-- Full Tier Plans
INSERT OR REPLACE INTO subscription_plans (id, name, description, type, base_price, tokens_per_month, studios, features) VALUES
  ('plan_free', 'Free', 'Get started with basic features', 'tier', 0, 50, '["image"]', '["50 tokens/month", "Image Studio only", "Basic models", "Web interface"]'),
  ('plan_creator', 'Creator', 'For individual creators', 'tier', 19.00, 1000, '[]', '["1,000 tokens/month", "Choose 2 Studios", "All premium models", "Priority processing", "Email support"]'),
  ('plan_professional', 'Professional', 'For professional creators', 'tier', 49.00, 5000, '["image", "video", "sound", "text", "3d"]', '["5,000 tokens/month", "All 5 Studios", "Fastest processing", "Full API access", "Priority support", "Team features"]'),
  ('plan_enterprise', 'Enterprise', 'Custom solutions for teams', 'tier', 0, -1, '["image", "video", "sound", "text", "3d"]', '["Unlimited tokens", "All Studios + Custom", "Dedicated infrastructure", "SLA guarantee", "Account manager", "Custom integrations"]');

-- Token Rules (costs per operation)
INSERT OR REPLACE INTO token_rules (id, operation, tokens_cost, description) VALUES
  ('tr_image_gen', 'image_generation', 5, 'Generate an AI image'),
  ('tr_image_upscale', 'image_upscale', 3, 'Upscale an image'),
  ('tr_image_edit', 'image_edit', 4, 'Edit an image with AI'),
  ('tr_bg_remove', 'background_removal', 2, 'Remove image background'),
  ('tr_video_gen', 'video_generation', 20, 'Generate an AI video'),
  ('tr_video_enhance', 'video_enhance', 10, 'Enhance video quality'),
  ('tr_music_gen', 'music_generation', 8, 'Generate AI music'),
  ('tr_voice_clone', 'voice_clone', 15, 'Clone a voice'),
  ('tr_text_gen', 'text_generation', 1, 'Generate text with AI'),
  ('tr_3d_gen', '3d_generation', 25, 'Generate a 3D model');

-- Default AI Model Configurations
INSERT OR REPLACE INTO ai_model_configs (id, provider, model_id, display_name, type, tokens_per_use, config) VALUES
  ('model_dalle3', 'openai', 'dall-e-3', 'DALL-E 3', 'image', 5, '{"size": "1024x1024", "quality": "standard"}'),
  ('model_sd3', 'stability', 'stable-diffusion-3', 'Stable Diffusion 3', 'image', 4, '{}'),
  ('model_flux', 'replicate', 'flux-1.1-pro', 'Flux 1.1 Pro', 'image', 6, '{}'),
  ('model_gpt4o', 'openai', 'gpt-4o', 'GPT-4o', 'text', 2, '{}'),
  ('model_claude', 'anthropic', 'claude-3-5-sonnet', 'Claude 3.5 Sonnet', 'text', 2, '{}'),
  ('model_suno', 'suno', 'v3.5', 'Suno v3.5', 'audio', 8, '{}'),
  ('model_kling', 'kling', 'v1.5', 'Kling v1.5', 'video', 20, '{}'),
  ('model_meshy', 'meshy', 'meshy-4', 'Meshy-4', '3d', 25, '{}');

-- Admin settings
INSERT OR REPLACE INTO admin_settings (key, value, description) VALUES
  ('ai_provider', 'openai', 'Default AI provider'),
  ('max_file_size_mb', '100', 'Maximum upload file size in MB'),
  ('maintenance_mode', 'false', 'Enable maintenance mode'),
  ('signup_enabled', 'true', 'Allow new user registrations'),
  ('free_tokens_on_signup', '50', 'Free tokens for new users');

-- Default admin user (password: admin123 - CHANGE IN PRODUCTION)
INSERT OR REPLACE INTO users (id, email, password_hash, name, role, tokens) VALUES
  ('user_admin', 'admin@pixelperfect.ai', '$2b$10$rQZ5K1234567890abcdefghijklmnopqrstuvwxyz', 'Admin', 'admin', 999999);
