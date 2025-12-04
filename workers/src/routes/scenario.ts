/**
 * Scenario Assistant Routes
 * API endpoints for scenario improvement and timeline generation
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { improveScenario, generatePlan } from '../services/scenarioAssistant';
import { parseScenario } from '../services/scenarioParser';
import { getAllModels } from '../services/modelRegistry';

type Variables = {
  user: User;
};

export const scenarioRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== PUBLIC ENDPOINTS ====================

// GET /scenario/models - Get all models suitable for scenario generation
scenarioRoutes.get('/scenario/models', async (c) => {
  try {
    const models = getAllModels();
    
    // Return models sorted by max duration (best for long-form content first)
    const sortedModels = models
      .sort((a, b) => b.maxDurationSec - a.maxDurationSec)
      .map(m => ({
        model_id: m.modelId,
        display_name: m.displayName,
        max_duration_sec: m.maxDurationSec,
        max_prompt_chars: m.maxPromptChars,
        supports_dialogue: m.supportsDialogue,
        provider: m.provider,
        recommended_for_scenario: m.maxDurationSec >= 5 && m.maxPromptChars >= 300,
      }));

    return c.json({
      success: true,
      data: {
        models: sortedModels,
        recommended: sortedModels.filter(m => m.recommended_for_scenario),
      },
    });
  } catch (error) {
    console.error('Get scenario models error:', error);
    return c.json({ success: false, error: 'Failed to get models' }, 500);
  }
});

// ==================== AUTHENTICATED ENDPOINTS ====================

// POST /scenario/parse - Parse scenario into breakdown (for preview)
scenarioRoutes.post('/scenario/parse', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { scenario_text, language } = body;

    if (!scenario_text) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text is required' },
      }, 400);
    }

    const result = await parseScenario({ scenario_text, language });

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Parse scenario error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to parse scenario' },
    }, 500);
  }
});

// POST /scenario/improve - Improve scenario with AI
scenarioRoutes.post('/scenario/improve', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      scenario_text,
      target_duration_sec,
      target_model_id,
      language,
      style_hints,
    } = body;

    if (!scenario_text) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text is required' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    
    const result = await improveScenario(
      {
        scenario_text,
        target_duration_sec,
        target_model_id,
        language,
        style_hints,
      },
      openaiKey
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Improve scenario error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to improve scenario' },
    }, 500);
  }
});

// POST /scenario/generate-plan - Generate timeline from scenario
scenarioRoutes.post('/scenario/generate-plan', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      scenario_text,
      target_duration_sec,
      target_model_id,
      language,
      options,
    } = body;

    if (!scenario_text || !target_model_id) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text and target_model_id are required' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;

    const result = await generatePlan(
      {
        scenario_text,
        target_duration_sec: target_duration_sec || 60,
        target_model_id,
        language,
        options,
      },
      openaiKey
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Generate plan error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate plan' },
    }, 500);
  }
});

// POST /scenario/full-pipeline - Complete pipeline: improve → parse → generate plan
scenarioRoutes.post('/scenario/full-pipeline', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      scenario_text,
      target_duration_sec,
      target_model_id,
      language,
      style_hints,
      options,
      skip_improvement,
    } = body;

    if (!scenario_text || !target_model_id) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text and target_model_id are required' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    const allWarnings: string[] = [];
    let scenarioToUse = scenario_text;

    // Step 1: Improve scenario (unless skipped)
    let improvementResult = null;
    if (!skip_improvement) {
      improvementResult = await improveScenario(
        {
          scenario_text,
          target_duration_sec,
          target_model_id,
          language,
          style_hints,
        },
        openaiKey
      );
      scenarioToUse = improvementResult.improved_scenario;
      allWarnings.push(...improvementResult.warnings);
    }

    // Step 2: Generate plan
    const planResult = await generatePlan(
      {
        scenario_text: scenarioToUse,
        target_duration_sec: target_duration_sec || 60,
        target_model_id,
        language,
        options,
      },
      openaiKey
    );
    allWarnings.push(...planResult.warnings);

    return c.json({
      success: true,
      data: {
        improvement: improvementResult,
        timeline: planResult.timeline,
        generation_plan: planResult.generation_plan,
        breakdown: planResult.breakdown,
        warnings: allWarnings,
      },
    });
  } catch (error: any) {
    console.error('Full pipeline error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to process scenario' },
    }, 500);
  }
});

export default scenarioRoutes;
