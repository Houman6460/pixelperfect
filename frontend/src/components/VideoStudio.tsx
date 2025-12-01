import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import {
  Video,
  Image as ImageIcon,
  Type,
  Wand2,
  Upload,
  Play,
  Pause,
  Download,
  Loader2,
  Sparkles,
  Clock,
  Zap,
  Film,
  Camera,
  Clapperboard,
  Settings,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Maximize2,
  RotateCcw,
  Scissors,
  Layers,
  Palette,
  SlidersHorizontal,
  AlertCircle,
  Check,
  Copy,
  ExternalLink,
  Filter,
  Grid,
  List,
  Star,
  Gauge,
  DollarSign,
  X,
} from "lucide-react";

const API_BASE = "http://localhost:4000";

// ===================== MODEL DEFINITIONS =====================

interface VideoModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  type: "text-to-video" | "image-to-video" | "video-to-video" | "video-enhancement";
  hasAudio: boolean;
  maxDuration: number;
  maxResolution: string;
  speed: "fast" | "standard" | "slow";
  quality: "standard" | "high" | "premium";
  cost: "low" | "medium" | "high" | "premium";
  features: string[];
  controls: string[];
  replicateId: string;
  isNew?: boolean;
  isFeatured?: boolean;
}

// Text-to-Video Models
const TEXT_TO_VIDEO_MODELS: VideoModel[] = [
  {
    id: "veo-3.1-fast",
    name: "Google Veo 3.1 Fast",
    provider: "Google",
    description: "New and improved Veo 3 Fast with higher-fidelity video and context-aware audio",
    type: "text-to-video",
    hasAudio: true,
    maxDuration: 8,
    maxResolution: "1080p",
    speed: "fast",
    quality: "premium",
    cost: "high",
    features: ["Context-aware audio", "Last frame support", "High fidelity"],
    controls: ["prompt", "duration", "aspect_ratio", "negative_prompt"],
    replicateId: "google/veo-3.1-fast",
    isNew: true,
    isFeatured: true,
  },
  {
    id: "veo-3.1",
    name: "Google Veo 3.1",
    provider: "Google",
    description: "Premium Veo 3 with reference image and last frame support",
    type: "text-to-video",
    hasAudio: true,
    maxDuration: 8,
    maxResolution: "1080p",
    speed: "standard",
    quality: "premium",
    cost: "premium",
    features: ["Reference image", "Context-aware audio", "Last frame support"],
    controls: ["prompt", "duration", "aspect_ratio", "reference_image", "negative_prompt"],
    replicateId: "google/veo-3.1",
    isNew: true,
  },
  {
    id: "sora-2",
    name: "OpenAI Sora 2",
    provider: "OpenAI",
    description: "OpenAI's flagship video generation with synced audio",
    type: "text-to-video",
    hasAudio: true,
    maxDuration: 20,
    maxResolution: "1080p",
    speed: "slow",
    quality: "premium",
    cost: "premium",
    features: ["Synced audio", "Long duration", "Cinematic quality"],
    controls: ["prompt", "duration", "aspect_ratio", "style"],
    replicateId: "openai/sora-2",
    isFeatured: true,
  },
  {
    id: "kling-2.5-turbo-pro",
    name: "Kling 2.5 Turbo Pro",
    provider: "Kuaishou",
    description: "Pro-level video creation with smooth motion and cinematic depth",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 10,
    maxResolution: "1080p",
    speed: "fast",
    quality: "high",
    cost: "medium",
    features: ["Smooth motion", "Cinematic depth", "Prompt adherence"],
    controls: ["prompt", "duration", "aspect_ratio", "negative_prompt", "cfg_scale"],
    replicateId: "kwaivgi/kling-v2.5-turbo-pro",
    isFeatured: true,
  },
  {
    id: "pixverse-v5",
    name: "PixVerse V5",
    provider: "PixVerse",
    description: "Enhanced character movement and visual effects, optimized for anime",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 8,
    maxResolution: "1080p",
    speed: "fast",
    quality: "high",
    cost: "medium",
    features: ["Anime optimized", "Character movement", "Visual effects"],
    controls: ["prompt", "duration", "aspect_ratio", "style", "negative_prompt"],
    replicateId: "pixverse/pixverse-v5",
    isNew: true,
  },
  {
    id: "wan-2.5-t2v",
    name: "Wan 2.5 T2V",
    provider: "Alibaba",
    description: "Alibaba's open-source text-to-video model, competitive with proprietary options",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 5,
    maxResolution: "720p",
    speed: "standard",
    quality: "high",
    cost: "low",
    features: ["Open source", "Good quality", "Affordable"],
    controls: ["prompt", "duration", "num_frames", "steps", "cfg_scale"],
    replicateId: "wan-video/wan-2.5-t2v",
  },
  {
    id: "wan-2.5-t2v-fast",
    name: "Wan 2.5 T2V Fast",
    provider: "Alibaba",
    description: "Speed-optimized version of Wan 2.5 text-to-video",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 5,
    maxResolution: "720p",
    speed: "fast",
    quality: "standard",
    cost: "low",
    features: ["Fast generation", "Open source", "Budget friendly"],
    controls: ["prompt", "duration", "num_frames", "steps"],
    replicateId: "wan-video/wan-2.5-t2v-fast",
  },
  {
    id: "seedance-1-pro-fast",
    name: "Seedance 1 Pro Fast",
    provider: "ByteDance",
    description: "Faster and cheaper version of Seedance 1 Pro from ByteDance",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 5,
    maxResolution: "720p",
    speed: "fast",
    quality: "high",
    cost: "medium",
    features: ["Fast generation", "Good motion", "TikTok style"],
    controls: ["prompt", "duration", "aspect_ratio", "negative_prompt"],
    replicateId: "bytedance/seedance-1-pro-fast",
  },
  {
    id: "hailuo-2.3",
    name: "MiniMax Hailuo 2.3",
    provider: "MiniMax",
    description: "High-fidelity video with realistic human motion and cinematic VFX",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 6,
    maxResolution: "1080p",
    speed: "standard",
    quality: "premium",
    cost: "high",
    features: ["Realistic motion", "Cinematic VFX", "Expressive characters"],
    controls: ["prompt", "duration", "aspect_ratio", "negative_prompt"],
    replicateId: "minimax/hailuo-2.3",
  },
  {
    id: "hailuo-2.3-fast",
    name: "MiniMax Hailuo 2.3 Fast",
    provider: "MiniMax",
    description: "Lower-latency version preserving motion quality and visual consistency",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 6,
    maxResolution: "1080p",
    speed: "fast",
    quality: "high",
    cost: "medium",
    features: ["Fast iteration", "Good motion", "Consistent style"],
    controls: ["prompt", "duration", "aspect_ratio"],
    replicateId: "minimax/hailuo-2.3-fast",
  },
  {
    id: "luma-ray-2",
    name: "Luma Ray 2",
    provider: "Luma AI",
    description: "Luma's flagship video generation with exceptional quality",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 5,
    maxResolution: "1080p",
    speed: "standard",
    quality: "premium",
    cost: "high",
    features: ["Exceptional quality", "Natural motion", "Cinematic look"],
    controls: ["prompt", "duration", "aspect_ratio", "loop"],
    replicateId: "luma/ray-2",
    isFeatured: true,
  },
  {
    id: "cogvideox-5b",
    name: "CogVideoX-5B",
    provider: "Tsinghua",
    description: "Open-source video generation model with good quality",
    type: "text-to-video",
    hasAudio: false,
    maxDuration: 6,
    maxResolution: "720p",
    speed: "slow",
    quality: "high",
    cost: "low",
    features: ["Open source", "Research quality", "Free to run"],
    controls: ["prompt", "num_frames", "fps", "guidance_scale"],
    replicateId: "fofr/cogvideox-5b",
  },
];

