/**
 * Gallery Service
 * Manages video projects, versions, and metadata generation
 */

import {
  VideoProject,
  ProjectFolder,
  GeneratedMetadata,
  CreateProjectRequest,
  UpdateProjectRequest,
  GenerateMetadataRequest,
  GalleryFilters,
  PublishPlatform,
} from '../types/gallery';

/**
 * Generate unique ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate metadata for a project using AI
 */
export async function generateMetadata(
  request: GenerateMetadataRequest,
  openaiKey?: string
): Promise<GeneratedMetadata> {
  const {
    project_id,
    scenario,
    style = 'cinematic',
    target_platforms = ['youtube', 'tiktok', 'instagram'],
  } = request;

  // Default metadata
  const metadata: GeneratedMetadata = {
    id: `meta-${generateId()}`,
    project_id,
    suggested_titles: [],
    suggested_descriptions: [],
    suggested_tags: [],
    suggested_hashtags: {} as Record<PublishPlatform, string[]>,
    seo_keywords: [],
    thumbnail_suggestions: [],
    social_posts: {} as Record<PublishPlatform, string>,
    created_at: new Date().toISOString(),
  };

  // Try AI generation
  if (openaiKey && scenario) {
    try {
      const systemPrompt = `You are a social media and video SEO expert. Generate optimized metadata for a video based on its scenario.

Output a JSON object with:
{
  "titles": ["title1", "title2", "title3"], // 3 attention-grabbing titles
  "descriptions": ["desc1", "desc2"], // 2 SEO-optimized descriptions
  "tags": ["tag1", "tag2", ...], // 10-15 relevant tags
  "youtube_hashtags": ["#tag1", "#tag2", ...], // 5 YouTube hashtags
  "tiktok_hashtags": ["#tag1", "#tag2", ...], // 10 TikTok hashtags
  "instagram_hashtags": ["#tag1", "#tag2", ...], // 15 Instagram hashtags
  "seo_keywords": ["keyword1", "keyword2", ...], // 10 SEO keywords
  "youtube_post": "Short social media post for YouTube community tab",
  "tiktok_caption": "Short engaging TikTok caption with emojis",
  "instagram_caption": "Instagram caption with call-to-action"
}

Style: ${style}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Generate metadata for this video scenario:\n\n${scenario.substring(0, 2000)}` },
          ],
          max_tokens: 1500,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json() as { choices: { message: { content: string } }[] };
        const content = data.choices[0]?.message?.content?.trim();
        
        if (content) {
          try {
            // Extract JSON from response
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              
              metadata.suggested_titles = parsed.titles || [];
              metadata.suggested_descriptions = parsed.descriptions || [];
              metadata.suggested_tags = parsed.tags || [];
              metadata.seo_keywords = parsed.seo_keywords || [];
              
              metadata.suggested_hashtags = {
                youtube: parsed.youtube_hashtags || [],
                tiktok: parsed.tiktok_hashtags || [],
                instagram: parsed.instagram_hashtags || [],
                facebook: parsed.instagram_hashtags || [],
                vimeo: parsed.youtube_hashtags || [],
                twitch: parsed.youtube_hashtags || [],
              };
              
              metadata.social_posts = {
                youtube: parsed.youtube_post || '',
                tiktok: parsed.tiktok_caption || '',
                instagram: parsed.instagram_caption || '',
                facebook: parsed.instagram_caption || '',
                vimeo: parsed.youtube_post || '',
                twitch: parsed.youtube_post || '',
              };
            }
          } catch (parseErr) {
            console.error('Failed to parse AI metadata:', parseErr);
          }
        }
      }
    } catch (error) {
      console.error('AI metadata generation failed:', error);
    }
  }

  // Fallback: Generate basic metadata from scenario
  if (metadata.suggested_titles.length === 0 && scenario) {
    const words = scenario.split(/\s+/).slice(0, 10).join(' ');
    metadata.suggested_titles = [
      words.substring(0, 50) + '...',
      `${style.charAt(0).toUpperCase() + style.slice(1)} Video`,
      'AI Generated Video',
    ];
    
    metadata.suggested_descriptions = [
      scenario.substring(0, 200),
      `A ${style} video created with AI.`,
    ];
    
    metadata.suggested_tags = ['ai', 'video', 'generated', style];
    metadata.seo_keywords = ['ai video', 'generated content', style];
  }

  return metadata;
}

