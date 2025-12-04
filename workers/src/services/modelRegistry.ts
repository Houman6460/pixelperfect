/**
 * Model Registry - Central source of model capabilities
 */

import { ModelCapabilities } from '../types/promptAssistant';

const registry: Record<string, ModelCapabilities> = {
  // Wan Models
  "wan-2.5-i2v": {
    modelId: "wan-2.5-i2v",
    displayName: "Wan 2.5 I2V",
    maxDurationSec: 5,
    maxPromptChars: 350,
    supportsDialogue: "limited",
    promptStyle: "plain",
    provider: "wan",
    styleTokens: ["realistic", "smooth motion", "natural"],
  },
  "wan-2.5-i2v-fast": {
    modelId: "wan-2.5-i2v-fast",
    displayName: "Wan 2.5 I2V Fast",
    maxDurationSec: 5,
    maxPromptChars: 250,
    supportsDialogue: "limited",
    promptStyle: "plain",
    provider: "wan",
    styleTokens: ["smooth", "natural"],
  },
  
  // Kling Models
  "kling-2.5-pro": {
    modelId: "kling-2.5-pro",
    displayName: "Kling 2.5 Pro",
    maxDurationSec: 10,
    maxPromptChars: 600,
    supportsDialogue: "full",
    promptStyle: "cinematic_blocks",
    provider: "kling",
    styleTokens: ["cinematic", "ultra-realistic", "high detail", "4K", "film grain"],
  },
  "kling-2.5-i2v-pro": {
    modelId: "kling-2.5-i2v-pro",
    displayName: "Kling 2.5 I2V Pro",
    maxDurationSec: 10,
    maxPromptChars: 600,
    supportsDialogue: "full",
    promptStyle: "cinematic_blocks",
    provider: "kling",
    styleTokens: ["cinematic", "ultra-realistic", "high detail", "4K"],
  },
  "kling-1.5-pro": {
    modelId: "kling-1.5-pro",
    displayName: "Kling 1.5 Pro",
    maxDurationSec: 10,
    maxPromptChars: 500,
    supportsDialogue: "full",
    promptStyle: "cinematic_blocks",
    provider: "kling",
    styleTokens: ["cinematic", "professional"],
  },
  
  // Runway Models
  "runway-gen3": {
    modelId: "runway-gen3",
    displayName: "Runway Gen-3 Alpha",
    maxDurationSec: 10,
    maxPromptChars: 500,
    supportsDialogue: "full",
    promptStyle: "runway_format",
    provider: "runway",
    styleTokens: ["cinematic", "photorealistic", "professional", "premium quality"],
    forbiddenWords: ["violent", "explicit", "gore"],
  },
  "runway-gen3-turbo": {
    modelId: "runway-gen3-turbo",
    displayName: "Runway Gen-3 Turbo",
    maxDurationSec: 10,
    maxPromptChars: 400,
    supportsDialogue: "full",
    promptStyle: "runway_format",
    provider: "runway",
    styleTokens: ["cinematic", "photorealistic"],
    forbiddenWords: ["violent", "explicit"],
  },
  
  // Luma Models
  "luma-dream-machine": {
    modelId: "luma-dream-machine",
    displayName: "Luma Dream Machine",
    maxDurationSec: 5,
    maxPromptChars: 400,
    supportsDialogue: "full",
    promptStyle: "plain",
    provider: "luma",
    styleTokens: ["cinematic", "dreamlike", "smooth", "high fidelity"],
  },
  "luma-ray-2": {
    modelId: "luma-ray-2",
    displayName: "Luma Ray 2",
    maxDurationSec: 9,
    maxPromptChars: 500,
    supportsDialogue: "full",
    promptStyle: "plain",
    provider: "luma",
    styleTokens: ["cinematic", "professional", "realistic"],
  },
  
  // MiniMax Models
  "minimax-video-01": {
    modelId: "minimax-video-01",
    displayName: "MiniMax Video-01",
    maxDurationSec: 6,
    maxPromptChars: 400,
    supportsDialogue: "limited",
    promptStyle: "plain",
    provider: "minimax",
    styleTokens: ["cinematic", "high quality"],
  },
  
  // PixVerse Models
  "pixverse-v2": {
    modelId: "pixverse-v2",
    displayName: "PixVerse V2",
    maxDurationSec: 4,
    maxPromptChars: 350,
    supportsDialogue: "limited",
    promptStyle: "plain",
    provider: "pixverse",
    styleTokens: ["creative", "vibrant"],
  },
  "pixverse-v3.5": {
    modelId: "pixverse-v3.5",
    displayName: "PixVerse V3.5",
    maxDurationSec: 8,
    maxPromptChars: 400,
    supportsDialogue: "limited",
    promptStyle: "plain",
    provider: "pixverse",
    styleTokens: ["creative", "dynamic", "vibrant"],
  },
  
  // Stability Models
  "stable-video-diffusion": {
    modelId: "stable-video-diffusion",
    displayName: "Stable Video Diffusion",
    maxDurationSec: 4,
    maxPromptChars: 200,
    supportsDialogue: "none",
    promptStyle: "plain",
    provider: "stability",
    styleTokens: ["smooth motion", "consistent"],
  },
  "animatediff-lightning": {
    modelId: "animatediff-lightning",
    displayName: "AnimateDiff Lightning",
    maxDurationSec: 2,
    maxPromptChars: 200,
    supportsDialogue: "none",
    promptStyle: "plain",
    provider: "stability",
    styleTokens: ["animated", "stylized"],
  },
};

// Default capabilities for unknown models
const DEFAULT_CAPABILITIES: ModelCapabilities = {
  modelId: "unknown",
  displayName: "Unknown Model",
  maxDurationSec: 5,
  maxPromptChars: 300,
  supportsDialogue: "limited",
  promptStyle: "plain",
  provider: "custom",
  styleTokens: ["high quality"],
};

/**
 * Get capabilities for a specific model
 */
export function getModelCapabilities(modelId: string): ModelCapabilities {
  // Normalize model ID (handle variations)
  const normalizedId = modelId.toLowerCase().replace(/_/g, '-');
  
  // Direct match
  if (registry[normalizedId]) {
    return registry[normalizedId];
  }
  
  // Try to find partial match
  for (const [key, caps] of Object.entries(registry)) {
    if (normalizedId.includes(key) || key.includes(normalizedId)) {
      return caps;
    }
  }
  
  // Return default with the given model ID
  console.warn(`Model not found in registry: ${modelId}, using defaults`);
  return { ...DEFAULT_CAPABILITIES, modelId, displayName: modelId };
}

/**
 * Get all registered models
 */
export function getAllModels(): ModelCapabilities[] {
  return Object.values(registry);
}

/**
 * Get models by provider
 */
export function getModelsByProvider(provider: string): ModelCapabilities[] {
  return Object.values(registry).filter(m => m.provider === provider);
}

/**
 * Check if a model exists in registry
 */
export function hasModel(modelId: string): boolean {
  const normalizedId = modelId.toLowerCase().replace(/_/g, '-');
  return normalizedId in registry;
}

export default registry;
