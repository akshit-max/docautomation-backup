"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { getBatch, cancelBatch } from "@/lib/api";
import { Clock, CheckCircle2, AlertCircle, XCircle, FileText, Loader2 } from "lucide-react";

export default function BatchDashboard({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [batch, setBatch] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchBatchData = async () => {
      try {
        const res = await getBatch(id);
        if (active) {
          setBatch(res.data.batch);
          setTasks(res.data.tasks);
        }

        // Stop polling if complete or cancelled
        if (res.data.batch.status === 'completed' || res.data.batch.status === 'cancelled') {
          active = false;
        }
      } catch (err: any) {
        console.error(err);
        if (active) setError("Failed to fetch batch data");
      }
    };

    fetchBatchData(); // initial fetch

    const intervalId = setInterval(() => {
      if (active) fetchBatchData();
    }, 2000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [id]);

  const handleCancel = async () => {
    if (!await confirm("Are you sure you want to cancel the remaining tasks in this batch?")) return;
    try {
      await cancelBatch(id);
      // Immediately fetch latest
      const res = await getBatch(id);
      setBatch(res.data.batch);
    } catch (err) {
      alert("Failed to cancel batch.");
    }
  };

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.centerBox}>
          <AlertCircle size={48} color="#e74c3c" style={{ marginBottom: 16 }} />
          <h2 style={{ margin: "0 0 8px 0" }}>Batch Error</h2>
          <p style={{ color: "#888" }}>{error}</p>
          <Link href="/" style={s.btnPrimary}>Go Back</Link>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div style={s.page}>
        <div style={s.centerBox}>
          <Loader2 size={32} style={s.spin} />
          <p style={{ marginTop: 16, color: "#555" }}>Loading Batch Details...</p>
        </div>
      </div>
    );
  }

  const { totalDocuments, completed, failed, processing, pending, estimatedRemainingSeconds, status } = batch;

  // Progress calculation
  const totalProcessed = completed + failed;
  const progressPercent = Math.min(100, Math.round((totalProcessed / totalDocuments) * 100)) || 0;

  // Time formatting
  const formatTime = (secs: number) => {
    if (secs < 60) return `${Math.round(secs)}s`;
    return `${Math.floor(secs / 60)}m ${Math.round(secs % 60)}s`;
  };

  return (
    <div style={s.page}>
      <div style={s.header}>
        <div style={s.logo}>
          <img src="/logo.png" alt="makewithus" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={s.logoText} className="hdr-logo-text">makewithus / batch process</span>
        </div>
        <div>
          <Link href="/documents" style={s.btnOutline}>View all documents</Link>
        </div>
      </div>

      <div style={s.content}>
        {/* Progress Overview Card */}
        <div style={s.card}>
          <div style={s.cardHeader}>
            <div>
              <h1 style={s.title}>Batch #{id.slice(0, 8)}</h1>
              <p style={s.subtitle}>
                {status === 'processing' ? 'Processing documents in background...' : `Batch ${status}`}
              </p>
            </div>
            {status === 'processing' && (
              <button style={s.btnDanger} onClick={handleCancel}>Cancel Batch</button>
            )}
          </div>

          {/* Progress Bar */}
          <div style={s.progressContainer}>
            <div style={{ ...s.progressBar, width: `${progressPercent}%`, background: status === 'cancelled' ? '#e74c3c' : '#111' }} />
          </div>

          <div style={s.statsGrid}>
            <div style={s.statBox}>
              <span style={s.statLabel}>Completed</span>
              <span style={{ ...s.statValue, color: '#27ae60' }}>{completed}</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Failed</span>
              <span style={{ ...s.statValue, color: failed > 0 ? '#e74c3c' : '#111' }}>{failed}</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Processing</span>
              <span style={{ ...s.statValue, color: '#f39c12' }}>{processing}</span>
            </div>
            <div style={s.statBox}>
              <span style={s.statLabel}>Pending</span>
              <span style={s.statValue}>{pending}</span>
            </div>
          </div>

          {status === 'processing' && (
            <div style={s.etaWrap}>
              <Clock size={16} />
              <span>Estimated time remaining: <strong>{formatTime(estimatedRemainingSeconds)}</strong></span>
            </div>
          )}
        </div>

        {/* Task List */}
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Document Queue</h2>

          <div style={s.table}>
            <div style={s.tableHeader}>
              <div style={{ flex: 2 }}>Filename</div>
              <div style={{ flex: 1 }}>Status</div>
              <div style={{ flex: 1, textAlign: 'right' }}>Actions</div>
            </div>

            {tasks.map((task) => (
              <div key={task.id} style={s.tableRow}>
                <div style={{ flex: 2, display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                  <FileText size={16} color="#888" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {task.originalFilename}
                  </span>
                </div>

                <div style={{ flex: 1 }}>
                  {task.status === 'COMPLETED' && <span style={s.badgeSuccess}><CheckCircle2 size={12} /> Completed</span>}
                  {task.status === 'FAILED' && <span style={s.badgeDanger}><XCircle size={12} /> Failed</span>}
                  {task.status === 'PENDING' && <span style={s.badgeMuted}>Pending...</span>}
                  {['DOWNLOADING', 'OCR', 'AI', 'SAVING', 'VERSIONING'].includes(task.status) && (
                    <span style={s.badgeWarning}><Loader2 size={12} style={s.spin} /> {task.status}</span>
                  )}
                </div>

                <div style={{ flex: 1, textAlign: 'right' }}>
                  {task.status === 'COMPLETED' && task.finalDocumentId && (
                    <Link href={`/doc/${task.finalDocumentId}`} style={s.linkText} target="_blank">
                      Open Doc
                    </Link>
                  )}
                  {task.status === 'FAILED' && (
                    <span style={{ fontSize: 12, color: '#e74c3c' }} title={task.errorReason}>
                      {task.errorReason?.slice(0, 30)}...
                    </span>
                  )}
                </div>
              </div>
            ))}

            {tasks.length === 0 && (
              <div style={{ padding: 32, textAlign: 'center', color: '#888', fontSize: 14 }}>
                No tasks found for this batch.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh", background: "#f7f7f7",
    fontFamily: "system-ui,-apple-system,sans-serif", color: "#111",
    display: "flex", flexDirection: "column", alignItems: "center",
  },
  header: {
    width: "100%", maxWidth: 900,
    display: "flex", justifyContent: "space-between", alignItems: "center",
    padding: "20px 24px",
  },
  logo: { display: "flex", alignItems: "center", gap: 8 },
  logoText: { fontSize: 16, fontWeight: 700, letterSpacing: "-0.3px" },
  content: {
    width: "100%", maxWidth: 900, padding: "20px 24px 60px",
  },
  card: {
    background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12,
    padding: 32, boxShadow: "0 4px 20px rgba(0,0,0,0.02)",
  },
  cardHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: 24,
  },
  title: { margin: "0 0 8px 0", fontSize: 24, fontWeight: 800, letterSpacing: "-0.5px" },
  subtitle: { margin: 0, fontSize: 14, color: "#666" },
  progressContainer: {
    width: "100%", height: 8, background: "#f0f0f0", borderRadius: 4,
    overflow: "hidden", marginBottom: 32,
  },
  progressBar: {
    height: "100%", transition: "width 0.4s ease, background 0.4s ease",
  },
  statsGrid: {
    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16,
  },
  statBox: {
    background: '#fafafa', border: '1px solid #eee', borderRadius: 8,
    padding: 16, display: 'flex', flexDirection: 'column', gap: 4,
  },
  statLabel: { fontSize: 12, color: '#888', textTransform: 'uppercase', fontWeight: 600, letterSpacing: 0.5 },
  statValue: { fontSize: 24, fontWeight: 700 },
  etaWrap: {
    marginTop: 24, display: 'flex', alignItems: 'center', gap: 8,
    fontSize: 14, color: '#555', background: '#f8f9fa', padding: '12px 16px',
    borderRadius: 8, border: '1px solid #eee'
  },
  table: {
    background: "#fff", border: "1px solid #e0e0e0", borderRadius: 12, overflow: "hidden",
  },
  tableHeader: {
    display: "flex", padding: "16px 20px", background: "#fafafa",
    borderBottom: "1px solid #e0e0e0", fontSize: 13, fontWeight: 600, color: "#555",
  },
  tableRow: {
    display: "flex", padding: "16px 20px", borderBottom: "1px solid #f0f0f0",
    alignItems: "center",
  },
  btnOutline: {
    fontSize: 13, fontWeight: 600, color: "#111", textDecoration: "none",
    padding: "8px 16px", borderRadius: 8, border: "1px solid #e0e0e0", background: "#fff",
    cursor: "pointer",
  },
  btnDanger: {
    fontSize: 13, fontWeight: 600, color: "#e74c3c", textDecoration: "none",
    padding: "8px 16px", borderRadius: 8, border: "1px solid #f5c6c0", background: "#fdecea",
    cursor: "pointer",
  },
  btnPrimary: {
    display: "inline-block", padding: "10px 24px", background: "#111", color: "#fff",
    borderRadius: 8, textDecoration: "none", fontSize: 14, fontWeight: 600,
  },
  centerBox: {
    flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
    justifyContent: "center", textAlign: "center",
  },
  spin: { animation: "spin 1s linear infinite" },
  badgeSuccess: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#e8f5e9', color: '#2e7d32', borderRadius: 4, fontSize: 12, fontWeight: 600 },
  badgeDanger: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#ffebee', color: '#c62828', borderRadius: 4, fontSize: 12, fontWeight: 600 },
  badgeWarning: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#fff8e1', color: '#f57f17', borderRadius: 4, fontSize: 12, fontWeight: 600 },
  badgeMuted: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#f5f5f5', color: '#757575', borderRadius: 4, fontSize: 12, fontWeight: 600 },
  linkText: { fontSize: 13, color: '#0066cc', textDecoration: 'none', fontWeight: 500 },
};
