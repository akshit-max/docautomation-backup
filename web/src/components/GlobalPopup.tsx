"use client";

import React, { useState, useEffect } from "react";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react";

interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
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
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmData, setConfirmData] = useState<ConfirmState | null>(null);
  const [promptData, setPromptData] = useState<PromptState | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Overriding native alert
    window.alert = (message: string) => {
      const type =
        message.toLowerCase().includes("fail") || message.toLowerCase().includes("error")
          ? "error"
          : message.toLowerCase().includes("success") || message.toLowerCase().includes("restore")
          ? "success"
          : "info";

      const event = new CustomEvent("show-alert", { detail: { message, type } });
      window.dispatchEvent(event);
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
    const handleAlert = (e: Event) => {
      const { message, type } = (e as CustomEvent).detail;
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);

      // Auto-remove after 4 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
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

    window.addEventListener("show-alert", handleAlert);
    window.addEventListener("show-confirm", handleConfirm);
    window.addEventListener("show-prompt", handlePrompt);

    return () => {
      window.removeEventListener("show-alert", handleAlert);
      window.removeEventListener("show-confirm", handleConfirm);
      window.removeEventListener("show-prompt", handlePrompt);
    };
  }, []);

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
      {/* ── Toast Containers (Hover Popups) ── */}
      <div style={styles.toastContainer}>
        {toasts.map((t) => (
          <div key={t.id} style={{ ...styles.toast, ...styles[t.type] }}>
            {t.type === "success" && <CheckCircle size={16} color="#16a34a" />}
            {t.type === "error" && <AlertCircle size={16} color="#dc2626" />}
            {t.type === "info" && <Info size={16} color="#2563eb" />}
            <span style={styles.toastMessage}>{t.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              style={styles.closeBtn}
            >
              <X size={14} />
            </button>
          </div>
        ))}
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
    maxWidth: 380,
    width: "100%",
  },
  toast: {
    pointerEvents: "auto",
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "12px 16px",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "solid",
    boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
    animation: "slideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  toastMessage: {
    fontSize: 13,
    fontWeight: 500,
    color: "#0f172a",
    flex: 1,
    lineHeight: 1.4,
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
