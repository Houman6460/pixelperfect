/**
 * Timeline API Routes
 * REST API for Long Video Timeline System
 */

import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';

// Types
interface Timeline {
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
}

interface Segment {
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
  status: string;
  preview_video_url: string | null;
  final_video_url: string | null;
  thumbnail_url: string | null;
  first_frame_url: string | null;
  last_frame_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface Job {
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

type Variables = {
  user: User;
};

export const timelineRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== TIMELINE ENDPOINTS ====================

// GET /timelines - List user timelines
timelineRoutes.get('/timelines', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    
    const timelines = await c.env.DB.prepare(`
      SELECT t.*, 
        (SELECT COUNT(*) FROM timeline_segments WHERE timeline_id = t.id) as segment_count
      FROM timelines t
      WHERE t.user_id = ?
      ORDER BY t.updated_at DESC
    `).bind(user.id).all<Timeline & { segment_count: number }>();

    return c.json({
      success: true,
      data: timelines.results || [],
    });
  } catch (error) {
    console.error('List timelines error:', error);
    return c.json({ success: false, error: 'Failed to list timelines' }, 500);
  }
});

// POST /timelines - Create timeline
timelineRoutes.post('/timelines', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const body = await c.req.json();
    
    const timeline: Timeline = {
      id: nanoid(12),
      user_id: user.id,
      name: body.name || 'Untitled Timeline',
      description: body.description || '',
      version: '1.0',
      target_resolution: body.target_resolution || '1080p',
      global_style: body.global_style || null,
      total_duration_sec: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      INSERT INTO timelines (id, user_id, name, description, version, target_resolution, global_style, total_duration_sec, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      timeline.id,
      timeline.user_id,
      timeline.name,
      timeline.description,
      timeline.version,
      timeline.target_resolution,
      timeline.global_style,
      timeline.total_duration_sec,
      timeline.created_at,
      timeline.updated_at
    ).run();

    // Create first empty segment
    const segment: Segment = {
      id: nanoid(12),
      timeline_id: timeline.id,
      position: 0,
      duration_sec: 5,
      model_id: 'wan-2.5-i2v',
      prompt: '',
      negative_prompt: null,
      transition: 'fade',
      motion_profile: 'smooth',
      camera_path: 'static',
      style_preset: null,
      seed: null,
      status: 'pending',
      preview_video_url: null,
      final_video_url: null,
      thumbnail_url: null,
      first_frame_url: null,
      last_frame_url: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      INSERT INTO timeline_segments (id, timeline_id, position, duration_sec, model_id, prompt, negative_prompt, transition, motion_profile, camera_path, style_preset, seed, status, preview_video_url, final_video_url, thumbnail_url, first_frame_url, last_frame_url, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      segment.id, segment.timeline_id, segment.position, segment.duration_sec, segment.model_id,
      segment.prompt, segment.negative_prompt, segment.transition, segment.motion_profile,
      segment.camera_path, segment.style_preset, segment.seed, segment.status,
      segment.preview_video_url, segment.final_video_url, segment.thumbnail_url,
      segment.first_frame_url, segment.last_frame_url, segment.error_message,
      segment.created_at, segment.updated_at
    ).run();

    return c.json({
      success: true,
      data: { ...timeline, segments: [segment] },
    }, 201);
  } catch (error) {
    console.error('Create timeline error:', error);
    return c.json({ success: false, error: 'Failed to create timeline' }, 500);
  }
});

