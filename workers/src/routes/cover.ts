/**
 * Cover Generation Routes
 * API endpoints for AI-powered thumbnail/cover generation
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import coverService from '../services/coverService';
import { PublishPlatform } from '../types/gallery';
import { getApiKey } from '../services/apiKeyManager';

type Variables = {
  user: User;
};

export const coverRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== TEMPLATE ENDPOINTS ====================

// GET /cover/templates - Get all channel templates
coverRoutes.get('/cover/templates', async (c) => {
  const templates = Object.values(coverService.CHANNEL_TEMPLATES).map(t => ({
    id: t.id,
    platform: t.platform,
    name: t.name,
    aspect_ratio: t.aspect_ratio,
    width: t.width,
    height: t.height,
    style: t.style,
  }));

  return c.json({
    success: true,
    data: templates,
  });
});

// GET /cover/templates/:platform - Get template for specific platform
coverRoutes.get('/cover/templates/:platform', async (c) => {
  const platform = c.req.param('platform') as PublishPlatform;
  const template = coverService.CHANNEL_TEMPLATES[platform];

  if (!template) {
    return c.json({ success: false, error: 'Template not found' }, 404);
  }

  return c.json({
    success: true,
    data: template,
  });
});

// ==================== GENERATION ENDPOINTS ====================

// POST /cover/generate - Generate cover variants for platforms
coverRoutes.post('/cover/generate', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const {
      project_id,
      scenario,
      video_plan,
      platforms,
      style_override,
      num_variants,
    } = body;

    if (!project_id || !scenario || !platforms || platforms.length === 0) {
      return c.json({
        success: false,
        error: 'project_id, scenario, and platforms are required',
      }, 400);
    }

    // Extract info from scenario
    const scenarioInfo = coverService.extractScenarioInfo(scenario);

    // Generate covers
    const replicateKey = await getApiKey(c.env, 'replicate');
    const result = await coverService.generateCovers(
      {
        project_id,
        scenario_summary: scenarioInfo.summary,
        main_characters: scenarioInfo.characters,
        visual_style: style_override || 'cinematic',
        key_scene: scenarioInfo.key_scene,
        dominant_colors: scenarioInfo.colors,
        emotional_tone: scenarioInfo.emotions[0] || 'dramatic',
        platforms,
      },
      replicateKey || undefined
    );

    return c.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Cover generation error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cover/generate-prompt - Generate cover prompt without image
coverRoutes.post('/cover/generate-prompt', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { scenario, platform, style } = body;

    if (!scenario || !platform) {
      return c.json({
        success: false,
        error: 'scenario and platform are required',
      }, 400);
    }

    const template = coverService.CHANNEL_TEMPLATES[platform as PublishPlatform];
    if (!template) {
      return c.json({ success: false, error: 'Invalid platform' }, 400);
    }

    const scenarioInfo = coverService.extractScenarioInfo(scenario);
    const prompt = coverService.buildCoverPrompt(
      {
        project_id: '',
        scenario_summary: scenarioInfo.summary,
        main_characters: scenarioInfo.characters,
        visual_style: style || 'cinematic',
        key_scene: scenarioInfo.key_scene,
        dominant_colors: scenarioInfo.colors,
        emotional_tone: scenarioInfo.emotions[0] || 'dramatic',
        platforms: [platform as PublishPlatform],
      },
      template
    );

    return c.json({
      success: true,
      data: {
        prompt,
        platform,
        template_id: template.id,
        dimensions: { width: template.width, height: template.height },
      },
    });
  } catch (error: any) {
    console.error('Generate prompt error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cover/apply-template - Apply channel template to existing image
coverRoutes.post('/cover/apply-template', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { cover_url, platform, title, add_text_overlay } = body;

    if (!cover_url || !platform) {
      return c.json({
        success: false,
        error: 'cover_url and platform are required',
      }, 400);
    }

    const template = coverService.CHANNEL_TEMPLATES[platform as PublishPlatform];
    if (!template) {
      return c.json({ success: false, error: 'Invalid platform' }, 400);
    }

    // In production, this would resize/crop the image and add overlays
    // For now, return the original URL with template info
    return c.json({
      success: true,
      data: {
        url: cover_url,
        platform,
        template_applied: template.id,
        dimensions: { width: template.width, height: template.height },
        text_overlay_added: add_text_overlay && title,
      },
    });
  } catch (error: any) {
    console.error('Apply template error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cover/select - Select best variant
coverRoutes.post('/cover/select', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { variant_set_id, variant_id, auto_select } = body;

    if (!variant_set_id) {
      return c.json({ success: false, error: 'variant_set_id is required' }, 400);
    }

    // Would update in database
    // If auto_select, use autoSelectBestCover function

    return c.json({
      success: true,
      data: {
        variant_set_id,
        selected_variant_id: variant_id || 'auto-selected',
        auto_selected: auto_select || false,
      },
    });
  } catch (error: any) {
    console.error('Select variant error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PUBLISHED GALLERY ENDPOINTS ====================

// GET /gallery/published - List all published items
coverRoutes.get('/gallery/published', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { platform, limit = '20', offset = '0' } = c.req.query();

    // Would query from database
    const publishedItems: any[] = [];

    return c.json({
      success: true,
      data: {
        items: publishedItems,
        total: 0,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error: any) {
    console.error('List published error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /gallery/published/:id - Get published item details
coverRoutes.get('/gallery/published/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');

    // Would query from database
    return c.json({
      success: true,
      data: null,
    });
  } catch (error: any) {
    console.error('Get published item error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /gallery/published - Save published item
coverRoutes.post('/gallery/published', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();

    const {
      project_id,
      video_url,
      title,
      description,
      cover_images,
      scenario,
      platforms,
      publish_jobs,
    } = body;

    if (!project_id || !video_url || !title) {
      return c.json({
        success: false,
        error: 'project_id, video_url, and title are required',
      }, 400);
    }

    const publishedItem = coverService.createPublishedItem(
      {
        project_id,
        video_url,
        title,
        description: description || '',
        cover_images: cover_images || {},
        scenario: scenario || '',
        platforms: platforms || [],
        publish_jobs: publish_jobs || [],
      },
      user.id
    );

    // Would save to database

    return c.json({
      success: true,
      data: publishedItem,
    });
  } catch (error: any) {
    console.error('Save published item error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /gallery/published/:id - Update published item
coverRoutes.patch('/gallery/published/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');
    const updates = await c.req.json();

    // Would update in database

    return c.json({
      success: true,
      data: { id: itemId, ...updates },
    });
  } catch (error: any) {
    console.error('Update published item error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /gallery/published/:id - Delete published item
coverRoutes.delete('/gallery/published/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');

    // Would delete from database

    return c.json({
      success: true,
      message: 'Published item deleted',
    });
  } catch (error: any) {
    console.error('Delete published item error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /gallery/published/:id/restore - Restore as new project
coverRoutes.post('/gallery/published/:id/restore', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');

    // Would:
    // 1. Fetch published item
    // 2. Create new project from scenario
    // 3. Copy settings
    // 4. Return new project

    return c.json({
      success: true,
      data: {
        new_project_id: `proj-${Date.now()}`,
        source_published_id: itemId,
      },
    });
  } catch (error: any) {
    console.error('Restore as project error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /gallery/published/:id/republish - Re-publish to platforms
coverRoutes.post('/gallery/published/:id/republish', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');
    const body = await c.req.json();
    const { platforms, regenerate_covers } = body;

    // Would:
    // 1. Fetch published item
    // 2. Optionally regenerate covers
    // 3. Create new publish jobs
    // 4. Queue for publishing

    return c.json({
      success: true,
      data: {
        published_id: itemId,
        new_publish_jobs: [],
        covers_regenerated: regenerate_covers || false,
      },
    });
  } catch (error: any) {
    console.error('Republish error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /gallery/published/:id/download - Download all assets
coverRoutes.get('/gallery/published/:id/download', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const itemId = c.req.param('id');

    // Would generate download URLs for:
    // - Video file
    // - All cover variants
    // - Metadata JSON
    // - Scenario text

    return c.json({
      success: true,
      data: {
        download_urls: {
          video: null,
          covers: {},
          metadata: null,
          scenario: null,
        },
      },
    });
  } catch (error: any) {
    console.error('Download assets error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default coverRoutes;
