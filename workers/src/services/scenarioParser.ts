/**
 * Scenario Parser Service
 * Parses raw scenario text into structured scene breakdowns
 */

import {
  ScenarioBreakdown,
  SceneBreakdown,
  DialogueBlock,
  CameraSuggestion,
  ParseScenarioRequest,
  ParseScenarioResponse,
} from '../types/scenario';

// Scene detection patterns
const SCENE_PATTERNS = {
  // Explicit scene markers
  sceneHeader: /^(?:SCENE|Scene|scene|INT\.|EXT\.|INT\/EXT\.)\s*[:\-]?\s*(.+)$/gm,
  // Time-based markers
  timeMarker: /\b(morning|afternoon|evening|night|dawn|dusk|noon|midnight)\b/gi,
  // Location markers
  locationMarker: /\b(inside|outside|interior|exterior|at the|in the|on the)\s+([^.,]+)/gi,
  // Dialogue pattern: Character: "Line" or CHARACTER: Line
  dialogue: /^([A-Z][A-Za-z\s]+):\s*[""]?(.+?)[""]?\s*$/gm,
  // Action descriptions in parentheses
  action: /\(([^)]+)\)/g,
  // Transition markers
  transition: /\b(fade to|cut to|dissolve to|wipe to|match cut|smash cut)\b/gi,
  // Camera directions
  camera: /\b(close[- ]?up|wide shot|medium shot|tracking shot|pan|dolly|crane|zoom|establishing shot|POV)\b/gi,
  // Emotion indicators
  emotion: /\b(happy|sad|angry|fearful|surprised|disgusted|excited|calm|tense|romantic|dramatic|mysterious)\b/gi,
};

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract dialogue blocks from text
 */
function extractDialogue(text: string): DialogueBlock[] {
  const dialogueBlocks: DialogueBlock[] = [];
  const lines = text.split('\n');
  
  for (const line of lines) {
    // Match "Character: dialogue" or "CHARACTER: dialogue"
    const match = line.match(/^([A-Z][A-Za-z\s]+):\s*[""]?(.+?)[""]?\s*$/);
    if (match) {
      const character = match[1].trim();
      const dialogueLine = match[2].trim();
      
      // Check for emotion/action in parentheses
      const emotionMatch = dialogueLine.match(/\(([^)]+)\)/);
      
      dialogueBlocks.push({
        character,
        line: dialogueLine.replace(/\([^)]+\)/g, '').trim(),
        emotion: emotionMatch ? emotionMatch[1] : undefined,
      });
    }
  }
  
  return dialogueBlocks;
}

/**
 * Extract camera suggestions from text
 */
function extractCameraSuggestions(text: string): CameraSuggestion[] {
  const suggestions: CameraSuggestion[] = [];
  const lowerText = text.toLowerCase();
  
  const cameraTypes: { pattern: RegExp; type: CameraSuggestion['type'] }[] = [
    { pattern: /\b(pan|panning)\b/, type: 'pan' },
    { pattern: /\b(dolly|tracking)\b/, type: 'dolly' },
    { pattern: /\b(crane|aerial)\b/, type: 'crane' },
    { pattern: /\b(zoom)\b/, type: 'zoom' },
    { pattern: /\b(orbit|360|revolve)\b/, type: 'orbit' },
    { pattern: /\b(handheld|shaky)\b/, type: 'handheld' },
    { pattern: /\b(static|still|locked)\b/, type: 'static' },
  ];
  
  for (const { pattern, type } of cameraTypes) {
    if (pattern.test(lowerText)) {
      suggestions.push({ type });
    }
  }
  
  // Default to static if no camera found
  if (suggestions.length === 0) {
    suggestions.push({ type: 'static' });
  }
  
  return suggestions;
}

/**
 * Extract emotions from text
 */
