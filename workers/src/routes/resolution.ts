/**
 * Resolution & Aspect Ratio Routes
 * API endpoints for video dimensions and platform profiles
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { Database, Cache } from '../db/index';
import resolutionService, {
  ASPECT_RATIOS,
  RESOLUTIONS,
  getPresetDimensions,
  getOrientation,
  getOrientationPromptSuffix,
  getFramingSuggestions,
  PlatformProfileService,
  AspectRatio,
  Resolution,
} from '../services/resolutionService';

type Variables = {
  user: User;
};

export const resolutionRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== ASPECT RATIO ENDPOINTS ====================

// GET /resolution/aspects - Get all aspect ratio options
resolutionRoutes.get('/resolution/aspects', async (c) => {
  return c.json({
    success: true,
    data: ASPECT_RATIOS,
  });
});

// GET /resolution/resolutions - Get all resolution options
resolutionRoutes.get('/resolution/resolutions', async (c) => {
  return c.json({
    success: true,
    data: RESOLUTIONS,
  });
});

// GET /resolution/dimensions/:resolution/:aspect - Calculate dimensions
resolutionRoutes.get('/resolution/dimensions/:resolution/:aspect', async (c) => {
  try {
    const resolution = c.req.param('resolution') as Resolution;
    const aspect = c.req.param('aspect').replace('x', ':') as AspectRatio;

    const dimensions = getPresetDimensions(resolution, aspect);
    const orientation = getOrientation(aspect);

    return c.json({
      success: true,
      data: {
        ...dimensions,
        aspectRatio: aspect,
        resolution,
        orientation,
        displayName: `${dimensions.width}×${dimensions.height}`,
      },
    });
  } catch (error: any) {
    console.error('Get dimensions error:', error);
    return c.json({ success: false, error: error.message }, 400);
  }
});

// GET /resolution/all-combinations - Get all resolution/aspect combinations
resolutionRoutes.get('/resolution/all-combinations', async (c) => {
  const combinations = [];

  for (const res of RESOLUTIONS) {
    for (const aspect of ASPECT_RATIOS) {
      const dimensions = getPresetDimensions(res.id, aspect.id);
      combinations.push({
        resolution: res.id,
        resolutionName: res.name,
        aspectRatio: aspect.id,
        aspectName: aspect.name,
        orientation: aspect.orientation,
        width: dimensions.width,
        height: dimensions.height,
        displayName: `${dimensions.width}×${dimensions.height}`,
        useCases: aspect.useCases,
      });
    }
  }

  return c.json({
    success: true,
    data: combinations,
  });
});

// ==================== PLATFORM PROFILE ENDPOINTS ====================

// GET /resolution/platforms - Get all platform profiles
resolutionRoutes.get('/resolution/platforms', async (c) => {
  try {
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const profileService = new PlatformProfileService(db, cache);

    const profiles = await profileService.getAll();

    return c.json({
      success: true,
      data: profiles,
    });
  } catch (error: any) {
    console.error('Get platforms error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /resolution/platforms/:platform - Get platform profile
resolutionRoutes.get('/resolution/platforms/:platform', async (c) => {
  try {
    const platform = c.req.param('platform');
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const profileService = new PlatformProfileService(db, cache);

    const profile = await profileService.getByPlatform(platform);

    if (!profile) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }

    // Get recommended dimensions
    const recommendedDimensions = getPresetDimensions(
      profile.max_resolution,
      profile.recommended_aspect
    );

    return c.json({
      success: true,
      data: {
        ...profile,
        recommendedDimensions,
      },
    });
  } catch (error: any) {
    console.error('Get platform error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /resolution/platforms/:platform/check/:aspect - Check if aspect supported
resolutionRoutes.get('/resolution/platforms/:platform/check/:aspect', async (c) => {
  try {
    const platform = c.req.param('platform');
    const aspect = c.req.param('aspect').replace('x', ':') as AspectRatio;
    
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const profileService = new PlatformProfileService(db, cache);

    const supported = await profileService.isAspectSupported(platform, aspect);
    const recommended = await profileService.getRecommendedAspect(platform);

    return c.json({
      success: true,
      data: {
        platform,
        aspectRatio: aspect,
        supported,
        isRecommended: aspect === recommended,
        recommendedAspect: recommended,
      },
    });
  } catch (error: any) {
    console.error('Check aspect error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /resolution/for-aspect/:aspect - Get platforms supporting aspect ratio
resolutionRoutes.get('/resolution/for-aspect/:aspect', async (c) => {
  try {
    const aspect = c.req.param('aspect').replace('x', ':') as AspectRatio;
    
    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const profileService = new PlatformProfileService(db, cache);

    const platforms = await profileService.getPlatformsForAspect(aspect);

    return c.json({
      success: true,
      data: {
        aspectRatio: aspect,
        orientation: getOrientation(aspect),
        platforms: platforms.map(p => ({
          platform: p.platform,
          displayName: p.display_name,
          isRecommended: p.recommended_aspect === aspect,
        })),
      },
    });
  } catch (error: any) {
    console.error('Get platforms for aspect error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PROMPT HELPER ENDPOINTS ====================

// GET /resolution/prompt-suffix/:aspect - Get orientation prompt suffix
resolutionRoutes.get('/resolution/prompt-suffix/:aspect', async (c) => {
  const aspect = c.req.param('aspect').replace('x', ':') as AspectRatio;
  const suffix = getOrientationPromptSuffix(aspect);
  const suggestions = getFramingSuggestions(aspect);

  return c.json({
    success: true,
    data: {
      aspectRatio: aspect,
      orientation: getOrientation(aspect),
      promptSuffix: suffix,
      framingSuggestions: suggestions,
    },
  });
});

// ==================== TIMELINE ASPECT RATIO ENDPOINTS ====================

// PUT /resolution/timeline/:timelineId - Update timeline aspect ratio
resolutionRoutes.put('/resolution/timeline/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');
    const body = await c.req.json();
    const { target_resolution, aspect_ratio } = body;

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Calculate dimensions
    const resolution = (target_resolution || '1080p') as Resolution;
    const aspect = (aspect_ratio || '16:9') as AspectRatio;
    const dimensions = getPresetDimensions(resolution, aspect);
    const orientation = getOrientation(aspect);

    // Update timeline
    await c.env.DB.prepare(`
      UPDATE timelines SET
        target_resolution = ?,
        aspect_ratio = ?,
        output_width = ?,
        output_height = ?,
        orientation = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      resolution,
      aspect,
      dimensions.width,
      dimensions.height,
      orientation,
      new Date().toISOString(),
      timelineId
    ).run();

    return c.json({
      success: true,
      data: {
        timelineId,
        targetResolution: resolution,
        aspectRatio: aspect,
        outputWidth: dimensions.width,
        outputHeight: dimensions.height,
        orientation,
        displayName: `${dimensions.width}×${dimensions.height}`,
      },
    });
  } catch (error: any) {
    console.error('Update timeline aspect error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /resolution/timeline/:timelineId - Get timeline resolution settings
resolutionRoutes.get('/resolution/timeline/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const timeline = await c.env.DB.prepare(`
      SELECT id, target_resolution, aspect_ratio, output_width, output_height, orientation
      FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first<{
      id: string;
      target_resolution: string;
      aspect_ratio: string;
      output_width: number;
      output_height: number;
      orientation: string;
    }>();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Ensure dimensions are set
    if (!timeline.output_width || !timeline.output_height) {
      const resolution = (timeline.target_resolution || '1080p') as Resolution;
      const aspect = (timeline.aspect_ratio || '16:9') as AspectRatio;
      const dimensions = getPresetDimensions(resolution, aspect);
      
      timeline.output_width = dimensions.width;
      timeline.output_height = dimensions.height;
      timeline.orientation = getOrientation(aspect);
    }

    return c.json({
      success: true,
      data: {
        timelineId: timeline.id,
        targetResolution: timeline.target_resolution || '1080p',
        aspectRatio: timeline.aspect_ratio || '16:9',
        outputWidth: timeline.output_width,
        outputHeight: timeline.output_height,
        orientation: timeline.orientation,
        displayName: `${timeline.output_width}×${timeline.output_height}`,
      },
    });
  } catch (error: any) {
    console.error('Get timeline aspect error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /resolution/timeline/:timelineId/suggest - Suggest aspect for platform
resolutionRoutes.post('/resolution/timeline/:timelineId/suggest', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');
    const body = await c.req.json();
    const { platform } = body;

    // Verify ownership
    const timeline = await c.env.DB.prepare(`
      SELECT id, target_resolution FROM timelines WHERE id = ? AND user_id = ?
    `).bind(timelineId, user.id).first<{ id: string; target_resolution: string }>();

    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const db = new Database(c.env.DB);
    const cache = new Cache(c.env.CACHE);
    const profileService = new PlatformProfileService(db, cache);

    const profile = await profileService.getByPlatform(platform);
    
    if (!profile) {
      return c.json({ success: false, error: 'Platform not found' }, 404);
    }

    // Calculate suggested dimensions
    const resolution = (timeline.target_resolution || '1080p') as Resolution;
    const suggestedAspect = profile.recommended_aspect;
    const dimensions = getPresetDimensions(resolution, suggestedAspect);

    return c.json({
      success: true,
      data: {
        platform: profile.platform,
        platformName: profile.display_name,
        suggestedAspectRatio: suggestedAspect,
        suggestedDimensions: {
          width: dimensions.width,
          height: dimensions.height,
          displayName: `${dimensions.width}×${dimensions.height}`,
        },
        supportedAspects: profile.supported_aspects,
        maxResolution: profile.max_resolution,
        maxDurationSec: profile.max_duration_sec,
      },
    });
  } catch (error: any) {
    console.error('Suggest aspect error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default resolutionRoutes;
