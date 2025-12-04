/**
 * AI Video Prompt Assistant Routes
 * Model-aware prompt transformation and dialogue handling
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { improveScenePrompt, compileFinalPrompt } from '../services/promptAssistant';
import { getModelCapabilities, getAllModels } from '../services/modelRegistry';
import { getApiKey } from '../services/apiKeyManager';

type Variables = {
  user: User;
};

export const promptAssistantRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== PUBLIC ENDPOINTS ====================

// GET /prompt-assistant/models - Get all available models with capabilities
promptAssistantRoutes.get('/prompt-assistant/models', async (c) => {
  try {
    const models = getAllModels();
    return c.json({
      success: true,
      data: models.map(m => ({
        model_id: m.modelId,
        display_name: m.displayName,
        max_duration_sec: m.maxDurationSec,
        max_prompt_chars: m.maxPromptChars,
        supports_dialogue: m.supportsDialogue,
        prompt_style: m.promptStyle,
        provider: m.provider,
      })),
    });
  } catch (error) {
    console.error('Get models error:', error);
    return c.json({ success: false, error: 'Failed to get models' }, 500);
  }
});

// GET /prompt-assistant/capabilities/:modelId - Get specific model capabilities
promptAssistantRoutes.get('/prompt-assistant/capabilities/:modelId', async (c) => {
  try {
    const modelId = c.req.param('modelId');
    const caps = getModelCapabilities(modelId);
    
    return c.json({
      success: true,
      data: {
        model_id: caps.modelId,
        display_name: caps.displayName,
        max_duration_sec: caps.maxDurationSec,
        max_prompt_chars: caps.maxPromptChars,
        supports_dialogue: caps.supportsDialogue,
        prompt_style: caps.promptStyle,
        provider: caps.provider,
        style_tokens: caps.styleTokens,
      },
    });
  } catch (error) {
    console.error('Get capabilities error:', error);
    return c.json({ success: false, error: 'Failed to get model capabilities' }, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

// POST /prompt-assistant/improve - Improve scene prompt
promptAssistantRoutes.post('/prompt-assistant/improve', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { model_id, scene_prompt, tone, language } = body;

    if (!scene_prompt || !model_id) {
      return c.json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: 'model_id and scene_prompt are required' } 
      }, 400);
    }

    const openaiKey = await getApiKey(c.env, 'openai');
    const result = await improveScenePrompt(
      { model_id, scene_prompt, tone, language },
      openaiKey
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Improve prompt error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to improve prompt' } 
    }, 500);
  }
});

// POST /prompt-assistant/compile - Compile final prompt (scene + dialogue)
promptAssistantRoutes.post('/prompt-assistant/compile', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { model_id, scene_prompt, dialogue, language } = body;

    if (!scene_prompt || !model_id) {
      return c.json({ 
        success: false, 
        error: { code: 'BAD_REQUEST', message: 'model_id and scene_prompt are required' } 
      }, 400);
    }

    const openaiKey = await getApiKey(c.env, 'openai');
    const result = await compileFinalPrompt(
      { model_id, scene_prompt, dialogue, language },
      openaiKey
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Compile prompt error:', error);
    return c.json({ 
      success: false, 
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to compile prompt' } 
    }, 500);
  }
});

// ==================== LEGACY ENDPOINTS (for backward compatibility) ====================

// POST /prompt-assistant/ai-enhance - Legacy endpoint (maps to /improve)
promptAssistantRoutes.post('/prompt-assistant/ai-enhance', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { prompt, model_id, tone_preset } = body;

    if (!prompt || !model_id) {
      return c.json({ success: false, error: 'prompt and model_id are required' }, 400);
    }

    const openaiKey = await getApiKey(c.env, 'openai');
    const result = await improveScenePrompt(
      { model_id, scene_prompt: prompt, tone: tone_preset },
      openaiKey
    );

    // Return in legacy format
    return c.json({
      success: true,
      data: {
        original_prompt: prompt,
        enhanced_prompt: result.improved_scene_prompt,
        model_id: result.model_id,
        enhancement_method: openaiKey ? 'ai' : 'rules',
        prompt_length: result.length_chars,
        max_length: getModelCapabilities(model_id).maxPromptChars,
      },
    });
  } catch (error) {
    console.error('AI enhance error:', error);
    return c.json({ success: false, error: 'Failed to enhance prompt' }, 500);
  }
});

// POST /prompt-assistant/build - Legacy endpoint (maps to /compile)
promptAssistantRoutes.post('/prompt-assistant/build', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { scene_prompt, dialogue, model_id } = body;

    if (!scene_prompt || !model_id) {
      return c.json({ success: false, error: 'scene_prompt and model_id are required' }, 400);
    }

    const openaiKey = await getApiKey(c.env, 'openai');
    const result = await compileFinalPrompt(
      { model_id, scene_prompt, dialogue },
      openaiKey
    );

    const caps = getModelCapabilities(model_id);

    // Return in legacy format
    return c.json({
      success: true,
      data: {
        final_prompt: result.final_prompt,
        original_scene: scene_prompt,
        improved_scene: result.final_prompt.split('\n')[0], // First line approximation
        original_dialogue: dialogue,
        processed_dialogue: result.dialogue_mode !== 'none' ? dialogue : '',
        model_id: result.model_id,
        model_name: caps.displayName,
        prompt_length: result.length_chars,
        max_length: caps.maxPromptChars,
        warnings: result.warnings.length > 0 ? result.warnings : undefined,
        capabilities: {
          supports_dialogue: caps.supportsDialogue,
          dialogue_format: caps.supportsDialogue,
          supports_negative_prompt: true,
        },
      },
    });
  } catch (error) {
    console.error('Build prompt error:', error);
    return c.json({ success: false, error: 'Failed to build prompt' }, 500);
  }
});

// GET /prompt-assistant/capabilities - Legacy endpoint (get all capabilities)
promptAssistantRoutes.get('/prompt-assistant/capabilities', async (c) => {
  const models = getAllModels();
  const modelsMap: Record<string, any> = {};
  
  models.forEach(m => {
    modelsMap[m.modelId] = {
      model_id: m.modelId,
      display_name: m.displayName,
      max_prompt_length: m.maxPromptChars,
      supports_dialogue: m.supportsDialogue,
      dialogue_format: m.supportsDialogue === 'full' ? 'labeled' : m.supportsDialogue === 'limited' ? 'narrative' : 'none',
      supports_negative_prompt: true,
    };
  });

  return c.json({
    success: true,
    data: {
      models: modelsMap,
      tone_presets: ['cinematic', 'documentary', 'dreamlike', 'action', 'romantic'],
      dialogue_personas: ['whispering', 'angry', 'emotional', 'calm', 'excited', 'fearful'],
    },
  });
});

export default promptAssistantRoutes;
