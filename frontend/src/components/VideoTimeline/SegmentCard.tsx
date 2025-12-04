import React, { useState } from 'react';
import {
  Play, Pause, Trash2, Copy, GripVertical, ChevronDown, ChevronUp,
  AlertTriangle, Check, Clock, Loader2, Image, Video, Wand2,
  Camera, Zap, Settings2, Eye, RefreshCw, Download, Sparkles,
} from 'lucide-react';
import axios from 'axios';
import {
  TimelineSegment,
  MODEL_CAPABILITY_REGISTRY,
  ModelCapability,
  TransitionType,
  MotionProfile,
  CameraPath,
} from '../../types/videoTimeline';
import ModelSelector from './ModelSelector';
import EnhancementPanel from './EnhancementPanel';

interface SegmentCardProps {
  segment: TimelineSegment;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  isDragging?: boolean;
  onUpdate: (updates: Partial<TimelineSegment>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onGenerate: () => void;
  onPreview: () => void;
  onSetFirstFrame: (frame: string | null) => void;
  dragHandleProps?: any;
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon: any }> = {
  pending: { bg: 'bg-slate-700/50', text: 'text-slate-400', icon: Clock },
  generating: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', icon: Loader2 },
  generated: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Check },
  modified: { bg: 'bg-orange-500/20', text: 'text-orange-400', icon: RefreshCw },
  error: { bg: 'bg-red-500/20', text: 'text-red-400', icon: AlertTriangle },
};

const TRANSITIONS: { value: TransitionType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'fade', label: 'Fade' },
  { value: 'morph', label: 'Morph' },
  { value: 'warp', label: 'Warp' },
  { value: 'dissolve', label: 'Dissolve' },
];

const MOTION_PROFILES: { value: MotionProfile; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'fast', label: 'Fast' },
  { value: 'cinematic', label: 'Cinematic' },
  { value: 'dramatic', label: 'Dramatic' },
  { value: 'gentle', label: 'Gentle' },
];

const CAMERA_PATHS: { value: CameraPath; label: string }[] = [
  { value: 'static', label: 'Static' },
  { value: 'pan', label: 'Pan' },
  { value: 'zoom', label: 'Zoom' },
  { value: 'orbit', label: 'Orbit' },
  { value: 'dolly', label: 'Dolly' },
  { value: 'flyover', label: 'Flyover' },
  { value: 'chase', label: 'Chase' },
];

