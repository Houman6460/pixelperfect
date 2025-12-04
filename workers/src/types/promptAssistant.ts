/**
 * Prompt Assistant Types
 */

export type DialogueSupport = "full" | "limited" | "none";
export type PromptStyle = "plain" | "cinematic_blocks" | "runway_format";
export type Provider = "wan" | "kling" | "runway" | "luma" | "minimax" | "pixverse" | "stability" | "custom";

export interface ModelCapabilities {
  modelId: string;
  displayName: string;
  maxDurationSec: number;
  maxPromptChars: number;
  supportsDialogue: DialogueSupport;
  promptStyle: PromptStyle;
  provider: Provider;
  styleTokens?: string[];
  forbiddenWords?: string[];
}

export interface ImproveRequest {
  model_id: string;
  scene_prompt: string;
  tone?: string;
  language?: string;
}

export interface ImproveResponse {
  improved_scene_prompt: string;
  model_id: string;
  was_truncated: boolean;
  length_chars: number;
  warnings: string[];
}

export interface CompileRequest {
  model_id: string;
  scene_prompt: string;
  dialogue?: string;
  language?: string;
}

export interface CompileResponse {
  final_prompt: string;
  model_id: string;
  length_chars: number;
  was_truncated: boolean;
  dialogue_mode: "full" | "compressed" | "visual_only" | "none";
  warnings: string[];
}

export interface DialogueFormatResult {
  text: string;
  mode: "full" | "compressed" | "visual_only" | "none";
  warning?: string;
}