/**
 * Generate chapter markers from scenario breakdown
 */
export function generateChapters(
  scenes: { title?: string; estimated_duration_sec: number; summary: string }[]
): { time_sec: number; title: string }[] {
  const chapters: { time_sec: number; title: string }[] = [];
  let currentTime = 0;

  scenes.forEach((scene, index) => {
    chapters.push({
      time_sec: currentTime,
      title: scene.title || `Scene ${index + 1}: ${scene.summary.substring(0, 50)}`,
    });
    currentTime += scene.estimated_duration_sec;
  });

  return chapters;
}

/**
 * Generate thumbnail prompt from scenario
 */
export function generateThumbnailPrompt(scenario: string, style: string = 'cinematic'): string {
  // Extract key visual elements
  const words = scenario.toLowerCase();
  
  const visualElements: string[] = [];
  
  // Detect setting
  if (words.includes('mountain') || words.includes('nature')) visualElements.push('majestic landscape');
  if (words.includes('city') || words.includes('urban')) visualElements.push('urban cityscape');
  if (words.includes('space') || words.includes('galaxy')) visualElements.push('cosmic space scene');
  if (words.includes('ocean') || words.includes('sea')) visualElements.push('dramatic ocean view');
  
  // Detect mood
  if (words.includes('dark') || words.includes('mysterious')) visualElements.push('moody lighting');
  if (words.includes('bright') || words.includes('happy')) visualElements.push('vibrant colors');
  if (words.includes('romantic')) visualElements.push('warm golden hour');
  
  const elements = visualElements.length > 0 
    ? visualElements.join(', ')
    : 'dramatic scene, compelling composition';
  
  return `YouTube thumbnail style, ${style}, ${elements}, eye-catching, high contrast, professional, 16:9 aspect ratio`;
}

/**
 * Project storage helpers (for D1 database integration)
 */
export const projectQueries = {
  create: `
    INSERT INTO video_projects (
      id, user_id, title, description, original_scenario, improved_scenario,
      timeline_id, video_url, thumbnail_url, duration_sec, resolution,
      aspect_ratio, fps, model_used, folder_id, tags, is_favorite, status,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  
  update: `
    UPDATE video_projects SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      improved_scenario = COALESCE(?, improved_scenario),
      video_url = COALESCE(?, video_url),
      thumbnail_url = COALESCE(?, thumbnail_url),
      folder_id = COALESCE(?, folder_id),
      tags = COALESCE(?, tags),
      is_favorite = COALESCE(?, is_favorite),
      status = COALESCE(?, status),
      updated_at = ?
    WHERE id = ? AND user_id = ?
  `,
  
  getById: `SELECT * FROM video_projects WHERE id = ? AND user_id = ?`,
  
  list: `
    SELECT * FROM video_projects 
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `,
  
  delete: `DELETE FROM video_projects WHERE id = ? AND user_id = ?`,
  
  search: `
    SELECT * FROM video_projects
    WHERE user_id = ? AND (
      title LIKE ? OR
      description LIKE ? OR
      tags LIKE ?
    )
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `,
};

export const folderQueries = {
  create: `
    INSERT INTO project_folders (id, user_id, name, description, color, icon, parent_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
  
  list: `SELECT * FROM project_folders WHERE user_id = ? ORDER BY name ASC`,
  
  delete: `DELETE FROM project_folders WHERE id = ? AND user_id = ?`,
  
  updateProjectCount: `
    UPDATE project_folders SET project_count = (
      SELECT COUNT(*) FROM video_projects WHERE folder_id = ?
    ) WHERE id = ?
  `,
};

export default {
  generateMetadata,
  generateChapters,
  generateThumbnailPrompt,
  projectQueries,
  folderQueries,
};
