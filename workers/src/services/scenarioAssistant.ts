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

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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
    },
  } = request;

  const warnings: string[] = [];

  // Get model capabilities
  const modelCaps = getModelCapabilities(target_model_id);

  // Parse scenario into breakdown
  const parsed = await parseScenario({ scenario_text, language });
  const breakdown = parsed.breakdown;
  warnings.push(...parsed.warnings);

  // Calculate segmentation
  const maxSegmentDuration = modelCaps.maxDurationSec;
  const segments: TimelineSegment[] = [];
  let segmentNumber = 0;

  for (const scene of breakdown.scenes) {
    // Calculate how many segments this scene needs
    const sceneSegmentCount = Math.ceil(scene.estimated_duration_sec / maxSegmentDuration);
    const segmentDuration = Math.min(maxSegmentDuration, scene.estimated_duration_sec / sceneSegmentCount);

    // Distribute dialogue across segments
    const dialoguePerSegment = Math.ceil(scene.dialogue_blocks.length / sceneSegmentCount);

    for (let i = 0; i < sceneSegmentCount; i++) {
      segmentNumber++;

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

      // Get camera and motion from scene suggestions
      const cameraPath: CameraPath = scene.camera_suggestions[0]?.type || 'static';
      const motionProfile: MotionProfile = determineMotionProfile(scene);

      // Determine transition
      const isLastSegmentOfScene = i === sceneSegmentCount - 1;
      const transition: TransitionType = isLastSegmentOfScene
        ? (scene.transition_to_next as TransitionType || 'cut')
        : 'none';

      // Compile final prompt
      let finalPrompt = segmentPrompt;
      try {
        const compiled = await compileFinalPrompt({
          model_id: target_model_id,
          scene_prompt: segmentPrompt,
          dialogue: segmentDialogue || undefined,
          language,
        }, openaiKey);
        finalPrompt = compiled.final_prompt;
      } catch (e) {
        console.warn('Prompt compilation failed, using raw prompt');
      }

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
