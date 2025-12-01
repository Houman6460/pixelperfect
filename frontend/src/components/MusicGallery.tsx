import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Music,
  Play,
  Pause,
  Download,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  Loader2,
  Clock,
  Calendar,
  HardDrive,
  RefreshCw,
  X,
  MoreVertical,
  Edit3,
  Check,
  Copy,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

interface MusicTrack {
  id: string;
  title: string;
  workflowId: string | null;
  workflowName: string | null;
  duration: number;
  size: number;
  createdAt: string;
  source: string;
  url: string;
  coverUrl?: string;
  metadata?: {
    prompt?: string;
    lyrics?: string;
    style?: string;
    model?: string;
    audioId?: string;
  };
}

interface MusicFolder {
  id: string;
  name: string;
  workflowId: string | null;
  trackCount: number;
  createdAt: string;
}

interface MusicGalleryProps {
  onClose: () => void;
  currentWorkflowId?: string | null;
  currentWorkflowName?: string;
}

export default function MusicGallery({ onClose, currentWorkflowId, currentWorkflowName }: MusicGalleryProps) {
  const [folders, setFolders] = useState<MusicFolder[]>([]);
  const [tracks, setTracks] = useState<MusicTrack[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [stats, setStats] = useState<any>(null);
  const [copiedAudioId, setCopiedAudioId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchFolders();
    fetchTracks();
    fetchStats();
  }, []);

  useEffect(() => {
    if (selectedFolder) {
      fetchTracks(selectedFolder);
    } else {
      fetchTracks();
    }
  }, [selectedFolder]);

  const fetchFolders = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/music-gallery/folders`);
      if (response.data.success) {
        setFolders(response.data.folders);
      }
    } catch (error) {
      console.error("Failed to fetch folders:", error);
    }
  };

  const fetchTracks = async (folderId?: string) => {
    setIsLoading(true);
    try {
      let url = `${API_BASE}/api/music-gallery/tracks`;
      if (folderId) {
        url += `?folderId=${folderId}`;
      }
      const response = await axios.get(url);
      if (response.data.success) {
        setTracks(response.data.tracks);
      }
    } catch (error) {
      console.error("Failed to fetch tracks:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/music-gallery/stats`);
      if (response.data.success) {
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    }
  };

  const handlePlayTrack = (track: MusicTrack) => {
    if (playingTrackId === track.id && isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
    } else {
      setPlayingTrackId(track.id);
      if (audioRef.current) {
        audioRef.current.src = `${API_BASE}${track.url}`;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm("Are you sure you want to delete this track?")) return;
    
    try {
      await axios.delete(`${API_BASE}/api/music-gallery/tracks/${trackId}`);
      setTracks(tracks.filter(t => t.id !== trackId));
      if (playingTrackId === trackId) {
        audioRef.current?.pause();
        setPlayingTrackId(null);
        setIsPlaying(false);
      }
    } catch (error) {
      console.error("Failed to delete track:", error);
    }
  };

  const handleRenameTrack = async (trackId: string) => {
    if (!editTitle.trim()) return;
    
    try {
      const response = await axios.patch(`${API_BASE}/api/music-gallery/tracks/${trackId}`, {
        title: editTitle,
      });
      if (response.data.success) {
        setTracks(tracks.map(t => t.id === trackId ? { ...t, title: editTitle } : t));
        setEditingTrackId(null);
        setEditTitle("");
      }
    } catch (error) {
      console.error("Failed to rename track:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Group tracks by workflow
  const tracksByWorkflow = tracks.reduce((acc, track) => {
    const key = track.workflowId || "uncategorized";
    if (!acc[key]) {
      acc[key] = {
        name: track.workflowName || "Uncategorized",
        tracks: [],
      };
    }
    acc[key].tracks.push(track);
    return acc;
  }, {} as Record<string, { name: string; tracks: MusicTrack[] }>);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
              <Music className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Music Gallery</h2>
              <p className="text-sm text-slate-400">
                {stats?.totalTracks || 0} tracks • {formatSize(stats?.totalSize || 0)}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => { fetchFolders(); fetchTracks(selectedFolder || undefined); fetchStats(); }}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Folders */}
          <div className="w-64 border-r border-slate-700 p-4 overflow-y-auto">
            <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3">Workflows</h3>
            
            <button
              onClick={() => setSelectedFolder(null)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition mb-1 ${
                selectedFolder === null
                  ? "bg-purple-500/20 text-purple-300"
                  : "hover:bg-slate-700 text-slate-300"
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="flex-1 truncate">All Tracks</span>
              <span className="text-xs text-slate-500">{stats?.totalTracks || 0}</span>
            </button>
            
            {folders.map(folder => (
              <button
                key={folder.id}
                onClick={() => setSelectedFolder(folder.id)}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition mb-1 ${
                  selectedFolder === folder.id
                    ? "bg-purple-500/20 text-purple-300"
                    : "hover:bg-slate-700 text-slate-300"
                }`}
              >
                {selectedFolder === folder.id ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
                <span className="flex-1 truncate">{folder.name}</span>
                <span className="text-xs text-slate-500">{folder.trackCount}</span>
              </button>
            ))}
            
            {folders.length === 0 && (
              <p className="text-sm text-slate-500 italic px-3">No workflows yet</p>
            )}
          </div>
          
          {/* Main Content - Tracks */}
          <div className="flex-1 p-4 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              </div>
            ) : tracks.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                <Music className="w-16 h-16 mb-4 opacity-30" />
                <p className="text-lg font-medium">No tracks yet</p>
                <p className="text-sm">Generated tracks will appear here</p>
              </div>
            ) : selectedFolder === null ? (
              // Show grouped by workflow when viewing all
              <div className="space-y-6">
                {Object.entries(tracksByWorkflow).map(([workflowId, { name, tracks: workflowTracks }]) => (
                  <div key={workflowId}>
                    <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Folder className="w-4 h-4" />
                      {name}
                      <span className="text-xs text-slate-500">({workflowTracks.length})</span>
                    </h3>
                    <div className="grid gap-3">
                      {workflowTracks.map(track => (
                        <TrackCard
                          key={track.id}
                          track={track}
                          isPlaying={playingTrackId === track.id && isPlaying}
                          isEditing={editingTrackId === track.id}
                          editTitle={editTitle}
                          onPlay={() => handlePlayTrack(track)}
                          onDelete={() => handleDeleteTrack(track.id)}
                          onStartEdit={() => { setEditingTrackId(track.id); setEditTitle(track.title); }}
                          onCancelEdit={() => { setEditingTrackId(null); setEditTitle(""); }}
                          onSaveEdit={() => handleRenameTrack(track.id)}
                          onEditTitleChange={setEditTitle}
                          formatDate={formatDate}
                          formatSize={formatSize}
                          apiBase={API_BASE}
                          copiedAudioId={copiedAudioId}
                          onCopyAudioId={(trackId, audioId) => {
                            navigator.clipboard.writeText(audioId);
                            setCopiedAudioId(trackId);
                            setTimeout(() => setCopiedAudioId(null), 2000);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              // Show flat list when viewing specific folder
              <div className="grid gap-3">
                {tracks.map(track => (
                  <TrackCard
                    key={track.id}
                    track={track}
                    isPlaying={playingTrackId === track.id && isPlaying}
                    isEditing={editingTrackId === track.id}
                    editTitle={editTitle}
                    onPlay={() => handlePlayTrack(track)}
                    onDelete={() => handleDeleteTrack(track.id)}
                    onStartEdit={() => { setEditingTrackId(track.id); setEditTitle(track.title); }}
                    onCancelEdit={() => { setEditingTrackId(null); setEditTitle(""); }}
                    onSaveEdit={() => handleRenameTrack(track.id)}
                    onEditTitleChange={setEditTitle}
                    formatDate={formatDate}
                    formatSize={formatSize}
                    apiBase={API_BASE}
                    copiedAudioId={copiedAudioId}
                    onCopyAudioId={(trackId, audioId) => {
                      navigator.clipboard.writeText(audioId);
                      setCopiedAudioId(trackId);
                      setTimeout(() => setCopiedAudioId(null), 2000);
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Hidden audio element */}
        <audio
          ref={audioRef}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      </div>
    </div>
  );
}

// Track Card Component
function TrackCard({
  track,
  isPlaying,
  isEditing,
  editTitle,
  onPlay,
  onDelete,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onEditTitleChange,
  formatDate,
  formatSize,
  apiBase,
  copiedAudioId,
  onCopyAudioId,
}: {
  track: MusicTrack;
  isPlaying: boolean;
  isEditing: boolean;
  editTitle: string;
  onPlay: () => void;
  onDelete: () => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onEditTitleChange: (value: string) => void;
  formatDate: (date: string) => string;
  formatSize: (bytes: number) => string;
  apiBase: string;
  copiedAudioId: string | null;
  onCopyAudioId: (trackId: string, audioId: string) => void;
}) {
  return (
    <div
      className={`flex items-center gap-4 p-3 rounded-xl transition ${
        isPlaying
          ? "bg-purple-500/20 border border-purple-500/50"
          : "bg-slate-800 hover:bg-slate-700/70"
      }`}
    >
      {/* Cover Art */}
      {track.coverUrl ? (
        <img
          src={track.coverUrl.startsWith("/") ? `${apiBase}${track.coverUrl}` : track.coverUrl}
          alt={track.title}
          className="w-14 h-14 rounded-lg object-cover"
        />
      ) : (
        <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0">
          <Music className="w-6 h-6 text-white" />
        </div>
      )}
      
      {/* Track Info */}
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={editTitle}
              onChange={(e) => onEditTitleChange(e.target.value)}
              className="flex-1 px-2 py-1 rounded bg-slate-600 border border-slate-500 text-white text-sm"
              autoFocus
              title="Track title"
              placeholder="Enter track title"
              aria-label="Track title"
              onKeyDown={(e) => {
                if (e.key === "Enter") onSaveEdit();
                if (e.key === "Escape") onCancelEdit();
              }}
            />
            <button onClick={onSaveEdit} className="p-1 rounded bg-green-500 text-white" title="Save" aria-label="Save">
              <Check className="w-4 h-4" />
            </button>
            <button onClick={onCancelEdit} className="p-1 rounded bg-slate-600 text-white" title="Cancel" aria-label="Cancel">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <p className="font-medium text-white truncate">{track.title}</p>
        )}
        
        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(track.createdAt)}
          </span>
          <span className="flex items-center gap-1">
            <HardDrive className="w-3 h-3" />
            {formatSize(track.size)}
          </span>
          {track.source && (
            <span className="px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">
              {track.source}
            </span>
          )}
        </div>
        
        {track.metadata?.style && (
          <p className="text-xs text-slate-500 mt-1 truncate">
            Style: {track.metadata.style}
          </p>
        )}
      </div>
      
      {/* Actions */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPlay}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
            isPlaying
              ? "bg-purple-600 text-white"
              : "bg-slate-600 hover:bg-slate-500 text-white"
          }`}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
        
        <a
          href={`${apiBase}${track.url}`}
          download={`${track.title}.mp3`}
          className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition"
          title="Download"
        >
          <Download className="w-4 h-4" />
        </a>
        
        <button
          onClick={onStartEdit}
          className="p-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition"
          title="Rename"
        >
          <Edit3 className="w-4 h-4" />
        </button>
        
        <button
          onClick={onDelete}
          className="p-2 rounded-lg bg-slate-600 hover:bg-red-500 text-white transition"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
        
        {/* Copy Audio ID button - only for Suno tracks with audioId */}
        {track.source === "suno" && track.metadata?.audioId && (
          <button
            onClick={() => onCopyAudioId(track.id, track.metadata!.audioId!)}
            className={`p-2 rounded-lg transition ${
              copiedAudioId === track.id 
                ? "bg-green-600 text-white" 
                : "bg-orange-600 hover:bg-orange-500 text-white"
            }`}
            title={copiedAudioId === track.id ? "Copied!" : `Copy Audio ID: ${track.metadata.audioId}`}
          >
            {copiedAudioId === track.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
