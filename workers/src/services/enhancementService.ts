/**
 * Video Enhancement / Upscaler Service
 * Handles AI-powered video upscaling and quality enhancement
 */

import { Database, Storage, Cache, generateId, now } from '../db/index';

// ==================== TYPES ====================

export interface UpscalerModel {
  id: string;
  provider: string;
  display_name: string;
  description: string | null;
  max_input_resolution: string | null;
  max_output_resolution: string | null;
  scale_factors: number[];
  supports_video: boolean;
  supports_batch: boolean;
  avg_processing_time_sec: number | null;
  quality_score: number;
  cost_per_second: number;
  credits_per_use: number;
  is_active: boolean;
  priority: number;
}

export interface EnhancementJob {
  id: string;
  segment_id: string;
  timeline_id: string;
  user_id: string;
  model_id: string;
  model_provider: string | null;
  input_url: string;
  output_url: string | null;
  scale_factor: number;
  target_resolution: string | null;
  preserve_audio: boolean;
  status: 'queued' | 'processing' | 'done' | 'failed';
  progress: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  processing_time_sec: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnhancementRequest {
  segmentId: string;
  timelineId: string;
  userId: string;
  modelId: string;
  inputUrl: string;
  scaleFactor?: number;
  targetResolution?: string;
  preserveAudio?: boolean;
}

export interface EnhancementResult {
  success: boolean;
  jobId: string;
  outputUrl?: string;
  error?: string;
}

// ==================== UPSCALER REPOSITORY ====================

export class UpscalerRepository {
  constructor(
    private db: Database,
    private cache?: Cache
  ) {}

  /**
   * Get all active upscaler models
   */
  async getAll(): Promise<UpscalerModel[]> {
    // Check cache first
    if (this.cache) {
      const cached = await this.cache.get<UpscalerModel[]>('upscalers:list');
      if (cached.data) return cached.data;
    }

    const result = await this.db.query<any>(
      'SELECT * FROM upscaler_models WHERE is_active = 1 ORDER BY priority DESC, display_name'
    );

    const models = (result.data || []).map(m => ({
      ...m,
      scale_factors: m.scale_factors ? JSON.parse(m.scale_factors) : [2],
      supports_video: m.supports_video === 1,
      supports_batch: m.supports_batch === 1,
      is_active: m.is_active === 1,
    }));

    // Cache for 1 hour
    if (this.cache) {
      await this.cache.set('upscalers:list', models, { expirationTtl: 3600 });
    }

    return models;
  }

  /**
   * Get upscaler by ID
   */
  async getById(id: string): Promise<UpscalerModel | null> {
    const result = await this.db.queryFirst<any>(
      'SELECT * FROM upscaler_models WHERE id = ?',
      [id]
    );

    if (!result.data) return null;

    return {
      ...result.data,
      scale_factors: result.data.scale_factors ? JSON.parse(result.data.scale_factors) : [2],
      supports_video: result.data.supports_video === 1,
      supports_batch: result.data.supports_batch === 1,
      is_active: result.data.is_active === 1,
    };
  }

  /**
   * Get upscalers by provider
   */
  async getByProvider(provider: string): Promise<UpscalerModel[]> {
    const result = await this.db.query<any>(
      'SELECT * FROM upscaler_models WHERE provider = ? AND is_active = 1 ORDER BY priority DESC',
      [provider]
    );

    return (result.data || []).map(m => ({
      ...m,
      scale_factors: m.scale_factors ? JSON.parse(m.scale_factors) : [2],
      supports_video: m.supports_video === 1,
      supports_batch: m.supports_batch === 1,
      is_active: m.is_active === 1,
    }));
  }

  /**
   * Get recommended upscaler
   */
  async getRecommended(): Promise<UpscalerModel | null> {
    const all = await this.getAll();
    return all.length > 0 ? all[0] : null;
  }
}

// ==================== ENHANCEMENT JOB REPOSITORY ====================

export class EnhancementJobRepository {
  constructor(private db: Database) {}

  /**
   * Create enhancement job
   */
  async create(request: EnhancementRequest, modelProvider?: string): Promise<string> {
    const id = `enhance-${generateId()}`;
    
    await this.db.execute(
      `INSERT INTO enhancement_jobs (
        id, segment_id, timeline_id, user_id, model_id, model_provider,
        input_url, scale_factor, target_resolution, preserve_audio,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?)`,
      [
        id,
        request.segmentId,
        request.timelineId,
        request.userId,
        request.modelId,
        modelProvider || null,
        request.inputUrl,
        request.scaleFactor || 2,
        request.targetResolution || null,
        request.preserveAudio !== false ? 1 : 0,
        now(),
        now(),
      ]
    );

    return id;
  }

  /**
   * Get job by ID
   */
  async getById(id: string): Promise<EnhancementJob | null> {
    const result = await this.db.queryFirst<EnhancementJob>(
      'SELECT * FROM enhancement_jobs WHERE id = ?',
      [id]
    );
    return result.data ?? null;
  }

