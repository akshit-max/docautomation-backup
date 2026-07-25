"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X, AlertTriangle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { ToastType } from "@/lib/notify";

interface ToastItem {
  id: string | number;
  message: string;
  type: ToastType;
  duration?: number;
  details?: string;
}

interface ConfirmState {
  message: string;
  resolve: (val: boolean) => void;
}

interface PromptState {
  message: string;
  defaultValue: string;
  resolve: (val: string | null) => void;
}

export default function GlobalPopup() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [expandedToasts, setExpandedToasts] = useState<Record<string | number, boolean>>({});
  const [confirmData, setConfirmData] = useState<ConfirmState | null>(null);
  const [promptData, setPromptData] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Overriding native alert to route through our Notification Design System
    window.alert = (message: string) => {
      const lower = message.toLowerCase();
      let type: ToastType = "info";
      let duration = 4000;

      if (lower.includes("fail") || lower.includes("error") || lower.includes("couldn't") || lower.includes("unable")) {
        type = "error";
        duration = 6000;
      } else if (lower.includes("success") || lower.includes("generated") || lower.includes("translated") || lower.includes("restored") || lower.includes("saved")) {
        type = "success";
        duration = 4000;
      } else if (lower.includes("warning") || lower.includes("no changes") || lower.includes("disabled") || lower.includes("no searchable text")) {
        type = "warning";
        duration = 5000;
      } else if (lower.includes("loading...") || lower.includes("uploading...") || lower.includes("extracting...") || lower.includes("generating...") || lower.includes("translating...") || lower.includes("exporting...")) {
        type = "loading";
        duration = 0; // infinite until dismissed or replaced
      }

      window.dispatchEvent(new CustomEvent("show-toast", { detail: { id: Date.now() + Math.random(), message, type, duration } }));
    };

    // Overriding native confirm
    // @ts-ignore
    window.confirm = (message: string) => {
      return new Promise<boolean>((resolve) => {
        const event = new CustomEvent("show-confirm", { detail: { message, resolve } });
        window.dispatchEvent(event);
      });
    };

    // Overriding native prompt
    // @ts-ignore
    window.prompt = (message: string, defaultValue = "") => {
      return new Promise<string | null>((resolve) => {
        const event = new CustomEvent("show-prompt", {
          detail: { message, defaultValue, resolve },
        });
        window.dispatchEvent(event);
      });
    };
  }, []);

  useEffect(() => {
    const handleToast = (e: Event) => {
      const { id, message, type, duration = 4000, details } = (e as CustomEvent).detail;
      const toastId = id ?? (Date.now() + Math.random());

      setToasts((prev) => {
        // If replacing an existing toast (e.g. loading -> success), update it in place
        const exists = prev.some((t) => t.id === toastId);
        if (exists) {
          return prev.map((t) => (t.id === toastId ? { id: toastId, message, type, duration, details } : t));
        }
        return [...prev, { id: toastId, message, type, duration, details }];
      });

      // Auto-remove if duration > 0 (loading toasts with duration 0 stay until replaced/dismissed)
      if (duration > 0) {
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastId));
        }, duration);
      }
    };

    const handleDismissToast = (e: Event) => {
      const { id } = (e as CustomEvent).detail;
      setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    const handleConfirm = (e: Event) => {
      const { message, resolve } = (e as CustomEvent).detail;
      setConfirmData({ message, resolve });
    };

    const handlePrompt = (e: Event) => {
      const { message, defaultValue, resolve } = (e as CustomEvent).detail;
      setPromptData({ message, defaultValue, resolve });
      setPromptValue(defaultValue);
    };

    window.addEventListener("show-toast", handleToast);
    window.addEventListener("dismiss-toast", handleDismissToast);
    window.addEventListener("show-confirm", handleConfirm);
    window.addEventListener("show-prompt", handlePrompt);

    return () => {
      window.removeEventListener("show-toast", handleToast);
      window.removeEventListener("dismiss-toast", handleDismissToast);
      window.removeEventListener("show-confirm", handleConfirm);
      window.removeEventListener("show-prompt", handlePrompt);
    };
  }, []);

  const toggleExpand = (id: string | number) => {
    setExpandedToasts((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleConfirmClose = (result: boolean) => {
    if (confirmData) {
      confirmData.resolve(result);
      setConfirmData(null);
    }
  };

  const handlePromptClose = (result: string | null) => {
    if (promptData) {
      promptData.resolve(result);
      setPromptData(null);
      setPromptValue("");
    }
  };

  return (
    <>
      {/* ── Toast Containers (Notification Design System) ── */}
      <div style={styles.toastContainer}>
        {toasts.map((t) => {
          const isExpanded = !!expandedToasts[t.id];
          return (
            <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }}>
              <div style={styles.toastHeader}>
                <div style={styles.iconWrapper}>
                  {t.type === "success" && <CheckCircle size={18} color="#16a34a" />}
                  {t.type === "loading" && <Loader2 size={18} color="#3b82f6" style={{ animation: "spin 1s linear infinite" }} />}
                  {t.type === "error" && <AlertCircle size={18} color="#dc2626" />}
                  {t.type === "warning" && <AlertTriangle size={18} color="#d97706" />}
                  {t.type === "info" && <Info size={18} color="#2563eb" />}
                </div>
                
                <div style={styles.contentWrapper}>
                  <span style={styles.toastMessage}>{t.message}</span>
                  {t.details && (
                    <button onClick={() => toggleExpand(t.id)} style={styles.detailsToggle}>
                      {isExpanded ? (
                        <>Hide Details <ChevronUp size={12} /></>
                      ) : (
                        <>View Details <ChevronDown size={12} /></>
                      )}
                    </button>
                  )}
                </div>

                <button
                  onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
                  style={styles.closeBtn}
                  aria-label="Close notification"
                >
                  <X size={15} />
                </button>
              </div>

              {t.details && isExpanded && (
                <div style={styles.detailsBox}>
                  <code>{t.details}</code>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Confirm Popup Overlay ── */}
      {confirmData && (
        <div style={styles.overlay} onClick={() => handleConfirmClose(false)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Confirm Action</h3>
            <p style={styles.dialogBody}>{confirmData.message}</p>
            <div style={styles.actions}>
              <button style={styles.cancelBtn} onClick={() => handleConfirmClose(false)}>
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={() => handleConfirmClose(true)}>
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Prompt Popup Overlay ── */}
      {promptData && (
        <div style={styles.overlay} onClick={() => handlePromptClose(null)}>
          <div style={styles.dialog} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.dialogTitle}>Input Required</h3>
            <p style={styles.dialogBody}>{promptData.message}</p>
            <input
              style={styles.input}
              type="text"
              value={promptValue}
              onChange={(e) => setPromptValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handlePromptClose(promptValue);
                if (e.key === "Escape") handlePromptClose(null);
              }}
              autoFocus
            />
            <div style={styles.actions}>
              <button style={styles.cancelBtn} onClick={() => handlePromptClose(null)}>
                Cancel
              </button>
              <button style={styles.confirmBtn} onClick={() => handlePromptClose(promptValue)}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  toastContainer: {
    position: "fixed",
    top: 24,
    right: 24,
    zIndex: 100000,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    pointerEvents: "none",
    maxWidth: 400,
    width: "100%",
  },
  toast: {
    pointerEvents: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    padding: "14px 16px",
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: "solid",
    boxShadow: "0 10px 30px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)",
    animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
    backgroundColor: "#ffffff",
    transition: "all 0.2s ease",
  },
  toastHeader: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    width: "100%",
  },
  iconWrapper: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
    flexShrink: 0,
  },
  contentWrapper: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  toastMessage: {
    fontSize: 13.5,
    fontWeight: 500,
    color: "#0f172a",
    lineHeight: 1.45,
  },
  detailsToggle: {
    background: "none",
    border: "none",
    padding: 0,
    color: "#64748b",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    width: "fit-content",
    marginTop: 2,
  },
  detailsBox: {
    backgroundColor: "rgba(0, 0, 0, 0.04)",
    padding: "8px 10px",
    borderRadius: 6,
    fontSize: 11.5,
    fontFamily: "monospace",
    color: "#334155",
    maxHeight: 120,
    overflowY: "auto",
    wordBreak: "break-all",
    marginTop: 4,
    border: "1px solid rgba(0,0,0,0.06)",
  },
  closeBtn: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    padding: 2,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    flexShrink: 0,
    transition: "color 0.15s, background-color 0.15s",
  },
  info: {
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
  },
  success: {
    backgroundColor: "#f0fdf4",
    borderColor: "#bbf7d0",
  },
  error: {
    backgroundColor: "#fef2f2",
    borderColor: "#fec2d2",
  },
  warning: {
    backgroundColor: "#fffbeb",
    borderColor: "#fde68a",
  },
  loading: {
    backgroundColor: "#f8fafc",
    borderColor: "#cbd5e1",
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    backdropFilter: "blur(4px)",
    zIndex: 99999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    animation: "fadeIn 0.2s ease-out",
  },
  dialog: {
    backgroundColor: "#fff",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    padding: 24,
    maxWidth: 400,
    width: "90%",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
    animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  dialogBody: {
    fontSize: 14,
    color: "#475569",
    margin: 0,
    lineHeight: 1.5,
  },
  input: {
    width: "100%",
    border: "1.5px solid #e2e8f0",
    borderRadius: 6,
    padding: "10px 12px",
    fontSize: 14,
    outline: "none",
    color: "#0f172a",
    fontFamily: "inherit",
  },
  actions: {
    display: "flex",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background-color 0.15s",
  },
  confirmBtn: {
    backgroundColor: "#0f172a",
    color: "#fff",
    border: "none",
    padding: "8px 16px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    transition: "background-color 0.15s",
  },
};