function extractEmotions(text: string): string[] {
  const emotions: string[] = [];
  const lowerText = text.toLowerCase();
  
  const emotionWords = [
    'happy', 'sad', 'angry', 'fearful', 'surprised', 'excited',
    'calm', 'tense', 'romantic', 'dramatic', 'mysterious', 'peaceful',
    'anxious', 'joyful', 'melancholic', 'nostalgic', 'hopeful', 'desperate'
  ];
  
  for (const emotion of emotionWords) {
    if (lowerText.includes(emotion)) {
      emotions.push(emotion);
    }
  }
  
  return emotions;
}

/**
 * Extract characters from text
 */
function extractCharacters(text: string): string[] {
  const characters = new Set<string>();
  
  // From dialogue
  const dialogueMatches = text.matchAll(/^([A-Z][A-Za-z\s]+):\s*[""]?.+[""]?\s*$/gm);
  for (const match of dialogueMatches) {
    characters.add(match[1].trim());
  }
  
  // From explicit character mentions
  const characterMentions = text.matchAll(/\b([A-Z][a-z]+)\s+(walks|runs|stands|sits|looks|says|speaks|enters|exits|moves)/g);
  for (const match of characterMentions) {
    characters.add(match[1]);
  }
  
  return Array.from(characters);
}

/**
 * Estimate duration based on content
 */
function estimateDuration(scene: { dialogue: DialogueBlock[]; actions: string[]; summary: string }): number {
  let duration = 5; // Base duration
  
  // Add time for dialogue (roughly 3 seconds per line)
  duration += scene.dialogue.length * 3;
  
  // Add time for actions (roughly 2 seconds per action)
  duration += scene.actions.length * 2;
  
  // Add time based on summary length
  duration += Math.floor(scene.summary.length / 100) * 2;
  
  // Clamp between 5 and 60 seconds
  return Math.min(60, Math.max(5, duration));
}

/**
 * Split text into scenes
 */
function splitIntoScenes(text: string): string[] {
  // Try to split by explicit scene markers first
  const sceneMarkers = [
    /\n(?=(?:SCENE|Scene|INT\.|EXT\.)\s*[:\-]?\s*)/g,
    /\n{2,}(?=[A-Z])/g, // Double newline followed by capital letter
    /\n(?=---+\n)/g, // Horizontal rules
  ];
  
  for (const marker of sceneMarkers) {
    const parts = text.split(marker).filter(p => p.trim());
    if (parts.length > 1) {
      return parts;
    }
  }
  
  // If no clear markers, split by paragraph groups
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim());
  
  // Group paragraphs into scenes (roughly 3-5 paragraphs per scene)
  const scenes: string[] = [];
  let currentScene = '';
  let paragraphCount = 0;
  
  for (const para of paragraphs) {
    currentScene += para + '\n\n';
    paragraphCount++;
    
    if (paragraphCount >= 3) {
      scenes.push(currentScene.trim());
      currentScene = '';
      paragraphCount = 0;
    }
  }
  
  if (currentScene.trim()) {
    scenes.push(currentScene.trim());
  }
  
  return scenes.length > 0 ? scenes : [text];
}

/**
 * Detect visual style from text
 */
function detectVisualStyle(text: string): string {
  const lowerText = text.toLowerCase();
  
  const styles = [
    { keywords: ['dark', 'shadow', 'noir', 'moody'], style: 'Dark and moody, high contrast' },
    { keywords: ['bright', 'sunny', 'cheerful', 'vibrant'], style: 'Bright and vibrant, warm colors' },
    { keywords: ['dream', 'surreal', 'ethereal', 'fantasy'], style: 'Dreamlike and ethereal, soft focus' },
    { keywords: ['gritty', 'raw', 'documentary', 'realistic'], style: 'Gritty and realistic, natural lighting' },
    { keywords: ['romantic', 'soft', 'warm', 'intimate'], style: 'Soft and romantic, warm tones' },
    { keywords: ['action', 'dynamic', 'intense', 'fast'], style: 'Dynamic and intense, sharp imagery' },
    { keywords: ['horror', 'creepy', 'scary', 'tense'], style: 'Dark and unsettling, high tension' },
    { keywords: ['sci-fi', 'futuristic', 'tech', 'cyber'], style: 'Futuristic and sleek, cool tones' },
  ];
  
  for (const { keywords, style } of styles) {
    if (keywords.some(k => lowerText.includes(k))) {
      return style;
    }
  }
  
  return 'Cinematic, professional quality';
}

