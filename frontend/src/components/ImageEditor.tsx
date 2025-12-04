import React, { useRef, useState, useEffect, useCallback } from "react";
import axios from "axios";
import {
  Brush,
  Eraser,
  Trash2,
  Wand2,
  Expand,
  Download,
  Upload,
  ImageIcon,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  Maximize,
  X,
  Sparkles,
  Type,
  Square,
  Circle,
  Aperture,
  Sun,
  Sunset,
  Moon,
  Cloud,
  Clapperboard,
  Leaf,
  Lightbulb,
  Palette,
  Gem,
  Film,
  Paintbrush,
  Layers,
  RefreshCw,
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

interface GalleryImage {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  width: number;
  height: number;
}

interface ImageEditorProps {
  galleryImages?: GalleryImage[];
  onSaveToGallery?: (imageBase64: string, name: string) => void;
  onClose?: () => void;
}

type EditMode = "brush" | "eraser" | "inpaint" | "remove" | "expand" | "smartSelect" | "text" | "rectSelect" | "ellipseSelect" | "styles";
type ExpandDirection = "left" | "right" | "top" | "bottom" | "all";

export default function ImageEditor({
  galleryImages = [],
  onSaveToGallery,
  onClose,
}: ImageEditorProps) {
  // Canvas refs
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  // Image state
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [imageName, setImageName] = useState<string>("edited_image");

  // Editor state
  const [editMode, setEditMode] = useState<EditMode>("brush");
  const [brushSize, setBrushSize] = useState(30);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPos, setLastPos] = useState<{ x: number; y: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });

  // Unified history for undo/redo (stores both image and mask together)
  const [history, setHistory] = useState<{ image: string; mask: string }[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  // Refs to track current history state (avoids stale closures)
  const historyRef = useRef(history);
  const historyIndexRef = useRef(historyIndex);
  
  // Keep refs in sync
  useEffect(() => {
    historyRef.current = history;
    historyIndexRef.current = historyIndex;
  }, [history, historyIndex]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingMessage, setProcessingMessage] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Expand options
  const [expandDirection, setExpandDirection] = useState<ExpandDirection>("all");
  
  // Face detection state
  const [hasFace, setHasFace] = useState(false);
  const [isDetectingFace, setIsDetectingFace] = useState(false);
  
  // Text tool state
  const [textContent, setTextContent] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textStyle, setTextStyle] = useState("bold white");
  const [customPrompt, setCustomPrompt] = useState("");
  
  // Shape selection state
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);
  const [shapeEnd, setShapeEnd] = useState<{ x: number; y: number } | null>(null);
  const [isDrawingShape, setIsDrawingShape] = useState(false);
  const [expandAmount, setExpandAmount] = useState(256);
  
  // Lighting intensity (0-100)
  const [lightingIntensity, setLightingIntensity] = useState(50);
  
  // Style transfer intensity (0-100)
  const [styleIntensity, setStyleIntensity] = useState(70);
  
  // Prompt enhancement state
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false);
  
  // Style sections - accordion mode (only one open at a time)
  const [openStyleSection, setOpenStyleSection] = useState<string>('anime');
  
  // Favorite styles (max 20)
  const [favoriteStyles, setFavoriteStyles] = useState<string[]>(() => {
    const saved = localStorage.getItem('favoriteStyles');
    return saved ? JSON.parse(saved) : [];
  });
  
  const toggleStyleSection = (section: string) => {
    setOpenStyleSection(prev => prev === section ? '' : section);
  };
  
  const toggleFavoriteStyle = (style: string) => {
    setFavoriteStyles(prev => {
      let newFavs: string[];
      if (prev.includes(style)) {
        newFavs = prev.filter(s => s !== style);
      } else if (prev.length < 20) {
        newFavs = [...prev, style];
      } else {
        return prev; // Max 20 reached
      }
      localStorage.setItem('favoriteStyles', JSON.stringify(newFavs));
      return newFavs;
    });
  };
  
  const isFavorite = (style: string) => favoriteStyles.includes(style);

  // Prompt input
  const [prompt, setPrompt] = useState("");

  // Gallery picker
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);

  // Initialize canvas when image loads
  useEffect(() => {
    if (!image || !canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext("2d");
    const maskCtx = maskCanvas.getContext("2d");

    if (!ctx || !maskCtx) return;

    // Set canvas size
    canvas.width = image.width;
    canvas.height = image.height;
    maskCanvas.width = image.width;
    maskCanvas.height = image.height;

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Clear mask
    maskCtx.fillStyle = "black";
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Auto-fit image to container
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width - 32; // Account for padding
      const containerHeight = containerRect.height - 32;
      
      const scaleX = containerWidth / image.width;
      const scaleY = containerHeight / image.height;
      const fitScale = Math.min(scaleX, scaleY, 1); // Don't zoom in beyond 100%
      
      setZoom(fitScale);
    }

    // Save to history
    // Save initial state to history
    saveToHistory();
    
    // Auto-detect face for skin enhancement button
    setHasFace(false);
    detectFaceInImage();
  }, [image]);

  // Save current state to unified history (both image and mask)
  const saveToHistory = useCallback(() => {
    if (!canvasRef.current || !maskCanvasRef.current) return;
    const imageDataUrl = canvasRef.current.toDataURL("image/png");
    const maskDataUrl = maskCanvasRef.current.toDataURL("image/png");
    const currentIndex = historyIndexRef.current;
    
    setHistory((prev) => {
      const newHistory = [...prev.slice(0, currentIndex + 1), { image: imageDataUrl, mask: maskDataUrl }];
      console.log("[HISTORY] Saved state, new length:", newHistory.length, "at index:", currentIndex + 1);
      return newHistory;
    });
    setHistoryIndex((prev) => prev + 1);
  }, []);

  // Undo - restores both image and mask
  const handleUndo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;
    
    console.log("[UNDO] historyIndex:", currentIndex, "history.length:", currentHistory.length);
    
    if (currentIndex < 1 || !canvasRef.current || !maskCanvasRef.current) {
      console.log("[UNDO] Cannot undo - at beginning of history");
      return;
    }
    
    const prevState = currentHistory[currentIndex - 1];
    if (!prevState) {
      console.log("[UNDO] No previous state found");
      return;
    }
    
    const ctx = canvasRef.current.getContext("2d");
    const maskCtx = maskCanvasRef.current.getContext("2d");
    if (!ctx || !maskCtx) return;

    console.log("[UNDO] Restoring to index:", currentIndex - 1);
    
    // Restore image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);
      
      // Restore mask
      const maskImg = new Image();
      maskImg.onload = () => {
        maskCtx.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
        maskCtx.drawImage(maskImg, 0, 0);
        setHistoryIndex(currentIndex - 1);
      };
      maskImg.src = prevState.mask;
    };
    img.src = prevState.image;
  }, []);

  // Redo - restores both image and mask
  const handleRedo = useCallback(() => {
    const currentIndex = historyIndexRef.current;
    const currentHistory = historyRef.current;
    
    console.log("[REDO] historyIndex:", currentIndex, "history.length:", currentHistory.length);
    
    if (currentIndex >= currentHistory.length - 1 || !canvasRef.current || !maskCanvasRef.current) {
      console.log("[REDO] Cannot redo - at end of history");
      return;
    }
    
    const nextState = currentHistory[currentIndex + 1];
    const ctx = canvasRef.current.getContext("2d");
    const maskCtx = maskCanvasRef.current.getContext("2d");
    if (!ctx || !maskCtx) return;

    console.log("[REDO] Restoring to index:", currentIndex + 1);
    
    // Restore image
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
      ctx.drawImage(img, 0, 0);
      
      // Restore mask
      const maskImg = new Image();
      maskImg.onload = () => {
        maskCtx.clearRect(0, 0, maskCanvasRef.current!.width, maskCanvasRef.current!.height);
        maskCtx.drawImage(maskImg, 0, 0);
        setHistoryIndex(currentIndex + 1);
      };
      maskImg.src = nextState.mask;
    };
    img.src = nextState.image;
  }, []);

  // Clear mask (and save to history)
  const clearMask = useCallback(() => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    saveToHistory();
  }, [saveToHistory]);

  // Handle file upload
  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageName(file.name.replace(/\.[^/.]+$/, ""));
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setImage(img);
        setImageBase64(event.target?.result as string);
        setHistory([]);
        setHistoryIndex(-1);
        clearMask();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [clearMask]);

  // Load from gallery
  const loadFromGallery = useCallback(async (galleryImage: GalleryImage) => {
    try {
      const response = await axios.get(`${API_BASE}${galleryImage.url}`, {
        responseType: "blob",
      });
      
      // Convert blob to base64
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setImageBase64(dataUrl);
          setImageName(galleryImage.originalName.replace(/\.[^/.]+$/, ""));
          setHistory([]);
          setHistoryIndex(-1);
          clearMask();
          setShowGalleryPicker(false);
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(response.data);
    } catch (err: any) {
      setError("Failed to load image from gallery");
    }
  }, [clearMask]);

  // Get canvas coordinates
  const getCanvasCoords = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current) return { x: 0, y: 0 };
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / rect.width;
      const scaleY = canvasRef.current.height / rect.height;
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  // Drawing handlers - smooth brush strokes
  const startDrawing = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      
      // Shape selection modes
      if (editMode === "rectSelect" || editMode === "ellipseSelect") {
        setShapeStart({ x, y });
        setShapeEnd({ x, y });
        setIsDrawingShape(true);
        return;
      }
      
      if (!maskCanvasRef.current || (editMode !== "brush" && editMode !== "eraser" && editMode !== "text")) return;
      
      const ctx = maskCanvasRef.current.getContext("2d");
      if (!ctx) return;
      
      // Set up brush style
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = editMode === "eraser" ? "black" : "white";
      ctx.fillStyle = editMode === "eraser" ? "black" : "white";
      
      // Draw initial dot
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
      
      setLastPos({ x, y });
      setIsDrawing(true);
    },
    [editMode, getCanvasCoords, brushSize]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasCoords(e);
      
      // Shape selection - update preview
      if (isDrawingShape && (editMode === "rectSelect" || editMode === "ellipseSelect")) {
        setShapeEnd({ x, y });
        return;
      }
      
      if (!isDrawing || !maskCanvasRef.current || !lastPos) return;
      
      const ctx = maskCanvasRef.current.getContext("2d");
      if (!ctx) return;
      
      // Draw smooth line from last position to current
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.lineWidth = brushSize;
      ctx.strokeStyle = editMode === "eraser" ? "black" : "white";
      
      ctx.beginPath();
      ctx.moveTo(lastPos.x, lastPos.y);
      ctx.lineTo(x, y);
      ctx.stroke();
      
      setLastPos({ x, y });
    },
    [isDrawing, isDrawingShape, lastPos, getCanvasCoords, brushSize, editMode]
  );

  const stopDrawing = useCallback(() => {
    // Handle shape selection completion
    if (isDrawingShape && shapeStart && shapeEnd && maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "white";
        
        const x = Math.min(shapeStart.x, shapeEnd.x);
        const y = Math.min(shapeStart.y, shapeEnd.y);
        const width = Math.abs(shapeEnd.x - shapeStart.x);
        const height = Math.abs(shapeEnd.y - shapeStart.y);
        
        if (editMode === "rectSelect") {
          ctx.fillRect(x, y, width, height);
        } else if (editMode === "ellipseSelect") {
          ctx.beginPath();
          ctx.ellipse(
            x + width / 2,
            y + height / 2,
            width / 2,
            height / 2,
            0, 0, Math.PI * 2
          );
          ctx.fill();
        }
        
        saveToHistory();
      }
      
      setIsDrawingShape(false);
      setShapeStart(null);
      setShapeEnd(null);
      return;
    }
    
    if (isDrawing) {
      setIsDrawing(false);
      setLastPos(null);
      // Save state after drawing stroke (unified history)
      saveToHistory();
    }
  }, [isDrawing, isDrawingShape, shapeStart, shapeEnd, editMode, saveToHistory]);

  // Get mask as base64
  const getMaskBase64 = useCallback((): string | null => {
    if (!maskCanvasRef.current) return null;
    return maskCanvasRef.current.toDataURL("image/png");
  }, []);

  // Get image as base64
  const getImageBase64 = useCallback((): string | null => {
    if (!canvasRef.current) return null;
    return canvasRef.current.toDataURL("image/png");
  }, []);

  // Enhance inpainting prompt with AI
  const handleEnhanceInpaintPrompt = async () => {
    if (!prompt.trim()) return;
    
    setIsEnhancingPrompt(true);
    try {
      const response = await axios.post(`${API_BASE}/api/prompt/enhance`, {
        prompt: prompt,
        model: "flux-fill", // Inpainting model
        type: "image",
      });

      if (response.data.success && response.data.enhancedPrompt) {
        setPrompt(response.data.enhancedPrompt);
      }
    } catch (err) {
      console.error("Prompt enhancement failed:", err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };
  
  // Enhance custom prompt (for shape selections)
  const handleEnhanceCustomPrompt = async () => {
    if (!customPrompt.trim()) return;
    
    setIsEnhancingPrompt(true);
    try {
      const response = await axios.post(`${API_BASE}/api/prompt/enhance`, {
        prompt: customPrompt,
        model: "flux-fill",
        type: "image",
      });

      if (response.data.success && response.data.enhancedPrompt) {
        setCustomPrompt(response.data.enhancedPrompt);
      }
    } catch (err) {
      console.error("Prompt enhancement failed:", err);
    } finally {
      setIsEnhancingPrompt(false);
    }
  };

  // Process inpaint
  const handleInpaint = async () => {
    if (!prompt.trim()) {
      setError("Please enter a prompt for inpainting");
      return;
    }

    const imageData = getImageBase64();
    const maskData = getMaskBase64();
    if (!imageData || !maskData) return;

    // Save current state BEFORE AI operation (for undo)
    saveToHistory();

    setIsProcessing(true);
    setProcessingMessage("Generating with AI...");
    setError(null);

    try {
      // Convert base64 to blob
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const maskBlob = await fetch(maskData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("prompt", prompt);

      const response = await axios.post(`${API_BASE}/api/edit/inpaint`, formData);

      if (response.data.success) {
        // Update canvas with result
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            // Save new state after AI operation
            saveToHistory();
            clearMask();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Process remove
  const handleRemove = async () => {
    const imageData = getImageBase64();
    const maskData = getMaskBase64();
    if (!imageData || !maskData) return;

    // Save current state BEFORE AI operation (for undo)
    saveToHistory();

    setIsProcessing(true);
    setProcessingMessage("Removing object...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const maskBlob = await fetch(maskData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");

      const response = await axios.post(`${API_BASE}/api/edit/remove`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            // Save new state after AI operation
            saveToHistory();
            clearMask();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Remove Background - uses Bria model
  const handleRemoveBackground = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    // Save current state BEFORE AI operation (for undo)
    saveToHistory();

    setIsProcessing(true);
    setProcessingMessage("Removing background...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");

      const response = await axios.post(`${API_BASE}/api/edit/remove-background`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            // Clear canvas with transparency
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.clearRect(0, 0, img.width, img.height);
            ctx.drawImage(img, 0, 0);
            // Save new state after AI operation
            saveToHistory();
            clearMask();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
        
        // Auto-download the transparent PNG
        const link = document.createElement('a');
        link.download = 'background-removed.png';
        link.href = `data:image/png;base64,${response.data.imageBase64}`;
        link.click();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Detect face in image (called when image loads)
  const detectFaceInImage = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    setIsDetectingFace(true);
    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");

      const response = await axios.post(`${API_BASE}/api/edit/detect-face`, formData);
      setHasFace(response.data.hasFace || false);
    } catch (err) {
      console.error("Face detection error:", err);
      setHasFace(false);
    } finally {
      setIsDetectingFace(false);
    }
  };

  // Enhance skin using Qwen model
  const handleEnhanceSkin = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage("Enhancing skin...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("prompt", prompt || "smooth skin, clear complexion, natural look, preserve details");

      const response = await axios.post(`${API_BASE}/api/edit/enhance-skin`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            saveToHistory();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Crystal Upscale 2x
  const handleUpscale = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage("Enhancing to HD...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");

      const response = await axios.post(`${API_BASE}/api/edit/upscale`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          if (canvasRef.current && maskCanvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            const maskCtx = maskCanvasRef.current.getContext("2d");
            if (ctx && maskCtx) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              maskCanvasRef.current.width = img.width;
              maskCanvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
              maskCtx.fillStyle = "black";
              maskCtx.fillRect(0, 0, img.width, img.height);
              saveToHistory();
            }
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Generate AI text on image
  const handleGenerateText = async () => {
    const imageData = getImageBase64();
    const maskData = getMaskBase64();
    if (!imageData || !maskData || !textContent.trim()) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage("Generating text...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const maskBlob = await fetch(maskData).then((r) => r.blob());

      // Build the prompt with text styling
      let fullPrompt: string;
      if (textStyle === "custom" && customPrompt.trim()) {
        fullPrompt = customPrompt.replace("{text}", textContent);
      } else if (textStyle === "custom") {
        fullPrompt = textContent;
      } else {
        fullPrompt = `Text saying "${textContent}" in ${textStyle} style, clear readable text, professional typography, high quality`;
      }

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("prompt", fullPrompt);

      const response = await axios.post(`${API_BASE}/api/edit/generate-text`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            saveToHistory();
            clearMask();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Pro Focus - depth of field effect
  const handleProFocus = async (intensity: 'subtle' | 'medium' | 'strong') => {
    const imageData = getImageBase64();
    if (!imageData) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage(`Applying Pro Focus (${intensity})...`);
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("intensity", intensity);

      const response = await axios.post(`${API_BASE}/api/edit/pro-focus`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          if (canvasRef.current && maskCanvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            const maskCtx = maskCanvasRef.current.getContext("2d");
            if (ctx && maskCtx) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              maskCanvasRef.current.width = img.width;
              maskCanvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
              maskCtx.fillStyle = "black";
              maskCtx.fillRect(0, 0, img.width, img.height);
              saveToHistory();
            }
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Pro Lighting - cinematic relighting
  const handleProLighting = async (mood: 'golden' | 'moody' | 'soft' | 'dramatic' | 'natural' | 'spotlight') => {
    const imageData = getImageBase64();
    if (!imageData) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage(`Applying ${mood} lighting (${lightingIntensity}%)...`);
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mood", mood);
      formData.append("intensity", lightingIntensity.toString());

      const response = await axios.post(`${API_BASE}/api/edit/pro-lighting`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          if (canvasRef.current && maskCanvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            const maskCtx = maskCanvasRef.current.getContext("2d");
            if (ctx && maskCtx) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              maskCanvasRef.current.width = img.width;
              maskCanvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
              maskCtx.fillStyle = "black";
              maskCtx.fillRect(0, 0, img.width, img.height);
              saveToHistory();
            }
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Style Transfer - apply artistic styles or textures
  const handleStyleTransfer = async (style: string) => {
    const imageData = getImageBase64();
    const maskData = getMaskBase64();
    if (!imageData) return;

    // Check if mask has any white pixels (selection made)
    let hasMask = false;
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext("2d");
      if (ctx) {
        const data = ctx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height).data;
        for (let i = 0; i < data.length; i += 4) {
          if (data[i] > 128) { // Check red channel
            hasMask = true;
            break;
          }
        }
      }
    }

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage(`Applying ${style} style${hasMask ? ' to selection' : ''}...`);
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("style", style);
      formData.append("intensity", styleIntensity.toString());
      
      if (hasMask && maskData) {
        const maskBlob = await fetch(maskData).then((r) => r.blob());
        formData.append("mask", maskBlob, "mask.png");
      }

      const response = await axios.post(`${API_BASE}/api/edit/style-transfer`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          if (canvasRef.current && maskCanvasRef.current) {
            const ctx = canvasRef.current.getContext("2d");
            const maskCtx = maskCanvasRef.current.getContext("2d");
            if (ctx && maskCtx) {
              canvasRef.current.width = img.width;
              canvasRef.current.height = img.height;
              maskCanvasRef.current.width = img.width;
              maskCanvasRef.current.height = img.height;
              ctx.drawImage(img, 0, 0);
              maskCtx.fillStyle = "black";
              maskCtx.fillRect(0, 0, img.width, img.height);
              saveToHistory();
            }
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Invert mask (swap selected/unselected areas)
  const handleInvertMask = () => {
    if (!maskCanvasRef.current) return;
    
    const maskCtx = maskCanvasRef.current.getContext("2d");
    if (!maskCtx) return;
    
    const imageData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    const data = imageData.data;
    
    // Invert all pixels
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255 - data[i];       // R
      data[i + 1] = 255 - data[i + 1]; // G
      data[i + 2] = 255 - data[i + 2]; // B
      // Alpha stays the same
    }
    
    maskCtx.putImageData(imageData, 0, 0);
  };

  // Generate in selection using Nano-banana
  const handleGenerateInSelection = async () => {
    const imageData = getImageBase64();
    const maskData = getMaskBase64();
    if (!imageData || !maskData || !prompt.trim()) return;

    saveToHistory();
    setIsProcessing(true);
    setProcessingMessage("Generating in selection...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());
      const maskBlob = await fetch(maskData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("mask", maskBlob, "mask.png");
      formData.append("prompt", prompt);

      const response = await axios.post(`${API_BASE}/api/edit/generative-fill`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          const ctx = canvasRef.current?.getContext("2d");
          if (ctx && canvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            ctx.drawImage(img, 0, 0);
            saveToHistory();
            clearMask();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Smart Select - Auto-detect objects and create mask
  const handleSmartSelect = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    setIsProcessing(true);
    setProcessingMessage("Detecting objects...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("prompt", prompt || "person, face, object, product");

      const response = await axios.post(`${API_BASE}/api/edit/smart-select`, formData);

      if (response.data.success && maskCanvasRef.current) {
        // Load the mask and draw it on the mask canvas
        const maskImg = new Image();
        maskImg.onload = () => {
          const maskCtx = maskCanvasRef.current?.getContext("2d");
          if (maskCtx && maskCanvasRef.current) {
            // Draw the AI-generated mask
            maskCtx.drawImage(maskImg, 0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
          }
        };
        maskImg.src = `data:image/png;base64,${response.data.maskBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Process expand
  const handleExpand = async () => {
    const imageData = getImageBase64();
    if (!imageData) return;

    setIsProcessing(true);
    setProcessingMessage("Expanding image...");
    setError(null);

    try {
      const imageBlob = await fetch(imageData).then((r) => r.blob());

      const formData = new FormData();
      formData.append("image", imageBlob, "image.png");
      formData.append("direction", expandDirection);
      formData.append("expandAmount", String(expandAmount));
      if (prompt.trim()) {
        formData.append("prompt", prompt);
      }

      const response = await axios.post(`${API_BASE}/api/edit/expand`, formData);

      if (response.data.success) {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          if (canvasRef.current && maskCanvasRef.current) {
            canvasRef.current.width = img.width;
            canvasRef.current.height = img.height;
            maskCanvasRef.current.width = img.width;
            maskCanvasRef.current.height = img.height;

            const ctx = canvasRef.current.getContext("2d");
            const maskCtx = maskCanvasRef.current.getContext("2d");
            if (ctx) ctx.drawImage(img, 0, 0);
            if (maskCtx) {
              maskCtx.fillStyle = "black";
              maskCtx.fillRect(0, 0, img.width, img.height);
            }
            saveToHistory();
          }
        };
        img.src = `data:image/png;base64,${response.data.imageBase64}`;
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setIsProcessing(false);
      setProcessingMessage("");
    }
  };

  // Download image
  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `${imageName}_edited.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  }, [imageName]);

  // Save to gallery
  const handleSaveToGallery = useCallback(() => {
    if (!canvasRef.current || !onSaveToGallery) return;
    const dataUrl = canvasRef.current.toDataURL("image/png");
    const base64 = dataUrl.split(",")[1];
    onSaveToGallery(base64, `${imageName}_edited.png`);
  }, [imageName, onSaveToGallery]);

  return (
    <div className="h-full flex flex-col bg-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div className="flex items-center gap-3">
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
              title="Close editor"
              aria-label="Close editor"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          <h2 className="text-lg font-semibold text-white">Image Editor</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo - for image changes */}
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30"
            title="Undo Image Change"
          >
            <Undo className="w-5 h-5" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30"
            title="Redo Image Change"
          >
            <Redo className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-700 mx-2" />

          {/* Zoom */}
          <button
            onClick={() => setZoom((z) => Math.max(0.1, z - 0.1))}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            title="Zoom Out"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => {
              if (containerRef.current && image) {
                const containerRect = containerRef.current.getBoundingClientRect();
                const containerWidth = containerRect.width - 32;
                const containerHeight = containerRect.height - 32;
                const scaleX = containerWidth / image.width;
                const scaleY = containerHeight / image.height;
                setZoom(Math.min(scaleX, scaleY, 1));
              }
            }}
            className="text-xs text-slate-400 hover:text-white px-1"
            title="Fit to View"
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={() => setZoom((z) => Math.min(4, z + 0.1))}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400"
            title="Zoom In"
          >
            <ZoomIn className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-700 mx-2" />

          {/* Download */}
          <button
            onClick={handleDownload}
            disabled={!image}
            className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 disabled:opacity-30"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Save to Gallery */}
          {onSaveToGallery && (
            <button
              onClick={handleSaveToGallery}
              disabled={!image}
              className="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium disabled:opacity-30"
            >
              Save to Gallery
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Toolbar */}
        <div className="w-16 bg-slate-800/50 border-r border-slate-700 flex flex-col items-center py-4 gap-2">
          {/* Upload */}
          <label className="p-3 rounded-lg hover:bg-slate-700 text-slate-400 cursor-pointer" title="Upload Image">
            <Upload className="w-5 h-5" />
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
              id="image-upload-input"
              title="Upload image file"
              aria-label="Upload image file"
            />
          </label>

          {/* Gallery */}
          <button
            onClick={() => setShowGalleryPicker(true)}
            className="p-3 rounded-lg hover:bg-slate-700 text-slate-400"
            title="Load from Gallery"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-slate-700 my-2" />

          {/* Brush */}
          <button
            onClick={() => setEditMode("brush")}
            className={`p-3 rounded-lg ${
              editMode === "brush"
                ? "bg-emerald-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Brush (draw mask)"
          >
            <Brush className="w-5 h-5" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => setEditMode("eraser")}
            className={`p-3 rounded-lg ${
              editMode === "eraser"
                ? "bg-emerald-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </button>

          {/* Rectangle Select */}
          <button
            onClick={() => setEditMode("rectSelect")}
            className={`p-3 rounded-lg ${
              editMode === "rectSelect"
                ? "bg-emerald-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Rectangle Selection"
          >
            <Square className="w-5 h-5" />
          </button>

          {/* Ellipse Select */}
          <button
            onClick={() => setEditMode("ellipseSelect")}
            className={`p-3 rounded-lg ${
              editMode === "ellipseSelect"
                ? "bg-emerald-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Ellipse Selection"
          >
            <Circle className="w-5 h-5" />
          </button>

          {/* Clear mask */}
          <button
            onClick={clearMask}
            className="p-3 rounded-lg hover:bg-slate-700 text-slate-400"
            title="Clear Mask"
          >
            <Trash2 className="w-5 h-5" />
          </button>

          <div className="w-8 h-px bg-slate-700 my-2" />

          {/* Smart Select */}
          <button
            onClick={() => setEditMode("smartSelect")}
            className={`p-3 rounded-lg ${
              editMode === "smartSelect"
                ? "bg-cyan-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Smart Select (AI auto-detect)"
          >
            <Sparkles className="w-5 h-5" />
          </button>

          {/* Text Tool */}
          <button
            onClick={() => setEditMode("text")}
            className={`p-3 rounded-lg ${
              editMode === "text"
                ? "bg-blue-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Add Text (AI)"
          >
            <Type className="w-5 h-5" />
          </button>

          {/* Style Transfer */}
          <button
            onClick={() => setEditMode("styles")}
            className={`p-3 rounded-lg ${
              editMode === "styles"
                ? "bg-pink-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Style Transfer (Anime, Cartoon, Textures)"
          >
            <Palette className="w-5 h-5" />
          </button>

          {/* Inpaint */}
          <button
            onClick={() => setEditMode("inpaint")}
            className={`p-3 rounded-lg ${
              editMode === "inpaint"
                ? "bg-purple-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Inpaint (regenerate area)"
          >
            <Wand2 className="w-5 h-5" />
          </button>

          {/* Remove */}
          <button
            onClick={() => setEditMode("remove")}
            className={`p-3 rounded-lg ${
              editMode === "remove"
                ? "bg-red-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Remove Object"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Expand */}
          <button
            onClick={() => setEditMode("expand")}
            className={`p-3 rounded-lg ${
              editMode === "expand"
                ? "bg-cyan-600 text-white"
                : "hover:bg-slate-700 text-slate-400"
            }`}
            title="Magic Expand"
          >
            <Expand className="w-5 h-5" />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-auto bg-slate-950 p-4" ref={containerRef}>
          {!image ? (
            <div className="h-full flex flex-col items-center justify-center gap-6">
              <div className="text-center">
                <button
                  onClick={() => galleryImages.length > 0 ? setShowGalleryPicker(true) : document.getElementById('editor-file-input')?.click()}
                  className="w-24 h-24 mx-auto mb-4 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-dashed border-slate-600 hover:border-slate-500 flex items-center justify-center cursor-pointer transition-colors"
                  title={galleryImages.length > 0 ? "Click to select from gallery" : "Click to upload image"}
                >
                  <ImageIcon className="w-12 h-12 text-slate-500" />
                </button>
                <h3 className="text-xl font-medium text-slate-400 mb-2">
                  No Image Loaded
                </h3>
                <p className="text-sm text-slate-500 mb-6">
                  Click the icon above or use buttons below
                </p>
              </div>

              <div className="flex gap-4">
                <label className="px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium cursor-pointer flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Image
                  <input
                    id="editor-file-input"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>

                {galleryImages.length > 0 && (
                  <button
                    onClick={() => setShowGalleryPicker(true)}
                    className="px-6 py-3 rounded-lg border border-slate-600 hover:border-slate-500 text-slate-300 font-medium flex items-center gap-2"
                  >
                    <ImageIcon className="w-5 h-5" />
                    From Gallery
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div
              className="relative inline-block"
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
              }}
            >
              {/* Main canvas */}
              <canvas
                ref={canvasRef}
                className="border border-slate-700 rounded-lg"
              />

              {/* Mask overlay canvas */}
              <canvas
                ref={maskCanvasRef}
                onMouseDown={startDrawing}
                onMouseMove={handleMouseMove}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="absolute top-0 left-0 opacity-40 cursor-crosshair border border-slate-700 rounded-lg"
                style={{
                  pointerEvents: ["brush", "eraser", "text", "rectSelect", "ellipseSelect"].includes(editMode) ? "auto" : "none",
                }}
              />
              
              {/* Shape preview overlay */}
              {isDrawingShape && shapeStart && shapeEnd && (
                <svg
                  className="absolute top-0 left-0 pointer-events-none"
                  width={canvasRef.current?.width || 0}
                  height={canvasRef.current?.height || 0}
                >
                  {editMode === "rectSelect" && (
                    <rect
                      x={Math.min(shapeStart.x, shapeEnd.x)}
                      y={Math.min(shapeStart.y, shapeEnd.y)}
                      width={Math.abs(shapeEnd.x - shapeStart.x)}
                      height={Math.abs(shapeEnd.y - shapeStart.y)}
                      fill="rgba(255, 255, 255, 0.3)"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  )}
                  {editMode === "ellipseSelect" && (
                    <ellipse
                      cx={Math.min(shapeStart.x, shapeEnd.x) + Math.abs(shapeEnd.x - shapeStart.x) / 2}
                      cy={Math.min(shapeStart.y, shapeEnd.y) + Math.abs(shapeEnd.y - shapeStart.y) / 2}
                      rx={Math.abs(shapeEnd.x - shapeStart.x) / 2}
                      ry={Math.abs(shapeEnd.y - shapeStart.y) / 2}
                      fill="rgba(255, 255, 255, 0.3)"
                      stroke="white"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                    />
                  )}
                </svg>
              )}
            </div>
          )}

          {/* Processing overlay */}
          {isProcessing && (
            <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-emerald-500 animate-spin mx-auto mb-4" />
                <p className="text-white font-medium">{processingMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Options */}
        <div className="w-72 bg-slate-800/50 border-l border-slate-700 p-4 overflow-y-auto">
          {/* Shape Selection Options */}
          {(editMode === "rectSelect" || editMode === "ellipseSelect") && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                {editMode === "rectSelect" ? <Square className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
                {editMode === "rectSelect" ? "Rectangle Selection" : "Ellipse Selection"}
              </h3>
              <p className="text-xs text-slate-400">
                Click and drag to draw a {editMode === "rectSelect" ? "rectangle" : "ellipse"} selection.
              </p>
              
              {/* Prompt for what to generate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">
                    What to generate in selection:
                  </label>
                  <button
                    onClick={handleEnhanceInpaintPrompt}
                    disabled={isEnhancingPrompt || !prompt.trim()}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Enhance prompt with AI"
                  >
                    {isEnhancingPrompt ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    AI Enhance
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what should appear..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
                />
              </div>

              {/* Action Buttons */}
              <button
                onClick={handleInpaint}
                disabled={isProcessing || !image || !prompt.trim()}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50"
              >
                Generate in Selection
              </button>
              
              <button
                onClick={handleRemove}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                Remove Selection
              </button>
              
              <div className="w-full h-px bg-slate-700" />
              
              {/* Text Generation Section */}
              <h4 className="text-xs font-medium text-blue-300 flex items-center gap-2">
                <Type className="w-3 h-3" />
                Add Text to Selection
              </h4>
              
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Text Content</label>
                <input
                  type="text"
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter text..."
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400"
                />
              </div>
              
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Style</label>
                <select
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                  title="Text style"
                >
                  <option value="bold white">Bold White</option>
                  <option value="bold black">Bold Black</option>
                  <option value="neon glowing">Neon Glowing</option>
                  <option value="3D metallic">3D Metallic</option>
                  <option value="graffiti">Graffiti</option>
                  <option value="elegant gold">Elegant Gold</option>
                  <option value="custom">+ Custom</option>
                </select>
              </div>
              
              {textStyle === "custom" && (
                <textarea
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="Custom prompt... use {text} for your text"
                  className="w-full h-16 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
                />
              )}
              
              <button
                onClick={handleGenerateText}
                disabled={isProcessing || !image || !textContent.trim()}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                Generate Text
              </button>
              
              <div className="w-full h-px bg-slate-700" />
              
              <button
                onClick={clearMask}
                className="w-full py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium"
              >
                Clear Selection
              </button>
            </div>
          )}

          {/* Brush/Eraser Mode Options */}
          {(editMode === "brush" || editMode === "eraser") && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Brush className="w-4 h-4" />
                {editMode === "brush" ? "Draw Mask" : "Erase Mask"}
              </h3>
              <p className="text-xs text-slate-400">
                {editMode === "brush" 
                  ? "Draw on the area you want to edit. White areas will be regenerated."
                  : "Erase parts of the mask you don't want to edit."}
              </p>
              
              {/* Brush Size */}
              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  Brush Size: {brushSize}px
                </label>
                <input
                  type="range"
                  min="5"
                  max="100"
                  value={brushSize}
                  onChange={(e) => setBrushSize(parseInt(e.target.value))}
                  className="w-full accent-emerald-500"
                  title="Brush size"
                />
              </div>

              {/* Prompt for what to generate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-slate-400">
                    What to generate in masked area:
                  </label>
                  <button
                    onClick={handleEnhanceInpaintPrompt}
                    disabled={isEnhancingPrompt || !prompt.trim()}
                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
                    title="Enhance prompt with AI"
                  >
                    {isEnhancingPrompt ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    AI Enhance
                  </button>
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what should appear..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
                />
              </div>

              {/* Action Buttons Section */}
              <div className="space-y-2 pt-2 border-t border-slate-700">
                <p className="text-xs text-slate-500 mb-2">
                  <i className="fa-solid fa-magic text-purple-400 mr-1" />
                  Apply AI transformations to your masked area or the entire image.
                </p>
                
                {/* Generate Button */}
                <button
                  onClick={handleInpaint}
                  disabled={isProcessing || !image || !prompt.trim()}
                  className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50"
                  title="Fill masked area with AI-generated content based on your prompt"
                >
                  Generate in Mask
                </button>

                {/* Remove Button */}
                <button
                  onClick={handleRemove}
                  disabled={isProcessing || !image}
                  className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
                  title="Remove objects in masked area - AI fills with surrounding content"
                >
                  Remove Masked Area
                </button>

                {/* Remove Background Button */}
                <button
                  onClick={handleRemoveBackground}
                  disabled={isProcessing || !image}
                  className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  title="Automatically detect and remove the background"
                >
                  <ImageIcon className="w-4 h-4" />
                  Remove Background
                </button>
              </div>
              
              {/* Enhance Skin - only show if face detected */}
              {hasFace && (
                <button
                  onClick={handleEnhanceSkin}
                  disabled={isProcessing || !image}
                  className="w-full py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4" /> Enhance Skin
                </button>
              )}
              
              {/* Enhance HD */}
              <button
                onClick={handleUpscale}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" /> Enhance HD
              </button>
              
              {/* Pro Focus - Depth of Field */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-xs font-medium text-slate-300 flex items-center gap-2 mb-3">
                  <Aperture className="w-4 h-4" />
                  Pro Focus (Depth of Field)
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  <i className="fa-solid fa-bullseye text-indigo-400 mr-1" />
                  Create professional bokeh effect - AI detects the subject and blurs the background for a DSLR-like depth of field.
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleProFocus('subtle')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Subtle
                  </button>
                  <button
                    onClick={() => handleProFocus('medium')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => handleProFocus('strong')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium disabled:opacity-50"
                  >
                    Strong
                  </button>
                </div>
              </div>
              
              {/* Pro Lighting - Cinematic Relighting */}
              <div className="border-t border-slate-700 pt-4 mt-4">
                <h4 className="text-xs font-medium text-slate-300 flex items-center gap-2 mb-3">
                  <Sun className="w-4 h-4" />
                  Pro Lighting (Relight)
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  <i className="fa-solid fa-lightbulb text-orange-400 mr-1" />
                  Apply cinematic lighting effects - transform your photo's mood with professional lighting presets.
                </p>
                
                {/* Intensity Slider */}
                <div className="mb-3">
                  <label className="text-xs text-slate-400 mb-1 block">
                    Intensity: {lightingIntensity}%
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={lightingIntensity}
                    onChange={(e) => setLightingIntensity(parseInt(e.target.value))}
                    className="w-full accent-orange-500"
                    title="Lighting intensity"
                  />
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Subtle</span>
                    <span>Strong</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleProLighting('golden')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Sunset className="w-3 h-3" /> Golden Hour
                  </button>
                  <button
                    onClick={() => handleProLighting('moody')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Moon className="w-3 h-3" /> Moody
                  </button>
                  <button
                    onClick={() => handleProLighting('soft')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Cloud className="w-3 h-3" /> Soft
                  </button>
                  <button
                    onClick={() => handleProLighting('dramatic')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Clapperboard className="w-3 h-3" /> Dramatic
                  </button>
                  <button
                    onClick={() => handleProLighting('natural')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Leaf className="w-3 h-3" /> Natural
                  </button>
                  <button
                    onClick={() => handleProLighting('spotlight')}
                    disabled={isProcessing || !image}
                    className="py-2 px-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 text-white text-xs font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <Lightbulb className="w-3 h-3" /> Spotlight
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Smart Select Options */}
          {editMode === "smartSelect" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Smart Select
              </h3>
              <p className="text-xs text-slate-400">
                Auto-detect subject, then edit or remove.
              </p>
              
              {/* Detection */}
              <button
                onClick={handleSmartSelect}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium disabled:opacity-50"
              >
                Detect Subject
              </button>
              
              {/* Selection controls */}
              <div className="flex gap-2">
                <button
                  onClick={handleInvertMask}
                  disabled={isProcessing || !image}
                  className="flex-1 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium text-sm"
                >
                  Invert
                </button>
                <button
                  onClick={clearMask}
                  className="flex-1 py-2 rounded-lg bg-slate-600 hover:bg-slate-500 text-white font-medium text-sm"
                >
                  Clear
                </button>
              </div>
              
              <div className="w-full h-px bg-slate-700" />
              
              {/* Edit with AI */}
              <h4 className="text-xs font-medium text-slate-300">Edit Selection</h4>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to generate (e.g., blue background, red shirt)..."
                className="w-full h-16 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
              />
              <button
                onClick={handleGenerateInSelection}
                disabled={isProcessing || !image || !prompt.trim()}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50"
              >
                Generate in Selection
              </button>
              
              {/* Remove */}
              <button
                onClick={handleRemove}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                Remove Selected
              </button>
              
              {/* Enhance Skin - only show if face detected */}
              {hasFace && (
                <>
                  <div className="w-full h-px bg-slate-700" />
                  <h4 className="text-xs font-medium text-pink-300">Portrait Detected</h4>
                  <button
                    onClick={handleEnhanceSkin}
                    disabled={isProcessing || !image}
                    className="w-full py-2 rounded-lg bg-pink-600 hover:bg-pink-700 text-white font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" /> Enhance Skin
                  </button>
                </>
              )}
            </div>
          )}

          {/* Text Tool Options */}
          {editMode === "text" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Type className="w-4 h-4" />
                Add Text
              </h3>
              <p className="text-xs text-slate-400">
                Draw where the text should appear, then enter your text.
              </p>
              
              {/* Text Input */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Your Text</label>
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  placeholder="Enter text to add..."
                  className="w-full h-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
                />
              </div>
              
              {/* Text Style */}
              <div>
                <label className="text-xs text-slate-400 block mb-1">Style</label>
                <select
                  value={textStyle}
                  onChange={(e) => setTextStyle(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm"
                  title="Text style"
                  aria-label="Text style"
                >
                  <option value="bold white">Bold White</option>
                  <option value="bold black">Bold Black</option>
                  <option value="neon glowing">Neon Glowing</option>
                  <option value="3D metallic">3D Metallic</option>
                  <option value="graffiti spray paint">Graffiti</option>
                  <option value="elegant gold">Elegant Gold</option>
                  <option value="handwritten cursive">Handwritten</option>
                  <option value="retro vintage">Retro Vintage</option>
                  <option value="minimalist modern">Minimalist</option>
                  <option value="comic book">Comic Book</option>
                  <option value="custom">+ Custom Prompt</option>
                </select>
              </div>
              
              {/* Custom Prompt - shown when Custom is selected */}
              {textStyle === "custom" && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Custom Prompt</label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder="Describe what to generate, e.g.: 3D text floating in the sky, neon sign on brick wall, text on t-shirt..."
                    className="w-full h-20 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Use {"{text}"} to include your text content
                  </p>
                </div>
              )}
              
              {/* Color Hint - only for preset styles */}
              {textStyle !== "custom" && (
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Color Hint</label>
                  <input
                    type="color"
                    value={textColor}
                    onChange={(e) => setTextColor(e.target.value)}
                    className="w-full h-10 rounded-lg cursor-pointer"
                    title="Text color hint"
                    aria-label="Text color hint"
                  />
                </div>
              )}
              
              {/* Generate Button */}
              <button
                onClick={handleGenerateText}
                disabled={isProcessing || !image || !textContent.trim()}
                className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50"
              >
                Generate Text
              </button>
              
              <p className="text-xs text-slate-500">
                Tip: Draw a rectangular area where text should appear
              </p>
            </div>
          )}

          {/* Style Transfer Options */}
          {editMode === "styles" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Style Transfer
              </h3>
              <p className="text-xs text-slate-400">
                Apply artistic styles to whole image or draw a selection first.
              </p>
              
              {/* Intensity Slider */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Intensity: {styleIntensity}%
                </label>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={styleIntensity}
                  onChange={(e) => setStyleIntensity(parseInt(e.target.value))}
                  className="w-full accent-pink-500"
                  title="Style intensity"
                />
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtle</span>
                  <span>Full</span>
                </div>
              </div>
              
              {/* Favorites Section - only shown if has favorites */}
              {favoriteStyles.length > 0 && (
                <div className="border border-yellow-600 rounded bg-yellow-900/20">
                  <button onClick={() => toggleStyleSection('favorites')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-yellow-400 hover:bg-yellow-900/30">
                    <span>★ Favorites ({favoriteStyles.length}/20)</span><span className="text-yellow-500">{openStyleSection === 'favorites' ? '−' : '+'}</span>
                  </button>
                  {openStyleSection === 'favorites' && <div className="px-2 pb-2">
                    <div className="grid grid-cols-2 gap-1">
                      {favoriteStyles.map(style => (
                        <div key={style} className="flex gap-0.5">
                          <button onClick={() => handleStyleTransfer(style)} disabled={isProcessing || !image} className="flex-1 py-1.5 px-1 rounded bg-yellow-600 hover:bg-yellow-700 text-white text-xs disabled:opacity-50 truncate">{style}</button>
                          <button onClick={() => toggleFavoriteStyle(style)} className="px-1 rounded bg-red-600 hover:bg-red-700 text-white text-xs" title="Remove">×</button>
                        </div>
                      ))}
                    </div>
                  </div>}
                </div>
              )}

              {/* Anime Styles */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('anime')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-pink-300 hover:bg-slate-700/50">
                  <span>Anime</span><span className="text-slate-400">{openStyleSection === 'anime' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'anime' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['anime','Anime','bg-pink-600 hover:bg-pink-500'],['ghibli','Ghibli','bg-green-600 hover:bg-green-500'],['shonen','Shonen','bg-orange-600 hover:bg-orange-500'],['shojo','Shojo','bg-rose-500 hover:bg-rose-400'],['chibi','Chibi','bg-pink-500 hover:bg-pink-400'],['makoto','Shinkai','bg-sky-500 hover:bg-sky-400'],['jojo','JoJo','bg-purple-600 hover:bg-purple-500'],['cyberpunkanime','Cyber','bg-cyan-600 hover:bg-cyan-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>

              {/* Digital Styles */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('digital')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-blue-300 hover:bg-slate-700/50">
                  <span>Digital</span><span className="text-slate-400">{openStyleSection === 'digital' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'digital' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['pixar','Pixar 3D','bg-blue-600 hover:bg-blue-500'],['disney','Disney','bg-blue-500 hover:bg-blue-400'],['cartoon','Cartoon','bg-orange-500 hover:bg-orange-400'],['comic','Comic','bg-yellow-600 hover:bg-yellow-500'],['manga','Manga','bg-gray-600 hover:bg-gray-500'],['cyberpunk','Cyberpunk','bg-purple-600 hover:bg-purple-500'],['synthwave','Synthwave','bg-fuchsia-600 hover:bg-fuchsia-500'],['lowpoly','Low Poly','bg-teal-600 hover:bg-teal-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Famous Painters */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('painters')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-yellow-300 hover:bg-slate-700/50">
                  <span>Painters</span><span className="text-slate-400">{openStyleSection === 'painters' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'painters' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['vangogh','Van Gogh','bg-yellow-600 hover:bg-yellow-500'],['monet','Monet','bg-sky-600 hover:bg-sky-500'],['picasso','Picasso','bg-blue-600 hover:bg-blue-500'],['warhol','Warhol','bg-pink-500 hover:bg-pink-400'],['rembrandt','Rembrandt','bg-amber-700 hover:bg-amber-600'],['davinci','Da Vinci','bg-amber-600 hover:bg-amber-500'],['dali','Dalí','bg-orange-600 hover:bg-orange-500'],['magritte','Magritte','bg-sky-600 hover:bg-sky-500'],['hokusai','Hokusai','bg-indigo-600 hover:bg-indigo-500'],['klimt','Klimt','bg-yellow-500 hover:bg-yellow-400'],['munch','Munch','bg-red-600 hover:bg-red-500'],['kahlo','Frida','bg-rose-600 hover:bg-rose-500'],['vermeer','Vermeer','bg-blue-700 hover:bg-blue-600'],['caravaggio','Caravaggio','bg-stone-600 hover:bg-stone-500'],['mucha','Mucha','bg-emerald-600 hover:bg-emerald-500'],['lautrec','Lautrec','bg-red-600 hover:bg-red-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Graphic Design Pioneers */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('pioneers')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-orange-300 hover:bg-slate-700/50">
                  <span>Design Pioneers</span><span className="text-slate-400">{openStyleSection === 'pioneers' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'pioneers' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['paulrand','Paul Rand','bg-blue-600 hover:bg-blue-500'],['saulbass','Saul Bass','bg-red-600 hover:bg-red-500'],['miltonglaser','M. Glaser','bg-pink-600 hover:bg-pink-500'],['vignelli','Vignelli','bg-gray-600 hover:bg-gray-500'],['mullerbrockmann','Brockmann','bg-gray-600 hover:bg-gray-500'],['tschichold','Tschichold','bg-stone-600 hover:bg-stone-500'],['lubalin','Lubalin','bg-purple-600 hover:bg-purple-500'],['lissitzky','Lissitzky','bg-red-600 hover:bg-red-500'],['cassandre','Cassandre','bg-yellow-600 hover:bg-yellow-500'],['crouwel','Crouwel','bg-cyan-600 hover:bg-cyan-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Modern Graphic Designers */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('modern')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-green-300 hover:bg-slate-700/50">
                  <span>Modern Designers</span><span className="text-slate-400">{openStyleSection === 'modern' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'modern' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['nevillebrody','N. Brody','bg-gray-600 hover:bg-gray-500'],['davidcarson','D. Carson','bg-stone-600 hover:bg-stone-500'],['paulascher','P. Scher','bg-red-600 hover:bg-red-500'],['sagmeister','Sagmeister','bg-pink-600 hover:bg-pink-500'],['bierut','Bierut','bg-blue-600 hover:bg-blue-500'],['chipkidd','Chip Kidd','bg-amber-600 hover:bg-amber-500'],['kalman','Kalman','bg-teal-600 hover:bg-teal-500'],['thorgerson','Thorgerson','bg-indigo-600 hover:bg-indigo-500'],['aicher','Aicher','bg-sky-600 hover:bg-sky-500'],['wyman','Wyman','bg-orange-600 hover:bg-orange-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Contemporary Designers */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('contemporary')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-fuchsia-300 hover:bg-slate-700/50">
                  <span>Contemporary</span><span className="text-slate-400">{openStyleSection === 'contemporary' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'contemporary' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['jessicawalsh','J. Walsh','bg-pink-600 hover:bg-pink-500'],['fairey','Fairey','bg-red-600 hover:bg-red-500'],['draplin','Draplin','bg-orange-600 hover:bg-orange-500'],['petersaville','Saville','bg-gray-600 hover:bg-gray-500'],['mikeperry','M. Perry','bg-yellow-600 hover:bg-yellow-500'],['trochut','Trochut','bg-purple-600 hover:bg-purple-500'],['banksy','Banksy','bg-gray-600 hover:bg-gray-500'],['basquiat','Basquiat','bg-yellow-600 hover:bg-yellow-500'],['kusama','Kusama','bg-red-500 hover:bg-red-400'],['haring','Haring','bg-green-500 hover:bg-green-400'],['kaws','KAWS','bg-pink-600 hover:bg-pink-500'],['obey','OBEY','bg-red-700 hover:bg-red-600'],['pollock','Pollock','bg-amber-600 hover:bg-amber-500'],['rockwell','Rockwell','bg-stone-600 hover:bg-stone-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Type Designers */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('type')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-indigo-300 hover:bg-slate-700/50">
                  <span>Type Designers</span><span className="text-slate-400">{openStyleSection === 'type' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'type' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['frutiger','Frutiger','bg-blue-600 hover:bg-blue-500'],['miedinger','Miedinger','bg-gray-600 hover:bg-gray-500'],['carter','Carter','bg-gray-600 hover:bg-gray-500'],['hoefler','Hoefler','bg-stone-600 hover:bg-stone-500'],['licko','Licko','bg-purple-600 hover:bg-purple-500'],['gill','Eric Gill','bg-amber-600 hover:bg-amber-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Japanese Designers */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('japanese')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-red-300 hover:bg-slate-700/50">
                  <span>Japanese</span><span className="text-slate-400">{openStyleSection === 'japanese' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'japanese' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['fukuda','Fukuda','bg-red-600 hover:bg-red-500'],['nagai','Nagai','bg-indigo-600 hover:bg-indigo-500'],['tanaka','Tanaka','bg-rose-600 hover:bg-rose-500'],['yokoo','Yokoo','bg-orange-600 hover:bg-orange-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Branding Legends */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('branding')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-emerald-300 hover:bg-slate-700/50">
                  <span>Branding</span><span className="text-slate-400">{openStyleSection === 'branding' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'branding' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['chermayeff','Chermayeff','bg-blue-600 hover:bg-blue-500'],['landor','Landor','bg-red-600 hover:bg-red-500'],['behrens','Behrens','bg-amber-600 hover:bg-amber-500'],['pentagram','Pentagram','bg-emerald-600 hover:bg-emerald-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Art Movements */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('movements')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-purple-300 hover:bg-slate-700/50">
                  <span>Art Movements</span><span className="text-slate-400">{openStyleSection === 'movements' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'movements' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['impressionism','Impression','bg-sky-600 hover:bg-sky-500'],['expressionism','Expression','bg-rose-600 hover:bg-rose-500'],['surrealism','Surrealism','bg-violet-600 hover:bg-violet-500'],['cubism','Cubism','bg-teal-600 hover:bg-teal-500'],['renaissance','Renaissance','bg-amber-600 hover:bg-amber-500'],['baroque','Baroque','bg-amber-700 hover:bg-amber-600'],['artnouveau','Art Nouveau','bg-emerald-600 hover:bg-emerald-500'],['artdeco','Art Deco','bg-yellow-600 hover:bg-yellow-500'],['fauvism','Fauvism','bg-orange-500 hover:bg-orange-400'],['pointillism','Pointillism','bg-green-600 hover:bg-green-500'],['romanticism','Romantic','bg-rose-600 hover:bg-rose-500'],['minimalism','Minimal','bg-gray-500 hover:bg-gray-400'],['realism','Realism','bg-stone-600 hover:bg-stone-500'],['popart','Pop Art','bg-pink-600 hover:bg-pink-500']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Techniques */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('techniques')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-amber-300 hover:bg-slate-700/50">
                  <span>Techniques</span><span className="text-slate-400">{openStyleSection === 'techniques' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'techniques' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['oilpainting','Oil Paint','bg-amber-600 hover:bg-amber-500'],['watercolor','Watercolor','bg-cyan-500 hover:bg-cyan-400'],['sketch','Sketch','bg-gray-600 hover:bg-gray-500'],['charcoal','Charcoal','bg-gray-700 hover:bg-gray-600'],['pastel','Pastel','bg-pink-400 hover:bg-pink-300'],['inkwash','Ink Wash','bg-gray-600 hover:bg-gray-500'],['ukiyoe','Ukiyo-e','bg-red-600 hover:bg-red-500'],['vintage','Vintage','bg-stone-500 hover:bg-stone-400']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              {/* Materials */}
              <div className="border border-slate-700 rounded">
                <button onClick={() => toggleStyleSection('materials')} className="w-full flex items-center justify-between px-2 py-1 text-xs font-medium text-cyan-300 hover:bg-slate-700/50">
                  <span>Materials</span><span className="text-slate-400">{openStyleSection === 'materials' ? '−' : '+'}</span>
                </button>
                {openStyleSection === 'materials' && <div className="px-2 pb-2">
                  <div className="grid grid-cols-2 gap-1">
                    {[['glass','Glass','bg-sky-500 hover:bg-sky-400'],['metal','Metal','bg-zinc-500 hover:bg-zinc-400'],['gold','Gold','bg-yellow-500 hover:bg-yellow-400'],['bronze','Bronze','bg-amber-600 hover:bg-amber-500'],['marble','Marble','bg-gray-400 hover:bg-gray-300 text-gray-800'],['ceramic','Ceramic','bg-blue-400 hover:bg-blue-300'],['wood','Wood','bg-amber-700 hover:bg-amber-600'],['ice','Ice','bg-cyan-400 hover:bg-cyan-300 text-gray-800'],['neon','Neon','bg-fuchsia-600 hover:bg-fuchsia-500'],['holographic','Holo','bg-violet-500 hover:bg-violet-400'],['glitter','Glitter','bg-pink-500 hover:bg-pink-400'],['voxel','Voxel','bg-green-600 hover:bg-green-500'],['wireframe','Wireframe','bg-gray-600 hover:bg-gray-500'],['paper','Paper','bg-orange-200 hover:bg-orange-100 text-gray-800']].map(([id,label,color])=>(<div key={id} className="flex"><button onClick={()=>handleStyleTransfer(id)} disabled={isProcessing||!image} className={`flex-1 py-1.5 px-1 rounded-l ${color} text-white text-xs font-medium disabled:opacity-50`}>{label}</button><button onClick={()=>toggleFavoriteStyle(id)} className={`px-1.5 rounded-r text-xs font-bold ${isFavorite(id)?'bg-yellow-500 hover:bg-red-500 text-black':'bg-slate-500 hover:bg-green-500 text-white'}`}>{isFavorite(id)?'−':'+'}</button></div>))}
                  </div>
                </div>}
              </div>
              
              <p className="text-xs text-slate-500 mt-2">
                Draw selection to apply style to specific area
              </p>
            </div>
          )}

          {/* Inpaint Options */}
          {editMode === "inpaint" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Wand2 className="w-4 h-4" />
                Regenerate Area
              </h3>
              <p className="text-xs text-slate-400">
                Draw on the area you want to regenerate, then describe what should appear there.
              </p>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe what to generate..."
                className="w-full h-24 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
              />
              <button
                onClick={handleInpaint}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-medium disabled:opacity-50"
              >
                Generate
              </button>
            </div>
          )}

          {/* Remove Options */}
          {editMode === "remove" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <X className="w-4 h-4" />
                Remove Object
              </h3>
              <p className="text-xs text-slate-400">
                Draw on the object you want to remove. AI will fill the area seamlessly.
              </p>
              <button
                onClick={handleRemove}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          )}

          {/* Expand Options */}
          {editMode === "expand" && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-white flex items-center gap-2">
                <Expand className="w-4 h-4" />
                Magic Expand
              </h3>
              <p className="text-xs text-slate-400">
                Extend the image borders using AI to generate new content.
              </p>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Direction</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setExpandDirection("left")}
                    className={`p-2 rounded-lg border ${
                      expandDirection === "left"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-600 text-slate-400"
                    }`}
                    title="Expand left"
                    aria-label="Expand left"
                  >
                    <ArrowLeft className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setExpandDirection("all")}
                    className={`p-2 rounded-lg border ${
                      expandDirection === "all"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-600 text-slate-400"
                    }`}
                    title="Expand all sides"
                    aria-label="Expand all sides"
                  >
                    <Maximize className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setExpandDirection("right")}
                    className={`p-2 rounded-lg border ${
                      expandDirection === "right"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-600 text-slate-400"
                    }`}
                    title="Expand right"
                    aria-label="Expand right"
                  >
                    <ArrowRight className="w-4 h-4 mx-auto" />
                  </button>
                  <button
                    onClick={() => setExpandDirection("top")}
                    className={`p-2 rounded-lg border col-start-2 ${
                      expandDirection === "top"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-600 text-slate-400"
                    }`}
                    title="Expand top"
                    aria-label="Expand top"
                  >
                    <ArrowUp className="w-4 h-4 mx-auto" />
                  </button>
                  <div />
                  <button
                    onClick={() => setExpandDirection("bottom")}
                    className={`p-2 rounded-lg border col-start-2 ${
                      expandDirection === "bottom"
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400"
                        : "border-slate-600 text-slate-400"
                    }`}
                    title="Expand bottom"
                    aria-label="Expand bottom"
                  >
                    <ArrowDown className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">
                  Amount: {expandAmount}px
                </label>
                <input
                  type="range"
                  min="64"
                  max="512"
                  step="64"
                  value={expandAmount}
                  onChange={(e) => setExpandAmount(parseInt(e.target.value))}
                  className="w-full accent-cyan-500"
                  title="Expand amount"
                  aria-label="Expand amount"
                />
              </div>

              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Optional: Describe what to generate..."
                className="w-full h-16 px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 text-white text-sm placeholder-slate-400 resize-none"
              />

              <button
                onClick={handleExpand}
                disabled={isProcessing || !image}
                className="w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-medium disabled:opacity-50"
              >
                Expand
              </button>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Gallery Picker Modal */}
      {showGalleryPicker && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl max-w-4xl max-h-[80vh] w-full mx-4 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
              <h3 className="text-lg font-medium text-white">Select from Gallery</h3>
              <button
                onClick={() => setShowGalleryPicker(false)}
                className="p-2 rounded-lg hover:bg-slate-700 text-slate-400"
                title="Close Gallery"
                aria-label="Close Gallery"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {galleryImages.length === 0 ? (
                <p className="text-center text-slate-400">No images in gallery</p>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {galleryImages.map((img) => (
                    <button
                      key={img.id}
                      onClick={() => loadFromGallery(img)}
                      className="aspect-square rounded-lg overflow-hidden border-2 border-transparent hover:border-emerald-500 transition"
                    >
                      <img
                        src={`${API_BASE}${img.url}`}
                        alt={img.originalName}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
