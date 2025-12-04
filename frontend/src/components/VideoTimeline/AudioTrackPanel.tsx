/**
 * Audio Track Panel Component
 * Upload and configure background audio for timeline
 */

import React, { useState, useEffect, useRef } from 'react';
import { Music, Upload, Volume2, VolumeX, Trash2, Loader2, Play, Pause } from 'lucide-react';
import { audioTrackApi } from '../../lib/api';

interface AudioTrack {
  id: string;
  timeline_id: string;
  filename: string;
  duration_sec: number;
  volume: number;
  video_audio_volume: number;
  mute_video_audio: boolean;
  fade_in_sec: number;
  fade_out_sec: number;
  trim_to_video: boolean;
  loop_if_shorter: boolean;
  audio_url?: string;
}

interface AudioTrackPanelProps {
  timelineId: string;
  videoDuration?: number;
  onAudioChange?: (track: AudioTrack | null) => void;
}

export const AudioTrackPanel: React.FC<AudioTrackPanelProps> = ({
  timelineId,
  videoDuration = 60,
  onAudioChange,
}) => {
  const [track, setTrack] = useState<AudioTrack | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadTrack();
  }, [timelineId]);

  const loadTrack = async () => {
    setLoading(true);
    try {
      const response = await audioTrackApi.getByTimeline(timelineId);
      if (response.data.success && response.data.data) {
        setTrack(response.data.data);
        onAudioChange?.(response.data.data);
      }
    } catch (error) {
      console.error('Failed to load audio track:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const response = await audioTrackApi.upload(timelineId, file, videoDuration);
      if (response.data.success) {
        setTrack(response.data.data);
        onAudioChange?.(response.data.data);
        setExpanded(true);
      }
    } catch (error) {
      console.error('Failed to upload audio:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleSettingChange = async (settings: Partial<AudioTrack>) => {
    if (!track) return;
    
    try {
      await audioTrackApi.updateSettings(track.id, settings);
      const updated = { ...track, ...settings };
      setTrack(updated);
      onAudioChange?.(updated);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  };

  const handleDelete = async () => {
    if (!track) return;
    
    try {
      await audioTrackApi.delete(track.id);
      setTrack(null);
      onAudioChange?.(null);
      setExpanded(false);
    } catch (error) {
      console.error('Failed to delete audio:', error);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (playing) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  if (loading) {
    return (
      <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
        <div className="flex items-center gap-2 text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading audio track...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-700/30"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <Music className={`w-5 h-5 ${track ? 'text-green-400' : 'text-slate-500'}`} />
          <div>
            <div className="font-medium text-slate-200">Background Audio</div>
            <div className="text-xs text-slate-500">
              {track ? track.filename : 'No audio track added'}
            </div>
          </div>
        </div>
        
        {!track ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            disabled={uploading}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 text-purple-300 rounded-md text-sm hover:bg-purple-500/30 transition-colors"
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                togglePlay();
              }}
              className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600"
            >
              {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
          </div>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleUpload}
        className="hidden"
        aria-label="Upload audio file"
        title="Upload audio file"
      />

      {/* Hidden audio element */}
      {track?.audio_url && (
        <audio ref={audioRef} src={track.audio_url} onEnded={() => setPlaying(false)} />
      )}

      {/* Expanded Settings */}
      {expanded && track && (
        <div className="p-4 border-t border-slate-700 space-y-4">
          {/* Volume Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Music Volume</label>
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={track.volume * 100}
                  onChange={(e) => handleSettingChange({ volume: parseInt(e.target.value) / 100 })}
                  className="flex-1 accent-purple-500"
                  aria-label="Music volume"
                  title="Music volume"
                />
                <span className="text-xs text-slate-400 w-8">{Math.round(track.volume * 100)}%</span>
              </div>
            </div>
            
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Video Audio</label>
              <div className="flex items-center gap-2">
                {track.mute_video_audio ? (
                  <VolumeX className="w-4 h-4 text-red-400" />
                ) : (
                  <Volume2 className="w-4 h-4 text-slate-500" />
                )}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={track.video_audio_volume * 100}
                  disabled={track.mute_video_audio}
                  onChange={(e) => handleSettingChange({ video_audio_volume: parseInt(e.target.value) / 100 })}
                  className="flex-1 accent-purple-500 disabled:opacity-50"
                  aria-label="Video audio volume"
                  title="Video audio volume"
                />
                <span className="text-xs text-slate-400 w-8">{Math.round(track.video_audio_volume * 100)}%</span>
              </div>
            </div>
          </div>

          {/* Fade Controls */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fade In</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={track.fade_in_sec}
                onChange={(e) => handleSettingChange({ fade_in_sec: parseFloat(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-sm"
                aria-label="Fade in duration in seconds"
                title="Fade in duration"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Fade Out</label>
              <input
                type="number"
                min="0"
                max="10"
                step="0.5"
                value={track.fade_out_sec}
                onChange={(e) => handleSettingChange({ fade_out_sec: parseFloat(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-700 border border-slate-600 rounded-md text-sm"
                aria-label="Fade out duration in seconds"
                title="Fade out duration"
              />
            </div>
          </div>

          {/* Toggles */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={track.mute_video_audio}
                onChange={(e) => handleSettingChange({ mute_video_audio: e.target.checked })}
                className="rounded accent-purple-500"
              />
              <span className="text-sm text-slate-300">Mute video audio</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={track.trim_to_video}
                onChange={(e) => handleSettingChange({ trim_to_video: e.target.checked })}
                className="rounded accent-purple-500"
              />
              <span className="text-sm text-slate-300">Trim to video length</span>
            </label>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={track.loop_if_shorter}
                onChange={(e) => handleSettingChange({ loop_if_shorter: e.target.checked })}
                className="rounded accent-purple-500"
              />
              <span className="text-sm text-slate-300">Loop if shorter</span>
            </label>
          </div>

          {/* Delete Button */}
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-md text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Remove audio track
          </button>
        </div>
      )}
    </div>
  );
};

export default AudioTrackPanel;
