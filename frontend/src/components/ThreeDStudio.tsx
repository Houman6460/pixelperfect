import React, { useState, useRef } from "react";
import axios from "axios";
import {
  Box, Loader2, Download, Upload, Play, Settings, ChevronDown, Star, Clock,
  DollarSign, Filter, Grid, List, Check, AlertCircle, RefreshCw, Eye, RotateCcw,
  Maximize2, Image as ImageIcon, Type, Layers, Shapes, X, Zap,
} from "lucide-react";

// Dynamic API base URL
const getApiBaseUrl = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL.replace(/\/api$/, '');
  }
  if (typeof window !== 'undefined' && window.location.hostname.includes('pages.dev')) {
    return 'https://pixelperfect-api.houman-ghavamzadeh.workers.dev';
  }
  return 'http://localhost:4000';
};
const API_BASE = getApiBaseUrl();

// Get auth headers
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ===================== MODEL DEFINITIONS =====================
interface ThreeDModel {
  id: string;
  name: string;
  provider: string;
  providerColor: string;
  description: string;
  type: "text-to-3d" | "image-to-3d" | "3d-to-3d" | "3d-enhancement";
  outputFormats: string[];
  speed: "fast" | "standard" | "slow";
  quality: "standard" | "high" | "premium";
  cost: "low" | "medium" | "high";
  features: string[];
  replicateId: string;
  isNew?: boolean;
  isFeatured?: boolean;
}

// Text-to-3D Models
const TEXT_TO_3D_MODELS: ThreeDModel[] = [
  {
    id: "shap-e",
    name: "Shap-E",
    provider: "OpenAI",
    providerColor: "bg-emerald-500",
    description: "Generate 3D objects from text descriptions using OpenAI's model",
    type: "text-to-3d",
    outputFormats: ["GLB", "PLY"],
    speed: "fast",
    quality: "standard",
    cost: "low",
    features: ["Fast generation", "Multiple formats", "Open source"],
    replicateId: "cjwbw/shap-e",
    isFeatured: true,
  },
  {
    id: "point-e",
    name: "Point-E",
    provider: "OpenAI",
    providerColor: "bg-emerald-500",
    description: "Generate 3D point clouds from text, then convert to mesh",
    type: "text-to-3d",
    outputFormats: ["PLY", "OBJ"],
    speed: "fast",
    quality: "standard",
    cost: "low",
    features: ["Point cloud", "Fast", "Open source"],
    replicateId: "cjwbw/point-e",
  },
  {
    id: "meshy-text-to-3d",
    name: "Meshy Text-to-3D",
    provider: "Meshy",
    providerColor: "bg-purple-500",
    description: "High-quality 3D asset generation from text prompts",
    type: "text-to-3d",
    outputFormats: ["GLB", "FBX", "OBJ", "USDZ"],
    speed: "standard",
    quality: "premium",
    cost: "medium",
    features: ["PBR textures", "High detail", "Game-ready"],
    replicateId: "meshy-ai/meshy-text-to-3d",
    isNew: true,
    isFeatured: true,
  },
  {
    id: "dreamgaussian",
    name: "DreamGaussian",
    provider: "Research",
    providerColor: "bg-blue-500",
    description: "Fast 3D generation using Gaussian Splatting",
    type: "text-to-3d",
    outputFormats: ["GLB", "PLY"],
    speed: "fast",
    quality: "high",
    cost: "low",
    features: ["Gaussian splatting", "Fast", "High quality"],
    replicateId: "jiawei011/dreamgaussian",
    isNew: true,
  },
  {
    id: "genie",
    name: "Luma Genie",
    provider: "Luma AI",
    providerColor: "bg-pink-500",
    description: "Create 3D models from text with Luma's foundation model",
    type: "text-to-3d",
    outputFormats: ["GLB", "USDZ"],
    speed: "standard",
    quality: "premium",
    cost: "high",
    features: ["High quality", "Textured output", "Commercial ready"],
    replicateId: "luma/genie",
    isFeatured: true,
  },
];

