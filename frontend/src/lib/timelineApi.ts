/**
 * Timeline API Client
 * Frontend client for the Long Video Timeline System
 */

import axios from 'axios';

// API Base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Create axios instance
const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth header interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ==================== TYPES ====================

export interface Timeline {
  id: string;
  user_id: string;
  name: string;
  description: string;
  version: string;
  target_resolution: string;
  global_style: string | null;
  total_duration_sec: number;
  created_at: string;
  updated_at: string;
  segments?: Segment[];
  segment_count?: number;
}

export interface Segment {
  id: string;
  timeline_id: string;
  position: number;
  duration_sec: number;
  model_id: string;
  prompt: string;
  negative_prompt: string | null;
  transition: string;
  motion_profile: string;
  camera_path: string;
  style_preset: string | null;
  seed: number | null;
  status: 'pending' | 'generating' | 'generated' | 'modified' | 'error';
  preview_video_url: string | null;
  final_video_url: string | null;
  thumbnail_url: string | null;
  first_frame_url: string | null;
  last_frame_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  user_id: string;
  timeline_id: string;
  type: 'preview' | 'render';
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  current_segment: number;
  total_segments: number;
  output_video_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoModel {
  id: string;
  display_name: string;
  provider: string;
  max_duration_sec: number;
  min_duration_sec: number;
  supports_first_frame: boolean;
  supports_last_frame: boolean;
  supports_negative_prompt: boolean;
  resolution: string;
  priority: 'preview' | 'budget' | 'standard' | 'high';
  cost_per_second: number;
  quality_score: number;
  is_preview_model: boolean;
  is_active: boolean;
}

export interface CreateTimelineRequest {
  name: string;
  description?: string;
  target_resolution?: string;
  global_style?: string;
}

export interface CreateSegmentRequest {
  duration_sec?: number;
  model?: string;
  model_id?: string;
  prompt?: string;
  negative_prompt?: string;
  transition?: string;
  motion_profile?: string;
  camera_path?: string;
  style_preset?: string;
  seed?: number;
  position?: number;
  first_frame_url?: string;
}

export interface UpdateSegmentRequest {
  duration_sec?: number;
  model_id?: string;
  prompt?: string;
  negative_prompt?: string;
  transition?: string;
  motion_profile?: string;
  camera_path?: string;
  style_preset?: string;
  seed?: number;
  first_frame_url?: string;
}

export interface GenerateJobRequest {
  quality?: 'low' | 'medium' | 'high';
  resolution?: '360p' | '480p' | '720p' | '1080p';
}

// ==================== TIMELINE API ====================

export const timelineApi = {
  // List all timelines
  async listTimelines(): Promise<Timeline[]> {
    const response = await api.get('/timelines');
    return response.data.data || [];
  },

  // Create a new timeline
  async createTimeline(data: CreateTimelineRequest): Promise<Timeline> {
    const response = await api.post('/timelines', data);
    return response.data.data;
  },

  // Get a timeline with segments
  async getTimeline(timelineId: string): Promise<Timeline> {
    const response = await api.get(`/timelines/${timelineId}`);
    return response.data.data;
  },

  // Update a timeline
  async updateTimeline(timelineId: string, data: Partial<CreateTimelineRequest>): Promise<void> {
    await api.put(`/timelines/${timelineId}`, data);
  },

  // Delete a timeline
  async deleteTimeline(timelineId: string): Promise<void> {
    await api.delete(`/timelines/${timelineId}`);
  },

  // ==================== SEGMENT API ====================

  // Add a segment to timeline
  async addSegment(timelineId: string, data: CreateSegmentRequest): Promise<Segment> {
    const response = await api.post(`/timelines/${timelineId}/segments`, data);
    return response.data.data;
  },

  // Update a segment
  async updateSegment(timelineId: string, segmentId: string, data: UpdateSegmentRequest): Promise<void> {
    await api.put(`/timelines/${timelineId}/segments/${segmentId}`, data);
  },

  // Reorder segments
  async reorderSegments(timelineId: string, order: string[]): Promise<void> {
    await api.patch(`/timelines/${timelineId}/segments/reorder`, { order });
  },

  // Delete a segment
  async deleteSegment(timelineId: string, segmentId: string): Promise<void> {
    await api.delete(`/timelines/${timelineId}/segments/${segmentId}`);
  },

  // ==================== JOB API ====================

  // Start preview generation
  async startPreview(timelineId: string, options?: GenerateJobRequest): Promise<{ job_id: string; status: string }> {
    const response = await api.post(`/timelines/${timelineId}/preview`, options || {});
    return response.data.data;
  },

  // Start final render
  async startRender(timelineId: string, options?: GenerateJobRequest): Promise<{ job_id: string; status: string }> {
    const response = await api.post(`/timelines/${timelineId}/render`, options || {});
    return response.data.data;
  },

  // Get job status
  async getJobStatus(jobId: string): Promise<Job> {
    const response = await api.get(`/jobs/${jobId}`);
    return response.data.data;
  },

  // List jobs
  async listJobs(timelineId?: string): Promise<Job[]> {
    const params = timelineId ? { timeline_id: timelineId } : {};
    const response = await api.get('/jobs', { params });
    return response.data.data || [];
  },

  // Poll job until complete
  async pollJobUntilComplete(
    jobId: string,
    onProgress?: (job: Job) => void,
    intervalMs: number = 2000,
    maxAttempts: number = 300
  ): Promise<Job> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const job = await this.getJobStatus(jobId);
      onProgress?.(job);
      
      if (job.status === 'completed' || job.status === 'failed') {
        return job;
      }
      
      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    
    throw new Error('Job polling timeout');
  },

