"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useEditorState, previewRouteUrl } from "@/hooks/useEditorState";
import { useVoiceRecognition } from "@/hooks/useVoiceRecognition";
import { translateDocument, summarizeDocument } from "@/lib/api";
import TypeBadge from "@/components/editor/TypeBadge";
import {
  ReceiptFields,
  ClientDocFields,
  ComplianceFields,
  InvoiceFields,
  TimelineFields,
} from "@/components/editor/EditorForms";
import { AiValidationPanel } from "@/components/editor/AiValidationPanel";
import { HistoryPanel } from "@/components/HistoryPanel";
import { DocumentPreview } from "@/components/editor/DocumentPreview";
import { saveVersion } from "@/lib/api";
import { Clock, MessageSquareText, Languages, Download, Share2, ExternalLink, Save, Play, Mic, ChevronDown, FileText, FileCode, FileSpreadsheet, Loader2, Sparkles } from "lucide-react";
import ChatPanel from "./ChatPanel";
import { notify } from "@/lib/notify";

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

  // History state
  const [historyOpen, setHistoryOpen] = useState(false);
  const [previewVersion, setPreviewVersion] = useState<any>(null);
  const [savingSnapshot, setSavingSnapshot] = useState(false);

  // Chat state
  const [chatOpen, setChatOpen] = useState(false);

  // Translation state
  const [selectedLanguage, setSelectedLanguage] = useState("Hindi");
  const [translating, setTranslating] = useState(false);

  // Summary state
  const [summarizing, setSummarizing] = useState(false);

  // Export state
  const [exportOpen, setExportOpen] = useState(false);

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
        // Backend already saved to Firestore — just update local state + refresh preview
        for (const [k, v] of Object.entries(newContent)) {
          updateField(k, v);
        }
        // No need to call handleSave() again — backend already persisted the translation
        alert("Document successfully translated!");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Translation failed. Please try again.";
      alert(`Error: ${msg}`);
    } finally {
      setTranslating(false);
    }
  };

  const handleSummarize = async () => {
    if (summarizing) return;
    setSummarizing(true);
    try {
      const res = await summarizeDocument(id);
      if (res.data && res.data.summary !== undefined && res.data.summary.trim() !== '') {
        updateField('summary', res.data.summary.trim());
        // Explicitly save so summary is persisted immediately (not just debounced)
        await handleSave();
        alert("AI summary successfully generated!");
      } else {
        alert("Error: AI returned an empty summary. Please try again.");
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || "Summary generation failed. Please try again.";
      alert(`Error: ${msg}`);
    } finally {
      setSummarizing(false);
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

  const handleExport = async (format: 'pdf' | 'json' | 'csv' | 'excel') => {
    const missing = getMissingFields();
    if (missing.length > 0) {
      alert(`Please fill in the following required fields before exporting:\n- ${missing.join('\n- ')}`);
      return;
    }

    const formatUpper = format.toUpperCase();
    const toastId = notify.loading(`⏳ Exporting ${formatUpper}...`);

    try {
      if (format === 'pdf') {
        setTimeout(() => {
          window.open(`/api/doc/${id}/preview?autoprint=1`, "_blank");
          notify.success(`✅ PDF exported successfully.`, { id: toastId });
        }, 600);
        return;
      }

      const res = await fetch(`/api/doc/${id}/export?format=${format}`);
      if (!res.ok) throw new Error(`Export failed (${res.status})`);

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const disp = res.headers.get('Content-Disposition');
      let filename = `export_${id}.${format === 'excel' ? 'xlsx' : format}`;
      if (disp && disp.includes('filename=')) {
        const match = disp.match(/filename="?([^"]+)"?/);
        if (match && match[1]) filename = match[1];
      } else {
        const templateType = doc?.template_type || 'Document';
        const rawTitle = doc?.project_name || doc?.title || doc?.subject || `doc_${id}`;
        const safeTitle = rawTitle.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
        const dateStr = new Date().toISOString().split('T')[0];
        filename = `${templateType}_${safeTitle}_${dateStr}.${format === 'excel' ? 'xlsx' : format}`;
      }

      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      notify.success(`✅ ${formatUpper} exported successfully.`, { id: toastId });
    } catch (err: any) {
      console.error(`Error exporting ${format}:`, err);
      notify.error(`⚠️ Failed to export ${formatUpper}: ${err.message || 'Server error'}`, { id: toastId });
    }
  };

  const handleDownloadPDF = () => handleExport('pdf');

  const handleSaveSnapshot = async () => {
    const reason = await window.prompt("Enter a reason for this snapshot (optional):", "Manual Save");
    if (reason === null) return;
    setSavingSnapshot(true);
    try {
      // make sure current changes are saved first
      if (dirty) {
        await handleSave();
      }
      await saveVersion(id, reason || "Manual Save");
      // if history is open, we need to refresh it. Easiest way is to just let the user see it when they open it,
      // or we can reload versions if historyOpen is true. We'll let HistoryPanel reload when it mounts.
      alert("Version saved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to save version.");
    } finally {
      setSavingSnapshot(false);
    }
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: '#f8fafc', overflow: 'hidden', fontFamily: 'system-ui, sans-serif' }}>
      
      {/* === Topbar === */}
      <div style={s.topbar}>
        <div style={s.topLeft}>
          <span 
            style={{...s.docName, cursor: "pointer"}} 
            title="Click to rename"
            onClick={() => {
              const currentName = content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document";
              setRenameInput(currentName);
              setRenaming(true);
            }}
          >
            {content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document"}
          </span>
          <button
            style={{ border: "none", background: "none", padding: "2px", display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => {
              const currentName = content?.project_name || content?.title || content?.subject || content?.service_name || doc.project_name || "Untitled Document";
              setRenameInput(currentName);
              setRenaming(true);
            }}
            title="Rename document"
          >
            <PencilIcon size={14} color="#94a3b8" />
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

          {/* Primary Actions */}
          <div style={{ position: 'relative' }}>
            <button style={s.btnOutline} onClick={() => setExportOpen(!exportOpen)}>
              <Download size={14} style={{ marginRight: 6 }} /> Export <ChevronDown size={14} style={{ marginLeft: 6 }} />
            </button>
            {exportOpen && (
              <>
                <div style={s.dropdownOverlay} onClick={() => setExportOpen(false)} />
                <div style={s.dropdownMenu}>
                  <button style={s.dropdownItem} onClick={() => { setExportOpen(false); handleExport('pdf'); }}>
                    <FileText size={15} color="#e11d48" /> Export as PDF Document
                  </button>
                  <button style={s.dropdownItem} onClick={() => { setExportOpen(false); handleExport('json'); }}>
                    <FileCode size={15} color="#2563eb" /> Export as JSON Payload
                  </button>
                  <button style={s.dropdownItem} onClick={() => { setExportOpen(false); handleExport('csv'); }}>
                    <FileText size={15} color="#d97706" /> Export as CSV Table
                  </button>
                  <button style={s.dropdownItem} onClick={() => { setExportOpen(false); handleExport('excel'); }}>
                    <FileSpreadsheet size={15} color="#16a34a" /> Export as Excel Sheet
                  </button>
                </div>
              </>
            )}
          </div>
          <button style={s.btnOutline} onClick={handleCopyLink}>
            <Share2 size={14} style={{ marginRight: 6 }} /> {copied ? "Copied!" : "Share link"}
          </button>
          <a href={previewRouteUrl(id)} target="_blank" style={s.btnOutline}>
            <ExternalLink size={14} style={{ marginRight: 6 }} /> Open
          </a>

          <div style={s.topDivider} />

          {/* Secondary Actions */}
          <button style={s.btnOutline} onClick={handleSaveSnapshot} disabled={savingSnapshot}>
            <Save size={14} style={{ marginRight: 6 }} /> {savingSnapshot ? "Saving..." : "Save Snapshot"}
          </button>
          <button
            style={chatOpen ? { ...s.btnOutline, background: "#f1f5f9" } : s.btnOutline}
            onClick={() => setChatOpen(!chatOpen)}
          >
            <MessageSquareText size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
            Chat
          </button>
        </div>
      </div>

      {/* === Main layout === */}
      <div style={s.panels}>
        {/* === Left prompt / voice column === */}
        <div style={s.promptBox}>
          
          {/* Card 1: AI Prompt Fill */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>
              Document Generator
            </h3>
            <textarea
              style={s.promptTextarea as React.CSSProperties}
              rows={4}
              placeholder={`Describe the document you want...\n\nExample:\n"Generate a software consulting invoice..."`}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <button
              style={generating ? s.btnGeneratingFull : s.btnGeneratePurple}
              onClick={handlePromptRefill}
              disabled={generating || !prompt.trim()}
            >
              {generating ? (
                <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} />
              ) : (
                <FileText size={14} style={{ marginRight: 6 }} />
              )}
              {generating ? "Generating..." : "Generate Document"}
            </button>
            
            {!listening && !generating && (
              <button style={s.btnOutlinePurple} onClick={startVoice}>
                <Mic size={14} style={{ marginRight: 6 }} /> Start speaking
              </button>
            )}

            {listening && (
              <>
                <div style={listeningBanner}>
                  <div style={pulseDot} />
                  <span style={{ fontSize: 12, color: "#ef4444", fontWeight: 600 }}>
                    Listening... speak clearly
                  </span>
                </div>

                {transcript && (
                  <div style={transcriptBox}>
                    <span style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                      Heard so far:
                    </span>
                    {transcript}
                  </div>
                )}

                <button style={voiceBtnStop} onClick={stopVoice}>
                  Stop & fill document
                </button>
              </>
            )}

            {!listening && !generating && transcript && (
              <div style={transcriptBox}>
                <span style={{ fontSize: 10, color: "#94a3b8", display: "block", marginBottom: 4 }}>
                  Last heard:
                </span>
                {transcript}
                <button style={manualFillBtn} onClick={handleManualFill}>
                  ✓ Fill from this
                </button>
              </div>
            )}
          </div>

          {/* Card 2: Translation */}
          <div style={s.card}>
            <h3 style={s.cardTitle}>
              Translate to
            </h3>
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
              {translating ? (
                <Loader2 size={14} style={{ marginRight: 6, animation: "spin 1s linear infinite" }} />
              ) : (
                <Languages size={14} style={{ marginRight: 6 }} />
              )}
              {translating ? "Translating..." : "Translate Document"}
            </button>
          </div>



          {/* Card 4: AI Validation */}
          {doc.template_type && (
            <AiValidationPanel 
              templateType={doc.template_type} 
              content={content} 
              onApplySuggestion={(newContent) => {
                Object.keys(newContent).forEach(key => {
                  if (newContent[key] !== content[key]) {
                    updateField(key, newContent[key]);
                  }
                });
              }}
            />
          )}



        </div>

        {/* === Left fields panel === */}
        {panelOpen && !previewVersion && (
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

        {/* === Right preview === */}
        <div style={s.rightPanel}>
          <DocumentPreview 
            url={previewRouteUrl(id, previewVersion?.id)}
            onDownload={handleDownloadPDF}
            previewKey={previewVersion ? previewVersion.id : previewKey}
          />
        </div>

        {/* ── Right Chat panel ─────────────────────────────────── */}
        {chatOpen && (
          <ChatPanel docId={id} onClose={() => setChatOpen(false)} />
        )}
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

// === STYLES ===
const s: Record<string, React.CSSProperties> = {
  centerScreen: {
    height: "100vh", display: "flex", flexDirection: "column",
    alignItems: "center", justifyContent: "center", background: "#f8fafc",
  },
  spinner: {
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid #e2e8f0", borderTopColor: "#6366f1",
    animation: "spin 0.8s linear infinite", marginBottom: 12,
  },
  loadingText: { fontSize: 13, color: "#64748b" },
  
  iconSidebar: {
    width: 72, background: "#fff", borderRight: "1px solid #e2e8f0",
    display: "flex", flexDirection: "column", alignItems: "center",
    padding: "20px 0", flexShrink: 0, zIndex: 10
  },
  sidebarItem: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    color: "#64748b", textDecoration: "none", background: "none", border: "none",
    width: 56, height: 56, justifyContent: "center", borderRadius: 4,
    cursor: "pointer", transition: "all 0.2s", marginBottom: 8
  },
  sidebarItemActive: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
    color: "#0f172a", textDecoration: "none", background: "#f1f5f9", border: "none",
    width: 56, height: 56, justifyContent: "center", borderRadius: 4,
    cursor: "pointer", transition: "all 0.2s", marginBottom: 8
  },
  sidebarLabel: { fontSize: 10, fontWeight: 600 },

  topbar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "0 24px", height: 60, background: "#fff", borderBottom: "1px solid #e2e8f0",
    flexShrink: 0, gap: 12,
  },
  topLeft: { display: "flex", alignItems: "center", gap: 8, minWidth: 0 },
  topRight: { display: "flex", alignItems: "center", gap: 8, flexShrink: 0 },
  topDivider: { width: 1, height: 20, background: "#e2e8f0" },
  docName: {
    fontSize: 14, fontWeight: 700, color: "#1e293b", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis", maxWidth: 200,
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  unsavedDot: { width: 7, height: 7, borderRadius: "50%", background: "#f59e0b", flexShrink: 0 },
  
  btnSave: {
    fontSize: 13, fontWeight: 600, background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 4, padding: "8px 16px", cursor: "pointer",
  },
  btnSavingDisabled: { fontSize: 13, background: "#94a3b8", color: "#fff", border: "none", borderRadius: 4, padding: "8px 16px" },
  btnSaveFull: {
    width: "100%", fontSize: 13, fontWeight: 600, background: "#1e293b",
    color: "#fff", border: "none", borderRadius: 4, padding: "10px 0", cursor: "pointer",
  },
  dropdownOverlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0, zIndex: 99
  },
  dropdownMenu: {
    position: "absolute", top: "100%", left: 0, marginTop: 6,
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8,
    boxShadow: "0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.05)",
    zIndex: 100, minWidth: 180, display: "flex", flexDirection: "column",
    padding: "6px 0",
  },
  dropdownItem: {
    padding: "9px 16px", background: "none", border: "none",
    textAlign: "left", fontSize: 13, fontWeight: 500, color: "#1e293b", cursor: "pointer",
    display: "flex", alignItems: "center", gap: 10, textDecoration: "none",
    transition: "background 0.15s",
  },
  btnPrimary: {
    fontSize: 13, fontWeight: 600, background: "#1e293b", color: "#fff",
    border: "none", borderRadius: 4, padding: "10px 20px", cursor: "pointer",
  },
  btnOutline: {
    display: "flex", alignItems: "center", gap: 6,
    fontSize: 13, fontWeight: 500, color: "#475569", background: "#fff", border: "1px solid #e2e8f0",
    borderRadius: 4, padding: "8px 14px", cursor: "pointer", textDecoration: "none",
  },
  savedPill: { fontSize: 12, color: "#10b981", fontWeight: 600 },
  
  panels: { display: "flex", flex: 1, overflow: "hidden", minHeight: 0 },
  
  promptBox: {
    width: 320, background: "#f8fafc", display: "flex", flexDirection: "column",
    overflowY: "auto", padding: "20px 16px", gap: 16, borderRight: "1px solid #e2e8f0", flexShrink: 0,
  },
  card: {
    background: "#fff", borderRadius: 4, padding: "20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)", border: "1px solid #e2e8f0",
    display: "flex", flexDirection: "column", gap: 12
  },
  cardTitle: {
    fontSize: 14, fontWeight: 700, color: "#1e293b", margin: 0,
    display: "flex", alignItems: "center", gap: 6,
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  promptTextarea: {
    width: "100%", border: "1px solid #e2e8f0", borderRadius: 4, padding: "10px 12px",
    fontSize: 13, color: "#334155", outline: "none", fontFamily: "inherit",
    lineHeight: 1.5, resize: "none", background: "#f8fafc", height: "100px",
  },
  btnGeneratePurple: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", fontSize: 13, fontWeight: 600, background: "#0f172a",
    color: "#fff", border: "none", borderRadius: 4, padding: "10px 0", cursor: "pointer",
    transition: "background 0.2s"
  },
  btnGeneratingFull: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", fontSize: 13, fontWeight: 600, background: "#0f172a",
    color: "#fff", border: "none", borderRadius: 4, padding: "10px 0", cursor: "not-allowed",
    opacity: 0.75,
  },
  btnOutlinePurple: {
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    width: "100%", fontSize: 13, fontWeight: 600, background: "#fff", color: "#0f172a",
    border: "1px solid #e2e8f0", borderRadius: 4, padding: "10px 0", cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.02)", transition: "background 0.2s"
  },

  leftPanel: {
    width: 360, display: "flex", flexDirection: "column", background: "#fff",
    borderRight: "1px solid #e2e8f0", flexShrink: 0, overflow: "hidden",
  },
  panelHeader: { padding: "20px 24px 16px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 },
  panelTitle: { fontSize: 14, fontWeight: 700, color: "#1e293b", display: "block", marginBottom: 4, fontFamily: '"TT Hoves", system-ui, sans-serif' },
  panelSubtitle: { fontSize: 12, color: "#64748b" },
  panelScroll: { flex: 1, overflowY: "auto", padding: "16px 24px" },
  saveFooter: { padding: "16px 24px", borderTop: "1px solid #f1f5f9", flexShrink: 0 },
  
  rightPanel: {
    flex: 1, display: "flex", flexDirection: "column",
    padding: 24, overflow: "hidden", minHeight: 0, background: "#f1f5f9"
  },
  pdfHeader: {
    display: "flex", alignItems: "center", gap: 16, marginBottom: 16,
    background: "#fff", padding: "8px 16px", borderRadius: 4, border: "1px solid #e2e8f0"
  },
  pdfZoomGroup: {
    display: "flex", alignItems: "center", gap: 8, border: "1px solid #e2e8f0", borderRadius: 4, padding: "4px"
  },
  pdfBtn: {
    background: "none", border: "none", color: "#475569", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", width: 24, height: 24, borderRadius: 4
  },
  pdfBtnOutline: {
    background: "#fff", border: "1px solid #e2e8f0", color: "#475569", cursor: "pointer",
    padding: "6px 12px", borderRadius: 4, fontSize: 12, fontWeight: 500
  },
  pdfZoomText: { fontSize: 12, fontWeight: 600, color: "#1e293b", width: 40, textAlign: "center" },

  iframeWrap: {
    flex: 1, borderRadius: 4, overflow: "hidden", border: "1px solid #e2e8f0",
    background: "#fff", minHeight: 0, display: "flex", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05)"
  },
  iframe: { width: "100%", height: "100%", border: "none" },
  previewBanner: {
    background: "#fef3c7", color: "#92400e", padding: "12px 16px",
    borderRadius: 4, marginBottom: 16, display: "flex",
    justifyContent: "space-between", alignItems: "center",
    border: "1px solid #fde68a"
  },
  previewBannerText: { fontSize: 14 },
};