// Image-to-3D Models
const IMAGE_TO_3D_MODELS: ThreeDModel[] = [
  {
    id: "triposr",
    name: "TripoSR",
    provider: "StabilityAI",
    providerColor: "bg-violet-500",
    description: "Fast single-image 3D reconstruction in under 1 second",
    type: "image-to-3d",
    outputFormats: ["GLB", "OBJ"],
    speed: "fast",
    quality: "high",
    cost: "low",
    features: ["Sub-second", "Single image", "Open source"],
    replicateId: "camenduru/triposr",
    isFeatured: true,
  },
  {
    id: "instant-mesh",
    name: "InstantMesh",
    provider: "TencentARC",
    providerColor: "bg-blue-600",
    description: "Efficient 3D mesh generation from single images",
    type: "image-to-3d",
    outputFormats: ["GLB", "OBJ", "PLY"],
    speed: "fast",
    quality: "high",
    cost: "low",
    features: ["Fast mesh", "High quality", "Multi-view"],
    replicateId: "camenduru/instantmesh",
    isNew: true,
    isFeatured: true,
  },
  {
    id: "lgm",
    name: "LGM (Large Gaussian Model)",
    provider: "Research",
    providerColor: "bg-cyan-500",
    description: "High-quality 3D Gaussian generation from images",
    type: "image-to-3d",
    outputFormats: ["GLB", "PLY"],
    speed: "standard",
    quality: "premium",
    cost: "medium",
    features: ["Gaussian splatting", "High fidelity", "Multi-view"],
    replicateId: "camenduru/lgm",
    isNew: true,
  },
  {
    id: "wonder3d",
    name: "Wonder3D",
    provider: "Research",
    providerColor: "bg-amber-500",
    description: "Single image to 3D with consistent multi-view generation",
    type: "image-to-3d",
    outputFormats: ["GLB", "OBJ"],
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["Multi-view consistent", "Textured", "Detailed"],
    replicateId: "camenduru/wonder3d",
  },
  {
    id: "one-2-3-45",
    name: "One-2-3-45",
    provider: "Research",
    providerColor: "bg-orange-500",
    description: "Single image to 360° 3D model generation",
    type: "image-to-3d",
    outputFormats: ["GLB", "OBJ"],
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["360° view", "Single image", "Textured mesh"],
    replicateId: "camenduru/one-2-3-45",
  },
  {
    id: "zero123plus",
    name: "Zero123++",
    provider: "StabilityAI",
    providerColor: "bg-violet-500",
    description: "Generate consistent multi-view images for 3D reconstruction",
    type: "image-to-3d",
    outputFormats: ["Multi-view images"],
    speed: "fast",
    quality: "high",
    cost: "low",
    features: ["Multi-view", "Consistent", "High quality"],
    replicateId: "stability-ai/zero123plus",
  },
  {
    id: "meshy-image-to-3d",
    name: "Meshy Image-to-3D",
    provider: "Meshy",
    providerColor: "bg-purple-500",
    description: "Convert any image to high-quality 3D model with textures",
    type: "image-to-3d",
    outputFormats: ["GLB", "FBX", "OBJ", "USDZ"],
    speed: "standard",
    quality: "premium",
    cost: "high",
    features: ["PBR textures", "High detail", "Game-ready"],
    replicateId: "meshy-ai/meshy-image-to-3d",
    isFeatured: true,
  },
  {
    id: "tsr",
    name: "TSR (Tripo SR)",
    provider: "Tripo AI",
    providerColor: "bg-teal-500",
    description: "State-of-the-art image to 3D with high-quality textures",
    type: "image-to-3d",
    outputFormats: ["GLB", "OBJ", "FBX"],
    speed: "standard",
    quality: "premium",
    cost: "medium",
    features: ["High quality textures", "Fast", "Commercial ready"],
    replicateId: "tripo-ai/tsr",
    isNew: true,
  },
];