// GET /timelines/:id - Get timeline with segments
timelineRoutes.get('/timelines/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');

    const timeline = await c.env.DB.prepare(`
      SELECT * FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first<Timeline>();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const segments = await c.env.DB.prepare(`
      SELECT * FROM timeline_segments WHERE timeline_id = ? ORDER BY position ASC
    `).bind(timelineId).all<Segment>();

    return c.json({
      success: true,
      data: {
        ...timeline,
        segments: segments.results || [],
      },
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    return c.json({ success: false, error: 'Failed to get timeline' }, 500);
  }
});

// PUT /timelines/:id - Update timeline
timelineRoutes.put('/timelines/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const body = await c.req.json();

    const existing = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!existing) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    await c.env.DB.prepare(`
      UPDATE timelines SET
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        target_resolution = COALESCE(?, target_resolution),
        global_style = COALESCE(?, global_style),
        updated_at = ?
      WHERE id = ?
    `).bind(
      body.name,
      body.description,
      body.target_resolution,
      body.global_style,
      new Date().toISOString(),
      timelineId
    ).run();

    return c.json({ success: true, message: 'Timeline updated' });
  } catch (error) {
    console.error('Update timeline error:', error);
    return c.json({ success: false, error: 'Failed to update timeline' }, 500);
  }
});

// DELETE /timelines/:id - Delete timeline
timelineRoutes.delete('/timelines/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');

    const existing = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!existing) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Delete segments first
    await c.env.DB.prepare(`DELETE FROM timeline_segments WHERE timeline_id = ?`).bind(timelineId).run();
    // Delete jobs
    await c.env.DB.prepare(`DELETE FROM timeline_jobs WHERE timeline_id = ?`).bind(timelineId).run();
    // Delete timeline
    await c.env.DB.prepare(`DELETE FROM timelines WHERE id = ?`).bind(timelineId).run();

    return c.json({ success: true, message: 'Timeline deleted' });
  } catch (error) {
    console.error('Delete timeline error:', error);
    return c.json({ success: false, error: 'Failed to delete timeline' }, 500);
  }
});

// ==================== SEGMENT ENDPOINTS ====================

// POST /timelines/:id/segments - Add segment
timelineRoutes.post('/timelines/:id/segments', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get max position
    const maxPos = await c.env.DB.prepare(`
      SELECT MAX(position) as max_pos FROM timeline_segments WHERE timeline_id = ?
    `).bind(timelineId).first<{ max_pos: number }>();

    const position = body.position ?? ((maxPos?.max_pos ?? -1) + 1);

    // If inserting in middle, shift other segments
    if (body.position !== undefined) {
      await c.env.DB.prepare(`
        UPDATE timeline_segments SET position = position + 1 WHERE timeline_id = ? AND position >= ?
      `).bind(timelineId, position).run();
    }

    const segment: Segment = {
      id: nanoid(12),
      timeline_id: timelineId,
      position,
      duration_sec: body.duration_sec || 5,
      model_id: body.model || body.model_id || 'wan-2.5-i2v',
      prompt: body.prompt || '',
      negative_prompt: body.negative_prompt || null,
      transition: body.transition || 'fade',
      motion_profile: body.motion_profile || 'smooth',
      camera_path: body.camera_path || 'static',
      style_preset: body.style_preset || null,
      seed: body.seed || null,
      status: 'pending',
      preview_video_url: null,
      final_video_url: null,
      thumbnail_url: null,
      first_frame_url: body.first_frame_url || null,
      last_frame_url: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      INSERT INTO timeline_segments (id, timeline_id, position, duration_sec, model_id, prompt, negative_prompt, transition, motion_profile, camera_path, style_preset, seed, status, preview_video_url, final_video_url, thumbnail_url, first_frame_url, last_frame_url, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      segment.id, segment.timeline_id, segment.position, segment.duration_sec, segment.model_id,
      segment.prompt, segment.negative_prompt, segment.transition, segment.motion_profile,
      segment.camera_path, segment.style_preset, segment.seed, segment.status,
      segment.preview_video_url, segment.final_video_url, segment.thumbnail_url,
      segment.first_frame_url, segment.last_frame_url, segment.error_message,
      segment.created_at, segment.updated_at
    ).run();

    // Update timeline duration
    await updateTimelineDuration(c.env.DB, timelineId);

    return c.json({ success: true, data: segment }, 201);
  } catch (error) {
    console.error('Add segment error:', error);
    return c.json({ success: false, error: 'Failed to add segment' }, 500);
  }
});

// PUT /timelines/:id/segments/:segmentId - Update segment
timelineRoutes.put('/timelines/:id/segments/:segmentId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const segmentId = c.req.param('segmentId');
    const body = await c.req.json();

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Build dynamic update
    const updates: string[] = [];
    const values: any[] = [];

    const fields = [
      'duration_sec', 'model_id', 'prompt', 'negative_prompt', 'transition',
      'motion_profile', 'camera_path', 'style_preset', 'seed', 'first_frame_url'
    ];

    for (const field of fields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    // Mark as modified if prompt or model changed
    if (body.prompt !== undefined || body.model_id !== undefined || body.model !== undefined) {
      updates.push('status = ?');
      values.push('modified');
    }

    updates.push('updated_at = ?');
    values.push(new Date().toISOString());

    values.push(segmentId);
    values.push(timelineId);

    await c.env.DB.prepare(`
      UPDATE timeline_segments SET ${updates.join(', ')} WHERE id = ? AND timeline_id = ?
    `).bind(...values).run();

    // Update timeline duration
    await updateTimelineDuration(c.env.DB, timelineId);

    return c.json({ success: true, message: 'Segment updated' });
  } catch (error) {
    console.error('Update segment error:', error);
    return c.json({ success: false, error: 'Failed to update segment' }, 500);
  }
});

// PATCH /timelines/:id/segments/reorder - Reorder segments
timelineRoutes.patch('/timelines/:id/segments/reorder', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const order = body.order as string[]; // Array of segment IDs in new order

    // Update positions
    for (let i = 0; i < order.length; i++) {
      await c.env.DB.prepare(`
        UPDATE timeline_segments SET position = ?, updated_at = ? WHERE id = ? AND timeline_id = ?
      `).bind(i, new Date().toISOString(), order[i], timelineId).run();
    }

    return c.json({ success: true, message: 'Segments reordered' });
  } catch (error) {
    console.error('Reorder segments error:', error);
    return c.json({ success: false, error: 'Failed to reorder segments' }, 500);
  }
});

// DELETE /timelines/:id/segments/:segmentId - Delete segment
timelineRoutes.delete('/timelines/:id/segments/:segmentId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const segmentId = c.req.param('segmentId');

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get segment position
    const segment = await c.env.DB.prepare(`
      SELECT position FROM timeline_segments WHERE id = ? AND timeline_id = ?
    `).bind(segmentId, timelineId).first<{ position: number }>();

    if (!segment) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    // Check if this is the last segment
    const count = await c.env.DB.prepare(`
      SELECT COUNT(*) as cnt FROM timeline_segments WHERE timeline_id = ?
    `).bind(timelineId).first<{ cnt: number }>();

    if (count && count.cnt <= 1) {
      return c.json({ success: false, error: 'Cannot delete the last segment' }, 400);
    }

    // Delete segment
    await c.env.DB.prepare(`DELETE FROM timeline_segments WHERE id = ?`).bind(segmentId).run();

    // Shift positions
    await c.env.DB.prepare(`
      UPDATE timeline_segments SET position = position - 1 WHERE timeline_id = ? AND position > ?
    `).bind(timelineId, segment.position).run();

    // Update timeline duration
    await updateTimelineDuration(c.env.DB, timelineId);

    return c.json({ success: true, message: 'Segment deleted' });
  } catch (error) {
    console.error('Delete segment error:', error);
    return c.json({ success: false, error: 'Failed to delete segment' }, 500);
  }
});

// ==================== JOB ENDPOINTS ====================

// POST /timelines/:id/preview - Generate preview
timelineRoutes.post('/timelines/:id/preview', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT * FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first<Timeline>();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get segments
    const segments = await c.env.DB.prepare(`
      SELECT * FROM timeline_segments WHERE timeline_id = ? ORDER BY position ASC
    `).bind(timelineId).all<Segment>();

    const segmentCount = segments.results?.length || 0;

    // Create job
    const job: Job = {
      id: nanoid(12),
      user_id: user.id,
      timeline_id: timelineId,
      type: 'preview',
      status: 'queued',
      progress: 0,
      current_segment: 0,
      total_segments: segmentCount,
      output_video_url: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      INSERT INTO timeline_jobs (id, user_id, timeline_id, type, status, progress, current_segment, total_segments, output_video_url, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job.id, job.user_id, job.timeline_id, job.type, job.status, job.progress,
      job.current_segment, job.total_segments, job.output_video_url, job.error_message,
      job.created_at, job.updated_at
    ).run();

    // TODO: Trigger async job processing via Durable Object or Queue
    // For now, we return the job ID for polling

    return c.json({
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        quality: body.quality || 'low',
        resolution: body.resolution || '480p',
      },
    }, 202);
  } catch (error) {
    console.error('Create preview job error:', error);
    return c.json({ success: false, error: 'Failed to create preview job' }, 500);
  }
});

// POST /timelines/:id/render - Generate final render
timelineRoutes.post('/timelines/:id/render', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.param('id');
    const body = await c.req.json();

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT * FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first<Timeline>();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get segments
    const segments = await c.env.DB.prepare(`
      SELECT * FROM timeline_segments WHERE timeline_id = ? ORDER BY position ASC
    `).bind(timelineId).all<Segment>();

    const segmentCount = segments.results?.length || 0;

    // Create job
    const job: Job = {
      id: nanoid(12),
      user_id: user.id,
      timeline_id: timelineId,
      type: 'render',
      status: 'queued',
      progress: 0,
      current_segment: 0,
      total_segments: segmentCount,
      output_video_url: null,
      error_message: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await c.env.DB.prepare(`
      INSERT INTO timeline_jobs (id, user_id, timeline_id, type, status, progress, current_segment, total_segments, output_video_url, error_message, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      job.id, job.user_id, job.timeline_id, job.type, job.status, job.progress,
      job.current_segment, job.total_segments, job.output_video_url, job.error_message,
      job.created_at, job.updated_at
    ).run();

    return c.json({
      success: true,
      data: {
        job_id: job.id,
        status: job.status,
        quality: body.quality || 'high',
        resolution: body.resolution || '1080p',
      },
    }, 202);
  } catch (error) {
    console.error('Create render job error:', error);
    return c.json({ success: false, error: 'Failed to create render job' }, 500);
  }
});

