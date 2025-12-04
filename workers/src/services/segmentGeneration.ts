/**
 * Segment Generation Service
 * Handles multi-mode video generation with frame chaining
 */

import { Database, Storage, generateId, now } from '../db/index';
import { SegmentRepository } from '../db/repositories';

// ==================== TYPES ====================

export type GenerationMode = 
  | 'text-to-video'
  | 'image-to-video'
  | 'video-to-video'
  | 'first-frame-to-video';

export interface SegmentGenerationRequest {
  timelineId: string;
  userId: string;
  position: number;
  isFirstSegment: boolean;
  
  // Generation mode
  generationMode: GenerationMode;
  
  // Content based on mode
  promptText?: string;
  sourceImageUrl?: string; // For image-to-video or first-frame
  sourceVideoUrl?: string; // For video-to-video
  previousLastFrameUrl?: string; // For frame chaining
  
  // Settings
  modelId: string;
  durationSec: number;
  motionProfile?: string;
  cameraPath?: string;
  transitionType?: string;
}

export interface SegmentGenerationResult {
  segmentId: string;
  videoUrl: string;
  firstFrameUrl: string;
  lastFrameUrl: string;
  thumbnailUrl: string;
  generationTimeSec: number;
  success: boolean;
  error?: string;
}

export interface FrameExtractionResult {
  firstFrameUrl: string;
  lastFrameUrl: string;
}

// ==================== MODEL ROUTING ====================

/**
 * Get the appropriate model service based on generation mode
 */
export function getModelService(mode: GenerationMode, modelId: string): string {
  // Map generation modes to model endpoints
  const modeToEndpoint: Record<GenerationMode, string> = {
    'text-to-video': '/video/text-to-video',
    'image-to-video': '/video/image-to-video',
    'video-to-video': '/video/video-to-video',
    'first-frame-to-video': '/video/image-to-video', // Uses same as image-to-video
  };
  
  return modeToEndpoint[mode];
}

/**
 * Build request payload based on generation mode
 */
export function buildGenerationPayload(request: SegmentGenerationRequest): Record<string, unknown> {
  const basePayload = {
    model_id: request.modelId,
    duration: request.durationSec,
    motion_profile: request.motionProfile,
    camera_path: request.cameraPath,
  };

  switch (request.generationMode) {
    case 'text-to-video':
      return {
        ...basePayload,
        prompt: request.promptText,
      };
      
    case 'image-to-video':
      return {
        ...basePayload,
        prompt: request.promptText,
        image_url: request.isFirstSegment 
          ? request.sourceImageUrl 
          : request.previousLastFrameUrl,
      };
      
    case 'video-to-video':
      return {
        ...basePayload,
        prompt: request.promptText,
        video_url: request.sourceVideoUrl,
      };
      
    case 'first-frame-to-video':
      return {
        ...basePayload,
        prompt: request.promptText,
        image_url: request.sourceImageUrl,
        use_as_first_frame: true,
      };
      
    default:
      return basePayload;
  }
}

// ==================== FRAME EXTRACTION ====================

/**
 * Extract first and last frames from a video
 * In production, this would use FFmpeg or a video processing service
 */
export async function extractFrames(
  videoUrl: string,
  storage: Storage,
  userId: string,
  timelineId: string,
  segmentId: string
): Promise<FrameExtractionResult> {
  // In production:
  // 1. Download video from R2
  // 2. Use FFmpeg to extract first frame (0s) and last frame
  // 3. Upload frames to R2
  // 4. Return URLs
  
  // Placeholder implementation
  const firstFrameKey = Storage.generateKey('frames', userId, timelineId, `${segmentId}_first.jpg`);
  const lastFrameKey = Storage.generateKey('frames', userId, timelineId, `${segmentId}_last.jpg`);
  
  // Would actually extract and upload frames here
  const firstFrameUrl = storage.getPublicUrl(firstFrameKey);
  const lastFrameUrl = storage.getPublicUrl(lastFrameKey);
  
  return {
    firstFrameUrl,
    lastFrameUrl,
  };
}

// ==================== GENERATION SERVICE ====================

export class SegmentGenerationService {
  constructor(
    private db: Database,
    private storage: Storage,
    private segmentRepo: SegmentRepository
  ) {}

