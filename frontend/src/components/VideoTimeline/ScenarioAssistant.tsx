/**
 * Scenario Assistant Component
 * Full scenario editing with AI improvement and timeline generation
 */

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  FileText,
  Sparkles,
  Wand2,
  Play,
  Loader2,
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Film,
  Users,
  MessageSquare,
  Eye,
  EyeOff,
  Copy,
  RefreshCw,
  Layers,
  Settings,
} from 'lucide-react';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

// Types
interface SceneBreakdown {
  scene_id: string;
  scene_number: number;
  title?: string;
  estimated_duration_sec: number;
  summary: string;
  characters: string[];
  dialogue_blocks: { character: string; line: string }[];
  emotions: string[];
  visual_style: string;
}

interface ScenarioBreakdown {
  scenario_id: string;
  total_duration_sec: number;
  scene_count: number;
  scenes: SceneBreakdown[];
  characters: { name: string; description: string }[];
  warnings: string[];
}

interface TimelineSegment {
  segment_id: string;
  segment_number: number;
  scene_id: string;
  duration_sec: number;
  model_id: string;
  prompt: string;
  final_prompt?: string;
  dialogue?: string;
  motion_profile: string;
  camera_path: string;
  transition: string;
  status: string;
}

interface GeneratedTimeline {
  timeline_id: string;
  total_duration_sec: number;
  segment_count: number;
  segments: TimelineSegment[];
  warnings: string[];
}

interface ScenarioAssistantProps {
  onTimelineGenerated?: (timeline: GeneratedTimeline) => void;
  initialScenario?: string;
  className?: string;
}

interface Model {
  model_id: string;
  display_name: string;
  max_duration_sec: number;
  supports_dialogue: string;
  recommended_for_scenario: boolean;
}

