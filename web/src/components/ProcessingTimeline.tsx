"use client";

import React from "react";

const STEPS = [
  { key: "uploading", label: "Uploading" },
  { key: "ocr", label: "Extracting Text" },
  { key: "classifying", label: "Classifying" },
  { key: "generating", label: "AI Structuring" },
  { key: "saving", label: "Saving Doc" },
  { key: "done", label: "Ready!" },
];

interface ProcessingTimelineProps {
  currentPhase: string;
}

export function ProcessingTimeline({ currentPhase }: ProcessingTimelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentPhase);

  return (
    <div style={s.container}>
      <h3 style={s.title}>Processing Document</h3>
      <div style={s.timeline}>
        {STEPS.map((step, index) => {
          if (step.key === "idle") return null;

          const isCompleted = currentIndex > index || currentPhase === "done";
          const isActive = currentPhase === step.key;

          return (
            <div key={step.key} style={s.stepCol}>
              {/* Horizontal line connecting steps */}
              {index < STEPS.length - 1 && (
                <div
                  style={{
                    ...s.connector,
                    background: isCompleted ? "#10b981" : "#e2e8f0",
                  }}
                />
              )}

              <div style={s.iconWrapper}>
                {isCompleted ? (
                  <div style={s.completedIcon}>✔</div>
                ) : isActive ? (
                  <div style={s.spinner} />
                ) : (
                  <div style={s.pendingDot} />
                )}
              </div>

              <div
                style={{
                  ...s.label,
                  color: isCompleted ? "#10b981" : isActive ? "#0f172a" : "#94a3b8",
                  fontWeight: isActive || isCompleted ? 600 : 500,
                }}
              >
                {step.label}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "28px 36px 32px",
    width: "100%",
    maxWidth: 760,
    margin: "16px auto",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.02)",
  },
  title: {
    margin: "0 0 28px 0",
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    textAlign: "center",
    fontFamily: '"TT Hoves", system-ui, sans-serif',
    letterSpacing: -0.3,
  },
  timeline: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    width: "100%",
    position: "relative",
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
  connector: {
    position: "absolute",
    top: 14,
    left: "calc(50% + 18px)",
    right: "calc(-50% + 18px)",
    height: 2.5,
    borderRadius: 2,
    transition: "background 0.3s ease",
    zIndex: 1,
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: 30,
    height: 30,
    marginBottom: 10,
    position: "relative",
    zIndex: 2,
    background: "#fff",
  },
  completedIcon: {
    width: 28,
    height: 28,
    borderRadius: "50%",
    background: "#10b981",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontWeight: "bold",
    boxShadow: "0 2px 6px rgba(16, 185, 129, 0.3)",
    transition: "all 0.3s ease",
  },
  spinner: {
    width: 24,
    height: 24,
    border: "2.5px solid #e2e8f0",
    borderTopColor: "#0f172a",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  pendingDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    background: "#cbd5e1",
    transition: "background 0.3s ease",
  },
  label: {
    fontSize: 12,
    lineHeight: 1.3,
    transition: "color 0.3s ease",
    maxWidth: 90,
    margin: "0 auto",
  },
};
