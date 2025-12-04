/**
 * R2 Storage Paths Service
 * Centralized management of all R2 object paths for Timeline & Scenario Mode
 */

// ==================== PATH GENERATORS ====================

/**
 * Video storage paths
 */
export const VideoPaths = {
  /**
   * Raw generated segment video
   * @example videos/raw/u_abc123/tl_xyz789/seg_001.mp4
   */
  segmentRaw: (userId: string, timelineId: string, segmentId: string) =>
    `videos/raw/${userId}/${timelineId}/${segmentId}.mp4`,

  /**
   * Enhanced segment video (after upscaling)
   * @example videos/enhanced/u_abc123/tl_xyz789/seg_001.mp4
   */
  segmentEnhanced: (userId: string, timelineId: string, segmentId: string) =>
    `videos/enhanced/${userId}/${timelineId}/${segmentId}.mp4`,

  /**
   * Final concatenated raw video (all segments merged)
   * @example videos/final/u_abc123/tl_xyz789/raw.mp4
   */
  timelineRaw: (userId: string, timelineId: string) =>
    `videos/final/${userId}/${timelineId}/raw.mp4`,

  /**
   * Final concatenated enhanced video
   * @example videos/final/u_abc123/tl_xyz789/enhanced.mp4
   */
  timelineEnhanced: (userId: string, timelineId: string) =>
    `videos/final/${userId}/${timelineId}/enhanced.mp4`,

  /**
   * Final exported video (with audio mix if applicable)
   * @example videos/final/u_abc123/tl_xyz789/export.mp4
   */
  timelineExport: (userId: string, timelineId: string) =>
    `videos/final/${userId}/${timelineId}/export.mp4`,

  /**
   * Segment preview (low-res for quick viewing)
   * @example videos/preview/u_abc123/tl_xyz789/seg_001.mp4
   */
  segmentPreview: (userId: string, timelineId: string, segmentId: string) =>
    `videos/preview/${userId}/${timelineId}/${segmentId}.mp4`,
};

/**
 * Frame storage paths (for segment continuity)
 */
export const FramePaths = {
  /**
   * First frame of segment (used as reference for I2V)
   * @example frames/u_abc123/tl_xyz789/seg_001/first.png
   */
  first: (userId: string, timelineId: string, segmentId: string) =>
    `frames/${userId}/${timelineId}/${segmentId}/first.png`,

  /**
   * Last frame of segment (used as input for next segment)
   * @example frames/u_abc123/tl_xyz789/seg_001/last.png
   */
  last: (userId: string, timelineId: string, segmentId: string) =>
    `frames/${userId}/${timelineId}/${segmentId}/last.png`,

  /**
   * Key frames extracted from segment (for analysis)
   * @example frames/u_abc123/tl_xyz789/seg_001/keyframe_5.png
   */
  keyframe: (userId: string, timelineId: string, segmentId: string, frameNumber: number) =>
    `frames/${userId}/${timelineId}/${segmentId}/keyframe_${frameNumber}.png`,
};

/**
 * Thumbnail storage paths
 */
export const ThumbnailPaths = {
  /**
   * Segment thumbnail (auto-generated from first frame)
   * @example thumbnails/u_abc123/tl_xyz789/seg_001.jpg
   */
  segment: (userId: string, timelineId: string, segmentId: string) =>
    `thumbnails/${userId}/${timelineId}/${segmentId}.jpg`,

  /**
   * Timeline thumbnail (cover for gallery)
   * @example thumbnails/u_abc123/tl_xyz789/cover.jpg
   */
  timeline: (userId: string, timelineId: string) =>
    `thumbnails/${userId}/${timelineId}/cover.jpg`,
};

/**
 * Audio storage paths
 */
