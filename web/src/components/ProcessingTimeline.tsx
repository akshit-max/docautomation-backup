"use client";

import React, { useState, useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Clock, RefreshCw, ShieldCheck } from "lucide-react";

const STEPS = [
  { key: "uploading", label: "File Ingestion", sub: "Transferring payload" },
  { key: "ocr", label: "Text Extraction", sub: "Reading layout" },
  { key: "classifying", label: "Classification", sub: "Matching schema" },
  { key: "generating", label: "Data Parsing", sub: "Structuring fields" },
  { key: "saving", label: "Persistence", sub: "Committing record" },
  { key: "done", label: "Ready", sub: "Opening workspace" },
];

interface ProcessingTimelineProps {
  currentPhase: string;
  error?: string;
  onRetry?: () => void;
}

export function ProcessingTimeline({ currentPhase, error, onRetry }: ProcessingTimelineProps) {
  const [elapsed, setElapsed] = useState<number>(0);
  const [stageDurations, setStageDurations] = useState<Record<string, string>>({});
  const lastPhaseRef = useRef<string>("uploading");
  const lastTimeRef = useRef<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const currentIndex = STEPS.findIndex((s) => s.key === currentPhase);
  const isError = currentPhase === "error" || !!error;
  const isDone = currentPhase === "done";

  // Track overall elapsed time
  useEffect(() => {
    if (lastTimeRef.current === 0 || currentPhase === "idle" || currentPhase === "uploading") {
      lastTimeRef.current = Date.now();
    }
    if (currentPhase === "idle" || currentPhase === "uploading") {
      setElapsed(0);
      setStageDurations({});
      lastPhaseRef.current = currentPhase === "idle" ? "uploading" : currentPhase;
    }

    if (!isDone && !isError && currentPhase !== "idle") {
      timerRef.current = setInterval(() => {
        const start = lastTimeRef.current || Date.now();
        setElapsed((Date.now() - start) / 1000);
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentPhase, isDone, isError]);

  // Track individual stage durations when phase transitions
  useEffect(() => {
    if (currentPhase !== lastPhaseRef.current && currentPhase !== "idle" && !isError) {
      const now = Date.now();
      // Record duration for the stage that just completed
      const diff = ((now - (lastTimeRef.current || now)) / 1000).toFixed(1);
      
      if (lastPhaseRef.current && lastPhaseRef.current !== "idle" && lastPhaseRef.current !== "error") {
        setStageDurations(prev => ({
          ...prev,
          [lastPhaseRef.current]: `${Math.max(0.2, parseFloat(diff))}s`
        }));
      }

      // If jumping directly across steps (e.g. uploading -> generating), backfill intervening steps
      const oldIdx = STEPS.findIndex(s => s.key === lastPhaseRef.current);
      const newIdx = STEPS.findIndex(s => s.key === currentPhase);
      if (newIdx > oldIdx + 1) {
        const skipped = STEPS.slice(oldIdx + 1, newIdx);
        const splitTime = (Math.max(0.3, parseFloat(diff) / (skipped.length + 1))).toFixed(1);
        const additions: Record<string, string> = {};
        skipped.forEach(sk => {
          additions[sk.key] = `${splitTime}s`;
        });
        setStageDurations(prev => ({ ...prev, ...additions }));
      }

      lastPhaseRef.current = currentPhase;
    }
  }, [currentPhase, isError]);

  return (
    <div style={s.container}>
      {/* ── Timeline Header ── */}
      <div style={s.headerRow}>
        <div style={s.titleGroup}>
          <h3 style={s.title}>
            {isDone ? "Document Processed Successfully" : "Document Processing Pipeline"}
          </h3>
          <span style={s.subtitle}>
            {isDone 
              ? "All ingestion and structuring stages completed without errors." 
              : isError 
              ? "Pipeline execution interrupted. Review exception details below." 
              : "Executing sequential document extraction and field mapping."}
          </span>
        </div>
        
        {/* Overall Elapsed Timer Badge */}
        <div style={{
          ...s.timerBadge,
          backgroundColor: isDone ? "#f0fdf4" : isError ? "#fef2f2" : "#f8fafc",
          color: isDone ? "#16a34a" : isError ? "#ef4444" : "#0f172a",
          borderColor: isDone ? "#bbf7d0" : isError ? "#fecaca" : "#cbd5e1"
        }}>
          <Clock size={14} className={!isDone && !isError ? "animate-pulse" : ""} />
          <span style={s.timerText}>
            Elapsed: <strong>{elapsed.toFixed(1)}s</strong>
          </span>
        </div>
      </div>

      {/* ── Timeline Stepper ── */}
      <div style={s.timeline}>
        {STEPS.map((step, index) => {
          const isCompleted = currentIndex > index || isDone;
          const isActive = currentPhase === step.key && !isError;
          const isFailedStep = (isError && (currentIndex === index || (currentIndex === -1 && index === 0))) || 
                               (isError && currentPhase === "error" && index === Math.max(0, Object.keys(stageDurations).length));
          
          const duration = stageDurations[step.key] || (isCompleted && step.key === "done" ? "0.1s" : null);

          return (
            <div key={step.key} style={s.stepCol}>
              {/* Animated Connector Line */}
              {index < STEPS.length - 1 && (
                <div style={s.connectorTrack}>
                  <div
                    style={{
                      ...s.connectorFill,
                      width: isCompleted ? "100%" : isActive ? "50%" : "0%",
                      background: isFailedStep ? "#ef4444" : isCompleted ? "#10b981" : isActive ? "#10b981" : "#e2e8f0",
                      transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </div>
              )}

              {/* Step Icon Node */}
              <div style={s.iconWrapper}>
                {isCompleted ? (
                  <div style={s.completedIcon} title="Completed">
                    <CheckCircle2 size={16} />
                  </div>
                ) : isFailedStep ? (
                  <div style={s.failedIcon} title="Failed Stage">
                    <AlertCircle size={16} />
                  </div>
                ) : isActive ? (
                  <div style={s.activeRing}>
                    <div style={s.spinner} />
                  </div>
                ) : (
                  <div style={s.pendingDot} />
                )}
              </div>

              {/* Step Labels & Duration */}
              <div style={s.labelBox}>
                <div
                  style={{
                    ...s.label,
                    color: isCompleted ? "#16a34a" : isFailedStep ? "#ef4444" : isActive ? "#0f172a" : "#475569",
                    fontWeight: isActive || isCompleted || isFailedStep ? 800 : 600,
                  }}
                >
                  {step.label}
                </div>
                
                <div style={s.subLabel}>{step.sub}</div>

                {/* Stage Duration Tag */}
                {duration && (
                  <div style={s.durationTag}>
                    {duration}
                  </div>
                )}
                {isActive && !duration && (
                  <div style={{ ...s.durationTag, color: "#0f172a", background: "#f1f5f9", border: "1px solid #cbd5e1" }}>
                    In progress...
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Success Card ── */}
      {isDone && (
        <div style={s.successCard}>
          <div style={s.successIconCircle}>
            <ShieldCheck size={18} color="#16a34a" />
          </div>
          <div style={s.successBody}>
            <div style={s.successTitle}>Document Ingestion &amp; Verification Complete</div>
            <div style={s.successSub}>
              Processed in {elapsed.toFixed(1)}s. Opening workspace...
            </div>
          </div>
        </div>
      )}

      {/* ── Error & Retry Display ── */}
      {isError && (
        <div style={s.errorCard}>
          <div style={s.errorIconCircle}>
            <AlertCircle size={20} color="#ef4444" />
          </div>
          <div style={s.errorBody}>
            <div style={s.errorTitle}>Pipeline Processing Exception</div>
            <div style={s.errorSub}>{error || "We encountered an exception while structuring your document."}</div>
            {onRetry && (
              <button style={s.retryBtn} onClick={onRetry} type="button">
                <RefreshCw size={14} />
                <span>Retry Upload</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 14,
    padding: "24px 28px",
    width: "100%",
    maxWidth: 820,
    margin: "20px auto",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.06), 0 8px 10px -6px rgba(0, 0, 0, 0.03)",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  headerRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    borderBottom: "1px solid #f1f5f9",
    paddingBottom: 16,
  },
  titleGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  title: {
    margin: 0,
    fontSize: 17,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: "#64748b",
  },
  timerBadge: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "6px 12px",
    borderRadius: 999,
    fontSize: 12.5,
    border: "1px solid",
    fontWeight: 500,
  },
  timerText: {
    lineHeight: 1,
  },
  timeline: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    position: "relative",
    padding: "10px 0",
  },
  stepCol: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    flex: 1,
    position: "relative",
    textAlign: "center",
    padding: "0 4px",
  },
  connectorTrack: {
    position: "absolute",
    top: 16,
    left: "calc(50% + 20px)",
    right: "calc(-50% + 20px)",
    height: 3,
    backgroundColor: "#f1f5f9",
    borderRadius: 2,
    overflow: "hidden",
    zIndex: 1,
  },
  connectorFill: {
    height: "100%",
    borderRadius: 2,
    transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    marginBottom: 10,
    position: "relative",
    zIndex: 2,
    background: "#ffffff",
  },
  completedIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#10b981",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "none",
    transition: "transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
  },
  failedIcon: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    background: "#ef4444",
    color: "#ffffff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "none",
  },
  activeRing: {
    width: 34,
    height: 34,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f0fdf4",
    border: "2px solid #10b981",
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2.5px solid #e2e8f0",
    borderTopColor: "#10b981",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#e2e8f0",
  },
  labelBox: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 2,
  },
  label: {
    fontSize: 13,
    transition: "color 0.2s ease",
  },
  subLabel: {
    fontSize: 11,
    fontWeight: 500,
    color: "#475569",
    maxWidth: 90,
    lineHeight: 1.2,
  },
  durationTag: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: 600,
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    padding: "2px 6px",
    borderRadius: 4,
    display: "inline-block",
  },
  successCard: {
    backgroundColor: "#f0fdf4",
    border: "1px solid #bbf7d0",
    borderRadius: 10,
    padding: "14px 18px",
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  successIconCircle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#dcfce7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  successBody: {
    flex: 1,
  },
  successTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#166534",
  },
  successSub: {
    fontSize: 12.5,
    color: "#15803d",
    marginTop: 2,
  },
  errorCard: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: 10,
    padding: "16px 20px",
    display: "flex",
    alignItems: "flex-start",
    gap: 14,
  },
  errorIconCircle: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    backgroundColor: "#fee2e2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  errorBody: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#991b1b",
  },
  errorSub: {
    fontSize: 12.5,
    color: "#b91c1c",
    lineHeight: 1.4,
  },
  retryBtn: {
    alignSelf: "flex-start",
    marginTop: 6,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 14px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
  },
};
