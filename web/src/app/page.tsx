"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { UploadCloud } from "lucide-react";
import { createDocument, uploadPDF, generateDoc, createBatch, uploadBatchFile } from "@/lib/api";
import { ProcessingTimeline } from "@/components/ProcessingTimeline";
import { ActivityBell } from "@/components/ActivityBell";

const TEMPLATES = [
  { type: "invoice",           title: "Invoice",           description: "GST invoice with line items, payment status and UPI details" },
  { type: "receipt_template",  title: "Receipt Template",  description: "Confirmation of payment received, including service details and payment status" },
  { type: "client_doc",        title: "Client Proposal",   description: "Project proposal with timeline, quotation and deliverables" },
  { type: "compliance",        title: "Service Agreement", description: "3-page service provision agreement with payment terms" },
  { type: "timeline",          title: "Project Timeline",  description: "Phase-wise project timeline with hours and closure date" },
];

type UploadPhase = "idle" | "uploading" | "ocr" | "classifying" | "generating" | "saving" | "done" | "error";

export default function Home() {
  const router = useRouter();
  const [creating, setCreating] = useState<string | null>(null);

  // ── Upload / OCR / Generate state ─────────────────────────────────────────
  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [uploadError, setUploadError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Template card handler ──────────────────────────────────────────────────
  const handleSelect = async (templateType: string) => {
    setCreating(templateType);
    try {
      const res = await createDocument(templateType);
      router.push(`/doc/${res.data.doc_id}`);
    } catch {
      alert("Failed to create document. Is the server running?");
    } finally {
      setCreating(null);
    }
  };

  // ── Upload / OCR / Generate handler ───────────────────────────────────────
  // [ARCH-DEBT: TEMPORARY UX]
  // Condition for replacement: Replace with real SSE/WebSocket progress events when Bulk Upload (Phase 9) is implemented.
  // Do not replace preemptively.
  useEffect(() => {
    let timer1: NodeJS.Timeout, timer2: NodeJS.Timeout;
    if (uploadPhase === "uploading") {
      timer1 = setTimeout(() => setUploadPhase("ocr"), 1500);
      timer2 = setTimeout(() => setUploadPhase("classifying"), 5000);
    }
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [uploadPhase]);

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    
    // Filter PDFs
    const pdfFiles = Array.from(files).filter(f => f.name.match(/\.(pdf|PDF|jpg|jpeg|png|webp)$/i));
    
    if (pdfFiles.length === 0) {
      setUploadError("Please upload a PDF or image file (JPG, PNG, WebP).");
      return;
    }

    // V1: Batch processing is not supported in this deployment.
    // The batch worker requires a persistent background process which is
    // incompatible with serverless infrastructure. Batch support is planned for V2.
    if (pdfFiles.length > 1) {
      setUploadError("Batch upload is not available in this version. Please upload one file at a time.");
      return;
    }

    // Single file — use existing synchronous pipeline
    const file = pdfFiles[0];
    try {
      setUploadError("");
      setUploadPhase("uploading");

      const uploadRes = await uploadPDF(file);
      const { extracted_text, detected_type, source_file } = uploadRes.data;

      setUploadPhase("generating");

      const genRes = await generateDoc(extracted_text, detected_type, source_file);
      const docId = genRes.data.doc_id;

      setUploadPhase("saving");
      setTimeout(() => {
        setUploadPhase("done");
        setTimeout(() => {
          router.push(`/doc/${docId}`);
        }, 400);
      }, 100);
    } catch (err: any) {
      setUploadPhase("error");
      setUploadError(
        err?.response?.data?.error || err?.friendlyMessage || "Upload failed."
      );
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  };

  const isUploading = uploadPhase !== "idle" && uploadPhase !== "done" && uploadPhase !== "error";

  return (
    <div style={s.page}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.logo}>
          <img src="/logo.png" alt="makewithus" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={s.logoText}>makewithus</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <ActivityBell />
          <Link href="/analytics" style={s.docsLink}>
            Analytics
          </Link>
          <Link href="/documents" style={s.docsLinkBlack}>
            View documents →
          </Link>
        </div>
      </div>

      {/* ── Hero ────────────────────────────────────────────────── */}
      <div style={s.hero}>
        <h1 style={s.heroTitle}>Create a document</h1>
        <p style={s.heroSub}>
          Choose a template → write one prompt → AI fills everything instantly
        </p>
      </div>

      {/* ── Template cards ──────────────────────────────────────── */}
      <div style={s.grid}>
        {TEMPLATES.map((t) => (
          <button
            key={t.type}
            style={{ ...s.card, opacity: creating && creating !== t.type ? 0.5 : 1 }}
            onClick={() => handleSelect(t.type)}
            disabled={!!creating || isUploading}
          >
            {creating === t.type ? (
              <div style={s.cardLoading}>
                <div style={s.spinner} />
                <span style={{ fontSize: 13, color: "#888" }}>Creating...</span>
              </div>
            ) : (
              <>
                <div style={s.cardTitle}>{t.title}</div>
                <div style={s.cardDesc}>{t.description}</div>
                <div style={s.cardTag}>Use template →</div>
              </>
            )}
          </button>
        ))}
      </div>

      {/* ── Divider ─────────────────────────────────────────────── */}
      <div style={s.divider}>
        <span style={s.dividerText}>or upload an existing document</span>
      </div>

      {/* ── Upload / OCR zone ───────────────────────────────────── */}
      <div
        style={{
          ...s.dropzone,
          borderColor: dragOver ? "#111" : "#ddd",
          background: dragOver ? "#f0f0f0" : "#fff",
          opacity: isUploading ? 0.7 : 1,
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp"
          multiple={false}
          style={{ display: "none" }}
          onChange={handleFileInput}
        />

        {uploadPhase === "idle" && (
          <>
            <div style={{ marginBottom: 16, color: "#64748b", background: "#ffffff", padding: 12, borderRadius: 50, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UploadCloud size={24} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "#0f172a", marginBottom: 6 }}>
              Drop a PDF or image here, or click to browse
            </div>
            <div style={{ fontSize: 13, color: "#64748b" }}>
              Supports PDF, JPG, PNG, and WebP. AI extracts and structures the content automatically.
            </div>
          </>
        )}

        {uploadPhase !== "idle" && (
          <ProcessingTimeline 
            currentPhase={uploadPhase} 
            error={uploadError}
            onRetry={() => { setUploadError(""); setUploadPhase("idle"); }}
          />
        )}
      </div>

      <p style={s.hint}>
        ✦ After selecting, type a prompt in the editor — AI will fill all fields automatically
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "system-ui,-apple-system,sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px",
    overflow: "hidden"
  },
  header: {
    width: "100%",
    maxWidth: 960,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 0",
  },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoText: { fontSize: 18, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.5px", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  docsLink: {
    fontSize: 13, fontWeight: 600, color: "#475569", textDecoration: "none",
    padding: "8px 16px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#fff",
    transition: "background 0.2s"
  },
  docsLinkBlack: {
    fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none",
    padding: "8px 16px", borderRadius: 6, border: "1px solid #0f172a", background: "#0f172a",
    transition: "opacity 0.2s"
  },
  hero: { textAlign: "center", padding: "32px 0 24px" },
  heroTitle: { fontSize: 36, fontWeight: 800, color: "#0f172a", margin: 0, letterSpacing: "-1px", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  heroSub: { fontSize: 15, color: "#64748b", marginTop: 8, fontWeight: 400 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 16,
    width: "100%",
    maxWidth: 960,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "20px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    transition: "box-shadow .2s, border-color .2s",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    outline: "none",
  },
  cardLoading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 10, minHeight: 80,
  },
  spinner: {
    width: 24, height: 24, border: "2.5px solid #e2e8f0", borderTopColor: "#0f172a",
    borderRadius: "50%", animation: "spin .8s linear infinite",
  },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", fontFamily: '"TT Hoves", system-ui, sans-serif', letterSpacing: "-0.3px" },
  cardDesc: { fontSize: 13, color: "#64748b", lineHeight: 1.4 },
  cardTag: {
    alignSelf: "flex-start", fontSize: 12, fontWeight: 600,
    padding: "4px 12px", borderRadius: 6, background: "#f8fafc", color: "#334155",
    border: "1px solid #e2e8f0", marginTop: "auto"
  },
  divider: {
    display: "flex", alignItems: "center", width: "100%", maxWidth: 960,
    gap: 16, margin: "24px 0 16px",
  },
  dividerText: { fontSize: 13, color: "#94a3b8", whiteSpace: "nowrap", fontWeight: 500 },
  dropzone: {
    width: "100%",
    maxWidth: 960,
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "#cbd5e1",
    borderRadius: 12,
    padding: "32px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color .15s, background .15s",
    textAlign: "center",
    background: "#f1f5f9"
  },
  uploadError: {
    marginTop: 12, padding: "10px 16px", background: "#fef2f2",
    border: "1px solid #fecaca", borderRadius: 6,
    fontSize: 13, color: "#ef4444", maxWidth: 960, width: "100%",
  },
  hint: { marginTop: 16, fontSize: 12, color: "#94a3b8", textAlign: "center", fontWeight: 500 },
};
