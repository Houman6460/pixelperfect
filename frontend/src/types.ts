export type ProgressStatus = "pending" | "active" | "done";

export interface ProgressStep {
  key: string;
  label: string;
  status: ProgressStatus;
}

export type EnhancementMode = 
  | "upscale"
  | "portrait"
  | "texture"
  | "anime"
  | "painting"
  | "graphic"
  | "artwork"
  | "denoise"
  | "custom";

export interface EnhancementPreset {
  label: string;
  prompt: string;
  description: string;
  // Auto-adjust settings for this mode
  settings: {
    sharpness: number;
    denoise: number;
    contrast: number;
    enhancementPasses: number;
  };
}

export interface Settings {
  tileSize: number;
  overlap: number;
  upscaleFactor: number;
  prompt: string;
  finalPass: boolean;
  enhancementMode: EnhancementMode;
  // Quality controls
  sharpness: number;      // 0-100, default 50
  denoise: number;        // 0-100, default 0
  contrast: number;       // 0-100, default 50
  enhancementPasses: number; // 1-3, default 1
}

export const ENHANCEMENT_PRESETS: Record<EnhancementMode, EnhancementPreset> = {
  upscale: {
    label: "Photorealistic (Best)",
    prompt: "REGENERATE as high-quality photograph. Add realistic skin pores, hair strands, fabric textures, and fine details. Make photorealistic.",
    description: "Best for faces, portraits, photos - adds realistic details",
    settings: { sharpness: 50, denoise: 15, contrast: 55, enhancementPasses: 2 },
  },
  portrait: {
    label: "Portrait & Face",
    prompt: "REGENERATE portrait with realistic skin texture, pores, individual hair strands, detailed eyes with catchlights, and natural depth. Professional headshot quality.",
    description: "Specialized for faces - adds skin texture, eye detail, hair strands",
    settings: { sharpness: 40, denoise: 20, contrast: 50, enhancementPasses: 2 },
  },
  texture: {
    label: "Texture Regeneration",
    prompt: "REGENERATE all textures with fine detail. Add fabric weave, wood grain, metal scratches, stone texture, and material-appropriate micro-details.",
    description: "For objects, products, and textured surfaces",
    settings: { sharpness: 65, denoise: 10, contrast: 60, enhancementPasses: 2 },
  },
  anime: {
    label: "Anime/Cartoon HD",
    prompt: "REGENERATE as high-definition anime. Clean sharp lines, vibrant colors, smooth gradients, detailed eyes and hair. Studio quality.",
    description: "For anime, manga, and cartoon - clean HD look",
    settings: { sharpness: 80, denoise: 5, contrast: 65, enhancementPasses: 1 },
  },
  painting: {
    label: "Digital Painting",
    prompt: "ENHANCE as professional digital painting. Preserve brushstrokes, enhance color depth and vibrancy, add subtle texture details while maintaining artistic style. Museum quality fine art reproduction.",
    description: "For oil paintings, watercolors, digital art - preserves artistic style",
    settings: { sharpness: 25, denoise: 5, contrast: 55, enhancementPasses: 1 },
  },
  graphic: {
    label: "Graphic Design",
    prompt: "ENHANCE as crisp graphic design. Sharp vector-like edges, clean solid colors, perfect gradients, precise lines and shapes. Print-ready quality with no artifacts.",
    description: "For logos, icons, illustrations - crisp vector-like output",
    settings: { sharpness: 90, denoise: 0, contrast: 70, enhancementPasses: 1 },
  },
  artwork: {
    label: "Fine Art",
    prompt: "REGENERATE as museum-quality artwork. Enhance canvas texture, preserve original brushwork and technique, add depth and luminosity. Archival reproduction quality.",
    description: "For classical art, sculptures, fine art photography",
    settings: { sharpness: 30, denoise: 10, contrast: 50, enhancementPasses: 2 },
  },
  denoise: {
    label: "Clean & Restore",
    prompt: "RESTORE this image: remove noise, artifacts, and damage. Regenerate clean, detailed version while keeping composition.",
    description: "Restore old, noisy, or damaged photos",
    settings: { sharpness: 35, denoise: 70, contrast: 45, enhancementPasses: 3 },
  },
  custom: {
    label: "Custom Prompt",
    prompt: "",
    description: "Write your own regeneration instructions",
    settings: { sharpness: 50, denoise: 0, contrast: 50, enhancementPasses: 1 },
  },
};