// 3D Enhancement Models
const ENHANCEMENT_3D_MODELS: ThreeDModel[] = [
  {
    id: "texture-gen",
    name: "3D Texture Generator",
    provider: "Meshy",
    providerColor: "bg-purple-500",
    description: "Generate textures for existing 3D models",
    type: "3d-enhancement",
    outputFormats: ["PNG", "JPG"],
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["PBR textures", "Seamless", "High resolution"],
    replicateId: "meshy-ai/texture-gen",
  },
  {
    id: "mesh-refiner",
    name: "Mesh Refiner",
    provider: "Research",
    providerColor: "bg-gray-500",
    description: "Refine and smooth 3D meshes",
    type: "3d-enhancement",
    outputFormats: ["GLB", "OBJ"],
    speed: "fast",
    quality: "high",
    cost: "low",
    features: ["Mesh smoothing", "Hole filling", "Optimization"],
    replicateId: "research/mesh-refiner",
  },
];

// 3D-to-3D Models (Style Transfer, Animation)
const THREE_D_TO_3D_MODELS: ThreeDModel[] = [
  {
    id: "animate-anything",
    name: "Animate Anything 3D",
    provider: "Research",
    providerColor: "bg-red-500",
    description: "Add animations to static 3D models",
    type: "3d-to-3d",
    outputFormats: ["GLB", "FBX"],
    speed: "slow",
    quality: "high",
    cost: "high",
    features: ["Animation", "Rigging", "Motion transfer"],
    replicateId: "research/animate-anything-3d",
    isNew: true,
  },
  {
    id: "style-transfer-3d",
    name: "3D Style Transfer",
    provider: "Research",
    providerColor: "bg-indigo-500",
    description: "Apply artistic styles to 3D models",
    type: "3d-to-3d",
    outputFormats: ["GLB", "OBJ"],
    speed: "standard",
    quality: "high",
    cost: "medium",
    features: ["Style transfer", "Texture modification", "Color grading"],
    replicateId: "research/style-transfer-3d",
  },
];

// All models combined
const ALL_3D_MODELS: ThreeDModel[] = [
  ...TEXT_TO_3D_MODELS,
  ...IMAGE_TO_3D_MODELS,
  ...THREE_D_TO_3D_MODELS,
  ...ENHANCEMENT_3D_MODELS,
];

// Output format options
const OUTPUT_FORMATS = ["GLB", "OBJ", "FBX", "USDZ", "PLY", "STL"];

