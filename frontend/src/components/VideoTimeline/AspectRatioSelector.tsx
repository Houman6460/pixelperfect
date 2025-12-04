/**
 * Aspect Ratio Selector Component
 * Allows selection of video aspect ratio with visual previews
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Square, Tv, Film } from 'lucide-react';
import { resolutionApi } from '../../lib/api';

interface AspectRatio {
  id: string;
  name: string;
  description: string;
  orientation: 'landscape' | 'portrait' | 'square';
  ratio: number;
  useCases: string[];
}

interface AspectRatioSelectorProps {
  value: string;
  onChange: (aspect: string) => void;
  showPlatformHints?: boolean;
  disabled?: boolean;
}

const ASPECT_ICONS: Record<string, React.ReactNode> = {
  '16:9': <Monitor className="w-5 h-5" />,
  '9:16': <Smartphone className="w-5 h-5" />,
  '1:1': <Square className="w-5 h-5" />,
  '4:5': <Smartphone className="w-5 h-5" />,
  '4:3': <Tv className="w-5 h-5" />,
  '21:9': <Film className="w-5 h-5" />,
};

export const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({
  value,
  onChange,
  showPlatformHints = true,
  disabled = false,
}) => {
  const [aspects, setAspects] = useState<AspectRatio[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAspects();
  }, []);

  const loadAspects = async () => {
    try {
      const response = await resolutionApi.getAspects();
      if (response.data.success) {
        setAspects(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load aspects:', error);
      // Fallback to defaults
      setAspects([
        { id: '16:9', name: 'Landscape', description: 'Standard widescreen', orientation: 'landscape', ratio: 16/9, useCases: ['YouTube', 'TV'] },
        { id: '9:16', name: 'Vertical', description: 'Mobile-first', orientation: 'portrait', ratio: 9/16, useCases: ['TikTok', 'Reels', 'Shorts'] },
        { id: '1:1', name: 'Square', description: 'Perfect square', orientation: 'square', ratio: 1, useCases: ['Instagram', 'Facebook'] },
        { id: '4:5', name: 'Portrait', description: 'Optimized for feeds', orientation: 'portrait', ratio: 4/5, useCases: ['Instagram Feed'] },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPreviewStyle = (aspect: AspectRatio) => {
    const baseSize = 40;
    if (aspect.orientation === 'landscape') {
      return { width: baseSize, height: baseSize / aspect.ratio };
    } else if (aspect.orientation === 'portrait') {
      return { width: baseSize * aspect.ratio, height: baseSize };
    }
    return { width: baseSize * 0.8, height: baseSize * 0.8 };
  };

  if (loading) {
    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="w-16 h-16 bg-slate-700/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-slate-300">Aspect Ratio</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {aspects.map((aspect) => {
          const isSelected = value === aspect.id;
          const previewStyle = getPreviewStyle(aspect);
          
          return (
            <button
              key={aspect.id}
              onClick={() => onChange(aspect.id)}
              disabled={disabled}
              className={`
                relative p-3 rounded-lg border-2 transition-all
                ${isSelected 
                  ? 'border-purple-500 bg-purple-500/20' 
                  : 'border-slate-600 bg-slate-800/50 hover:border-slate-500 hover:bg-slate-700/50'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex flex-col items-center gap-2">
                {/* Visual Preview */}
                <div 
                  className={`
                    border-2 rounded-sm flex items-center justify-center
                    ${isSelected ? 'border-purple-400 bg-purple-500/30' : 'border-slate-500 bg-slate-700/50'}
                  `}
                  style={previewStyle}
                >
                  {ASPECT_ICONS[aspect.id] || <Monitor className="w-4 h-4 opacity-50" />}
                </div>
                
                {/* Label */}
                <div className="text-center">
                  <div className={`text-sm font-medium ${isSelected ? 'text-purple-300' : 'text-slate-300'}`}>
                    {aspect.id}
                  </div>
                  <div className="text-xs text-slate-500">{aspect.name}</div>
                </div>
                
                {/* Platform hints */}
                {showPlatformHints && aspect.useCases.length > 0 && (
                  <div className="text-[10px] text-slate-500 text-center truncate w-full">
                    {aspect.useCases.slice(0, 2).join(', ')}
                  </div>
                )}
              </div>
              
              {/* Selected indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-purple-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AspectRatioSelector;
