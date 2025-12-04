/**
 * Audio Track Service
 * Handles audio upload, processing, and mixing for video export
 */

import { Database, Storage, generateId, now } from '../db/index';

// ==================== TYPES ====================

export interface AudioTrack {
  id: string;
  timeline_id: string;
  user_id: string;
  file_url: string;
  file_name: string | null;
  file_size: number | null;
  duration_sec: number | null;
  format: string | null;
  sample_rate: number | null;
  volume: number;
  video_audio_volume: number;
  mute_video_audio: number;
  fade_in_sec: number;
  fade_out_sec: number;
  video_fade_in_sec: number;
  video_fade_out_sec: number;
  trim_to_video: number;
  loop_if_shorter: number;
  start_offset_sec: number;
  status: string;
  processed_url: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface AudioUploadRequest {
  timelineId: string;
  userId: string;
  fileName: string;
  fileSize: number;
  format: string;
  durationSec?: number;
}

export interface AudioSettings {
  volume?: number;
  videoAudioVolume?: number;
  muteVideoAudio?: boolean;
  fadeInSec?: number;
  fadeOutSec?: number;
  videoFadeInSec?: number;
  videoFadeOutSec?: number;
  trimToVideo?: boolean;
  loopIfShorter?: boolean;
  startOffsetSec?: number;
}

export interface AudioMixConfig {
  audioTrackUrl: string;
  videoUrl: string;
  videoDurationSec: number;
  audioSettings: {
    volume: number;
    fadeInSec: number;
    fadeOutSec: number;
    trimToVideo: boolean;
    loopIfShorter: boolean;
    startOffsetSec: number;
  };
  videoAudioSettings: {
    volume: number;
    mute: boolean;
    fadeInSec: number;
    fadeOutSec: number;
  };
}

export interface AudioMixResult {
  success: boolean;
  outputUrl?: string;
  error?: string;
}

// ==================== AUDIO TRACK REPOSITORY ====================

export class AudioTrackRepository {
  constructor(private db: Database) {}