export const AudioPaths = {
  /**
   * Original uploaded audio track
   * @example audio/u_abc123/tl_xyz789/original.mp3
   */
  original: (userId: string, timelineId: string, format: string = 'mp3') =>
    `audio/${userId}/${timelineId}/original.${format}`,

  /**
   * Processed/mixed audio (after volume/fade adjustments)
   * @example audio/u_abc123/tl_xyz789/processed.mp3
   */
  processed: (userId: string, timelineId: string) =>
    `audio/${userId}/${timelineId}/processed.mp3`,

  /**
   * Extracted audio from video segments
   * @example audio/u_abc123/tl_xyz789/seg_001_audio.aac
   */
  segmentAudio: (userId: string, timelineId: string, segmentId: string) =>
    `audio/${userId}/${timelineId}/${segmentId}_audio.aac`,
};

/**
 * Cover image storage paths
 */
export const CoverPaths = {
  /**
   * Platform-specific cover image
   * @example covers/u_abc123/tl_xyz789/youtube.png
   */
  platform: (userId: string, timelineId: string, platform: string) =>
    `covers/${userId}/${timelineId}/${platform}.png`,

  /**
   * Cover variant (multiple options per platform)
   * @example covers/u_abc123/tl_xyz789/youtube_v2.png
   */
  variant: (userId: string, timelineId: string, platform: string, variantNumber: number) =>
    `covers/${userId}/${timelineId}/${platform}_v${variantNumber}.png`,
};

/**
 * Storyboard image paths (for Scenario Mode)
 */
export const StoryboardPaths = {
  /**
   * Uploaded storyboard image
   * @example storyboard/u_abc123/sc_xyz789/0.png
   */
  image: (userId: string, scenarioId: string, position: number) =>
    `storyboard/${userId}/${scenarioId}/${position}.png`,

  /**
   * Storyboard thumbnail
   * @example storyboard/u_abc123/sc_xyz789/thumb_0.jpg
   */
  thumbnail: (userId: string, scenarioId: string, position: number) =>
    `storyboard/${userId}/${scenarioId}/thumb_${position}.jpg`,
};

// ==================== URL GENERATORS ====================

const R2_PUBLIC_BASE = 'https://media.pixelperfect.ai';

/**
 * Generate public URL for R2 object
 */
export function getPublicUrl(path: string): string {
  return `${R2_PUBLIC_BASE}/${path}`;
}

/**
 * Parse R2 path to extract components
 */
export function parseR2Path(path: string): {
  type: string;
  userId?: string;
  timelineId?: string;
  segmentId?: string;
  scenarioId?: string;
  filename?: string;
} {
  const parts = path.split('/');
  
  if (path.startsWith('videos/')) {
    return {
      type: parts[1], // raw, enhanced, final, preview
      userId: parts[2],
      timelineId: parts[3],
      segmentId: parts[4]?.replace('.mp4', ''),
      filename: parts[parts.length - 1],
    };
  }
  
  if (path.startsWith('frames/')) {
    return {
      type: 'frame',
      userId: parts[1],
      timelineId: parts[2],
      segmentId: parts[3],
      filename: parts[4],
    };
  }
  
  if (path.startsWith('audio/')) {
    return {
      type: 'audio',
      userId: parts[1],
      timelineId: parts[2],
      filename: parts[3],
    };
  }
  
  if (path.startsWith('covers/')) {
    return {
      type: 'cover',
      userId: parts[1],
      timelineId: parts[2],
      filename: parts[3],
    };
  }
  
  if (path.startsWith('storyboard/')) {
    return {
      type: 'storyboard',
      userId: parts[1],
      scenarioId: parts[2],
      filename: parts[3],
    };
  }
  
  return { type: 'unknown', filename: path };
}

// ==================== STORAGE OPERATIONS ====================

export interface R2UploadResult {
  success: boolean;
  path: string;
  url: string;
  size?: number;
  error?: string;
}

/**
 * Upload file to R2 with metadata
 */