  // ==================== MODEL API ====================

  // List available models
  async listModels(): Promise<VideoModel[]> {
    const response = await api.get('/models');
    return response.data.data || [];
  },

  // Get model details
  async getModel(modelId: string): Promise<VideoModel> {
    const response = await api.get(`/models/${modelId}`);
    return response.data.data;
  },
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Get recommended model based on requirements
 */
export function getRecommendedModel(
  models: VideoModel[],
  requirements: {
    needsFirstFrame?: boolean;
    needsLastFrame?: boolean;
    minDuration?: number;
    maxDuration?: number;
    preferPreview?: boolean;
    preferHighQuality?: boolean;
  }
): VideoModel | null {
  let filtered = models.filter(m => m.is_active);

  if (requirements.needsFirstFrame) {
    filtered = filtered.filter(m => m.supports_first_frame);
  }

  if (requirements.needsLastFrame) {
    filtered = filtered.filter(m => m.supports_last_frame);
  }

  if (requirements.minDuration) {
    filtered = filtered.filter(m => m.max_duration_sec >= requirements.minDuration!);
  }

  if (requirements.maxDuration) {
    filtered = filtered.filter(m => m.min_duration_sec <= requirements.maxDuration!);
  }

  if (requirements.preferPreview) {
    const preview = filtered.filter(m => m.is_preview_model);
    if (preview.length > 0) filtered = preview;
  }

  if (requirements.preferHighQuality) {
    const highQuality = filtered.filter(m => m.priority === 'high');
    if (highQuality.length > 0) filtered = highQuality;
  }

  // Sort by quality score
  filtered.sort((a, b) => b.quality_score - a.quality_score);

  return filtered[0] || null;
}

/**
 * Calculate estimated cost for a timeline
 */
export function estimateTimelineCost(timeline: Timeline, models: VideoModel[]): number {
  if (!timeline.segments) return 0;

  return timeline.segments.reduce((total, segment) => {
    const model = models.find(m => m.id === segment.model_id);
    const costPerSecond = model?.cost_per_second || 2;
    return total + (segment.duration_sec * costPerSecond);
  }, 0);
}

/**
 * Validate timeline before generation
 */
export function validateTimeline(timeline: Timeline): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!timeline.segments || timeline.segments.length === 0) {
    errors.push('Timeline must have at least one segment');
  }

  timeline.segments?.forEach((segment, idx) => {
    if (!segment.prompt || segment.prompt.trim().length < 5) {
      errors.push(`Segment ${idx + 1}: Prompt is too short or missing`);
    }

    if (segment.duration_sec < 1) {
      errors.push(`Segment ${idx + 1}: Duration must be at least 1 second`);
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

export default timelineApi;
