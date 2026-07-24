"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEditorState, previewRouteUrl } from "@/hooks/useEditorState";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { translateDocument } from "@/lib/api";
import TypeBadge from "@/components/editor/TypeBadge";
import {
  ReceiptFields,
  ClientDocFields,
  ComplianceFields,
  InvoiceFields,
  TimelineFields,
} from "@/components/editor/EditorForms";

const TYPE_LABELS: Record<string, string> = {
  receipt_template: "Receipt Template",
  client_doc: "Client Proposal",
  compliance: "Service Agreement",
  invoice: "Invoice",
  timeline: "Project Timeline",
};

const LANGUAGES = [
  "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam",
  "Marathi", "Bengali", "Gujarati", "Punjabi", "Odia",
  "English",
];

function PencilIcon({ size = 14, color = "#666" }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}

export default function DocumentEditor() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();

  const {
    doc,
    content,
    previewKey,
    loading,
    saving,
    saved,
    dirty,
    updateField,
    handleSave,
    handleRefill,
  } = useEditorState(id);

  const {
    listening,
    transcript,
    generating,
    setGenerating,
    startVoice,
    stopVoice,
    handleManualFill,
  } = useVoiceRecognition(id, async (text) => {
    await handleRefill(text);
  });

  const [panelOpen, setPanelOpen] = useState(true);
  const [promptOpen, setPromptOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameInput, setRenameInput] = useState("");

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
  const [translating, setTranslating] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveRename = () => {
    const newName = renameInput.trim();
    if (!newName) {
      setRenaming(false);
      return;
    }
    let key = "project_name";
    if (doc.template_type === "compliance") key = "client_name";
    if (doc.template_type === "receipt_template") key = "for_service";
    if (doc.template_type === "developer_doc") key = "title";
    
    updateField(key, newName);
    setRenaming(false);
  };

  const handlePromptRefill = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      await handleRefill(prompt);
      setPrompt("");
    } finally {
      setGenerating(false);
    }
  };

  const handleTranslate = async () => {
    if (!selectedLanguage || translating) return;
    setTranslating(true);
    try {
      const res = await translateDocument(id, selectedLanguage);
      const newContent = res.data.content;
      if (newContent && typeof newContent === "object") {
        // Directly update content — no second AI call needed
        for (const [k, v] of Object.entries(newContent)) {
          updateField(k, v);
        }
        // Save the translated content immediately
        await handleSave();
      }
    } catch {
      alert("Translation failed. Please try again.");
    } finally {
      setTranslating(false);
    }
  };

  const getMissingFields = () => {
    if (!content) return [];
    const missing: string[] = [];
    const check = (key: string, label: string) => {
      const val = content[key];
      if (val === undefined || val === null || String(val).trim() === "") {
        missing.push(label);
      }
    };
    
    if (doc?.template_type === "invoice") {
      check("invoice_number", "Invoice Number");
      check("date", "Date");
      check("project_name", "Project Name");
      check("client_name", "Client Name");
    } else if (doc?.template_type === "receipt_template") {
      check("receipt_number", "Receipt Number");
      check("date", "Date");
      check("for_service", "For Service");
      check("client_name", "Client Name");
      check("amount_received", "Amount Received");
    } else if (doc?.template_type === "client_doc") {
      check("client_name", "Client Name");
      check("date", "Date");
      check("project_name", "Project Name");
    } else if (doc?.template_type === "compliance") {
      check("client_name", "Client Name");
    } else if (doc?.template_type === "timeline") {
      check("project_name", "Project Name");
      check("client_name", "Client Name");
    }
    
    return missing;
  };

  const handleDownloadPDF = () => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      alert(`Please fill in the following required fields before downloading:\n- ${missing.join('\n- ')}`);
      return;
    }
    window.open(`/api/doc/${id}/preview?autoprint=1`, "_blank");
  };

  if (loading) {
    return (
      <div style={s.centerScreen}>
        <div style={s.spinner} />
        <p style={s.loadingText}>Loading document...</p>
      </div>
    );
  }

  if (!doc) {
    return (
      <div style={s.centerScreen}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "#111", marginBottom: 8 }}>
          Document not found
        </p>
        <p style={{ fontSize: 13, color: "#888", marginBottom: 24 }}>
          This link may have expired or been deleted.
        </p>
        <button style={s.btnPrimary} onClick={() => router.push("/")}>
          ← Back to home
        </button>
      </div>
    );
  }

  return (
    <div style={s.page}>
      {/* ── Topbar ─────────────────────────────────────────────── */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <div style={s.topDivider} />
          <span style={s.docName} title={content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document"}>
            {content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document"}
          </span>
          <button
            style={{ ...s.btnIcon, border: "none", background: "none", padding: "2px", display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => {
              const currentName = content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document";
              setRenameInput(currentName);
              setRenaming(true);
            }}
            title="Rename document"
          >
            <PencilIcon size={14} color="#888" />
          </button>
          <TypeBadge type={doc.template_type} />
          {dirty && <span style={s.unsavedDot} title="Unsaved changes" />}
        </div>

        <div style={s.topRight}>
          {dirty && (
            <button
              style={saving ? s.btnSavingDisabled : s.btnSave}
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save changes"}
            </button>
          )}
          {saved && !dirty && <span style={s.savedPill}>✓ Saved</span>}

          <button
            style={s.btnIcon}
            onClick={() => setPanelOpen((p) => !p)}
            title={panelOpen ? "Hide editor" : "Show editor"}
          >
            {panelOpen ? "◀" : "▶"}
          </button>

          <button style={s.btnOutline} onClick={handleCopyLink}>
            {copied ? "Copied!" : "Share link"}
          </button>

          <button style={s.btnOutline} onClick={handleDownloadPDF}>
            ⬇ Download PDF
          </button>

          <a href={previewRouteUrl(id)} target="_blank" style={s.btnOutline}>
            Open ↗
          </a>

          {/* All docs navigation — was missing */}
          <Link href="/documents" style={s.btnOutline}>
            All docs
          </Link>
        </div>
      </div>

      {/* ── Main layout ─────────────────────────────────────────── */}
      <div style={s.panels}>
        {/* ── Left prompt / voice column ──────────────────────── */}
        <div style={s.promptBox}>
          {/* AI Prompt Fill */}
          <button style={s.promptToggle} onClick={() => setPromptOpen((p) => !p)}>
            ✦ {promptOpen ? "Close AI fill" : "Fill with AI prompt"}
          </button>

          {promptOpen && (
            <div style={s.promptInner}>
              <textarea
                style={s.promptTextarea as React.CSSProperties}
                rows={4}
                placeholder={`Example:\n"Client: Rahul Sharma, Project: Ayurvedic app with AI skin analysis, 3 months, budget ₹5L, 40-30-30 payment split"`}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
              <button
                style={generating ? s.btnGeneratingFull : s.btnGenerateFull}
                onClick={handlePromptRefill}
                disabled={generating || !prompt.trim()}
              >
                {generating ? "Generating..." : "Generate & Fill"}
              </button>
            </div>
          )}

          {/* Voice Recognition */}
          <div style={voiceWrap}>
            {!listening && !generating && (
              <button style={voiceBtnStart} onClick={startVoice}>
                🎙 Start speaking
              </button>
            )}

            {listening && (
              <>
                <div style={listeningBanner}>
                  <div style={pulseDot} />
                  <span style={{ fontSize: 12, color: "#e74c3c", fontWeight: 600 }}>
                    Listening... speak clearly
                  </span>
                </div>

                {transcript && (
                  <div style={transcriptBox}>
                    <span style={{ fontSize: 10, color: "#aaa", display: "block", marginBottom: 4 }}>
                      Heard so far:
                    </span>
                    {transcript}
                  </div>
                )}

                <button style={voiceBtnStop} onClick={stopVoice}>
                  ⏹ Stop & fill document
                </button>
              </>
            )}

            {generating && (
              <div style={processingBanner}>
                <div style={spinnerDot} />
                <span style={{ fontSize: 12, color: "#555", fontWeight: 600 }}>
                  Filling your document...
                </span>
              </div>
            )}

            {!listening && !generating && transcript && (
              <div style={transcriptBox}>
                <span style={{ fontSize: 10, color: "#aaa", display: "block", marginBottom: 4 }}>
                  Last heard:
                </span>
                {transcript}
                <button style={manualFillBtn} onClick={handleManualFill}>
                  ✓ Fill from this
                </button>
              </div>
            )}
          </div>

          {/* Translation — was missing */}
          <div style={translateWrap}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#aaa", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
              Translate document
            </div>
            <select
              style={translateSelect as React.CSSProperties}
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
            <button
              style={translating ? translateBtnDisabled : translateBtn}
              onClick={handleTranslate}
              disabled={translating}
            >
              {translating ? "Translating..." : "Translate"}
            </button>
          </div>
        </div>

        {/* ── Left fields panel ───────────────────────────────── */}
        {panelOpen && (
          <div style={s.leftPanel}>
            <div style={s.panelHeader}>
              <span style={s.panelTitle}>Edit content</span>
              <span style={s.panelSubtitle}>{TYPE_LABELS[doc.template_type] || doc.template_type}</span>
            </div>
            <div style={s.panelScroll}>
              {doc.template_type === "receipt_template" && <ReceiptFields content={content} update={updateField} />}
              {doc.template_type === "client_doc" && <ClientDocFields content={content} update={updateField} />}
              {doc.template_type === "compliance" && <ComplianceFields content={content} update={updateField} />}
              {doc.template_type === "invoice" && <InvoiceFields content={content} update={updateField} />}
              {doc.template_type === "timeline" && <TimelineFields content={content} update={updateField} />}
            </div>

            {dirty && (
              <div style={s.saveFooter}>
                <button
                  style={saving ? s.btnSavingDisabled : s.btnSaveFull}
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Right preview ────────────────────────────────────── */}
        {/* key={previewKey} forces the iframe to reload from /api/doc/[id]/preview
            after every save, refill, or translation — always showing fresh content. */}
        <div style={s.rightPanel}>
          <div style={s.iframeWrap}>
            <iframe
              key={previewKey}
              src={previewRouteUrl(id)}
              style={s.iframe}
              title="Document preview"
            />
          </div>
        </div>
      </div>
      
      {/* ── Rename Modal ── */}
      {renaming && (
        <div style={modalStyles.overlay} onClick={() => setRenaming(false)}>
          <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
            <h3 style={modalStyles.title}>Rename Document</h3>
            <input 
              autoFocus
              style={modalStyles.input as React.CSSProperties}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => {
                 if (e.key === 'Enter') handleSaveRename();
                 if (e.key === 'Escape') setRenaming(false);
              }}
              onFocus={e => e.target.select()}
            />
            <div style={modalStyles.actions}>
              <button style={modalStyles.cancel} onClick={() => setRenaming(false)}>Cancel</button>
              <button style={modalStyles.save} onClick={handleSaveRename}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const s: Record<string, React.CSSProperties> = {
  centerScreen: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#f7f7f7",
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #e0e0e0", borderTopColor: "#111",
    animation: "spin 0.8s linear infinite", marginBottom: 12,
  },
  loadingText: { fontSize: 13, color: "#888" },
  promptBox: {
    borderRight: "1px solid #f0f0f0", flexShrink: 0, width: "300px",
    background: "#fff", display: "flex", flexDirection: "column", overflowY: "auto",
  },
  promptToggle: {
    width: "100%", textAlign: "left", padding: "10px 16px", fontSize: 12,
    fontWeight: 600, color: "#131415", background: "#f5f3ff", border: "none",
    cursor: "pointer", borderBottom: "1px solid #fbfbfd",
  },
  promptInner: { padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8, background: "#fafafa" },
  promptTextarea: {
    width: "100%", border: "1px solid #e8e8e8", borderRadius: 6, padding: "8px 10px",
    fontSize: 12, color: "#333", outline: "none", fontFamily: "inherit",
    lineHeight: 1.5, resize: "vertical", background: "#fff", height: "150px",
  },
  btnGenerateFull: {
    width: "100%", fontSize: 13, fontWeight: 600, background: "#141415",
    color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer",
  },
  btnGeneratingFull: {
    width: "100%", fontSize: 13, background: "#121314",
    color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "not-allowed",
  },
  page: { height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "#f7f7f7" },
  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 16px", height: 52, background: "#fff", borderBottom: "1px solid #e8e8e8",
    flexShrink: 0, gap: 12,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 10, minWidth: 0 },
  topRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  topDivider: { width: 1, height: 20, background: "#e8e8e8" },
  docName: {
    fontSize: 14, fontWeight: 600, color: "#111", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis", maxWidth: 180,
  },
  unsavedDot: { width: 7, height: 7, borderRadius: "50%", background: "#f39c12", flexShrink: 0 },
  btnSave: {
    fontSize: 13, fontWeight: 600, background: "#111", color: "#fff",
    border: "none", borderRadius: 7, padding: "6px 16px", cursor: "pointer",
  },
  btnSavingDisabled: { fontSize: 13, background: "#888", color: "#fff", border: "none", borderRadius: 7, padding: "6px 16px" },
  btnSaveFull: {
    width: "100%", fontSize: 13, fontWeight: 600, background: "#111",
    color: "#fff", border: "none", borderRadius: 8, padding: "10px 0", cursor: "pointer",
  },
  btnPrimary: {
    fontSize: 13, fontWeight: 600, background: "#111", color: "#fff",
    border: "none", borderRadius: 8, padding: "10px 20px", cursor: "pointer",
  },
  btnOutline: {
    fontSize: 12, color: "#555", background: "#fff", border: "1px solid #e0e0e0",
    borderRadius: 7, padding: "6px 12px", cursor: "pointer", textDecoration: "none",
    display: "inline-block", lineHeight: "normal", whiteSpace: "nowrap",
  },
  btnIcon: {
    fontSize: 11, color: "#888", background: "none", border: "1px solid #e8e8e8",
    borderRadius: 6, padding: "5px 8px", cursor: "pointer",
  },
  savedPill: { fontSize: 12, color: "#27ae60", fontWeight: 500 },
  panels: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 },
  leftPanel: {
    width: 300, display: "flex", flexDirection: "column", background: "#fff",
    borderRight: "1px solid #e8e8e8", flexShrink: 0, overflow: "hidden",
  },
  panelHeader: { padding: "14px 16px 10px", borderBottom: "1px solid #f0f0f0", flexShrink: 0 },
  panelTitle: { fontSize: 12, fontWeight: 700, color: "#111", display: "block", marginBottom: 2 },
  panelSubtitle: { fontSize: 11, color: "#aaa" },
  panelScroll: { flex: 1, overflowY: "auto", padding: "14px 16px" },
  saveFooter: { padding: "12px 16px", borderTop: "1px solid #f0f0f0", flexShrink: 0 },
  rightPanel: {
    flex: 1, display: "flex", flexDirection: "column",
    padding: 16, overflow: "hidden", minHeight: 0,
  },
  iframeWrap: {
    flex: 1, borderRadius: 10, overflow: "hidden", border: "1px solid #e0e0e0",
    background: "#fff", minHeight: 0, display: "flex",
  },
  iframe: { width: "100%", height: "100%", border: "none" },
};

const voiceWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px" };
const transcriptBox: React.CSSProperties = { fontSize: 12, color: "#555", background: "#f0f0f0", borderRadius: 8, padding: "8px 10px", lineHeight: 1.5 };
const pulseDot: React.CSSProperties = { width: 10, height: 10, borderRadius: "50%", background: "#e74c3c", animation: "pulse 1s ease infinite" };
const voiceBtnStart: React.CSSProperties = { width: "100%", fontSize: 13, fontWeight: 600, color: "#fff", background: "#111", border: "none", borderRadius: 8, padding: "12px 0", cursor: "pointer", transition: "all 0.2s" };
const voiceBtnStop: React.CSSProperties = { width: "100%", fontSize: 13, fontWeight: 700, color: "#fff", background: "#e74c3c", border: "none", borderRadius: 8, padding: "12px 0", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(231,76,60,0.35)" };
const listeningBanner: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "#fdecea", border: "1px solid #f5c6c0", borderRadius: 8, padding: "8px 10px" };
const processingBanner: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "#f0f0f0", border: "1px solid #e0e0e0", borderRadius: 8, padding: "8px 10px" };
const spinnerDot: React.CSSProperties = { width: 12, height: 12, borderRadius: "50%", border: "2px solid #ccc", borderTopColor: "#555", animation: "spin 0.7s linear infinite" };
const manualFillBtn: React.CSSProperties = { marginTop: 8, width: "100%", fontSize: 12, fontWeight: 600, background: "#111", color: "#fff", border: "none", borderRadius: 6, padding: "8px 0", cursor: "pointer" };

const translateWrap: React.CSSProperties = {
  padding: "12px 16px", borderTop: "1px solid #f0f0f0", display: "flex",
  flexDirection: "column", gap: 8,
};
const translateSelect: React.CSSProperties = {
  width: "100%", border: "1px solid #e8e8e8", borderRadius: 6, padding: "7px 9px",
  fontSize: 12, color: "#333", outline: "none", fontFamily: "inherit",
  background: "#fafafa", cursor: "pointer",
};
const translateBtn: React.CSSProperties = {
  width: "100%", fontSize: 12, fontWeight: 600, background: "#111", color: "#fff",
  border: "none", borderRadius: 6, padding: "8px 0", cursor: "pointer",
};
const translateBtnDisabled: React.CSSProperties = {
  width: "100%", fontSize: 12, background: "#aaa", color: "#fff",
  border: "none", borderRadius: 6, padding: "8px 0", cursor: "not-allowed",
};

const modalStyles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" } as React.CSSProperties,
  content: { background: "#fff", borderRadius: 12, padding: 24, width: 340, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" } as React.CSSProperties,
  title: { fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 16px" } as React.CSSProperties,
  input: { width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 } as React.CSSProperties,
  cancel: { background: "#f5f5f5", color: "#555", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  save: { background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
};
