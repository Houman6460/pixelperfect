/**
 * Video Enhancement Routes
 * API endpoints for AI video upscaling and quality enhancement
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { Database, Storage, Cache } from '../db/index';
import {
  EnhancementService,
  UpscalerRepository,
  EnhancementJobRepository,
  getEnhancementStorageKey,
} from '../services/enhancementService';

type Variables = {
  user: User;
};

export const enhancementRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== UPSCALER MODEL ENDPOINTS ====================

// GET /enhancement/upscalers - Get all available upscaler models
enhancementRoutes.get('/enhancement/upscalers', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const upscalerRepo = new UpscalerRepository(db, cache);

    const upscalers = await upscalerRepo.getAll();

    return c.json({
      success: true,
      data: upscalers.map(u => ({
        id: u.id,
        provider: u.provider,
        displayName: u.display_name,
        description: u.description,
        scaleFactors: u.scale_factors,
        qualityScore: u.quality_score,
        creditsPerUse: u.credits_per_use,
        supportsVideo: u.supports_video,
      })),
    });
  } catch (error: any) {
    console.error('Get upscalers error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /enhancement/upscalers/:id - Get upscaler details
enhancementRoutes.get('/enhancement/upscalers/:id', async (c) => {
  try {
    const upscalerId = c.req.param('id');
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const upscalerRepo = new UpscalerRepository(db, cache);

    const upscaler = await upscalerRepo.getById(upscalerId);

    if (!upscaler) {
      return c.json({ success: false, error: 'Upscaler not found' }, 404);
    }

    return c.json({
      success: true,
      data: upscaler,
    });
  } catch (error: any) {
    console.error('Get upscaler error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /enhancement/upscalers/provider/:provider - Get upscalers by provider
enhancementRoutes.get('/enhancement/upscalers/provider/:provider', async (c) => {
  try {
    const provider = c.req.param('provider');
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const upscalerRepo = new UpscalerRepository(db, cache);

    const upscalers = await upscalerRepo.getByProvider(provider);

    return c.json({
      success: true,
      data: upscalers,
    });
  } catch (error: any) {
    console.error('Get upscalers by provider error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== SEGMENT ENHANCEMENT ENDPOINTS ====================

// GET /enhancement/segment/:segmentId - Get segment enhancement status
enhancementRoutes.get('/enhancement/segment/:segmentId', authMiddleware(), async (c) => {
  try {
    const segmentId = c.req.param('segmentId');
    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const cache = new Cache(c.env.CACHE);
    
    const service = new EnhancementService(db, storage, cache);
    const status = await service.getSegmentEnhancementStatus(segmentId);

    return c.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('Get segment enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/segment/:segmentId/enable - Enable enhancement for segment
enhancementRoutes.post('/enhancement/segment/:segmentId/enable', authMiddleware(), async (c) => {
  try {
    const segmentId = c.req.param('segmentId');
    const body = await c.req.json();
    const { model_id, scale_factor } = body;

    if (!model_id) {
      return c.json({ success: false, error: 'model_id is required' }, 400);
    }

    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const upscalerRepo = new UpscalerRepository(db, cache);

    // Validate model exists
    const model = await upscalerRepo.getById(model_id);
    if (!model) {
      return c.json({ success: false, error: 'Upscaler model not found' }, 404);
    }

    // Update segment
    await db.execute(
      `UPDATE segments SET 
        enhance_enabled = 1,
        enhance_model = ?,
        enhance_status = 'pending',
        updated_at = ?
      WHERE id = ?`,
      [model_id, new Date().toISOString(), segmentId]
    );

    await db.execute(
      `UPDATE timeline_segments SET 
        enhance_enabled = 1,
        enhance_model = ?,
        enhance_status = 'pending',
        updated_at = ?
      WHERE id = ?`,
      [model_id, new Date().toISOString(), segmentId]
    );

    return c.json({
      success: true,
      data: {
        segmentId,
        enhanceEnabled: true,
        model: {
          id: model.id,
          name: model.display_name,
          scaleFactors: model.scale_factors,
        },
      },
    });
  } catch (error: any) {
    console.error('Enable enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/segment/:segmentId/disable - Disable enhancement for segment
enhancementRoutes.post('/enhancement/segment/:segmentId/disable', authMiddleware(), async (c) => {
  try {
    const segmentId = c.req.param('segmentId');
    const db = new Database(c.env.DB);

    await db.execute(
      `UPDATE segments SET 
        enhance_enabled = 0,
        enhance_model = NULL,
        enhance_status = 'none',
        updated_at = ?
      WHERE id = ?`,
      [new Date().toISOString(), segmentId]
    );

    await db.execute(
      `UPDATE timeline_segments SET 
        enhance_enabled = 0,
        enhance_model = NULL,
        enhance_status = 'none',
        updated_at = ?
      WHERE id = ?`,
      [new Date().toISOString(), segmentId]
    );

    return c.json({
      success: true,
      data: {
        segmentId,
        enhanceEnabled: false,
      },
    });
  } catch (error: any) {
    console.error('Disable enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/segment/:segmentId/queue - Queue enhancement job
enhancementRoutes.post('/enhancement/segment/:segmentId/queue', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const segmentId = c.req.param('segmentId');
    const body = await c.req.json();
    const { model_id, scale_factor, input_url } = body;

    if (!input_url) {
      return c.json({ success: false, error: 'input_url is required' }, 400);
    }

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const cache = new Cache(c.env.CACHE);

    // Get segment to find timeline_id
    const segment = await db.queryFirst<{ timeline_id: string; enhance_model: string }>(
      'SELECT timeline_id, enhance_model FROM segments WHERE id = ?',
      [segmentId]
    );

    if (!segment.data) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    const service = new EnhancementService(db, storage, cache);
    const result = await service.queueEnhancement({
      segmentId,
      timelineId: segment.data.timeline_id,
      userId: user.id,
      modelId: model_id || segment.data.enhance_model || 'replicate-esrgan',
      inputUrl: input_url,
      scaleFactor: scale_factor,
    });

    if (!result.success) {
      return c.json({ success: false, error: result.error }, 400);
    }

    return c.json({
      success: true,
      data: {
        jobId: result.jobId,
        status: 'queued',
      },
    });
  } catch (error: any) {
    console.error('Queue enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TIMELINE ENHANCEMENT ENDPOINTS ====================

// GET /enhancement/timeline/:timelineId - Get timeline enhancement status
enhancementRoutes.get('/enhancement/timeline/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);

    // Get all segments with enhancement info
    const segments = await db.query<{
      id: string;
      position: number;
      enhance_enabled: number;
      enhance_model: string | null;
      enhance_status: string;
      raw_video_url: string | null;
      enhanced_video_url: string | null;
    }>(
      `SELECT id, position, enhance_enabled, enhance_model, enhance_status, raw_video_url, enhanced_video_url
       FROM segments WHERE timeline_id = ? ORDER BY position`,
      [timelineId]
    );

    const enhancedCount = segments.data?.filter(s => s.enhance_status === 'done').length || 0;
    const pendingCount = segments.data?.filter(s => 
      s.enhance_enabled && s.enhance_status !== 'done'
    ).length || 0;

    return c.json({
      success: true,
      data: {
        timelineId,
        totalSegments: segments.data?.length || 0,
        enhancedCount,
        pendingCount,
        segments: segments.data?.map(s => ({
          id: s.id,
          position: s.position,
          enhanceEnabled: s.enhance_enabled === 1,
          model: s.enhance_model,
          status: s.enhance_status,
          hasRaw: !!s.raw_video_url,
          hasEnhanced: !!s.enhanced_video_url,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get timeline enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/timeline/:timelineId/enhance-all - Enhance all enabled segments
enhancementRoutes.post('/enhancement/timeline/:timelineId/enhance-all', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const cache = new Cache(c.env.CACHE);

    const service = new EnhancementService(db, storage, cache);
    const result = await service.enhanceTimeline(timelineId, user.id);

    return c.json({
      success: true,
      data: {
        queued: result.queued,
        errors: result.errors,
      },
    });
  } catch (error: any) {
    console.error('Enhance timeline error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/timeline/:timelineId/enable-all - Enable enhancement for all segments
enhancementRoutes.post('/enhancement/timeline/:timelineId/enable-all', authMiddleware(), async (c) => {
  try {
    const timelineId = c.req.param('timelineId');
    const body = await c.req.json();
    const { model_id } = body;

    if (!model_id) {
      return c.json({ success: false, error: 'model_id is required' }, 400);
    }

    const db = new Database(c.env.DB);

    // Update all segments
    const result = await db.execute(
      `UPDATE segments SET 
        enhance_enabled = 1,
        enhance_model = ?,
        enhance_status = CASE WHEN enhance_status = 'done' THEN 'done' ELSE 'pending' END,
        updated_at = ?
      WHERE timeline_id = ?`,
      [model_id, new Date().toISOString(), timelineId]
    );

    await db.execute(
      `UPDATE timeline_segments SET 
        enhance_enabled = 1,
        enhance_model = ?,
        enhance_status = CASE WHEN enhance_status = 'done' THEN 'done' ELSE 'pending' END,
        updated_at = ?
      WHERE timeline_id = ?`,
      [model_id, new Date().toISOString(), timelineId]
    );

    return c.json({
      success: true,
      data: {
        timelineId,
        model: model_id,
        updated: result.meta?.changes || 0,
      },
    });
  } catch (error: any) {
    console.error('Enable all enhancement error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== JOB STATUS ENDPOINTS ====================

// GET /enhancement/jobs/:jobId - Get enhancement job status
enhancementRoutes.get('/enhancement/jobs/:jobId', authMiddleware(), async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const db = new Database(c.env.DB);
    const jobRepo = new EnhancementJobRepository(db);

    const job = await jobRepo.getById(jobId);
    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    return c.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error('Get job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /enhancement/jobs/:jobId/process - Process enhancement job (for testing)
enhancementRoutes.post('/enhancement/jobs/:jobId/process', authMiddleware(), async (c) => {
  try {
    const jobId = c.req.param('jobId');
    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const cache = new Cache(c.env.CACHE);

    const service = new EnhancementService(db, storage, cache);
    const result = await service.processEnhancement(jobId);

    return c.json({
      success: result.success,
      data: {
        jobId,
        outputUrl: result.outputUrl,
        error: result.error,
      },
    });
  } catch (error: any) {
    console.error('Process job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /enhancement/jobs/pending/:timelineId - Get pending jobs for timeline
enhancementRoutes.get('/enhancement/jobs/pending/:timelineId', authMiddleware(), async (c) => {
  try {
    const timelineId = c.req.param('timelineId');
    const db = new Database(c.env.DB);
    const jobRepo = new EnhancementJobRepository(db);

    const jobs = await jobRepo.getPendingByTimeline(timelineId);

    return c.json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error('Get pending jobs error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default enhancementRoutes;