// Image-to-Video Models
const IMAGE_TO_VIDEO_MODELS: VideoModel[] = [
  {
    id: "wan-2.5-i2v",
    name: "Wan 2.5 I2V",
    provider: "Alibaba",
    description: "Image to video generation with background audio support",
    type: "image-to-video",
    hasAudio: true,
    maxDuration: 5,
    maxResolution: "720p",
    speed: "standard",
    quality: "high",
    cost: "low",
    features: ["Background audio", "Open source", "Good motion"],
    controls: ["image", "prompt", "duration", "steps", "cfg_scale"],
    replicateId: "wan-video/wan-2.5-i2v",
    isFeatured: true,
  },
  {
    id: "wan-2.5-i2v-fast",
    name: "Wan 2.5 I2V Fast",
    provider: "Alibaba",
    description: "Speed-optimized image-to-video generation",
    type: "image-to-video",
    hasAudio: false,
    maxDuration: 5,
    maxResolution: "720p",
    speed: "fast",
    quality: "standard",
    cost: "low",
    features: ["Fast generation", "Open source", "Budget friendly"],
    controls: ["image", "prompt", "duration", "steps"],
    replicateId: "wan-video/wan-2.5-i2v-fast",
  },
  {
    id: "kling-2.5-i2v",
    name: "Kling 2.5 I2V Pro",
    provider: "Kuaishou",
    description: "Image-to-video with smooth motion and cinematic depth",
    type: "image-to-video",
    hasAudio: false,
    maxDuration: 10,
    maxResolution: "1080p",
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["Smooth motion", "Cinematic", "High resolution"],
    controls: ["image", "prompt", "duration", "aspect_ratio", "negative_prompt"],
    replicateId: "kwaivgi/kling-v2.5-turbo-pro",
  },
  {
    id: "stable-video-diffusion",
    name: "Stable Video Diffusion",
    provider: "Stability AI",
    description: "Generate short video clips from a single image",
    type: "image-to-video",
    hasAudio: false,
    maxDuration: 4,
    maxResolution: "1024x576",
    speed: "standard",
    quality: "high",
    cost: "low",
    features: ["Open source", "Consistent style", "Good for loops"],
    controls: ["image", "motion_bucket_id", "fps", "num_frames"],
    replicateId: "stability-ai/stable-video-diffusion",
  },
  {
    id: "animatediff-lightning",
    name: "AnimateDiff Lightning",
    provider: "ByteDance",
    description: "Fast animation from images using AnimateDiff with distillation",
    type: "image-to-video",
    hasAudio: false,
    maxDuration: 2,
    maxResolution: "512x512",
    speed: "fast",
    quality: "standard",
    cost: "low",
    features: ["Very fast", "Animation style", "LoRA support"],
    controls: ["image", "prompt", "motion_module", "steps"],
    replicateId: "bytedance/animatediff-lightning",
  },
  {
    id: "i2vgen-xl",
    name: "I2VGen-XL",
    provider: "Alibaba",
    description: "High-quality image-to-video generation with semantic consistency",
    type: "image-to-video",
    hasAudio: false,
    maxDuration: 4,
    maxResolution: "1280x720",
    speed: "slow",
    quality: "high",
    cost: "low",
    features: ["Semantic consistency", "High quality", "Open source"],
    controls: ["image", "prompt", "num_frames", "guidance_scale"],
    replicateId: "ali-vilab/i2vgen-xl",
  },
];

