/**
 * Publish Panel Component
 * Publish video to social media platforms
 */

import React, { useState, useEffect } from 'react';
import { Share2, Youtube, Instagram, Check, Loader2, ExternalLink, Clock } from 'lucide-react';
import { resolutionApi, projectsApi } from '../../lib/api';

interface Platform {
  id: string;
  platform: string;
  display_name: string;
  recommended_aspect: string;
  supported_aspects: string[];
  max_duration_sec: number;
}

interface PublishJob {
  id: string;
  platform: string;
  status: 'pending' | 'processing' | 'published' | 'failed';
  published_url?: string;
  error?: string;
  created_at: string;
}

interface PublishPanelProps {
  projectId: string;
  videoUrl?: string;
  currentAspect?: string;
  videoDuration?: number;
  onPublish?: (platforms: string[]) => void;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube className="w-5 h-5" />,
  'youtube-shorts': <Youtube className="w-5 h-5" />,
  instagram: <Instagram className="w-5 h-5" />,
  'instagram-feed': <Instagram className="w-5 h-5" />,
  'instagram-reels': <Instagram className="w-5 h-5" />,
  tiktok: <span className="text-lg font-bold">T</span>,
  facebook: <span className="text-lg font-bold">f</span>,
};

const PLATFORM_COLORS: Record<string, string> = {
  youtube: 'text-red-500',
  'youtube-shorts': 'text-red-500',
  instagram: 'text-pink-500',
  'instagram-feed': 'text-pink-500',
  'instagram-reels': 'text-pink-500',
  tiktok: 'text-cyan-400',
  facebook: 'text-blue-500',
};

export const PublishPanel: React.FC<PublishPanelProps> = ({
  projectId,
  videoUrl,
  currentAspect = '16:9',
  videoDuration = 60,
  onPublish,
}) => {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [publishJobs, setPublishJobs] = useState<PublishJob[]>([]);
  const [loading, setLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);

  useEffect(() => {
    loadPlatforms();
    loadPublishJobs();
  }, [projectId]);

  const loadPlatforms = async () => {
    try {
      const response = await resolutionApi.getPlatforms();
      if (response.data.success) {
        setPlatforms(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load platforms:', error);
    }
  };

  const loadPublishJobs = async () => {
    try {
      const response = await projectsApi.getPublishJobs(projectId);
      if (response.data.success) {
        setPublishJobs(response.data.data || []);
      }
    } catch (error: any) {
      // 404 is expected if no publish jobs exist yet - silently ignore
      if (error?.response?.status !== 404) {
        console.error('Failed to load publish jobs:', error);
      }
    }
  };

  const togglePlatform = (platformId: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platformId)
        ? prev.filter(p => p !== platformId)
        : [...prev, platformId]
    );
  };

  const handlePublish = async () => {
    if (selectedPlatforms.length === 0) return;
    
    setPublishing(true);
    try {
      await projectsApi.createPublishJob(projectId, selectedPlatforms);
      onPublish?.(selectedPlatforms);
      setSelectedPlatforms([]);
      loadPublishJobs();
    } catch (error) {
      console.error('Failed to publish:', error);
    } finally {
      setPublishing(false);
    }
  };

  const isPlatformCompatible = (platform: Platform) => {
    const aspectCompatible = platform.supported_aspects.includes(currentAspect);
    const durationCompatible = videoDuration <= platform.max_duration_sec;
    return aspectCompatible && durationCompatible;
  };

  const getCompatibilityWarning = (platform: Platform) => {
    const warnings = [];
    if (!platform.supported_aspects.includes(currentAspect)) {
      warnings.push(`Requires ${platform.recommended_aspect} aspect`);
    }
    if (videoDuration > platform.max_duration_sec) {
      warnings.push(`Max ${platform.max_duration_sec}s duration`);
    }
    return warnings;
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Share2 className="w-5 h-5 text-purple-400" />
          <span className="font-medium text-slate-200">Publish Video</span>
        </div>
        
        {selectedPlatforms.length > 0 && (
          <button
            onClick={handlePublish}
            disabled={publishing || !videoUrl}
            className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {publishing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Share2 className="w-4 h-4" />
            )}
            Publish to {selectedPlatforms.length} platform{selectedPlatforms.length > 1 ? 's' : ''}
          </button>
        )}
      </div>

      {/* Platform Grid */}
      <div className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {platforms.map((platform) => {
            const isSelected = selectedPlatforms.includes(platform.id);
            const isCompatible = isPlatformCompatible(platform);
            const warnings = getCompatibilityWarning(platform);
            
            return (
              <button
                key={platform.id}
                onClick={() => togglePlatform(platform.id)}
                disabled={!isCompatible}
                className={`
                  relative p-3 rounded-lg border-2 transition-all text-left
                  ${isSelected 
                    ? 'border-purple-500 bg-purple-500/20' 
                    : isCompatible
                      ? 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                      : 'border-slate-700 bg-slate-800/30 opacity-50 cursor-not-allowed'
                  }
                `}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className={PLATFORM_COLORS[platform.platform] || 'text-slate-400'}>
                    {PLATFORM_ICONS[platform.platform] || <Share2 className="w-5 h-5" />}
                  </span>
                  <span className="font-medium text-slate-200 text-sm">{platform.display_name}</span>
                </div>
                
                <div className="text-xs text-slate-500">
                  {platform.recommended_aspect} • {Math.floor(platform.max_duration_sec / 60)}m max
                </div>
                
                {warnings.length > 0 && (
                  <div className="mt-1 text-xs text-yellow-500">
                    {warnings[0]}
                  </div>
                )}
                
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Recent Publish Jobs */}
      {publishJobs.length > 0 && (
        <div className="p-4 border-t border-slate-700">
          <h4 className="text-sm font-medium text-slate-400 mb-3">Recent Publications</h4>
          <div className="space-y-2">
            {publishJobs.slice(0, 5).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-2 bg-slate-700/30 rounded-md">
                <div className="flex items-center gap-2">
                  <span className={PLATFORM_COLORS[job.platform] || 'text-slate-400'}>
                    {PLATFORM_ICONS[job.platform] || <Share2 className="w-4 h-4" />}
                  </span>
                  <span className="text-sm text-slate-300">{job.platform}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {job.status === 'pending' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Pending
                    </span>
                  )}
                  {job.status === 'processing' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  )}
                  {job.status === 'published' && job.published_url && (
                    <a
                      href={job.published_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1 hover:bg-green-500/30"
                    >
                      <Check className="w-3 h-3" /> View <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {job.status === 'failed' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                      Failed
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublishPanel;
