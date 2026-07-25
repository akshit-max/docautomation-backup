"use client";

import React from "react";

const STEPS = [
  { key: "uploading", label: "Uploading Document" },
  { key: "ocr", label: "Extracting Text (OCR)" },
  { key: "classifying", label: "Classifying Document" },
  { key: "generating", label: "Generating Structured Data" },
  { key: "saving", label: "Saving Document" },
  { key: "done", label: "Document Ready" },
];

interface ProcessingTimelineProps {
  currentPhase: string;
}

export function ProcessingTimeline({ currentPhase }: ProcessingTimelineProps) {
  // Find the index of the current phase. If not found or 'idle', it's -1.
  const currentIndex = STEPS.findIndex((s) => s.key === currentPhase);

  return (
    <div style={s.container}>
      <h3 style={s.title}>Processing Document</h3>
      <div style={s.timeline}>
        {STEPS.map((step, index) => {
          // 'done' is just for the final momentary state. We can render it or skip it based on index.
          // Let's actually include "done" in the steps array for the UX polish, or we can just treat the final phase as 'done'.
          // Wait, the user specifically mentioned 5 steps in the prompt: Uploading, OCR, Classifying, Generating, Saving.
          // And then "Document Ready" after. Let's just exclude 'done' from the visual timeline until it is actually done, or we can include it as the final step.
          // I will include "done" but if current phase is before it, it just looks pending.

          // Skip rendering 'idle' or unmapped phases.
          if (step.key === "idle") return null;

          const isCompleted = currentIndex > index || currentPhase === "done";
          const isActive = currentPhase === step.key;
          const isPending = !isCompleted && !isActive;

          // For the final step 'done', we only want to show it if it's active/completed, 
          // or we can just keep it in the list. The user said: "After the final step completes, briefly display ... 🎉 Document Ready".
          if (step.key === "done" && !isCompleted && !isActive) {
             // Let's hide the "Document Ready" step until it's actually reached, to keep the timeline clean.
             // Or we can show it as pending. It's usually better to show it as the finish line.
             // Let's show it.
          }

          return (
            <div key={step.key} style={s.stepRow}>
              <div style={s.iconWrapper}>
                {isCompleted ? (
                  <div style={s.completedIcon}>✔</div>
                ) : isActive ? (
                  <div style={s.spinner} />
                ) : (
                  <div style={s.pendingDot} />
                )}
                {/* Vertical line connecting steps */}
                {index < STEPS.length - 1 && (
                  <div
                    style={{
                      ...s.connector,
                      background: isCompleted ? "#10b981" : "#e2e8f0",
                    }}
                  />
                )}
              </div>
              <div
                style={{
                  ...s.label,
                  color: isCompleted ? "#10b981" : isActive ? "#111" : "#94a3b8",
                  fontWeight: isActive ? 600 : 500,
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
    padding: "24px 32px",
    width: "100%",
    maxWidth: 400,
    margin: "0 auto",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)",
  },
  title: {
    margin: "0 0 20px 0",
    fontSize: 16,
    fontWeight: 600,
    color: "#0f172a",
    textAlign: "center",
  },
  timeline: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
  },
  stepRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 16,
    position: "relative",
  },
  iconWrapper: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    width: 24,
    height: 48, // Gives space for the connector
  },
  completedIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    background: "#10b981",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: "bold",
    zIndex: 2,
  },
  spinner: {
    width: 20,
    height: 20,
    border: "2px solid #e2e8f0",
    borderTopColor: "#3b82f6",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    zIndex: 2,
    marginTop: 2,
  },
  pendingDot: {
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#cbd5e1",
    zIndex: 2,
    marginTop: 7,
  },
  connector: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  label: {
    fontSize: 14,
    marginTop: 2,
  },
};
