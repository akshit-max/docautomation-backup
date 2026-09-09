"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ZoomIn, 
  ZoomOut, 
  RefreshCw, 
  ExternalLink, 
  Download, 
  Printer, 
  Maximize2,
  Minimize2,
  AlertCircle
} from "lucide-react";

interface DocumentPreviewProps {
  url: string;
  onDownload: () => void;
  previewKey?: number;
  // Optional: when provided, live preview renders via POST without iframe reload
  liveContent?: any;
  templateType?: string;
  docId?: string;
}

export function DocumentPreview({ url, onDownload, previewKey = 0, liveContent, templateType, docId }: DocumentPreviewProps) {
  const [zoom, setZoom] = useState(1);
  const [internalKey, setInternalKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [srcDoc, setSrcDoc] = useState<string | undefined>(undefined);

  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const ZOOM_STEP = 0.1;
  const MIN_ZOOM = 0.25;
  const MAX_ZOOM = 3;

  useEffect(() => {
    // If using live preview, ignore standard url/key updates so auto-saves don't trigger the loading spinner infinitely
    if (liveContent !== undefined) return;
    setLoading(true);
    setError(false);
  }, [url, previewKey, internalKey, liveContent]);

  // Live preview: when liveContent + docId are provided, POST to render immediately without iframe src reload
  useEffect(() => {
    if (!liveContent || !docId || !templateType) return;
    
    // Only show loading spinner on the very first live render
    if (!srcDoc) setLoading(true);

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/doc/${docId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: liveContent, template_type: templateType }),
          signal: controller.signal,
        });
        if (res.ok) {
          const html = await res.text();
          setSrcDoc(html);
          setLoading(false);
          setError(false);
        } else {
          setLoading(false);
          setError(true);
        }
      } catch (e: any) {
        if (e.name !== 'AbortError') {
          setLoading(false);
          setError(true);
        }
      }
    }, 120); // 120ms debounce — fast but avoids flooding on every keystroke
    
    return () => { clearTimeout(timer); controller.abort(); };
  }, [liveContent, docId, templateType]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const handleZoomIn = () => setZoom(z => Math.min(MAX_ZOOM, Number((z + ZOOM_STEP).toFixed(2))));
  const handleZoomOut = () => setZoom(z => Math.max(MIN_ZOOM, Number((z - ZOOM_STEP).toFixed(2))));
  const handleResetZoom = () => setZoom(1);
  const handleZoomSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setZoom(Number(e.target.value) / 100);
  };

  const handleFitWidth = () => {
    if (!containerRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const padding = 48; // padding + scrollbar allowance
    const standardWidth = 900;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(((containerWidth - padding) / standardWidth).toFixed(2))));
    setZoom(newZoom);
  };

  const handleFitPage = () => {
    if (!containerRef.current) return;
    const containerHeight = containerRef.current.clientHeight;
    const padding = 48;
    const standardHeight = 1200;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(((containerHeight - padding) / standardHeight).toFixed(2))));
    setZoom(newZoom);
  };

  const handleRefresh = () => {
    setInternalKey(k => k + 1);
  };

  const handlePrint = () => {
    try {
      if (iframeRef.current?.contentWindow) {
        iframeRef.current.contentWindow.print();
      } else {
        window.open(url, "_blank")?.print();
      }
    } catch {
      // Fallback if cross-origin frame blocks print
      window.open(url, "_blank")?.print();
    }
  };

  const handleToggleFullscreen = () => {
    if (!wrapperRef.current) return;
    if (!document.fullscreenElement) {
      wrapperRef.current.requestFullscreen().catch(err => {
        console.error("Error attempting to enable fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.error("Error attempting to exit fullscreen:", err);
      });
    }
  };

  const handleIframeLoad = () => {
    setLoading(false);
  };

  return (
    <div style={s.wrapper} ref={wrapperRef}>
      {/* ── Primary Toolbar ── */}
      <div style={s.toolbar}>
        {/* Zoom Controls */}
        <div style={s.group}>
          <button style={s.iconBtn} onClick={handleZoomOut} title="Zoom Out (-)" aria-label="Zoom Out">
            <ZoomOut size={15} />
          </button>
          <input 
            type="range" 
            min="25" 
            max="300" 
            step="5" 
            value={Math.round(zoom * 100)} 
            onChange={handleZoomSlider}
            style={s.zoomSlider}
            title="Zoom slider"
            aria-label="Zoom level"
          />
          <span style={s.zoomText}>{Math.round(zoom * 100)}%</span>
          <button style={s.iconBtn} onClick={handleZoomIn} title="Zoom In (+)" aria-label="Zoom In">
            <ZoomIn size={15} />
          </button>
          <button style={s.textBtn} onClick={handleResetZoom} title="Reset Zoom to 100%">
            Reset
          </button>
          <div style={s.divider} />
          <button style={s.textBtn} onClick={handleFitWidth} title="Fit to Width">
            Fit Width
          </button>
          <button style={s.textBtn} onClick={handleFitPage} title="Fit to Page">
            Fit Page
          </button>
        </div>

        {/* Actions */}
        <div style={s.group}>
          <button style={s.iconBtn} onClick={handlePrint} title="Print Document">
            <Printer size={15} />
          </button>
          <button style={s.iconBtn} onClick={handleRefresh} title="Refresh Preview">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
          <a href={url} target="_blank" style={s.iconBtn} title="Open in New Tab" rel="noreferrer">
            <ExternalLink size={15} />
          </a>
          <button style={s.iconBtn} onClick={onDownload} title="Download PDF">
            <Download size={15} />
          </button>
          <button style={s.iconBtn} onClick={handleToggleFullscreen} title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}>
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      </div>

      {/* ── Preview Canvas Area ── */}
      <div style={s.iframeWrapper} ref={containerRef}>
        {loading && (
          /* Loading Skeleton */
          <div style={s.skeletonOverlay}>
            <div style={s.skeletonCard}>
              <div style={s.skeletonHeader} />
              <div style={s.skeletonLines}>
                <div style={{ ...s.skeletonLine, width: "85%" }} />
                <div style={{ ...s.skeletonLine, width: "95%" }} />
                <div style={{ ...s.skeletonLine, width: "70%" }} />
                <div style={{ ...s.skeletonLine, width: "90%", marginTop: 20 }} />
                <div style={{ ...s.skeletonLine, width: "60%" }} />
                <div style={{ ...s.skeletonLine, width: "80%" }} />
              </div>
            </div>
            <span style={s.loadingText}>Rendering document preview...</span>
          </div>
        )}

        {error ? (
          /* Friendly Error State */
          <div style={s.errorCard}>
            <AlertCircle size={32} color="#ef4444" />
            <h3 style={s.errorTitle}>Unable to display document preview</h3>
            <p style={s.errorSub}>
              The preview stream encountered a connection interruption or rendering error.
            </p>
            <div style={s.errorActions}>
              <button style={s.retryBtn} onClick={handleRefresh}>
                <RefreshCw size={14} />
                <span>Reload Preview</span>
              </button>
              <button style={s.secondaryBtn} onClick={onDownload}>
                <Download size={14} />
                <span>Download File</span>
              </button>
            </div>
          </div>
        ) : (
          <div 
            style={{
              ...s.scaler,
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              width: `${100 / zoom}%`,
              height: `${100 / zoom}%`,
              visibility: loading ? "hidden" : "visible"
            }}
          >
            {srcDoc ? (
              // Live preview — uses srcDoc to update in-place without iframe reload
              <iframe
                ref={iframeRef}
                srcDoc={srcDoc}
                style={s.iframe}
                title="Document live preview"
                onLoad={handleIframeLoad}
                onError={() => { setLoading(false); setError(true); }}
              />
            ) : (
              // Standard preview — loads from URL (version history, saved state)
              <iframe
                ref={iframeRef}
                key={`preview-${previewKey}-${internalKey}`}
                src={url}
                style={s.iframe}
                title="Document preview"
                onLoad={handleIframeLoad}
                onError={() => { setLoading(false); setError(true); }}
              />
            )}
          </div>
        )}
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
    background: "#f8fafc",
    borderLeft: "1px solid #e2e8f0",
    position: "relative",
    overflow: "hidden",
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "6px 12px",
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    height: 48,
    flexShrink: 0,
    gap: 12,
    overflowX: "auto",
    zIndex: 10,
  },
  group: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  iconBtn: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    borderRadius: 6,
    border: "1px solid transparent",
    background: "transparent",
    color: "#475569",
    cursor: "pointer",
    transition: "all 0.15s",
    textDecoration: "none",
  },
  textBtn: {
    padding: "4px 8px",
    borderRadius: 5,
    border: "1px solid #e2e8f0",
    background: "#f8fafc",
    color: "#334155",
    fontSize: 11.5,
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  },
  zoomSlider: {
    width: 70,
    height: 4,
    cursor: "pointer",
    accentColor: "#0f172a",
  },
  zoomText: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
    minWidth: 40,
    textAlign: "center",
  },
  divider: {
    width: 1,
    height: 18,
    background: "#e2e8f0",
    margin: "0 2px",
  },
  pageNav: {
    display: "flex",
    alignItems: "center",
    gap: 4,
  },
  pageText: {
    fontSize: 12,
    fontWeight: 500,
    color: "#475569",
    minWidth: 72,
    textAlign: "center",
  },
  searchForm: {
    display: "flex",
    alignItems: "center",
    background: "#f1f5f9",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    height: 28,
    width: 130,
  },
  searchInput: {
    border: "none",
    background: "transparent",
    fontSize: 11.5,
    color: "#0f172a",
    padding: "0 8px",
    width: "100%",
    outline: "none",
  },
  iframeWrapper: {
    flex: 1,
    overflow: "auto",
    position: "relative",
    padding: 24,
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
  },
  scaler: {
    transition: "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
    display: "flex",
    justifyContent: "center",
  },
  iframe: {
    width: 900,
    height: 1200,
    border: "1px solid #cbd5e1",
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
    background: "#ffffff",
    borderRadius: 6,
  },
  skeletonOverlay: {
    position: "absolute",
    inset: 0,
    background: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    zIndex: 5,
  },
  skeletonCard: {
    width: 480,
    height: 600,
    backgroundColor: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: 40,
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  skeletonHeader: {
    width: "40%",
    height: 24,
    backgroundColor: "#e2e8f0",
    borderRadius: 4,
    animation: "pulse 1.5s infinite",
  },
  skeletonLines: {
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  skeletonLine: {
    height: 14,
    backgroundColor: "#f1f5f9",
    borderRadius: 4,
    animation: "pulse 1.5s infinite",
  },
  loadingText: {
    fontSize: 13,
    fontWeight: 600,
    color: "#64748b",
  },
  errorCard: {
    backgroundColor: "#ffffff",
    border: "1px solid #fec2d2",
    borderRadius: 12,
    padding: 36,
    maxWidth: 420,
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.06)",
    marginTop: 60,
  },
  errorTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
  },
  errorSub: {
    margin: 0,
    fontSize: 13,
    color: "#64748b",
    lineHeight: 1.5,
  },
  errorActions: {
    display: "flex",
    gap: 10,
    marginTop: 8,
  },
  retryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  secondaryBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 16px",
    backgroundColor: "#f1f5f9",
    color: "#334155",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
};
