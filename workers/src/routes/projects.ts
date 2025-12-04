/**
 * Projects & Gallery Routes
 * API endpoints for managing video projects and publishing
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateMetadata, generateChapters, generateThumbnailPrompt } from '../services/galleryService';
import publishingService from '../services/publishingService';
import { getApiKey } from '../services/apiKeyManager';
const {
  createPublishJob,
  formatDescriptionWithHashtags,
  buildYouTubeDescription,
  checkRateLimit,
  PLATFORM_CONFIG,
} = publishingService;
import { PublishPlatform } from '../types/gallery';

type Variables = {
  user: User;
};

export const projectRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== PROJECT ENDPOINTS ====================

// GET /projects - List user's projects
projectRoutes.get('/projects', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { folder_id, status, search, limit = '20', offset = '0' } = c.req.query();

    // Mock data for now - would query D1 database
    const projects = [
      {
        id: 'proj-1',
        title: 'Sample Project',
        description: 'A sample video project',
        status: 'completed',
        thumbnail_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    return c.json({
      success: true,
      data: {
        projects,
        total: projects.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
    });
  } catch (error: any) {
    console.error('List projects error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /projects - Create new project
projectRoutes.post('/projects', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { title, description, scenario, folder_id, tags } = body;

    if (!title) {
      return c.json({ success: false, error: 'Title is required' }, 400);
    }

    const project = {
      id: `proj-${Date.now()}`,
      user_id: user.id,
      title,
      description,
      original_scenario: scenario,
      folder_id,
      tags: tags || [],
      is_favorite: false,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Would insert into D1 database
    
    return c.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Create project error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /projects/:id - Get project details
projectRoutes.get('/projects/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');

    // Would query D1 database
    const project = {
      id: projectId,
      user_id: user.id,
      title: 'Sample Project',
      status: 'draft',
      created_at: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: project,
    });
  } catch (error: any) {
    console.error('Get project error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// PATCH /projects/:id - Update project
projectRoutes.patch('/projects/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');
    const updates = await c.req.json();

    // Would update in D1 database
    
    return c.json({
      success: true,
      data: { id: projectId, ...updates, updated_at: new Date().toISOString() },
    });
  } catch (error: any) {
    console.error('Update project error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /projects/:id - Delete project
projectRoutes.delete('/projects/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');

    // Would delete from D1 database
    
    return c.json({
      success: true,
      message: 'Project deleted',
    });
  } catch (error: any) {
    console.error('Delete project error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== METADATA ENDPOINTS ====================

// POST /projects/:id/generate-metadata - Generate AI metadata
projectRoutes.post('/projects/:id/generate-metadata', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const projectId = c.req.param('id');
    const body = await c.req.json();
    const { scenario, style, target_platforms } = body;

    if (!scenario) {
      return c.json({ success: false, error: 'Scenario is required' }, 400);
    }

    const openaiKey = await getApiKey(c.env, 'openai');
    const metadata = await generateMetadata(
      { project_id: projectId, scenario, style, target_platforms },
      openaiKey || undefined
    );

    return c.json({
      success: true,
      data: metadata,
    });
  } catch (error: any) {
    console.error('Generate metadata error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /projects/:id/generate-thumbnail-prompt - Generate thumbnail prompt
projectRoutes.post('/projects/:id/generate-thumbnail-prompt', authMiddleware(), async (c) => {
  try {
    const body = await c.req.json();
    const { scenario, style } = body;

    if (!scenario) {
      return c.json({ success: false, error: 'Scenario is required' }, 400);
    }

    const prompt = generateThumbnailPrompt(scenario, style);

    return c.json({
      success: true,
      data: { prompt },
    });
  } catch (error: any) {
    console.error('Generate thumbnail prompt error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== FOLDER ENDPOINTS ====================

// GET /folders - List folders
projectRoutes.get('/folders', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');

    // Would query D1 database
    const folders = [
      { id: 'folder-1', name: 'My Videos', project_count: 5 },
      { id: 'folder-2', name: 'Drafts', project_count: 3 },
    ];

    return c.json({
      success: true,
      data: folders,
    });
  } catch (error: any) {
    console.error('List folders error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /folders - Create folder
projectRoutes.post('/folders', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const { name, description, color, icon, parent_id } = body;

    if (!name) {
      return c.json({ success: false, error: 'Name is required' }, 400);
    }

    const folder = {
      id: `folder-${Date.now()}`,
      user_id: user.id,
      name,
      description,
      color,
      icon,
      parent_id,
      project_count: 0,
      created_at: new Date().toISOString(),
    };

    return c.json({
      success: true,
      data: folder,
    });
  } catch (error: any) {
    console.error('Create folder error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== PUBLISHING ENDPOINTS ====================

// GET /publishing/platforms - Get available platforms
projectRoutes.get('/publishing/platforms', async (c) => {
  const platforms = Object.entries(PLATFORM_CONFIG).map(([id, config]) => ({
    id,
    name: config.name,
    maxTitleLength: config.maxTitleLength,
    maxDescriptionLength: config.maxDescriptionLength,
    maxTags: config.maxTags,
    maxHashtags: config.maxHashtags,
    supportsChapters: config.supportsChapters,
    supportsScheduling: config.supportsScheduling,
  }));

  return c.json({
    success: true,
    data: platforms,
  });
});

// GET /publishing/connected - Get user's connected platforms
projectRoutes.get('/publishing/connected', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');

    // Would query D1 database for platform_credentials
    const connected: { platform: string; channel_name: string; connected_at: string }[] = [];

    return c.json({
      success: true,
      data: connected,
    });
  } catch (error: any) {
    console.error('Get connected platforms error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /publishing/publish - Create publish job
projectRoutes.post('/publishing/publish', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const body = await c.req.json();
    const {
      project_id,
      platform,
      title,
      description,
      tags,
      hashtags,
      category,
      thumbnail_url,
      visibility,
      scheduled_at,
      chapters,
    } = body;

    if (!project_id || !platform || !title) {
      return c.json({
        success: false,
        error: 'project_id, platform, and title are required',
      }, 400);
    }

    // Check rate limits
    const recentUploads: { created_at: string }[] = []; // Would query from DB
    const rateCheck = checkRateLimit(platform as PublishPlatform, recentUploads);
    
    if (!rateCheck.allowed) {
      return c.json({
        success: false,
        error: 'Rate limit exceeded',
        data: {
          reset_at: rateCheck.resetAt?.toISOString(),
          status: 'rate_limited',
        },
      }, 429);
    }

    // Build formatted description
    let formattedDescription = description;
    if (platform === 'youtube' && chapters) {
      formattedDescription = buildYouTubeDescription(description, hashtags || [], chapters);
    } else {
      formattedDescription = formatDescriptionWithHashtags(description, hashtags || [], platform as PublishPlatform);
    }

    // Create publish job
    const job = createPublishJob(
      {
        project_id,
        platform: platform as PublishPlatform,
        title,
        description: formattedDescription,
        tags,
        hashtags,
        category,
        thumbnail_url,
        visibility,
        scheduled_at,
      },
      user.id
    );

    // Would save to D1 database

    return c.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error('Create publish job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /publishing/jobs - Get user's publish jobs
projectRoutes.get('/publishing/jobs', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const { project_id, status } = c.req.query();

    // Would query D1 database
    const jobs: any[] = [];

    return c.json({
      success: true,
      data: jobs,
    });
  } catch (error: any) {
    console.error('Get publish jobs error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /publishing/jobs/:id - Get publish job status
projectRoutes.get('/publishing/jobs/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    // Would query D1 database
    const job = {
      id: jobId,
      status: 'pending',
    };

    return c.json({
      success: true,
      data: job,
    });
  } catch (error: any) {
    console.error('Get publish job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /publishing/jobs/:id/retry - Retry failed publish job
projectRoutes.post('/publishing/jobs/:id/retry', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const jobId = c.req.param('id');

    // Would update job in D1 and re-queue

    return c.json({
      success: true,
      message: 'Job queued for retry',
    });
  } catch (error: any) {
    console.error('Retry publish job error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== TEMPLATE ENDPOINTS ====================

// GET /templates - Get scenario templates
projectRoutes.get('/templates', async (c) => {
  const templates = [
    {
      id: 'template-trailer',
      name: 'Movie Trailer',
      description: 'Epic cinematic trailer with dramatic pacing',
      category: 'trailer',
      scenario_template: `SCENE 1: Opening hook
[Dramatic establishing shot]
Mysterious voice: "In a world where..."

SCENE 2: Rising tension
[Action montage]
Character reveals conflict

SCENE 3: Climax tease
[Peak dramatic moment]
Title card`,
      style_hints: { genre: 'cinematic', mood: 'dramatic', pacing: 'fast' },
      recommended_duration_sec: 60,
    },
    {
      id: 'template-vlog',
      name: 'Personal Vlog',
      description: 'Casual, engaging vlog format',
      category: 'vlog',
      scenario_template: `INTRO: Hook the viewer
"Hey everyone! Today I'm going to..."

SEGMENT 1: Main topic
[Show process/activity]
Explain what's happening

SEGMENT 2: Highlights
[Best moments]
React and comment

OUTRO: Call to action
"If you enjoyed this, don't forget to..."`,
      style_hints: { genre: 'documentary', mood: 'casual', pacing: 'medium' },
      recommended_duration_sec: 180,
    },
    {
      id: 'template-tutorial',
      name: 'Tutorial',
      description: 'Step-by-step instructional video',
      category: 'tutorial',
      scenario_template: `INTRO: What you'll learn
"In this video, I'll show you how to..."

STEP 1: Setup/Requirements
[Show materials/tools needed]

STEP 2: Main process
[Detailed walkthrough]

STEP 3: Tips & tricks
[Pro tips]

CONCLUSION: Recap
"Now you know how to..."`,
      style_hints: { genre: 'documentary', mood: 'informative', pacing: 'medium' },
      recommended_duration_sec: 300,
    },
    {
      id: 'template-short',
      name: 'Short Film',
      description: 'Narrative short film structure',
      category: 'short_film',
      scenario_template: `ACT 1: Setup
[Establish world and character]
Character's normal life

INCITING INCIDENT
Something disrupts the status quo

ACT 2: Confrontation
Character faces challenges
Stakes escalate

CLIMAX
Peak conflict moment

ACT 3: Resolution
Character transformed
New equilibrium`,
      style_hints: { genre: 'cinematic', mood: 'emotional', pacing: 'medium' },
      recommended_duration_sec: 600,
    },
  ];

  return c.json({
    success: true,
    data: templates,
  });
});

export default projectRoutes;
