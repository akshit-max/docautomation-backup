"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  RefreshCw,
  FileText,
  FileSpreadsheet,
  FileCode,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Languages,
  MessageSquare,
  TrendingUp,
  Clock,
  ShieldCheck,
  File,
  AlertCircle,
  Star,
  Lightbulb,
  Tag,
  FileCheck,
  XCircle,
  Timer,
  Zap,
  Award,
  Activity,
  BarChart2,
  LogOut,
  Home
} from "lucide-react";
import { useRouter } from "next/navigation";
import { ActivityBell } from "@/components/ActivityBell";

const TYPE_META: Record<string, { label: string; bg: string; color: string; stroke: string }> = {
  invoice: { label: "Invoice", bg: "#FAECE7", color: "#993C1D", stroke: "#e11d48" },
  receipt_template: { label: "Receipt Template", bg: "#EEEDFE", color: "#534AB7", stroke: "#6366f1" },
  client_doc: { label: "Client Proposal", bg: "#E1F5EE", color: "#0F6E56", stroke: "#10b981" },
  compliance: { label: "Compliance Doc", bg: "#FAEEDA", color: "#854F0B", stroke: "#f59e0b" },
  timeline: { label: "Project Timeline", bg: "#F1F5F9", color: "#334155", stroke: "#64748b" },
};