const voiceWrap: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px" };
const transcriptBox: React.CSSProperties = { fontSize: 12, color: "#555", background: "#f0f0f0", borderRadius: 4, padding: "8px 10px", lineHeight: 1.5 };
const summaryDisplayBox: React.CSSProperties = {
  fontSize: 13, color: "#334155", background: "#f8fafc", borderRadius: 6,
  padding: "12px 14px", lineHeight: 1.7, border: "1px solid #e2e8f0",
  fontStyle: "italic",
};
const summaryEmptyBox: React.CSSProperties = {
  fontSize: 12, color: "#94a3b8", background: "#f8fafc", borderRadius: 6,
  padding: "14px", lineHeight: 1.6, border: "1px dashed #cbd5e1",
  textAlign: "center",
};
const summaryLoadingBox: React.CSSProperties = {
  display: "flex", alignItems: "center", gap: 10, background: "#f8fafc",
  borderRadius: 6, padding: "14px", border: "1px solid #e2e8f0",
};
const pulseDot: React.CSSProperties = { width: 10, height: 10, borderRadius: "50%", background: "#e74c3c", animation: "pulse 1s ease infinite" };
const voiceBtnStart: React.CSSProperties = { width: "100%", fontSize: 13, fontWeight: 600, color: "#fff", background: "#111", border: "none", borderRadius: 4, padding: "12px 0", cursor: "pointer", transition: "all 0.2s" };
const voiceBtnStop: React.CSSProperties = { width: "100%", fontSize: 13, fontWeight: 700, color: "#fff", background: "#e74c3c", border: "none", borderRadius: 4, padding: "12px 0", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 2px 8px rgba(231,76,60,0.35)" };
const listeningBanner: React.CSSProperties = { display: "flex", alignItems: "center", gap: 8, background: "#fdecea", border: "1px solid #f5c6c0", borderRadius: 4, padding: "8px 10px" };
const manualFillBtn: React.CSSProperties = { marginTop: 8, width: "100%", fontSize: 12, fontWeight: 600, background: "#0f172a", color: "#fff", border: "none", borderRadius: 4, padding: "8px 0", cursor: "pointer" };

const translateWrap: React.CSSProperties = {
  padding: "12px 16px", borderTop: "1px solid #f0f0f0", display: "flex",
  flexDirection: "column", gap: 8,
};
const translateSelect: React.CSSProperties = {
  width: "100%", border: "1px solid #e2e8f0", borderRadius: 4, padding: "10px 12px",
  fontSize: 13, color: "#334155", outline: "none", fontFamily: "inherit",
  background: "#fafafa", cursor: "pointer",
};
const translateBtn: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  width: "100%", fontSize: 13, fontWeight: 600, background: "#0f172a", color: "#fff",
  border: "none", borderRadius: 4, padding: "10px 0", cursor: "pointer",
  transition: "background 0.2s"
};
const translateBtnDisabled: React.CSSProperties = {
  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
  width: "100%", fontSize: 13, fontWeight: 600, background: "#0f172a", color: "#fff",
  border: "none", borderRadius: 4, padding: "10px 0", cursor: "not-allowed",
  opacity: 0.75,
};

const modalStyles = {
  overlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" } as React.CSSProperties,
  content: { background: "#fff", borderRadius: 4, padding: 24, width: 340, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" } as React.CSSProperties,
  title: { fontSize: 16, fontWeight: 700, color: "#111", margin: "0 0 16px", fontFamily: '"TT Hoves", system-ui, sans-serif' } as React.CSSProperties,
  input: { width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 4, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit" } as React.CSSProperties,
  actions: { display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 20 } as React.CSSProperties,
  cancel: { background: "#f5f5f5", color: "#555", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
  save: { background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 } as React.CSSProperties,
};
