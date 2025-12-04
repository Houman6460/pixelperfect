/**
 * Scenario Database Service
 * CRUD operations for scenarios, timelines, and segments in D1
 */

import { nanoid } from 'nanoid';
import { VideoPaths, FramePaths, StoryboardPaths, AudioPaths, CoverPaths, getPublicUrl } from './r2StoragePaths';

// ==================== TYPES ====================

export interface Scenario {
  id: string;
  user_id: string;
  title?: string;
  original_text: string;
  improved_text?: string;
  target_model_id?: string;
  target_duration_sec?: number;
  language: string;
  style_hints?: string; // JSON
  tags_json?: string; // JSON: [{type, value, offset}]
  storyboard_images?: string; // JSON: [{url, caption}]
  vision_model_id?: string;
  status: 'draft' | 'improved' | 'planned' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface Timeline {
  id: string;
  user_id: string;
  scenario_id?: string;
  name?: string;
  description?: string;
  total_duration_sec: number;
  segment_count: number;
  target_model_id?: string;
  target_resolution?: string;
  aspect_ratio?: string;
  output_width?: number;
  output_height?: number;
  raw_video_url?: string;
  enhanced_video_url?: string;
  final_video_url?: string;
  status: 'draft' | 'generating' | 'ready' | 'rendered';
  global_style?: string; // JSON
  continuity_settings?: string; // JSON
  created_at: string;
  updated_at: string;
}

export interface Segment {
  id: string;
  timeline_id: string;
  scene_id?: string;
  position: number;
  scene_number?: number;
  duration_sec: number;
  model_id: string;
  prompt_text?: string;
  final_prompt_text?: string;
  negative_prompt?: string;
  dialogue?: string;
  dialogue_handling_mode?: string;
  motion_profile?: string;
  camera_path?: string;
  transition_type?: string;
  style_preset?: string;
  seed?: number;
  first_frame_mode?: string;
  first_frame_url?: string;
  last_frame_url?: string;
  video_url?: string;
  thumbnail_url?: string;
  style_lock?: string; // JSON
  continuity_notes?: string;
  inline_tags_json?: string; // JSON
  tag_metadata_json?: string; // JSON
  lighting?: string;
  emotion?: string;
  sfx_cue?: string;
  enhance_enabled?: number;
  enhance_model?: string;
  enhance_status?: string;
  raw_video_url?: string;
  enhanced_video_url?: string;
  status: 'pending' | 'generating' | 'generated' | 'error';
  error_message?: string;
  generation_time_sec?: number;
  created_at: string;
  updated_at: string;
}

export interface GenerationPlan {
  id: string;
  timeline_id: string;
  plan_json: string;
  execution_order?: string; // JSON array
  models_used?: string; // JSON array
  estimated_time_sec?: number;
  frame_chaining_enabled: number;
  inline_tags_used?: number;
  tag_summary_json?: string; // JSON
  status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
  progress_completed: number;
  progress_total: number;
  current_segment_id?: string;
  created_at: string;
  updated_at: string;
}

// ==================== SCENARIO REPOSITORY ====================

export class ScenarioRepository {
  constructor(private db: D1Database) {}

  async create(data: {
    userId: string;
    title?: string;
    originalText: string;
    targetModelId?: string;
    targetDurationSec?: number;
    language?: string;
    styleHints?: Record<string, any>;
    tagsJson?: any[];
    storyboardImages?: any[];
    visionModelId?: string;
  }): Promise<string> {
    const id = `sc_${nanoid(12)}`;
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO scenarios (
        id, user_id, title, original_text, target_model_id, target_duration_sec,
        language, style_hints, tags_json, storyboard_images, vision_model_id,
        status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      id,
      data.userId,
      data.title || null,
      data.originalText,
      data.targetModelId || null,
      data.targetDurationSec || null,
      data.language || 'en',
      data.styleHints ? JSON.stringify(data.styleHints) : null,
      data.tagsJson ? JSON.stringify(data.tagsJson) : null,
      data.storyboardImages ? JSON.stringify(data.storyboardImages) : null,
      data.visionModelId || null,
      now,
      now
    ).run();

    return id;
  }

  async getById(id: string): Promise<Scenario | null> {
    const result = await this.db.prepare(
      'SELECT * FROM scenarios WHERE id = ?'
    ).bind(id).first<Scenario>();
    return result || null;
  }

  async getByUserId(userId: string): Promise<Scenario[]> {
    const result = await this.db.prepare(
      'SELECT * FROM scenarios WHERE user_id = ? ORDER BY updated_at DESC'
    ).bind(userId).all<Scenario>();
    return result.results || [];
  }