// GET /jobs/:jobId - Get job status
timelineRoutes.get('/jobs/:jobId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const jobId = c.req.param('jobId');

    const job = await c.env.DB.prepare(`
      SELECT * FROM timeline_jobs WHERE id = ? AND user_id = ?
    `).bind(jobId, user.id).first<Job>();

    if (!job) {
      return c.json({ success: false, error: 'Job not found' }, 404);
    }

    return c.json({
      success: true,
      data: job,
    });
  } catch (error) {
    console.error('Get job error:', error);
    return c.json({ success: false, error: 'Failed to get job' }, 500);
  }
});

// GET /jobs - List user jobs
timelineRoutes.get('/jobs', authMiddleware(), async (c) => {
  try {
    const user = c.get('user') as User;
    const timelineId = c.req.query('timeline_id');

    let query = 'SELECT * FROM timeline_jobs WHERE user_id = ?';
    const params: string[] = [user.id];

    if (timelineId) {
      query += ' AND timeline_id = ?';
      params.push(timelineId);
    }

    query += ' ORDER BY created_at DESC LIMIT 50';

    const jobs = await c.env.DB.prepare(query).bind(...params).all<Job>();

    return c.json({
      success: true,
      data: jobs.results || [],
    });
  } catch (error) {
    console.error('List jobs error:', error);
    return c.json({ success: false, error: 'Failed to list jobs' }, 500);
  }
});

