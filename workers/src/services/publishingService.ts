/**
 * Publishing Service
 * Handles video publishing to social platforms
 */

import {
  PublishJob,
  PublishPlatform,
  PublishStatus,
  PublishRequest,
  PlatformCredentials,
} from '../types/gallery';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Platform-specific configuration
 */
const PLATFORM_CONFIG: Record<PublishPlatform, {
  name: string;
  maxTitleLength: number;
  maxDescriptionLength: number;
  maxTags: number;
  maxHashtags: number;
  supportsChapters: boolean;
  supportsScheduling: boolean;
  rateLimitPerHour: number;
}> = {
  youtube: {
    name: 'YouTube',
    maxTitleLength: 100,
    maxDescriptionLength: 5000,
    maxTags: 500,
    maxHashtags: 15,
    supportsChapters: true,
    supportsScheduling: true,
    rateLimitPerHour: 6,
  },
  tiktok: {
    name: 'TikTok',
    maxTitleLength: 150,
    maxDescriptionLength: 2200,
    maxTags: 0,
    maxHashtags: 30,
    supportsChapters: false,
    supportsScheduling: true,
    rateLimitPerHour: 10,
  },
  instagram: {
    name: 'Instagram Reels',
    maxTitleLength: 0,
    maxDescriptionLength: 2200,
    maxTags: 0,
    maxHashtags: 30,
    supportsChapters: false,
    supportsScheduling: true,
    rateLimitPerHour: 10,
  },
  facebook: {
    name: 'Facebook',
    maxTitleLength: 255,
    maxDescriptionLength: 63206,
    maxTags: 0,
    maxHashtags: 30,
    supportsChapters: false,
    supportsScheduling: true,
    rateLimitPerHour: 10,
  },
  vimeo: {
    name: 'Vimeo',
    maxTitleLength: 128,
    maxDescriptionLength: 5000,
    maxTags: 20,
    maxHashtags: 0,
    supportsChapters: true,
    supportsScheduling: true,
    rateLimitPerHour: 10,
  },
  twitch: {
    name: 'Twitch',
    maxTitleLength: 140,
    maxDescriptionLength: 300,
    maxTags: 10,
    maxHashtags: 0,
    supportsChapters: false,
    supportsScheduling: false,
    rateLimitPerHour: 5,
  },
};

/**
 * Create a publish job
 */
