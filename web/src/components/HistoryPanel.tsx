"use client";
import React, { useState, useEffect, useCallback } from "react";
import { getVersions, restoreVersion } from "@/lib/api";
import { X, Clock, RotateCcw } from "lucide-react";

export function HistoryPanel({
  docId,
  isOpen,
  onClose,
  onPreview,
  onRestored,
}: {
  docId: string;
  isOpen: boolean;
  onClose: () => void;
  onPreview: (version: any | null) => void;
  onRestored: () => void;
}) {
  const [versions, setVersions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [selectedVersionId, setSelectedVersionId] = useState<string | null>(null);

  const loadVersions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getVersions(docId);
      setVersions(res.data.versions || []);
    } catch (err) {
      console.error("Failed to load versions:", err);
    } finally {
      setLoading(false);
    }
  }, [docId]);

  useEffect(() => {
    if (isOpen) {
      loadVersions();
    } else {
      setTimeout(() => {
        setSelectedVersionId(null);
        onPreview(null);
      }, 0);
    }
  }, [isOpen, loadVersions, onPreview]);

  const handleSelectVersion = (v: any) => {
    setSelectedVersionId(v.id);
    onPreview(v);
  };

  const handleRestore = async (versionId: string) => {
    if (await confirm("Are you sure you want to restore this version?")) {
      setRestoring(true);
      try {
        await restoreVersion(docId, versionId);
        await onRestored();
        onClose();
      } catch (err) {
        console.error("Failed to restore version:", err);
        alert("Failed to restore version.");
      } finally {
        setRestoring(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div style={s.overlay}>
      <div style={s.panel}>
        <div style={s.header}>
          <h2 style={s.title}>Version History</h2>
          <button style={s.closeBtn} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={s.content}>
          {loading ? (
            <div style={s.center}>Loading history...</div>
          ) : versions.length === 0 ? (
            <div style={s.center}>No history found.</div>
          ) : (
            <div style={s.timeline}>
              {versions.map((v, index) => {
                const isSelected = selectedVersionId === v.id;
                const isCurrent = index === 0;

                return (
                  <div
                    key={v.id}
                    style={{
                      ...s.versionCard,
                      ...(isSelected ? s.versionCardSelected : {}),
                    }}
                    onClick={() => handleSelectVersion(v)}
                  >
                    <div style={s.cardHeader}>
                      <span style={s.versionBadge}>v{v.versionNumber}</span>
                      {isCurrent && <span style={s.currentBadge}>Latest</span>}
                    </div>
                    <div style={s.time}>
                      {new Date(v.createdAt).toLocaleString()}
                    </div>
                    <div style={s.reason}>
                      {v.reason || "Manual Save"}
                    </div>

                    {isSelected && (
                      <div style={s.actions}>
                        {!isCurrent && (
                          <button
                            style={s.restoreBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestore(v.id);
                            }}
                            disabled={restoring}
                          >
                            <RotateCcw size={14} style={{ marginRight: 6 }} />
                            {restoring ? "Restoring..." : "Restore this version"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "absolute" as const,
    top: 0,
    right: 0,
    bottom: 0,
    width: 320,
    backgroundColor: "#fff",
    borderLeft: "1px solid #eaeaea",
    display: "flex",
    flexDirection: "column" as const,
    zIndex: 100,
    boxShadow: "-4px 0 24px rgba(0,0,0,0.05)",
  },
  panel: {
    display: "flex",
    flexDirection: "column" as const,
    height: "100%",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "16px 20px",
    borderBottom: "1px solid #eaeaea",
    backgroundColor: "#fafafa",
  },
  title: {
    fontSize: 16,
    fontWeight: 600,
    margin: 0,
    color: "#111",
  },
  closeBtn: {
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#888",
    padding: 4,
    display: "flex",
    alignItems: "center",
  },
  content: {
    flex: 1,
    overflowY: "auto" as const,
    padding: 20,
  },
  center: {
    textAlign: "center" as const,
    color: "#888",
    fontSize: 14,
    marginTop: 40,
  },
  timeline: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
  },
  versionCard: {
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#eaeaea",
    borderRadius: 4,
    padding: 16,
    cursor: "pointer",
    backgroundColor: "#fff",
    transition: "all 0.15s ease",
  },
  versionCardSelected: {
    borderColor: "#000",
    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  versionBadge: {
    fontSize: 13,
    fontWeight: 600,
    color: "#111",
  },
  currentBadge: {
    fontSize: 11,
    fontWeight: 600,
    backgroundColor: "#e0f2fe",
    color: "#0369a1",
    padding: "2px 8px",
    borderRadius: 4,
  },
  time: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  reason: {
    fontSize: 13,
    color: "#444",
  },
  actions: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: "1px solid #eaeaea",
  },
  restoreBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "8px 0",
    backgroundColor: "#111",
    color: "#fff",
    border: "none",
    borderRadius: 4,
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
  },
};
