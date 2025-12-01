import React from "react";
import { Settings, EnhancementMode, ENHANCEMENT_PRESETS } from "../types";
import { Sparkles } from "lucide-react";

interface SettingsFormProps {
  settings: Settings;
  onChange: (next: Settings) => void;
  disabled?: boolean;
  onAutoOptimize?: () => void;
  imageLoaded?: boolean;
}

export function SettingsForm({ settings, onChange, disabled, onAutoOptimize, imageLoaded }: SettingsFormProps) {
  const update = (patch: Partial<Settings>) => {
    onChange({ ...settings, ...patch });
  };

  const handleTileSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    update({ tileSize: Number(event.target.value) || 0 });
  };

  const handleOverlapChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    update({ overlap: Number(event.target.value) || 0 });
  };

  const handleUpscaleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    update({ upscaleFactor: Number(event.target.value) || 1 });
  };

  const handleFinalPassChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    update({ finalPass: event.target.checked });
  };

  const handlePromptChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    update({ prompt: event.target.value, enhancementMode: "custom" });
  };

  const handleModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = event.target.value as EnhancementMode;
    const preset = ENHANCEMENT_PRESETS[mode];
    
    // Auto-apply optimized settings for this mode (except custom)
    if (mode !== "custom") {
      update({ 
        enhancementMode: mode, 
        prompt: preset.prompt,
        sharpness: preset.settings.sharpness,
        denoise: preset.settings.denoise,
        contrast: preset.settings.contrast,
        enhancementPasses: preset.settings.enhancementPasses,
      });
    } else {
      update({ 
        enhancementMode: mode, 
        prompt: settings.prompt,
      });
    }
  };

  const currentPreset = ENHANCEMENT_PRESETS[settings.enhancementMode];

  return (
    <div className="space-y-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-100">Enhancement Settings</h2>
        {onAutoOptimize && (
          <button
            type="button"
            onClick={onAutoOptimize}
            disabled={disabled || !imageLoaded}
            className="rounded-md bg-slate-700 px-2 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1"
          >
            <Sparkles className="w-3 h-3" /> Auto-optimize
          </button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        <i className="fa-solid fa-sliders text-purple-400 mr-1" />
        Fine-tune how AI enhances your image. Select a preset or adjust individual parameters for optimal results.
      </p>
      
      {/* Enhancement Mode - Full Width */}
      <div className="space-y-2">
        <label className="space-y-1 text-xs text-slate-300">
          <span className="font-medium">Enhancement Mode</span>
          <select
            value={settings.enhancementMode}
            onChange={handleModeChange}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={disabled}
          >
            {Object.entries(ENHANCEMENT_PRESETS).map(([key, preset]) => (
              <option key={key} value={key}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <p className="text-[11px] text-slate-400">{currentPreset.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-xs text-slate-300">
          <span>Tile size (px)</span>
          <input
            type="number"
            min={64}
            max={2048}
            step={16}
            value={settings.tileSize}
            onChange={handleTileSizeChange}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={disabled}
          />
        </label>

        <label className="space-y-1 text-xs text-slate-300">
          <span>Overlap (px)</span>
          <input
            type="number"
            min={0}
            max={1024}
            step={8}
            value={settings.overlap}
            onChange={handleOverlapChange}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={disabled}
          />
        </label>

        <label className="space-y-1 text-xs text-slate-300">
          <span>Upscale factor</span>
          <select
            value={settings.upscaleFactor}
            onChange={handleUpscaleChange}
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            disabled={disabled}
          >
            <option value={1.0}>1.0x (no scaling)</option>
            <option value={1.5}>1.5x</option>
            <option value={2.0}>2.0x</option>
            <option value={3.0}>3.0x</option>
            <option value={4.0}>4.0x</option>
            <option value={6.0}>6.0x</option>
            <option value={8.0}>8.0x</option>
            <option value={10.0}>10.0x</option>
            <option value={12.0}>12.0x</option>
            <option value={16.0}>16.0x</option>
            <option value={20.0}>20.0x</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-xs text-slate-300">
          <input
            type="checkbox"
            checked={settings.finalPass}
            onChange={handleFinalPassChange}
            className="h-4 w-4 rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-emerald-500"
            disabled={disabled}
          />
          <span>Final full-image enhancement pass</span>
        </label>
      </div>

      {/* Quality Controls Section */}
      <div className="space-y-3 border-t border-slate-800 pt-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold text-slate-200">Quality Controls</h3>
          {settings.enhancementMode !== "custom" && (
            <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Auto-optimized for {currentPreset.label}
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500">
          <i className="fa-solid fa-gauge-high text-emerald-400 mr-1" />
          Adjust sharpness, noise reduction, contrast, and enhancement passes for fine-grained control.
        </p>
        
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Sharpness Slider */}
          <label className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Sharpness</span>
              <span className="text-emerald-400">{settings.sharpness}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.sharpness}
              onChange={(e) => update({ sharpness: Number(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-emerald-500"
              disabled={disabled}
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Soft</span>
              <span>Sharp</span>
            </div>
          </label>

          {/* Denoise Slider */}
          <label className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Denoise</span>
              <span className="text-emerald-400">{settings.denoise}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.denoise}
              onChange={(e) => update({ denoise: Number(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-emerald-500"
              disabled={disabled}
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Off</span>
              <span>Strong</span>
            </div>
          </label>

          {/* Contrast Slider */}
          <label className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Contrast</span>
              <span className="text-emerald-400">{settings.contrast}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={settings.contrast}
              onChange={(e) => update({ contrast: Number(e.target.value) })}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer bg-slate-700 accent-emerald-500"
              disabled={disabled}
            />
            <div className="flex justify-between text-[10px] text-slate-500">
              <span>Low</span>
              <span>High</span>
            </div>
          </label>

          {/* Enhancement Passes */}
          <label className="space-y-1 text-xs text-slate-300">
            <div className="flex justify-between">
              <span>Enhancement Passes</span>
              <span className="text-emerald-400">{settings.enhancementPasses}x</span>
            </div>
            <select
              value={settings.enhancementPasses}
              onChange={(e) => update({ enhancementPasses: Number(e.target.value) })}
              className="w-full rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              disabled={disabled}
            >
              <option value={1}>1 pass (fastest)</option>
              <option value={2}>2 passes (better)</option>
              <option value={3}>3 passes (best quality)</option>
            </select>
            <p className="text-[10px] text-slate-500">More passes = better quality but slower</p>
          </label>
        </div>
      </div>

      <div className="space-y-2">
        <label className="block space-y-1 text-xs text-slate-300">
          <span>Prompt</span>
          <p className="text-xs text-slate-500 font-normal">
            <i className="fa-solid fa-comment-dots text-pink-400 mr-1" />
            Guide AI on how to enhance your image. Describe desired style, details, or specific improvements.
          </p>
          <textarea
            value={settings.prompt}
            onChange={handlePromptChange}
            rows={3}
            className="w-full resize-none rounded-md border border-slate-700 bg-slate-950 px-2 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="enhance detail, keep the original style"
            disabled={disabled}
          />
        </label>
      </div>
    </div>
  );
}
