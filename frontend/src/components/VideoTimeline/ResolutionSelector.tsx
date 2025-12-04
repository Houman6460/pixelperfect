/**
 * Resolution Selector Component
 * Select video output resolution
 */

import React, { useState, useEffect } from 'react';
import { Monitor, Loader2 } from 'lucide-react';
import { resolutionApi } from '../../lib/api';

interface Resolution {
  id: string;
  name: string;
  width: number;
  height: number;
}

interface ResolutionSelectorProps {
  value: string;
  aspectRatio?: string;
  onChange: (resolution: string) => void;
  disabled?: boolean;
}

export const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({
  value,
  aspectRatio = '16:9',
  onChange,
  disabled = false,
}) => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResolutions();
  }, []);

  const loadResolutions = async () => {
    try {
      const response = await resolutionApi.getResolutions();
      if (response.data.success) {
        setResolutions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load resolutions:', error);
      // Fallback to defaults
      setResolutions([
        { id: '480p', name: '480p', width: 854, height: 480 },
        { id: '720p', name: '720p HD', width: 1280, height: 720 },
        { id: '1080p', name: '1080p Full HD', width: 1920, height: 1080 },
        { id: '4k', name: '4K Ultra HD', width: 3840, height: 2160 },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" />
        <span className="text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-slate-300">Resolution</label>
      <div className="flex flex-wrap gap-2">
        {resolutions.map((res) => {
          const isSelected = value === res.id;
          
          return (
            <button
              key={res.id}
              onClick={() => onChange(res.id)}
              disabled={disabled}
              className={`
                px-3 py-2 rounded-lg border text-sm font-medium transition-all
                ${isSelected 
                  ? 'border-purple-500 bg-purple-500/20 text-purple-300' 
                  : 'border-slate-600 bg-slate-800/50 text-slate-400 hover:border-slate-500'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="flex items-center gap-2">
                <Monitor className="w-4 h-4" />
                <span>{res.name}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default ResolutionSelector;
