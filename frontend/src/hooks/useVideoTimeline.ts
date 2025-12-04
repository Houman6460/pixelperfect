import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import {
  VideoTimeline,
  TimelineSegment,
  MODEL_CAPABILITY_REGISTRY,
  ModelCapability,
  RoutingDecision,
  SegmentStatus,
  TransitionType,
  MotionProfile,
  CameraPath,
  RenderPriority,
  Resolution,
} from '../types/videoTimeline';

// Local storage key
const TIMELINES_STORAGE_KEY = 'video_timelines';
const CURRENT_TIMELINE_KEY = 'current_timeline_id';

// Create a new empty segment
export function createEmptySegment(segmentId: number): TimelineSegment {
  return {
    segment_id: segmentId,
    duration_sec: 5,
    model: 'wan-2.5-i2v',
    prompt: '',
    negative_prompt: '',
    first_frame: null,
    last_frame: null,
    status: 'pending',
    transition: 'fade',
    motion_profile: 'smooth',
    camera_path: 'static',
    priority: 'standard',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// Create a new empty timeline
export function createEmptyTimeline(name: string = 'Untitled Timeline'): VideoTimeline {
  return {
    timeline_id: nanoid(12),
    name,
    description: '',
    version: '1.0',
    segments: [createEmptySegment(1)],
    total_duration_sec: 5,
    target_resolution: '1080p',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_template: false,
    tags: [],
  };
}

// Calculate total duration
function calculateTotalDuration(segments: TimelineSegment[]): number {
  return segments.reduce((sum, seg) => sum + seg.duration_sec, 0);
}

// Get model capability
export function getModelCapability(modelId: string): ModelCapability | null {
  return MODEL_CAPABILITY_REGISTRY[modelId] || null;
}

// Get all available models
export function getAvailableModels(): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => m.is_available);
}

// Get preview models
export function getPreviewModels(): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => m.is_preview_model && m.is_available);
}

// Get high-quality models
export function getHighQualityModels(): ModelCapability[] {
  return Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => !m.is_preview_model && m.quality_score >= 7 && m.is_available);
}

// Check if model supports frame constraints
export function supportsFrameChaining(modelId: string): { first: boolean; last: boolean } {
  const model = MODEL_CAPABILITY_REGISTRY[modelId];
  if (!model) return { first: false, last: false };
  return {
    first: model.supports_first_frame,
    last: model.supports_last_frame,
  };
}

// Get routing decision for a segment
export function getRoutingDecision(
  segment: TimelineSegment,
  prevSegment?: TimelineSegment,
  nextSegment?: TimelineSegment
): RoutingDecision {
  const model = MODEL_CAPABILITY_REGISTRY[segment.model];
  const warnings: string[] = [];
  const fallbackModels: string[] = [];
  let requiresSplit = false;
  let suggestedSegments = 1;
  let recommendedModel = segment.model;
  let reason = 'Model is suitable for this segment';

  if (!model) {
    return {
      recommended_model: 'wan-2.5-i2v',
      reason: 'Selected model not found, using default',
      requires_split: false,
      warnings: ['Unknown model selected'],
      fallback_models: ['wan-2.5-i2v', 'stable-video-diffusion'],
    };
  }

  // Check duration limits
  if (segment.duration_sec > model.max_duration) {
    requiresSplit = true;
    suggestedSegments = Math.ceil(segment.duration_sec / model.max_duration);
    warnings.push(`Duration ${segment.duration_sec}s exceeds model limit of ${model.max_duration}s`);
    reason = `Segment needs to be split into ${suggestedSegments} parts`;
  }

  if (segment.duration_sec < model.min_duration) {
    warnings.push(`Duration ${segment.duration_sec}s is below model minimum of ${model.min_duration}s`);
  }

  // Check frame constraint support for middle segments
  if (prevSegment && nextSegment) {
    // This is a middle segment - needs both first and last frame support
    if (!model.supports_last_frame) {
      warnings.push('Model does not support last-frame constraint for middle segment editing');
      // Find fallback models that support both
      const fallbacks = Object.values(MODEL_CAPABILITY_REGISTRY).filter(
        m => m.supports_first_frame && m.supports_last_frame && m.is_available
      );
      fallbackModels.push(...fallbacks.map(m => m.model_id));
      if (fallbacks.length > 0) {
        recommendedModel = fallbacks[0].model_id;
        reason = 'Switched to model with full frame constraint support';
      }
    }
  }

  // Check if model is available
  if (!model.is_available) {
    warnings.push('Selected model is currently unavailable');
    const available = Object.values(MODEL_CAPABILITY_REGISTRY).find(
      m => m.is_available && m.quality_score >= model.quality_score - 2
    );
    if (available) {
      recommendedModel = available.model_id;
      reason = 'Switched to available model with similar quality';
    }
  }

  return {
    recommended_model: recommendedModel,
    reason,
    requires_split: requiresSplit,
    suggested_segments: requiresSplit ? suggestedSegments : undefined,
    warnings,
    fallback_models: fallbackModels,
  };
}

