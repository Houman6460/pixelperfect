/**
 * Prompt Assistant Service
 * Handles prompt improvement and compilation for video generation
 */

import {
  ImproveRequest,
  ImproveResponse,
  CompileRequest,
  CompileResponse,
  ModelCapabilities,
  DialogueFormatResult,
} from '../types/promptAssistant';
import { getModelCapabilities } from './modelRegistry';

// Tone presets for different styles
const TONE_PRESETS: Record<string, { keywords: string[]; mood: string }> = {
  cinematic: {
    keywords: ['cinematic', 'film-like', 'dramatic lighting', 'shallow depth of field'],
    mood: 'dramatic and visually compelling',
  },
  documentary: {
    keywords: ['documentary style', 'natural lighting', 'authentic', 'realistic'],
    mood: 'honest and grounded',
  },
  dreamlike: {
    keywords: ['dreamlike', 'soft focus', 'ethereal glow', 'flowing'],
    mood: 'gentle and contemplative',
  },
  action: {
    keywords: ['dynamic', 'fast-paced', 'intense', 'high energy'],
    mood: 'thrilling and energetic',
  },
  romantic: {
    keywords: ['soft lighting', 'warm tones', 'intimate', 'gentle'],
    mood: 'tender and heartfelt',
  },
};

/**
 * Enhance scene description based on prompt style
 */
function enhanceByStyle(
  text: string,
  caps: ModelCapabilities,
  tone: string
): string {
  let enhanced = text.trim();
  const toneConfig = TONE_PRESETS[tone] || TONE_PRESETS.cinematic;

  switch (caps.promptStyle) {
    case 'cinematic_blocks':
      // Kling-style: structured with clear visual blocks
      if (!enhanced.toLowerCase().includes('shot') && !enhanced.toLowerCase().includes('scene')) {
        enhanced = `Cinematic scene. ${enhanced}`;
      }
      // Add camera/motion hints if not present
      if (!enhanced.toLowerCase().includes('camera') && !enhanced.toLowerCase().includes('movement')) {
        enhanced += `. Smooth camera movement.`;
      }
      // Add style tokens
      if (caps.styleTokens && caps.styleTokens.length > 0) {
        const missingTokens = caps.styleTokens.filter(
          t => !enhanced.toLowerCase().includes(t.toLowerCase())
        );
        if (missingTokens.length > 0) {
          enhanced += `\n\nStyle: ${missingTokens.slice(0, 3).join(', ')}.`;
        }
      }
      break;

    case 'runway_format':
      // Runway-style: concise, action-focused
      if (!enhanced.toLowerCase().includes('shot')) {
        enhanced = `Wide shot. ${enhanced}`;
      }
      // Add motion emphasis
      if (!enhanced.toLowerCase().includes('motion') && !enhanced.toLowerCase().includes('move')) {
        enhanced += `. Subtle natural motion.`;
      }
      break;

    case 'plain':
    default:
      // Simple enhancement - add opening if needed
      if (!enhanced.match(/^(a|the|an)\s/i) && !enhanced.match(/^[A-Z][a-z]+\s/)) {
        enhanced = `A ${enhanced.charAt(0).toLowerCase()}${enhanced.slice(1)}`;
      }
      // Add mood/atmosphere if not present
      if (!enhanced.toLowerCase().includes('atmosphere') && !enhanced.toLowerCase().includes('mood')) {
        const moodKeyword = toneConfig.keywords[Math.floor(Math.random() * 2)];
        enhanced += `. ${moodKeyword} atmosphere.`;
      }
      break;
  }

  // Clean up
  enhanced = enhanced
    .replace(/\.+/g, '.')
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();

  return enhanced;
}

/**
 * Format dialogue based on model capabilities
 */
