-- Model Routing Migration
-- Migration: 004_model_routing
-- Adds current_mode and replicate_model columns to ai_model_configs for smart cost tracking

-- Add current_mode column (direct or replicate)
ALTER TABLE ai_model_configs ADD COLUMN current_mode TEXT DEFAULT 'direct' CHECK (current_mode IN ('direct', 'replicate'));

-- Add replicate_model column (the model ID to use when in replicate mode)
ALTER TABLE ai_model_configs ADD COLUMN replicate_model TEXT;

-- Update existing models with their default modes
-- Image models
UPDATE ai_model_configs SET current_mode = 'replicate', replicate_model = 'stability-ai/sdxl' WHERE model_id = 'sdxl';
UPDATE ai_model_configs SET current_mode = 'replicate', replicate_model = 'black-forest-labs/flux-dev' WHERE model_id LIKE '%flux%';
UPDATE ai_model_configs SET current_mode = 'direct' WHERE provider = 'openai';
UPDATE ai_model_configs SET current_mode = 'direct' WHERE provider = 'google';

-- Video models - mostly direct since replicate support varies
UPDATE ai_model_configs SET current_mode = 'direct' WHERE type = 'video' AND provider = 'google';
UPDATE ai_model_configs SET current_mode = 'direct' WHERE type = 'video' AND provider = 'kling';
UPDATE ai_model_configs SET current_mode = 'direct' WHERE type = 'video' AND provider = 'openai';
UPDATE ai_model_configs SET current_mode = 'replicate', replicate_model = 'luma/ray-2' WHERE model_id LIKE '%luma%' OR model_id LIKE '%ray%';
UPDATE ai_model_configs SET current_mode = 'replicate', replicate_model = 'minimax/video-01' WHERE model_id LIKE '%minimax%';
UPDATE ai_model_configs SET current_mode = 'replicate', replicate_model = 'runway/gen-3-alpha' WHERE model_id LIKE '%runway%' OR model_id LIKE '%gen-3%';

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_ai_model_configs_mode ON ai_model_configs(current_mode);
