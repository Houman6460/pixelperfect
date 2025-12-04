/**
 * Scenario Assistant Service
 * Handles scenario improvement and timeline generation
 */

import {
  ImproveScenarioRequest,
  ImproveScenarioResponse,
  GeneratePlanRequest,
  GeneratePlanResponse,
  ScenarioBreakdown,
  GeneratedTimeline,
  TimelineSegment,
  VideoGenerationPlan,
  DialogueHandlingMode,
  MotionProfile,
  CameraPath,
  TransitionType,
} from '../types/scenario';
import { parseScenario } from './scenarioParser';
import { getModelCapabilities } from './modelRegistry';
import { compileFinalPrompt } from './promptAssistant';
import {
  InlineTag,
  SegmentSettings,
  getModelConstraints,
  mapTagsToSettings,
  createDefaultSegmentSettings,
  generateEnhancedNegativePrompt,
  applyModelConstraints,
  inferSettingsFromPrompt,
  calculateOptimalDuration,
  buildEnhancedPrompt,
} from './segmentAutoConfig';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract inline tags from scenario text
 */
function extractInlineTags(text: string): InlineTag[] {
  const tags: InlineTag[] = [];
  const regex = /\[(\w+):\s*([^\]]+)\]/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    tags.push({
      type: match[1].toLowerCase(),
      value: match[2].trim(),
      offset: match.index,
    });
  }
  
  return tags;
}

/**
 * Map motion setting to MotionProfile type
 */
function mapMotionToProfile(motion: string | undefined): MotionProfile | null {
  if (!motion) return null;
  
  const mapping: Record<string, MotionProfile> = {
    'smooth': 'smooth',
    'slow': 'smooth',
    'cinematic': 'dramatic',
    'dynamic': 'dynamic',
    'fast': 'dynamic',
    'jitter': 'subtle',
    'none': 'subtle',
  };
  
  return mapping[motion] || null;
}

/**
 * Improve scenario using AI
 */
export async function improveScenario(
  request: ImproveScenarioRequest,
  openaiKey?: string
): Promise<ImproveScenarioResponse> {
  const {
    scenario_text,
    target_duration_sec,
    target_model_id,
    language = 'en',
    style_hints,
  } = request;

  const originalLength = scenario_text.length;
  const changesMade: string[] = [];
  const warnings: string[] = [];

  // Get model capabilities if specified
  let modelCaps = null;
  if (target_model_id) {
    try {
      modelCaps = getModelCapabilities(target_model_id);
    } catch (e) {
      warnings.push(`Model ${target_model_id} not found, using defaults`);
    }
  }

  // Build improvement prompt
  const systemPrompt = `You are a professional screenplay and video scenario writer. Your task is to improve a video generation scenario.

RULES:
1. Enhance the scenario with cinematic details, better pacing, and clearer structure
2. Fix grammar, flow, and readability issues
3. Convert vague descriptions into specific, visual scene descriptions
4. Add sensory details: lighting, atmosphere, colors, textures
5. Clarify character actions and emotions
6. Structure into clear scenes with logical transitions
7. Keep dialogue natural and impactful
8. Add camera movement suggestions where appropriate
9. Maintain the original story intent and key plot points
10. Make it optimized for AI video generation

${modelCaps ? `
MODEL CONSTRAINTS:
- Maximum prompt length: ${modelCaps.maxPromptChars} characters per segment
- Dialogue support: ${modelCaps.supportsDialogue}
- Recommended style: ${modelCaps.promptStyle}
` : ''}

${target_duration_sec ? `TARGET DURATION: Approximately ${Math.round(target_duration_sec / 60)} minutes` : ''}

${style_hints ? `
STYLE HINTS:
- Genre: ${style_hints.genre || 'cinematic'}
- Mood: ${style_hints.mood || 'compelling'}
- Pacing: ${style_hints.pacing || 'medium'}
` : ''}

OUTPUT FORMAT:
- Use clear scene markers (SCENE 1:, SCENE 2:, etc.)
- Use Character: "Dialogue" format for dialogue
- Use (action descriptions) in parentheses
- Add [CAMERA: direction] notes where useful
- Add [TRANSITION: type] between scenes

Improve the following scenario:`;

  let improvedText = scenario_text;

  // Try LLM improvement if key available
  if (openaiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: scenario_text },
          ],
          max_tokens: 4000,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: { message: { content: string } }[] };
        improvedText = data.choices[0]?.message?.content?.trim() || scenario_text;
        changesMade.push('AI-enhanced scenario with cinematic details');
        changesMade.push('Structured into clear scenes');
        changesMade.push('Added visual and emotional descriptions');
      } else {
        warnings.push('AI enhancement failed, applying rule-based improvements');
      }
    } catch (error) {
      console.error('LLM improvement failed:', error);
      warnings.push('AI enhancement failed, applying rule-based improvements');
    }
  }

  // Apply rule-based improvements if LLM didn't work
  if (improvedText === scenario_text) {
    improvedText = applyRuleBasedImprovements(scenario_text);
    changesMade.push('Applied rule-based formatting');
    changesMade.push('Structured dialogue formatting');
  }

  // Parse to estimate scene count and duration
  const parsed = await parseScenario({ scenario_text: improvedText, language });

  return {
    improved_scenario: improvedText,
    original_length: originalLength,
    improved_length: improvedText.length,
    changes_made: changesMade,
    warnings: [...warnings, ...parsed.warnings],
    estimated_duration_sec: parsed.breakdown.total_duration_sec,
    scene_count_estimate: parsed.breakdown.scene_count,
  };
}