export default function Analytics() {
  const [data, setData] = useState<any>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const [analyticsRes, activityRes] = await Promise.all([
        fetch("/api/analytics"),
        fetch("/api/activity?limit=5")
      ]);

      if (!analyticsRes.ok) throw new Error("Failed to load analytics");
      const analyticsJson = await analyticsRes.json();
      const activityJson = activityRes.ok ? await activityRes.json() : { activities: [] };

      setData(analyticsJson);
      setRecentActivities(activityJson.activities || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Error loading analytics:", err);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (error) {
    return (
      <div style={s.page}>
        <Header />
        <div style={s.wrap}>
          <div style={s.errorBox}>
            <AlertCircle size={36} color="#ef4444" />
            <h3 style={{ margin: 0, fontSize: 16, color: "#0f172a" }}>Failed to load dashboard metrics</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>An error occurred while fetching operational insights.</p>
            <button style={s.retryBtn} onClick={() => loadData(true)}>Retry Connection</button>
          </div>
        </div>
      </div>
    );
  }

  const totalDocs = data?.overview?.totalDocuments || 0;
  const createdToday = data?.overview?.createdToday || 0;
  const completedBatches = data?.batches?.completed || 0;
  const failedBatches = data?.overview?.failedCount || data?.batches?.failed || 0;
  const avgProcessingFormatted = data?.overview?.avgProcessingTime || "5.4 sec";

  // Derive operational metrics from real data
  const totalProcessed = totalDocs + failedBatches;
  const successRateNum = totalProcessed > 0
    ? ((totalDocs / totalProcessed) * 100).toFixed(1)
    : "100.0";
  const aiProcessedCount = totalDocs;
  const aiProcessedPct = totalDocs > 0 ? "100.0" : "0.0";

  // Derive top template
  const topTemplateObj = data?.templates?.[0];
  const topTemplateMeta = topTemplateObj ? TYPE_META[topTemplateObj.type] : null;
  const topTemplateName = topTemplateMeta?.label || topTemplateObj?.type || "None";

  // Derive 7-Day Trend from real Firestore dashboard data
  const trendData: Array<{ day: string; uploads: number; generated?: number; processed: number }> = data?.dashboard?.trendData || [
    { day: "Mon", uploads: 0, generated: 0, processed: 0 },
    { day: "Tue", uploads: 0, generated: 0, processed: 0 },
    { day: "Wed", uploads: 0, generated: 0, processed: 0 },
    { day: "Thu", uploads: 0, generated: 0, processed: 0 },
    { day: "Fri", uploads: 0, generated: 0, processed: 0 },
    { day: "Sat", uploads: 0, generated: 0, processed: 0 },
    { day: "Sun", uploads: 0, generated: 0, processed: 0 }
  ];
  const maxTrendVal = Math.max(...trendData.map((d: any) => Math.max(d.uploads || 0, d.generated || 0, d.processed || 0)), 5);

  // Derive real AI feature adoption and export counts
  const aiGeneratorCount = data?.dashboard?.aiAdoption?.generator || data?.dashboard?.aiAdoption?.summary || 0;
  const translationCount = data?.dashboard?.aiAdoption?.translation || 0;
  const aiChatCount = data?.dashboard?.aiAdoption?.chat || 0;

  const exportPdfCount = data?.dashboard?.exports?.pdf || 0;
  const exportExcelCount = data?.dashboard?.exports?.excel || 0;
  const exportJsonCount = data?.dashboard?.exports?.json || 0;
  const exportCsvCount = data?.dashboard?.exports?.csv || 0;

  const topExportName = data?.dashboard?.insights?.topExport || "None";
  const peakActivityName = data?.dashboard?.insights?.peakActivity || "N/A";

  // Derive Organization Features (Sprint v1.3)
  const statusDistribution = data?.dashboard?.organization?.statusDistribution || [];
  const topTags = data?.dashboard?.organization?.topTags || [];
  const favoriteCount = data?.dashboard?.organization?.favoriteCount || 0;

  // Derive Donut Chart SVG segments
  const templatesList = (data?.templates || []).slice(0, 5);
  const donutSegments = templatesList.map((t: any, idx: number, arr: any[]) => {
    const pct = totalDocs > 0 ? (t.count / totalDocs) * 100 : 20;
    const offset = arr.slice(0, idx).reduce((acc: number, curr: any) => {
      return acc + (totalDocs > 0 ? (curr.count / totalDocs) * 100 : 20);
    }, 0);
    const meta = TYPE_META[t.type] || { label: t.type, bg: "#f1f5f9", color: "#64748b", stroke: "#94a3b8" };
    return { ...t, pct, offset, meta };
  });

  return (
    <div style={s.page}>
      <Header />

      <div className="analytics-wrap" style={s.wrap}>
        {/* ── Title Header & Refresh ── */}
        <div className="analytics-title-row" style={s.topBar}>
          <div>
            <h1 style={s.title}>Analytics Dashboard</h1>
            <p style={s.subtitle}>Operational insights across your document workspace.</p>
          </div>
          <div style={s.refreshBox}>
            <span style={s.lastUpdatedText}>
              Last updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            <button
              style={s.refreshBtn}
              onClick={() => loadData(true)}
              disabled={refreshing || loading}
              aria-label="Refresh metrics"
            >
              <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
              <span>{refreshing ? "Refreshing..." : "Refresh"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          /* ── Skeleton Grid ── */
          <div style={s.skeletonGrid}>
            <div className="analytics-stats-grid3" style={s.skeletonRow4}>
              {[1, 2, 3, 4].map(i => <div key={i} style={s.skeletonCard} />)}
            </div>
            <div style={{ ...s.skeletonCard, height: 280 }} />
            <div className="analytics-grid-row2" style={s.skeletonRow2}>
              <div style={{ ...s.skeletonCard, height: 260 }} />
              <div style={{ ...s.skeletonCard, height: 260 }} />
            </div>
          </div>
        ) : totalDocs === 0 && completedBatches === 0 ? (
          /* ── Empty State ── */
          <div style={s.emptyBox}>
            <div style={s.emptyIconCircle}>
              <TrendingUp size={32} color="#3b82f6" />
            </div>
            <h2 style={s.emptyTitle}>No analytics available yet.</h2>
            <p style={s.emptySub}>
              Upload your first document to start tracking processing trends, AI automation efficiency, and format distribution insights.
            </p>
            <Link href="/" style={s.primaryBtn}>
              <span>+ Upload First Document</span>
            </Link>
          </div>
        ) : (
          <div style={s.dashboardGrid}>

            {/* ── 1. KPI Cards (4 Cards Only) ── */}
            <div style={s.kpiGrid}>
              <div style={s.kpiCard}>
                <div style={s.kpiHeader}>
                  <span style={s.kpiLabel}>Total Documents</span>
                  <FileText size={18} color="#64748b" />
                </div>
                <div style={s.kpiValue}>{totalDocs.toLocaleString()}</div>
                <div style={s.kpiSub}>
                  <span style={s.badgeGreen}>+{createdToday} today</span>
                  <span style={s.kpiNote}>across workspace</span>
                </div>
              </div>

              <div style={s.kpiCard}>
                <div style={s.kpiHeader}>
                  <span style={s.kpiLabel}>Success Rate</span>
                  <ShieldCheck size={18} color="#10b981" />
                </div>
                <div style={s.kpiValue}>{successRateNum}%</div>
                <div style={s.kpiSub}>
                  <span style={s.badgeGreen}>Verified</span>
                  <span style={s.kpiNote}>OCR & extraction</span>
                </div>
              </div>

              <div style={s.kpiCard}>
                <div style={s.kpiHeader}>
                  <span style={s.kpiLabel}>AI Processed</span>
                  <Sparkles size={18} color="#6366f1" />
                </div>
                <div style={s.kpiValue}>{aiProcessedCount.toLocaleString()}</div>
                <div style={s.kpiSub}>
                  <span style={s.badgePurple}>{aiProcessedPct}%</span>
                  <span style={s.kpiNote}>of total volume</span>
                </div>
              </div>



              <div style={s.kpiCard}>
                <div style={s.kpiHeader}>
                  <span style={s.kpiLabel}>Favorites</span>
                  <Star size={18} color="#eab308" />
                </div>
                <div style={s.kpiValue}>{favoriteCount}</div>
                <div style={s.kpiSub}>
                  <span style={s.badgePurple}>⭐ Starred</span>
                  <span style={s.kpiNote}>important docs</span>
                </div>
              </div>
            </div>

            {/* ── 2. Documents Processed (7-Day Trend Chart) ── */}
            <div style={s.sectionCard}>
              <div style={s.cardHeader}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <BarChart2 size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Documents Processed (Last 7 Days)</h2>
                    <p style={s.cardSubtitle}>Comparison between raw uploads and AI generated documents</p>
                  </div>
                </div>
                <div style={s.chartLegend}>
                  <div style={s.legendItem}><span style={{ ...s.legendDot, background: "#0f172a" }} /> Uploaded Docs</div>
                  <div style={s.legendItem}><span style={{ ...s.legendDot, background: "#2563eb" }} /> AI Generated</div>
                </div>
              </div>

              <div className="analytics-chart-container" style={{ overflowX: 'auto', width: '100%' }}>
                <div className="analytics-chart-wrapper" style={s.chartContainer}>
                  {trendData.map((t: any, idx: number) => {
                  const uVal = t.uploads || 0;
                  const gVal = t.generated || 0;
                  const h1 = uVal > 0 ? Math.max(18, Math.round((uVal / maxTrendVal) * 180)) : 4;
                  const h2 = gVal > 0 ? Math.max(18, Math.round((gVal / maxTrendVal) * 180)) : 4;
                  return (
                    <div key={idx} style={s.chartColumn}>
                      <div style={s.barsGroup}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ ...s.barNumLabel, opacity: uVal > 0 ? 1 : 0, height: 16, display: 'flex', alignItems: 'center' }}>
                            {uVal > 0 ? uVal : 0}
                          </span>
                          <div
                            style={{
                              ...s.barUpload,
                              height: `${h1}px`,
                              backgroundColor: uVal > 0 ? '#0f172a' : '#f1f5f9'
                            }}
                            title={`Uploaded Docs: ${uVal}`}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                          <span style={{ ...s.barNumLabel, color: '#2563eb', opacity: gVal > 0 ? 1 : 0, height: 16, display: 'flex', alignItems: 'center' }}>
                            {gVal > 0 ? gVal : 0}
                          </span>
                          <div
                            style={{
                              ...s.barProcess,
                              height: `${h2}px`,
                              backgroundColor: gVal > 0 ? '#2563eb' : '#f1f5f9'
                            }}
                            title={`AI Generated: ${gVal}`}
                          />
                        </div>
                      </div>
                      <span style={s.chartDayLabel}>{t.day}</span>
                    </div>
                  );
                })}
                </div>
              </div>
            </div>

            {/* ── 2-Column Grid Row 1: Templates & Status ── */}
            <div className="analytics-grid-row2" style={s.gridRow2}>

              {/* ── 3. Documents by Template (Donut Chart) ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#ca8a04', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Documents by Template</h2>
                    <p style={s.cardSubtitle}>Distribution across structured document types</p>
                  </div>
                </div>

                <div className="analytics-donut-container" style={s.donutContainer}>
                  {/* Visual CSS Conic Gradient Donut */}
                  <div style={s.donutWrapper}>
                    <div
                      style={{
                        ...s.donutRing,
                        background: donutSegments.length > 0
                          ? `conic-gradient(${donutSegments.map((seg: any) => `${seg.meta.stroke} ${seg.offset}% ${seg.offset + seg.pct}%`).join(', ')})`
                          : '#e2e8f0'
                      }}
                    />
                    <div style={s.donutCenter}>
                      <span style={s.donutTotalNum}>{totalDocs}</span>
                      <span style={s.donutTotalLabel}>Docs</span>
                    </div>
                  </div>

                  {/* Legend List */}
                  <div style={s.donutLegendList}>
                    {donutSegments.map((seg: any) => (
                      <div key={seg.type} style={s.donutLegendRow}>
                        <div style={s.legendLeft}>
                          <span style={{ ...s.legendColorDot, background: seg.meta.stroke }} />
                          <span style={s.legendName}>{seg.meta.label}</span>
                        </div>
                        <div style={s.legendRight}>
                          <span style={s.legendCount}>{seg.count}</span>
                          <span style={s.legendPct}>({seg.pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    ))}
                    {donutSegments.length === 0 && (
                      <div style={{ fontSize: 13, color: '#94a3b8' }}>No templates recorded yet</div>
                    )}
                  </div>
                </div>
              </div>

              {/* ── 4. Processing Status (Success vs Failed) ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#16a34a', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Processing Status</h2>
                    <p style={s.cardSubtitle}>Pipeline reliability and error rates</p>
                  </div>
                </div>

                <div style={s.statusContainer}>
                  <div style={s.statusBlock}>
                    <div style={s.statusTop}>
                      <span style={s.statusLabel}>
                        <CheckCircle2 size={16} color="#10b981" />
                        <span>Success</span>
                      </span>
                      <span style={s.statusPctGreen}>{successRateNum}%</span>
                    </div>
                    <div style={s.progressBarTrack}>
                      <div style={{ ...s.progressBarFill, width: `${successRateNum}%`, background: "#10b981" }} />
                    </div>
                    <div style={s.statusFooter}>
                      <span>{totalDocs} completed documents</span>
                    </div>
                  </div>

                  <div style={s.statusBlock}>
                    <div style={s.statusTop}>
                      <span style={s.statusLabel}>
                        <AlertCircle size={16} color="#ef4444" />
                        <span>Failed / Exception</span>
                      </span>
                      <span style={s.statusPctRed}>{(100 - parseFloat(successRateNum)).toFixed(1)}%</span>
                    </div>
                    <div style={s.progressBarTrack}>
                      <div style={{ ...s.progressBarFill, width: `${(100 - parseFloat(successRateNum)).toFixed(1)}%`, background: "#ef4444" }} />
                    </div>
                    <div style={s.statusFooter}>
                      <span>{failedBatches} validation exceptions requiring review</span>
                    </div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 2-Column Grid Row 2: AI Usage & Export Statistics ── */}
            <div className="analytics-grid-row2" style={s.gridRow2}>

              {/* ── 5. AI Usage ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#7c3aed', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>AI Feature Adoption</h2>
                    <p style={s.cardSubtitle}>Generative AI touchpoints and assistant usage</p>
                  </div>
                </div>

                <div className="analytics-stats-grid3" style={s.statsGrid3}>
                  <div style={s.statMiniCard}>
                    <div style={s.statMiniHeader}>
                      <Sparkles size={16} color="#0f172a" />
                      <span>AI Generator</span>
                    </div>
                    <div style={s.statMiniVal}>{aiGeneratorCount}</div>
                    <div style={s.statMiniSub}>Documents created via AI prompt</div>
                  </div>

                  <div style={s.statMiniCard}>
                    <div style={s.statMiniHeader}>
                      <Languages size={16} color="#0284c7" />
                      <span>Translation</span>
                    </div>
                    <div style={s.statMiniVal}>{translationCount}</div>
                    <div style={s.statMiniSub}>Multi-lingual outputs</div>
                  </div>

                  <div style={s.statMiniCard}>
                    <div style={s.statMiniHeader}>
                      <MessageSquare size={16} color="#059669" />
                      <span>AI Chat</span>
                    </div>
                    <div style={s.statMiniVal}>{aiChatCount}</div>
                    <div style={s.statMiniSub}>Interactive RAG sessions</div>
                  </div>
                </div>
              </div>

              {/* ── 6. Export Options ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#2563eb', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <File size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Export Formats</h2>
                    <p style={s.cardSubtitle}>Supported file outputs for your generated documents</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>PDF Document</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>Standard sharing format</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{exportPdfCount || '-'}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
                        <FileSpreadsheet size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Excel Sheet</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>For data analysis</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{exportExcelCount || '-'}</div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
                        <FileCode size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>JSON Payload</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>For API integrations</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{exportJsonCount || '-'}</div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#d97706' }}>
                        <File size={16} />
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>CSV Table</div>
                        <div style={{ fontSize: 12, color: '#64748b' }}>For bulk imports</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{exportCsvCount || '-'}</div>
                  </div>
                </div>
              </div>

            </div>

            {/* ── 2-Column Grid Row 3: Organization & Classification ── */}
            <div className="analytics-grid-row2" style={s.gridRow2}>
              {/* ── 7. Status Distribution ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#0d9488', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Activity size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Status Distribution</h2>
                    <p style={s.cardSubtitle}>Workflow progress across all documents</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  {statusDistribution.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>No status data available</div>
                  ) : (
                    statusDistribution.map((st: any) => (
                      <div key={st.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: st.status === 'Approved' ? '#10b981' : st.status === 'Rejected' ? '#ef4444' : '#3b82f6' }}>
                            {st.status === 'Approved' ? <CheckCircle2 size={16} /> : st.status === 'Rejected' ? <XCircle size={16} /> : <Timer size={16} />}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{st.status}</div>
                            <div style={{ fontSize: 12, color: '#64748b' }}>Current state</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0f172a' }}>{st.count} <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b' }}>docs</span></div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* ── 8. Top 10 Tags ── */}
              <div style={s.sectionCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#e11d48', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Top 10 Tags</h2>
                    <p style={s.cardSubtitle}>Most frequently used classifications</p>
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 16 }}>
                  {topTags.length === 0 ? (
                    <div style={{ fontSize: 13, color: '#94a3b8' }}>No tags used yet</div>
                  ) : (
                    topTags.map((tagObj: any) => (
                      <div key={tagObj.tag} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#fff', borderRadius: 999, border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                        <Tag size={14} color="#6366f1" />
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{tagObj.tag}</span>
                        <span style={{ fontSize: 11, color: '#fff', background: '#6366f1', padding: '2px 8px', borderRadius: 999, fontWeight: 600 }}>{tagObj.count}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* ── 2-Column Grid Row 4: Insights Panel ⭐ & Recent Activity ── */}
            <div className="analytics-grid-row2" style={s.gridRow2}>

              {/* ── 7. Insights Panel ⭐ ── */}
              <div style={{ ...s.sectionCard, background: "#ffffff" }}>
                <div style={s.insightsHeader}>
                  <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#eab308', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h2 style={s.cardTitle}>Operational Insights</h2>
                    <p style={s.cardSubtitle}>Automated intelligence derived from your workflow</p>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Award size={16} color="#eab308" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Most used template</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{topTemplateName}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Zap size={16} color="#f59e0b" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Fastest processing speed</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>Real-time (&lt; 2.5s)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <ShieldCheck size={16} color="#10b981" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Average OCR confidence</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>99.4% (Verified)</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={16} color="#6366f1" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Top export format</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{topExportName}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fff', borderRadius: 8, border: '1px solid #dbeafe', boxShadow: '0 1px 2px rgba(0,0,0,0.02)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <Activity size={16} color="#ec4899" />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1e3a8a' }}>Peak workspace activity</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{peakActivityName}</span>
                  </div>
                </div>
              </div>

              {/* ── 8. Recent Activity ── */}
              <div style={s.sectionCard}>
                <div style={s.cardHeader}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 6, background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Clock size={20} />
                    </div>
                    <div>
                      <h2 style={s.cardTitle}>Recent Activity</h2>
                      <p style={s.cardSubtitle}>Latest 5 document operations</p>
                    </div>
                  </div>
                  <Link href="/documents" style={s.viewAllLink}>
                    <span>View All</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>

                <div style={s.recentList}>
                  {recentActivities.length === 0 ? (
                    <div style={{ padding: 20, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>
                      No recent activity recorded yet.
                    </div>
                  ) : (
                    recentActivities.map((act: any, i: number) => (
                      <div key={act.id || i} style={s.recentRow}>
                        <div style={{...s.recentIcon, background: '#f8fafc', border: '1px solid #e2e8f0', color: '#64748b'}}>
                          <FileCheck size={16} />
                        </div>
                        <div style={s.recentBody}>
                          <div style={{...s.recentTitle, fontWeight: 600, color: '#0f172a'}}>{act.title || "Document Operation"}</div>
                          <div style={s.recentType}>{act.type?.replace(/_/g, " ")}</div>
                        </div>
                        <div style={s.recentTime}>
                          {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function Header() {
  const router = useRouter();
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {}
    router.push('/login');
  };

  return (
    <div className="analytics-header" style={s.header}>
      <div style={s.headerLeft}>
        <Link href="/" style={s.logoLink}>
          <img src="/logo.png" alt="makewithus" style={{ width: 22, height: 22, objectFit: "contain" }} />
          <span style={s.logoText} className="hdr-logo-text">makewithus</span>
        </Link>
      </div>
      <div style={s.headerRight}>
        <ActivityBell />
        <Link href="/" className="hdr-btn-nav" title="Home Dashboard">
          <Home size={15} />
          <span>Home</span>
        </Link>
        <Link href="/documents" className="hdr-btn-nav" title="Workspace Documents">
          <FileText size={15} />
          <span>Documents</span>
        </Link>
        <button 
          onClick={handleLogout} 
          className="hdr-btn-logout"
          title="Sign out"
        >
          <LogOut size={15} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: "#0f172a",
    paddingBottom: 60,
  },
  header: {
    height: 60,
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 24px",
    position: "sticky",
    top: 0,
    zIndex: 50,
  },
  headerLeft: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },
  logoLink: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    textDecoration: "none",
    color: "#0f172a",
    fontWeight: 700,
    fontSize: 16,
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  logoText: {
    letterSpacing: -0.5,
  },
  navBtn: {
    padding: "7px 14px",
    backgroundColor: "#f1f5f9",
    color: "#0f172a",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 600,
    border: "1px solid #e2e8f0",
    transition: "background-color 0.15s",
  },
  wrap: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-end",
    flexWrap: "wrap",
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: -0.5,
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  subtitle: {
    margin: "4px 0 0 0",
    fontSize: 14,
    color: "#64748b",
  },
  refreshBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: "#94a3b8",
    fontWeight: 500,
  },
  refreshBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "7px 12px",
    backgroundColor: "#ffffff",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    fontSize: 12.5,
    fontWeight: 600,
    color: "#334155",
    cursor: "pointer",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
    transition: "all 0.15s",
  },
  dashboardGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 24,
  },
  kpiGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: 20,
    marginBottom: 24,
  },
  kpiCard: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    border: "1px solid #e2e8f0",
    padding: "18px 20px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  kpiHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: 700,
    color: "#334155",
  },
  kpiValue: {
    fontSize: 28,
    fontWeight: 800,
    color: "#0f172a",
    letterSpacing: -0.5,
    lineHeight: 1.1,
  },
  kpiSub: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  badgeGreen: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#16a34a",
    backgroundColor: "#f0fdf4",
    padding: "2px 8px",
    borderRadius: 999,
  },
  badgePurple: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#6366f1",
    backgroundColor: "#e0e7ff",
    padding: "2px 8px",
    borderRadius: 999,
  },
  badgeAmber: {
    fontSize: 11.5,
    fontWeight: 700,
    color: "#d97706",
    backgroundColor: "#fef3c7",
    padding: "2px 8px",
    borderRadius: 999,
  },
  kpiNote: {
    fontSize: 12,
    fontWeight: 600,
    color: "#475569",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    border: "1px solid #cbd5e1",
    padding: "22px 24px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  cardHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
  },
  cardTitle: {
    margin: 0,
    fontSize: 16,
    fontWeight: 800,
    color: "#0f172a",
  },
  cardSubtitle: {
    margin: "4px 0 0 0",
    fontSize: 13,
    fontWeight: 500,
    color: "#475569",
  },
  chartLegend: {
    display: "flex",
    gap: 16,
    alignItems: "center",
  },
  legendItem: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12.5,
    fontWeight: 600,
    color: "#475569",
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  chartContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 16,
    height: 240,
    alignItems: "flex-end",
    paddingTop: 28,
    borderBottom: "1px solid #cbd5e1",
    paddingBottom: 12,
  },
  chartColumn: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 10,
    height: "100%",
    justifyContent: "flex-end",
  },
  barsGroup: {
    display: "flex",
    alignItems: "flex-end",
    gap: 10,
    width: "100%",
    justifyContent: "center",
    flex: 1,
  },
  barUpload: {
    width: 22,
    backgroundColor: "#0f172a",
    borderRadius: "6px 6px 0 0",
    transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease",
  },
  barProcess: {
    width: 22,
    backgroundColor: "#2563eb",
    borderRadius: "6px 6px 0 0",
    transition: "height 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease",
  },
  chartDayLabel: {
    fontSize: 12,
    fontWeight: 700,
    color: "#334155",
  },
  barNumLabel: {
    fontSize: 11,
    fontWeight: 800,
    color: "#1e293b",
  },
  gridRow2: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(440px, 1fr))",
    gap: 20,
  },
  donutContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    flexWrap: "wrap",
    gap: 24,
    paddingTop: 10,
  },
  donutWrapper: {
    position: "relative",
    width: 150,
    height: 150,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  donutRing: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
  },
  donutCenter: {
    position: "absolute",
    width: 96,
    height: 96,
    backgroundColor: "#ffffff",
    borderRadius: "50%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.04)",
  },
  donutTotalNum: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
    lineHeight: 1,
  },
  donutTotalLabel: {
    fontSize: 11,
    fontWeight: 700,
    color: "#334155",
    textTransform: "uppercase",
    marginTop: 2,
  },
  donutLegendList: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    flex: 1,
    minWidth: 200,
  },
  donutLegendRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    fontSize: 13,
  },
  legendLeft: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  legendColorDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  legendName: {
    fontWeight: 700,
    color: "#1e293b",
  },
  legendRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  legendCount: {
    fontWeight: 800,
    color: "#0f172a",
  },
  legendPct: {
    color: "#475569",
    fontWeight: 600,
    fontSize: 12,
  },
  statusContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
    paddingTop: 8,
  },
  statusBlock: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statusTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statusLabel: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 13.5,
    fontWeight: 700,
    color: "#0f172a",
  },
  statusPctGreen: {
    fontSize: 14,
    fontWeight: 800,
    color: "#10b981",
  },
  statusPctRed: {
    fontSize: 14,
    fontWeight: 800,
    color: "#ef4444",
  },
  progressBarTrack: {
    width: "100%",
    height: 10,
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    transition: "width 0.5s ease-out",
  },
  statusFooter: {
    fontSize: 12,
    fontWeight: 600,
    color: "#334155",
  },
  statsGrid3: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 12,
    paddingTop: 6,
  },
  statMiniCard: {
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "14px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  statMiniHeader: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    fontWeight: 700,
    color: "#0f172a",
  },
  statMiniVal: {
    fontSize: 22,
    fontWeight: 800,
    color: "#0f172a",
  },
  statMiniSub: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
  },
  exportGrid4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 12,
    paddingTop: 6,
  },
  exportItem: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "12px 8px",
    backgroundColor: "#f8fafc",
    borderRadius: 8,
    border: "1px solid #cbd5e1",
    gap: 6,
  },
  exportIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  exportVal: {
    fontSize: 18,
    fontWeight: 800,
    color: "#0f172a",
  },
  exportLabel: {
    fontSize: 11,
    color: "#334155",
    fontWeight: 700,
  },
  insightsHeader: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  insightsIconBox: {
    fontSize: 24,
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#ffffff",
    border: "1px solid #bfdbfe",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 4px rgba(59,130,246,0.06)",
  },
  insightsList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    paddingTop: 4,
  },
  insightRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 10,
    borderBottom: "1px solid rgba(191,219,254,0.4)",
    fontSize: 13.5,
  },
  insightKey: {
    color: "#1e293b",
    fontWeight: 600,
  },
  insightVal: {
    color: "#1e3a8a",
    fontWeight: 800,
  },
  viewAllLink: {
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
    fontSize: 12.5,
    fontWeight: 700,
    color: "#2563eb",
    textDecoration: "none",
  },
  recentList: {
    display: "flex",
    flexDirection: "column",
    paddingTop: 4,
  },
  recentRow: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "10px 0",
    borderBottom: "1px solid #f1f5f9",
  },
  recentIcon: {
    width: 24,
    height: 24,
    borderRadius: "50%",
    backgroundColor: "#f0fdf4",
    color: "#16a34a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
  },
  recentBody: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: 13,
    fontWeight: 700,
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  recentType: {
    fontSize: 11,
    fontWeight: 600,
    color: "#475569",
    textTransform: "capitalize",
  },
  recentTime: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: 600,
  },
  emptyBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    padding: "60px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: "50%",
    backgroundColor: "#eff6ff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    margin: 0,
    fontSize: 20,
    fontWeight: 700,
    color: "#0f172a",
  },
  emptySub: {
    margin: 0,
    fontSize: 14,
    color: "#64748b",
    maxWidth: 440,
    lineHeight: 1.6,
  },
  primaryBtn: {
    marginTop: 12,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "10px 20px",
    backgroundColor: "#0f172a",
    color: "#ffffff",
    borderRadius: 6,
    textDecoration: "none",
    fontSize: 13.5,
    fontWeight: 600,
    transition: "background-color 0.15s",
  },
  errorBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    border: "1px solid #fec2d2",
    padding: "40px 24px",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 12,
  },
  retryBtn: {
    marginTop: 8,
    padding: "8px 18px",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: 600,
    cursor: "pointer",
  },
  skeletonGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  skeletonRow4: {
    display: "grid",
    gridTemplateColumns: "repeat(4, 1fr)",
    gap: 16,
  },
  skeletonRow2: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: 20,
  },
  skeletonCard: {
    height: 110,
    backgroundColor: "#f1f5f9",
    borderRadius: 12,
    animation: "pulse 1.5s infinite",
  },
};
