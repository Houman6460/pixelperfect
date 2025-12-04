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
import { 
  ScenarioRepository, 
  TimelineDbRepository, 
  SegmentDbRepository,
  GenerationPlanRepository,
  saveGeneratedPlanToDb 
} from '../services/scenarioDb';

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

// POST /scenario/from-prompt - Generate full scenario from a simple concept prompt
scenarioRoutes.post('/scenario/from-prompt', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      concept_prompt,
      target_model_id,
      target_duration_sec,
      style_hints,
      genre,
      mood,
      ai_model_id = 'gpt-4o',
    } = body;

    if (!concept_prompt || concept_prompt.trim().length < 10) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'Please provide a concept prompt with at least 10 characters' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    if (!openaiKey) {
      return c.json({
        success: false,
        error: { code: 'CONFIG_ERROR', message: 'AI service not configured' },
      }, 500);
    }

    // Get model capabilities from the selected target model
    const models = getAllModels();
    const targetModel = models.find(m => m.modelId === target_model_id) || models[0];
    const maxSegmentDuration = targetModel?.maxDurationSec || 10;
    const targetDuration = target_duration_sec || 60;
    const estimatedSegments = Math.ceil(targetDuration / maxSegmentDuration);

    // Build prompt for scenario generation
    const systemPrompt = `You are a professional screenwriter and cinematic director. 
Your task is to transform a simple concept into a full cinematic scenario with rich visual details.

OUTPUT FORMAT:
- Write a detailed narrative scenario divided into clear scenes
- Use inline tags for cinematic directions: [camera: ...], [lighting: ...], [mood: ...], [fx: ...], [sfx: ...], [transition: ...]
- Each scene should be suitable for a ${maxSegmentDuration}-second video segment
- Total scenario should be paced for approximately ${targetDuration} seconds (${estimatedSegments} segments)
- Include character descriptions, environment details, and emotional beats
- Make every scene visually compelling and technically achievable with AI video generation

STYLE GUIDANCE:
${genre ? `- Genre: ${genre}` : '- Genre: Cinematic'}
${mood ? `- Mood: ${mood}` : '- Mood: Compelling'}
${style_hints ? `- Style notes: ${JSON.stringify(style_hints)}` : ''}

INLINE TAG EXAMPLES:
[camera: wide establishing shot] [lighting: golden hour] [mood: mysterious]
[camera: close-up on face] [fx: lens flare] [sfx: dramatic music swell]
[transition: slow fade] [camera: tracking shot] [lighting: neon-lit]`;

    const userPrompt = `Transform this concept into a full cinematic scenario:

"${concept_prompt}"

Create a compelling, visually rich story with ${estimatedSegments} distinct scenes, each suitable for a ${maxSegmentDuration}-second AI-generated video clip. Include inline tags for camera, lighting, mood, and effects.`;

    // Call OpenAI to generate the scenario
    const startTime = Date.now();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: ai_model_id.startsWith('gpt-') ? ai_model_id : 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return c.json({
        success: false,
        error: { code: 'AI_ERROR', message: 'Failed to generate scenario from prompt' },
      }, 500);
    }

    const data: any = await response.json();
    const rawScenario = data.choices?.[0]?.message?.content;
    const generationTimeMs = Date.now() - startTime;

    if (!rawScenario) {
      return c.json({
        success: false,
        error: { code: 'AI_ERROR', message: 'No scenario generated' },
      }, 500);
    }

    // Now improve the scenario using existing logic
    const improveResult = await improveScenario(
      {
        scenario_text: rawScenario,
        target_duration_sec: targetDuration,
        target_model_id: target_model_id || 'kling-2.5-pro',
        language: 'en',
        style_hints: style_hints || { genre: genre || 'cinematic', mood: mood || 'compelling' },
      },
      openaiKey
    );

    // Save to D1 if we have a database
    let scenarioId: string | null = null;
    try {
      const repo = new ScenarioRepository(c.env.DB);
      scenarioId = await repo.create({
        userId: user.id,
        title: concept_prompt.substring(0, 100),
        originalText: rawScenario,
        targetModelId: target_model_id,
        targetDurationSec: targetDuration,
        language: 'en',
        styleHints: style_hints || { genre, mood },
      });

      // Update with improved text
      await repo.updateImprovedText(scenarioId, improveResult.improved_scenario);

      // Save concept prompt reference (update scenario with concept_prompt)
      await c.env.DB.prepare(`
        UPDATE scenarios SET 
          concept_prompt = ?,
          generation_source = 'from_prompt',
          concept_prompt_model_id = ?,
          updated_at = datetime('now')
        WHERE id = ?
      `).bind(concept_prompt, ai_model_id, scenarioId).run();

    } catch (dbError) {
      console.error('Failed to save scenario to D1:', dbError);
      // Continue without saving - we'll still return the generated scenario
    }

    return c.json({
      success: true,
      data: {
        scenario_id: scenarioId,
        concept_prompt,
        raw_scenario: rawScenario,
        improved_scenario: improveResult.improved_scenario,
        warnings: improveResult.warnings || [],
        generation_stats: {
          generation_time_ms: generationTimeMs,
          ai_model: ai_model_id,
          target_model: target_model_id,
          estimated_segments: estimatedSegments,
        },
      },
    });
  } catch (error: any) {
    console.error('Generate scenario from prompt error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate scenario' },
    }, 500);
  }
});

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