  async updateImprovedText(id: string, improvedText: string, tagsJson?: any[]): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE scenarios SET 
        improved_text = ?,
        tags_json = COALESCE(?, tags_json),
        status = 'improved',
        updated_at = ?
      WHERE id = ?
    `).bind(
      improvedText,
      tagsJson ? JSON.stringify(tagsJson) : null,
      now,
      id
    ).run();
  }

  async updateStatus(id: string, status: Scenario['status']): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE scenarios SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, id).run();
  }

  async delete(id: string): Promise<void> {
    await this.db.prepare('DELETE FROM scenarios WHERE id = ?').bind(id).run();
  }
}

// ==================== TIMELINE REPOSITORY ====================

export class TimelineDbRepository {
  constructor(private db: D1Database) {}

  async createFromPlan(data: {
    userId: string;
    scenarioId: string;
    name?: string;
    totalDurationSec: number;
    segmentCount: number;
    targetModelId: string;
    targetResolution?: string;
    aspectRatio?: string;
    globalStyle?: Record<string, any>;
    continuitySettings?: Record<string, any>;
  }): Promise<string> {
    const id = `tl_${nanoid(12)}`;
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO timelines (
        id, user_id, scenario_id, name, total_duration_sec, segment_count,
        target_model_id, target_resolution, aspect_ratio, global_style,
        continuity_settings, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?)
    `).bind(
      id,
      data.userId,
      data.scenarioId,
      data.name || `Timeline ${new Date().toLocaleDateString()}`,
      data.totalDurationSec,
      data.segmentCount,
      data.targetModelId,
      data.targetResolution || '1080p',
      data.aspectRatio || '16:9',
      data.globalStyle ? JSON.stringify(data.globalStyle) : null,
      data.continuitySettings ? JSON.stringify(data.continuitySettings) : null,
      now,
      now
    ).run();

    return id;
  }

  async getById(id: string): Promise<Timeline | null> {
    const result = await this.db.prepare(
      'SELECT * FROM timelines WHERE id = ?'
    ).bind(id).first<Timeline>();
    return result || null;
  }

  async updateVideoUrls(id: string, urls: {
    rawVideoUrl?: string;
    enhancedVideoUrl?: string;
    finalVideoUrl?: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE timelines SET 
        raw_video_url = COALESCE(?, raw_video_url),
        enhanced_video_url = COALESCE(?, enhanced_video_url),
        final_video_url = COALESCE(?, final_video_url),
        updated_at = ?
      WHERE id = ?
    `).bind(
      urls.rawVideoUrl || null,
      urls.enhancedVideoUrl || null,
      urls.finalVideoUrl || null,
      now,
      id
    ).run();
  }

  async updateStatus(id: string, status: Timeline['status']): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE timelines SET status = ?, updated_at = ? WHERE id = ?'
    ).bind(status, now, id).run();
  }
}

// ==================== SEGMENT REPOSITORY ====================

export class SegmentDbRepository {
  constructor(private db: D1Database) {}

  async createBatch(timelineId: string, segments: Array<{
    position: number;
    sceneNumber?: number;
    durationSec: number;
    modelId: string;
    promptText?: string;
    finalPromptText?: string;
    negativePrompt?: string;
    motionProfile?: string;
    cameraPath?: string;
    transitionType?: string;
    stylePreset?: string;
    seed?: number;
    firstFrameMode?: string;
    inlineTagsJson?: any[];
    tagMetadataJson?: Record<string, any>;
    lighting?: string;
    emotion?: string;
    sfxCue?: string;
    enhanceEnabled?: boolean;
    enhanceModel?: string;
  }>): Promise<string[]> {
    const ids: string[] = [];
    const now = new Date().toISOString();

    for (const seg of segments) {
      const id = `seg_${nanoid(12)}`;
      ids.push(id);

      await this.db.prepare(`
        INSERT INTO segments (
          id, timeline_id, position, scene_number, duration_sec, model_id,
          prompt_text, final_prompt_text, negative_prompt, motion_profile,
          camera_path, transition_type, style_preset, seed, first_frame_mode,
          inline_tags_json, tag_metadata_json, lighting, emotion, sfx_cue,
          enhance_enabled, enhance_model, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).bind(
        id,
        timelineId,
        seg.position,
        seg.sceneNumber || null,
        seg.durationSec,
        seg.modelId,
        seg.promptText || null,
        seg.finalPromptText || null,
        seg.negativePrompt || null,
        seg.motionProfile || 'smooth',
        seg.cameraPath || 'static',
        seg.transitionType || 'cut',
        seg.stylePreset || 'cinematic',
        seg.seed || null,
        seg.firstFrameMode || 'auto',
        seg.inlineTagsJson ? JSON.stringify(seg.inlineTagsJson) : null,
        seg.tagMetadataJson ? JSON.stringify(seg.tagMetadataJson) : null,
        seg.lighting || null,
        seg.emotion || null,
        seg.sfxCue || null,
        seg.enhanceEnabled ? 1 : 0,
        seg.enhanceModel || null,
        now,
        now
      ).run();
    }

    return ids;
  }

  async getByTimeline(timelineId: string): Promise<Segment[]> {
    const result = await this.db.prepare(
      'SELECT * FROM segments WHERE timeline_id = ? ORDER BY position ASC'
    ).bind(timelineId).all<Segment>();
    return result.results || [];
  }

  async updateGenerationResult(segmentId: string, userId: string, timelineId: string, result: {
    videoUrl: string;
    firstFrameUrl: string;
    lastFrameUrl: string;
    thumbnailUrl?: string;
    generationTimeSec: number;
  }): Promise<void> {
    const now = new Date().toISOString();

    // Use the R2 path generators for proper URLs
    const rawVideoPath = VideoPaths.segmentRaw(userId, timelineId, segmentId);
    const firstFramePath = FramePaths.first(userId, timelineId, segmentId);
    const lastFramePath = FramePaths.last(userId, timelineId, segmentId);

    await this.db.prepare(`
      UPDATE segments SET 
        video_url = ?,
        raw_video_url = ?,
        first_frame_url = ?,
        last_frame_url = ?,
        thumbnail_url = ?,
        status = 'generated',
        generation_time_sec = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      getPublicUrl(rawVideoPath),
      getPublicUrl(rawVideoPath),
      getPublicUrl(firstFramePath),
      getPublicUrl(lastFramePath),
      result.thumbnailUrl || null,
      result.generationTimeSec,
      now,
      segmentId
    ).run();
  }

  async updateEnhancementResult(segmentId: string, userId: string, timelineId: string, result: {
    enhancedVideoUrl: string;
    enhanceModel: string;
  }): Promise<void> {
    const now = new Date().toISOString();
    const enhancedPath = VideoPaths.segmentEnhanced(userId, timelineId, segmentId);

    await this.db.prepare(`
      UPDATE segments SET 
        enhanced_video_url = ?,
        enhance_model = ?,
        enhance_status = 'done',
        updated_at = ?
      WHERE id = ?
    `).bind(
      getPublicUrl(enhancedPath),
      result.enhanceModel,
      now,
      segmentId
    ).run();
  }

  async updateStatus(id: string, status: Segment['status'], errorMessage?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE segments SET status = ?, error_message = ?, updated_at = ? WHERE id = ?
    `).bind(status, errorMessage || null, now, id).run();
  }
}

