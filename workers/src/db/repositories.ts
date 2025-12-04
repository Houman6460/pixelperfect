/**
 * Database Repositories
 * CRUD operations for each entity type
 */

import { Database, Storage, generateId, now, parseJSON } from './index';

// ==================== SCENARIO REPOSITORY ====================

export interface ScenarioRow {
  id: string;
  user_id: string;
  title: string | null;
  original_text: string;
  improved_text: string | null;
  target_model_id: string | null;
  target_duration_sec: number | null;
  language: string;
  style_hints: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export class ScenarioRepository {
  constructor(private db: Database) {}

  async create(data: {
    userId: string;
    title?: string;
    originalText: string;
    targetModelId?: string;
    targetDurationSec?: number;
    language?: string;
    styleHints?: Record<string, unknown>;
  }): Promise<string> {
    const id = `scenario-${generateId()}`;
    await this.db.execute(
      `INSERT INTO scenarios (id, user_id, title, original_text, target_model_id, target_duration_sec, language, style_hints, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.title || null,
        data.originalText,
        data.targetModelId || null,
        data.targetDurationSec || null,
        data.language || 'en',
        data.styleHints ? JSON.stringify(data.styleHints) : null,
        now(),
        now(),
      ]
    );
    return id;
  }

  async getById(id: string, userId: string): Promise<ScenarioRow | null> {
    const result = await this.db.queryFirst<ScenarioRow>(
      'SELECT * FROM scenarios WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.data ?? null;
  }

  async listByUser(userId: string, limit = 20, offset = 0): Promise<ScenarioRow[]> {
    const result = await this.db.query<ScenarioRow>(
      'SELECT * FROM scenarios WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    return result.data || [];
  }

  async updateImproved(id: string, userId: string, improvedText: string): Promise<void> {
    await this.db.execute(
      `UPDATE scenarios SET improved_text = ?, status = 'improved', updated_at = ? WHERE id = ? AND user_id = ?`,
      [improvedText, now(), id, userId]
    );
  }

  async updateStatus(id: string, userId: string, status: string): Promise<void> {
    await this.db.execute(
      `UPDATE scenarios SET status = ?, updated_at = ? WHERE id = ? AND user_id = ?`,
      [status, now(), id, userId]
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db.execute('DELETE FROM scenarios WHERE id = ? AND user_id = ?', [id, userId]);
  }
}

// ==================== TIMELINE REPOSITORY ====================

export interface TimelineRow {
  id: string;
  user_id: string;
  scenario_id: string | null;
  name: string | null;
  description: string | null;
  total_duration_sec: number;
  segment_count: number;
  version: number;
  status: string;
  global_style: string | null;
  continuity_settings: string | null;
  created_at: string;
  updated_at: string;
}

export class TimelineRepository {
  constructor(private db: Database) {}

  async create(data: {
    userId: string;
    scenarioId?: string;
    name?: string;
    description?: string;
    totalDurationSec?: number;
    segmentCount?: number;
    globalStyle?: Record<string, unknown>;
    continuitySettings?: Record<string, unknown>;
  }): Promise<string> {
    const id = `timeline-${generateId()}`;
    await this.db.execute(
      `INSERT INTO timelines (id, user_id, scenario_id, name, description, total_duration_sec, segment_count, global_style, continuity_settings, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.userId,
        data.scenarioId || null,
        data.name || null,
        data.description || null,
        data.totalDurationSec || 0,
        data.segmentCount || 0,
        data.globalStyle ? JSON.stringify(data.globalStyle) : null,
        data.continuitySettings ? JSON.stringify(data.continuitySettings) : null,
        now(),
        now(),
      ]
    );
    return id;
  }

  async getById(id: string, userId: string): Promise<TimelineRow | null> {
    const result = await this.db.queryFirst<TimelineRow>(
      'SELECT * FROM timelines WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.data ?? null;
  }

  async listByUser(userId: string, limit = 20, offset = 0): Promise<TimelineRow[]> {
    const result = await this.db.query<TimelineRow>(
      'SELECT * FROM timelines WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    return result.data || [];
  }

  async update(id: string, userId: string, data: Partial<{
    name: string;
    description: string;
    totalDurationSec: number;
    segmentCount: number;
    status: string;
    globalStyle: Record<string, unknown>;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.totalDurationSec !== undefined) { updates.push('total_duration_sec = ?'); values.push(data.totalDurationSec); }
    if (data.segmentCount !== undefined) { updates.push('segment_count = ?'); values.push(data.segmentCount); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.globalStyle !== undefined) { updates.push('global_style = ?'); values.push(JSON.stringify(data.globalStyle)); }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now(), id, userId);

    await this.db.execute(
      `UPDATE timelines SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db.execute('DELETE FROM timelines WHERE id = ? AND user_id = ?', [id, userId]);
  }
}

// ==================== SEGMENT REPOSITORY ====================

export interface SegmentRow {
  id: string;
  timeline_id: string;
  scene_id: string | null;
  position: number;
  scene_number: number | null;
  duration_sec: number;
  model_id: string;
  
  // Generation mode
  generation_mode: string | null;
  is_first_segment: number;
  source_url: string | null;
  
  // Prompts
  prompt_text: string | null;
  final_prompt_text: string | null;
  dialogue: string | null;
  dialogue_handling_mode: string | null;
  
  // Motion & Camera
  motion_profile: string | null;
  camera_path: string | null;
  transition_type: string | null;
  
  // Frame URLs
  first_frame_url: string | null;
  last_frame_url: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  
  // Style
  style_lock: string | null;
  continuity_notes: string | null;
  
  // Status
  status: string;
  error_message: string | null;
  generation_time_sec: number | null;
  
  // Timestamps
  created_at: string;
  updated_at: string;
}

export class SegmentRepository {
  constructor(private db: Database) {}

  async create(data: {
    timelineId: string;
    sceneId?: string;
    position: number;
    sceneNumber?: number;
    durationSec: number;
    modelId: string;
    promptText?: string;
    finalPromptText?: string;
    dialogue?: string;
    dialogueHandlingMode?: string;
    motionProfile?: string;
    cameraPath?: string;
    transitionType?: string;
  }): Promise<string> {
    const id = `segment-${generateId()}`;
    await this.db.execute(
      `INSERT INTO segments (id, timeline_id, scene_id, position, scene_number, duration_sec, model_id, prompt_text, final_prompt_text, dialogue, dialogue_handling_mode, motion_profile, camera_path, transition_type, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      [
        id,
        data.timelineId,
        data.sceneId || null,
        data.position,
        data.sceneNumber || null,
        data.durationSec,
        data.modelId,
        data.promptText || null,
        data.finalPromptText || null,
        data.dialogue || null,
        data.dialogueHandlingMode || null,
        data.motionProfile || null,
        data.cameraPath || null,
        data.transitionType || null,
        now(),
        now(),
      ]
    );
    return id;
  }

  async createBatch(segments: Array<{
    timelineId: string;
    position: number;
    durationSec: number;
    modelId: string;
    promptText?: string;
    finalPromptText?: string;
    motionProfile?: string;
    cameraPath?: string;
    transitionType?: string;
  }>): Promise<string[]> {
    const ids: string[] = [];
    const statements = segments.map(seg => {
      const id = `segment-${generateId()}`;
      ids.push(id);
      return {
        sql: `INSERT INTO segments (id, timeline_id, position, duration_sec, model_id, prompt_text, final_prompt_text, motion_profile, camera_path, transition_type, status, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
        params: [
          id,
          seg.timelineId,
          seg.position,
          seg.durationSec,
          seg.modelId,
          seg.promptText || null,
          seg.finalPromptText || null,
          seg.motionProfile || null,
          seg.cameraPath || null,
          seg.transitionType || null,
          now(),
          now(),
        ],
      };
    });

    await this.db.batch(statements);
    return ids;
  }

  async getByTimeline(timelineId: string): Promise<SegmentRow[]> {
    const result = await this.db.query<SegmentRow>(
      'SELECT * FROM segments WHERE timeline_id = ? ORDER BY position ASC',
      [timelineId]
    );
    return result.data || [];
  }

  async getById(id: string): Promise<SegmentRow | null> {
    const result = await this.db.queryFirst<SegmentRow>(
      'SELECT * FROM segments WHERE id = ?',
      [id]
    );
    return result.data ?? null;
  }

  async update(id: string, data: Partial<{
    promptText: string;
    finalPromptText: string;
    dialogue: string;
    motionProfile: string;
    cameraPath: string;
    transitionType: string;
    firstFrameUrl: string;
    lastFrameUrl: string;
    videoUrl: string;
    thumbnailUrl: string;
    status: string;
    errorMessage: string;
    generationTimeSec: number;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.promptText !== undefined) { updates.push('prompt_text = ?'); values.push(data.promptText); }
    if (data.finalPromptText !== undefined) { updates.push('final_prompt_text = ?'); values.push(data.finalPromptText); }
    if (data.dialogue !== undefined) { updates.push('dialogue = ?'); values.push(data.dialogue); }
    if (data.motionProfile !== undefined) { updates.push('motion_profile = ?'); values.push(data.motionProfile); }
    if (data.cameraPath !== undefined) { updates.push('camera_path = ?'); values.push(data.cameraPath); }
    if (data.transitionType !== undefined) { updates.push('transition_type = ?'); values.push(data.transitionType); }
    if (data.firstFrameUrl !== undefined) { updates.push('first_frame_url = ?'); values.push(data.firstFrameUrl); }
    if (data.lastFrameUrl !== undefined) { updates.push('last_frame_url = ?'); values.push(data.lastFrameUrl); }
    if (data.videoUrl !== undefined) { updates.push('video_url = ?'); values.push(data.videoUrl); }
    if (data.thumbnailUrl !== undefined) { updates.push('thumbnail_url = ?'); values.push(data.thumbnailUrl); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
    if (data.errorMessage !== undefined) { updates.push('error_message = ?'); values.push(data.errorMessage); }
    if (data.generationTimeSec !== undefined) { updates.push('generation_time_sec = ?'); values.push(data.generationTimeSec); }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now(), id);

    await this.db.execute(
      `UPDATE segments SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  async deleteByTimeline(timelineId: string): Promise<void> {
    await this.db.execute('DELETE FROM segments WHERE timeline_id = ?', [timelineId]);
  }
}

// ==================== PROJECT REPOSITORY ====================

export interface ProjectRow {
  id: string;
  user_id: string;
  folder_id: string | null;
  timeline_id: string | null;
  title: string;
  description: string | null;
  original_scenario: string | null;
  improved_scenario: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  preview_urls: string | null;
  duration_sec: number | null;
  resolution: string | null;
  aspect_ratio: string | null;
  fps: number | null;
  model_used: string | null;
  tags: string | null;
  is_favorite: number;
  status: string;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

export class ProjectRepository {
  constructor(private db: Database) {}

  async create(data: {
    userId: string;
    folderId?: string;
    timelineId?: string;
    title: string;
    description?: string;
    originalScenario?: string;
    tags?: string[];
  }): Promise<string> {
    const id = `project-${generateId()}`;
    await this.db.execute(
      `INSERT INTO video_projects (id, user_id, folder_id, timeline_id, title, description, original_scenario, tags, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)`,
      [
        id,
        data.userId,
        data.folderId || null,
        data.timelineId || null,
        data.title,
        data.description || null,
        data.originalScenario || null,
        data.tags ? JSON.stringify(data.tags) : null,
        now(),
        now(),
      ]
    );
    return id;
  }

  async getById(id: string, userId: string): Promise<ProjectRow | null> {
    const result = await this.db.queryFirst<ProjectRow>(
      'SELECT * FROM video_projects WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.data ?? null;
  }

  async listByUser(userId: string, options?: {
    folderId?: string;
    status?: string;
    isFavorite?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<ProjectRow[]> {
    let sql = 'SELECT * FROM video_projects WHERE user_id = ?';
    const params: unknown[] = [userId];

    if (options?.folderId) {
      sql += ' AND folder_id = ?';
      params.push(options.folderId);
    }
    if (options?.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    }
    if (options?.isFavorite !== undefined) {
      sql += ' AND is_favorite = ?';
      params.push(options.isFavorite ? 1 : 0);
    }

    sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(options?.limit || 20, options?.offset || 0);

    const result = await this.db.query<ProjectRow>(sql, params);
    return result.data || [];
  }

  async update(id: string, userId: string, data: Partial<{
    title: string;
    description: string;
    improvedScenario: string;
    videoUrl: string;
    thumbnailUrl: string;
    folderId: string;
    tags: string[];
    isFavorite: boolean;
    status: string;
  }>): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
    if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
    if (data.improvedScenario !== undefined) { updates.push('improved_scenario = ?'); values.push(data.improvedScenario); }
    if (data.videoUrl !== undefined) { updates.push('video_url = ?'); values.push(data.videoUrl); }
    if (data.thumbnailUrl !== undefined) { updates.push('thumbnail_url = ?'); values.push(data.thumbnailUrl); }
    if (data.folderId !== undefined) { updates.push('folder_id = ?'); values.push(data.folderId); }
    if (data.tags !== undefined) { updates.push('tags = ?'); values.push(JSON.stringify(data.tags)); }
    if (data.isFavorite !== undefined) { updates.push('is_favorite = ?'); values.push(data.isFavorite ? 1 : 0); }
    if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now(), id, userId);

    await this.db.execute(
      `UPDATE video_projects SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      values
    );
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db.execute('DELETE FROM video_projects WHERE id = ? AND user_id = ?', [id, userId]);
  }
}

// ==================== COVER REPOSITORY ====================

export interface CoverRow {
  id: string;
  timeline_id: string | null;
  project_id: string | null;
  platform: string;
  cover_url: string;
  prompt_used: string | null;
  model_used: string | null;
  variant_number: number;
  style: string | null;
  dominant_colors: string | null;
  has_text_overlay: number;
  is_selected: number;
  created_at: string;
}

export class CoverRepository {
  constructor(private db: Database) {}

  async create(data: {
    timelineId?: string;
    projectId?: string;
    platform: string;
    coverUrl: string;
    promptUsed?: string;
    modelUsed?: string;
    variantNumber?: number;
    style?: string;
    dominantColors?: string[];
  }): Promise<string> {
    const id = `cover-${generateId()}`;
    await this.db.execute(
      `INSERT INTO covers (id, timeline_id, project_id, platform, cover_url, prompt_used, model_used, variant_number, style, dominant_colors, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.timelineId || null,
        data.projectId || null,
        data.platform,
        data.coverUrl,
        data.promptUsed || null,
        data.modelUsed || null,
        data.variantNumber || 1,
        data.style || null,
        data.dominantColors ? JSON.stringify(data.dominantColors) : null,
        now(),
      ]
    );
    return id;
  }

  async getByProject(projectId: string): Promise<CoverRow[]> {
    const result = await this.db.query<CoverRow>(
      'SELECT * FROM covers WHERE project_id = ? ORDER BY platform, variant_number',
      [projectId]
    );
    return result.data || [];
  }

  async selectVariant(id: string, projectId: string): Promise<void> {
    // Deselect all variants for the project/platform first
    const cover = await this.db.queryFirst<CoverRow>('SELECT platform FROM covers WHERE id = ?', [id]);
    if (cover.data) {
      await this.db.execute(
        'UPDATE covers SET is_selected = 0 WHERE project_id = ? AND platform = ?',
        [projectId, cover.data.platform]
      );
    }
    // Select the specified variant
    await this.db.execute('UPDATE covers SET is_selected = 1 WHERE id = ?', [id]);
  }
}

// ==================== PUBLISHED ITEM REPOSITORY ====================

export interface PublishedItemRow {
  id: string;
  user_id: string;
  project_id: string;
  timeline_id: string | null;
  video_id: string | null;
  video_url: string;
  title: string;
  description: string | null;
  cover_images: string | null;
  cover_variants: string | null;
  cover_prompts: string | null;
  scenario: string | null;
  final_prompts: string | null;
  publish_platforms: string | null;
  publish_jobs: string | null;
  publish_status: string;
  publish_date: string | null;
  tags: string | null;
  created_at: string;
  updated_at: string;
}

export class PublishedItemRepository {
  constructor(private db: Database) {}

  async create(data: {
    userId: string;
    projectId: string;
    timelineId?: string;
    videoUrl: string;
    title: string;
    description?: string;
    coverImages?: Record<string, string>;
    scenario?: string;
    platforms?: string[];
    publishJobs?: string[];
  }): Promise<string> {
    const id = `published-${generateId()}`;
    await this.db.execute(
      `INSERT INTO published_items (id, user_id, project_id, timeline_id, video_url, title, description, cover_images, scenario, publish_platforms, publish_jobs, publish_status, publish_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)`,
      [
        id,
        data.userId,
        data.projectId,
        data.timelineId || null,
        data.videoUrl,
        data.title,
        data.description || null,
        data.coverImages ? JSON.stringify(data.coverImages) : null,
        data.scenario || null,
        data.platforms ? JSON.stringify(data.platforms) : null,
        data.publishJobs ? JSON.stringify(data.publishJobs) : null,
        now(),
        now(),
        now(),
      ]
    );
    return id;
  }

  async listByUser(userId: string, limit = 20, offset = 0): Promise<PublishedItemRow[]> {
    const result = await this.db.query<PublishedItemRow>(
      'SELECT * FROM published_items WHERE user_id = ? ORDER BY publish_date DESC LIMIT ? OFFSET ?',
      [userId, limit, offset]
    );
    return result.data || [];
  }

  async getById(id: string, userId: string): Promise<PublishedItemRow | null> {
    const result = await this.db.queryFirst<PublishedItemRow>(
      'SELECT * FROM published_items WHERE id = ? AND user_id = ?',
      [id, userId]
    );
    return result.data ?? null;
  }

  async updateStatus(id: string, status: string): Promise<void> {
    await this.db.execute(
      'UPDATE published_items SET publish_status = ?, updated_at = ? WHERE id = ?',
      [status, now(), id]
    );
  }
}

// ==================== FACTORY FUNCTION ====================

export function createRepositories(db: Database) {
  return {
    scenarios: new ScenarioRepository(db),
    timelines: new TimelineRepository(db),
    segments: new SegmentRepository(db),
    projects: new ProjectRepository(db),
    covers: new CoverRepository(db),
    publishedItems: new PublishedItemRepository(db),
  };
}

export default {
  ScenarioRepository,
  TimelineRepository,
  SegmentRepository,
  ProjectRepository,
  CoverRepository,
  PublishedItemRepository,
  createRepositories,
};