/**
 * Parse scenario text into structured breakdown
 */
export async function parseScenario(
  request: ParseScenarioRequest
): Promise<ParseScenarioResponse> {
  const { scenario_text, language = 'en' } = request;
  
  const warnings: string[] = [];
  const parsingNotes: string[] = [];
  
  // Split into scenes
  const sceneTexts = splitIntoScenes(scenario_text);
  parsingNotes.push(`Detected ${sceneTexts.length} scene(s)`);
  
  // Extract global characters
  const allCharacters = extractCharacters(scenario_text);
  parsingNotes.push(`Found ${allCharacters.length} character(s): ${allCharacters.join(', ')}`);
  
  // Parse each scene
  const scenes: SceneBreakdown[] = sceneTexts.map((sceneText, index) => {
    const dialogueBlocks = extractDialogue(sceneText);
    const cameraSuggestions = extractCameraSuggestions(sceneText);
    const emotions = extractEmotions(sceneText);
    const characters = extractCharacters(sceneText);
    const visualStyle = detectVisualStyle(sceneText);
    
    // Extract actions from parenthetical notes
    const actions: string[] = [];
    const actionMatches = sceneText.matchAll(/\(([^)]+)\)/g);
    for (const match of actionMatches) {
      if (!match[1].toLowerCase().includes('emotion')) {
        actions.push(match[1]);
      }
    }
    
    // Create summary (first 200 chars of scene, cleaned)
    const summary = sceneText
      .replace(/^([A-Z][A-Za-z\s]+):\s*.+$/gm, '') // Remove dialogue
      .replace(/\([^)]+\)/g, '') // Remove parentheticals
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 200);
    
    const scene: SceneBreakdown = {
      scene_id: `scene-${generateId()}`,
      scene_number: index + 1,
      estimated_duration_sec: estimateDuration({ dialogue: dialogueBlocks, actions, summary }),
      summary: summary || `Scene ${index + 1}`,
      environment_description: summary.substring(0, 100),
      characters,
      dialogue_blocks: dialogueBlocks,
      actions,
      emotions,
      visual_style: visualStyle,
      camera_suggestions: cameraSuggestions,
      transition_to_next: index < sceneTexts.length - 1 ? 'cut' : undefined,
    };
    
    return scene;
  });
  
  // Calculate total duration
  const totalDuration = scenes.reduce((sum, s) => sum + s.estimated_duration_sec, 0);
  
  // Build character list with descriptions
  const characterList = allCharacters.map(name => ({
    name,
    description: `Character appearing in the scenario`,
    visual_notes: undefined,
  }));
  
  // Build breakdown
  const breakdown: ScenarioBreakdown = {
    scenario_id: `scenario-${generateId()}`,
    title: 'Untitled Scenario',
    total_duration_sec: totalDuration,
    scene_count: scenes.length,
    scenes,
    global_style: {
      genre: detectVisualStyle(scenario_text).split(',')[0],
      mood: scenes[0]?.emotions[0] || 'cinematic',
    },
    characters: characterList,
    warnings,
  };
  
  // Add warnings
  if (scenes.length > 50) {
    warnings.push('Very long scenario detected. Consider breaking into multiple videos.');
  }
  if (totalDuration > 600) {
    warnings.push(`Estimated duration (${Math.round(totalDuration / 60)} min) exceeds typical limits.`);
  }
  
  return {
    breakdown,
    parsing_notes: parsingNotes,
    warnings,
  };
}

export default { parseScenario };
