/**
 * Audio Track Routes
 * API endpoints for audio track upload, settings, and processing
 */

import { Hono } from 'hono';
import { Env, User } from '../types';
import { authMiddleware } from '../middleware/auth';
import { Database, Storage } from '../db/index';
import { TimelineRepository } from '../db/repositories';
import {
  AudioTrackRepository,
  validateAudioFile,
  calculateAudioProcessing,
  getAudioStorageKey,
  AudioSettings,
} from '../services/audioService';

type Variables = {
  user: User;
};

export const audioRoutes = new Hono<{ Bindings: Env; Variables: Variables }>();

// ==================== GET ENDPOINTS ====================

// GET /audio/formats - Get supported audio formats
audioRoutes.get('/audio/formats', async (c) => {
  return c.json({
    success: true,
    data: {
      supported: ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'],
      maxSizeMB: 100,
      recommendedFormat: 'mp3',
      recommendedBitrate: '192kbps',
    },
  });
});

// GET /audio/:timelineId - Get audio track for timeline
audioRoutes.get('/audio/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);
    const audioRepo = new AudioTrackRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline belongs to user
    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const audioTrack = await audioRepo.getByTimeline(timelineId);

    if (!audioTrack) {
      return c.json({
        success: true,
        data: null,
        message: 'No audio track configured',
      });
    }

    // Calculate processing info
    const videoDuration = timeline.total_duration_sec || 0;
    const audioDuration = audioTrack.duration_sec || 0;

    const processingInfo = calculateAudioProcessing(audioDuration, videoDuration, {
      trimToVideo: audioTrack.trim_to_video === 1,
      loopIfShorter: audioTrack.loop_if_shorter === 1,
      startOffsetSec: audioTrack.start_offset_sec,
    });

    return c.json({
      success: true,
      data: {
        ...audioTrack,
        processing: {
          videoDurationSec: videoDuration,
          audioDurationSec: audioDuration,
          ...processingInfo,
        },
      },
    });
  } catch (error: any) {
    console.error('Get audio track error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== POST ENDPOINTS ====================

// POST /audio/upload - Upload audio track
audioRoutes.post('/audio/upload', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const formData = await c.req.formData();
    
    const timelineId = formData.get('timeline_id') as string;
    const file = formData.get('file') as unknown as File;
    const durationSec = formData.get('duration_sec') as string;

    if (!timelineId || !file) {
      return c.json({
        success: false,
        error: 'timeline_id and file are required',
      }, 400);
    }

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const audioRepo = new AudioTrackRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline belongs to user
    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Validate file
    const validation = validateAudioFile(file.name, file.size);
    if (!validation.valid) {
      return c.json({ success: false, error: validation.error }, 400);
    }

    // Delete existing audio track if any
    await audioRepo.deleteByTimeline(timelineId);

    // Upload to R2
    const storageKey = getAudioStorageKey(user.id, timelineId, 'original');
    const arrayBuffer = await file.arrayBuffer();
    
    const uploadResult = await storage.upload(storageKey, arrayBuffer, {
      contentType: file.type || 'audio/mpeg',
      metadata: {
        fileName: file.name,
        timelineId,
        userId: user.id,
      },
    });

    if (!uploadResult.success) {
      return c.json({ success: false, error: 'Upload failed' }, 500);
    }

    // Create audio track record
    const format = file.name.split('.').pop()?.toLowerCase() || 'mp3';
    const audioId = await audioRepo.create(
      {
        timelineId,
        userId: user.id,
        fileName: file.name,
        fileSize: file.size,
        format,
        durationSec: durationSec ? parseFloat(durationSec) : undefined,
      },
      uploadResult.data!.url
    );

    const audioTrack = await audioRepo.getById(audioId);

    return c.json({
      success: true,
      data: audioTrack,
    });
  } catch (error: any) {
    console.error('Upload audio error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /audio/:id/settings - Update audio settings
audioRoutes.post('/audio/:id/settings', authMiddleware(), async (c) => {
  try {
    const audioId = c.req.param('id');
    const body = await c.req.json();

    const db = new Database(c.env.DB);
    const audioRepo = new AudioTrackRepository(db);

    const audioTrack = await audioRepo.getById(audioId);
    if (!audioTrack) {
      return c.json({ success: false, error: 'Audio track not found' }, 404);
    }

    const settings: AudioSettings = {
      volume: body.volume,
      videoAudioVolume: body.video_audio_volume,
      muteVideoAudio: body.mute_video_audio,
      fadeInSec: body.fade_in_sec,
      fadeOutSec: body.fade_out_sec,
      videoFadeInSec: body.video_fade_in_sec,
      videoFadeOutSec: body.video_fade_out_sec,
      trimToVideo: body.trim_to_video,
      loopIfShorter: body.loop_if_shorter,
      startOffsetSec: body.start_offset_sec,
    };

    await audioRepo.updateSettings(audioId, settings);

    const updated = await audioRepo.getById(audioId);

    return c.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('Update audio settings error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /audio/:timelineId/preview - Preview audio mix configuration
audioRoutes.post('/audio/:timelineId/preview', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);
    const audioRepo = new AudioTrackRepository(db);
    const timelineRepo = new TimelineRepository(db);

    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const audioTrack = await audioRepo.getByTimeline(timelineId);
    if (!audioTrack) {
      return c.json({
        success: true,
        data: {
          hasAudioTrack: false,
          videoAudioOnly: true,
        },
      });
    }

    const videoDuration = timeline.total_duration_sec || 0;
    const audioDuration = audioTrack.duration_sec || 0;

    const processing = calculateAudioProcessing(audioDuration, videoDuration, {
      trimToVideo: audioTrack.trim_to_video === 1,
      loopIfShorter: audioTrack.loop_if_shorter === 1,
      startOffsetSec: audioTrack.start_offset_sec,
    });

    return c.json({
      success: true,
      data: {
        hasAudioTrack: true,
        audioTrack: {
          fileName: audioTrack.file_name,
          durationSec: audioDuration,
          volume: audioTrack.volume,
          fadeIn: audioTrack.fade_in_sec,
          fadeOut: audioTrack.fade_out_sec,
        },
        videoAudio: {
          volume: audioTrack.video_audio_volume,
          muted: audioTrack.mute_video_audio === 1,
          fadeIn: audioTrack.video_fade_in_sec,
          fadeOut: audioTrack.video_fade_out_sec,
        },
        processing,
        videoDurationSec: videoDuration,
      },
    });
  } catch (error: any) {
    console.error('Preview audio error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /audio/:timelineId/process - Process/mix audio for export
audioRoutes.post('/audio/:timelineId/process', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');
    const body = await c.req.json();
    const { videoUrl } = body;

    if (!videoUrl) {
      return c.json({ success: false, error: 'videoUrl is required' }, 400);
    }

    const db = new Database(c.env.DB);
    const audioRepo = new AudioTrackRepository(db);
    const timelineRepo = new TimelineRepository(db);

    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    const audioTrack = await audioRepo.getByTimeline(timelineId);
    if (!audioTrack) {
      return c.json({
        success: true,
        data: {
          processed: false,
          message: 'No audio track to process',
          outputUrl: videoUrl,
        },
      });
    }

    // Update status to processing
    await audioRepo.updateStatus(audioTrack.id, 'processing');

    // In production, this would:
    // 1. Download video and audio from R2
    // 2. Run FFmpeg to mix
    // 3. Upload result to R2
    // 4. Return processed URL

    // Mock processing result
    const processedKey = getAudioStorageKey(user.id, timelineId, 'processed');
    const processedUrl = `https://media.pixelperfect.ai/${processedKey.replace('processed.mp3', 'final_mixed.mp4')}`;

    // Update status
    await audioRepo.updateStatus(audioTrack.id, 'processed', processedUrl);

    return c.json({
      success: true,
      data: {
        processed: true,
        audioTrackId: audioTrack.id,
        outputUrl: processedUrl,
        mixedSettings: {
          audioVolume: audioTrack.volume,
          videoAudioVolume: audioTrack.mute_video_audio ? 0 : audioTrack.video_audio_volume,
          fadeIn: audioTrack.fade_in_sec,
          fadeOut: audioTrack.fade_out_sec,
        },
      },
    });
  } catch (error: any) {
    console.error('Process audio error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ==================== DELETE ENDPOINTS ====================

// DELETE /audio/:id - Delete audio track
audioRoutes.delete('/audio/:id', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const audioId = c.req.param('id');

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const audioRepo = new AudioTrackRepository(db);

    const audioTrack = await audioRepo.getById(audioId);
    if (!audioTrack) {
      return c.json({ success: false, error: 'Audio track not found' }, 404);
    }

    // Verify ownership
    if (audioTrack.user_id !== user.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 403);
    }

    // Delete from R2
    const storageKey = getAudioStorageKey(user.id, audioTrack.timeline_id, 'original');
    await storage.delete(storageKey);

    if (audioTrack.processed_url) {
      const processedKey = getAudioStorageKey(user.id, audioTrack.timeline_id, 'processed');
      await storage.delete(processedKey);
    }

    // Delete from D1
    await audioRepo.delete(audioId);

    return c.json({
      success: true,
      message: 'Audio track deleted',
    });
  } catch (error: any) {
    console.error('Delete audio error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// DELETE /audio/timeline/:timelineId - Delete audio track by timeline
audioRoutes.delete('/audio/timeline/:timelineId', authMiddleware(), async (c) => {
  try {
    const user = c.get('user');
    const timelineId = c.req.param('timelineId');

    const db = new Database(c.env.DB);
    const storage = new Storage(c.env.MEDIA_BUCKET);
    const audioRepo = new AudioTrackRepository(db);
    const timelineRepo = new TimelineRepository(db);

    // Verify timeline belongs to user
    const timeline = await timelineRepo.getById(timelineId, user.id);
    if (!timeline) {
      return c.json({ success: false, error: 'Timeline not found' }, 404);
    }

    // Get existing track to clean up R2
    const audioTrack = await audioRepo.getByTimeline(timelineId);
    if (audioTrack) {
      const storageKey = getAudioStorageKey(user.id, timelineId, 'original');
      await storage.delete(storageKey);
    }

    // Delete from D1
    await audioRepo.deleteByTimeline(timelineId);

    return c.json({
      success: true,
      message: 'Audio track removed from timeline',
    });
  } catch (error: any) {
    console.error('Delete timeline audio error:', error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default audioRoutes;
