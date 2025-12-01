import React, { useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight, Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";

interface FullscreenImage {
  src: string;
  title?: string;
  width?: number;
  height?: number;
}

interface FullscreenViewerProps {
  images: FullscreenImage[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (index: number) => void;
  onDownload?: (index: number) => void;
}

export function FullscreenViewer({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
  onDownload,
}: FullscreenViewerProps) {
  const [zoom, setZoom] = React.useState(1);
  const [isDragging, setIsDragging] = React.useState(false);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];
  const hasMultiple = images.length > 1;

  // Reset zoom and position when image changes
  useEffect(() => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;

    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowLeft":
        if (hasMultiple && currentIndex > 0) {
          onNavigate(currentIndex - 1);
        }
        break;
      case "ArrowRight":
        if (hasMultiple && currentIndex < images.length - 1) {
          onNavigate(currentIndex + 1);
        }
        break;
      case "+":
      case "=":
        setZoom(z => Math.min(5, z + 0.5));
        break;
      case "-":
        setZoom(z => Math.max(0.5, z - 0.5));
        break;
      case "0":
        setZoom(1);
        setPosition({ x: 0, y: 0 });
        break;
    }
  }, [isOpen, currentIndex, images.length, hasMultiple, onClose, onNavigate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.2 : 0.2;
    setZoom(z => Math.max(0.5, Math.min(5, z + delta)));
  };

  if (!isOpen || !currentImage) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/95 flex flex-col"
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          {hasMultiple && (
            <span className="text-sm text-slate-400">
              {currentIndex + 1} / {images.length}
            </span>
          )}
          {currentImage.title && (
            <span className="text-sm text-slate-300 truncate max-w-[300px]">
              {currentImage.title}
            </span>
          )}
          {currentImage.width && currentImage.height && (
            <span className="text-xs text-slate-500">
              {currentImage.width} × {currentImage.height}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.5))}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
            title="Zoom out (−)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-xs text-slate-400 w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.min(5, z + 0.5))}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
            title="Zoom in (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => { setZoom(1); setPosition({ x: 0, y: 0 }); }}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 transition"
            title="Reset zoom (0)"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          {/* Download */}
          {onDownload && (
            <button
              onClick={() => onDownload(currentIndex)}
              className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition ml-2"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            className="p-2 rounded-lg bg-slate-800/50 text-slate-300 hover:bg-red-500/30 hover:text-red-400 transition ml-2"
            title="Close (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main image area */}
      <div 
        className="flex-1 flex items-center justify-center overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default" }}
      >
        {/* Previous button */}
        {hasMultiple && currentIndex > 0 && (
          <button
            onClick={() => onNavigate(currentIndex - 1)}
            className="absolute left-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            title="Previous (←)"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
        )}

        {/* Image */}
        <img
          src={currentImage.src}
          alt={currentImage.title || "Fullscreen image"}
          className="max-w-full max-h-full object-contain transition-transform duration-100"
          style={{
            transform: `scale(${zoom}) translate(${position.x / zoom}px, ${position.y / zoom}px)`,
          }}
          draggable={false}
        />

        {/* Next button */}
        {hasMultiple && currentIndex < images.length - 1 && (
          <button
            onClick={() => onNavigate(currentIndex + 1)}
            className="absolute right-4 z-10 p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition"
            title="Next (→)"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        )}
      </div>

      {/* Thumbnails for batch mode */}
      {hasMultiple && (
        <div className="bg-black/50 backdrop-blur-sm p-3">
          <div className="flex items-center justify-center gap-2 overflow-x-auto max-w-full">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => onNavigate(idx)}
                className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${
                  idx === currentIndex
                    ? "border-emerald-500 ring-2 ring-emerald-500/50"
                    : "border-slate-700 hover:border-slate-500"
                }`}
              >
                <img
                  src={img.src}
                  alt={`Thumbnail ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-20 left-4 text-xs text-slate-600">
        <span className="bg-slate-800/50 px-2 py-1 rounded">←→</span> Navigate
        <span className="bg-slate-800/50 px-2 py-1 rounded ml-2">+−</span> Zoom
        <span className="bg-slate-800/50 px-2 py-1 rounded ml-2">0</span> Reset
        <span className="bg-slate-800/50 px-2 py-1 rounded ml-2">Esc</span> Close
      </div>
    </div>
  );
}