function formatDialogue(
  dialogue: string,
  caps: ModelCapabilities,
  language: string
): DialogueFormatResult {
  if (!dialogue || dialogue.trim().length === 0) {
    return { text: '', mode: 'none' };
  }

  const lines = dialogue.trim().split('\n').filter(line => line.trim());

  switch (caps.supportsDialogue) {
    case 'full':
      // Full support - format as labeled dialogue
      let fullText = '\n\nDialogue:\n';
      lines.forEach(line => {
        if (line.includes(':')) {
          fullText += `${line}\n`;
        } else {
          fullText += `Character: "${line}"\n`;
        }
      });
      return { text: fullText.trim(), mode: 'full' };

    case 'limited':
      // Limited support - compress to narrative
      const dialogueContent = lines.map(line => {
        const match = line.match(/^([^:]+):\s*["']?(.+?)["']?$/);
        return match ? match[2] : line.replace(/["']/g, '');
      }).join(', ');
      
      const compressed = `. Characters speak: "${dialogueContent.substring(0, 100)}${dialogueContent.length > 100 ? '...' : ''}"`;
      return {
        text: compressed,
        mode: 'compressed',
        warning: 'dialogue_compressed_for_model',
      };

    case 'none':
    default:
      // No support - convert to visual cues
      const characterCount = new Set(lines.map(line => {
        const match = line.match(/^([^:]+):/);
        return match ? match[1].trim() : 'Character';
      })).size;
      
      const visual = `. ${characterCount > 1 ? 'Characters converse' : 'Character speaks'}, expressions animated.`;
      return {
        text: visual,
        mode: 'visual_only',
        warning: 'dialogue_not_supported_converted_to_visual',
      };
  }
}

/**
 * Build final prompt based on style
 */
function buildPromptByStyle(params: {
  scene: string;
  dialogue: string;
  dialogueMode: string;
  caps: ModelCapabilities;
}): string {
  const { scene, dialogue, caps } = params;

  let merged = scene;

  // Add dialogue based on style
  if (dialogue) {
    switch (caps.promptStyle) {
      case 'cinematic_blocks':
        // Kling: dialogue in separate block
        merged = `${scene}\n${dialogue}`;
        break;
      case 'runway_format':
        // Runway: inline at end
        merged = `${scene}${dialogue}`;
        break;
      case 'plain':
      default:
        // Plain: append
        merged = `${scene}${dialogue}`;
        break;
    }
  }

  // Remove forbidden words if any
  if (caps.forbiddenWords) {
    for (const word of caps.forbiddenWords) {
      const regex = new RegExp(word, 'gi');
      merged = merged.replace(regex, '');
    }
  }

  // Final cleanup
  merged = merged
    .replace(/\s+/g, ' ')
    .replace(/\.\s*\./g, '.')
    .trim();

  return merged;
}

/**
 * Call LLM for enhanced prompt (placeholder - integrate with actual LLM)
 */
async function callLLMEnhancer(params: {
  text: string;
  style: string;
  tone: string;
  language: string;
  openaiKey?: string;
}): Promise<string> {
  const { text, style, tone, language, openaiKey } = params;

  // If we have an OpenAI key, use it for real enhancement
  if (openaiKey) {
    try {
      const systemPrompt = `You are a professional video prompt engineer. Transform the user's prompt into an enhanced, ${tone} scene description.

Rules:
- Keep it concise but vivid
- Add visual details: lighting, camera angles, atmosphere
- Maintain the original intent
- Add sensory details and motion descriptions
- Style: ${style}
- Language: ${language}
- Output ONLY the enhanced prompt, no explanations`;

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
            { role: 'user', content: text },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: { message: { content: string } }[] };
        return data.choices[0]?.message?.content?.trim() || text;
      }
    } catch (error) {
      console.error('LLM enhancement failed:', error);
    }
  }

  // Fallback: return original text (will be enhanced by rule-based logic)
  return text;
}

/**
 * Improve scene prompt
 */
export async function improveScenePrompt(
  req: ImproveRequest,
  openaiKey?: string
): Promise<ImproveResponse> {
  const caps = getModelCapabilities(req.model_id);
  const language = req.language ?? 'en';
  const tone = req.tone ?? 'cinematic';

  // Get LLM-enhanced text or fallback to original
  const llmEnhanced = await callLLMEnhancer({
    text: req.scene_prompt,
    style: caps.promptStyle,
    tone,
    language,
    openaiKey,
  });

  // Apply style-specific enhancements
  let enhanced = enhanceByStyle(llmEnhanced, caps, tone);

  let wasTruncated = false;
  if (enhanced.length > caps.maxPromptChars) {
    enhanced = enhanced.slice(0, caps.maxPromptChars - 3) + '...';
    wasTruncated = true;
  }

  return {
    improved_scene_prompt: enhanced,
    model_id: req.model_id,
    was_truncated: wasTruncated,
    length_chars: enhanced.length,
    warnings: wasTruncated ? ['prompt_truncated_to_fit_model_limit'] : [],
  };
}

/**
 * Compile final prompt (scene + dialogue)
 */
export async function compileFinalPrompt(
  req: CompileRequest,
  openaiKey?: string
): Promise<CompileResponse> {
  const caps = getModelCapabilities(req.model_id);
  const language = req.language ?? 'en';

  // First, improve the scene prompt
  const improved = await improveScenePrompt(
    {
      model_id: req.model_id,
      scene_prompt: req.scene_prompt,
      tone: 'cinematic',
      language,
    },
    openaiKey
  );

  // Format dialogue
  const dialogueInfo = formatDialogue(req.dialogue ?? '', caps, language);

  // Build merged prompt
  const merged = buildPromptByStyle({
    scene: improved.improved_scene_prompt,
    dialogue: dialogueInfo.text,
    dialogueMode: dialogueInfo.mode,
    caps,
  });

  // Final truncation check
  let finalText = merged;
  let wasTruncated = false;
  if (finalText.length > caps.maxPromptChars) {
    finalText = finalText.slice(0, caps.maxPromptChars - 3) + '...';
    wasTruncated = true;
  }

  // Collect all warnings
  const warnings: string[] = [
    ...(improved.was_truncated ? ['scene_prompt_truncated'] : []),
    ...(dialogueInfo.warning ? [dialogueInfo.warning] : []),
    ...(wasTruncated ? ['final_prompt_truncated'] : []),
  ];

  return {
    final_prompt: finalText,
    model_id: req.model_id,
    length_chars: finalText.length,
    was_truncated: wasTruncated,
    dialogue_mode: dialogueInfo.mode,
    warnings,
  };
}