  async create(data: AudioUploadRequest, fileUrl: string): Promise<string> {
    const id = `audio-${generateId()}`;
    await this.db.execute(
      `INSERT INTO audio_tracks (
        id, timeline_id, user_id, file_url, file_name, file_size, 
        format, duration_sec, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.timelineId,
        data.userId,
        fileUrl,
        data.fileName,
        data.fileSize,
        data.format,
        data.durationSec || null,
        now(),
        now(),
      ]
    );
    return id;
  }

  async getByTimeline(timelineId: string): Promise<AudioTrack | null> {
    const result = await this.db.queryFirst<AudioTrack>(
      'SELECT * FROM audio_tracks WHERE timeline_id = ?',
      [timelineId]
    );
    return result.data ?? null;
  }

  async getById(id: string): Promise<AudioTrack | null> {
    const result = await this.db.queryFirst<AudioTrack>(
      'SELECT * FROM audio_tracks WHERE id = ?',
      [id]
    );
    return result.data ?? null;
  }

  async updateSettings(id: string, settings: AudioSettings): Promise<void> {
    const updates: string[] = [];
    const values: unknown[] = [];

    if (settings.volume !== undefined) {
      updates.push('volume = ?');
      values.push(Math.max(0, Math.min(100, settings.volume)));
    }
    if (settings.videoAudioVolume !== undefined) {
      updates.push('video_audio_volume = ?');
      values.push(Math.max(0, Math.min(100, settings.videoAudioVolume)));
    }
    if (settings.muteVideoAudio !== undefined) {
      updates.push('mute_video_audio = ?');
      values.push(settings.muteVideoAudio ? 1 : 0);
    }
    if (settings.fadeInSec !== undefined) {
      updates.push('fade_in_sec = ?');
      values.push(Math.max(0, settings.fadeInSec));
    }
    if (settings.fadeOutSec !== undefined) {
      updates.push('fade_out_sec = ?');
      values.push(Math.max(0, settings.fadeOutSec));
    }
    if (settings.videoFadeInSec !== undefined) {
      updates.push('video_fade_in_sec = ?');
      values.push(Math.max(0, settings.videoFadeInSec));
    }
    if (settings.videoFadeOutSec !== undefined) {
      updates.push('video_fade_out_sec = ?');
      values.push(Math.max(0, settings.videoFadeOutSec));
    }
    if (settings.trimToVideo !== undefined) {
      updates.push('trim_to_video = ?');
      values.push(settings.trimToVideo ? 1 : 0);
    }
    if (settings.loopIfShorter !== undefined) {
      updates.push('loop_if_shorter = ?');
      values.push(settings.loopIfShorter ? 1 : 0);
    }
    if (settings.startOffsetSec !== undefined) {
      updates.push('start_offset_sec = ?');
      values.push(Math.max(0, settings.startOffsetSec));
    }

    if (updates.length === 0) return;

    updates.push('updated_at = ?');
    values.push(now(), id);

    await this.db.execute(
      `UPDATE audio_tracks SET ${updates.join(', ')} WHERE id = ?`,
      values
    );
  }

  async updateStatus(
    id: string,
    status: string,
    processedUrl?: string,
    errorMessage?: string
  ): Promise<void> {
    await this.db.execute(
      `UPDATE audio_tracks SET 
        status = ?, 
        processed_url = ?,
        error_message = ?,
        updated_at = ?
      WHERE id = ?`,
      [status, processedUrl || null, errorMessage || null, now(), id]
    );
  }

  async delete(id: string): Promise<void> {
    await this.db.execute('DELETE FROM audio_tracks WHERE id = ?', [id]);
  }

  async deleteByTimeline(timelineId: string): Promise<void> {
    await this.db.execute('DELETE FROM audio_tracks WHERE timeline_id = ?', [timelineId]);
  }
}

// ==================== AUDIO PROCESSING ====================

/**
 * Validate audio file format
 */
export function validateAudioFile(
  fileName: string,
  fileSize: number
): { valid: boolean; error?: string } {
  const allowedFormats = ['mp3', 'wav', 'aac', 'm4a', 'ogg', 'flac'];
  const maxSize = 100 * 1024 * 1024; // 100MB

  const extension = fileName.split('.').pop()?.toLowerCase();
  if (!extension || !allowedFormats.includes(extension)) {
    return {
      valid: false,
      error: `Invalid audio format. Allowed: ${allowedFormats.join(', ')}`,
    };
  }

  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size: 100MB`,
    };
  }

