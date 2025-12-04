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

// POST /scenario/improve - Improve scenario with AI (supports vision for storyboards)
scenarioRoutes.post('/scenario/improve', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      scenario_text,
      target_duration_sec,
      target_model_id,
      language,
      style_hints,
      // Vision AI for storyboard analysis
      vision_model_id,
      storyboard_images, // Array of { data: base64, caption?: string }
    } = body;

    if (!scenario_text && (!storyboard_images || storyboard_images.length === 0)) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text or storyboard_images is required' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    const googleKey = c.env.GOOGLE_API_KEY;
    const anthropicKey = c.env.ANTHROPIC_API_KEY;
    
    // If storyboard images provided, analyze them first with vision AI
    let enhancedScenario = scenario_text || '';
    
    if (storyboard_images && storyboard_images.length > 0 && vision_model_id) {
      const visionAnalysis = await analyzeStoryboardWithVision(
        storyboard_images,
        scenario_text,
        vision_model_id,
        { openaiKey, googleKey, anthropicKey }
      );
      
      if (visionAnalysis) {
        // Combine original scenario with vision analysis
        enhancedScenario = visionAnalysis.combined_scenario || scenario_text;
      }
    }
    
    const result = await improveScenario(
      {
        scenario_text: enhancedScenario,
        target_duration_sec,
        target_model_id,
        language,
        style_hints,
      },
      openaiKey
    );

    return c.json({
      success: true,
      data: {
        ...result,
        storyboard_analyzed: storyboard_images?.length > 0,
        vision_model_used: storyboard_images?.length > 0 ? vision_model_id : undefined,
      },
    });
  } catch (error: any) {
    console.error('Improve scenario error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to improve scenario' },
    }, 500);
  }
});

// Helper function to analyze storyboard images with vision AI
async function analyzeStoryboardWithVision(
  images: { data: string; caption?: string }[],
  existingScenario: string,
  modelId: string,
  apiKeys: { openaiKey?: string; googleKey?: string; anthropicKey?: string }
): Promise<{ combined_scenario: string; visual_descriptions: string[] } | null> {
  try {
    const prompt = `You are a professional storyboard analyst and screenwriter. Analyze these storyboard images and combine the visual information with the provided scenario text to create a comprehensive, improved scenario.

${existingScenario ? `EXISTING SCENARIO TEXT:\n${existingScenario}\n\n` : ''}

For each image, describe:
1. The visual composition and framing
2. Characters, their positions, and expressions
3. Environment and setting details
4. Lighting, colors, and mood
5. Implied camera movement or action

Then synthesize all this information into a cohesive, detailed scenario that incorporates both the text and visual elements. The output should be a complete, production-ready scenario with scene breakdowns.

Return the improved scenario text that merges the original text with insights from the images.`;

    // Call appropriate vision API based on model
    if (modelId.startsWith('gpt-') && apiKeys.openaiKey) {
      const messages: any[] = [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            ...images.map((img, i) => ({
              type: 'image_url',
              image_url: { 
                url: img.data,
                detail: 'high'
              }
            })),
            ...images.filter(img => img.caption).map((img, i) => ({
              type: 'text',
              text: `Image ${i + 1} caption: ${img.caption}`
            })),
          ],
        },
      ];

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKeys.openaiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      const data: any = await response.json();
      if (data.choices?.[0]?.message?.content) {
        return {
          combined_scenario: data.choices[0].message.content,
          visual_descriptions: [],
        };
      }
    } else if (modelId.startsWith('gemini-') && apiKeys.googleKey) {
      // Gemini API call
      const parts: any[] = [{ text: prompt }];
      
      for (const img of images) {
        // Extract base64 data and mime type
        const match = img.data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({
            inline_data: {
              mime_type: match[1],
              data: match[2],
            },
          });
          if (img.caption) {
            parts.push({ text: `Caption: ${img.caption}` });
          }
        }
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1/models/${modelId}:generateContent?key=${apiKeys.googleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              maxOutputTokens: 4000,
              temperature: 0.7,
            },
          }),
        }
      );

      const data: any = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        return {
          combined_scenario: data.candidates[0].content.parts[0].text,
          visual_descriptions: [],
        };
      }
    } else if (modelId.startsWith('claude-') && apiKeys.anthropicKey) {
      // Claude API call
      const content: any[] = [{ type: 'text', text: prompt }];
      
      for (const img of images) {
        const match = img.data.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: match[1],
              data: match[2],
            },
          });
          if (img.caption) {
            content.push({ type: 'text', text: `Caption: ${img.caption}` });
          }
        }
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKeys.anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: modelId,
          max_tokens: 4000,
          messages: [{ role: 'user', content }],
        }),
      });

      const data: any = await response.json();
      if (data.content?.[0]?.text) {
        return {
          combined_scenario: data.content[0].text,
          visual_descriptions: [],
        };
      }
    }

    return null;
  } catch (error) {
    console.error('Vision analysis error:', error);
    return null;
  }
}

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
