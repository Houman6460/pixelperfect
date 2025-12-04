/**
 * Video Generation Service
 * Handles frame-chaining, model routing, and video generation
 */

import {
  VideoTimeline,
  TimelineSegment,
  MODEL_CAPABILITY_REGISTRY,
  ModelCapability,
  RoutingDecision,
  GenerateSegmentRequest,
  GenerateSegmentResponse,
  FrameExtractionResult,
  RenderJob,
  ConsistencyCheckResult,
} from '../types/videoTimeline';

// Backend API base URL
const API_BASE = import.meta.env.VITE_API_URL || 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';

/**
 * Frame Chaining Engine
 * Handles extraction and linking of frames between segments
 */
export class FrameChainingEngine {
  /**
   * Extract last frame from a video
   */
  static async extractLastFrame(videoUrl: string): Promise<FrameExtractionResult> {
    try {
      // Create video element to extract frame
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      // Seek to last frame
      video.currentTime = video.duration - 0.1;
      
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      // Extract frame to canvas
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const frameData = canvas.toDataURL('image/png');

      return {
        success: true,
        frame_data: frameData,
        frame_index: -1, // Last frame
        timestamp_ms: video.duration * 1000,
        resolution: `${video.videoWidth}x${video.videoHeight}`,
        enhanced: false,
      };
    } catch (error) {
      console.error('Failed to extract last frame:', error);
      return {
        success: false,
        frame_data: '',
        frame_index: -1,
        timestamp_ms: 0,
        resolution: '',
        enhanced: false,
      };
    }
  }