// ==================== MODEL REGISTRY ENDPOINTS ====================

// GET /models - List available models
timelineRoutes.get('/models', async (c) => {
  try {
    const models = await c.env.DB.prepare(`
      SELECT * FROM video_models WHERE is_active = 1 ORDER BY priority DESC, display_name ASC
    `).all();

    // If no models in DB, return hardcoded defaults
    if (!models.results || models.results.length === 0) {
      return c.json({
        success: true,
        data: getDefaultModels(),
      });
    }

    return c.json({
      success: true,
      data: models.results,
    });
  } catch (error) {
    console.error('List models error:', error);
    // Return hardcoded defaults on error
    return c.json({
      success: true,
      data: getDefaultModels(),
    });
  }
});

// GET /models/:modelId - Get model details
timelineRoutes.get('/models/:modelId', async (c) => {
  try {
    const modelId = c.req.param('modelId');

    const model = await c.env.DB.prepare(`
      SELECT * FROM video_models WHERE id = ?
    `).bind(modelId).first();

    if (!model) {
      // Check hardcoded defaults
      const defaults = getDefaultModels();
      const defaultModel = defaults.find((m: any) => m.id === modelId);
      if (defaultModel) {
        return c.json({ success: true, data: defaultModel });
      }
      return c.json({ success: false, error: 'Model not found' }, 404);
    }

    return c.json({
      success: true,
      data: model,
    });
  } catch (error) {
    console.error('Get model error:', error);
    return c.json({ success: false, error: 'Failed to get model' }, 500);
  }
});

