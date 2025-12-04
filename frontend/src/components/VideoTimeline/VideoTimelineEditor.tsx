import React, { useState, useCallback, useEffect } from 'react';
import {
  Film, Plus, Save, Settings, Info, AlertTriangle, ChevronDown, ChevronUp,
  Sparkles, Loader2, Clock, Zap, CheckCircle, XCircle, Music, Share2, Wand2,
} from 'lucide-react';
import { useVideoTimeline, getModelCapability, getAvailableModels } from '../../hooks/useVideoTimeline';
import { VideoTimeline, TimelineSegment, MODEL_CAPABILITY_REGISTRY } from '../../types/videoTimeline';
import SegmentCard from './SegmentCard';
import TimelineTrack from './TimelineTrack';
import TimelineControls from './TimelineControls';
import AspectRatioSelector from './AspectRatioSelector';
import ResolutionSelector from './ResolutionSelector';
import AudioTrackPanel from './AudioTrackPanel';
import EnhancementPanel from './EnhancementPanel';
import PublishPanel from './PublishPanel';

interface VideoTimelineEditorProps {
  onClose?: () => void;
  initialTimeline?: any; // Timeline from scenario generation
}

export default function VideoTimelineEditor({ onClose, initialTimeline }: VideoTimelineEditorProps) {
  const {
    timeline,
    savedTimelines,
    isLoading,
    isSaving,
    error,
    createTimeline,
    loadTimeline,
    saveTimeline,
    deleteTimeline,
    updateTimelineProps,
    exportTimeline,
    importTimeline,
    loadFromScenario,
    addSegment,
    removeSegment,
    updateSegment,
    duplicateSegment,
    reorderSegments,
    setSegmentStatus,
    setSegmentResult,
    getAdjacentSegments,
  } = useVideoTimeline();
  
  // Load initial timeline from scenario generation
  const [hasLoadedInitial, setHasLoadedInitial] = React.useState(false);
  
  React.useEffect(() => {
    if (initialTimeline && !hasLoadedInitial) {
      console.log('Loading initial timeline from scenario:', initialTimeline);
      loadFromScenario(initialTimeline);
      setHasLoadedInitial(true);
    }
  }, [initialTimeline, hasLoadedInitial, loadFromScenario]);

  const [selectedSegmentId, setSelectedSegmentId] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showSavedTimelines, setShowSavedTimelines] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAudioPanel, setShowAudioPanel] = useState(false);
  const [showPublishPanel, setShowPublishPanel] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<string>('16:9');
  const [generationQueue, setGenerationQueue] = useState<number[]>([]);

  // Track changes
  useEffect(() => {
    if (timeline) {
      setHasChanges(true);
    }
  }, [timeline?.segments]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (hasChanges && timeline) {
      const timer = setTimeout(() => {
        saveTimeline();
        setHasChanges(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasChanges, timeline, saveTimeline]);

  // Initialize timeline if none exists
  useEffect(() => {
    if (!isLoading && !timeline && savedTimelines.length === 0) {
      createTimeline('My First Timeline');
    }
  }, [isLoading, timeline, savedTimelines, createTimeline]);

  // Handle segment generation (mock for now)
  const handleGenerateSegment = useCallback(async (segmentId: number) => {
    if (!timeline) return;

    const segment = timeline.segments.find(s => s.segment_id === segmentId);
    if (!segment || !segment.prompt) return;

    setSegmentStatus(segmentId, 'generating');

    // Simulate generation time
    await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

    // Mock result
    const success = Math.random() > 0.1; // 90% success rate for demo
    if (success) {
      setSegmentResult(
        segmentId,
        `https://via.placeholder.com/1920x1080/1a1a2e/ffffff?text=Segment+${segmentId}`,
        `https://via.placeholder.com/320x180/1a1a2e/ffffff?text=Thumb+${segmentId}`,
        'data:image/png;base64,mock_last_frame'
      );
    } else {
      setSegmentStatus(segmentId, 'error', 'Generation failed - please try again');
    }
  }, [timeline, setSegmentStatus, setSegmentResult]);

  // Handle preview generation
  const handlePreviewSegment = useCallback(async (segmentId: number) => {
    // Use preview model for fast generation
    if (!timeline) return;
    const segment = timeline.segments.find(s => s.segment_id === segmentId);
    if (!segment) return;

    // Temporarily switch to preview model
    const originalModel = segment.model;
    updateSegment(segmentId, { model: 'animatediff-lightning' });
    await handleGenerateSegment(segmentId);
    updateSegment(segmentId, { model: originalModel });
  }, [timeline, updateSegment, handleGenerateSegment]);

  // Generate all pending segments
  const handleGenerateAll = useCallback(async () => {
    if (!timeline) return;

    const pendingSegments = timeline.segments.filter(
      s => s.status === 'pending' || s.status === 'modified'
    );

    if (pendingSegments.length === 0) return;

    setIsGenerating(true);
    setGenerationQueue(pendingSegments.map(s => s.segment_id));

    for (const segment of pendingSegments) {
      await handleGenerateSegment(segment.segment_id);
      setGenerationQueue(prev => prev.filter(id => id !== segment.segment_id));
    }

    setIsGenerating(false);
    setGenerationQueue([]);
  }, [timeline, handleGenerateSegment]);

  // Preview all segments
  const handlePreviewAll = useCallback(async () => {
    if (!timeline) return;

    const pendingSegments = timeline.segments.filter(
      s => s.status === 'pending' || s.status === 'modified'
    );

    if (pendingSegments.length === 0) return;

    setIsGenerating(true);

    for (const segment of pendingSegments) {
      await handlePreviewSegment(segment.segment_id);
    }

    setIsGenerating(false);
  }, [timeline, handlePreviewSegment]);

  // Handle export
  const handleExport = useCallback(() => {
    const json = exportTimeline();
    if (json) {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${timeline?.name || 'timeline'}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [exportTimeline, timeline?.name]);

  // Handle first frame update
  const handleSetFirstFrame = useCallback((segmentId: number, frame: string | null) => {
    updateSegment(segmentId, { first_frame: frame });
  }, [updateSegment]);

  // Handle render final
  const handleRenderFinal = useCallback(() => {
    // TODO: Implement final render with transitions
    alert('Final render will combine all segments with transitions. Coming soon!');
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
          <span className="text-slate-400">Loading timeline...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
            <Film className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={timeline?.name || ''}
                onChange={(e) => updateTimelineProps({ name: e.target.value })}
                className="text-xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded px-1 -ml-1"
                placeholder="Timeline Name"
                aria-label="Timeline name"
              />
              {hasChanges && (
                <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded">
                  Unsaved
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">
              {timeline?.segments.length || 0} segments • {timeline?.total_duration_sec || 0}s total
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition"
            aria-label="Timeline settings"
          >
            <Settings className="w-5 h-5 text-slate-400" />
          </button>
          {savedTimelines.length > 0 && (
            <button
              onClick={() => setShowSavedTimelines(!showSavedTimelines)}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition"
              aria-label="Show saved timelines"
            >
              <span className="text-sm text-slate-300">Saved ({savedTimelines.length})</span>
              <ChevronDown className={`w-4 h-4 text-slate-400 transition ${showSavedTimelines ? 'rotate-180' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Saved Timelines Dropdown */}
      {showSavedTimelines && (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-2">
          <h3 className="text-sm font-medium text-slate-400 mb-3">Saved Timelines</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {savedTimelines.map((t) => (
              <button
                key={t.timeline_id}
                onClick={() => {
                  loadTimeline(t.timeline_id);
                  setShowSavedTimelines(false);
                }}
                className={`p-3 rounded-lg border text-left transition ${
                  t.timeline_id === timeline?.timeline_id
                    ? 'bg-purple-500/20 border-purple-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:bg-slate-700/50'
                }`}
              >
                <div className="text-sm font-medium text-white truncate">{t.name}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {t.segments.length} segments • {t.total_duration_sec}s
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Timeline Settings */}
      {showSettings && (
        <div className="p-4 bg-slate-800/30 rounded-xl border border-slate-700/50 space-y-6">
          <h3 className="text-sm font-medium text-slate-400">Timeline Settings</h3>
          
          {/* Aspect Ratio Selector */}
          <AspectRatioSelector
            value={aspectRatio}
            onChange={(aspect) => {
              setAspectRatio(aspect);
              updateTimelineProps({ aspect_ratio: aspect } as any);
            }}
            showPlatformHints={true}
          />
          
          {/* Resolution Selector */}
          <ResolutionSelector
            value={timeline?.target_resolution || '1080p'}
            aspectRatio={aspectRatio}
            onChange={(res) => updateTimelineProps({ target_resolution: res as any })}
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Global Style</label>
              <input
                type="text"
                value={timeline?.global_style || ''}
                onChange={(e) => updateTimelineProps({ global_style: e.target.value })}
                placeholder="e.g., cinematic, film grain"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                aria-label="Global style"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Description</label>
              <input
                type="text"
                value={timeline?.description || ''}
                onChange={(e) => updateTimelineProps({ description: e.target.value })}
                placeholder="Timeline description"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                aria-label="Timeline description"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Tags</label>
              <input
                type="text"
                value={timeline?.tags?.join(', ') || ''}
                onChange={(e) => updateTimelineProps({ tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) })}
                placeholder="tag1, tag2"
                className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500"
                aria-label="Timeline tags"
              />
            </div>
          </div>
        </div>
      )}

      {/* Feature Panels */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowAudioPanel(!showAudioPanel)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            showAudioPanel ? 'bg-green-500/20 text-green-300 border border-green-500/50' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
          }`}
        >
          <Music className="w-4 h-4" />
          <span className="text-sm">Audio Track</span>
        </button>
        <button
          onClick={() => setShowPublishPanel(!showPublishPanel)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
            showPublishPanel ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' : 'bg-slate-800/50 text-slate-400 border border-slate-700 hover:bg-slate-700/50'
          }`}
        >
          <Share2 className="w-4 h-4" />
          <span className="text-sm">Publish</span>
        </button>
      </div>

      {/* Audio Track Panel */}
      {showAudioPanel && timeline && (
        <AudioTrackPanel
          timelineId={timeline.timeline_id}
          videoDuration={timeline.total_duration_sec}
        />
      )}

      {/* Publish Panel */}
      {showPublishPanel && timeline && (
        <PublishPanel
          projectId={timeline.timeline_id}
          currentAspect={aspectRatio}
          videoDuration={timeline.total_duration_sec}
        />
      )}

      {/* Controls */}
      <TimelineControls
        timeline={timeline}
        isPlaying={isPlaying}
        isGenerating={isGenerating}
        hasChanges={hasChanges}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onAddSegment={() => addSegment()}
        onSave={() => {
          saveTimeline();
          setHasChanges(false);
        }}
        onExport={handleExport}
        onImport={importTimeline}
        onGenerateAll={handleGenerateAll}
        onPreviewAll={handlePreviewAll}
        onRenderFinal={handleRenderFinal}
        onNewTimeline={() => createTimeline()}
        onLoadTimeline={() => setShowSavedTimelines(true)}
        onClear={() => {
          if (confirm('Clear all segments except the first one?')) {
            // Keep only first segment
            if (timeline && timeline.segments.length > 1) {
              timeline.segments.slice(1).forEach(s => removeSegment(s.segment_id));
            }
          }
        }}
      />

      {/* Timeline Track */}
      {timeline && (
        <TimelineTrack
          timeline={timeline}
          onSegmentClick={(id) => setSelectedSegmentId(id === selectedSegmentId ? null : id)}
          selectedSegmentId={selectedSegmentId || undefined}
          isPlaying={isPlaying}
          currentTime={currentTime}
        />
      )}

      {/* Generation Progress */}
      {isGenerating && generationQueue.length > 0 && (
        <div className="flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
          <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
          <div className="flex-1">
            <div className="text-sm text-white">
              Generating segment {timeline?.segments.findIndex(s => s.segment_id === generationQueue[0])! + 1}...
            </div>
            <div className="text-xs text-slate-400">
              {generationQueue.length} remaining
            </div>
          </div>
        </div>
      )}

      {/* Segment Cards */}
      {timeline && (
        <div className="space-y-4">
          {timeline.segments.map((segment, index) => (
            <SegmentCard
              key={segment.segment_id}
              segment={segment}
              index={index}
              isFirst={index === 0}
              isLast={index === timeline.segments.length - 1}
              onUpdate={(updates) => updateSegment(segment.segment_id, updates)}
              onDelete={() => {
                if (timeline.segments.length > 1) {
                  removeSegment(segment.segment_id);
                }
              }}
              onDuplicate={() => duplicateSegment(segment.segment_id)}
              onGenerate={() => handleGenerateSegment(segment.segment_id)}
              onPreview={() => handlePreviewSegment(segment.segment_id)}
              onSetFirstFrame={(frame) => handleSetFirstFrame(segment.segment_id, frame)}
            />
          ))}

          {/* Add Segment Button */}
          <button
            onClick={() => addSegment()}
            className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-700 rounded-xl text-slate-400 hover:text-white hover:border-purple-500/50 hover:bg-purple-500/5 transition"
          >
            <Plus className="w-5 h-5" />
            <span>Add Segment</span>
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <XCircle className="w-5 h-5 text-red-400" />
          <span className="text-sm text-red-300">{error}</span>
        </div>
      )}

      {/* Model Capability Info */}
      <div className="p-4 bg-slate-800/20 rounded-xl border border-slate-700/30">
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <Info className="w-3.5 h-3.5" />
          <span>Available Video Models</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {getAvailableModels().slice(0, 6).map((model) => (
            <div
              key={model.model_id}
              className="flex items-center gap-2 px-2 py-1 bg-slate-800/50 rounded-lg text-xs"
            >
              <span className="text-white">{model.display_name}</span>
              <span className="text-slate-500">{model.max_duration}s max</span>
              {model.supports_last_frame && (
                <span title="Supports frame chaining">
                  <CheckCircle className="w-3 h-3 text-emerald-400" />
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