  /**
   * Get jobs by segment
   */
  async getBySegment(segmentId: string): Promise<EnhancementJob[]> {
    const result = await this.db.query<EnhancementJob>(
      'SELECT * FROM enhancement_jobs WHERE segment_id = ? ORDER BY created_at DESC',
      [segmentId]
    );
    return result.data || [];
  }

  /**
   * Get pending jobs for timeline
   */
  async getPendingByTimeline(timelineId: string): Promise<EnhancementJob[]> {
    const result = await this.db.query<EnhancementJob>(
      `SELECT * FROM enhancement_jobs 
       WHERE timeline_id = ? AND status IN ('queued', 'processing')
       ORDER BY created_at ASC`,
      [timelineId]
    );
    return result.data || [];
  }

  /**
   * Update job status
   */
  async updateStatus(
    id: string,
    status: 'queued' | 'processing' | 'done' | 'failed',
    updates?: {
      outputUrl?: string;
      progress?: number;
      errorMessage?: string;
      processingTimeSec?: number;
    }
  ): Promise<void> {
    const fields = ['status = ?', 'updated_at = ?'];
    const values: unknown[] = [status, now()];

    if (status === 'processing' && !updates?.progress) {
      fields.push('started_at = ?');
      values.push(now());
    }

    if (status === 'done' || status === 'failed') {
      fields.push('completed_at = ?');
      values.push(now());
    }

    if (updates?.outputUrl) {
      fields.push('output_url = ?');
      values.push(updates.outputUrl);
    }

    if (updates?.progress !== undefined) {
      fields.push('progress = ?');
      values.push(updates.progress);
    }

    if (updates?.errorMessage) {
      fields.push('error_message = ?');
      values.push(updates.errorMessage);
    }

    if (updates?.processingTimeSec) {
      fields.push('processing_time_sec = ?');
      values.push(updates.processingTimeSec);
    }

    values.push(id);

    await this.db.execute(
      `UPDATE enhancement_jobs SET ${fields.join(', ')} WHERE id = ?`,
      values
    );
  }
}

// ==================== ENHANCEMENT SERVICE ====================

export class EnhancementService {
  private upscalerRepo: UpscalerRepository;
  private jobRepo: EnhancementJobRepository;

  constructor(
    private db: Database,
    private storage: Storage,
    private cache?: Cache
  ) {
    this.upscalerRepo = new UpscalerRepository(db, cache);
    this.jobRepo = new EnhancementJobRepository(db);
  }

  /**
   * Get all available upscalers
   */
  async getUpscalers(): Promise<UpscalerModel[]> {
    return this.upscalerRepo.getAll();
  }

  /**
   * Get upscaler by ID
   */
  async getUpscaler(id: string): Promise<UpscalerModel | null> {
    return this.upscalerRepo.getById(id);
  }

  /**
   * Queue enhancement job
   */
  async queueEnhancement(request: EnhancementRequest): Promise<EnhancementResult> {
    try {
      // Validate upscaler model
      const model = await this.upscalerRepo.getById(request.modelId);
      if (!model) {
        return {
          success: false,
          jobId: '',
          error: `Upscaler model not found: ${request.modelId}`,
        };
      }

      // Validate scale factor
      const scaleFactor = request.scaleFactor || 2;
      if (!model.scale_factors.includes(scaleFactor)) {
        return {
          success: false,
          jobId: '',
          error: `Scale factor ${scaleFactor}x not supported by ${model.display_name}`,
        };
      }

      // Create job
      const jobId = await this.jobRepo.create(request, model.provider);

      // Update segment status
      await this.db.execute(
        `UPDATE segments SET 
          enhance_enabled = 1,
          enhance_model = ?,
          enhance_status = 'queued',
          raw_video_url = ?,
          updated_at = ?
        WHERE id = ?`,
        [request.modelId, request.inputUrl, now(), request.segmentId]
      );

      // Also update timeline_segments if exists
      await this.db.execute(
        `UPDATE timeline_segments SET 
          enhance_enabled = 1,
          enhance_model = ?,
          enhance_status = 'queued',
          raw_video_url = ?,
          updated_at = ?
        WHERE id = ?`,
        [request.modelId, request.inputUrl, now(), request.segmentId]
      );

      return {
        success: true,
        jobId,
      };
    } catch (error: any) {
      return {
        success: false,
        jobId: '',
        error: error.message,
      };
    }
  }