export default function SegmentCard({
  segment,
  index,
  isFirst,
  isLast,
  isDragging,
  onUpdate,
  onDelete,
  onDuplicate,
  onGenerate,
  onPreview,
  onSetFirstFrame,
  dragHandleProps,
}: SegmentCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [enhanceEnabled, setEnhanceEnabled] = useState(false);
  const [enhanceModel, setEnhanceModel] = useState<string | undefined>();
  
  const model = MODEL_CAPABILITY_REGISTRY[segment.model];
  const statusStyle = STATUS_STYLES[segment.status];
  const StatusIcon = statusStyle.icon;

  const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        onSetFirstFrame(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImprovePrompt = async () => {
    if (!segment.prompt.trim() || isImproving) return;
    
    setIsImproving(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_BASE}/api/v1/prompt-assistant/ai-enhance`,
        {
          prompt: segment.prompt,
          model_id: segment.model,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );
      
      if (response.data.success) {
        onUpdate({ prompt: response.data.data.enhanced_prompt });
      }
    } catch (error) {
      console.error('Failed to improve prompt:', error);
    } finally {
      setIsImproving(false);
    }
  };

  return (
    <div
      className={`rounded-xl border transition-all ${
        isDragging
          ? 'border-purple-500 shadow-lg shadow-purple-500/20 scale-[1.02]'
          : segment.status === 'error'
          ? 'border-red-500/50 bg-red-500/5'
          : segment.status === 'generated'
          ? 'border-emerald-500/30 bg-emerald-500/5'
          : 'border-slate-700/50 bg-slate-800/30'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-slate-700/50">
        {/* Drag Handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-slate-700/50 rounded"
        >
          <GripVertical className="w-4 h-4 text-slate-500" />
        </div>

        {/* Segment Number */}
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-white text-sm font-bold">
          {index + 1}
        </div>

        {/* Thumbnail */}
        <div className="w-16 h-10 rounded-lg bg-slate-700/50 overflow-hidden flex-shrink-0">
          {segment.thumbnail_url || segment.first_frame ? (
            <img
              src={segment.thumbnail_url || segment.first_frame || ''}
              alt={`Segment ${index + 1}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Video className="w-4 h-4 text-slate-500" />
            </div>
          )}
        </div>

        {/* Model & Duration */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white truncate">
              {model?.display_name || segment.model}
            </span>
            <span className="text-xs text-slate-400">{segment.duration_sec}s</span>
          </div>
          <p className="text-xs text-slate-500 truncate">
            {segment.prompt || 'No prompt set'}
          </p>
        </div>

        {/* Status Badge */}
        <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${statusStyle.bg}`}>
          <StatusIcon className={`w-3 h-3 ${statusStyle.text} ${segment.status === 'generating' ? 'animate-spin' : ''}`} />
          <span className={`text-xs capitalize ${statusStyle.text}`}>{segment.status}</span>
        </div>

        {/* Expand/Collapse */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 hover:bg-slate-700/50 rounded-lg transition"
        >
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </button>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-slate-400">Prompt</label>
              <button
                onClick={handleImprovePrompt}
                disabled={isImproving || !segment.prompt.trim()}
                className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                title="Improve prompt with AI"
                aria-label="Improve prompt with AI"
              >
                {isImproving ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Sparkles className="w-3 h-3" />
                )}
                Improve
              </button>
            </div>
            <textarea
              value={segment.prompt}
              onChange={(e) => onUpdate({ prompt: e.target.value })}
              placeholder="Describe this segment... (e.g., Cinematic sunset over mountains, slow dolly movement)"
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              rows={3}
            />
          </div>

          {/* Model & Duration Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Model</label>
              <ModelSelector
                value={segment.model}
                onChange={(model) => onUpdate({ model })}
                maxDuration={segment.duration_sec}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Duration ({model?.min_duration || 1}s - {model?.max_duration || 10}s)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min={model?.min_duration || 1}
                  max={model?.max_duration || 10}
                  step={0.5}
                  value={segment.duration_sec}
                  onChange={(e) => onUpdate({ duration_sec: parseFloat(e.target.value) })}
                  className="flex-1 accent-purple-500"
                  title={`Duration: ${segment.duration_sec}s`}
                  aria-label="Segment duration"
                />
                <span className="w-12 text-center text-sm text-white bg-slate-700/50 rounded px-2 py-1">
                  {segment.duration_sec}s
                </span>
              </div>
            </div>
          </div>

          {/* First Frame */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              First Frame {!isFirst && '(auto-linked from previous segment)'}
            </label>
            <div className="flex items-center gap-3">
              <div className="w-24 h-14 rounded-lg border border-slate-700 overflow-hidden bg-slate-900/50 flex items-center justify-center">
                {segment.first_frame ? (
                  <img src={segment.first_frame} alt="First frame" className="w-full h-full object-cover" />
                ) : (
                  <Image className="w-5 h-5 text-slate-600" />
                )}
              </div>
              {isFirst && (
                <>
                  <label className="flex-1 px-3 py-2 border border-dashed border-slate-600 rounded-lg text-center cursor-pointer hover:bg-slate-700/30 transition">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <span className="text-xs text-slate-400">Upload start frame</span>
                  </label>
                  {segment.first_frame && (
                    <button
                      onClick={() => onSetFirstFrame(null)}
                      className="p-2 hover:bg-red-500/20 rounded-lg transition"
                      title="Remove first frame"
                      aria-label="Remove first frame"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Motion & Transition Row */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Motion</label>
              <select
                value={segment.motion_profile}
                onChange={(e) => onUpdate({ motion_profile: e.target.value as MotionProfile })}
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Motion profile"
                aria-label="Motion profile"
              >
                {MOTION_PROFILES.map((mp) => (
                  <option key={mp.value} value={mp.value}>{mp.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Camera</label>
              <select
                value={segment.camera_path}
                onChange={(e) => onUpdate({ camera_path: e.target.value as CameraPath })}
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                title="Camera path"
                aria-label="Camera path"
              >
                {CAMERA_PATHS.map((cp) => (
                  <option key={cp.value} value={cp.value}>{cp.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Transition</label>
              <select
                value={segment.transition}
                onChange={(e) => onUpdate({ transition: e.target.value as TransitionType })}
                className="w-full px-2 py-1.5 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                disabled={isLast}
                title="Transition type"
                aria-label="Transition type"
              >
                {TRANSITIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Advanced Settings Toggle */}
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
          >
            <Settings2 className="w-3.5 h-3.5" />
            {showAdvanced ? 'Hide' : 'Show'} Advanced Settings
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>

          {/* Advanced Settings */}
          {showAdvanced && (
            <div className="p-3 bg-slate-900/30 rounded-lg space-y-3">
              {/* AI Enhancement */}
              <EnhancementPanel
                segmentId={String(segment.segment_id)}
                enabled={enhanceEnabled}
                modelId={enhanceModel}
                onEnableChange={(enabled, modelId) => {
                  setEnhanceEnabled(enabled);
                  setEnhanceModel(modelId);
                }}
                compact={false}
              />
              
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">Negative Prompt</label>
                <input
                  type="text"
                  value={segment.negative_prompt || ''}
                  onChange={(e) => onUpdate({ negative_prompt: e.target.value })}
                  placeholder="What to avoid..."
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Seed (optional)</label>
                  <input
                    type="number"
                    value={segment.seed || ''}
                    onChange={(e) => onUpdate({ seed: e.target.value ? parseInt(e.target.value) : undefined })}
                    placeholder="Random"
                    className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">Style Preset</label>
                  <select
                    value={segment.style_preset || ''}
                    onChange={(e) => onUpdate({ style_preset: e.target.value || undefined })}
                    className="w-full px-2 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                    title="Style preset"
                    aria-label="Style preset"
                  >
                    <option value="">None</option>
                    {model?.style_presets?.map((style) => (
                      <option key={style} value={style}>{style}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {segment.status === 'error' && segment.error_message && (
            <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-300">{segment.error_message}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <div className="flex items-center gap-2">
              <button
                onClick={onDuplicate}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-lg transition"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicate
              </button>
              <button
                onClick={onDelete}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onPreview}
                disabled={segment.status === 'generating'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition disabled:opacity-50"
              >
                <Eye className="w-3.5 h-3.5" />
                Preview
              </button>
              <button
                onClick={onGenerate}
                disabled={!segment.prompt || segment.status === 'generating'}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-lg transition disabled:opacity-50"
              >
                {segment.status === 'generating' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    Generate
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
