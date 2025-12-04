/**
 * Enhancement Panel Component
 * Toggle and configure AI video upscaling/enhancement per segment
 */

import React, { useState, useEffect } from 'react';
import { Sparkles, Zap, ChevronDown, Check, Loader2 } from 'lucide-react';
import { videoEnhancementApi } from '../../lib/api';

interface Upscaler {
  id: string;
  displayName: string;
  provider: string;
  scaleFactors: number[];
  qualityScore: number;
  creditsPerUse: number;
}

interface EnhancementPanelProps {
  segmentId: string;
  enabled: boolean;
  modelId?: string;
  status?: 'none' | 'pending' | 'queued' | 'processing' | 'done' | 'failed';
  onEnableChange: (enabled: boolean, modelId?: string) => void;
  disabled?: boolean;
  compact?: boolean;
}

export const EnhancementPanel: React.FC<EnhancementPanelProps> = ({
  segmentId,
  enabled,
  modelId,
  status = 'none',
  onEnableChange,
  disabled = false,
  compact = false,
}) => {
  const [upscalers, setUpscalers] = useState<Upscaler[]>([]);
  const [selectedUpscaler, setSelectedUpscaler] = useState<string>(modelId || '');
  const [scaleFactor, setScaleFactor] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    loadUpscalers();
  }, []);

  useEffect(() => {
    if (modelId) setSelectedUpscaler(modelId);
  }, [modelId]);

  const loadUpscalers = async () => {
    try {
      const response = await videoEnhancementApi.getUpscalers();
      if (response.data.success) {
        setUpscalers(response.data.data);
        if (!selectedUpscaler && response.data.data.length > 0) {
          setSelectedUpscaler(response.data.data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to load upscalers:', error);
    }
  };

  const handleToggle = async () => {
    if (disabled) return;
    
    setLoading(true);
    try {
      if (!enabled) {
        await videoEnhancementApi.enableSegment(segmentId, selectedUpscaler, scaleFactor);
        onEnableChange(true, selectedUpscaler);
      } else {
        await videoEnhancementApi.disableSegment(segmentId);
        onEnableChange(false);
      }
    } catch (error) {
      console.error('Failed to toggle enhancement:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpscalerChange = (upscalerId: string) => {
    setSelectedUpscaler(upscalerId);
    setDropdownOpen(false);
    if (enabled) {
      onEnableChange(true, upscalerId);
    }
  };

  const selectedUpscalerData = upscalers.find(u => u.id === selectedUpscaler);

  const getStatusBadge = () => {
    switch (status) {
      case 'queued':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400">Queued</span>;
      case 'processing':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" /> Processing
        </span>;
      case 'done':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 flex items-center gap-1">
          <Check className="w-3 h-3" /> Enhanced
        </span>;
      case 'failed':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">Failed</span>;
      default:
        return null;
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleToggle}
          disabled={disabled || loading}
          className={`
            flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all
            ${enabled 
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/50' 
              : 'bg-slate-700/50 text-slate-400 border border-slate-600 hover:border-slate-500'
            }
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Sparkles className="w-3 h-3" />
          )}
          Enhance
        </button>
        {getStatusBadge()}
      </div>
    );
  }

  return (
    <div className={`
      p-4 rounded-lg border transition-all
      ${enabled 
        ? 'bg-purple-500/10 border-purple-500/30' 
        : 'bg-slate-800/50 border-slate-700'
      }
    `}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className={`w-5 h-5 ${enabled ? 'text-purple-400' : 'text-slate-500'}`} />
          <span className="font-medium text-slate-200">AI Enhancement</span>
          {getStatusBadge()}
        </div>
        
        <button
          onClick={handleToggle}
          disabled={disabled || loading}
          className={`
            relative w-12 h-6 rounded-full transition-all
            ${enabled ? 'bg-purple-500' : 'bg-slate-600'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className={`
            absolute top-1 w-4 h-4 rounded-full bg-white transition-all
            ${enabled ? 'left-7' : 'left-1'}
          `}>
            {loading && <Loader2 className="w-4 h-4 animate-spin text-slate-600" />}
          </div>
        </button>
      </div>

      {enabled && (
        <div className="space-y-3">
          {/* Upscaler Selection */}
          <div className="relative">
            <label className="text-xs text-slate-400 mb-1 block">Upscaler Model</label>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-md text-sm text-slate-200 hover:border-slate-500"
            >
              <span>{selectedUpscalerData?.displayName || 'Select upscaler...'}</span>
              <ChevronDown className={`w-4 h-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {dropdownOpen && (
              <div className="absolute z-10 w-full mt-1 bg-slate-800 border border-slate-600 rounded-md shadow-lg max-h-48 overflow-y-auto">
                {upscalers.map((upscaler) => (
                  <button
                    key={upscaler.id}
                    onClick={() => handleUpscalerChange(upscaler.id)}
                    className={`
                      w-full px-3 py-2 text-left text-sm hover:bg-slate-700/50 flex items-center justify-between
                      ${upscaler.id === selectedUpscaler ? 'bg-purple-500/20 text-purple-300' : 'text-slate-300'}
                    `}
                  >
                    <div>
                      <div className="font-medium">{upscaler.displayName}</div>
                      <div className="text-xs text-slate-500">{upscaler.provider} • {upscaler.scaleFactors.join('x, ')}x</div>
                    </div>
                    <div className="text-xs text-slate-500">{upscaler.creditsPerUse} credits</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Scale Factor */}
          {selectedUpscalerData && (
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Scale Factor</label>
              <div className="flex gap-2">
                {selectedUpscalerData.scaleFactors.map((factor) => (
                  <button
                    key={factor}
                    onClick={() => setScaleFactor(factor)}
                    className={`
                      px-3 py-1.5 rounded-md text-sm font-medium transition-all
                      ${scaleFactor === factor 
                        ? 'bg-purple-500 text-white' 
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }
                    `}
                  >
                    {factor}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Info */}
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Zap className="w-3 h-3" />
            <span>Enhanced videos use {selectedUpscalerData?.creditsPerUse || 10} credits per segment</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancementPanel;
