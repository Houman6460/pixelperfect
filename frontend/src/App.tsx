import React, { useEffect, useState, useRef, useCallback, lazy, Suspense } from "react";
import axios from "axios";
import { 
  Search, 
  Sparkles, 
  Rocket, 
  FolderOpen, 
  Plus, 
  Play, 
  Square, 
  Download, 
  Trash2, 
  X, 
  Check, 
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Layers,
  Wand2,
  Palette,
  Camera,
  Film,
  Blend,
  ZapOff,
  Zap,
  Maximize2,
  Edit3,
  Music,
  Lock,
  User,
  LayoutDashboard,
  LogIn,
  LogOut,
  Shield,
  RefreshCw,
} from "lucide-react";
import { ImageUploader } from "./components/ImageUploader";
import { SettingsForm } from "./components/SettingsForm";
import { ProgressBar } from "./components/ProgressBar";
import { ResultViewer } from "./components/ResultViewer";
import { FullscreenViewer } from "./components/FullscreenViewer";
import { Gallery } from "./components/Gallery";
import { UpgradeModal } from "./components/UpgradeModal";
import { useSubscription } from "./contexts/SubscriptionContext";
import { useAuth } from "./contexts/AuthContext";
import { StudioType } from "./types/subscription";

// Lazy load heavy studio components for better performance
const ImageEditor = lazy(() => import("./components/ImageEditor"));
const MusicStudio = lazy(() => import("./components/MusicStudio"));
const VideoStudio = lazy(() => import("./components/VideoStudio"));
const TextStudio = lazy(() => import("./components/TextStudio"));
const ThreeDStudio = lazy(() => import("./components/ThreeDStudio"));

// Loading fallback for studios
const StudioLoader = () => (
  <div className="flex items-center justify-center h-96">
    <div className="flex flex-col items-center gap-3">
      <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      <span className="text-slate-400 text-sm">Loading Studio...</span>
    </div>
  </div>
);

// Error Boundary for lazy-loaded components
class StudioErrorBoundary extends React.Component<
  { children: React.ReactNode; onRetry?: () => void },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode; onRetry?: () => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Studio loading error:', error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    // Force reload the page to re-fetch chunks
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-white mb-1">Failed to load studio</h3>
              <p className="text-sm text-slate-400 mb-4">
                {this.state.error?.message || 'An error occurred while loading'}
              </p>
            </div>
            <button
              onClick={this.handleRetry}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
import { ProgressStep, Settings, ENHANCEMENT_PRESETS } from "./types";

// Queue item interface
interface QueueItem {
  id: string;
  file: File;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  resultBase64?: string;
  resultWidth?: number;
  resultHeight?: number;
  error?: string;
}

const defaultSettings: Settings = {
  tileSize: 256,
  overlap: 80,
  upscaleFactor: 2,
  prompt: ENHANCEMENT_PRESETS.upscale.prompt,
  finalPass: true,
  enhancementMode: "upscale",
  sharpness: ENHANCEMENT_PRESETS.upscale.settings.sharpness,
  denoise: ENHANCEMENT_PRESETS.upscale.settings.denoise,
  contrast: ENHANCEMENT_PRESETS.upscale.settings.contrast,
  enhancementPasses: ENHANCEMENT_PRESETS.upscale.settings.enhancementPasses,
};

const baseSteps: ProgressStep[] = [
  { key: "upload", label: "Upload", status: "pending" },
  { key: "analysis", label: "AI Analysis", status: "pending" },
  { key: "tiling", label: "Tiling", status: "pending" },
  { key: "sending", label: "Context-Aware Enhancement", status: "pending" },
  { key: "merging", label: "Merging & Blending", status: "pending" },
  { key: "final", label: "Final Pass", status: "pending" },
];

// Dynamic API base URL (without /api suffix - component adds /api/ prefix to routes)
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

// Get auth headers for API calls
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