// POST /scenario/improve - Improve scenario with AI (supports vision for storyboards and inline tags)
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
      // Inline scenario tags
      inline_tags, // Array of { type: string, value: string, offset: number }
      preserve_tags, // Boolean to tell AI to preserve existing tags
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
    
    // Build style hints with tag preservation instruction
    const enhancedStyleHints = {
      ...style_hints,
      preserve_inline_tags: preserve_tags,
      inline_tag_instructions: inline_tags?.length > 0 
        ? `IMPORTANT: Preserve all inline markup tags in the format [category: value]. These tags are: ${inline_tags.map((t: any) => `[${t.type}: ${t.value}]`).join(', ')}. Keep them in appropriate positions in the improved text. You may also suggest NEW tags where beneficial using the same format.`
        : undefined,
    };
    
    const result = await improveScenario(
      {
        scenario_text: enhancedScenario,
        target_duration_sec,
        target_model_id,
        language,
        style_hints: enhancedStyleHints,
      },
      openaiKey
    );

    // Parse tags from the improved scenario
    const tagRegex = /\[(\w+):\s*([^\]]+)\]/g;
    const resultTags: { type: string; value: string; offset: number }[] = [];
    let match;
    while ((match = tagRegex.exec(result.improved_scenario)) !== null) {
      resultTags.push({
        type: match[1].toLowerCase(),
        value: match[2].trim(),
        offset: match.index,
      });
    }

    return c.json({
      success: true,
      data: {
        ...result,
        storyboard_analyzed: storyboard_images?.length > 0,
        vision_model_used: storyboard_images?.length > 0 ? vision_model_id : undefined,
        inline_tags: resultTags,
        tags_preserved: preserve_tags && inline_tags?.length > 0,
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

// POST /scenario/generate-plan - Generate timeline from scenario (supports inline tags)
scenarioRoutes.post('/scenario/generate-plan', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      scenario_text,
      target_duration_sec,
      target_model_id,
      language,
      options,
      inline_tags, // Array of { type: string, value: string, offset: number }
    } = body;

    if (!scenario_text || !target_model_id) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text and target_model_id are required' },
      }, 400);
    }

    const openaiKey = c.env.OPENAI_API_KEY;
    
    // Build enhanced options with inline tag instructions
    const enhancedOptions = {
      ...options,
      inline_tags: inline_tags,
      tag_instructions: inline_tags?.length > 0 
        ? buildTagInstructions(inline_tags)
        : undefined,
    };

    const result = await generatePlan(
      {
        scenario_text,
        target_duration_sec: target_duration_sec || 60,
        target_model_id,
        language,
        options: enhancedOptions,
      },
      openaiKey
    );
    
    // Enhance segments with tag metadata
    if (result.timeline?.segments && inline_tags?.length > 0) {
      result.timeline.segments = result.timeline.segments.map((segment: any, idx: number) => {
        // Find tags that apply to this segment based on text offset proximity
        const segmentTags = findTagsForSegment(inline_tags, scenario_text, idx, result.timeline.segments.length);
        return {
          ...segment,
          inline_tags: segmentTags,
          tag_metadata: extractTagMetadata(segmentTags),
        };
      });
    }

    return c.json({
      success: true,
      data: {
        ...result,
        inline_tags_used: inline_tags?.length > 0,
      },
    });
  } catch (error: any) {
    console.error('Generate plan error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to generate plan' },
    }, 500);
  }
});