  /**
   * Process enhancement job (stub for actual processing)
   */
  async processEnhancement(jobId: string): Promise<EnhancementResult> {
    const job = await this.jobRepo.getById(jobId);
    if (!job) {
      return { success: false, jobId, error: 'Job not found' };
    }

    try {
      // Update status to processing
      await this.jobRepo.updateStatus(jobId, 'processing', { progress: 0 });
      await this.updateSegmentStatus(job.segment_id, 'processing');

      // Get the upscaler model
      const model = await this.upscalerRepo.getById(job.model_id);
      if (!model) {
        throw new Error(`Model not found: ${job.model_id}`);
      }

      // In production, this would:
      // 1. Download video from R2
      // 2. Call the appropriate upscaler API (Replicate, etc.)
      // 3. Upload enhanced video to R2
      // 4. Return the enhanced URL

      // Mock processing
      const outputKey = `segments/enhanced/${job.timeline_id}/${job.segment_id}.mp4`;
      const outputUrl = this.storage.getPublicUrl(outputKey);

      // Simulate processing time
      const processingTime = 30; // seconds

      // Update job as complete
      await this.jobRepo.updateStatus(jobId, 'done', {
        outputUrl,
        progress: 100,
        processingTimeSec: processingTime,
      });

      // Update segment with enhanced URL
      await this.db.execute(
        `UPDATE segments SET 
          enhance_status = 'done',
          enhanced_video_url = ?,
          enhance_completed_at = ?,
          enhance_duration_sec = ?,
          updated_at = ?
        WHERE id = ?`,
        [outputUrl, now(), processingTime, now(), job.segment_id]
      );

      await this.db.execute(
        `UPDATE timeline_segments SET 
          enhance_status = 'done',
          enhanced_video_url = ?,
          updated_at = ?
        WHERE id = ?`,
        [outputUrl, now(), job.segment_id]
      );

      return {
        success: true,
        jobId,
        outputUrl,
      };
    } catch (error: any) {
      await this.jobRepo.updateStatus(jobId, 'failed', {
        errorMessage: error.message,
      });
      await this.updateSegmentStatus(job.segment_id, 'failed', error.message);

      return {
        success: false,
        jobId,
        error: error.message,
      };
    }
  }

  /**
   * Update segment enhancement status
   */
  private async updateSegmentStatus(
    segmentId: string,
    status: string,
    error?: string
  ): Promise<void> {
    await this.db.execute(
      `UPDATE segments SET 
        enhance_status = ?,
        enhance_error = ?,
        updated_at = ?
      WHERE id = ?`,
      [status, error || null, now(), segmentId]
    );

    await this.db.execute(
      `UPDATE timeline_segments SET 
        enhance_status = ?,
        updated_at = ?
      WHERE id = ?`,
      [status, now(), segmentId]
    );
  }

  /**
   * Get enhancement status for segment
   */
  async getSegmentEnhancementStatus(segmentId: string): Promise<{
    enabled: boolean;
    model: string | null;
    status: string;
    rawUrl: string | null;
    enhancedUrl: string | null;
    jobs: EnhancementJob[];
  }> {
    const segment = await this.db.queryFirst<{
      enhance_enabled: number;
      enhance_model: string | null;
      enhance_status: string;
      raw_video_url: string | null;
      enhanced_video_url: string | null;
    }>(
      `SELECT enhance_enabled, enhance_model, enhance_status, raw_video_url, enhanced_video_url
       FROM segments WHERE id = ?`,
      [segmentId]
    );

    const jobs = await this.jobRepo.getBySegment(segmentId);

    return {
      enabled: segment.data?.enhance_enabled === 1,
      model: segment.data?.enhance_model || null,
      status: segment.data?.enhance_status || 'none',
      rawUrl: segment.data?.raw_video_url || null,
      enhancedUrl: segment.data?.enhanced_video_url || null,
      jobs,
    };
  }

  /**
   * Enhance all enabled segments in timeline
   */
  async enhanceTimeline(
    timelineId: string,
    userId: string
  ): Promise<{ queued: number; errors: string[] }> {
    // Get all segments with enhancement enabled
    const segments = await this.db.query<{
      id: string;
      enhance_model: string;
      video_url: string;
    }>(
      `SELECT id, enhance_model, video_url FROM segments 
       WHERE timeline_id = ? AND enhance_enabled = 1 AND enhance_status != 'done'`,
      [timelineId]
    );

    let queued = 0;
    const errors: string[] = [];

    for (const seg of segments.data || []) {
      if (!seg.enhance_model) {
        errors.push(`Segment ${seg.id}: No upscaler model selected`);
        continue;
      }

      if (!seg.video_url) {
        errors.push(`Segment ${seg.id}: No video to enhance`);
        continue;
      }

      const result = await this.queueEnhancement({
        segmentId: seg.id,
        timelineId,
        userId,
        modelId: seg.enhance_model,
        inputUrl: seg.video_url,
      });

      if (result.success) {
        queued++;
      } else {
        errors.push(`Segment ${seg.id}: ${result.error}`);
      }
    }

    return { queued, errors };
  }
}

// ==================== R2 STORAGE KEYS ====================

export function getEnhancementStorageKey(
  type: 'raw' | 'enhanced',
  timelineId: string,
  segmentId: string
): string {
  return `segments/${type}/${timelineId}/${segmentId}.mp4`;
}

export function getEnhancedFinalKey(
  timelineId: string,
  type: 'raw' | 'enhanced' = 'enhanced'
): string {
  return `videos/final/${timelineId}/${type}.mp4`;
}

// ==================== EXPORT ====================

export default {
  UpscalerRepository,
  EnhancementJobRepository,
  EnhancementService,
  getEnhancementStorageKey,
  getEnhancedFinalKey,
};