function App() {
  // Auth context
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  // Subscription access control
  const { 
    hasStudioAccess, 
    lockedStudioBehavior,
    showUpgradeModal,
    setShowUpgradeModal,
    upgradeModalStudio,
    setUpgradeModalStudio,
  } = useSubscription();
  
  // Single image state
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [originalWidth, setOriginalWidth] = useState<number | null>(null);
  const [originalHeight, setOriginalHeight] = useState<number | null>(null);
  const [resultBase64, setResultBase64] = useState<string | null>(null);
  const [resultWidth, setResultWidth] = useState<number | null>(null);
  const [resultHeight, setResultHeight] = useState<number | null>(null);
  const [steps, setSteps] = useState<ProgressStep[]>(() => baseSteps.map((s) => ({ ...s })));
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiEnhanced, setAiEnhanced] = useState<boolean | undefined>(undefined);
  const [modelName, setModelName] = useState<string | null>(null);
  const [enhanceMode, setEnhanceMode] = useState<"enhance" | "reimagine">("enhance");
  const [creativity, setCreativity] = useState(0.5);
  const [imageType, setImageType] = useState<"portrait" | "object" | "nature">("portrait");
  
  // Batch processing state
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [isQueueProcessing, setIsQueueProcessing] = useState(false);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // App mode: "upscale" | "generate" | "batch" | "gallery" | "edit" | "music" | "video" | "text" | "3d"
  const [appMode, setAppMode] = useState<"upscale" | "generate" | "batch" | "gallery" | "edit" | "music" | "video" | "text" | "3d">("upscale");
  const [tabGroup, setTabGroup] = useState<"image" | "sound" | "video" | "text" | "3d">("image");
  
  // Generate mode state
  const [generatePrompt, setGeneratePrompt] = useState("");
  const [generateStyle, setGenerateStyle] = useState<"photorealistic" | "artistic" | "anime" | "digital-art">("photorealistic");
  const [generateMode, setGenerateMode] = useState<"normal" | "mix">("normal");
  const [referenceImages, setReferenceImages] = useState<File[]>([]);
  const [autoUpscale, setAutoUpscale] = useState(false);
  const [generateUpscaleFactor, setGenerateUpscaleFactor] = useState(2);
  const [editMode, setEditMode] = useState<"instruct" | "creative">("instruct");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<{ base64: string; width: number; height: number } | null>(null);
  const refImageInputRef = useRef<HTMLInputElement>(null);
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  // Fullscreen viewer state
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const [fullscreenImages, setFullscreenImages] = useState<{ src: string; title?: string; width?: number; height?: number }[]>([]);
  
  // Gallery images for ImageEditor
  const [editorGalleryImages, setEditorGalleryImages] = useState<{ id: string; filename: string; originalName: string; url: string; width: number; height: number }[]>([]);
  
  // Map tab groups to studio types for access checking
  const tabGroupToStudio: Record<string, StudioType> = {
    image: "image",
    video: "video", 
    sound: "sound",
    text: "text",
    "3d": "3d",
  };
  
  // Handle studio tab click with access checking
  const handleStudioTabClick = (group: "image" | "video" | "sound" | "text" | "3d", mode: typeof appMode) => {
    const studioType = tabGroupToStudio[group];
    
    // Image studio is always accessible (base functionality)
    if (group === "image" || hasStudioAccess(studioType)) {
      setTabGroup(group);
      if (mode) setAppMode(mode);
    } else {
      // No access - show upgrade modal
      setUpgradeModalStudio(studioType);
      setShowUpgradeModal(true);
    }
  };
  
  // Check if a studio is locked (for UI display)
  const isStudioLocked = (group: string): boolean => {
    if (group === "image") return false; // Image is always available
    const studioType = tabGroupToStudio[group];
    return !hasStudioAccess(studioType);
  };
  
  // Fetch gallery images when entering edit mode
  useEffect(() => {
    if (appMode === "edit") {
      axios.get(`${API_BASE}/api/gallery/images`, { headers: getAuthHeaders() })
        .then(res => {
          const images = res.data.images || [];
          setEditorGalleryImages(images.map((img: { id: string; filename: string; originalName: string; width: number; height: number; url: string }) => ({
            id: img.id,
            filename: img.filename,
            originalName: img.originalName,
            url: img.url,
            width: img.width,
            height: img.height,
          })));
        })
        .catch(err => console.error("Failed to fetch gallery images:", err));
    }
  }, [appMode]);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const resetSteps = () => {
    setSteps(baseSteps.map((s) => ({ ...s })));
  };

  const updateStepStatus = (key: string, status: ProgressStep["status"]) => {
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, status } : step)));
  };

  // Auto-optimize settings based on image dimensions
  const autoOptimizeSettings = (width: number, height: number) => {
    const totalPixels = width * height;
    
    let tileSize = 256;
    let overlap = 64;
    let upscaleFactor = 2;
    
    // Adjust based on image size
    if (totalPixels < 100000) {
      // Small image (<316x316): use smaller tiles, higher upscale
      tileSize = 128;
      overlap = 48;
      upscaleFactor = 4;
    } else if (totalPixels < 500000) {
      // Medium-small (<707x707): balanced settings
      tileSize = 192;
      overlap = 64;
      upscaleFactor = 3;
    } else if (totalPixels < 2000000) {
      // Medium (<1414x1414): standard settings
      tileSize = 256;
      overlap = 64;
      upscaleFactor = 2;
    } else {
      // Large image: larger tiles to reduce API calls
      tileSize = 384;
      overlap = 96;
      upscaleFactor = 2;
    }
    
    setSettings(prev => ({
      ...prev,
      tileSize,
      overlap,
      upscaleFactor,
    }));
  };

  const handleFileChange = (next: File | null) => {
    setFile(next);
    setResultBase64(null);
    setResultWidth(null);
    setResultHeight(null);
    setError(null);
    setAiEnhanced(undefined);

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }

    if (next) {
      const url = URL.createObjectURL(next);
      setPreviewUrl(url);

      const img = new Image();
      img.onload = () => {
        setOriginalWidth(img.naturalWidth);
        setOriginalHeight(img.naturalHeight);
        // Auto-optimize settings for this image
        autoOptimizeSettings(img.naturalWidth, img.naturalHeight);
      };
      img.src = url;
    } else {
      setOriginalWidth(null);
      setOriginalHeight(null);
    }
  };

  // Process a single image (used by both single and batch mode)
  const processImage = async (imageFile: File): Promise<{
    imageBase64: string;
    width: number;
    height: number;
    aiEnhanced: boolean;
    model: string;
  }> => {
    const form = new FormData();
    form.append("image", imageFile);
    form.append("upscaleFactor", String(settings.upscaleFactor));
    form.append("scale", String(settings.upscaleFactor));
    form.append("creativity", String(creativity));
    form.append("imageType", imageType);

    const apiPath = enhanceMode === "reimagine" ? "/api/reimagine" : "/api/enhance";
    const endpoint = `${API_BASE}${apiPath}`;

    const response = await axios.post(endpoint, form, {
      headers: { 
        "Content-Type": "multipart/form-data",
        ...getAuthHeaders(),
      },
    });

    return {
      imageBase64: response.data.imageBase64,
      width: response.data.width || 0,
      height: response.data.height || 0,
      aiEnhanced: response.data.aiEnhanced || false,
      model: response.data.model || "Unknown",
    };
  };

  // Single image enhancement
  const handleEnhance = async () => {
    if (!file) {
      setError("Please upload an image first.");
      return;
    }

    setIsProcessing(true);
    setError(null);
    resetSteps();
    updateStepStatus("upload", "active");

    try {
      updateStepStatus("upload", "done");
      updateStepStatus("analysis", "active");
      
      setTimeout(() => {
        updateStepStatus("analysis", "done");
        updateStepStatus("tiling", "done");
        updateStepStatus("sending", "active");
      }, 1000);

      const result = await processImage(file);

      setResultBase64(result.imageBase64);
      setResultWidth(result.width);
      setResultHeight(result.height);
      setAiEnhanced(result.aiEnhanced);
      setModelName(result.model);

      updateStepStatus("sending", "done");
      updateStepStatus("merging", "done");
      updateStepStatus("final", settings.finalPass ? "done" : "pending");
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const responseData = err.response?.data as { error?: string } | undefined;
        const message = responseData?.error || err.message || "Failed to enhance image.";
        setError(message);
      } else {
        setError("Failed to enhance image.");
      }
      resetSteps();
    } finally {
      setIsProcessing(false);
    }
  };

  // Add files to queue
  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(f => 
      f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|gif|bmp)$/i.test(f.name)
    );

    const newItems: QueueItem[] = imageFiles.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      file: f,
      status: "pending",
      progress: 0,
    }));

    setQueue(prev => [...prev, ...newItems]);
    setIsBatchMode(true);
    e.target.value = ""; // Reset input
  };

  // Process queue
  const processQueue = useCallback(async () => {
    if (isQueueProcessing) return;
    
    const pendingItems = queue.filter(item => item.status === "pending");
    if (pendingItems.length === 0) return;

    setIsQueueProcessing(true);
    abortControllerRef.current = new AbortController();

    for (let i = 0; i < queue.length; i++) {
      if (abortControllerRef.current?.signal.aborted) break;
      
      const item = queue[i];
      if (item.status !== "pending") continue;

      setCurrentQueueIndex(i);
      
      // Update status to processing
      setQueue(prev => prev.map((q, idx) => 
        idx === i ? { ...q, status: "processing", progress: 10 } : q
      ));

      try {
        // Update progress periodically
        const progressInterval = setInterval(() => {
          setQueue(prev => prev.map((q, idx) => 
            idx === i && q.status === "processing" 
              ? { ...q, progress: Math.min(90, q.progress + 10) } 
              : q
          ));
        }, 2000);

        const result = await processImage(item.file);

        clearInterval(progressInterval);

        // Update with result
        setQueue(prev => prev.map((q, idx) => 
          idx === i ? { 
            ...q, 
            status: "completed", 
            progress: 100,
            resultBase64: result.imageBase64,
            resultWidth: result.width,
            resultHeight: result.height,
          } : q
        ));
      } catch (err: any) {
        setQueue(prev => prev.map((q, idx) => 
          idx === i ? { 
            ...q, 
            status: "failed", 
            progress: 0,
            error: err.message || "Failed to process",
          } : q
        ));
      }
    }

    setIsQueueProcessing(false);
    abortControllerRef.current = null;
  }, [queue, isQueueProcessing, settings, enhanceMode, creativity]);

  // Stop queue processing
  const stopQueue = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsQueueProcessing(false);
  };

  // Remove item from queue
  const removeFromQueue = (id: string) => {
    setQueue(prev => prev.filter(item => item.id !== id));
  };

  // Clear completed items
  const clearCompleted = () => {
    setQueue(prev => prev.filter(item => item.status !== "completed"));
  };

  // Download single result
  const downloadResult = (item: QueueItem) => {
    if (!item.resultBase64) return;
    
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${item.resultBase64}`;
    link.download = `enhanced_${item.file.name.replace(/\.[^/.]+$/, "")}.png`;
    link.click();
  };

  // Download all completed
  const downloadAll = async () => {
    const completed = queue.filter(item => item.status === "completed" && item.resultBase64);
    
    for (const item of completed) {
      downloadResult(item);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between downloads
    }
  };

  // Generate mode handlers
  const handleReferenceImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    
    const maxImages = generateMode === "mix" ? 5 : 1;
    const newImages = Array.from(files).slice(0, maxImages - referenceImages.length);
    setReferenceImages(prev => [...prev, ...newImages].slice(0, maxImages));
    e.target.value = "";
  };

  const removeReferenceImage = (index: number) => {
    setReferenceImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleEnhanceImagePrompt = async () => {
    if (!generatePrompt.trim()) return;
    
    setIsEnhancingPrompt(true);
    try {
      // Determine model based on style
      const model = generateStyle === "photorealistic" ? "flux-schnell" : 
                    generateStyle === "artistic" ? "sdxl" : "gemini-image";
      
      const response = await axios.post(`${API_BASE}/api/prompt/enhance`, {
        prompt: generatePrompt,
        model: model,
        type: "image",
      }, { headers: getAuthHeaders() });

      if (response.data.success && response.data.enhancedPrompt) {
        setGeneratePrompt(response.data.enhancedPrompt);
      }
    } catch (err) {
      console.error("Prompt enhancement failed:", err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  const handleGenerate = async () => {
    if (!generatePrompt.trim()) {
      setError("Please enter a prompt");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const form = new FormData();
      form.append("prompt", generatePrompt);
      form.append("style", generateStyle);
      form.append("autoUpscale", String(autoUpscale));
      form.append("upscaleFactor", String(generateUpscaleFactor));
      form.append("editMode", editMode);
      
      // Add reference images
      for (const img of referenceImages) {
        form.append("referenceImages", img);
      }

      const response = await axios.post(`${API_BASE}/api/generate`, form, {
        headers: { 
          "Content-Type": "multipart/form-data",
          ...getAuthHeaders(),
        },
        timeout: 180000, // 3 minutes
      });

      if (response.data.success) {
        setGeneratedImage({
          base64: response.data.imageBase64,
          width: response.data.width,
          height: response.data.height,
        });
      } else {
        throw new Error(response.data.error || "Generation failed");
      }
    } catch (err: any) {
      const message = err.response?.data?.error || err.message || "Failed to generate image";
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadGeneratedImage = () => {
    if (!generatedImage) return;
    const link = document.createElement("a");
    link.href = `data:image/png;base64,${generatedImage.base64}`;
    link.download = `generated_${Date.now()}.png`;
    link.click();
  };

  // Fullscreen viewer functions
  const openFullscreen = (images: { src: string; title?: string; width?: number; height?: number }[], startIndex = 0) => {
    setFullscreenImages(images);
    setFullscreenIndex(startIndex);
    setFullscreenOpen(true);
  };

  const openGeneratedFullscreen = () => {
    if (generatedImage) {
      openFullscreen([{
        src: `data:image/png;base64,${generatedImage.base64}`,
        title: "Generated Image",
        width: generatedImage.width,
        height: generatedImage.height,
      }]);
    }
  };

  const openResultFullscreen = () => {
    if (resultBase64) {
      openFullscreen([{
        src: `data:image/png;base64,${resultBase64}`,
        title: "Enhanced Image",
        width: resultWidth || undefined,
        height: resultHeight || undefined,
      }]);
    }
  };

  const openBatchFullscreen = (startIndex = 0) => {
    const completedImages = queue
      .filter(item => item.status === "completed" && item.resultBase64)
      .map(item => ({
        src: `data:image/png;base64,${item.resultBase64}`,
        title: item.file.name,
        width: item.resultWidth,
        height: item.resultHeight,
      }));
    
    if (completedImages.length > 0) {
      openFullscreen(completedImages, startIndex);
    }
  };

  const handleFullscreenDownload = (index: number) => {
    const image = fullscreenImages[index];
    if (!image) return;
    
    const link = document.createElement("a");
    link.href = image.src;
    link.download = `${image.title || "image"}_${Date.now()}.png`;
    link.click();
  };

  // Queue statistics
  const queueStats = {
    total: queue.length,
    pending: queue.filter(i => i.status === "pending").length,
    processing: queue.filter(i => i.status === "processing").length,
    completed: queue.filter(i => i.status === "completed").length,
    failed: queue.filter(i => i.status === "failed").length,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4">
        {/* Header */}
        <header className="flex items-center justify-between gap-4">
          {/* Left: Title */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              AI Creative Studio
            </h1>
            <p className="text-xs text-slate-500 hidden sm:block">
              Generate • Upscale • Enhance • Real-ESRGAN • Gemini AI
            </p>
          </div>
          
          {/* Right: User Menu */}
          <div className="relative flex-shrink-0">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 transition border border-slate-700"
                  title="User menu"
                  aria-label="User menu"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm text-slate-300 hidden sm:block max-w-[100px] truncate">
                    {user?.name || user?.email?.split('@')[0]}
                  </span>
                </button>
                
                {showUserMenu && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowUserMenu(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 rounded-lg bg-slate-800 border border-slate-700 shadow-xl z-50 py-1">
                      <div className="px-3 py-2 border-b border-slate-700">
                        <p className="text-sm font-medium text-white truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                        <p className="text-xs text-emerald-400 mt-1">{user?.tokensBalance?.toLocaleString() || 0} tokens</p>
                      </div>
                      
                      <a
                        href="#/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white transition"
                        onClick={() => setShowUserMenu(false)}
                      >
                        <LayoutDashboard className="w-4 h-4" />
                        My Dashboard
                      </a>
                      
                      {isAdmin && (
                        <a
                          href="#/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm text-purple-400 hover:bg-slate-700 hover:text-purple-300 transition"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Shield className="w-4 h-4" />
                          Admin Panel
                        </a>
                      )}
                      
                      <button
                        onClick={() => {
                          logout();
                          setShowUserMenu(false);
                          window.location.hash = '/';
                        }}
                        className="flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-slate-700 hover:text-red-300 transition w-full text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <a
                href="#/login"
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 transition text-white text-sm font-medium"
              >
                <LogIn className="w-4 h-4" />
                <span className="hidden sm:inline">Sign In</span>
              </a>
            )}
          </div>
        </header>
        
        {/* Studio Tabs */}
        <div className="flex flex-col gap-2">
          {/* Tab Groups */}
          <div className="flex flex-col items-stretch sm:items-start gap-2">
            {/* Group Selector - Top Row - Scrollable on mobile */}
            <div className="flex items-center bg-slate-900 rounded-lg p-1 overflow-x-auto scrollbar-hide">
              <button
                onClick={() => handleStudioTabClick("image", "upscale")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  tabGroup === "image" 
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <ImageIcon className="w-4 h-4" /> <span className="hidden xs:inline">Image</span>
              </button>
              <button
                onClick={() => handleStudioTabClick("video", "video")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  tabGroup === "video" 
                    ? "bg-gradient-to-r from-red-500 to-pink-500 text-white" 
                    : isStudioLocked("video")
                      ? "text-slate-500 opacity-60"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <Film className="w-4 h-4" /> <span className="hidden xs:inline">Video</span>
                {isStudioLocked("video") && <Lock className="w-3 h-3 ml-1" />}
              </button>
              <button
                onClick={() => handleStudioTabClick("sound", "music")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  tabGroup === "sound" 
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" 
                    : isStudioLocked("sound")
                      ? "text-slate-500 opacity-60"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <Music className="w-4 h-4" /> <span className="hidden xs:inline">Sound</span>
                {isStudioLocked("sound") && <Lock className="w-3 h-3 ml-1" />}
              </button>
              <button
                onClick={() => handleStudioTabClick("text", "text")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  tabGroup === "text" 
                    ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white" 
                    : isStudioLocked("text")
                      ? "text-slate-500 opacity-60"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <Sparkles className="w-4 h-4" /> <span className="hidden xs:inline">Text</span>
                {isStudioLocked("text") && <Lock className="w-3 h-3 ml-1" />}
              </button>
              <button
                onClick={() => handleStudioTabClick("3d", "3d")}
                className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition flex items-center gap-1.5 sm:gap-2 whitespace-nowrap flex-shrink-0 ${
                  tabGroup === "3d" 
                    ? "bg-gradient-to-r from-cyan-500 to-blue-500 text-white" 
                    : isStudioLocked("3d")
                      ? "text-slate-500 opacity-60"
                      : "text-slate-400 hover:text-white"
                }`}
              >
                <Layers className="w-4 h-4" /> <span className="hidden xs:inline">3D</span>
                {isStudioLocked("3d") && <Lock className="w-3 h-3 ml-1" />}
              </button>
            </div>
            
            {/* Sub-tabs - Bottom Row */}
            {tabGroup === "image" && (
              <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1 overflow-x-auto scrollbar-hide">
                <button
                  onClick={() => setAppMode("generate")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    appMode === "generate" ? "bg-purple-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Wand2 className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Generate</span>
                </button>
                <button
                  onClick={() => setAppMode("upscale")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    appMode === "upscale" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Search className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Upscale</span>
                </button>
                <button
                  onClick={() => setAppMode("batch")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    appMode === "batch" ? "bg-emerald-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Batch</span>
                </button>
                <button
                  onClick={() => setAppMode("gallery")}
                  className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1 sm:gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    appMode === "gallery" ? "bg-cyan-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Gallery
                </button>
                <button
                  onClick={() => setAppMode("edit")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                    appMode === "edit" ? "bg-orange-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}
            
            {tabGroup === "sound" && (
              <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-1">
                <button
                  onClick={() => setAppMode("music")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition flex items-center gap-1.5 ${
                    appMode === "music" ? "bg-purple-500 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  <Music className="w-3.5 h-3.5" /> Music Studio
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        {appMode === "generate" ? (
          /* Generate Mode */
          <main className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {/* Left - Generation Settings */}
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-400" /> AI Image Generation
                </h2>
                
                {/* Normal / Mix Mode Toggle */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => { setGenerateMode("normal"); setReferenceImages(prev => prev.slice(0, 1)); }}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      generateMode === "normal"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <Camera className="w-4 h-4" /> Normal
                    </div>
                    <div className="text-[10px] text-slate-400">Prompt only or 1 reference</div>
                  </button>
                  <button
                    onClick={() => setGenerateMode("mix")}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      generateMode === "mix"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <Blend className="w-4 h-4" /> Mix Mode
                    </div>
                    <div className="text-[10px] text-slate-400">Combine up to 5 images</div>
                  </button>
                </div>

                {/* Prompt Input */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300">Prompt</label>
                    <button
                      onClick={handleEnhanceImagePrompt}
                      disabled={isEnhancingPrompt || !generatePrompt.trim()}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-medium rounded-md bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                      title="Enhance prompt with AI"
                    >
                      {isEnhancingPrompt ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Sparkles className="w-3 h-3" />
                      )}
                      {isEnhancingPrompt ? "Enhancing..." : "AI Enhance"}
                    </button>
                  </div>
                  <textarea
                    value={generatePrompt}
                    onChange={(e) => setGeneratePrompt(e.target.value)}
                    placeholder="Describe the image you want to generate..."
                    className="w-full h-24 px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-100 placeholder-slate-500 focus:border-purple-500 focus:outline-none resize-none"
                  />
                  <p className="text-[10px] text-slate-500">Tip: Click "AI Enhance" to optimize your prompt for better results</p>
                </div>

                {/* Style Selection */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-300">Style</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { value: "photorealistic", label: "Photo", icon: Camera },
                      { value: "artistic", label: "Artistic", icon: Palette },
                      { value: "anime", label: "Anime", icon: Film },
                      { value: "digital-art", label: "Digital", icon: Sparkles },
                    ].map(({ value, label, icon: Icon }) => (
                      <button
                        key={value}
                        onClick={() => setGenerateStyle(value as any)}
                        className={`p-2 rounded-lg border text-center transition ${
                          generateStyle === value
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Icon className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-[10px]">{label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reference Images */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-slate-300">
                      Reference Images {generateMode === "mix" ? "(up to 5)" : "(optional)"}
                    </label>
                    <span className="text-[10px] text-slate-500">{referenceImages.length}/{generateMode === "mix" ? 5 : 1}</span>
                  </div>
                  
                  <input
                    ref={refImageInputRef}
                    type="file"
                    accept="image/*"
                    multiple={generateMode === "mix"}
                    onChange={handleReferenceImageSelect}
                    className="hidden"
                    aria-label="Select reference images"
                  />
                  
                  <div className="flex flex-wrap gap-2">
                    {referenceImages.map((img, idx) => (
                      <div key={idx} className="relative w-16 h-16 rounded-lg overflow-hidden border border-slate-700">
                        <img src={URL.createObjectURL(img)} alt={`Reference ${idx + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => removeReferenceImage(idx)}
                          className="absolute top-0.5 right-0.5 p-0.5 rounded bg-red-500/80 text-white"
                          title="Remove image"
                          aria-label={`Remove reference image ${idx + 1}`}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {referenceImages.length < (generateMode === "mix" ? 5 : 1) && (
                      <button
                        onClick={() => refImageInputRef.current?.click()}
                        className="w-16 h-16 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 hover:border-purple-500 hover:text-purple-400 transition"
                        title="Add reference image"
                        aria-label="Add reference image"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Edit Mode Selector (only when reference image is provided) */}
                {referenceImages.length > 0 && (
                  <div className="space-y-2">
                    <label className="text-xs text-slate-300">Edit Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setEditMode("instruct")}
                        className={`p-2 rounded-lg border text-center transition ${
                          editMode === "instruct"
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Edit3 className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-[10px] font-medium">Edit</div>
                        <div className="text-[8px] text-slate-500">Pix2Pix</div>
                      </button>
                      <button
                        onClick={() => setEditMode("creative")}
                        className={`p-2 rounded-lg border text-center transition ${
                          editMode === "creative"
                            ? "border-purple-500 bg-purple-500/10 text-purple-400"
                            : "border-slate-700 text-slate-400 hover:border-slate-600"
                        }`}
                      >
                        <Wand2 className="w-4 h-4 mx-auto mb-1" />
                        <div className="text-[10px] font-medium">Creative</div>
                        <div className="text-[8px] text-slate-500">SDXL</div>
                      </button>
                    </div>
                    <p className="text-[9px] text-slate-500">
                      {editMode === "instruct" 
                        ? "InstructPix2Pix: Edit with instructions - expression, style, effects"
                        : "SDXL img2img: Major changes - location, pose, clothing"}
                    </p>
                  </div>
                )}

                {/* Auto Upscale Toggle */}
                <div className="space-y-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {autoUpscale ? <Zap className="w-4 h-4 text-yellow-400" /> : <ZapOff className="w-4 h-4 text-slate-500" />}
                      <span className="text-sm text-slate-200" id="auto-upscale-label">Auto Upscale</span>
                    </div>
                    <button
                      onClick={() => setAutoUpscale(!autoUpscale)}
                      className={`w-10 h-5 rounded-full transition ${autoUpscale ? "bg-emerald-500" : "bg-slate-600"}`}
                      role="switch"
                      aria-checked={autoUpscale ? "true" : "false"}
                      aria-labelledby="auto-upscale-label"
                      title={autoUpscale ? "Disable auto upscale" : "Enable auto upscale"}
                    >
                      <div className={`w-4 h-4 rounded-full bg-white transition transform ${autoUpscale ? "translate-x-5" : "translate-x-0.5"}`} />
                    </button>
                  </div>
                  
                  {autoUpscale && (
                    <div className="flex items-center gap-3">
                      <label htmlFor="upscale-factor-select" className="text-xs text-slate-400">Scale:</label>
                      <select
                        id="upscale-factor-select"
                        value={generateUpscaleFactor}
                        onChange={(e) => setGenerateUpscaleFactor(Number(e.target.value))}
                        className="flex-1 px-2 py-1 rounded bg-slate-700 border border-slate-600 text-xs text-slate-200"
                        aria-label="Upscale factor"
                      >
                        <option value={2}>2x</option>
                        <option value={4}>4x</option>
                        <option value={8}>8x</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating || !generatePrompt.trim()}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Generating...</>
                  ) : (
                    <><Wand2 className="w-4 h-4" /> Generate Image</>
                  )}
                </button>

                {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
              </div>
            </div>

            {/* Right - Generated Result */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-100">Generated Image</h2>
                {generatedImage && (
                  <button
                    onClick={downloadGeneratedImage}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs hover:bg-emerald-500/30"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                )}
              </div>
              
              {isGenerating ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                  <Loader2 className="w-12 h-12 animate-spin text-purple-400 mb-4" />
                  <p className="text-sm">Generating your image...</p>
                  <p className="text-xs text-slate-600 mt-1">This may take up to 2 minutes</p>
                </div>
              ) : generatedImage ? (
                <div className="space-y-3">
                  <button
                    onClick={openGeneratedFullscreen}
                    className="relative rounded-lg overflow-hidden bg-slate-800 w-full group cursor-pointer"
                    title="Click to view fullscreen"
                  >
                    <img
                      src={`data:image/png;base64,${generatedImage.base64}`}
                      alt="Generated"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <Maximize2 className="w-8 h-8 text-white" />
                    </div>
                  </button>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>{generatedImage.width} × {generatedImage.height}px</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          try {
                            const blob = await fetch(`data:image/png;base64,${generatedImage.base64}`).then(r => r.blob());
                            const formData = new FormData();
                            formData.append("image", blob, `generated-${Date.now()}.png`);
                            formData.append("folderId", "root");
                            const token = localStorage.getItem('token');
                            const res = await fetch(`${API_BASE}/api/gallery/images`, {
                              method: "POST",
                              headers: token ? { Authorization: `Bearer ${token}` } : {},
                              body: formData,
                            });
                            if (res.ok) {
                              alert("Image saved to gallery!");
                            } else {
                              alert("Failed to save to gallery");
                            }
                          } catch (e) {
                            alert("Error saving to gallery");
                          }
                        }}
                        className="flex items-center gap-1 px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition"
                      >
                        <FolderOpen className="w-3 h-3" /> Save to Gallery
                      </button>
                      <span className="flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" /> Generated
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 text-slate-500">
                  <ImageIcon className="w-16 h-16 mb-3 text-slate-700" />
                  <p className="text-sm">No image generated yet</p>
                  <p className="text-xs text-slate-600">Enter a prompt and click Generate</p>
                </div>
              )}
            </div>
          </main>
        ) : appMode === "upscale" ? (
          /* Single Image Mode */
          <main className="grid gap-4 lg:grid-cols-[1fr_1fr]">
            {/* Left Column - Upload & Settings */}
            <div className="space-y-4">
              <ImageUploader file={file} previewUrl={previewUrl} onFileChange={handleFileChange} />
              
              {/* Enhancement Mode Selection */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-100">Enhancement Mode</h2>
                <p className="text-xs text-slate-500">
                  <i className="fa-solid fa-wand-magic-sparkles text-emerald-400 mr-1" />
                  Choose how AI processes your image: preserve original details or creatively regenerate them.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setEnhanceMode("enhance")}
                    disabled={isProcessing}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      enhanceMode === "enhance"
                        ? "border-emerald-500 bg-emerald-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <Search className="w-4 h-4" /> Enhance
                    </div>
                    <div className="text-[10px] text-slate-400">Preserve details, upscale</div>
                  </button>
                  <button
                    onClick={() => setEnhanceMode("reimagine")}
                    disabled={isProcessing}
                    className={`p-3 rounded-lg border-2 text-left transition ${
                      enhanceMode === "reimagine"
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-slate-700 hover:border-slate-600"
                    }`}
                  >
                    <div className="text-sm font-semibold flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4" /> Reimagine
                    </div>
                    <div className="text-[10px] text-slate-400">AI regenerates details</div>
                  </button>
                </div>

                {enhanceMode === "reimagine" && (
                  <div className="space-y-1 p-2 rounded bg-purple-500/5 border border-purple-500/20">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Creativity</span>
                      <span className="text-purple-400">{Math.round(creativity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={10}
                      max={90}
                      value={creativity * 100}
                      onChange={(e) => setCreativity(Number(e.target.value) / 100)}
                      className="w-full accent-purple-500"
                      aria-label="Creativity level"
                    />
                  </div>
                )}

                {/* Image Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400">Image Type</label>
                  <p className="text-xs text-slate-500">
                    <i className="fa-solid fa-image text-cyan-400 mr-1" />
                    Select the type of content for optimized AI processing and better results.
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setImageType("portrait")}
                      disabled={isProcessing}
                      className={`p-2 rounded-lg border text-center transition text-xs ${
                        imageType === "portrait"
                          ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-medium">Portrait</div>
                      <div className="text-[9px] opacity-70">Faces & People</div>
                    </button>
                    <button
                      onClick={() => setImageType("object")}
                      disabled={isProcessing}
                      className={`p-2 rounded-lg border text-center transition text-xs ${
                        imageType === "object"
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-medium">Object</div>
                      <div className="text-[9px] opacity-70">Products & Items</div>
                    </button>
                    <button
                      onClick={() => setImageType("nature")}
                      disabled={isProcessing}
                      className={`p-2 rounded-lg border text-center transition text-xs ${
                        imageType === "nature"
                          ? "border-green-500 bg-green-500/10 text-green-400"
                          : "border-slate-700 text-slate-400 hover:border-slate-600"
                      }`}
                    >
                      <div className="font-medium">Nature</div>
                      <div className="text-[9px] opacity-70">Landscape & Wildlife</div>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500">
                    {imageType === "portrait" && "Optimized for faces with CodeFormer restoration"}
                    {imageType === "object" && "Standard upscaling with detail preservation"}
                    {imageType === "nature" && "Preserves brightness & vibrance for landscapes"}
                  </p>
                </div>

                {/* Action Button */}
                <button
                  onClick={handleEnhance}
                  disabled={isProcessing || !file}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2 ${
                    enhanceMode === "reimagine"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                      : "bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950"
                  }`}
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing...</>
                  ) : enhanceMode === "reimagine" ? (
                    <><Sparkles className="w-4 h-4" /> Reimagine</>
                  ) : (
                    <><Rocket className="w-4 h-4" /> Enhance Image</>
                  )}
                </button>

                {error && <p className="text-xs text-rose-400 text-center">{error}</p>}
                {isProcessing && <ProgressBar steps={steps} />}
              </div>

              {/* Settings */}
              <SettingsForm
                settings={settings}
                onChange={setSettings}
                disabled={isProcessing}
                onAutoOptimize={() => originalWidth && originalHeight && autoOptimizeSettings(originalWidth, originalHeight)}
                imageLoaded={Boolean(originalWidth && originalHeight)}
              />
            </div>

            {/* Right Column - Result */}
            <div>
              <ResultViewer
                originalUrl={previewUrl}
                originalWidth={originalWidth}
                originalHeight={originalHeight}
                resultBase64={resultBase64}
                resultWidth={resultWidth}
                resultHeight={resultHeight}
                aiEnhanced={aiEnhanced}
                modelName={modelName || undefined}
                onFullscreen={resultBase64 ? openResultFullscreen : undefined}
              />
            </div>
          </main>
        ) : appMode === "batch" ? (
          /* Batch Mode */
          <main className="grid gap-4 lg:grid-cols-[350px_1fr]">
            {/* Left - Settings & Controls */}
            <div className="space-y-4">
              {/* Add Files */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 space-y-3">
                <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-emerald-400" /> Batch Processing
                </h2>
                <p className="text-xs text-slate-400">Select multiple images or a folder to process</p>
                
                <input
                  ref={folderInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFolderSelect}
                  className="hidden"
                  aria-label="Select images for batch processing"
                />
                
                <div className="flex gap-2">
                  <button
                    onClick={() => folderInputRef.current?.click()}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Images
                  </button>
                  <button
                    onClick={() => {
                      const input = folderInputRef.current;
                      if (input) {
                        input.setAttribute("webkitdirectory", "");
                        input.click();
                        input.removeAttribute("webkitdirectory");
                      }
                    }}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 transition flex items-center justify-center gap-1.5"
                  >
                    <FolderOpen className="w-4 h-4" /> Add Folder
                  </button>
                </div>

                {/* Queue Stats */}
                {queue.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 text-center text-xs">
                    <div className="p-2 rounded bg-slate-800">
                      <div className="text-lg font-bold text-slate-300">{queueStats.total}</div>
                      <div className="text-slate-500">Total</div>
                    </div>
                    <div className="p-2 rounded bg-yellow-500/10">
                      <div className="text-lg font-bold text-yellow-400">{queueStats.pending}</div>
                      <div className="text-slate-500">Pending</div>
                    </div>
                    <div className="p-2 rounded bg-emerald-500/10">
                      <div className="text-lg font-bold text-emerald-400">{queueStats.completed}</div>
                      <div className="text-slate-500">Done</div>
                    </div>
                    <div className="p-2 rounded bg-red-500/10">
                      <div className="text-lg font-bold text-red-400">{queueStats.failed}</div>
                      <div className="text-slate-500">Failed</div>
                    </div>
                  </div>
                )}

                {/* Process Controls */}
                {queue.length > 0 && (
                  <div className="flex gap-2">
                    {!isQueueProcessing ? (
                      <button
                        onClick={processQueue}
                        disabled={queueStats.pending === 0}
                        className="flex-1 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Play className="w-4 h-4" /> Start Processing
                      </button>
                    ) : (
                      <button
                        onClick={stopQueue}
                        className="flex-1 py-2 rounded-lg bg-red-500 text-white font-semibold text-sm flex items-center justify-center gap-1.5"
                      >
                        <Square className="w-4 h-4" /> Stop
                      </button>
                    )}
                    {queueStats.completed > 0 && (
                      <button
                        onClick={downloadAll}
                        className="py-2 px-4 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600 flex items-center gap-1.5"
                      >
                        <Download className="w-4 h-4" /> Download All
                      </button>
                    )}
                  </div>
                )}

                {queueStats.completed > 0 && (
                  <button
                    onClick={clearCompleted}
                    className="w-full py-2 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 flex items-center justify-center gap-1.5"
                  >
                    <Trash2 className="w-3 h-3" /> Clear Completed
                  </button>
                )}
              </div>

              {/* Settings */}
              <SettingsForm
                settings={settings}
                onChange={setSettings}
                disabled={isQueueProcessing}
                imageLoaded={false}
              />
            </div>

            {/* Right - Queue List */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-slate-100">Processing Queue</h2>
                {queueStats.completed > 0 && (
                  <button
                    onClick={() => openBatchFullscreen(0)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition"
                    title="View all completed in fullscreen"
                  >
                    <Maximize2 className="w-3.5 h-3.5" /> View All
                  </button>
                )}
              </div>
              
              {queue.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-500">
                  <FolderOpen className="w-12 h-12 mb-3 text-slate-600" />
                  <p className="text-sm">No images in queue</p>
                  <p className="text-xs">Add images or select a folder to start</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {queue.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border ${
                        item.status === "processing"
                          ? "border-yellow-500/50 bg-yellow-500/5"
                          : item.status === "completed"
                          ? "border-emerald-500/50 bg-emerald-500/5"
                          : item.status === "failed"
                          ? "border-red-500/50 bg-red-500/5"
                          : "border-slate-700 bg-slate-800/50"
                      }`}
                    >
                      {/* Thumbnail */}
                      {item.status === "completed" && item.resultBase64 ? (
                        <button
                          onClick={() => {
                            const completedIdx = queue
                              .filter(q => q.status === "completed" && q.resultBase64)
                              .findIndex(q => q.id === item.id);
                            openBatchFullscreen(completedIdx >= 0 ? completedIdx : 0);
                          }}
                          className="w-12 h-12 rounded bg-slate-700 overflow-hidden flex-shrink-0 group relative"
                          title="Click to view fullscreen"
                        >
                          <img
                            src={`data:image/png;base64,${item.resultBase64}`}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <Maximize2 className="w-4 h-4 text-white" />
                          </div>
                        </button>
                      ) : (
                        <div className="w-12 h-12 rounded bg-slate-700 overflow-hidden flex-shrink-0">
                          <img
                            src={URL.createObjectURL(item.file)}
                            alt={item.file.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{item.file.name}</p>
                        <p className="text-[10px] text-slate-500">
                          {(item.file.size / 1024).toFixed(0)} KB
                          {item.resultWidth && ` → ${item.resultWidth}×${item.resultHeight}`}
                        </p>
                        {item.status === "processing" && (
                          <div className="mt-1 h-1 bg-slate-700 rounded-full overflow-hidden">
                            {/* eslint-disable-next-line react/forbid-dom-props -- dynamic progress width */}
                            <div
                              className="h-full bg-yellow-500 transition-all duration-300"
                              style={{ width: `${item.progress}%` }}
                            />
                          </div>
                        )}
                        {item.error && <p className="text-[10px] text-red-400 mt-0.5">{item.error}</p>}
                      </div>

                      {/* Status & Actions */}
                      <div className="flex items-center gap-2">
                        {item.status === "completed" && (
                          <button
                            onClick={() => downloadResult(item)}
                            className="p-1.5 rounded bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        {item.status !== "processing" && (
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="p-1.5 rounded bg-slate-700 text-slate-400 hover:bg-red-500/20 hover:text-red-400"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {item.status === "processing" && (
                          <span className="flex items-center gap-1 text-xs text-yellow-400">
                            <Loader2 className="w-3 h-3 animate-spin" /> Processing
                          </span>
                        )}
                        {item.status === "completed" && (
                          <Check className="w-4 h-4 text-emerald-400" />
                        )}
                        {item.status === "failed" && (
                          <AlertCircle className="w-4 h-4 text-red-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </main>
        ) : appMode === "gallery" ? (
          /* Gallery Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <Gallery />
          </div>
        ) : appMode === "edit" ? (
          /* Edit Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <StudioErrorBoundary>
              <Suspense fallback={<StudioLoader />}>
                <ImageEditor
                galleryImages={editorGalleryImages}
                onClose={() => setAppMode("upscale")}
                onSaveToGallery={async (base64, name) => {
                  try {
                    await axios.post(`${API_BASE}/api/gallery/images/save`, {
                      imageBase64: base64,
                      name: name,
                      source: "edit",
                    }, { headers: getAuthHeaders() });
                    alert("Saved to gallery!");
                  } catch (err) {
                    console.error("Failed to save to gallery:", err);
                  }
                }}
                />
              </Suspense>
            </StudioErrorBoundary>
          </div>
        ) : appMode === "video" ? (
          /* Video Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <StudioErrorBoundary>
              <Suspense fallback={<StudioLoader />}>
                <VideoStudio />
              </Suspense>
            </StudioErrorBoundary>
          </div>
        ) : appMode === "text" ? (
          /* Text Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <StudioErrorBoundary>
              <Suspense fallback={<StudioLoader />}>
                <TextStudio />
              </Suspense>
            </StudioErrorBoundary>
          </div>
        ) : appMode === "3d" ? (
          /* 3D Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <StudioErrorBoundary>
              <Suspense fallback={<StudioLoader />}>
                <ThreeDStudio />
              </Suspense>
            </StudioErrorBoundary>
          </div>
        ) : appMode === "music" ? (
          /* Music Mode */
          <div className="flex-1 -mx-4 -mb-4">
            <StudioErrorBoundary>
              <Suspense fallback={<StudioLoader />}>
                <MusicStudio />
              </Suspense>
            </StudioErrorBoundary>
          </div>
        ) : null}
      </div>

      {/* Fullscreen Viewer */}
      <FullscreenViewer
        images={fullscreenImages}
        currentIndex={fullscreenIndex}
        isOpen={fullscreenOpen}
        onClose={() => setFullscreenOpen(false)}
        onNavigate={setFullscreenIndex}
        onDownload={handleFullscreenDownload}
      />
      
      {/* Upgrade Modal for locked studios - forced, cannot be closed without upgrading */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => {
          setShowUpgradeModal(false);
          setUpgradeModalStudio(null);
        }}
        targetStudio={upgradeModalStudio || undefined}
        forceRequired={true}
      />
    </div>
  );
}

export default App;
