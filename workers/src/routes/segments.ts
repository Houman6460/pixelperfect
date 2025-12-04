/**
 * Segment Generation Routes
 * API endpoints for multi-mode segment generation with frame chaining
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { Database, Storage } from '../db/index';
import { SegmentRepository, TimelineRepository } from '../db/repositories';
import {
  SegmentGenerationService,
  validateGenerationMode,
  getAvailableModes,
  GenerationMode,
} from '../services/segmentGeneration';

type Variables = {
  user: User;
};

export const segmentRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== GET ENDPOINTS ====================

// GET /segments/modes - Get available generation modes
segmentRoutes.get('/segments/modes', async (c) => {
  return c.json({
    success: true,
    data: {
      modes: [
        {
          id: 'text-to-video',
          name: 'Text to Video',
          description: 'Generate video from a text prompt only',
          availableFor: 'first_segment',
          requiresInput: ['prompt'],
        },
        {
          id: 'image-to-video',
          name: 'Image to Video',
          description: 'Generate video from an image and prompt',
          availableFor: 'all',
          requiresInput: ['prompt', 'image'],
          default: true,
        },
        {
          id: 'video-to-video',
          name: 'Video to Video',
          description: 'Transform an existing video with a prompt',
          availableFor: 'first_segment',
          requiresInput: ['prompt', 'video'],
        },
        {
          id: 'first-frame-to-video',
          name: 'First Frame to Video',
          description: 'Use an image as the exact first frame',
          availableFor: 'first_segment',
          requiresInput: ['prompt', 'image'],
        },
      ],
    },
  });
});

// GET /segments/modes/:position - Get available modes for a position
segmentRoutes.get('/segments/modes/:position', async (c) => {
  const position = parseInt(c.req.param('position'));
  const modes = getAvailableModes(position);

  return c.json({
    success: true,
    data: {
      position,
      availableModes: modes,
      isFirstSegment: position === 0,
      frameChaining: position > 0,
    },
  });
});

// GET /segments/:timelineId - Get all segments for a timeline
segmentRoutes.get('/segments/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline belongs to user
    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const segments = await segmentRepo.getByTimeline(timelineId);

    // Enrich with mode info
    const enrichedSegments = segments.map((seg, idx) => ({
      ...seg,
      availableModes: getAvailableModes(idx),
      isFirstSegment: idx === 0,
      frameChaining: idx > 0,
      previousSegmentId: idx > 0 ? segments[idx - 1].id : null,
    }));

    return c.json({
      success: true,
      data: {
        timelineId,
        segments: enrichedSegments,
        total: segments.length,
      },
    });
  } catch (error: any) {
    console.error('Get segments error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== POST ENDPOINTS ====================

// POST /segments/validate - Validate generation mode for position
segmentRoutes.post('/segments/validate', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { position, mode } = body;

    const validation = validateGenerationMode(position, mode as GenerationMode);

    return c.json({
      success: true,
      data: validation,
    });
  } catch (error: any) {
    console.error('Validate mode error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /segments/create - Create a new segment
segmentRoutes.post('/segments/create', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      timeline_id,
      position,
      duration_sec,
      model_id,
      generation_mode,
      prompt_text,
      source_url,
      motion_profile,
      camera_path,
      transition_type,
    } = body;

    if (!timeline_id || position === undefined || !model_id) {
      return c.json({
        success: false,
        error: 'timeline_id, position, and model_id are required',
      }, 400);
    }

    // Validate mode
    const mode = (generation_mode || 'image-to-video') as GenerationMode;
    const validation = validateGenerationMode(position, mode);
    if (!validation.valid) {
      return c.json({
        success: false,
        error: validation.error,
      }, 400);
    }

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline belongs to user
    const timeline = await timelineRepo.getById(timeline_id, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Create segment
    const segmentId = await segmentRepo.create({
      timelineId: timeline_id,
      position,
      durationSec: duration_sec || 5,
      modelId: model_id,
      promptText: prompt_text,
      motionProfile: motion_profile,
      cameraPath: camera_path,
      transitionType: transition_type,
    });

    // Update with generation mode
    await db.execute(
      `UPDATE segments SET 
        generation_mode = ?,
        is_first_segment = ?,
        source_url = ?
      WHERE id = ?`,
      [mode, position === 0 ? 1 : 0, source_url || null, segmentId]
    );

    // Update timeline segment count
    const segments = await segmentRepo.getByTimeline(timeline_id);
    await timelineRepo.update(timeline_id, user.id, {
      segmentCount: segments.length,
      totalDurationSec: segments.reduce((sum, s) => sum + s.duration_sec, 0),
    });

    const segment = await segmentRepo.getById(segmentId);

    return c.json({
      success: true,
      data: {
        segment,
        availableModes: getAvailableModes(position),
      },
    });
  } catch (error: any) {
    console.error('Create segment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /segments/:id/generate - Generate a segment
segmentRoutes.post('/segments/:id/generate', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const segmentId = c.req.param('id');
    const body = await c.req.json();
    const { override_mode, override_source_url, override_prompt } = body;

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const segmentRepo = new SegmentRepository(db);

    const segment = await segmentRepo.getById(segmentId);
    if (!segment) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    // Get previous segment's last frame for chaining
    let previousLastFrameUrl: string | null = null;
    if (segment.position > 0) {
      const segments = await segmentRepo.getByTimeline(segment.timeline_id);
      const prevSegment = segments.find(s => s.position === segment.position - 1);
      if (prevSegment?.last_frame_url) {
        previousLastFrameUrl = prevSegment.last_frame_url;
      }
    }

    // Update status to generating
    await segmentRepo.update(segmentId, { status: 'generating' });

    // In production, this would call the actual video generation API
    // For now, return a mock response
    const mockResult = {
      segmentId,
      videoUrl: `https://media.pixelperfect.ai/segments/${user.id}/${segment.timeline_id}/${segmentId}.mp4`,
      firstFrameUrl: `https://media.pixelperfect.ai/frames/${user.id}/${segment.timeline_id}/${segmentId}_first.jpg`,
      lastFrameUrl: `https://media.pixelperfect.ai/frames/${user.id}/${segment.timeline_id}/${segmentId}_last.jpg`,
      thumbnailUrl: `https://media.pixelperfect.ai/thumbnails/${user.id}/${segment.timeline_id}/${segmentId}.jpg`,
      generationTimeSec: 30,
      success: true,
      generationMode: override_mode || segment.generation_mode || 'image-to-video',
      frameChained: segment.position > 0,
      previousFrameUsed: previousLastFrameUrl,
    };

    // Update segment with results
    await segmentRepo.update(segmentId, {
      videoUrl: mockResult.videoUrl,
      firstFrameUrl: mockResult.firstFrameUrl,
      lastFrameUrl: mockResult.lastFrameUrl,
      thumbnailUrl: mockResult.thumbnailUrl,
      status: 'generated',
      generationTimeSec: mockResult.generationTimeSec,
    });

    return c.json({
      success: true,
      data: mockResult,
    });
  } catch (error: any) {
    console.error('Generate segment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /segments/:id/update-mode - Update generation mode
segmentRoutes.post('/segments/:id/update-mode', authMiddleware(), async (c) => {
  try {
    const segmentId = c.req.param('id');
    const body = await c.req.json();
    const { generation_mode, source_url } = body;

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);

    const segment = await segmentRepo.getById(segmentId);
    if (!segment) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    // Validate mode change
    const validation = validateGenerationMode(
      segment.position,
      generation_mode as GenerationMode
    );
    if (!validation.valid) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    // Update mode
    await db.execute(
      `UPDATE segments SET generation_mode = ?, source_url = ?, updated_at = ? WHERE id = ?`,
      [generation_mode, source_url || null, new Date().toISOString(), segmentId]
    );

    const updated = await segmentRepo.getById(segmentId);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update mode error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /segments/generate-timeline - Generate all segments
segmentRoutes.post('/segments/generate-timeline', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { timeline_id, first_segment_mode, first_segment_source } = body;

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline
    const timeline = await timelineRepo.getById(timeline_id, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get segments
    const segments = await segmentRepo.getByTimeline(timeline_id);
    if (segments.length === 0) {
      return c.json({ success: false, error: 'No segments in timeline' }, 400);
    }

    // Update timeline status
    await timelineRepo.update(timeline_id, user.id, { status: 'generating' });

    // Generate each segment (in production, this would be async)
    const results = [];
    let previousLastFrameUrl: string | null = null;

    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const isFirst = i === 0;

      // Determine mode
      const mode = isFirst
        ? (first_segment_mode || seg.generation_mode || 'image-to-video')
        : 'image-to-video';

      // Mock generation result
      const result: {
        segmentId: string;
        position: number;
        generationMode: string;
        videoUrl: string;
        lastFrameUrl: string;
        frameChained: boolean;
        previousFrameUsed: string | null;
        success: boolean;
      } = {
        segmentId: seg.id,
        position: seg.position,
        generationMode: mode,
        videoUrl: `https://media.pixelperfect.ai/segments/${user.id}/${timeline_id}/${seg.id}.mp4`,
        lastFrameUrl: `https://media.pixelperfect.ai/frames/${user.id}/${timeline_id}/${seg.id}_last.jpg`,
        frameChained: !isFirst,
        previousFrameUsed: previousLastFrameUrl,
        success: true,
      };

      // Update segment
      await segmentRepo.update(seg.id, {
        videoUrl: result.videoUrl,
        lastFrameUrl: result.lastFrameUrl,
        status: 'generated',
      });

      // Store for next segment
      previousLastFrameUrl = result.lastFrameUrl;
      results.push(result);
    }

    // Update timeline status
    await timelineRepo.update(timeline_id, user.id, { status: 'ready' });

    return c.json({
      success: true,
      data: {
        timelineId: timeline_id,
        segmentsGenerated: results.length,
        results,
        frameChaining: {
          enabled: true,
          firstSegmentMode: first_segment_mode || segments[0]?.generation_mode,
        },
      },
    });
  } catch (error: any) {
    console.error('Generate timeline error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PATCH/DELETE ENDPOINTS ====================

// PATCH /segments/:id - Update segment
segmentRoutes.patch('/segments/:id', authMiddleware(), async (c) => {
  try {
    const segmentId = c.req.param('id');
    const body = await c.req.json();

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);

    const segment = await segmentRepo.getById(segmentId);
    if (!segment) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    await segmentRepo.update(segmentId, {
      promptText: body.prompt_text,
      finalPromptText: body.final_prompt_text,
      dialogue: body.dialogue,
      motionProfile: body.motion_profile,
      cameraPath: body.camera_path,
      transitionType: body.transition_type,
    });

    const updated = await segmentRepo.getById(segmentId);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update segment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /segments/:id - Delete segment
segmentRoutes.delete('/segments/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const segmentId = c.req.param('id');

    const db = new Database(c.env.DB);
    const segmentRepo = new SegmentRepository(db);

    const segment = await segmentRepo.getById(segmentId);
    if (!segment) {
      return c.json({ success: false, error: 'Segment not found' }, 404);
    }

    // Delete segment
    await db.execute('DELETE FROM segments WHERE id = ?', [segmentId]);

    // Reorder remaining segments
    await db.execute(
      `UPDATE segments SET position = position - 1, is_first_segment = CASE WHEN position = 1 THEN 1 ELSE 0 END
       WHERE timeline_id = ? AND position > ?`,
      [segment.timeline_id, segment.position]
    );

    return c.json({
      success: true,
      message: 'Segment deleted',
    });
  } catch (error: any) {
    console.error('Delete segment error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default segmentRoutes;