// ==================== HELPER FUNCTIONS ====================

async function updateTimelineDuration(db: D1Database, timelineId: string) {
  const result = await db.prepare(`
    SELECT COALESCE(SUM(duration_sec), 0) as total FROM timeline_segments WHERE timeline_id = ?
  `).bind(timelineId).first<{ total: number }>();

  await db.prepare(`
    UPDATE timelines SET total_duration_sec = ?, updated_at = ? WHERE id = ?
  `).bind(result?.total || 0, new Date().toISOString(), timelineId).run();
}

function getDefaultModels() {
  return [
    {
      id: 'kling-2.5-i2v-pro',
      display_name: 'Kling 2.5 Pro',
      provider: 'kling',
      max_duration_sec: 10,
      min_duration_sec: 2,
      supports_first_frame: true,
      supports_last_frame: true,
      supports_negative_prompt: true,
      resolution: '1080p',
      priority: 'high',
      cost_per_second: 5,
      quality_score: 9,
      is_preview_model: false,
      is_active: true,
    },
    {
      id: 'wan-2.5-i2v',
      display_name: 'Wan 2.5 I2V',
      provider: 'replicate',
      max_duration_sec: 5,
      min_duration_sec: 1,
      supports_first_frame: true,
      supports_last_frame: true,
      supports_negative_prompt: true,
      resolution: '720p',
      priority: 'standard',
      cost_per_second: 3,
      quality_score: 8,
      is_preview_model: false,
      is_active: true,
    },
    {
      id: 'wan-2.5-i2v-fast',
      display_name: 'Wan 2.5 Fast (Preview)',
      provider: 'replicate',
      max_duration_sec: 4,
      min_duration_sec: 1,
      supports_first_frame: true,
      supports_last_frame: false,
      supports_negative_prompt: true,
      resolution: '480p',
      priority: 'preview',
      cost_per_second: 1,
      quality_score: 5,
      is_preview_model: true,
      is_active: true,
    },
    {
      id: 'runway-gen3',
      display_name: 'Runway Gen-3 Alpha',
      provider: 'runway',
      max_duration_sec: 10,
      min_duration_sec: 4,
      supports_first_frame: true,
      supports_last_frame: true,
      supports_negative_prompt: true,
      resolution: '1080p',
      priority: 'high',
      cost_per_second: 8,
      quality_score: 10,
      is_preview_model: false,
      is_active: true,
    },
    {
      id: 'luma-dream-machine',
      display_name: 'Luma Dream Machine',
      provider: 'luma',
      max_duration_sec: 5,
      min_duration_sec: 2,
      supports_first_frame: true,
      supports_last_frame: true,
      supports_negative_prompt: true,
      resolution: '1080p',
      priority: 'high',
      cost_per_second: 6,
      quality_score: 9,
      is_preview_model: false,
      is_active: true,
    },
    {
      id: 'stable-video-diffusion',
      display_name: 'Stable Video Diffusion',
      provider: 'stability',
      max_duration_sec: 4,
      min_duration_sec: 2,
      supports_first_frame: true,
      supports_last_frame: false,
      supports_negative_prompt: false,
      resolution: '1024x576',
      priority: 'standard',
      cost_per_second: 2,
      quality_score: 6,
      is_preview_model: false,
      is_active: true,
    },
    {
      id: 'animatediff-lightning',
      display_name: 'AnimateDiff Lightning (Preview)',
      provider: 'replicate',
      max_duration_sec: 3,
      min_duration_sec: 1,
      supports_first_frame: true,
      supports_last_frame: false,
      supports_negative_prompt: true,
      resolution: '480p',
      priority: 'preview',
      cost_per_second: 0.5,
      quality_score: 4,
      is_preview_model: true,
      is_active: true,
    },
  ];
}

export default timelineRoutes;
