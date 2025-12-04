import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, AlertTriangle, Zap, Clock, Star, Info } from 'lucide-react';
import { MODEL_CAPABILITY_REGISTRY, ModelCapability } from '../../types/videoTimeline';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  maxDuration?: number;
  showPreviewModels?: boolean;
  disabled?: boolean;
}

export default function ModelSelector({
  value,
  onChange,
  maxDuration,
  showPreviewModels = true,
  disabled = false,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedModel = MODEL_CAPABILITY_REGISTRY[value];
  
  const models = Object.values(MODEL_CAPABILITY_REGISTRY).filter(m => {
    if (!m.is_available) return false;
    if (!showPreviewModels && m.is_preview_model) return false;
    if (search && !m.display_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Group by priority
  const highQualityModels = models.filter(m => m.priority === 'high' && !m.is_preview_model);
  const standardModels = models.filter(m => m.priority === 'standard' && !m.is_preview_model);
  const previewModels = models.filter(m => m.is_preview_model);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderModelOption = (model: ModelCapability) => {
    const isSelected = model.model_id === value;
    const exceedsDuration = maxDuration !== undefined && maxDuration > model.max_duration;

    return (
      <button
        key={model.model_id}
        onClick={() => {
          onChange(model.model_id);
          setIsOpen(false);
        }}
        disabled={exceedsDuration}
        className={`w-full flex items-start gap-3 p-2.5 rounded-lg transition text-left ${
          isSelected
            ? 'bg-purple-500/20 border border-purple-500/50'
            : exceedsDuration
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-slate-700/50'
        }`}
        aria-label={`Select ${model.display_name} model`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-white">{model.display_name}</span>
            {model.is_preview_model && (
              <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded">
                Preview
              </span>
            )}
            {model.quality_score >= 9 && (
              <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {model.min_duration}-{model.max_duration}s
            </span>
            <span>{model.resolution}</span>
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              {model.cost_per_second}/s
            </span>
          </div>
          {exceedsDuration && (
            <div className="flex items-center gap-1 mt-1 text-xs text-orange-400">
              <AlertTriangle className="w-3 h-3" />
              Max duration: {model.max_duration}s
            </div>
          )}
        </div>
        {isSelected && <Check className="w-4 h-4 text-purple-400 flex-shrink-0 mt-1" />}
      </button>
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-900/50 border border-slate-700 rounded-lg text-left transition ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-600'
        }`}
        aria-label="Select video model"
        aria-expanded={isOpen ? "true" : "false"}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-2 min-w-0">
          {selectedModel ? (
            <>
              <span className="text-sm text-white truncate">{selectedModel.display_name}</span>
              {selectedModel.is_preview_model && (
                <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/20 text-yellow-400 rounded flex-shrink-0">
                  Preview
                </span>
              )}
            </>
          ) : (
            <span className="text-sm text-slate-400">Select model...</span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 py-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
          {/* Search */}
          <div className="px-2 pb-2 border-b border-slate-700">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-1.5 bg-slate-900/50 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              aria-label="Search models"
            />
          </div>

          {/* High Quality Models */}
          {highQualityModels.length > 0 && (
            <div className="px-2 pt-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-slate-400">
                <Star className="w-3 h-3 text-yellow-400" />
                High Quality
              </div>
              {highQualityModels.map(renderModelOption)}
            </div>
          )}

          {/* Standard Models */}
          {standardModels.length > 0 && (
            <div className="px-2 pt-2">
              <div className="px-2 py-1 text-xs font-medium text-slate-400">Standard</div>
              {standardModels.map(renderModelOption)}
            </div>
          )}

          {/* Preview Models */}
          {showPreviewModels && previewModels.length > 0 && (
            <div className="px-2 pt-2">
              <div className="flex items-center gap-2 px-2 py-1 text-xs font-medium text-slate-400">
                <Zap className="w-3 h-3 text-yellow-400" />
                Preview (Fast)
              </div>
              {previewModels.map(renderModelOption)}
            </div>
          )}

          {models.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-400 text-center">
              No models found
            </div>
          )}
        </div>
      )}

      {/* Model Info Tooltip */}
      {selectedModel && (
        <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
          <span>{selectedModel.resolution}</span>
          <span>•</span>
          <span>{selectedModel.min_duration}-{selectedModel.max_duration}s</span>
          <span>•</span>
          <span>{selectedModel.cost_per_second} tokens/s</span>
          {!selectedModel.supports_last_frame && (
            <>
              <span>•</span>
              <span className="text-orange-400 flex items-center gap-1">
                <Info className="w-3 h-3" />
                No last-frame support
              </span>
            </>
          )}
        </div>
      )}
    </div>
  );
}