export function ScenarioAssistant({
  onTimelineGenerated,
  initialScenario = '',
  className = '',
}: ScenarioAssistantProps) {
  // State
  const [scenario, setScenario] = useState(initialScenario);
  const [improvedScenario, setImprovedScenario] = useState<string | null>(null);
  const [targetDuration, setTargetDuration] = useState(60); // seconds
  const [selectedModelId, setSelectedModelId] = useState('kling-2.5-pro');
  const [models, setModels] = useState<Model[]>([]);
  
  const [isImproving, setIsImproving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [breakdown, setBreakdown] = useState<ScenarioBreakdown | null>(null);
  const [timeline, setTimeline] = useState<GeneratedTimeline | null>(null);
  
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [improvementSuccess, setImprovementSuccess] = useState(false);

  // Get auth token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Fetch available models
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await axios.get(`${API_BASE}/api/v1/scenario/models`);
        if (response.data.success) {
          setModels(response.data.data.recommended || response.data.data.models);
          if (response.data.data.recommended?.length > 0) {
            setSelectedModelId(response.data.data.recommended[0].model_id);
          }
        }
      } catch (err) {
        console.error('Failed to fetch models:', err);
      }
    };
    fetchModels();
  }, []);

  // Improve scenario
  const handleImproveScenario = async () => {
    if (!scenario.trim() || isImproving) return;

    setIsImproving(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/scenario/improve`,
        {
          scenario_text: scenario,
          target_duration_sec: targetDuration,
          target_model_id: selectedModelId,
          style_hints: {
            genre: 'cinematic',
            mood: 'compelling',
            pacing: 'medium',
          },
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data = response.data.data;
        setImprovedScenario(data.improved_scenario);
        setScenario(data.improved_scenario);
        setWarnings(data.warnings || []);
        setImprovementSuccess(true);
        setTimeout(() => setImprovementSuccess(false), 3000);
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to improve scenario');
    } finally {
      setIsImproving(false);
    }
  };

  // Generate plan
  const handleGeneratePlan = async () => {
    if (!scenario.trim() || isGenerating) return;

    setIsGenerating(true);
    setError(null);
    setWarnings([]);

    try {
      const response = await axios.post(
        `${API_BASE}/api/v1/scenario/generate-plan`,
        {
          scenario_text: scenario,
          target_duration_sec: targetDuration,
          target_model_id: selectedModelId,
          options: {
            enable_frame_chaining: true,
            style_consistency: true,
            character_consistency: true,
          },
        },
        { headers: getAuthHeaders() }
      );

      if (response.data.success) {
        const data = response.data.data;
        setBreakdown(data.breakdown);
        setTimeline(data.timeline);
        setWarnings(data.warnings || []);
        setShowBreakdown(true);
        
        // Notify parent
        if (onTimelineGenerated && data.timeline) {
          onTimelineGenerated(data.timeline);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate plan');
    } finally {
      setIsGenerating(false);
    }
  };

  // Format duration
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const selectedModel = models.find(m => m.model_id === selectedModelId);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-slate-700">
        <div className="p-2 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500">
          <FileText className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-white">Scenario Assistant</h2>
          <p className="text-xs text-slate-400">Write your story, let AI handle the rest</p>
        </div>
      </div>

      {/* Scenario Input */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label htmlFor="scenario-input" className="text-sm font-medium text-slate-300">
            Your Scenario
          </label>
          <span className="text-xs text-slate-500">{scenario.length} characters</span>
        </div>
        <textarea
          id="scenario-input"
          value={scenario}
          onChange={(e) => {
            setScenario(e.target.value);
            setImprovedScenario(null);
            setTimeline(null);
          }}
          placeholder={`Write your full story here...

Example:
SCENE 1: A misty mountain ridge at dawn.
A lone traveler stands at the edge, looking out at the vast landscape below.

Traveler: "I've come so far..."

The camera slowly pans across the horizon as the sun begins to rise, casting golden light through the clouds.

SCENE 2: A small village in the valley.
The traveler walks through the quiet streets...`}
          rows={12}
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono text-sm leading-relaxed"
        />
        {/* Success notification */}
        {improvementSuccess && (
          <div className="flex items-center gap-2 mt-2 text-xs text-green-400">
            <Check className="w-3 h-3" />
            Scenario improved successfully
          </div>
        )}
      </div>

      {/* Settings Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Model Selection */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            <Film className="w-4 h-4 inline mr-2" />
            Target Model
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
            aria-label="Select target model"
          >
            {models.map((model) => (
              <option key={model.model_id} value={model.model_id}>
                {model.display_name} ({model.max_duration_sec}s max)
              </option>
            ))}
          </select>
          {selectedModel && (
            <p className="text-xs text-slate-500 mt-1">
              Dialogue: {selectedModel.supports_dialogue}
            </p>
          )}
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-medium text-slate-300 mb-2 block">
            <Clock className="w-4 h-4 inline mr-2" />
            Target Duration: {formatDuration(targetDuration)}
          </label>
          <input
            type="range"
            min={30}
            max={600}
            step={30}
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
            className="w-full accent-purple-500"
            aria-label="Target duration"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>30s</span>
            <span>10m</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={handleImproveScenario}
          disabled={!scenario.trim() || isImproving}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Improve scenario with AI"
        >
          {isImproving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          Improve Scenario
        </button>

        <button
          onClick={handleGeneratePlan}
          disabled={!scenario.trim() || isGenerating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-medium rounded-xl disabled:opacity-50 disabled:cursor-not-allowed transition"
          aria-label="Generate timeline plan"
        >
          {isGenerating ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          Generate Plan
        </button>
      </div>

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
            <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-yellow-300">{warning}</p>
            </div>
          ))}
        </div>
      )}

      {/* Breakdown Preview */}
      {breakdown && (
        <div className="space-y-3">
          <button
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition w-full"
            aria-expanded={showBreakdown ? "true" : "false"}
          >
            {showBreakdown ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            Scenario Breakdown
            <span className="ml-auto text-xs text-slate-500">
              {breakdown.scene_count} scenes • {formatDuration(breakdown.total_duration_sec)}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showBreakdown ? 'rotate-180' : ''}`} />
          </button>

          {showBreakdown && (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {breakdown.scenes.map((scene) => (
                <div
                  key={scene.scene_id}
                  className="p-3 bg-slate-800/50 border border-slate-700 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-white">
                      Scene {scene.scene_number}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDuration(scene.estimated_duration_sec)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-2">{scene.summary}</p>
                  {scene.characters.length > 0 && (
                    <div className="flex items-center gap-1 mt-2">
                      <Users className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {scene.characters.join(', ')}
                      </span>
                    </div>
                  )}
                  {scene.dialogue_blocks.length > 0 && (
                    <div className="flex items-center gap-1 mt-1">
                      <MessageSquare className="w-3 h-3 text-slate-500" />
                      <span className="text-xs text-slate-500">
                        {scene.dialogue_blocks.length} dialogue lines
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Timeline Preview */}
      {timeline && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <Check className="w-5 h-5 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">
              Timeline Generated
            </span>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{timeline.segment_count}</div>
              <div className="text-xs text-slate-400">Segments</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{formatDuration(timeline.total_duration_sec)}</div>
              <div className="text-xs text-slate-400">Duration</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{breakdown?.scene_count || '-'}</div>
              <div className="text-xs text-slate-400">Scenes</div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Ready to generate! Check the Timeline tab to preview and edit segments.
          </p>
        </div>
      )}
    </div>
  );
}

export default ScenarioAssistant;
