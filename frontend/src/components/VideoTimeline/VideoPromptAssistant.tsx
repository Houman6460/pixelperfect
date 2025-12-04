/**
 * Video Prompt Assistant Component
 * Model-aware prompt enhancement with dialogue support
 */

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Wand2,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Check,
  Loader2,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Film,
  Camera,
  Palette,
  Volume2,
} from 'lucide-react';
import axios from 'axios';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

// Types
interface ModelCapabilities {
  model_id: string;
  display_name: string;
  max_prompt_length: number;
  supports_dialogue: 'full' | 'limited' | 'none';
  dialogue_format: string;
  supports_negative_prompt: boolean;
}

interface BuildPromptResponse {
  final_prompt: string;
  original_scene: string;
  improved_scene: string;
  processed_dialogue: string;
  model_id: string;
  model_name: string;
  prompt_length: number;
  max_length: number;
  warnings?: string[];
}

interface VideoPromptAssistantProps {
  modelId: string;
  modelName: string;
  initialPrompt?: string;
  onPromptChange: (prompt: string) => void;
  onFinalPromptGenerated?: (finalPrompt: string) => void;
  className?: string;
}

const TONE_PRESETS = [
  { value: '', label: 'Default' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'surreal', label: 'Surreal' },
  { value: 'documentary', label: 'Documentary' },
  { value: 'anime', label: 'Anime' },
  { value: 'dreamlike', label: 'Dreamlike' },
  { value: 'horror', label: 'Horror' },
  { value: 'romantic', label: 'Romantic' },
  { value: 'action', label: 'Action' },
];

const CAMERA_STYLES = [
  { value: '', label: 'Auto' },
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'crane', label: 'Crane' },
  { value: 'tracking', label: 'Tracking' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'handheld', label: 'Handheld' },
];

const MOTION_PROFILES = [
  { value: '', label: 'Auto' },
  { value: 'smooth', label: 'Smooth' },
  { value: 'dynamic', label: 'Dynamic' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'cinematic', label: 'Cinematic' },
];

const DIALOGUE_PERSONAS = [
  { value: '', label: 'Normal' },
  { value: 'whispering', label: 'Whispering' },
  { value: 'angry', label: 'Angry' },
  { value: 'emotional', label: 'Emotional' },
  { value: 'calm', label: 'Calm' },
  { value: 'excited', label: 'Excited' },
  { value: 'fearful', label: 'Fearful' },
  { value: 'robotic', label: 'Robotic' },
];