/**
 * Apply rule-based improvements when LLM is unavailable
 */
function applyRuleBasedImprovements(text: string): string {
  let improved = text;

  // Add scene markers if not present
  if (!improved.match(/^SCENE\s+\d+/m)) {
    const paragraphs = improved.split(/\n{2,}/);
    improved = paragraphs
      .map((p, i) => i === 0 ? `SCENE 1:\n${p}` : p)
      .join('\n\n');
  }

  // Format dialogue properly
  improved = improved.replace(
    /([A-Z][a-z]+)\s*:\s*[""]?([^""]+)[""]?/g,
    '$1: "$2"'
  );

  // Add cinematic opening if not present
  if (!improved.toLowerCase().includes('fade in') && !improved.toLowerCase().includes('scene')) {
    improved = 'FADE IN:\n\n' + improved;
  }

  // Ensure proper ending
  if (!improved.toLowerCase().includes('fade out') && !improved.toLowerCase().includes('the end')) {
    improved = improved + '\n\n[TRANSITION: FADE TO BLACK]\n\nTHE END';
  }

  return improved;
}

/**
 * Generate timeline plan from scenario
 */
export async function generatePlan(
  request: GeneratePlanRequest,
  openaiKey?: string
): Promise<GeneratePlanResponse> {
  const {
    scenario_text,
    target_duration_sec,
    target_model_id,
    language = 'en',
    options = {
      enable_frame_chaining: true,
      style_consistency: true,
      character_consistency: true,
      use_inline_tags: false,
    },
  } = request;

  const warnings: string[] = [];

  // Get model capabilities and constraints
  const modelCaps = getModelCapabilities(target_model_id);
  const modelConstraints = getModelConstraints(target_model_id);
  
  // Extract inline tags from scenario text
  const inlineTags: InlineTag[] = (request as any).inline_tags || extractInlineTags(scenario_text);

  // Parse scenario into breakdown
  const parsed = await parseScenario({ scenario_text, language });
  const breakdown = parsed.breakdown;
  warnings.push(...parsed.warnings);

  // Calculate segmentation
  const maxSegmentDuration = modelCaps.maxDurationSec;
  const segments: TimelineSegment[] = [];
  let segmentNumber = 0;
  
  // Track text offset for tag mapping
  let currentTextOffset = 0;

  for (const scene of breakdown.scenes) {
    // Calculate scene text boundaries for tag assignment
    const sceneText = scene.summary + ' ' + scene.visual_style;
    const sceneStartOffset = currentTextOffset;
    const sceneEndOffset = currentTextOffset + sceneText.length;
    currentTextOffset = sceneEndOffset + 1;
    
    // Get tags that apply to this scene
    const sceneTags = inlineTags.filter(tag => 
      tag.offset >= sceneStartOffset && tag.offset < sceneEndOffset
    );
    
    // Calculate how many segments this scene needs
    const sceneSegmentCount = Math.ceil(scene.estimated_duration_sec / maxSegmentDuration);
    const baseSegmentDuration = Math.min(maxSegmentDuration, scene.estimated_duration_sec / sceneSegmentCount);

    // Distribute dialogue across segments
    const dialoguePerSegment = Math.ceil(scene.dialogue_blocks.length / sceneSegmentCount);

    for (let i = 0; i < sceneSegmentCount; i++) {
      segmentNumber++;
      
      // Get tags for this specific segment (distribute scene tags across segments)
      const segmentTagCount = Math.ceil(sceneTags.length / sceneSegmentCount);
      const segmentTags = sceneTags.slice(i * segmentTagCount, (i + 1) * segmentTagCount);

      // Get dialogue for this segment
      const segmentDialogue = scene.dialogue_blocks
        .slice(i * dialoguePerSegment, (i + 1) * dialoguePerSegment)
        .map(d => `${d.character}: "${d.line}"`)
        .join('\n');

      // Determine dialogue handling mode
      let dialogueMode: DialogueHandlingMode = 'none';
      if (segmentDialogue) {
        dialogueMode = modelCaps.supportsDialogue === 'full' ? 'full'
          : modelCaps.supportsDialogue === 'limited' ? 'compressed'
          : 'visual_only';
      }

      // Build segment prompt
      const segmentPrompt = buildSegmentPrompt(scene, i, sceneSegmentCount, breakdown);
      
      // Map inline tags to segment settings
      const tagSettings = mapTagsToSettings(segmentTags);
      
      // Infer additional settings from prompt content
      const inferredSettings = inferSettingsFromPrompt(segmentPrompt);
      
      // Create default settings for this segment
      const defaultSettings = createDefaultSegmentSettings(target_model_id, segmentNumber - 1, breakdown.scenes.length * 2);
      
      // Merge all settings (priority: tags > inferred > defaults)
      const mergedSettings: Partial<SegmentSettings> = {
        ...defaultSettings,
        ...inferredSettings,
        ...tagSettings,
      };

      // Get camera and motion - prefer from tags, then scene, then defaults
      const cameraPath: CameraPath = (mergedSettings.camera as CameraPath) || 
        scene.camera_suggestions[0]?.type || 'static';
      const motionProfile: MotionProfile = mapMotionToProfile(mergedSettings.motion) || 
        determineMotionProfile(scene);

      // Determine transition - prefer from tags
      const isLastSegmentOfScene = i === sceneSegmentCount - 1;
      const transition: TransitionType = (mergedSettings.transition as TransitionType) ||
        (isLastSegmentOfScene ? (scene.transition_to_next as TransitionType || 'cut') : 'none');
      
      // Calculate optimal duration based on content and tags
      const segmentDuration = calculateOptimalDuration(
        segmentPrompt.length,
        !!segmentDialogue,
        segmentTags,
        modelConstraints
      );
      
      // Build enhanced prompt with tag-based instructions
      const enhancedPrompt = buildEnhancedPrompt(segmentPrompt, mergedSettings);

      // Compile final prompt
      let finalPrompt = enhancedPrompt;
      try {
        const compiled = await compileFinalPrompt({
          model_id: target_model_id,
          scene_prompt: enhancedPrompt,
          dialogue: segmentDialogue || undefined,
          language,
        }, openaiKey);
        finalPrompt = compiled.final_prompt;
      } catch (e) {
        console.warn('Prompt compilation failed, using enhanced prompt');
      }
      
      // Generate negative prompt based on content and tags
      const negativePrompt = generateEnhancedNegativePrompt(segmentPrompt, segmentTags);
      
      // Determine style preset from tags or inferred
      const stylePreset = mergedSettings.style_preset || 'cinematic';
      
      // Determine if enhancement should be enabled
      const enhanceEnabled = mergedSettings.enhance_enabled || 
        scene.emotions.some(e => ['dramatic', 'epic', 'intense'].includes(e.toLowerCase()));

      const segment: TimelineSegment = {
        segment_id: `seg-${generateId()}`,
        segment_number: segmentNumber,
        scene_id: scene.scene_id,
        duration_sec: Math.round(segmentDuration),
        model_id: target_model_id,
        prompt: segmentPrompt,
        final_prompt: finalPrompt,
        dialogue: segmentDialogue || undefined,
        dialogue_handling_mode: dialogueMode,
        motion_profile: motionProfile,
        camera_path: cameraPath,
        transition,
        style_lock: {
          character_consistency: options.character_consistency,
          lighting_consistency: options.style_consistency,
          color_consistency: options.style_consistency,
        },
        continuity_notes: scene.continuity_notes,
        status: 'pending',
        // NEW: Extended segment settings
        negative_prompt: negativePrompt,
        style_preset: stylePreset,
        enhance_enabled: enhanceEnabled,
        enhance_model: enhanceEnabled ? 'auto' : undefined,
        seed: mergedSettings.seed || Math.floor(Math.random() * 2147483647),
        first_frame_mode: segmentNumber === 1 ? 'none' : 'auto',
        inline_tags: segmentTags.map(t => ({ type: t.type, value: t.value })),
        tag_metadata: mergedSettings.tag_metadata || {},
        lighting: mergedSettings.lighting,
        emotion: mergedSettings.emotion,
        sfx_cue: mergedSettings.sfx_cue,
      };

      segments.push(segment);
    }
  }

  // Build timeline
  const timeline: GeneratedTimeline = {
    timeline_id: `timeline-${generateId()}`,
    scenario_id: breakdown.scenario_id,
    total_duration_sec: segments.reduce((sum, s) => sum + s.duration_sec, 0),
    segment_count: segments.length,
    segments,
    models_used: [target_model_id],
    global_style_lock: {
      genre: breakdown.global_style.genre,
      mood: breakdown.global_style.mood,
      color_palette: breakdown.global_style.color_palette,
    },
    continuity_settings: {
      character_consistency: options.character_consistency,
      lighting_consistency: options.style_consistency,
      style_consistency: options.style_consistency,
    },
    warnings,
    created_at: new Date().toISOString(),
  };

  // Build generation plan
  const plan: VideoGenerationPlan = {
    plan_id: `plan-${generateId()}`,
    timeline_id: timeline.timeline_id,
    execution_order: segments.map(s => s.segment_id),
    models_used: [target_model_id],
    estimated_generation_time_sec: segments.length * 60, // Rough estimate: 1 min per segment
    frame_chaining_enabled: options.enable_frame_chaining,
    global_style_lock: timeline.global_style_lock,
    continuity_settings: timeline.continuity_settings,
    status: 'pending',
    progress: {
      completed_segments: 0,
      total_segments: segments.length,
    },
  };

  // Add warnings
  if (segments.length > 100) {
    warnings.push(`Large plan with ${segments.length} segments. Generation may take a long time.`);
  }
  if (timeline.total_duration_sec !== target_duration_sec) {
    warnings.push(`Actual duration (${timeline.total_duration_sec}s) differs from target (${target_duration_sec}s)`);
  }

  return {
    timeline,
    generation_plan: plan,
    breakdown,
    warnings,
  };
}