export async function uploadToR2(
  bucket: R2Bucket,
  path: string,
  data: ArrayBuffer | ReadableStream | Blob,
  options?: {
    contentType?: string;
    metadata?: Record<string, string>;
  }
): Promise<R2UploadResult> {
  try {
    const object = await bucket.put(path, data, {
      httpMetadata: {
        contentType: options?.contentType || 'application/octet-stream',
      },
      customMetadata: options?.metadata,
    });

    return {
      success: true,
      path,
      url: getPublicUrl(path),
      size: object.size,
    };
  } catch (error: any) {
    return {
      success: false,
      path,
      url: '',
      error: error.message,
    };
  }
}

/**
 * Delete file from R2
 */
export async function deleteFromR2(
  bucket: R2Bucket,
  path: string
): Promise<boolean> {
  try {
    await bucket.delete(path);
    return true;
  } catch (error) {
    console.error('R2 delete error:', error);
    return false;
  }
}

/**
 * Check if file exists in R2
 */
export async function existsInR2(
  bucket: R2Bucket,
  path: string
): Promise<boolean> {
  try {
    const head = await bucket.head(path);
    return head !== null;
  } catch {
    return false;
  }
}

/**
 * List all objects in a directory
 */
export async function listR2Directory(
  bucket: R2Bucket,
  prefix: string,
  options?: { limit?: number; cursor?: string }
): Promise<{ objects: string[]; truncated: boolean; cursor?: string }> {
  try {
    const listed = await bucket.list({
      prefix,
      limit: options?.limit || 100,
      cursor: options?.cursor,
    });

    return {
      objects: listed.objects.map(o => o.key),
      truncated: listed.truncated,
      cursor: listed.truncated ? listed.cursor : undefined,
    };
  } catch (error) {
    console.error('R2 list error:', error);
    return { objects: [], truncated: false };
  }
}

/**
 * Copy object within R2
 */
export async function copyInR2(
  bucket: R2Bucket,
  sourcePath: string,
  destPath: string
): Promise<boolean> {
  try {
    const source = await bucket.get(sourcePath);
    if (!source) return false;

    await bucket.put(destPath, source.body, {
      httpMetadata: source.httpMetadata,
      customMetadata: source.customMetadata,
    });
    
    return true;
  } catch (error) {
    console.error('R2 copy error:', error);
    return false;
  }
}

// ==================== CLEANUP UTILITIES ====================

/**
 * Delete all assets for a timeline
 */
export async function cleanupTimelineAssets(
  bucket: R2Bucket,
  userId: string,
  timelineId: string
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  // List all paths to clean
  const prefixes = [
    `videos/raw/${userId}/${timelineId}/`,
    `videos/enhanced/${userId}/${timelineId}/`,
    `videos/final/${userId}/${timelineId}/`,
    `videos/preview/${userId}/${timelineId}/`,
    `frames/${userId}/${timelineId}/`,
    `thumbnails/${userId}/${timelineId}/`,
    `audio/${userId}/${timelineId}/`,
    `covers/${userId}/${timelineId}/`,
  ];

  for (const prefix of prefixes) {
    const { objects } = await listR2Directory(bucket, prefix);
    for (const key of objects) {
      const success = await deleteFromR2(bucket, key);
      if (success) deleted++;
      else errors++;
    }
  }

  return { deleted, errors };
}

/**
 * Delete all assets for a scenario
 */
export async function cleanupScenarioAssets(
  bucket: R2Bucket,
  userId: string,
  scenarioId: string
): Promise<{ deleted: number; errors: number }> {
  let deleted = 0;
  let errors = 0;

  const prefix = `storyboard/${userId}/${scenarioId}/`;
  const { objects } = await listR2Directory(bucket, prefix);
  
  for (const key of objects) {
    const success = await deleteFromR2(bucket, key);
    if (success) deleted++;
    else errors++;
  }

  return { deleted, errors };
}

export default {
  VideoPaths,
  FramePaths,
  ThumbnailPaths,
  AudioPaths,
  CoverPaths,
  StoryboardPaths,
  getPublicUrl,
  parseR2Path,
  uploadToR2,
  deleteFromR2,
  existsInR2,
  listR2Directory,
  copyInR2,
  cleanupTimelineAssets,
  cleanupScenarioAssets,
};
