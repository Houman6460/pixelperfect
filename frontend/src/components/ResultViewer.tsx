import React, { useMemo, useState, useRef, useCallback } from "react";
import "./ResultViewer.css";

interface ResultViewerProps {
  originalUrl: string | null;
  originalWidth: number | null;
  originalHeight: number | null;
  resultBase64: string | null;
  resultWidth: number | null;
  resultHeight: number | null;
  aiEnhanced?: boolean;
  modelName?: string;
  onFullscreen?: () => void;
}

export function ResultViewer({
  originalUrl,
  originalWidth,
  originalHeight,
  resultBase64,
  resultWidth,
  resultHeight,
  aiEnhanced,
  modelName,
  onFullscreen,
}: ResultViewerProps) {
  const [sliderPos, setSliderPos] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const containerRef = useRef<HTMLDivElement>(null);

  const resultUrl = useMemo(() => {
    if (!resultBase64) return null;
    return "data:image/png;base64," + resultBase64;
  }, [resultBase64]);

  const hasBoth = Boolean(originalUrl && resultUrl);

  const dimsText = useMemo(() => {
    if (originalWidth && originalHeight && resultWidth && resultHeight) {
      const upscaleRatio = Math.round((resultWidth / originalWidth) * 10) / 10;
      return `${originalWidth}×${originalHeight} → ${resultWidth}×${resultHeight} (${upscaleRatio}x)`;
    }
    if (resultWidth && resultHeight) return `${resultWidth}×${resultHeight}`;
    if (originalWidth && originalHeight) return `${originalWidth}×${originalHeight}`;
    return null;
  }, [originalWidth, originalHeight, resultWidth, resultHeight]);

  const handleSliderDrag = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const x = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
    setSliderPos(x);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    handleSliderDrag(e);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleSliderDrag(e);
    } else if (zoomLevel > 1 && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setZoomPos({ x, y });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const toggleZoom = () => {
    setZoomLevel(z => z === 1 ? 2 : z === 2 ? 4 : 1);
  };

  // CSS custom properties for dynamic positioning
  const sliderStyle = { "--slider-pos": `${sliderPos}%` } as React.CSSProperties;
  const zoomStyle = zoomLevel > 1 ? {
    "--zoom": zoomLevel,
    "--zoom-x": `${zoomPos.x}%`,
    "--zoom-y": `${zoomPos.y}%`,
  } as React.CSSProperties : {};

  return (
    <div className="result-viewer">
      {/* Header */}
      <div className="result-viewer__header">
        <div className="result-viewer__title-row">
          <h2 className="result-viewer__title">Result</h2>
          {resultUrl && (
            <span className={`result-viewer__badge ${aiEnhanced ? "result-viewer__badge--ai" : "result-viewer__badge--local"}`}>
              <span className="result-viewer__badge-dot" />
              {aiEnhanced ? (modelName || "AI Enhanced") : "Local Upscale"}
            </span>
          )}
          {resultUrl && onFullscreen && (
            <button
              onClick={onFullscreen}
              className="result-viewer__fullscreen-btn"
              title="View fullscreen"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
              Fullscreen
            </button>
          )}
        </div>
        {dimsText && <p className="result-viewer__dims">{dimsText}</p>}
      </div>

      {/* Empty state */}
      {!originalUrl && !resultUrl && (
        <p className="result-viewer__empty">
          Upload an image and run enhancement to see the result here.
        </p>
      )}

      {/* Comparison viewer */}
      {(originalUrl || resultUrl) && (
        <div className="result-viewer__content">
          {/* Main comparison container */}
          <div
            ref={containerRef}
            className={`result-viewer__comparison ${isDragging ? "result-viewer__comparison--dragging" : ""}`}
            style={{ ...sliderStyle, ...zoomStyle }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onDoubleClick={toggleZoom}
          >
            {/* Original image (background) */}
            <div className={`result-viewer__image-layer result-viewer__image-layer--original ${zoomLevel > 1 ? "result-viewer__image-layer--zoomed" : ""}`}>
              <img
                src={originalUrl || resultUrl || ""}
                alt="Original"
                className="result-viewer__image"
                draggable={false}
              />
              {/* Original label */}
              <div className="result-viewer__label result-viewer__label--left">
                BEFORE
              </div>
            </div>

            {/* Enhanced image (clipped overlay) */}
            {hasBoth && resultUrl && (
              <div className={`result-viewer__image-layer result-viewer__image-layer--enhanced ${zoomLevel > 1 ? "result-viewer__image-layer--zoomed" : ""}`}>
                <img
                  src={resultUrl}
                  alt="Enhanced"
                  className="result-viewer__image"
                  draggable={false}
                />
                {/* Enhanced label */}
                <div className="result-viewer__label result-viewer__label--right">
                  AFTER
                </div>
              </div>
            )}

            {/* Slider handle */}
            {hasBoth && (
              <div className="result-viewer__slider">
                <div className="result-viewer__slider-line" />
                <div className="result-viewer__slider-handle">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="result-viewer__slider-icon">
                    <path d="M8 5v14l-7-7 7-7zm8 0v14l7-7-7-7z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Zoom indicator */}
            {zoomLevel > 1 && (
              <div className="result-viewer__zoom-badge">
                {zoomLevel}x Zoom • Double-click to change
              </div>
            )}
          </div>

          {/* Controls */}
          <div className="result-viewer__controls">
            <div className="result-viewer__zoom-buttons">
              <button
                onClick={() => setZoomLevel(1)}
                className={`result-viewer__zoom-btn ${zoomLevel === 1 ? "result-viewer__zoom-btn--active" : ""}`}
              >
                1x
              </button>
              <button
                onClick={() => setZoomLevel(2)}
                className={`result-viewer__zoom-btn ${zoomLevel === 2 ? "result-viewer__zoom-btn--active" : ""}`}
              >
                2x
              </button>
              <button
                onClick={() => setZoomLevel(4)}
                className={`result-viewer__zoom-btn ${zoomLevel === 4 ? "result-viewer__zoom-btn--active" : ""}`}
              >
                4x
              </button>
            </div>

            {resultUrl && (
              <a
                href={resultUrl}
                download="enhanced.png"
                className="result-viewer__download"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="result-viewer__download-icon">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                </svg>
                Download PNG
              </a>
            )}
          </div>

          {/* Instructions */}
          <p className="result-viewer__instructions">
            Drag the slider to compare • Double-click to zoom • Move mouse to pan when zoomed
          </p>
        </div>
      )}
    </div>
  );
}