/**
 * Build prompt for a specific segment
 */
function buildSegmentPrompt(
  scene: ScenarioBreakdown['scenes'][0],
  segmentIndex: number,
  totalSegments: number,
  breakdown: ScenarioBreakdown
): string {
  const parts: string[] = [];

  // Scene context
  if (segmentIndex === 0) {
    parts.push(`Scene ${scene.scene_number}.`);
  } else {
    parts.push(`Scene ${scene.scene_number}, part ${segmentIndex + 1}.`);
  }

  // Environment
  if (scene.environment_description) {
    parts.push(scene.environment_description);
  }

  // Visual style
  parts.push(scene.visual_style);

  // Characters present
  if (scene.characters.length > 0) {
    if (scene.characters.length === 1) {
      parts.push(`${scene.characters[0]} is present.`);
    } else {
      parts.push(`Characters: ${scene.characters.join(', ')}.`);
    }
  }

  // Actions for this segment
  if (scene.actions.length > 0) {
    const actionsPerSegment = Math.ceil(scene.actions.length / totalSegments);
    const segmentActions = scene.actions.slice(
      segmentIndex * actionsPerSegment,
      (segmentIndex + 1) * actionsPerSegment
    );
    if (segmentActions.length > 0) {
      parts.push(segmentActions.join('. ') + '.');
    }
  }

  // Emotions
  if (scene.emotions.length > 0) {
    parts.push(`Mood: ${scene.emotions.join(', ')}.`);
  }

  // Camera
  if (scene.camera_suggestions.length > 0) {
    const cam = scene.camera_suggestions[0];
    parts.push(`Camera: ${cam.type}${cam.speed ? `, ${cam.speed}` : ''}.`);
  }

  // Lighting
  if (scene.lighting) {
    parts.push(`Lighting: ${scene.lighting}.`);
  }

  // Time of day
  if (scene.time_of_day) {
    parts.push(scene.time_of_day + '.');
  }

  return parts.join(' ');
}

/**
 * Determine motion profile from scene
 */
function determineMotionProfile(scene: ScenarioBreakdown['scenes'][0]): MotionProfile {
  const emotions = scene.emotions.map(e => e.toLowerCase());
  const actions = scene.actions.join(' ').toLowerCase();

  if (emotions.includes('dramatic') || emotions.includes('intense') || actions.includes('run') || actions.includes('fight')) {
    return 'dramatic';
  }
  if (emotions.includes('calm') || emotions.includes('peaceful') || emotions.includes('romantic')) {
    return 'smooth';
  }
  if (emotions.includes('tense') || emotions.includes('mysterious')) {
    return 'subtle';
  }
  if (actions.includes('fast') || actions.includes('quick') || actions.includes('rush')) {
    return 'dynamic';
  }

  return 'smooth';
}

export default {
  improveScenario,
  generatePlan,
};