  /**
   * Extract first frame from a video
   */
  static async extractFirstFrame(videoUrl: string): Promise<FrameExtractionResult> {
    try {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.src = videoUrl;
      
      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      video.currentTime = 0.1;
      
      await new Promise((resolve) => {
        video.onseeked = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);

      const frameData = canvas.toDataURL('image/png');

      return {
        success: true,
        frame_data: frameData,
        frame_index: 0,
        timestamp_ms: 100,
        resolution: `${video.videoWidth}x${video.videoHeight}`,
        enhanced: false,
      };
    } catch (error) {
      console.error('Failed to extract first frame:', error);
      return {
        success: false,
        frame_data: '',
        frame_index: 0,
        timestamp_ms: 0,
        resolution: '',
        enhanced: false,
      };
    }
  }

  /**
   * Chain frames between segments
   * Returns updated segments with linked frames
   */
  static async chainSegments(segments: TimelineSegment[]): Promise<TimelineSegment[]> {
    const chainedSegments = [...segments];

    for (let i = 0; i < chainedSegments.length - 1; i++) {
      const currentSegment = chainedSegments[i];
      const nextSegment = chainedSegments[i + 1];

      // If current segment has a generated video, extract last frame for next segment
      if (currentSegment.generated_video_url && currentSegment.status === 'generated') {
        const lastFrame = await this.extractLastFrame(currentSegment.generated_video_url);
        if (lastFrame.success) {
          chainedSegments[i] = { ...currentSegment, last_frame: lastFrame.frame_data };
          chainedSegments[i + 1] = { ...nextSegment, first_frame: lastFrame.frame_data };
        }
      }
    }

    return chainedSegments;
  }
}

/**
 * Backend Routing Engine
 * Handles model selection, fallback, and request routing
 */
export class BackendRoutingEngine {
  /**
   * Get the best model for a segment based on requirements
   */
  static getRoutingDecision(
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

    // Check for middle segment (needs both first and last frame support)
    if (prevSegment && nextSegment) {
      if (!model.supports_last_frame) {
        warnings.push('Model does not support last-frame constraint for middle segment editing');
        
        // Find models that support both frame constraints
        const compatibleModels = Object.values(MODEL_CAPABILITY_REGISTRY).filter(
          m => m.supports_first_frame && m.supports_last_frame && m.is_available
        );
        
        fallbackModels.push(...compatibleModels.map(m => m.model_id));
        
        if (compatibleModels.length > 0) {
          // Sort by quality score
          compatibleModels.sort((a, b) => b.quality_score - a.quality_score);
          recommendedModel = compatibleModels[0].model_id;
          reason = `Switched to ${compatibleModels[0].display_name} for full frame constraint support`;
        }
      }
    }

    // Check if first segment needs first_frame support
    if (!prevSegment && segment.first_frame && !model.supports_first_frame) {
      warnings.push('Model does not support first-frame input');
      const compatibleModels = Object.values(MODEL_CAPABILITY_REGISTRY).filter(
        m => m.supports_first_frame && m.is_available
      );
      fallbackModels.push(...compatibleModels.map(m => m.model_id));
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

  /**
   * Auto-split a segment based on model duration limits
   */
  static autoSplitSegment(segment: TimelineSegment): TimelineSegment[] {
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
        segment_id: segment.segment_id * 100 + i, // Generate unique IDs
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

  /**
   * Select fallback model for middle-frame reconstruction
   */
  static selectFallbackModel(originalModelId: string, requiresLastFrame: boolean): string {
    const fallbackPriority = [
      'kling-2.5-i2v-pro',
      'luma-dream-machine',
      'wan-2.5-i2v',
      'runway-gen3',
    ];

    for (const modelId of fallbackPriority) {
      const model = MODEL_CAPABILITY_REGISTRY[modelId];
      if (model && model.is_available) {
        if (!requiresLastFrame || model.supports_last_frame) {
          return modelId;
        }
      }
    }

    return originalModelId; // No suitable fallback found
  }
}

/**
 * Video Generation Service
 * Main service for generating video segments
 */
export class VideoGenerationService {
  private static authToken: string | null = null;

  static setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Generate a single video segment
   */
  static async generateSegment(
    segment: TimelineSegment,
    options: {
      usePreviewModel?: boolean;
      useFallback?: boolean;
    } = {}
  ): Promise<GenerateSegmentResponse> {
    const startTime = Date.now();
    
    try {
      const model = MODEL_CAPABILITY_REGISTRY[segment.model];
      if (!model) {
        throw new Error(`Unknown model: ${segment.model}`);
      }

      // Select model based on options
      let selectedModel = segment.model;
      if (options.usePreviewModel) {
        selectedModel = 'animatediff-lightning';
      } else if (options.useFallback) {
        selectedModel = BackendRoutingEngine.selectFallbackModel(segment.model, !!segment.last_frame);
      }

      // Prepare request payload
      const payload = {
        prompt: segment.prompt,
        negative_prompt: segment.negative_prompt,
        model: selectedModel,
        duration: segment.duration_sec,
        first_frame: segment.first_frame,
        last_frame: segment.last_frame,
        motion_profile: segment.motion_profile,
        camera_path: segment.camera_path,
        style_preset: segment.style_preset,
        seed: segment.seed,
      };

      // Call backend API
      const response = await fetch(`${API_BASE}/api/video/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.authToken ? { Authorization: `Bearer ${this.authToken}` } : {}),
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Generation failed');
      }

      const result = await response.json();
      
      return {
        success: true,
        segment_id: segment.segment_id,
        video_url: result.video_url,
        thumbnail_url: result.thumbnail_url,
        last_frame: result.last_frame,
        duration_actual: result.duration,
        model_used: selectedModel,
        generation_time_ms: Date.now() - startTime,
        tokens_used: result.tokens_used || 0,
      };
    } catch (error) {
      console.error('Segment generation failed:', error);
      return {
        success: false,
        segment_id: segment.segment_id,
        model_used: segment.model,
        generation_time_ms: Date.now() - startTime,
        tokens_used: 0,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate all segments in a timeline with frame chaining
   */
  static async generateTimeline(
    timeline: VideoTimeline,
    onProgress?: (segmentId: number, progress: number) => void,
    onSegmentComplete?: (segmentId: number, result: GenerateSegmentResponse) => void
  ): Promise<{
    success: boolean;
    results: GenerateSegmentResponse[];
    total_time_ms: number;
    total_tokens: number;
  }> {
    const startTime = Date.now();
    const results: GenerateSegmentResponse[] = [];
    let totalTokens = 0;

    // Process segments sequentially for frame chaining
    for (let i = 0; i < timeline.segments.length; i++) {
      const segment = timeline.segments[i];
      const prevSegment = i > 0 ? timeline.segments[i - 1] : undefined;
      
      // If previous segment was generated, use its last frame
      if (prevSegment && results[i - 1]?.success && results[i - 1]?.last_frame) {
        segment.first_frame = results[i - 1].last_frame!;
      }

      // Report progress
      onProgress?.(segment.segment_id, 0);

      // Generate segment
      const result = await this.generateSegment(segment);
      results.push(result);
      totalTokens += result.tokens_used;

      // Report completion
      onProgress?.(segment.segment_id, 100);
      onSegmentComplete?.(segment.segment_id, result);

      if (!result.success) {
        console.warn(`Segment ${segment.segment_id} failed, continuing with remaining segments`);
      }
    }

    return {
      success: results.every(r => r.success),
      results,
      total_time_ms: Date.now() - startTime,
      total_tokens: totalTokens,
    };
  }

  /**
   * Generate preview for all segments (using fast models)
   */
  static async generatePreview(
    timeline: VideoTimeline,
    onProgress?: (segmentId: number, progress: number) => void
  ): Promise<GenerateSegmentResponse[]> {
    const results: GenerateSegmentResponse[] = [];

    for (const segment of timeline.segments) {
      onProgress?.(segment.segment_id, 0);
      const result = await this.generateSegment(segment, { usePreviewModel: true });
      results.push(result);
      onProgress?.(segment.segment_id, 100);
    }

    return results;
  }
}

/**
 * Story Consistency Checker
 * Uses LLM to analyze timeline prompts for consistency
 */
export class StoryConsistencyChecker {
  /**
   * Check timeline prompts for consistency issues
   */
  static async checkConsistency(timeline: VideoTimeline): Promise<ConsistencyCheckResult> {
    const issues: ConsistencyCheckResult['issues'] = [];
    let overallScore = 100;

    // Simple heuristic checks (in production, this would use an LLM)
    const prompts = timeline.segments.map(s => s.prompt.toLowerCase());

    // Check for character consistency
    const characters = new Set<string>();
    prompts.forEach((prompt, idx) => {
      const characterMatches = prompt.match(/\b(man|woman|person|character|hero|protagonist)\b/g);
      if (characterMatches) {
        characterMatches.forEach(c => characters.add(c));
      }
    });

    if (characters.size > 3) {
      issues.push({
        segment_id: 0,
        issue_type: 'character_mismatch',
        description: 'Multiple different character descriptions detected across segments',
        severity: 'medium',
        suggestion: 'Consider using consistent character descriptions throughout',
      });
      overallScore -= 10;
    }

    // Check for lighting consistency
    const lightingTerms = ['day', 'night', 'sunset', 'sunrise', 'dark', 'bright', 'sunny'];
    const lightingMentions = prompts.map(p => lightingTerms.filter(t => p.includes(t)));
    const hasInconsistentLighting = lightingMentions.some((terms, idx) => {
      if (idx === 0) return false;
      const prevTerms = lightingMentions[idx - 1];
      return terms.some(t => 
        (t === 'day' && prevTerms.includes('night')) ||
        (t === 'night' && prevTerms.includes('day'))
      );
    });

    if (hasInconsistentLighting) {
      issues.push({
        segment_id: 0,
        issue_type: 'lighting_inconsistency',
        description: 'Sudden lighting changes detected between segments',
        severity: 'high',
        suggestion: 'Add transition segments or adjust lighting descriptions',
      });
      overallScore -= 20;
    }

    // Check for empty prompts
    timeline.segments.forEach((segment, idx) => {
      if (!segment.prompt || segment.prompt.trim().length < 10) {
        issues.push({
          segment_id: segment.segment_id,
          issue_type: 'temporal_gap',
          description: `Segment ${idx + 1} has an empty or very short prompt`,
          severity: 'high',
          suggestion: 'Add a detailed description for better results',
        });
        overallScore -= 15;
      }
    });

    return {
      is_consistent: issues.length === 0,
      issues,
      overall_score: Math.max(0, overallScore),
    };
  }
}

/**
 * Render Job Manager
 * Manages final video rendering with transitions
 */
export class RenderJobManager {
  private static jobs: Map<string, RenderJob> = new Map();

  /**
   * Create a new render job
   */
  static createJob(timeline: VideoTimeline): RenderJob {
    const job: RenderJob = {
      job_id: `render_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timeline_id: timeline.timeline_id,
      status: 'queued',
      progress_percent: 0,
      current_segment: 0,
      total_segments: timeline.segments.length,
      started_at: new Date().toISOString(),
    };

    this.jobs.set(job.job_id, job);
    return job;
  }

  /**
   * Get job status
   */
  static getJob(jobId: string): RenderJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update job progress
   */
  static updateJob(jobId: string, updates: Partial<RenderJob>): void {
    const job = this.jobs.get(jobId);
    if (job) {
      this.jobs.set(jobId, { ...job, ...updates });
    }
  }

  /**
   * Start rendering a timeline
   */
  static async startRender(
    timeline: VideoTimeline,
    onProgress?: (job: RenderJob) => void
  ): Promise<RenderJob> {
    const job = this.createJob(timeline);
    this.updateJob(job.job_id, { status: 'processing' });

    try {
      // TODO: Implement actual rendering with transitions
      // This would combine all segment videos with the specified transitions
      
      for (let i = 0; i < timeline.segments.length; i++) {
        this.updateJob(job.job_id, {
          current_segment: i + 1,
          progress_percent: Math.round(((i + 1) / timeline.segments.length) * 100),
        });
        onProgress?.(this.getJob(job.job_id)!);
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      this.updateJob(job.job_id, {
        status: 'completed',
        progress_percent: 100,
        completed_at: new Date().toISOString(),
        output_url: `https://example.com/rendered/${job.job_id}.mp4`,
      });

    } catch (error) {
      this.updateJob(job.job_id, {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    return this.getJob(job.job_id)!;
  }
}

export default {
  FrameChainingEngine,
  BackendRoutingEngine,
  VideoGenerationService,
  StoryConsistencyChecker,
  RenderJobManager,
};
