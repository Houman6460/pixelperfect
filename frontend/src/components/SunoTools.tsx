import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Music,
  Mic,
  Play,
  Pause,
  Download,
  Loader2,
  Upload,
  Wand2,
  FileText,
  Video,
  Scissors,
  AudioWaveform,
  RefreshCw,
  User,
  FileAudio,
  Layers,
  Clock,
  Volume2,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  X,
  Trash2,
  Circle,
  Square,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

type SunoTool = 
  | "extend"
  | "upload-cover"
  | "upload-extend"
  | "cover"
  | "separate-vocals"
  | "split-stem"
  | "music-video"
  | "convert-wav"
  | "timestamped-lyrics"
  | "replace-section"
  | "persona";

const SUNO_TOOLS = [
  // CREATE - Extend and create new versions
  { id: "extend", name: "Extend Music", icon: RefreshCw, description: "Continue/extend existing tracks", category: "create" },
  { id: "cover", name: "Music Cover", icon: Wand2, description: "Create cover versions", category: "create" },
  { id: "upload-cover", name: "Upload & Cover", icon: Upload, description: "Cover uploaded audio", category: "create" },
  { id: "upload-extend", name: "Upload & Extend", icon: Upload, description: "Extend uploaded audio", category: "create" },
  { id: "replace-section", name: "Replace Section", icon: Scissors, description: "Replace part of track", category: "create" },
  // PROCESS - Audio processing and conversion
  { id: "separate-vocals", name: "Separate Vocals", icon: Layers, description: "Split vocals & instrumental", category: "process" },
  { id: "split-stem", name: "Split Stems", icon: Scissors, description: "Split into 12 stems", category: "process" },
  { id: "convert-wav", name: "Convert to WAV", icon: FileAudio, description: "High-quality WAV export", category: "process" },
  // EXPORT - Video and metadata
  { id: "music-video", name: "Create Video", icon: Video, description: "Generate music video", category: "export" },
  { id: "timestamped-lyrics", name: "Timed Lyrics", icon: Clock, description: "Get synced lyrics", category: "export" },
  { id: "persona", name: "Generate Persona", icon: User, description: "Create artist persona", category: "export" },
];