// ==================== GENERATION PLAN REPOSITORY ====================

export class GenerationPlanRepository {
  constructor(private db: D1Database) {}

  async create(data: {
    timelineId: string;
    planJson: any;
    executionOrder: string[];
    modelsUsed: string[];
    estimatedTimeSec: number;
    frameChaining: boolean;
    inlineTagsUsed: boolean;
    tagSummary?: Record<string, number>;
  }): Promise<string> {
    const id = `plan_${nanoid(12)}`;
    const now = new Date().toISOString();

    await this.db.prepare(`
      INSERT INTO generation_plans (
        id, timeline_id, plan_json, execution_order, models_used,
        estimated_time_sec, frame_chaining_enabled, inline_tags_used,
        tag_summary_json, status, progress_completed, progress_total,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?, ?)
    `).bind(
      id,
      data.timelineId,
      JSON.stringify(data.planJson),
      JSON.stringify(data.executionOrder),
      JSON.stringify(data.modelsUsed),
      data.estimatedTimeSec,
      data.frameChaining ? 1 : 0,
      data.inlineTagsUsed ? 1 : 0,
      data.tagSummary ? JSON.stringify(data.tagSummary) : null,
      data.executionOrder.length,
      now,
      now
    ).run();

    return id;
  }

  async getByTimeline(timelineId: string): Promise<GenerationPlan | null> {
    const result = await this.db.prepare(
      'SELECT * FROM generation_plans WHERE timeline_id = ? ORDER BY created_at DESC LIMIT 1'
    ).bind(timelineId).first<GenerationPlan>();
    return result || null;
  }

  async updateProgress(id: string, completed: number, currentSegmentId?: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.prepare(`
      UPDATE generation_plans SET 
        progress_completed = ?,
        current_segment_id = ?,
        status = CASE WHEN ? >= progress_total THEN 'completed' ELSE 'running' END,
        updated_at = ?
      WHERE id = ?
    `).bind(completed, currentSegmentId || null, completed, now, id).run();
  }
}

