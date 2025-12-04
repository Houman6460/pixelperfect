import React, { useState } from 'react';
import {
  Plus, Save, Download, Upload, Play, Pause, SkipBack, SkipForward,
  Eye, Film, Settings, Trash2, FolderOpen, FileJson, Wand2, Loader2,
  RefreshCw, Sparkles, Copy, CheckCircle, AlertCircle,
} from 'lucide-react';
import { VideoTimeline } from '../../types/videoTimeline';

interface TimelineControlsProps {
  timeline: VideoTimeline | null;
  isPlaying: boolean;
  isGenerating: boolean;
  hasChanges: boolean;
  onPlay: () => void;
  onPause: () => void;
  onAddSegment: () => void;
  onSave: () => void;
  onExport: () => void;
  onImport: (json: string) => void;
  onGenerateAll: () => void;
  onPreviewAll: () => void;
  onRenderFinal: () => void;
  onNewTimeline: () => void;
  onLoadTimeline: () => void;
  onClear: () => void;
}

export default function TimelineControls({
  timeline,
  isPlaying,
  isGenerating,
  hasChanges,
  onPlay,
  onPause,
  onAddSegment,
  onSave,
  onExport,
  onImport,
  onGenerateAll,
  onPreviewAll,
  onRenderFinal,
  onNewTimeline,
  onLoadTimeline,
  onClear,
}: TimelineControlsProps) {
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJson, setImportJson] = useState('');

  const handleImport = () => {
    if (importJson.trim()) {
      onImport(importJson);
      setShowImportModal(false);
      setImportJson('');
    }
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setImportJson(content);
      };
      reader.readAsText(file);
    }
  };

  const generatedCount = timeline?.segments.filter(s => s.status === 'generated').length || 0;
  const totalCount = timeline?.segments.length || 0;
  const pendingCount = timeline?.segments.filter(s => s.status === 'pending' || s.status === 'modified').length || 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
        {/* File Operations */}
        <div className="flex items-center gap-1 pr-3 border-r border-slate-700">
          <button
            onClick={onNewTimeline}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition"
            title="New Timeline"
            aria-label="New Timeline"
          >
            <Plus className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={onLoadTimeline}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition"
            title="Load Timeline"
            aria-label="Load Timeline"
          >
            <FolderOpen className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={onSave}
            disabled={!timeline || !hasChanges}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50"
            title="Save Timeline"
            aria-label="Save Timeline"
          >
            <Save className={`w-4 h-4 ${hasChanges ? 'text-yellow-400' : 'text-slate-400'}`} />
          </button>
        </div>

        {/* Import/Export */}
        <div className="flex items-center gap-1 pr-3 border-r border-slate-700">
          <button
            onClick={() => setShowImportModal(true)}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition"
            title="Import JSON"
            aria-label="Import JSON"
          >
            <Upload className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={onExport}
            disabled={!timeline}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50"
            title="Export JSON"
            aria-label="Export JSON"
          >
            <Download className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-1 pr-3 border-r border-slate-700">
          <button
            onClick={() => {}}
            disabled={!timeline || generatedCount === 0}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50"
            title="Previous Segment"
            aria-label="Previous Segment"
          >
            <SkipBack className="w-4 h-4 text-slate-400" />
          </button>
          <button
            onClick={isPlaying ? onPause : onPlay}
            disabled={!timeline || generatedCount === 0}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50"
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 text-slate-400" />
            ) : (
              <Play className="w-4 h-4 text-slate-400" />
            )}
          </button>
          <button
            onClick={() => {}}
            disabled={!timeline || generatedCount === 0}
            className="p-2 hover:bg-slate-700/50 rounded-lg transition disabled:opacity-50"
            title="Next Segment"
            aria-label="Next Segment"
          >
            <SkipForward className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Segment Operations */}
        <div className="flex items-center gap-1 pr-3 border-r border-slate-700">
          <button
            onClick={onAddSegment}
            disabled={!timeline}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition disabled:opacity-50"
            title="Add Segment"
            aria-label="Add Segment"
          >
            <Plus className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Add</span>
          </button>
          <button
            onClick={onClear}
            disabled={!timeline || totalCount <= 1}
            className="p-2 hover:bg-red-500/20 rounded-lg transition disabled:opacity-50"
            title="Clear All Segments"
            aria-label="Clear All Segments"
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        </div>

        {/* Status */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {timeline && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              {generatedCount === totalCount && totalCount > 0 ? (
                <CheckCircle className="w-4 h-4 text-emerald-400" />
              ) : pendingCount > 0 ? (
                <AlertCircle className="w-4 h-4 text-yellow-400" />
              ) : null}
              <span>
                {generatedCount}/{totalCount} generated
              </span>
            </div>
          )}
        </div>

        {/* Generation Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPreviewAll}
            disabled={!timeline || pendingCount === 0 || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg transition disabled:opacity-50"
            title="Generate Quick Preview"
            aria-label="Generate Quick Preview"
          >
            <Eye className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Preview</span>
          </button>
          <button
            onClick={onGenerateAll}
            disabled={!timeline || pendingCount === 0 || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 rounded-lg transition disabled:opacity-50"
            title="Generate All Pending"
            aria-label="Generate All Pending"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 text-white" />
            )}
            <span className="text-sm text-white">
              {isGenerating ? 'Generating...' : `Generate (${pendingCount})`}
            </span>
          </button>
          <button
            onClick={onRenderFinal}
            disabled={!timeline || generatedCount !== totalCount || isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 rounded-lg transition disabled:opacity-50"
            title="Render Final Video"
            aria-label="Render Final Video"
          >
            <Film className="w-4 h-4 text-white" />
            <span className="text-sm text-white">Render Final</span>
          </button>
        </div>
      </div>

      {/* Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-slate-900 rounded-xl border border-slate-700 shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-lg font-semibold text-white">Import Timeline</h3>
              <button
                onClick={() => setShowImportModal(false)}
                className="p-1 hover:bg-slate-700/50 rounded transition"
                aria-label="Close modal"
              >
                <Plus className="w-5 h-5 text-slate-400 rotate-45" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Upload JSON File
                </label>
                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-600 rounded-lg cursor-pointer hover:bg-slate-800/50 transition">
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileImport}
                    className="hidden"
                    aria-label="Upload JSON file"
                  />
                  <FileJson className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-400">Click to upload or drop JSON file</span>
                </label>
              </div>
              <div className="text-center text-xs text-slate-500">or</div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Paste JSON
                </label>
                <textarea
                  value={importJson}
                  onChange={(e) => setImportJson(e.target.value)}
                  placeholder='{"timeline_id": "...", "segments": [...]}'
                  className="w-full h-40 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-purple-500/50 font-mono"
                  aria-label="Paste timeline JSON"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 p-4 border-t border-slate-700">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={!importJson.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg transition disabled:opacity-50"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