// ===================== COMPONENT =====================
export default function ThreeDStudio() {
  const [activeTab, setActiveTab] = useState<"text-to-3d" | "image-to-3d" | "3d-to-3d" | "3d-enhancement">("text-to-3d");
  const [selectedModel, setSelectedModel] = useState<ThreeDModel>(TEXT_TO_3D_MODELS[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generatedModelUrl, setGeneratedModelUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterProvider, setFilterProvider] = useState("all");
  const [filterQuality, setFilterQuality] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Generation inputs
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [outputFormat, setOutputFormat] = useState("GLB");
  const [guidanceScale, setGuidanceScale] = useState(15);
  const [numSteps, setNumSteps] = useState(64);

  // File inputs
  const [inputImage, setInputImage] = useState<File | null>(null);
  const [inputImagePreview, setInputImagePreview] = useState<string | null>(null);
  const [input3DFile, setInput3DFile] = useState<File | null>(null);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const threeDInputRef = useRef<HTMLInputElement>(null);

  // Get unique providers
  const providers = Array.from(new Set(ALL_3D_MODELS.map(m => m.provider)));

  // Filter models
  const getFilteredModels = () => {
    let models = ALL_3D_MODELS.filter(m => m.type === activeTab);
    if (filterProvider !== "all") models = models.filter(m => m.provider === filterProvider);
    if (filterQuality !== "all") models = models.filter(m => m.quality === filterQuality);
    return models;
  };

  const filteredModels = getFilteredModels();

  // Update selected model when tab changes
  React.useEffect(() => {
    const modelsForTab = ALL_3D_MODELS.filter(m => m.type === activeTab);
    if (modelsForTab.length > 0) setSelectedModel(modelsForTab[0]);
  }, [activeTab]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setInputImage(file);
      setInputImagePreview(URL.createObjectURL(file));
    }
  };

  // Handle 3D file upload
  const handle3DUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setInput3DFile(file);
  };

  // Generate 3D
  const handleGenerate = async () => {
    setIsGenerating(true);
    setError(null);
    setGenerationProgress(0);

    try {
      const formData = new FormData();
      formData.append("model", selectedModel.replicateId);
      formData.append("prompt", prompt);
      formData.append("output_format", outputFormat.toLowerCase());
      formData.append("guidance_scale", guidanceScale.toString());
      formData.append("num_steps", numSteps.toString());

      if (negativePrompt) formData.append("negative_prompt", negativePrompt);
      if (inputImage) formData.append("image", inputImage);
      if (input3DFile) formData.append("model_file", input3DFile);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setGenerationProgress(prev => Math.min(prev + 3, 90));
      }, 1000);

      const response = await axios.post(`${API_BASE}/api/3d/generate`, formData, {
        headers: { "Content-Type": "multipart/form-data", ...getAuthHeaders() },
        timeout: 300000, // 5 minutes
      });

      clearInterval(progressInterval);
      setGenerationProgress(100);

      if (response.data.success && response.data.modelUrl) {
        setGeneratedModelUrl(response.data.modelUrl);
      } else {
        throw new Error(response.data.error || "Generation failed");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const getSpeedColor = (speed: string) => speed === "fast" ? "bg-green-500/20 text-green-400" : speed === "standard" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400";
  const getCostColor = (cost: string) => cost === "low" ? "bg-green-500/20 text-green-400" : cost === "medium" ? "bg-yellow-500/20 text-yellow-400" : "bg-orange-500/20 text-orange-400";
  const getQualityColor = (quality: string) => quality === "standard" ? "bg-slate-500/20 text-slate-400" : quality === "high" ? "bg-blue-500/20 text-blue-400" : "bg-purple-500/20 text-purple-400";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
                  <Box className="w-6 h-6" />
                </div>
                AI 3D Studio
              </h1>
              <p className="text-sm text-slate-400 mt-1">
                <i className="fa-solid fa-cube text-cyan-400 mr-2" />
                Generate 3D models from text, images, or enhance existing 3D assets
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button onClick={() => setShowFilters(!showFilters)} title="Toggle filters" aria-label="Toggle filters" className={`p-2 rounded-lg transition ${showFilters ? "bg-cyan-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
                <Filter className="w-5 h-5" />
              </button>
              <div className="flex bg-slate-800 rounded-lg p-1">
                <button onClick={() => setViewMode("grid")} title="Grid view" aria-label="Grid view" className={`p-2 rounded ${viewMode === "grid" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
                  <Grid className="w-4 h-4" />
                </button>
                <button onClick={() => setViewMode("list")} title="List view" aria-label="List view" className={`p-2 rounded ${viewMode === "list" ? "bg-slate-700 text-white" : "text-slate-400"}`}>
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-2">
            <button onClick={() => setActiveTab("text-to-3d")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${activeTab === "text-to-3d" ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              <i className="fa-solid fa-font" /> Text to 3D
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{TEXT_TO_3D_MODELS.length}</span>
            </button>
            <button onClick={() => setActiveTab("image-to-3d")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${activeTab === "image-to-3d" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              <i className="fa-solid fa-image" /> Image to 3D
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{IMAGE_TO_3D_MODELS.length}</span>
            </button>
            <button onClick={() => setActiveTab("3d-to-3d")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${activeTab === "3d-to-3d" ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              <i className="fa-solid fa-arrows-rotate" /> 3D Transform
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{THREE_D_TO_3D_MODELS.length}</span>
            </button>
            <button onClick={() => setActiveTab("3d-enhancement")} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm whitespace-nowrap transition ${activeTab === "3d-enhancement" ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"}`}>
              <i className="fa-solid fa-wand-magic-sparkles" /> Enhancement
              <span className="px-1.5 py-0.5 text-xs bg-white/20 rounded">{ENHANCEMENT_3D_MODELS.length}</span>
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="flex flex-wrap items-center gap-3 mt-4 p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Provider:</span>
                <select value={filterProvider} onChange={e => setFilterProvider(e.target.value)} title="Filter by provider" aria-label="Filter by provider" className="px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600">
                  <option value="all">All</option>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Quality:</span>
                <select value={filterQuality} onChange={e => setFilterQuality(e.target.value)} title="Filter by quality" aria-label="Filter by quality" className="px-2 py-1 text-xs rounded bg-slate-700 text-white border border-slate-600">
                  <option value="all">All</option>
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-[1fr_400px] gap-6">
          {/* Left - Model Selection */}
          <div className="space-y-6">
            {/* Tab Description */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
              <p className="text-sm text-slate-300">
                {activeTab === "text-to-3d" && <><i className="fa-solid fa-font text-cyan-400 mr-2" /><strong className="text-cyan-400">Text to 3D:</strong> Generate 3D models from text descriptions. Describe what you want and AI will create it.</>}
                {activeTab === "image-to-3d" && <><i className="fa-solid fa-image text-purple-400 mr-2" /><strong className="text-purple-400">Image to 3D:</strong> Convert 2D images into 3D models. Upload any image to generate a 3D version.</>}
                {activeTab === "3d-to-3d" && <><i className="fa-solid fa-arrows-rotate text-orange-400 mr-2" /><strong className="text-orange-400">3D Transform:</strong> Apply animations, style transfer, and modifications to existing 3D models.</>}
                {activeTab === "3d-enhancement" && <><i className="fa-solid fa-wand-magic-sparkles text-emerald-400 mr-2" /><strong className="text-emerald-400">3D Enhancement:</strong> Improve existing 3D models with better textures, mesh refinement, and optimization.</>}
              </p>
            </div>

            {/* Model Cards */}
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-3"}>
              {filteredModels.map(model => (
                <div key={model.id} onClick={() => setSelectedModel(model)} className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedModel.id === model.id ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30" : "border-slate-700 bg-slate-800/50 hover:border-slate-600"}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-white">{model.name}</h3>
                        {model.isNew && <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-500 text-white rounded">NEW</span>}
                        {model.isFeatured && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />}
                      </div>
                      <p className="text-xs text-slate-400">{model.provider}</p>
                    </div>
                    <div className={`w-2 h-2 rounded-full ${model.providerColor}`} />
                  </div>
                  <p className="text-sm text-slate-300 mb-3">{model.description}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getSpeedColor(model.speed)}`}><i className="fa-solid fa-bolt mr-1" />{model.speed}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getCostColor(model.cost)}`}><i className="fa-solid fa-dollar-sign mr-1" />{model.cost}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded ${getQualityColor(model.quality)}`}><i className="fa-solid fa-star mr-1" />{model.quality}</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {model.outputFormats.slice(0, 3).map((fmt, i) => <span key={i} className="px-2 py-0.5 text-[10px] rounded bg-slate-700/50 text-slate-400">{fmt}</span>)}
                  </div>
                </div>
              ))}
            </div>

            {filteredModels.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Box className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No models match your filters</p>
              </div>
            )}
          </div>

          {/* Right - Generation Panel */}
          <div className="space-y-4">
            <div className="sticky top-32">
              <div className="p-4 rounded-xl bg-slate-800 border border-slate-700 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
                    <Box className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{selectedModel.name}</h3>
                    <p className="text-xs text-slate-400">{selectedModel.provider} • {selectedModel.replicateId}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Image Input for Image-to-3D */}
                  {activeTab === "image-to-3d" && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <i className="fa-solid fa-image text-purple-400 mr-2" />Input Image
                      </label>
                      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} title="Upload image" aria-label="Upload image" className="hidden" />
                      {inputImagePreview ? (
                        <div className="relative">
                          <img src={inputImagePreview} alt="Input" className="w-full h-40 object-cover rounded-lg" />
                          <button onClick={() => { setInputImage(null); setInputImagePreview(null); }} title="Remove image" aria-label="Remove image" className="absolute top-2 right-2 p-1 rounded bg-red-500 text-white"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} className="w-full py-8 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white transition">
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Click to upload image</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* 3D File Input for 3D-to-3D */}
                  {(activeTab === "3d-to-3d" || activeTab === "3d-enhancement") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <i className="fa-solid fa-cube text-orange-400 mr-2" />Input 3D Model
                      </label>
                      <input ref={threeDInputRef} type="file" accept=".glb,.gltf,.obj,.fbx" onChange={handle3DUpload} title="Upload 3D model" aria-label="Upload 3D model" className="hidden" />
                      {input3DFile ? (
                        <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700">
                          <span className="text-sm text-white">{input3DFile.name}</span>
                          <button onClick={() => setInput3DFile(null)} title="Remove file" aria-label="Remove file" className="p-1 rounded bg-red-500 text-white"><X className="w-4 h-4" /></button>
                        </div>
                      ) : (
                        <button onClick={() => threeDInputRef.current?.click()} className="w-full py-8 rounded-lg border-2 border-dashed border-slate-600 hover:border-slate-500 text-slate-400 hover:text-white transition">
                          <Upload className="w-6 h-6 mx-auto mb-2" />
                          <span className="text-sm">Upload GLB, OBJ, or FBX</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Prompt */}
                  {(activeTab === "text-to-3d" || activeTab === "image-to-3d") && (
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        <i className="fa-solid fa-pen text-cyan-400 mr-2" />Prompt
                      </label>
                      <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the 3D model you want..." className="w-full h-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white placeholder-slate-400 resize-none" />
                    </div>
                  )}

                  {/* Output Format */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      <i className="fa-solid fa-file-export text-emerald-400 mr-2" />Output Format
                    </label>
                    <select value={outputFormat} onChange={e => setOutputFormat(e.target.value)} title="Output format" aria-label="Output format" className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white">
                      {selectedModel.outputFormats.map(fmt => <option key={fmt} value={fmt}>{fmt}</option>)}
                    </select>
                  </div>

                  {/* Advanced Settings */}
                  <details className="group">
                    <summary className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer hover:text-white">
                      <Settings className="w-4 h-4" />Advanced Settings
                      <ChevronDown className="w-4 h-4 group-open:rotate-180 transition-transform" />
                    </summary>
                    <div className="mt-3 space-y-3 pl-6">
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Guidance Scale: {guidanceScale}</label>
                        <input type="range" min={1} max={30} value={guidanceScale} onChange={e => setGuidanceScale(Number(e.target.value))} title="Guidance scale" aria-label="Guidance scale" className="w-full accent-cyan-500" />
                      </div>
                      <div>
                        <label className="text-xs text-slate-400 block mb-1">Steps: {numSteps}</label>
                        <input type="range" min={16} max={128} value={numSteps} onChange={e => setNumSteps(Number(e.target.value))} title="Number of steps" aria-label="Number of steps" className="w-full accent-cyan-500" />
                      </div>
                    </div>
                  </details>
                </div>

                {/* Generate Button */}
                <button onClick={handleGenerate} disabled={isGenerating || (activeTab === "text-to-3d" && !prompt.trim()) || (activeTab === "image-to-3d" && !inputImage)} className="w-full mt-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold hover:from-cyan-600 hover:to-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {isGenerating ? <><Loader2 className="w-5 h-5 animate-spin" />Generating... {generationProgress}%</> : <><Box className="w-5 h-5" />Generate 3D</>}
                </button>

                {/* Progress */}
                {isGenerating && (
                  <div className="mt-3">
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all" style={{ width: `${generationProgress}%` }} />
                    </div>
                    <p className="text-xs text-slate-400 mt-1 text-center">3D generation may take several minutes</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center gap-2 text-red-400">
                    <AlertCircle className="w-4 h-4" /><span className="text-sm">{error}</span>
                  </div>
                )}
              </div>

              {/* Result */}
              {generatedModelUrl && (
                <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                  <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-400" />Generated 3D Model
                  </h3>
                  <div className="p-4 rounded-lg bg-slate-900 flex items-center justify-center h-40">
                    <div className="text-center">
                      <Box className="w-12 h-12 mx-auto text-cyan-400 mb-2" />
                      <p className="text-sm text-slate-400">3D Preview</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <a href={generatedModelUrl} download className="flex-1 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium flex items-center justify-center gap-2">
                      <Download className="w-4 h-4" />Download {outputFormat}
                    </a>
                    <button onClick={() => window.open(generatedModelUrl, '_blank')} title="View 3D model" aria-label="View 3D model" className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white">
                      <Eye className="w-4 h-4" />
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