// Auto-split segment based on model limits
export function autoSplitSegment(segment: TimelineSegment): TimelineSegment[] {
  const model = MODEL_CAPABILITY_REGISTRY[segment.model];
  if (!model || segment.duration_sec <= model.max_duration) {
    return [segment];
  }

  const numSegments = Math.ceil(segment.duration_sec / model.max_duration);
  const durationPerSegment = segment.duration_sec / numSegments;
  const segments: TimelineSegment[] = [];

  for (let i = 0; i < numSegments; i++) {
    segments.push({
      ...segment,
      segment_id: segment.segment_id + i,
      duration_sec: Math.round(durationPerSegment * 10) / 10,
      prompt: `${segment.prompt} (Part ${i + 1}/${numSegments})`,
      first_frame: i === 0 ? segment.first_frame : null,
      last_frame: i === numSegments - 1 ? segment.last_frame : null,
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }

  return segments;
}

// Main hook for timeline management
export function useVideoTimeline() {
  const [timeline, setTimeline] = useState<VideoTimeline | null>(null);
  const [savedTimelines, setSavedTimelines] = useState<VideoTimeline[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load timelines from storage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(TIMELINES_STORAGE_KEY);
      if (stored) {
        setSavedTimelines(JSON.parse(stored));
      }

      const currentId = localStorage.getItem(CURRENT_TIMELINE_KEY);
      if (currentId && stored) {
        const timelines = JSON.parse(stored);
        const current = timelines.find((t: VideoTimeline) => t.timeline_id === currentId);
        if (current) {
          setTimeline(current);
        }
      }
    } catch (err) {
      console.error('Failed to load timelines:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save timelines to storage
  const saveToStorage = useCallback((timelines: VideoTimeline[], currentId?: string) => {
    try {
      localStorage.setItem(TIMELINES_STORAGE_KEY, JSON.stringify(timelines));
      if (currentId) {
        localStorage.setItem(CURRENT_TIMELINE_KEY, currentId);
      }
    } catch (err) {
      console.error('Failed to save timelines:', err);
      setError('Failed to save timeline');
    }
  }, []);

  // Create new timeline
  const createTimeline = useCallback((name?: string) => {
    const newTimeline = createEmptyTimeline(name);
    setTimeline(newTimeline);
    setSavedTimelines(prev => {
      const updated = [...prev, newTimeline];
      saveToStorage(updated, newTimeline.timeline_id);
      return updated;
    });
    return newTimeline;
  }, [saveToStorage]);

  // Load existing timeline
  const loadTimeline = useCallback((timelineId: string) => {
    const found = savedTimelines.find(t => t.timeline_id === timelineId);
    if (found) {
      setTimeline(found);
      localStorage.setItem(CURRENT_TIMELINE_KEY, timelineId);
    }
    return found;
  }, [savedTimelines]);

  // Save current timeline
  const saveTimeline = useCallback(() => {
    if (!timeline) return;
    
    setIsSaving(true);
    const updated = {
      ...timeline,
      updated_at: new Date().toISOString(),
      total_duration_sec: calculateTotalDuration(timeline.segments),
    };
    
    setTimeline(updated);
    setSavedTimelines(prev => {
      const idx = prev.findIndex(t => t.timeline_id === updated.timeline_id);
      const newList = idx >= 0 
        ? [...prev.slice(0, idx), updated, ...prev.slice(idx + 1)]
        : [...prev, updated];
      saveToStorage(newList, updated.timeline_id);
      return newList;
    });
    setIsSaving(false);
  }, [timeline, saveToStorage]);

  // Delete timeline
  const deleteTimeline = useCallback((timelineId: string) => {
    setSavedTimelines(prev => {
      const updated = prev.filter(t => t.timeline_id !== timelineId);
      saveToStorage(updated);
      return updated;
    });
    if (timeline?.timeline_id === timelineId) {
      setTimeline(null);
      localStorage.removeItem(CURRENT_TIMELINE_KEY);
    }
  }, [timeline, saveToStorage]);

  // Update timeline properties
  const updateTimelineProps = useCallback((props: Partial<VideoTimeline>) => {
    if (!timeline) return;
    setTimeline(prev => prev ? { ...prev, ...props, updated_at: new Date().toISOString() } : null);
  }, [timeline]);

  // Add segment
  const addSegment = useCallback((afterSegmentId?: number) => {
    if (!timeline) return;

    const newId = Math.max(...timeline.segments.map(s => s.segment_id), 0) + 1;
    const newSegment = createEmptySegment(newId);
    
    setTimeline(prev => {
      if (!prev) return null;
      
      let segments: TimelineSegment[];
      if (afterSegmentId !== undefined) {
        const idx = prev.segments.findIndex(s => s.segment_id === afterSegmentId);
        segments = [
          ...prev.segments.slice(0, idx + 1),
          newSegment,
          ...prev.segments.slice(idx + 1),
        ];
      } else {
        segments = [...prev.segments, newSegment];
      }

      return {
        ...prev,
        segments,
        total_duration_sec: calculateTotalDuration(segments),
        updated_at: new Date().toISOString(),
      };
    });

    return newSegment;
  }, [timeline]);

  // Remove segment
  const removeSegment = useCallback((segmentId: number) => {
    if (!timeline || timeline.segments.length <= 1) return;

    setTimeline(prev => {
      if (!prev) return null;
      const segments = prev.segments.filter(s => s.segment_id !== segmentId);
      return {
        ...prev,
        segments,
        total_duration_sec: calculateTotalDuration(segments),
        updated_at: new Date().toISOString(),
      };
    });
  }, [timeline]);

  // Update segment
  const updateSegment = useCallback((segmentId: number, updates: Partial<TimelineSegment>) => {
    if (!timeline) return;

    setTimeline(prev => {
      if (!prev) return null;
      const segments = prev.segments.map(s => 
        s.segment_id === segmentId 
          ? { ...s, ...updates, updated_at: new Date().toISOString(), status: 'modified' as SegmentStatus }
          : s
      );
      return {
        ...prev,
        segments,
        total_duration_sec: calculateTotalDuration(segments),
        updated_at: new Date().toISOString(),
      };
    });
  }, [timeline]);

  // Duplicate segment
  const duplicateSegment = useCallback((segmentId: number) => {
    if (!timeline) return;

    const segment = timeline.segments.find(s => s.segment_id === segmentId);
    if (!segment) return;

    const newId = Math.max(...timeline.segments.map(s => s.segment_id), 0) + 1;
    const duplicated: TimelineSegment = {
      ...segment,
      segment_id: newId,
      status: 'pending',
      generated_video_url: undefined,
      thumbnail_url: undefined,
      first_frame: null,
      last_frame: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    setTimeline(prev => {
      if (!prev) return null;
      const idx = prev.segments.findIndex(s => s.segment_id === segmentId);
      const segments = [
        ...prev.segments.slice(0, idx + 1),
        duplicated,
        ...prev.segments.slice(idx + 1),
      ];
      return {
        ...prev,
        segments,
        total_duration_sec: calculateTotalDuration(segments),
        updated_at: new Date().toISOString(),
      };
    });

    return duplicated;
  }, [timeline]);

  // Reorder segments
  const reorderSegments = useCallback((fromIndex: number, toIndex: number) => {
    if (!timeline) return;

    setTimeline(prev => {
      if (!prev) return null;
      const segments = [...prev.segments];
      const [removed] = segments.splice(fromIndex, 1);
      segments.splice(toIndex, 0, removed);
      return {
        ...prev,
        segments,
        updated_at: new Date().toISOString(),
      };
    });
  }, [timeline]);

  // Set segment status
  const setSegmentStatus = useCallback((segmentId: number, status: SegmentStatus, errorMessage?: string) => {
    if (!timeline) return;

    setTimeline(prev => {
      if (!prev) return null;
      const segments = prev.segments.map(s => 
        s.segment_id === segmentId 
          ? { ...s, status, error_message: errorMessage, updated_at: new Date().toISOString() }
          : s
      );
      return { ...prev, segments };
    });
  }, [timeline]);

  // Set segment video result
  const setSegmentResult = useCallback((
    segmentId: number, 
    videoUrl: string, 
    thumbnailUrl?: string, 
    lastFrame?: string
  ) => {
    if (!timeline) return;

    setTimeline(prev => {
      if (!prev) return null;
      const segments = prev.segments.map(s => 
        s.segment_id === segmentId 
          ? { 
              ...s, 
              status: 'generated' as SegmentStatus, 
              generated_video_url: videoUrl,
              thumbnail_url: thumbnailUrl,
              last_frame: lastFrame || s.last_frame,
              updated_at: new Date().toISOString() 
            }
          : s
      );
      return { ...prev, segments };
    });
  }, [timeline]);

  // Export timeline as JSON
  const exportTimeline = useCallback(() => {
    if (!timeline) return null;
    return JSON.stringify(timeline, null, 2);
  }, [timeline]);

  // Import timeline from JSON string
  const importTimeline = useCallback((jsonString: string) => {
    try {
      const imported = JSON.parse(jsonString) as VideoTimeline;
      imported.timeline_id = nanoid(12); // Generate new ID
      imported.created_at = new Date().toISOString();
      imported.updated_at = new Date().toISOString();
      
      setTimeline(imported);
      setSavedTimelines(prev => {
        const updated = [...prev, imported];
        saveToStorage(updated, imported.timeline_id);
        return updated;
      });
      
      return imported;
    } catch (err) {
      setError('Failed to import timeline: Invalid JSON');
      return null;
    }
  }, [saveToStorage]);

  // Load timeline from scenario generation (object, not JSON string)
  const loadFromScenario = useCallback((generatedTimeline: any) => {
    try {
      console.log('Loading timeline from scenario:', generatedTimeline);
      
      // Transform the generated timeline format to our internal format
      const newTimeline: VideoTimeline = {
        timeline_id: generatedTimeline.timeline_id || nanoid(12),
        name: generatedTimeline.name || 'AI Generated Timeline',
        description: generatedTimeline.description || '',
        version: '1.0',
        segments: (generatedTimeline.segments || []).map((seg: any, idx: number) => ({
          segment_id: seg.segment_id || idx + 1,
          duration_sec: seg.duration_sec || 5,
          model: seg.model_id || seg.model || 'kling-2.5-pro',
          prompt: seg.prompt_text || seg.prompt || '',
          negative_prompt: seg.negative_prompt || '',
          first_frame: seg.first_frame_url || null,
          last_frame: seg.last_frame_url || null,
          status: 'pending' as SegmentStatus,
          transition: (seg.transition_type || seg.transition || 'fade') as TransitionType,
          motion_profile: (seg.motion_profile || 'smooth') as MotionProfile,
          camera_path: (seg.camera_path || 'static') as CameraPath,
          priority: (seg.priority || 'standard') as RenderPriority,
          style_preset: seg.style_preset,
          aspect_ratio: seg.aspect_ratio,
          resolution: seg.resolution,
          scene_description: seg.scene_description,
          character_refs: seg.character_refs,
          style_refs: seg.style_refs,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })),
        total_duration_sec: generatedTimeline.total_duration_sec || 0,
        target_resolution: generatedTimeline.target_resolution || '1080p',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_template: false,
        tags: [],
        scenario_id: generatedTimeline.scenario_id,
      };
      
      // Recalculate total duration
      newTimeline.total_duration_sec = calculateTotalDuration(newTimeline.segments);
      
      console.log('Transformed timeline:', newTimeline);
      
      setTimeline(newTimeline);
      setSavedTimelines(prev => {
        const updated = [...prev, newTimeline];
        saveToStorage(updated, newTimeline.timeline_id);
        return updated;
      });
      
      return newTimeline;
    } catch (err) {
      console.error('Failed to load timeline from scenario:', err);
      setError('Failed to load generated timeline');
      return null;
    }
  }, [saveToStorage]);

  // Get segment by ID
  const getSegment = useCallback((segmentId: number) => {
    return timeline?.segments.find(s => s.segment_id === segmentId);
  }, [timeline]);

  // Get adjacent segments
  const getAdjacentSegments = useCallback((segmentId: number) => {
    if (!timeline) return { prev: undefined, next: undefined };
    const idx = timeline.segments.findIndex(s => s.segment_id === segmentId);
    return {
      prev: idx > 0 ? timeline.segments[idx - 1] : undefined,
      next: idx < timeline.segments.length - 1 ? timeline.segments[idx + 1] : undefined,
    };
  }, [timeline]);

  return {
    // State
    timeline,
    savedTimelines,
    isLoading,
    isSaving,
    error,
    
    // Timeline operations
    createTimeline,
    loadTimeline,
    saveTimeline,
    deleteTimeline,
    updateTimelineProps,
    exportTimeline,
    importTimeline,
    loadFromScenario, // Load timeline from scenario generation
    
    // Segment operations
    addSegment,
    removeSegment,
    updateSegment,
    duplicateSegment,
    reorderSegments,
    setSegmentStatus,
    setSegmentResult,
    getSegment,
    getAdjacentSegments,
    
    // Utilities
    getRoutingDecision,
    autoSplitSegment,
  };
}

export default useVideoTimeline;