  /**
   * Generate a segment based on mode
   */
  async generateSegment(
    request: SegmentGenerationRequest,
    apiBaseUrl: string,
    authToken: string
  ): Promise<SegmentGenerationResult> {
    const startTime = Date.now();
    const segmentId = `segment-${generateId()}`;
    
    try {
      // 1. Create segment record with pending status
      await this.segmentRepo.create({
        timelineId: request.timelineId,
        position: request.position,
        durationSec: request.durationSec,
        modelId: request.modelId,
        promptText: request.promptText,
        motionProfile: request.motionProfile,
        cameraPath: request.cameraPath,
        transitionType: request.transitionType,
      });

      // 2. Update with generation mode and source
      await this.db.execute(
        `UPDATE segments SET 
          generation_mode = ?, 
          is_first_segment = ?,
          source_url = ?,
          status = 'generating',
          updated_at = ?
        WHERE id = ?`,
        [
          request.generationMode,
          request.isFirstSegment ? 1 : 0,
          request.sourceImageUrl || request.sourceVideoUrl || null,
          now(),
          segmentId,
        ]
      );

      // 3. Build and send generation request
      const endpoint = getModelService(request.generationMode, request.modelId);
      const payload = buildGenerationPayload(request);

      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Generation failed: ${response.status}`);
      }

      const result = await response.json() as { video_url: string };
      const videoUrl = result.video_url;

      // 4. Extract frames from generated video
      const frames = await extractFrames(
        videoUrl,
        this.storage,
        request.userId,
        request.timelineId,
        segmentId
      );

      // 5. Generate thumbnail
      const thumbnailUrl = frames.firstFrameUrl; // Use first frame as thumbnail

      // 6. Calculate generation time
      const generationTimeSec = (Date.now() - startTime) / 1000;

      // 7. Update segment with results
      await this.segmentRepo.update(segmentId, {
        videoUrl,
        firstFrameUrl: frames.firstFrameUrl,
        lastFrameUrl: frames.lastFrameUrl,
        thumbnailUrl,
        status: 'generated',
        generationTimeSec,
      });

      return {
        segmentId,
        videoUrl,
        firstFrameUrl: frames.firstFrameUrl,
        lastFrameUrl: frames.lastFrameUrl,
        thumbnailUrl,
        generationTimeSec,
        success: true,
      };

    } catch (error: any) {
      // Update segment with error
      await this.segmentRepo.update(segmentId, {
        status: 'error',
        errorMessage: error.message,
      });

      return {
        segmentId,
        videoUrl: '',
        firstFrameUrl: '',
        lastFrameUrl: '',
        thumbnailUrl: '',
        generationTimeSec: (Date.now() - startTime) / 1000,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate all segments in a timeline with frame chaining
   */
  async generateTimeline(
    timelineId: string,
    userId: string,
    segments: Array<{
      position: number;
      promptText: string;
      durationSec: number;
      modelId: string;
      motionProfile?: string;
      cameraPath?: string;
    }>,
    firstSegmentConfig: {
      generationMode: GenerationMode;
      sourceImageUrl?: string;
      sourceVideoUrl?: string;
    },
    apiBaseUrl: string,
    authToken: string
  ): Promise<SegmentGenerationResult[]> {
    const results: SegmentGenerationResult[] = [];
    let previousLastFrameUrl: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isFirstSegment = i === 0;

      const request: SegmentGenerationRequest = {
        timelineId,
        userId,
        position: seg.position,
        isFirstSegment,
        generationMode: isFirstSegment 
          ? firstSegmentConfig.generationMode 
          : 'image-to-video', // All subsequent segments use image-to-video
        promptText: seg.promptText,
        sourceImageUrl: isFirstSegment ? firstSegmentConfig.sourceImageUrl : undefined,
        sourceVideoUrl: isFirstSegment ? firstSegmentConfig.sourceVideoUrl : undefined,
        previousLastFrameUrl: previousLastFrameUrl || undefined,
        modelId: seg.modelId,
        durationSec: seg.durationSec,
        motionProfile: seg.motionProfile,
        cameraPath: seg.cameraPath,
      };

      const result = await this.generateSegment(request, apiBaseUrl, authToken);
      results.push(result);

      // Store last frame URL for next segment
      if (result.success) {
        previousLastFrameUrl = result.lastFrameUrl;
      } else {
        // If generation failed, stop the chain
        console.error(`Segment ${i} failed, stopping chain`);
        break;
      }
    }

    return results;
  }

  /**
   * Get the last frame URL of a segment for chaining
   */
  async getLastFrameUrl(segmentId: string): Promise<string | null> {
    const segment = await this.segmentRepo.getById(segmentId);
    return segment?.last_frame_url || null;
  }

  /**
   * Re-generate a specific segment
   */
  async regenerateSegment(
    segmentId: string,
    userId: string,
    newConfig?: {
      generationMode?: GenerationMode;
      sourceUrl?: string;
      promptText?: string;
    },
    apiBaseUrl: string = '',
    authToken: string = ''
  ): Promise<SegmentGenerationResult> {
    const segment = await this.segmentRepo.getById(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    // Get previous segment's last frame for chaining
    let previousLastFrameUrl: string | null = null;
    if (segment.position > 0) {
      const prevSegments = await this.segmentRepo.getByTimeline(segment.timeline_id);
      const prevSegment = prevSegments.find(s => s.position === segment.position - 1);
      if (prevSegment) {
        previousLastFrameUrl = prevSegment.last_frame_url;
      }
    }

    const request: SegmentGenerationRequest = {
      timelineId: segment.timeline_id,
      userId,
      position: segment.position,
      isFirstSegment: segment.is_first_segment === 1,
      generationMode: (newConfig?.generationMode || segment.generation_mode || 'image-to-video') as GenerationMode,
      promptText: newConfig?.promptText || segment.prompt_text || undefined,
      sourceImageUrl: newConfig?.sourceUrl || segment.source_url || undefined,
      previousLastFrameUrl: previousLastFrameUrl || undefined,
      modelId: segment.model_id,
      durationSec: segment.duration_sec,
      motionProfile: segment.motion_profile || undefined,
      cameraPath: segment.camera_path || undefined,
      transitionType: segment.transition_type || undefined,
    };

    return this.generateSegment(request, apiBaseUrl, authToken);
  }
}

// ==================== VALIDATION ====================

/**
 * Validate generation mode for a segment position
 */
export function validateGenerationMode(
  position: number,
  mode: GenerationMode
): { valid: boolean; error?: string } {
  // Only first segment (position 0) can use different modes
  if (position > 0 && mode !== 'image-to-video') {
    return {
      valid: false,
      error: 'Only the first segment can use text-to-video, video-to-video, or first-frame modes. Subsequent segments must use image-to-video with frame chaining.',
    };
  }

  return { valid: true };
}

/**
 * Get available generation modes for a segment position
 */
export function getAvailableModes(position: number): GenerationMode[] {
  if (position === 0) {
    return ['text-to-video', 'image-to-video', 'video-to-video', 'first-frame-to-video'];
  }
  return ['image-to-video'];
}

export default {
  SegmentGenerationService,
  getModelService,
  buildGenerationPayload,
  extractFrames,
  validateGenerationMode,
  getAvailableModes,
};
