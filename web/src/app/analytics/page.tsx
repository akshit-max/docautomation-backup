"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { getAnalytics } from "@/lib/api";
import { ActivityBell } from "@/components/ActivityBell";

const TYPE_META: Record<string, { label: string, bg: string, color: string }> = {
  receipt_template: { label: "Receipt Template",    bg: "#EEEDFE", color: "#534AB7" },
  client_doc:       { label: "Client Proposal",     bg: "#E1F5EE", color: "#0F6E56" },
  compliance:       { label: "Compliance",          bg: "#FAEEDA", color: "#854F0B" },
  invoice:          { label: "Invoice",             bg: "#FAECE7", color: "#993C1D" },
  timeline:         { label: "Timeline",            bg: "#FAECE7", color: "#993C1D" },
};

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    getAnalytics()
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (error) {
    return (
      <div style={s.page}>
        <Header />
        <div style={s.wrap}>
          <div style={s.centerBox}>
            <p style={{ color: "#ef4444" }}>Failed to load analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  // Calculate max count for template bar charts
  const maxTemplateCount = data?.templates?.length 
    ? Math.max(...data.templates.map((t: any) => t.count)) 
    : 0;

  return (
    <div style={s.page}>
      <Header />

      <div style={s.wrap}>
        <h1 style={s.title}>Analytics</h1>

        {loading ? (
          <div style={s.centerBox}>
            <div style={s.spinner} />
            <p style={{ fontSize: 14, color: "#888", marginTop: 12 }}>Loading analytics...</p>
          </div>
        ) : data?.overview?.totalDocuments === 0 ? (
          <div style={s.centerBox}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 6 }}>
              No analytics available yet.
            </p>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>
              Upload your first document to start seeing insights.
            </p>
            <Link href="/" style={s.newBtn}>+ New document</Link>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div style={s.kpiGrid}>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Total Documents</div>
                <div style={s.kpiValue}>{data.overview.totalDocuments}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Created Today</div>
                <div style={s.kpiValue}>{data.overview.createdToday}</div>
              </div>
              <div style={s.kpiCard}>
                <div style={s.kpiLabel}>Completed Batches</div>
                <div style={s.kpiValue}>{data.batches.completed}</div>
              </div>
            </div>

            {/* Documents by Template */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Documents by Template</h2>
              <div style={s.barChartContainer}>
                {data.templates.map((t: any) => {
                  const meta = TYPE_META[t.type] || { label: t.type, bg: "#f1f5f9", color: "#64748b" };
                  const percentage = maxTemplateCount > 0 ? (t.count / maxTemplateCount) * 100 : 0;
                  
                  return (
                    <div key={t.type} style={s.barRow}>
                      <div style={s.barLabel}>{meta.label}</div>
                      <div style={s.barTrack}>
                        <div style={{ ...s.barFill, width: `${percentage}%`, background: meta.bg }} />
                      </div>
                      <div style={s.barValue}>{t.count}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Batch Status */}
            <div style={s.section}>
              <h2 style={s.sectionTitle}>Batch Status</h2>
              <div style={{ display: 'flex', gap: 24 }}>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Completed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>{data.batches.completed}</div>
                </div>
                <div>
                  <div style={{ fontSize: 13, color: "#64748b", marginBottom: 4 }}>Failed</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{data.batches.failed}</div>
                </div>
              </div>
            </div>

            {/* Last Updated */}
            <div style={s.lastUpdated}>
              Last updated: {new Date().toLocaleTimeString()}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Header() {
  return (
    <div style={s.header}>
      <div style={s.headerLeft}>
        <Link href="/documents" style={s.logoLink}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6v12M17.196 9 6.804 15M6.804 9l10.392 6" />
          </svg>
          <span style={s.logoText}>makewithus</span>
        </Link>
      </div>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <ActivityBell />
        <Link href="/documents" style={{...s.newBtn, background: '#fff', color: '#111', border: '1px solid #ddd'}}>Back to Documents</Link>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui,-apple-system,sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", height: 56, background: "#fff", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center" },
  logoLink: { display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#111" },
  logoText: { fontSize: 15, fontWeight: 700, letterSpacing: -0.3, fontFamily: '"TT Hoves", system-ui, sans-serif' },
  newBtn: { fontSize: 13, fontWeight: 600, background: "#111", color: "#fff", padding: "8px 18px", borderRadius: 4, textDecoration: "none", cursor: "pointer", border: "none" },
  wrap: { maxWidth: 800, margin: "0 auto", padding: "40px 24px" },
  title: { fontSize: 24, fontWeight: 700, color: "#111", margin: "0 0 32px 0", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  
  centerBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center", background: "#fff", borderRadius: 12, border: "1px solid #e8e8e8" },
  
  kpiGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 },
  kpiCard: { background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e8e8e8", boxShadow: "0 1px 3px rgba(0,0,0,0.02)" },
  kpiLabel: { fontSize: 13, color: "#64748b", fontWeight: 500, marginBottom: 8 },
  kpiValue: { fontSize: 32, fontWeight: 700, color: "#111", fontFamily: '"TT Hoves", system-ui, sans-serif' },
  
  section: { background: "#fff", padding: 24, borderRadius: 12, border: "1px solid #e8e8e8", boxShadow: "0 1px 3px rgba(0,0,0,0.02)", marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: 600, color: "#111", margin: "0 0 20px 0" },
  
  barChartContainer: { display: "flex", flexDirection: "column", gap: 16 },
  barRow: { display: "flex", alignItems: "center", gap: 16 },
  barLabel: { width: 140, fontSize: 13, fontWeight: 500, color: "#475569" },
  barTrack: { flex: 1, height: 24, background: "#f8fafc", borderRadius: 4, overflow: "hidden", position: "relative" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.5s ease-out" },
  barValue: { width: 40, fontSize: 13, fontWeight: 600, color: "#111", textAlign: "right" },
  
  lastUpdated: { fontSize: 12, color: "#94a3b8", textAlign: "right", marginTop: 24 },
  spinner: { width: 28, height: 28, border: "2.5px solid #eee", borderTopColor: "#111", borderRadius: "50%", animation: "spin .8s linear infinite" }
};