// Helper function to build tag instructions for timeline generation
function buildTagInstructions(tags: { type: string; value: string; offset: number }[]): string {
  const tagsByType: Record<string, string[]> = {};
  tags.forEach(tag => {
    if (!tagsByType[tag.type]) tagsByType[tag.type] = [];
    if (!tagsByType[tag.type].includes(tag.value)) {
      tagsByType[tag.type].push(tag.value);
    }
  });
  
  const instructions: string[] = [];
  
  if (tagsByType.camera) {
    instructions.push(`Camera movements to use: ${tagsByType.camera.join(', ')}`);
  }
  if (tagsByType.lighting) {
    instructions.push(`Lighting styles specified: ${tagsByType.lighting.join(', ')}`);
  }
  if (tagsByType.mood) {
    instructions.push(`Mood/atmosphere: ${tagsByType.mood.join(', ')}`);
  }
  if (tagsByType.fx) {
    instructions.push(`Visual effects to apply: ${tagsByType.fx.join(', ')}`);
  }
  if (tagsByType.sfx) {
    instructions.push(`Audio/sound cues: ${tagsByType.sfx.join(', ')}`);
  }
  if (tagsByType.pace) {
    instructions.push(`Pacing guidance: ${tagsByType.pace.join(', ')}`);
  }
  if (tagsByType.style) {
    instructions.push(`Visual style: ${tagsByType.style.join(', ')}`);
  }
  if (tagsByType.transition) {
    instructions.push(`Transitions: ${tagsByType.transition.join(', ')}`);
  }
  
  return instructions.join('. ');
}

// Helper function to find tags that apply to a segment
function findTagsForSegment(
  tags: { type: string; value: string; offset: number }[],
  scenarioText: string,
  segmentIndex: number,
  totalSegments: number
): { type: string; value: string }[] {
  // Divide the scenario into segments and find which tags fall within each
  const segmentLength = Math.floor(scenarioText.length / totalSegments);
  const segmentStart = segmentIndex * segmentLength;
  const segmentEnd = segmentIndex === totalSegments - 1 ? scenarioText.length : (segmentIndex + 1) * segmentLength;
  
  return tags
    .filter(tag => tag.offset >= segmentStart && tag.offset < segmentEnd)
    .map(tag => ({ type: tag.type, value: tag.value }));
}

// Helper function to extract structured metadata from tags
function extractTagMetadata(tags: { type: string; value: string }[]): Record<string, string> {
  const metadata: Record<string, string> = {};
  tags.forEach(tag => {
    if (!metadata[tag.type]) {
      metadata[tag.type] = tag.value;
    }
  });
  return metadata;
}

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

