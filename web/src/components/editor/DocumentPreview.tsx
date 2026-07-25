"use client";

import React, { useState, useRef, useEffect } from "react";
import { ZoomIn, ZoomOut, Maximize, RefreshCw, ExternalLink, Download, RotateCcw } from "lucide-react";

interface DocumentPreviewProps {
  url: string;
  onDownload: () => void;
  // A unique key to force a re-render/refresh of the iframe when it changes outside
  previewKey?: number;
}

export function DocumentPreview({ url, onDownload, previewKey = 0 }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [internalKey, setInternalKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const ZOOM_STEP = 0.1;
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;

  const handleZoomIn = () => setZoom(z => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  const handleZoomOut = () => setZoom(z => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  const handleResetZoom = () => setZoom(1);

  const handleFitWidth = () => {
    if (!containerRef.current) return;
    // The iframe has a hardcoded width of 900px in the layout.html (max-width: 900px). 
    // We can assume standard width is around 900px or 100% of container.
    // Let's compute scale = container width / 900
    const containerWidth = containerRef.current.clientWidth;
    const padding = 40; // 20px padding on each side
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, (containerWidth - padding) / 900));
    setZoom(newZoom);
  };

  const handleRefresh = () => {
    setInternalKey(k => k + 1);
  };

  return (
    <div style={s.wrapper}>
      {/* ── Toolbar ── */}
      <div style={s.toolbar}>
        <div style={s.zoomGroup}>
          <button style={s.iconBtn} onClick={handleZoomOut} title="Zoom Out">
            <ZoomOut size={16} />
          </button>
          <span style={s.zoomText}>{Math.round(zoom * 100)}%</span>
          <button style={s.iconBtn} onClick={handleZoomIn} title="Zoom In">
            <ZoomIn size={16} />
          </button>
          <div style={s.divider} />
          <button style={s.iconBtn} onClick={handleFitWidth} title="Fit Width">
            <Maximize size={16} />
          </button>
          <button style={s.iconBtn} onClick={handleResetZoom} title="Reset Zoom">
            <RotateCcw size={16} />
          </button>
        </div>

        <div style={s.actionGroup}>
          <button style={s.iconBtn} onClick={handleRefresh} title="Refresh Preview">
            <RefreshCw size={16} />
          </button>
          <a href={url} target="_blank" style={s.iconBtn} title="Open in New Tab" rel="noreferrer">
            <ExternalLink size={16} />
          </a>
          <button style={s.iconBtn} onClick={onDownload} title="Download PDF">
            <Download size={16} />
          </button>
        </div>
      </div>

      {/* ── Iframe Container ── */}
      <div style={s.iframeWrapper} ref={containerRef}>
        <div 
          style={{
            ...s.scaler,
            transform: `scale(${zoom})`,
            transformOrigin: "top center",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`
          }}
        >
          <iframe
            key={`preview-${previewKey}-${internalKey}`}
            src={url}
            style={s.iframe}
            title="Document preview"
          />
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  wrapper: {
    display: "flex",
    flexDirection: "column",
    width: "100%",
    height: "100%",
    background: "#f1f5f9",
    borderLeft: "1px solid #e2e8f0",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 16px",
    background: "#fff",
    borderBottom: "1px solid #e2e8f0",
    height: 48,
    flexShrink: 0,
  },
  zoomGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  actionGroup: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  iconBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 6,
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  zoomText: {
    fontSize: 13,
    fontWeight: 500,
    color: "#475569",
    minWidth: 44,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 20,
    background: "#e2e8f0",
    margin: "0 4px",
  },
  iframeWrapper: {
    flex: 1,
    overflow: "auto",
    position: "relative",
    padding: 20,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  scaler: {
    transition: "transform 0.15s ease-out",
  },
  iframe: {
    width: "100%",
    height: "100%",
    minHeight: 1200,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)",
    background: "#fff",
    borderRadius: 4,
  }
};
