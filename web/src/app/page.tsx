"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createDocument, uploadPDF, generateDoc, createBatch, uploadBatchFile } from "@/lib/api";
import { ProcessingTimeline } from "@/components/ProcessingTimeline";

const TEMPLATES = [
  { type: "invoice",           title: "Invoice",           description: "GST invoice with line items, payment status and UPI details" },
  { type: "receipt_template",  title: "Receipt Template",  description: "Confirmation of payment received, including service details and payment status" },
  { type: "client_doc",        title: "Client Proposal",   description: "Project proposal with timeline, quotation and deliverables" },
  { type: "compliance",        title: "Service Agreement", description: "3-page service provision agreement with payment terms" },
  { type: "timeline",          title: "Project Timeline",  description: "Phase-wise project timeline with hours and closure date" },
];

type UploadPhase = "idle" | "uploading" | "ocr" | "classifying" | "generating" | "saving" | "done";

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
      setUploadPhase("idle");
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

  const isUploading = uploadPhase !== "idle" && uploadPhase !== "done";

  return (
    <div style={s.page}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div style={s.header}>
        <div style={s.logo}>
          <img src="/logo.png" alt="makewithus" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={s.logoText}>makewithus</span>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
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
            <div style={{ fontSize: 28, marginBottom: 8 }}>📄</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#333", marginBottom: 4 }}>
              Drop a PDF or image here, or click to browse
            </div>
            <div style={{ fontSize: 12, color: "#aaa" }}>
              Supports PDF, JPG, PNG, and WebP. AI extracts and structures the content automatically.
            </div>
          </>
        )}

        {uploadPhase !== "idle" && (
          <ProcessingTimeline currentPhase={uploadPhase} />
        )}
      </div>

      {uploadError && (
        <div style={s.uploadError}>{uploadError}</div>
      )}

      <p style={s.hint}>
        ✦ After selecting, type a prompt in the editor — AI will fill all fields automatically
      </p>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f7f7f7",
    fontFamily: "system-ui,-apple-system,sans-serif",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "0 24px 60px",
  },
  header: {
    width: "100%",
    maxWidth: 860,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 0",
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontSize: 16, fontWeight: 700, color: "#111", letterSpacing: "-0.3px", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  docsLink: {
    fontSize: 13, fontWeight: 600, color: "#555", textDecoration: "none",
    padding: "6px 14px", borderRadius: 4, border: "1px solid #e0e0e0", background: "#fff",
  },
  docsLinkBlack: {
    fontSize: 13, fontWeight: 600, color: "#fff", textDecoration: "none",
    padding: "6px 14px", borderRadius: 4, border: "1px solid #111", background: "#111",
  },
  hero: { textAlign: "center", padding: "48px 0 36px" },
  heroTitle: { fontSize: 34, fontWeight: 700, color: "#111", margin: 0, letterSpacing: "-0.5px", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  heroSub: { fontSize: 15, color: "#888", marginTop: 10, fontWeight: 400 },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
    gap: 20,
    width: "100%",
    maxWidth: 860,
  },
  card: {
    background: "#ffffff",
    border: "1.5px solid #e8e8e8",
    borderRadius: 4,
    padding: "20px",
    cursor: "pointer",
    textAlign: "left",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    transition: "box-shadow .15s, border-color .15s",
    outline: "none",
  },
  cardLoading: {
    display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", gap: 10, minHeight: 80,
  },
  spinner: {
    width: 24, height: 24, border: "2.5px solid #eee", borderTopColor: "#111",
    borderRadius: "50%", animation: "spin .8s linear infinite",
  },
  cardTitle: { fontSize: 17, fontWeight: 700, color: "#111", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  cardDesc: { fontSize: 13, color: "#888", lineHeight: 1.5 },
  cardTag: {
    alignSelf: "flex-start", fontSize: 13, fontWeight: 600,
    padding: "3px 10px", borderRadius: 4, background: "#f0f0f0", color: "#555",
  },
  divider: {
    display: "flex", alignItems: "center", width: "100%", maxWidth: 860,
    gap: 16, margin: "32px 0 24px",
  },
  dividerText: { fontSize: 12, color: "#bbb", whiteSpace: "nowrap" },
  dropzone: {
    width: "100%",
    maxWidth: 860,
    borderWidth: "2px",
    borderStyle: "dashed",
    borderColor: "#ddd",
    borderRadius: 4,
    padding: "40px 24px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    transition: "border-color .15s, background .15s",
    textAlign: "center",
  },
  uploadError: {
    marginTop: 12, padding: "10px 16px", background: "#fdecea",
    border: "1px solid #f5c6c0", borderRadius: 4,
    fontSize: 13, color: "#c0392b", maxWidth: 860, width: "100%",
  },
  hint: { marginTop: 32, fontSize: 13, color: "#aaa", textAlign: "center" },
};