// Video-to-Video Models
const VIDEO_TO_VIDEO_MODELS: VideoModel[] = [
  {
    id: "video-to-video",
    name: "Video Style Transfer",
    provider: "Replicate",
    description: "Transform video style while preserving motion and structure",
    type: "video-to-video",
    hasAudio: false,
    maxDuration: 10,
    maxResolution: "1080p",
    speed: "slow",
    quality: "high",
    cost: "medium",
    features: ["Style transfer", "Motion preservation", "Multiple styles"],
    controls: ["video", "prompt", "strength", "style"],
    replicateId: "chenxwh/video-to-video",
  },
  {
    id: "deforum",
    name: "Deforum",
    provider: "Community",
    description: "Create animated videos with camera movements and transitions",
    type: "video-to-video",
    hasAudio: false,
    maxDuration: 30,
    maxResolution: "1024x1024",
    speed: "slow",
    quality: "high",
    cost: "medium",
    features: ["Camera movements", "Zoom effects", "Artistic styles"],
    controls: ["prompt", "animation_mode", "max_frames", "zoom", "rotation"],
    replicateId: "deforum/deforum_stable_diffusion",
  },
];

// Video Enhancement Models
const VIDEO_ENHANCEMENT_MODELS: VideoModel[] = [
  {
    id: "video-upscaler",
    name: "Video Upscaler",
    provider: "Replicate",
    description: "Upscale video resolution using AI super-resolution",
    type: "video-enhancement",
    hasAudio: true,
    maxDuration: 60,
    maxResolution: "4K",
    speed: "slow",
    quality: "premium",
    cost: "high",
    features: ["4K upscaling", "Detail enhancement", "Preserves audio"],
    controls: ["video", "scale_factor"],
    replicateId: "nightmareai/real-esrgan-video",
  },
  {
    id: "frame-interpolation",
    name: "Frame Interpolation",
    provider: "Google",
    description: "Increase video frame rate with AI interpolation",
    type: "video-enhancement",
    hasAudio: true,
    maxDuration: 30,
    maxResolution: "1080p",
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["Smooth motion", "FPS boost", "Film to 60fps"],
    controls: ["video", "target_fps", "mode"],
    replicateId: "google-research/frame-interpolation",
  },
  {
    id: "video-remove-bg",
    name: "Video Background Removal",
    provider: "Replicate",
    description: "Remove background from video, frame by frame",
    type: "video-enhancement",
    hasAudio: true,
    maxDuration: 30,
    maxResolution: "1080p",
    speed: "slow",
    quality: "high",
    cost: "medium",
    features: ["Background removal", "Green screen", "Compositing ready"],
    controls: ["video", "threshold"],
    replicateId: "arielreplicate/robust_video_matting",
  },
];