// ==================== COMPLETE PIPELINE FUNCTION ====================

/**
 * Save a complete scenario-to-timeline pipeline result to D1
 */
export async function saveGeneratedPlanToDb(
  db: D1Database,
  userId: string,
  scenarioData: {
    originalText: string;
    improvedText?: string;
    targetModelId: string;
    targetDurationSec: number;
    language?: string;
    styleHints?: Record<string, any>;
    tagsJson?: any[];
  },
  timelineData: {
    totalDurationSec: number;
    targetResolution?: string;
    aspectRatio?: string;
    globalStyle?: Record<string, any>;
    continuitySettings?: Record<string, any>;
  },
  segments: Array<{
    position: number;
    durationSec: number;
    modelId: string;
    promptText: string;
    finalPromptText?: string;
    negativePrompt?: string;
    motionProfile?: string;
    cameraPath?: string;
    transitionType?: string;
    stylePreset?: string;
    inlineTags?: any[];
    tagMetadata?: Record<string, any>;
    lighting?: string;
    emotion?: string;
    enhanceEnabled?: boolean;
  }>,
  planData: {
    planJson: any;
    frameChaining: boolean;
    estimatedTimeSec: number;
  }
): Promise<{
  scenarioId: string;
  timelineId: string;
  segmentIds: string[];
  planId: string;
}> {
  const scenarioRepo = new ScenarioRepository(db);
  const timelineRepo = new TimelineDbRepository(db);
  const segmentRepo = new SegmentDbRepository(db);
  const planRepo = new GenerationPlanRepository(db);

  // 1. Create scenario
  const scenarioId = await scenarioRepo.create({
    userId,
    originalText: scenarioData.originalText,
    targetModelId: scenarioData.targetModelId,
    targetDurationSec: scenarioData.targetDurationSec,
    language: scenarioData.language,
    styleHints: scenarioData.styleHints,
    tagsJson: scenarioData.tagsJson,
  });

  // Update with improved text if available
  if (scenarioData.improvedText) {
    await scenarioRepo.updateImprovedText(scenarioId, scenarioData.improvedText, scenarioData.tagsJson);
  }

  // 2. Create timeline
  const timelineId = await timelineRepo.createFromPlan({
    userId,
    scenarioId,
    totalDurationSec: timelineData.totalDurationSec,
    segmentCount: segments.length,
    targetModelId: scenarioData.targetModelId,
    targetResolution: timelineData.targetResolution,
    aspectRatio: timelineData.aspectRatio,
    globalStyle: timelineData.globalStyle,
    continuitySettings: timelineData.continuitySettings,
  });

  // 3. Create segments
  const segmentIds = await segmentRepo.createBatch(timelineId, segments.map(s => ({
    position: s.position,
    durationSec: s.durationSec,
    modelId: s.modelId,
    promptText: s.promptText,
    finalPromptText: s.finalPromptText,
    negativePrompt: s.negativePrompt,
    motionProfile: s.motionProfile,
    cameraPath: s.cameraPath,
    transitionType: s.transitionType,
    stylePreset: s.stylePreset,
    inlineTagsJson: s.inlineTags,
    tagMetadataJson: s.tagMetadata,
    lighting: s.lighting,
    emotion: s.emotion,
    enhanceEnabled: s.enhanceEnabled,
  })));

  // 4. Create generation plan
  const planId = await planRepo.create({
    timelineId,
    planJson: planData.planJson,
    executionOrder: segmentIds,
    modelsUsed: [...new Set(segments.map(s => s.modelId))],
    estimatedTimeSec: planData.estimatedTimeSec,
    frameChaining: planData.frameChaining,
    inlineTagsUsed: segments.some(s => s.inlineTags && s.inlineTags.length > 0),
    tagSummary: computeTagSummary(segments),
  });

  // Update scenario status
  await scenarioRepo.updateStatus(scenarioId, 'planned');

  return {
    scenarioId,
    timelineId,
    segmentIds,
    planId,
  };
}

/**
 * Compute tag usage summary
 */
function computeTagSummary(segments: Array<{ inlineTags?: any[] }>): Record<string, number> {
  const summary: Record<string, number> = {};
  
  for (const seg of segments) {
    if (seg.inlineTags) {
      for (const tag of seg.inlineTags) {
        summary[tag.type] = (summary[tag.type] || 0) + 1;
      }
    }
  }
  
  return summary;
}

export default {
  ScenarioRepository,
  TimelineDbRepository,
  SegmentDbRepository,
  GenerationPlanRepository,
  saveGeneratedPlanToDb,
};