export function VideoPromptAssistant({
  modelId,
  modelName,
  initialPrompt = '',
  onPromptChange,
  onFinalPromptGenerated,
  className = '',
}: VideoPromptAssistantProps) {
  // State
  const [scenePrompt, setScenePrompt] = useState(initialPrompt);
  const [dialogue, setDialogue] = useState('');
  const [tonePreset, setTonePreset] = useState('');
  const [cameraStyle, setCameraStyle] = useState('');
  const [motionProfile, setMotionProfile] = useState('');
  const [dialoguePersona, setDialoguePersona] = useState('');
  
  const [showDialogue, setShowDialogue] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showInspector, setShowInspector] = useState(false);
  
  const [isImproving, setIsImproving] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  
  const [capabilities, setCapabilities] = useState<ModelCapabilities | null>(null);
  const [finalPrompt, setFinalPrompt] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch model capabilities
  useEffect(() => {
    const fetchCapabilities = async () => {
      try {
        const response = await axios.get(
          `${API_BASE}/api/v1/prompt-assistant/capabilities/${modelId}`
        );
        if (response.data.success) {
          setCapabilities(response.data.data);
        }
      } catch (err) {
        console.error('Failed to fetch capabilities:', err);
      }
    };

    if (modelId) {
      fetchCapabilities();
    }
  }, [modelId]);

  // Update scene prompt when initialPrompt changes
  useEffect(() => {
    setScenePrompt(initialPrompt);
  }, [initialPrompt]);

  // Improve prompt with AI
  const handleImprovePrompt = async () => {
    if (!scenePrompt.trim()) return;

    setIsImproving(true);
    setError(null);

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/prompt-assistant/ai-enhance`,
        {
          prompt: scenePrompt,
          model_id: modelId,
          tone_preset: tonePreset || undefined,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const improved = response.data.data.enhanced_prompt;
        setScenePrompt(improved);
        onPromptChange(improved);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to improve prompt');
    } finally {
      setIsImproving(false);
    }
  };

  // Build final prompt
  const handleBuildPrompt = async () => {
    if (!scenePrompt.trim()) return;

    setIsBuilding(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/prompt-assistant/build`,
        {
          scene_prompt: scenePrompt,
          dialogue: dialogue || undefined,
          model_id: modelId,
          tone_preset: tonePreset || undefined,
          camera_style: cameraStyle || undefined,
          motion_profile: motionProfile || undefined,
          dialogue_persona: dialoguePersona || undefined,
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data: BuildPromptResponse = response.data.data;
        setFinalPrompt(data.final_prompt);
        setWarnings(data.warnings || []);
        setShowInspector(true);
        onFinalPromptGenerated?.(data.final_prompt);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to build prompt');
    } finally {
      setIsBuilding(false);
    }
  };

  // Copy to clipboard
  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Get dialogue support badge
  const getDialogueSupportBadge = () => {
    if (!capabilities) return null;

    const support = capabilities.supports_dialogue;
    const colors = {
      full: 'bg-green-500/20 text-green-400 border-green-500/30',
      limited: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      none: 'bg-red-500/20 text-red-400 border-red-500/30',
    };
    const labels = {
      full: 'Full Dialogue Support',
      limited: 'Limited Dialogue',
      none: 'No Dialogue Support',
    };

    return (
      <span className={`px-2 py-0.5 text-xs rounded border ${colors[support]}`}>
        {labels[support]}
      </span>
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Scene Prompt */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-slate-300">
            Scene Description
          </label>
          <div className="flex items-center gap-2">
            {capabilities && (
              <span className="text-xs text-slate-500">
                {scenePrompt.length}/{capabilities.max_prompt_length}
              </span>
            )}
            <button
              onClick={handleImprovePrompt}
              disabled={isImproving || !scenePrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              title="Enhance prompt with AI"
            >
              {isImproving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Wand2 className="w-3.5 h-3.5" />
              )}
              Improve
            </button>
          </div>
        </div>
        <textarea
          value={scenePrompt}
          onChange={(e) => {
            setScenePrompt(e.target.value);
            onPromptChange(e.target.value);
          }}
          placeholder="Describe your video scene... e.g., 'A misty mountain ridge at sunrise with golden light breaking through clouds'"
          rows={4}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none"
        />
      </div>

      {/* Dialogue Section */}
      <div>
        <button
          onClick={() => setShowDialogue(!showDialogue)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <MessageSquare className="w-4 h-4" />
          Add Dialogue (Optional)
          {showDialogue ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {getDialogueSupportBadge()}
        </button>

        {showDialogue && (
          <div className="mt-3 space-y-3">
            {capabilities?.supports_dialogue === 'none' && (
              <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-yellow-300">
                  {modelName} does not support dialogue natively. The assistant will convert 
                  dialogue into visual descriptions or character actions.
                </p>
              </div>
            )}

            <textarea
              value={dialogue}
              onChange={(e) => setDialogue(e.target.value)}
              placeholder={'Enter dialogue in format:\nCharacter A: "First line of dialogue..."\nCharacter B: "Response..."'}
              rows={3}
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 resize-none font-mono text-sm"
            />

            {/* Dialogue Persona */}
            <div className="flex items-center gap-3">
              <Volume2 className="w-4 h-4 text-slate-500" />
              <select
                value={dialoguePersona}
                onChange={(e) => setDialoguePersona(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Dialogue tone"
                aria-label="Dialogue tone"
              >
                {DIALOGUE_PERSONAS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Advanced Settings */}
      <div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
        >
          <Palette className="w-4 h-4" />
          Style & Camera Settings
          {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAdvanced && (
          <div className="mt-3 grid grid-cols-3 gap-3">
            {/* Tone Preset */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tone</label>
              <select
                value={tonePreset}
                onChange={(e) => setTonePreset(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Tone preset"
                aria-label="Tone preset"
              >
                {TONE_PRESETS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Camera Style */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Camera</label>
              <select
                value={cameraStyle}
                onChange={(e) => setCameraStyle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Camera style"
                aria-label="Camera style"
              >
                {CAMERA_STYLES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>

            {/* Motion Profile */}
            <div>
              <label className="block text-xs text-slate-500 mb-1">Motion</label>
              <select
                value={motionProfile}
                onChange={(e) => setMotionProfile(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Motion profile"
                aria-label="Motion profile"
              >
                {MOTION_PROFILES.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Build Button */}
      <button
        onClick={handleBuildPrompt}
        disabled={isBuilding || !scenePrompt.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
      >
        {isBuilding ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <Sparkles className="w-5 h-5" />
        )}
        Build Final Prompt for {modelName}
      </button>

      {/* Error Display */}
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((warning, idx) => (
            <div key={idx} className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Prompt Inspector */}
      {finalPrompt && (
        <div className="space-y-2">
          <button
            onClick={() => setShowInspector(!showInspector)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            {showInspector ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showInspector ? 'Hide' : 'Show'} Final Prompt
          </button>

          {showInspector && (
            <div className="relative p-4 bg-slate-900/80 border border-slate-700 rounded-xl">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 font-medium">
                  Final Compiled Prompt ({finalPrompt.length} chars)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy(finalPrompt)}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                    title="Copy to clipboard"
                    aria-label="Copy final prompt"
                  >
                    <Copy className="w-4 h-4 text-slate-400" />
                  </button>
                  <button
                    onClick={handleBuildPrompt}
                    className="p-1.5 hover:bg-slate-700 rounded-lg transition"
                    title="Regenerate"
                    aria-label="Regenerate prompt"
                  >
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap font-mono leading-relaxed">
                {finalPrompt}
              </p>
              <div className="mt-3 pt-3 border-t border-slate-700 flex items-center gap-2">
                <Check className="w-4 h-4 text-green-400" />
                <span className="text-xs text-green-400">
                  Optimized for {modelName}
                </span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default VideoPromptAssistant;