// All models combined
const ALL_VIDEO_MODELS: VideoModel[] = [
  ...TEXT_TO_VIDEO_MODELS,
  ...IMAGE_TO_VIDEO_MODELS,
  ...VIDEO_TO_VIDEO_MODELS,
  ...VIDEO_ENHANCEMENT_MODELS,
];

// ===================== COMPONENT =====================

interface VideoStudioProps {
  onClose?: () => void;
}

export default function VideoStudio({ onClose }: VideoStudioProps) {
  // State
  const [activeTab, setActiveTab] = useState<"text-to-video" | "image-to-video" | "video-to-video" | "video-enhancement">("text-to-video");
  const [selectedModel, setSelectedModel] = useState<VideoModel>(TEXT_TO_VIDEO_MODELS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [filterAudio, setFilterAudio] = useState<"all" | "with-audio" | "without-audio">("all");
  const [filterSpeed, setFilterSpeed] = useState<"all" | "fast" | "standard" | "slow">("all");
  const [filterProvider, setFilterProvider] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  
  // Generation inputs
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [cfgScale, setCfgScale] = useState(7);
  const [steps, setSteps] = useState(30);
  const [fps, setFps] = useState(24);
  
  // File inputs
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState<string | null>(null);
  const [inputVideo, setInputVideo] = useState<File | null>(null);
  const [inputVideoPreview, setInputVideoPreview] = useState<string | null>(null);
  
  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoPlayerRef = useRef<HTMLVideoElement>(null);
  
  // Video player state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  
  // Get unique providers for filter
  const providers = Array.from(new Set(ALL_VIDEO_MODELS.map(m => m.provider)));
  
  // Filter models based on current tab and filters
  const getFilteredModels = () => {
    let models = ALL_VIDEO_MODELS.filter(m => m.type === activeTab);
    
    if (filterAudio !== "all") {
      models = models.filter(m => filterAudio === "with-audio" ? m.hasAudio : !m.hasAudio);
    }
    
    if (filterSpeed !== "all") {
      models = models.filter(m => m.speed === filterSpeed);
    }
    
    if (filterProvider !== "all") {
      models = models.filter(m => m.provider === filterProvider);
    }
    
    return models;
  };
  
  const filteredModels = getFilteredModels();
  
  // Update selected model when tab changes
  useEffect(() => {
    const modelsForTab = ALL_VIDEO_MODELS.filter(m => m.type === activeTab);
    if (modelsForTab.length > 0) {
      setSelectedModel(modelsForTab[0]);
    }
  }, [activeTab]);
  
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputImage(file);
      const url = URL.createObjectURL(file);
      setInputImagePreview(url);
    }
  };
  
  // Handle video upload
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputVideo(file);
      const url = URL.createObjectURL(file);
      setInputVideoPreview(url);
    }
  };
  
  // Generate video
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);
    
    try {
      const formData = new FormData();
      formData.append("model", selectedModel.replicateId);
      formData.append("prompt", prompt);
      formData.append("duration", duration.toString());
      formData.append("aspect_ratio", aspectRatio);
      
      if (negativePrompt) {
        formData.append("negative_prompt", negativePrompt);
      }
      
      if (selectedModel.controls.includes("cfg_scale")) {
        formData.append("cfg_scale", cfgScale.toString());
      }
      
      if (selectedModel.controls.includes("steps")) {
        formData.append("steps", steps.toString());
      }
      
      if (selectedModel.controls.includes("fps")) {
        formData.append("fps", fps.toString());
      }
      
      if (inputImage && (activeTab === "image-to-video" || selectedModel.controls.includes("reference_image"))) {
        formData.append("image", inputImage);
      }
      
      if (inputVideo && (activeTab === "video-to-video" || activeTab === "video-enhancement")) {
        formData.append("video", inputVideo);
      }
      
      // Simulate progress for now
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 5, 90));
      }, 1000);
      
      const response = await axios.post(`${API_BASE}/api/video/generate`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      
      clearInterval(progressInterval);
      setGenerationProgress(100);
      
      if (response.data.success && response.data.videoUrl) {
        setGeneratedVideoUrl(response.data.videoUrl);
      } else {
        throw new Error(response.data.error || "Generation failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };
  
  // Enhance prompt with AI
  const handleEnhancePrompt = async () => {
    if (!prompt.trim()) return;
    
    try {
      const response = await axios.post(`${API_BASE}/api/enhance-prompt`, {
        prompt,
        type: "video",
        model: selectedModel.id,
      });
      
      if (response.data.enhanced) {
        setPrompt(response.data.enhanced);
      }
    } catch (err) {
      console.error("Failed to enhance prompt:", err);
    }
  };
  
  // Get speed badge color
  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "fast": return "bg-green-500/20 text-green-400 border-green-500/30";
      case "standard": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
      case "slow": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
      default: return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };
  
  // Get cost badge color
  const getCostColor = (cost: string) => {
    switch (cost) {
      case "low": return "bg-green-500/20 text-green-400";
      case "medium": return "bg-yellow-500/20 text-yellow-400";
      case "high": return "bg-orange-500/20 text-orange-400";
      case "premium": return "bg-red-500/20 text-red-400";
      default: return "bg-slate-500/20 text-slate-400";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-red-500 to-pink-600">
                  <Video className="w-6 h-6" />
                </div>
                AI Video Studio
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                Generate, transform, and enhance videos with AI
              </p>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                title="Toggle filters"
                aria-label="Toggle filters"
                className={`p-2 rounded-lg transition ${showFilters ? "bg-purple-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}
              >
                <Filter className="w-5 h-5" />
              </button>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  title="Grid view"
                  aria-label="Grid view"
                  className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400"}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  title="List view"
                  aria-label="List view"
                  className={`p-2 rounded ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400"}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          
          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab("text-to-video")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === "text-to-video"
                  ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Type className="w-4 h-4" />
              Text to Video
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{TEXT_TO_VIDEO_MODELS.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("image-to-video")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === "image-to-video"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <ImageIcon className="w-4 h-4" />
              Image to Video
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{IMAGE_TO_VIDEO_MODELS.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("video-to-video")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === "video-to-video"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Film className="w-4 h-4" />
              Video to Video
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{VIDEO_TO_VIDEO_MODELS.length}</span>
            </button>
            <button
              onClick={() => setActiveTab("video-enhancement")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${
                activeTab === "video-enhancement"
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              <Wand2 className="w-4 h-4" />
              Enhancement
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{VIDEO_ENHANCEMENT_MODELS.length}</span>
            </button>
          </div>
          
          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Audio:</span>
                <select
                  value={filterAudio}
                  onChange={(e) => setFilterAudio(e.target.value as any)}
                  title="Filter by audio"
                  aria-label="Filter by audio"
                  className="px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600"
                >
                  <option value="all">All</option>
                  <option value="with-audio">With Audio</option>
                  <option value="without-audio">Without Audio</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Speed:</span>
                <select
                  value={filterSpeed}
                  onChange={(e) => setFilterSpeed(e.target.value as any)}
                  title="Filter by speed"
                  aria-label="Filter by speed"
                  className="px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600"
                >
                  <option value="all">All</option>
                  <option value="fast">Fast</option>
                  <option value="standard">Standard</option>
                  <option value="slow">Slow</option>
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Provider:</span>
                <select
                  value={filterProvider}
                  onChange={(e) => setFilterProvider(e.target.value)}
                  title="Filter by provider"
                  aria-label="Filter by provider"
                  className="px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600"
                >
                  <option value="all">All Providers</option>
                  {providers.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left Column - Model Selection & Controls */}
          <div className="space-y-6">
            {/* Tab Description */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <p className="text-sm text-slate-300">
                {activeTab === "text-to-video" && (
                  <>
                    <i className="fa-solid fa-wand-magic-sparkles text-purple-400 mr-2" />
                    <strong className="text-purple-400">Text to Video:</strong> Generate videos from text descriptions. Choose from state-of-the-art models like Google Veo, OpenAI Sora, Kling, and more.
                  </>
                )}
                {activeTab === "image-to-video" && (
                  <>
                    <i className="fa-solid fa-image text-cyan-400 mr-2" />
                    <strong className="text-cyan-400">Image to Video:</strong> Animate still images into dynamic videos. Upload an image and describe the motion you want.
                  </>
                )}
                {activeTab === "video-to-video" && (
                  <>
                    <i className="fa-solid fa-film text-orange-400 mr-2" />
                    <strong className="text-orange-400">Video to Video:</strong> Transform existing videos with style transfer, effects, and AI-powered modifications.
                  </>
                )}
                {activeTab === "video-enhancement" && (
                  <>
                    <i className="fa-solid fa-sparkles text-emerald-400 mr-2" />
                    <strong className="text-emerald-400">Video Enhancement:</strong> Upscale resolution, increase frame rate, remove backgrounds, and enhance video quality.
                  </>
                )}
              </p>
            </div>
            
            {/* Model Cards */}
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-3"}>
              {filteredModels.map((model) => (
                <div
                  key={model.id}
                  onClick={() => setSelectedModel(model)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    selectedModel.id === model.id
                      ? "border-purple-500 bg-purple-500/10 ring-2 ring-purple-500/30"
                      : "border-slate-700 bg-slate-800/50 hover:border-slate-600"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{model.name}</h3>
                        {model.isNew && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500 text-white rounded">NEW</span>
                        )}
                        {model.isFeatured && (
                          <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400">{model.provider}</p>
                    </div>
                    {model.hasAudio && (
                      <span title="Includes audio">
                        <Volume2 className="w-4 h-4 text-emerald-400" />
                      </span>
                    )}
                  </div>
                  
                  <p className="text-sm text-slate-300 mb-3">{model.description}</p>
                  
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded border ${getSpeedColor(model.speed)}`}>
                      <Zap className="w-3 h-3 inline mr-1" />{model.speed}
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getCostColor(model.cost)}`}>
                      <DollarSign className="w-3 h-3 inline" />{model.cost}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-700 text-slate-300">
                      <Clock className="w-3 h-3 inline mr-1" />{model.maxDuration}s max
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-700 text-slate-300">
                      {model.maxResolution}
                    </span>
                  </div>
                  
                  <div className="flex flex-wrap gap-1">
                    {model.features.slice(0, 3).map((feature, idx) => (
                      <span key={idx} className="px-2 py-0.5 text-[10px] rounded bg-slate-700/50 text-slate-400">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {filteredModels.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No models match your filters</p>
                <button
                  onClick={() => {
                    setFilterAudio("all");
                    setFilterSpeed("all");
                    setFilterProvider("all");
                  }}
                  className="mt-2 text-purple-400 hover:text-purple-300"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
          
          {/* Right Column - Generation Panel */}
          <div className="space-y-4">
            <div className="sticky top-32">
              {/* Selected Model Info */}
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                    <Video className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedModel.name}</h3>
                    <p className="text-xs text-slate-400">{selectedModel.provider} • {selectedModel.replicateId}</p>
                  </div>
                </div>
                
                {/* Input Fields Based on Model Type */}
                <div className="space-y-4">
                  {/* Image Input for Image-to-Video */}
                  {(activeTab === "image-to-video" || selectedModel.controls.includes("reference_image")) && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <ImageIcon className="w-4 h-4 inline mr-2" />
                        {activeTab === "image-to-video" ? "Input Image" : "Reference Image (Optional)"}
                      </label>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        title="Upload image"
                        aria-label="Upload image"
                        className="hidden"
                      />
                      {inputImagePreview ? (
                        <div className="relative">
                          <img
                            src={inputImagePreview}
                            alt="Input"
                            className="w-full h-40 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setInputImage(null);
                              setInputImagePreview(null);
                            }}
                            title="Remove image"
                            aria-label="Remove image"
                            className="absolute top-2 right-2 p-1 rounded bg-red-500 text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full py-8 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white transition"
                        >
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Click to upload image</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Video Input for Video-to-Video & Enhancement */}
                  {(activeTab === "video-to-video" || activeTab === "video-enhancement") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <Video className="w-4 h-4 inline mr-2" />
                        Input Video
                      </label>
                      <input
                        ref={videoInputRef}
                        type="file"
                        accept="video/*"
                        onChange={handleVideoUpload}
                        title="Upload video"
                        aria-label="Upload video"
                        className="hidden"
                      />
                      {inputVideoPreview ? (
                        <div className="relative">
                          <video
                            src={inputVideoPreview}
                            className="w-full h-40 object-cover rounded-lg"
                            controls
                          />
                          <button
                            onClick={() => {
                              setInputVideo(null);
                              setInputVideoPreview(null);
                            }}
                            title="Remove video"
                            aria-label="Remove video"
                            className="absolute top-2 right-2 p-1 rounded bg-red-500 text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => videoInputRef.current?.click()}
                          className="w-full py-8 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white transition"
                        >
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Click to upload video</span>
                        </button>
                      )}
                    </div>
                  )}
                  
                  {/* Prompt */}
                  {selectedModel.controls.includes("prompt") && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-sm font-medium text-slate-300">
                          <Type className="w-4 h-4 inline mr-2" />
                          Prompt
                        </label>
                        <button
                          onClick={handleEnhancePrompt}
                          disabled={!prompt.trim()}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" /> Enhance
                        </button>
                      </div>
                      <textarea
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        placeholder="Describe the video you want to generate..."
                        className="w-full h-24 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-none"
                      />
                    </div>
                  )}
                  
                  {/* Negative Prompt */}
                  {selectedModel.controls.includes("negative_prompt") && (
                    <div>
                      <label className="text-sm font-medium text-slate-300 mb-2 block">
                        Negative Prompt
                      </label>
                      <input
                        type="text"
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="What to avoid..."
                        className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400"
                      />
                    </div>
                  )}
                  
                  {/* Duration & Aspect Ratio */}
                  <div className="grid grid-cols-2 gap-3">
                    {selectedModel.controls.includes("duration") && (
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          <Clock className="w-4 h-4 inline mr-1" /> Duration: {duration}s
                        </label>
                        <input
                          type="range"
                          min={1}
                          max={selectedModel.maxDuration}
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          title="Duration"
                          aria-label="Duration"
                          className="w-full accent-purple-500"
                        />
                      </div>
                    )}
                    
                    {selectedModel.controls.includes("aspect_ratio") && (
                      <div>
                        <label className="text-sm font-medium text-slate-300 mb-2 block">
                          Aspect Ratio
                        </label>
                        <select
                          value={aspectRatio}
                          onChange={(e) => setAspectRatio(e.target.value)}
                          title="Aspect ratio"
                          aria-label="Aspect ratio"
                          className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white"
                        >
                          <option value="16:9">16:9 (Landscape)</option>
                          <option value="9:16">9:16 (Portrait)</option>
                          <option value="1:1">1:1 (Square)</option>
                          <option value="4:3">4:3 (Standard)</option>
                          <option value="21:9">21:9 (Cinematic)</option>
                        </select>
                      </div>
                    )}
                  </div>
                  
                  {/* Advanced Settings */}
                  <details className="group">
                    <summary className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white">
                      <Settings className="w-4 h-4" />
                      Advanced Settings
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 space-y-3 pl-6">
                      {selectedModel.controls.includes("cfg_scale") && (
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">
                            CFG Scale: {cfgScale}
                          </label>
                          <input
                            type="range"
                            min={1}
                            max={20}
                            value={cfgScale}
                            onChange={(e) => setCfgScale(Number(e.target.value))}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      )}
                      
                      {selectedModel.controls.includes("steps") && (
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">
                            Steps: {steps}
                          </label>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            value={steps}
                            onChange={(e) => setSteps(Number(e.target.value))}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      )}
                      
                      {selectedModel.controls.includes("fps") && (
                        <div>
                          <label className="text-xs text-slate-400 block mb-1">
                            FPS: {fps}
                          </label>
                          <input
                            type="range"
                            min={8}
                            max={60}
                            value={fps}
                            onChange={(e) => setFps(Number(e.target.value))}
                            className="w-full accent-purple-500"
                          />
                        </div>
                      )}
                    </div>
                  </details>
                </div>
                
                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || (activeTab === "image-to-video" && !inputImage) || (activeTab !== "video-enhancement" && !prompt.trim())}
                  className="w-full mt-4 py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Generating... {generationProgress}%
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5" />
                      Generate Video
                    </>
                  )}
                </button>
                
                {/* Progress Bar */}
                {isGenerating && (
                  <div className="mt-3">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">
                      This may take a few minutes depending on the model
                    </p>
                  </div>
                )}
                
                {/* Error */}
                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </div>
              
              {/* Result Preview */}
              {generatedVideoUrl && (
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />
                    Generated Video
                  </h3>
                  <div className="relative rounded-lg overflow-hidden bg-black">
                    <video
                      ref={videoPlayerRef}
                      src={generatedVideoUrl}
                      className="w-full"
                      controls
                      autoPlay
                      loop
                      muted={isMuted}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a
                      href={generatedVideoUrl}
                      download
                      className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </a>
                    <button
                      onClick={() => navigator.clipboard.writeText(generatedVideoUrl)}
                      className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white"
                      title="Copy URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