export function createPublishJob(request: PublishRequest, userId: string): PublishJob {
  const config = PLATFORM_CONFIG[request.platform];
  
  // Truncate content to platform limits
  const title = request.title.substring(0, config.maxTitleLength);
  const description = request.description.substring(0, config.maxDescriptionLength);
  const tags = (request.tags || []).slice(0, config.maxTags);
  const hashtags = (request.hashtags || []).slice(0, config.maxHashtags);

  return {
    id: `pub-${generateId()}`,
    project_id: request.project_id,
    user_id: userId,
    platform: request.platform,
    video_url: '', // Will be set when video is ready
    title,
    description,
    tags,
    hashtags,
    category: request.category,
    thumbnail_url: request.thumbnail_url,
    visibility: request.visibility,
    scheduled_at: request.scheduled_at,
    status: 'pending',
    retry_count: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Format description with hashtags for platform
 */
export function formatDescriptionWithHashtags(
  description: string,
  hashtags: string[],
  platform: PublishPlatform
): string {
  const config = PLATFORM_CONFIG[platform];
  
  if (config.maxHashtags === 0 || hashtags.length === 0) {
    return description;
  }

  const hashtagString = hashtags
    .map(h => h.startsWith('#') ? h : `#${h}`)
    .join(' ');

  switch (platform) {
    case 'tiktok':
    case 'instagram':
      // Hashtags at the end
      return `${description}\n\n${hashtagString}`;
    case 'youtube':
      // Hashtags in first 3 lines for visibility
      const firstThree = hashtags.slice(0, 3).map(h => h.startsWith('#') ? h : `#${h}`).join(' ');
      return `${firstThree}\n\n${description}`;
    default:
      return `${description}\n\n${hashtagString}`;
  }
}

/**
 * Generate YouTube chapters from timestamps
 */
export function formatYouTubeChapters(
  chapters: { time_sec: number; title: string }[]
): string {
  if (chapters.length < 3) {
    return ''; // YouTube requires at least 3 chapters
  }

  return chapters.map(ch => {
    const mins = Math.floor(ch.time_sec / 60);
    const secs = ch.time_sec % 60;
    const time = `${mins}:${secs.toString().padStart(2, '0')}`;
    return `${time} ${ch.title}`;
  }).join('\n');
}

/**
 * Build full YouTube description
 */
export function buildYouTubeDescription(
  description: string,
  hashtags: string[],
  chapters?: { time_sec: number; title: string }[]
): string {
  let fullDescription = description;

  // Add chapters
  if (chapters && chapters.length >= 3) {
    const chaptersText = formatYouTubeChapters(chapters);
    fullDescription = `${description}\n\n📑 Chapters:\n${chaptersText}`;
  }

  // Add hashtags
  if (hashtags.length > 0) {
    const hashtagString = hashtags.slice(0, 3)
      .map(h => h.startsWith('#') ? h : `#${h}`)
      .join(' ');
    fullDescription = `${hashtagString}\n\n${fullDescription}`;
  }

  return fullDescription;
}

/**
 * Check rate limits for platform
 */
export function checkRateLimit(
  platform: PublishPlatform,
  recentUploads: { created_at: string }[]
): { allowed: boolean; resetAt?: Date } {
  const config = PLATFORM_CONFIG[platform];
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  const recentCount = recentUploads.filter(
    u => new Date(u.created_at) > oneHourAgo
  ).length;

  if (recentCount >= config.rateLimitPerHour) {
    // Find when the oldest upload in the window will expire
    const oldestInWindow = recentUploads
      .filter(u => new Date(u.created_at) > oneHourAgo)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];
    
    const resetAt = new Date(new Date(oldestInWindow.created_at).getTime() + 60 * 60 * 1000);
    
    return { allowed: false, resetAt };
  }

  return { allowed: true };
}

/**
 * Get OAuth URL for platform
 */
export function getOAuthUrl(platform: PublishPlatform, redirectUri: string, state: string): string {
  const scopes: Record<PublishPlatform, string> = {
    youtube: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube',
    tiktok: 'video.upload',
    instagram: 'instagram_basic,instagram_content_publish',
    facebook: 'pages_manage_posts,pages_read_engagement',
    vimeo: 'upload,edit,delete',
    twitch: 'channel:manage:videos',
  };

  // These would be actual OAuth URLs - placeholder for now
  const baseUrls: Record<PublishPlatform, string> = {
    youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
    tiktok: 'https://www.tiktok.com/auth/authorize/',
    instagram: 'https://api.instagram.com/oauth/authorize',
    facebook: 'https://www.facebook.com/v18.0/dialog/oauth',
    vimeo: 'https://api.vimeo.com/oauth/authorize',
    twitch: 'https://id.twitch.tv/oauth2/authorize',
  };

  // Note: In production, you'd build actual OAuth URLs with client_id, redirect_uri, scope, state
  return `${baseUrls[platform]}?scope=${encodeURIComponent(scopes[platform])}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
}

/**
 * Platform-specific upload handlers (stubs for actual API integration)
 */
export const platformUploaders = {
  youtube: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use YouTube Data API v3
    console.log('YouTube upload:', job.title);
    return {
      videoId: `yt-${generateId()}`,
      url: `https://youtube.com/watch?v=mock-${generateId()}`,
    };
  },

  tiktok: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use TikTok API
    console.log('TikTok upload:', job.title);
    return {
      videoId: `tt-${generateId()}`,
      url: `https://tiktok.com/@user/video/mock-${generateId()}`,
    };
  },

  instagram: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use Instagram Graph API
    console.log('Instagram upload:', job.title);
    return {
      videoId: `ig-${generateId()}`,
      url: `https://instagram.com/reel/mock-${generateId()}`,
    };
  },

  facebook: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use Facebook Graph API
    console.log('Facebook upload:', job.title);
    return {
      videoId: `fb-${generateId()}`,
      url: `https://facebook.com/video/mock-${generateId()}`,
    };
  },

  vimeo: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use Vimeo API
    console.log('Vimeo upload:', job.title);
    return {
      videoId: `vm-${generateId()}`,
      url: `https://vimeo.com/mock-${generateId()}`,
    };
  },

  twitch: async (job: PublishJob, credentials: PlatformCredentials): Promise<{ videoId: string; url: string }> => {
    // Stub - would use Twitch API
    console.log('Twitch upload:', job.title);
    return {
      videoId: `tw-${generateId()}`,
      url: `https://twitch.tv/videos/mock-${generateId()}`,
    };
  },
};

/**
 * Database queries for publishing
 */
export const publishQueries = {
  createJob: `
    INSERT INTO publish_jobs (
      id, project_id, user_id, platform, video_url, title, description,
      tags, hashtags, category, thumbnail_url, chapters, visibility,
      scheduled_at, status, retry_count, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  updateJobStatus: `
    UPDATE publish_jobs SET
      status = ?,
      platform_video_id = ?,
      platform_url = ?,
      error_message = ?,
      retry_count = ?,
      published_at = ?,
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `,

  getJobsByProject: `SELECT * FROM publish_jobs WHERE project_id = ? AND user_id = ? ORDER BY created_at DESC`,

  getPendingJobs: `SELECT * FROM publish_jobs WHERE user_id = ? AND status IN ('pending', 'rate_limited') ORDER BY created_at ASC`,

  getRecentUploads: `
    SELECT * FROM publish_jobs 
    WHERE user_id = ? AND platform = ? AND status = 'published' 
    AND created_at > datetime('now', '-1 hour')
  `,

  saveCredentials: `
    INSERT OR REPLACE INTO platform_credentials (
      id, user_id, platform, access_token, refresh_token, expires_at,
      channel_id, channel_name, profile_image, connected_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,

  getCredentials: `SELECT * FROM platform_credentials WHERE user_id = ? AND platform = ?`,

  deleteCredentials: `DELETE FROM platform_credentials WHERE user_id = ? AND platform = ?`,

  listConnectedPlatforms: `SELECT platform, channel_name, profile_image, connected_at FROM platform_credentials WHERE user_id = ?`,
};

export default {
  createPublishJob,
  formatDescriptionWithHashtags,
  formatYouTubeChapters,
  buildYouTubeDescription,
  checkRateLimit,
  getOAuthUrl,
  platformUploaders,
  publishQueries,
  PLATFORM_CONFIG,
};