// POST /scenario/save-to-db - Save scenario and generated plan to D1 database
scenarioRoutes.post('/scenario/save-to-db', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      scenario_text,
      improved_text,
      target_model_id,
      target_duration_sec,
      language,
      style_hints,
      tags,
      timeline,
      segments,
      generation_plan,
    } = body;

    if (!scenario_text || !target_model_id || !segments || segments.length === 0) {
      return c.json({
        success: false,
        error: { code: 'BAD_REQUEST', message: 'scenario_text, target_model_id, and segments are required' },
      }, 400);
    }

    // Save to D1 using the comprehensive save function
    const result = await saveGeneratedPlanToDb(
      c.env.DB,
      user.id,
      {
        originalText: scenario_text,
        improvedText: improved_text,
        targetModelId: target_model_id,
        targetDurationSec: target_duration_sec || 60,
        language,
        styleHints: style_hints,
        tagsJson: tags,
      },
      {
        totalDurationSec: timeline?.total_duration_sec || segments.reduce((sum: number, s: any) => sum + s.duration_sec, 0),
        targetResolution: timeline?.target_resolution || '1080p',
        aspectRatio: timeline?.aspect_ratio || '16:9',
        globalStyle: timeline?.global_style,
        continuitySettings: timeline?.continuity_settings,
      },
      segments.map((s: any, idx: number) => ({
        position: idx,
        durationSec: s.duration_sec || 5,
        modelId: s.model_id || target_model_id,
        promptText: s.prompt_text || s.prompt,
        finalPromptText: s.final_prompt_text,
        negativePrompt: s.negative_prompt,
        motionProfile: s.motion_profile || s.motion || 'smooth',
        cameraPath: s.camera_path || s.camera || 'static',
        transitionType: s.transition_type || s.transition || 'cut',
        stylePreset: s.style_preset || 'cinematic',
        inlineTags: s.inline_tags,
        tagMetadata: s.tag_metadata,
        lighting: s.lighting,
        emotion: s.emotion,
        enhanceEnabled: s.enhance_enabled,
      })),
      {
        planJson: generation_plan || { segments: segments.map((s: any) => s.prompt || s.prompt_text) },
        frameChaining: true,
        estimatedTimeSec: segments.length * 120, // Estimate 2 min per segment
      }
    );

    return c.json({
      success: true,
      data: {
        scenario_id: result.scenarioId,
        timeline_id: result.timelineId,
        segment_ids: result.segmentIds,
        plan_id: result.planId,
        message: 'Scenario and timeline saved to database',
      },
    });
  } catch (error: any) {
    console.error('Save to DB error:', error);
    return c.json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: error.message || 'Failed to save to database' },
    }, 500);
  }
});

// GET /scenario/:id - Get scenario by ID
scenarioRoutes.get('/scenario/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const scenarioId = c.req.param('id');
    
    const repo = new ScenarioRepository(c.env.DB);
    const scenario = await repo.getById(scenarioId);
    
    if (!scenario) {
      return c.json({ success: false, error: 'Scenario not found' }, 404);
    }
    
    // Verify ownership
    if (scenario.user_id !== user.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    return c.json({
      success: true,
      data: scenario,
    });
  } catch (error: any) {
    console.error('Get scenario error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /scenario/user/list - Get all scenarios for current user
scenarioRoutes.get('/scenario/user/list', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    
    const repo = new ScenarioRepository(c.env.DB);
    const scenarios = await repo.getByUserId(user.id);
    
    return c.json({
      success: true,
      data: scenarios,
    });
  } catch (error: any) {
    console.error('List scenarios error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /scenario/:id - Delete scenario
scenarioRoutes.delete('/scenario/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const scenarioId = c.req.param('id');
    
    const repo = new ScenarioRepository(c.env.DB);
    const scenario = await repo.getById(scenarioId);
    
    if (!scenario) {
      return c.json({ success: false, error: 'Scenario not found' }, 404);
    }
    
    if (scenario.user_id !== user.id) {
      return c.json({ success: false, error: 'Access denied' }, 403);
    }
    
    await repo.delete(scenarioId);
    
    return c.json({
      success: true,
      message: 'Scenario deleted',
    });
  } catch (error: any) {
    console.error('Delete scenario error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default scenarioRoutes;