const MODELS = [
  { id: "V5", name: "Suno V5 (Latest)", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5PLUS", name: "Suno V4.5+ (8 min)", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5ALL", name: "Suno V4.5 All", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4_5", name: "Suno V4.5", maxLyrics: 5000, maxStyle: 1000 },
  { id: "V4", name: "Suno V4 (Best Quality)", maxLyrics: 3000, maxStyle: 200 },
];

interface Track {
  url: string;
  title?: string;
  id?: string;
  imageUrl?: string;
}

interface SunoToolsProps {
  onAudioGenerated?: (url: string) => void;
  onTracksGenerated?: (tracks: Track[]) => void;
}

export default function SunoTools({ onAudioGenerated, onTracksGenerated }: SunoToolsProps) {
  const [activeTool, setActiveTool] = useState<SunoTool>("extend");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  
  // Form states
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [model, setModel] = useState("V5");
  const [customMode, setCustomMode] = useState(true);
  const [instrumental, setInstrumental] = useState(false);
  const [coverDescription, setCoverDescription] = useState(""); // Album art description
  
  // Upload states
  const [uploadUrl, setUploadUrl] = useState("");
  const [audioId, setAudioId] = useState("");
  const [taskId, setTaskId] = useState("");
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // Voice recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const recordingTimerRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  
  // Extend/Replace states
  const [continueAt, setContinueAt] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(30);
  
  // Advanced states
  const [vocalGender, setVocalGender] = useState<"m" | "f">("f");
  const [styleWeight, setStyleWeight] = useState(0.5);
  const [weirdnessConstraint, setWeirdnessConstraint] = useState(0.5);
  const [audioWeight, setAudioWeight] = useState(0.5);
  const [boostIntensity, setBoostIntensity] = useState(0.5);
  
  // Persona states
  const [personaName, setPersonaName] = useState("");
  const [personaDescription, setPersonaDescription] = useState("");
  
  // Video states
  const [author, setAuthor] = useState("");
  
  // Credits
  const [credits, setCredits] = useState<number | null>(null);
  
  // Saved tracks from gallery with audioIds
  const [savedTracks, setSavedTracks] = useState<Array<{ id: string; title: string; audioId?: string; createdAt: string }>>([]);
  
  // Audio player
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement>(null);
  
  // Expanded sections
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fetchCredits = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/suno/credits`);
      if (response.data.success) {
        setCredits(response.data.credits);
      }
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  // Fetch saved tracks from gallery that have audioIds
  const fetchSavedTracks = async () => {
    try {
      const response = await axios.get(`${API_BASE}/api/music-gallery/tracks`);
      if (response.data.tracks) {
        // Filter only Suno tracks that have audioId in metadata
        const sunoTracks = response.data.tracks
          .filter((t: any) => t.source === "suno" && t.metadata?.audioId)
          .map((t: any) => ({
            id: t.id,
            title: t.title,
            audioId: t.metadata.audioId,
            createdAt: t.createdAt,
          }));
        setSavedTracks(sunoTracks);
      }
    } catch (err) {
      console.error("Failed to fetch saved tracks:", err);
    }
  };

  useEffect(() => {
    fetchCredits();
    fetchSavedTracks();
  }, []);

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", file);
      
      const response = await axios.post(`${API_BASE}/api/suno/upload-audio`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      if (response.data.success) {
        setUploadUrl(response.data.uploadUrl);
        setAudioFile(file);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload audio");
    } finally {
      setIsUploading(false);
    }
  };

  // Voice recording functions
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        setRecordedBlob(blob);
        
        // Upload the recording
        setIsUploading(true);
        try {
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64 = reader.result as string;
            const response = await axios.post(`${API_BASE}/api/suno/upload-recording`, {
              audioData: base64,
              mimeType: "audio/webm",
            });
            
            if (response.data.success) {
              setUploadUrl(response.data.uploadUrl);
            }
          };
          reader.readAsDataURL(blob);
        } catch (err: any) {
          setError(err.response?.data?.error || "Failed to upload recording");
        } finally {
          setIsUploading(false);
        }
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
  };

  const clearRecording = () => {
    setRecordedBlob(null);
    setUploadUrl("");
    setAudioFile(null);
    setRecordingTime(0);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Generate lyrics helper function
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const handleGenerateLyrics = async () => {
    setIsGeneratingLyrics(true);
    setError(null);
    try {
      const response = await axios.post(`${API_BASE}/api/suno/lyrics/generate`, {
        prompt: prompt || style || title || "Write a catchy pop song",
      });
      if (response.data.success && response.data.lyrics) {
        setLyrics(response.data.lyrics);
        if (response.data.title) {
          setTitle(response.data.title);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsGeneratingLyrics(false);
    }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let endpoint = "";
      let payload: any = {};

      switch (activeTool) {
        case "extend":
          endpoint = "/api/suno/extend";
          payload = {
            audioId,
            prompt: lyrics || prompt,
            style,
            title,
            continueAt,
            model,
            defaultParamFlag: !customMode,
          };
          break;

        case "cover":
          endpoint = "/api/suno/cover";
          payload = {
            audioId,
            prompt: lyrics || prompt,
            style,
            title,
            model,
            customMode,
            instrumental,
          };
          break;

        case "upload-cover":
          endpoint = "/api/suno/upload-cover";
          payload = {
            uploadUrl,
            prompt: customMode ? lyrics : prompt,
            style,
            title,
            model,
            customMode,
            instrumental,
          };
          break;

        case "upload-extend":
          endpoint = "/api/suno/upload-extend";
          payload = {
            uploadUrl,
            prompt: lyrics || prompt,
            style,
            title,
            continueAt,
            model,
            customMode,
            instrumental,
          };
          break;

        case "separate-vocals":
          endpoint = "/api/suno/separate-vocals";
          payload = { taskId, audioId };
          break;

        case "split-stem":
          endpoint = "/api/suno/split-stem";
          payload = { taskId, audioId };
          break;

        case "convert-wav":
          endpoint = "/api/suno/convert-wav";
          payload = { taskId, audioId };
          break;

        case "music-video":
          endpoint = "/api/suno/music-video";
          payload = { taskId, audioId, author };
          break;

        case "timestamped-lyrics":
          endpoint = "/api/suno/timestamped-lyrics";
          payload = { taskId, audioId };
          break;

        case "replace-section":
          endpoint = "/api/suno/replace-section";
          payload = {
            audioId,
            prompt: lyrics || prompt,
            style,
            title,
            startTime,
            endTime,
            model,
          };
          break;

        case "persona":
          endpoint = "/api/suno/persona/generate";
          payload = {
            audioId,
            name: personaName,
            description: personaDescription,
          };
          break;
      }

      console.log(`[SUNO] ${activeTool}:`, payload);
      const response = await axios.post(`${API_BASE}${endpoint}`, payload);
      
      setResult(response.data);
      
      // Pass first audio URL to parent
      if (response.data.audioUrl && onAudioGenerated) {
        onAudioGenerated(response.data.audioUrl);
      }
      
      // Pass all tracks to parent (Suno generates 2 songs per call)
      if (response.data.tracks && Array.isArray(response.data.tracks) && onTracksGenerated) {
        const tracks = response.data.tracks.map((track: any) => ({
          url: track.audio_url || track.audioUrl || track.url,
          title: track.title || track.name,
          id: track.id || track.audio_id,
          imageUrl: track.image_url || track.imageUrl || track.cover_url,
        })).filter((t: any) => t.url);
        onTracksGenerated(tracks);
      }
      
      // Store taskId and audioId for follow-up operations
      if (response.data.taskId) setTaskId(response.data.taskId);
      if (response.data.tracks?.[0]?.id) setAudioId(response.data.tracks[0].id);
      
      fetchCredits();
    } catch (err: any) {
      console.error("[SUNO] Error:", err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const selectedModel = MODELS.find(m => m.id === model) || MODELS[0];

  const renderToolForm = () => {
    switch (activeTool) {
      case "extend":
      case "cover":
        return (
          <div className="space-y-4">
            {/* Tool Description */}
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <p className="text-xs text-slate-400">
                {activeTool === "cover" ? (
                  <>
                    <strong className="text-orange-400">Music Cover:</strong> Create a new version of an existing Suno track with a different style. 
                    The melody and structure stay the same, but you can change the genre, mood, and instrumentation. 
                    Optionally provide new lyrics for the cover.
                  </>
                ) : (
                  <>
                    <strong className="text-orange-400">Extend Music:</strong> Continue an existing Suno track from a specific point. 
                    The AI will generate more music that seamlessly continues from where you specify.
                  </>
                )}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audio ID *</label>
              {savedTracks.length > 0 && (
                <select
                  value={audioId}
                  onChange={(e) => setAudioId(e.target.value)}
                  title="Select from previous generations"
                  aria-label="Select saved track"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white mb-2"
                >
                  <option value="">Select from saved tracks...</option>
                  {savedTracks.map((track) => (
                    <option key={track.id} value={track.audioId}>
                      {track.title} ({track.audioId?.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={audioId}
                onChange={(e) => setAudioId(e.target.value)}
                placeholder="Or enter audio ID manually"
                title="Audio ID from previous generation"
                aria-label="Audio ID"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                {savedTracks.length > 0 
                  ? `Select from ${savedTracks.length} saved track${savedTracks.length > 1 ? 's' : ''} or enter manually`
                  : "Generate a track first to get an Audio ID"}
              </p>
            </div>

            {activeTool === "extend" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Continue At (seconds)</label>
                <input
                  type="number"
                  value={continueAt}
                  onChange={(e) => setContinueAt(Number(e.target.value))}
                  min={0}
                  title="Continue at seconds"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Style</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="New style to apply..."
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            {(activeTool === "extend" || activeTool === "cover") && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">New Lyrics (optional)</label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Leave empty to keep original..."
                  rows={4}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
                />
              </div>
            )}
          </div>
        );

      case "upload-cover":
      case "upload-extend":
        return (
          <div className="space-y-4">
            {/* Tool Description */}
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <p className="text-xs text-slate-400">
                {activeTool === "upload-cover" ? (
                  <>
                    <strong className="text-orange-400">Upload & Cover:</strong> Upload your own audio file (song, melody, or recording) and Suno will create a new AI-generated cover version in any style you specify. Great for reimagining existing songs.
                  </>
                ) : (
                  <>
                    <strong className="text-orange-400">Upload & Extend:</strong> Upload your own audio and Suno will continue it, generating new music that seamlessly extends your track. Perfect for adding more sections to your compositions.
                  </>
                )}
              </p>
            </div>
            
            {/* Audio Input Section */}
            <div className="p-4 rounded-lg bg-slate-700/50 border border-slate-600">
              <label className="block text-sm font-medium text-slate-300 mb-3">
                <Upload className="w-4 h-4 inline mr-2" />
                Audio Input *
              </label>
              
              {/* Upload File */}
              <div className="flex gap-2 mb-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  className="hidden"
                  title="Upload audio file"
                  aria-label="Upload audio file"
                  id="audio-file-upload"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isRecording}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white transition disabled:opacity-50"
                  title="Upload audio file"
                >
                  {isUploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {isUploading ? "Uploading..." : "Upload File"}
                </button>
                
                {/* Record Voice */}
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={isUploading}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition ${
                    isRecording 
                      ? "bg-red-600 hover:bg-red-700 animate-pulse" 
                      : "bg-orange-600 hover:bg-orange-700"
                  } text-white disabled:opacity-50`}
                  title={isRecording ? "Stop recording" : "Start voice recording"}
                >
                  <Mic className="w-4 h-4" />
                  {isRecording ? `Stop (${formatTime(recordingTime)})` : "Record Voice"}
                </button>
              </div>
              
              {/* Status/Preview */}
              {(uploadUrl || audioFile || recordedBlob) && (
                <div className="flex items-center gap-2 p-2 rounded bg-slate-600/50">
                  <FileAudio className="w-4 h-4 text-green-400" />
                  <span className="text-sm text-slate-300 flex-1 truncate">
                    {audioFile?.name || (recordedBlob ? `Recording (${formatTime(recordingTime)})` : "Audio ready")}
                  </span>
                  <button
                    type="button"
                    onClick={clearRecording}
                    className="text-red-400 hover:text-red-300"
                    title="Clear audio"
                  >
                    <Scissors className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Manual URL input */}
              <div className="mt-3">
                <label className="block text-xs text-slate-400 mb-1">Or enter URL directly:</label>
                <input
                  type="text"
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  placeholder="https://example.com/audio.mp3"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500 text-sm"
                  title="Audio URL"
                />
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                <i className="fa-solid fa-triangle-exclamation text-amber-400" /> For Suno API, the URL must be publicly accessible. Max 8 min (1 min for V4.5-All).
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Song title"
                title="Song title"
                aria-label="Song title"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Style</label>
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="pop, jazz, rock..."
                title="Music style"
                aria-label="Music style"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>

            {(activeTool === "upload-cover" || activeTool === "upload-extend") && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Lyrics / Prompt</label>
                <textarea
                  value={lyrics}
                  onChange={(e) => setLyrics(e.target.value)}
                  placeholder="Lyrics for vocals..."
                  rows={4}
                  title="Lyrics or vocal prompt"
                  aria-label="Lyrics"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
                />
              </div>
            )}

            {activeTool === "upload-extend" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Continue At (seconds)</label>
                <input
                  type="number"
                  value={continueAt}
                  onChange={(e) => setContinueAt(Number(e.target.value))}
                  min={0}
                  title="Continue at seconds"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
            )}
          </div>
        );

      case "separate-vocals":
      case "split-stem":
      case "convert-wav":
      case "timestamped-lyrics":
      case "music-video":
        return (
          <div className="space-y-4">
            {/* Tool Description */}
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <p className="text-xs text-slate-400">
                {activeTool === "separate-vocals" && (
                  <>
                    <strong className="text-cyan-400">Separate Vocals:</strong> Extract vocals and instrumental as separate tracks. Perfect for creating karaoke versions, remixes, or isolating vocals for other projects.
                  </>
                )}
                {activeTool === "split-stem" && (
                  <>
                    <strong className="text-cyan-400">Split Stems:</strong> Split your track into 12 individual stems (drums, bass, vocals, guitar, piano, etc.). Ideal for professional mixing, remixing, or sampling.
                  </>
                )}
                {activeTool === "convert-wav" && (
                  <>
                    <strong className="text-cyan-400">Convert to WAV:</strong> Export your track as a high-quality uncompressed WAV file. Best for professional production, mastering, or archival purposes.
                  </>
                )}
                {activeTool === "timestamped-lyrics" && (
                  <>
                    <strong className="text-purple-400">Timed Lyrics:</strong> Get synchronized lyrics with timestamps for each line. Perfect for creating subtitles, karaoke displays, or lyric videos.
                  </>
                )}
                {activeTool === "music-video" && (
                  <>
                    <strong className="text-purple-400">Create Video:</strong> Generate a music video with visualizations for your track. Add author branding and create shareable video content.
                  </>
                )}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Select from Gallery</label>
              {savedTracks.length > 0 ? (
                <select
                  value={audioId}
                  onChange={(e) => {
                    const track = savedTracks.find(t => t.audioId === e.target.value);
                    if (track) {
                      setAudioId(track.audioId || "");
                    }
                  }}
                  title="Select from previous generations"
                  aria-label="Select saved track"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                >
                  <option value="">Select a track...</option>
                  {savedTracks.map((track) => (
                    <option key={track.id} value={track.audioId}>
                      {track.title} ({track.audioId?.substring(0, 8)}...)
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-slate-500">No saved tracks with Audio IDs. Generate a track first.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Task ID</label>
              <input
                type="text"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                placeholder="Task ID (optional)"
                title="Task ID from generation"
                aria-label="Task ID"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audio ID *</label>
              <input
                type="text"
                value={audioId}
                onChange={(e) => setAudioId(e.target.value)}
                placeholder="Or enter Audio ID manually"
                title="Audio ID from generation"
                aria-label="Audio ID"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
            {activeTool === "music-video" && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Author Name (optional)</label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder="Artist name for branding"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
                />
              </div>
            )}
            <p className="text-xs text-slate-500">
              {activeTool === "separate-vocals" && "Splits into vocals + instrumental (2 stems)"}
              {activeTool === "split-stem" && "Splits into up to 12 individual stems"}
              {activeTool === "convert-wav" && "Export high-quality WAV format"}
              {activeTool === "timestamped-lyrics" && "Get lyrics with timing data"}
              {activeTool === "music-video" && "Generate MP4 video with visualizations"}
            </p>
          </div>
        );

      case "replace-section":
        return (
          <div className="space-y-4">
            {/* Tool Description */}
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <p className="text-xs text-slate-400">
                <strong className="text-orange-400">Replace Section:</strong> Replace a specific part of your track (e.g., a verse or chorus) with newly generated content. Specify the start and end times, then provide new lyrics or style for that section.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audio ID *</label>
              <input
                type="text"
                value={audioId}
                onChange={(e) => setAudioId(e.target.value)}
                placeholder="Audio ID to edit"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Start Time (sec)</label>
                <input
                  type="number"
                  value={startTime}
                  onChange={(e) => setStartTime(Number(e.target.value))}
                  min={0}
                  title="Start time in seconds"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">End Time (sec)</label>
                <input
                  type="number"
                  value={endTime}
                  onChange={(e) => setEndTime(Number(e.target.value))}
                  min={0}
                  title="End time in seconds"
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">New Content</label>
              <textarea
                value={lyrics}
                onChange={(e) => setLyrics(e.target.value)}
                placeholder="New lyrics/content for this section..."
                rows={4}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
          </div>
        );

      case "persona":
        return (
          <div className="space-y-4">
            {/* Tool Description */}
            <div className="p-3 rounded-lg bg-slate-700/50 border border-slate-600">
              <p className="text-xs text-slate-400">
                <strong className="text-purple-400">Generate Persona:</strong> Create an AI artist persona based on a reference track. This generates a unique artist identity with name and style that can be used for consistent branding across your music.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Audio ID *</label>
              <input
                type="text"
                value={audioId}
                onChange={(e) => setAudioId(e.target.value)}
                placeholder="Reference audio ID"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Persona Name</label>
              <input
                type="text"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="Artist name"
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
              <textarea
                value={personaDescription}
                onChange={(e) => setPersonaDescription(e.target.value)}
                placeholder="Describe the persona style..."
                rows={3}
                className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-500"
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-orange-500/50 transition"
      >
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Wand2 className="w-5 h-5 text-orange-500" />
          Post-Production Tools
        </h2>
        <div className="flex items-center gap-2 text-slate-400">
          <span className="text-xs">{isExpanded ? "Collapse" : "Expand"}</span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <>
          {/* Tool Categories */}
          <div className="space-y-3">
        {["create", "process", "export"].map(category => {
          const categoryTools = SUNO_TOOLS.filter(t => t.category === category);
          if (categoryTools.length === 0) return null;
          
          return (
            <div key={category}>
              <h3 className="text-xs font-medium text-slate-500 uppercase mb-2 flex items-center gap-1">
                {category === "create" ? <><i className="fa-solid fa-music" /> Create & Edit</> : 
                 category === "process" ? <><i className="fa-solid fa-gears" /> Process</> :
                 <><i className="fa-solid fa-film" /> Export</>}
              </h3>
              <div className="flex flex-wrap gap-2">
                {categoryTools.map(tool => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => setActiveTool(tool.id as SunoTool)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                        activeTool === tool.id
                          ? "bg-orange-500 text-white"
                          : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                      }`}
                      title={tool.description}
                    >
                      <Icon className="w-4 h-4" />
                      {tool.name}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool Form */}
      <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700">
        <h3 className="text-lg font-medium text-white mb-4 flex items-center gap-2">
          {SUNO_TOOLS.find(t => t.id === activeTool)?.icon && 
            React.createElement(SUNO_TOOLS.find(t => t.id === activeTool)!.icon, { className: "w-5 h-5 text-orange-400" })}
          {SUNO_TOOLS.find(t => t.id === activeTool)?.name}
        </h3>
        
        {renderToolForm()}
        
        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full mt-4 py-3 px-4 rounded-lg bg-gradient-to-r from-orange-500 to-pink-500 text-white font-medium hover:from-orange-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Wand2 className="w-5 h-5" />
              {activeTool === "extend" ? "Extend Track" :
               activeTool === "cover" ? "Create Cover" :
               "Process"}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-4">
          <div className="flex items-center gap-2 text-green-400">
            <Check className="w-5 h-5" />
            <span className="font-medium">Success!</span>
          </div>

          {/* Audio Player */}
          {result.audioUrl && (
            <div className="flex items-center gap-4 p-3 bg-slate-800 rounded-lg">
              <button
                onClick={togglePlay}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-orange-500 text-white hover:bg-orange-600"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <audio
                ref={audioRef}
                src={result.audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />
              <div className="flex-1">
                <p className="text-sm text-white truncate">{title || "Generated Audio"}</p>
                <p className="text-xs text-slate-400">Click to play</p>
              </div>
              <a
                href={result.audioUrl}
                download
                className="p-2 text-slate-400 hover:text-white"
                title="Download audio"
              >
                <Download className="w-5 h-5" />
              </a>
            </div>
          )}

          {/* Video URL */}
          {result.videoUrl && (
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Video URL:</p>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={result.videoUrl}
                  readOnly
                  aria-label="Video URL"
                  className="flex-1 px-3 py-2 bg-slate-700 rounded text-sm text-white"
                />
                <button onClick={() => copyToClipboard(result.videoUrl)} className="p-2 text-slate-400 hover:text-white" title="Copy video URL">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Lyrics Result */}
          {result.lyrics && (
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Generated Lyrics:</p>
              <pre className="text-sm text-white whitespace-pre-wrap font-mono">{result.lyrics}</pre>
            </div>
          )}

          {/* Stems Result */}
          {result.stems && (
            <div className="p-3 bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-400 mb-2">Separated Stems:</p>
              <div className="space-y-2">
                {Object.entries(result.stems).map(([name, url]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-white capitalize">{name}</span>
                    <a href={url as string} download className="text-orange-400 hover:text-orange-300 text-sm">
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Task/Audio IDs */}
          {(result.taskId || result.tracks?.[0]?.id) && (
            <div className="p-3 bg-slate-800 rounded-lg text-xs space-y-1">
              {result.taskId && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Task ID:</span>
                  <code className="text-slate-300">{result.taskId}</code>
                  <button onClick={() => copyToClipboard(result.taskId)} className="text-slate-400 hover:text-white" title="Copy Task ID">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
              {result.tracks?.[0]?.id && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Audio ID:</span>
                  <code className="text-slate-300">{result.tracks[0].id}</code>
                  <button onClick={() => copyToClipboard(result.tracks[0].id)} className="text-slate-400 hover:text-white" title="Copy Audio ID">
                    <Copy className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
        </>
      )}
    </div>
  );
}