  return { valid: true };
}

/**
 * Calculate how audio will be processed based on settings and video duration
 */
export function calculateAudioProcessing(
  audioDurationSec: number,
  videoDurationSec: number,
  settings: AudioSettings
): {
  willTrim: boolean;
  willLoop: boolean;
  willExtendWithSilence: boolean;
  finalDurationSec: number;
  loopCount?: number;
} {
  const trimToVideo = settings.trimToVideo !== false;
  const loopIfShorter = settings.loopIfShorter === true;
  const startOffset = settings.startOffsetSec || 0;
  
  const effectiveAudioDuration = audioDurationSec - startOffset;

  if (effectiveAudioDuration >= videoDurationSec) {
    return {
      willTrim: trimToVideo,
      willLoop: false,
      willExtendWithSilence: false,
      finalDurationSec: trimToVideo ? videoDurationSec : effectiveAudioDuration,
    };
  }

  // Audio is shorter than video
  if (loopIfShorter) {
    const loopCount = Math.ceil(videoDurationSec / effectiveAudioDuration);
    return {
      willTrim: true, // Will trim after looping
      willLoop: true,
      willExtendWithSilence: false,
      finalDurationSec: videoDurationSec,
      loopCount,
    };
  }

  return {
    willTrim: false,
    willLoop: false,
    willExtendWithSilence: trimToVideo, // Extend with silence if trim is enabled
    finalDurationSec: trimToVideo ? videoDurationSec : effectiveAudioDuration,
  };
}

/**
 * Build FFmpeg command for audio mixing
 * This is a reference implementation - actual execution would need FFmpeg
 */
export function buildFFmpegMixCommand(config: AudioMixConfig): string {
  const { audioTrackUrl, videoUrl, videoDurationSec, audioSettings, videoAudioSettings } = config;

  const commands: string[] = ['ffmpeg'];

  // Input files
  commands.push(`-i "${videoUrl}"`);
  commands.push(`-i "${audioTrackUrl}"`);

  // Filter complex for audio processing
  const filters: string[] = [];

  // Process added audio track
  let audioFilter = '[1:a]';
  
  // Apply start offset
  if (audioSettings.startOffsetSec > 0) {
    audioFilter += `atrim=start=${audioSettings.startOffsetSec},asetpts=PTS-STARTPTS`;
    filters.push(audioFilter + '[audio_trimmed]');
    audioFilter = '[audio_trimmed]';
  }

  // Apply volume
  if (audioSettings.volume !== 100) {
    const volumeMultiplier = audioSettings.volume / 100;
    filters.push(`${audioFilter}volume=${volumeMultiplier}[audio_vol]`);
    audioFilter = '[audio_vol]';
  }

  // Apply fade in
  if (audioSettings.fadeInSec > 0) {
    filters.push(`${audioFilter}afade=t=in:st=0:d=${audioSettings.fadeInSec}[audio_fadein]`);
    audioFilter = '[audio_fadein]';
  }

  // Apply fade out
  if (audioSettings.fadeOutSec > 0) {
    const fadeStart = videoDurationSec - audioSettings.fadeOutSec;
    filters.push(`${audioFilter}afade=t=out:st=${fadeStart}:d=${audioSettings.fadeOutSec}[audio_fadeout]`);
    audioFilter = '[audio_fadeout]';
  }

  // Trim to video length
  if (audioSettings.trimToVideo) {
    filters.push(`${audioFilter}atrim=0:${videoDurationSec}[audio_final]`);
    audioFilter = '[audio_final]';
  }

  // Process video audio
  let videoAudioFilter = '[0:a]';

  if (videoAudioSettings.mute) {
    // Mute video audio - use null audio
    filters.push('anullsrc=r=48000:cl=stereo[video_audio_muted]');
    videoAudioFilter = '[video_audio_muted]';
  } else {
    // Apply video audio volume
    if (videoAudioSettings.volume !== 100) {
      const volumeMultiplier = videoAudioSettings.volume / 100;
      filters.push(`${videoAudioFilter}volume=${volumeMultiplier}[video_audio_vol]`);
      videoAudioFilter = '[video_audio_vol]';
    }

    // Apply video audio fade in
    if (videoAudioSettings.fadeInSec > 0) {
      filters.push(`${videoAudioFilter}afade=t=in:st=0:d=${videoAudioSettings.fadeInSec}[video_audio_fi]`);
      videoAudioFilter = '[video_audio_fi]';
    }

    // Apply video audio fade out
    if (videoAudioSettings.fadeOutSec > 0) {
      const fadeStart = videoDurationSec - videoAudioSettings.fadeOutSec;
      filters.push(`${videoAudioFilter}afade=t=out:st=${fadeStart}:d=${videoAudioSettings.fadeOutSec}[video_audio_fo]`);
      videoAudioFilter = '[video_audio_fo]';
    }
  }

  // Mix audio tracks
  filters.push(`${audioFilter}${videoAudioFilter}amix=inputs=2:duration=first[mixed_audio]`);

  // Add filter complex
  if (filters.length > 0) {
    commands.push(`-filter_complex "${filters.join(';')}"`);
  }

  // Map video and mixed audio
  commands.push('-map 0:v');
  commands.push('-map [mixed_audio]');

  // Output settings
  commands.push('-c:v copy');
  commands.push('-c:a aac -b:a 192k');
  commands.push('-shortest');

  return commands.join(' ');
}

/**
 * Get R2 storage key for audio file
 */
export function getAudioStorageKey(
  userId: string,
  timelineId: string,
  type: 'original' | 'processed' = 'original'
): string {
  return `audio/${userId}/${timelineId}/${type === 'processed' ? 'processed.mp3' : 'track.mp3'}`;
}

// ==================== EXPORT ====================

export default {
  AudioTrackRepository,
  validateAudioFile,
  calculateAudioProcessing,
  buildFFmpegMixCommand,
  getAudioStorageKey,
};
