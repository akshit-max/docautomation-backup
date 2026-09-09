"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Star, Tag, StickyNote, FileText, Pencil, Trash2, Search, ArrowRight, LogOut, Settings, Eye, EyeOff, BarChart2, Plus, X } from 'lucide-react';
import logoImg from "../../../public/logo.png";

import { ActivityBell } from "@/components/ActivityBell";
import { ALLOWED_STATUSES, getStatusColor, DocumentStatus } from '@/lib/constants/document-status';
import { listDocuments, deleteDocument } from "@/lib/api";

const TYPE_META: Record<string, { label: string, icon: string, bg: string, color: string }> = {
  receipt_template: { label: "Receipt Template", icon: "⚙️", bg: "#EEEDFE", color: "#534AB7" },
  client_doc: { label: "Client Proposal", icon: "📋", bg: "#E1F5EE", color: "#0F6E56" },
  compliance: { label: "Compliance", icon: "📄", bg: "#FAEEDA", color: "#854F0B" },
  invoice: { label: "Invoice", icon: "🧾", bg: "#FAECE7", color: "#993C1D" },
  timeline: { label: "Timeline", icon: "🧾", bg: "#FAECE7", color: "#993C1D" },
};

export default function Documents() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<any | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const router = useRouter();

  // ── Settings / Change Password state ─────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [cpCurrentPw, setCpCurrentPw] = useState("");
  const [cpNewPw, setCpNewPw] = useState("");
  const [cpConfirmPw, setCpConfirmPw] = useState("");
  const [cpLoading, setCpLoading] = useState(false);
  const [cpError, setCpError] = useState("");
  const [cpSuccess, setCpSuccess] = useState("");
  const [cpShowCurrent, setCpShowCurrent] = useState(false);
  const [cpShowNew, setCpShowNew] = useState(false);
  const [cpShowConfirm, setCpShowConfirm] = useState(false);

  // Pagination & Filtering state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterClient, setFilterClient] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterFavorite, setFilterFavorite] = useState(false);

  // Batch Selection state
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [batchTagModalOpen, setBatchTagModalOpen] = useState(false);
  const [batchTagInput, setBatchTagInput] = useState("");
  const [batchStatusLoading, setBatchStatusLoading] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Load initial or when filters change
  const load = (reset = true) => {
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    const params: any = {
      q: debouncedSearch,
      type: filterType === "all" ? undefined : filterType,
      status: filterStatus === "all" ? undefined : filterStatus,
      client: filterClient || undefined,
      tag: filterTag || undefined,
      favorite: filterFavorite ? true : undefined,
      limit: 20
    };

    if (!reset && nextCursor) {
      params.cursor = nextCursor;
    }

    listDocuments(params)
      .then(r => {
        const newDocs = r.data.documents || r.data || [];
        setDocs(prev => reset ? newDocs : [...prev, ...newDocs]);
        setNextCursor(r.data.nextCursor || null);
        setHasMore(!!r.data.hasMore);
      })
      .catch(err => {
        console.error(err);
        if (reset) setDocs([]);
      })
      .finally(() => {
        setLoading(false);
        setLoadingMore(false);
      });
  };

  useEffect(() => {
    load(true);
  }, [debouncedSearch, filterType, filterStatus, filterClient, filterTag, filterFavorite]);

  const handleToggleFavorite = async (e: React.MouseEvent, doc: any) => {
    e.stopPropagation();
    e.preventDefault();
    const newFav = !doc.isFavorite;
    
    // Optimistic UI update
    setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, isFavorite: newFav } : d));
    
    try {
      const res = await fetch(`/api/doc/${doc.id}/favorite`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFavorite: newFav })
      });
      if (!res.ok) throw new Error();
    } catch {
      alert("Failed to update favorite status.");
      setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, isFavorite: !newFav } : d)); // Revert
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!await window.confirm("Delete this document permanently?")) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      setDocs(prev => prev.filter(d => d.id !== id));
    } catch {
      alert("Delete failed. Try again.");
    } finally {
      setDeleting(null);
    }
  };

  const handleSaveRename = async () => {
    if (!renamingDoc) return;
    const newName = renameInput.trim();
    if (!newName || newName === renamingDoc.project_name) {
      setRenamingDoc(null);
      return;
    }

    // Optimistic update
    setDocs(prev => prev.map(d => d.id === renamingDoc.id ? { ...d, project_name: newName } : d));
    const docToUpdate = renamingDoc;
    setRenamingDoc(null);

    try {
      let key = "project_name";
      if (docToUpdate.template_type === "compliance") key = "client_name";
      if (docToUpdate.template_type === "receipt_template") key = "for_service";
      if (docToUpdate.template_type === "developer_doc") key = "title";

      const { updateDocument } = await import('@/lib/api');
      await updateDocument(docToUpdate.id, { ...(docToUpdate.content || {}), [key]: newName });
    } catch (err) {
      alert("Rename failed. Please try again.");
      load(true); // revert
    }
  };

  const formatDate = (str: string) => {
    if (!str) return "";
    try {
      return new Date(str).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric"
      });
    } catch { return str; }
  };

  const toggleSelection = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedDocs);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedDocs(newSet);
  };

  const handleBatchStatus = async (status: string) => {
    if (!status || selectedDocs.size === 0) return;
    setBatchStatusLoading(true);
    try {
      const res = await fetch('/api/documents/batch/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs), status })
      });
      if (!res.ok) throw new Error();
      load(true);
      setSelectedDocs(new Set());
    } catch {
      alert("Failed to update status");
    } finally {
      setBatchStatusLoading(false);
    }
  };

  const handleBatchTags = async () => {
    const tags = batchTagInput.split(',').map(t => t.trim()).filter(Boolean);
    if (tags.length === 0 || selectedDocs.size === 0) return;
    try {
      const res = await fetch('/api/documents/batch/tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentIds: Array.from(selectedDocs), tags })
      });
      if (!res.ok) throw new Error();
      setBatchTagModalOpen(false);
      setBatchTagInput("");
      load(true);
      setSelectedDocs(new Set());
    } catch {
      alert("Failed to add tags");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setCpError("");
    setCpSuccess("");
    if (!cpCurrentPw || !cpNewPw || !cpConfirmPw) {
      setCpError("All fields are required.");
      return;
    }
    if (cpNewPw !== cpConfirmPw) {
      setCpError("New password and confirmation do not match.");
      return;
    }
    setCpLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: cpCurrentPw,
          newPassword: cpNewPw,
          confirmPassword: cpConfirmPw,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setCpSuccess("Password changed successfully. Use the new password next time you sign in.");
        setCpCurrentPw("");
        setCpNewPw("");
        setCpConfirmPw("");
      } else {
        setCpError(data.error || "Password change failed.");
      }
    } catch {
      setCpError("A network error occurred. Please try again.");
    } finally {
      setCpLoading(false);
    }
  };

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div className="docs-header" style={s.header}>
        <div style={s.headerLeft}>
          <Link href="/documents" style={s.logoLink}>
            <img src={typeof logoImg === "string" ? logoImg : logoImg.src} alt="makewithus" style={{ width: 22, height: 22, objectFit: "contain" }} />
            <span style={s.logoText} className="hdr-logo-text">makewithus</span>
          </Link>
        </div>
        <div style={s.headerRight}>
          <ActivityBell />
          <Link href="/analytics" className="hdr-btn-nav" title="Analytics Overview">
            <BarChart2 size={15} />
            <span>Analytics</span>
          </Link>
          <button
            onClick={() => { setShowSettings(true); setCpError(""); setCpSuccess(""); }}
            className="hdr-btn-nav"
            title="Settings"
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>
          <button 
            onClick={handleLogout} 
            className="hdr-btn-logout"
            title="Sign out"
          >
            <LogOut size={15} />
            <span>Logout</span>
          </button>
          <Link href="/" className="hdr-btn-primary" title="Create a new document">
            <Plus size={15} />
            <span>New document</span>
          </Link>
        </div>
      </div>

      <div className="docs-wrap" style={s.wrap}>
        <div style={s.pageHeader}>
          <h1 style={s.pageTitle}>Your Documents</h1>
          <p style={s.pageSubtitle}>View, manage, and track the status of all your generated documents</p>
        </div>

        {/* ── Search + Filter bar ── */}
        <div style={s.toolbar}>
          {/* Top Row: Search and Favorites Only */}
          <div className="docs-toolbar-row1" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={s.searchWrap}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 14 }} />
              <input
                style={s.searchInput as React.CSSProperties}
                type="text"
                placeholder="Search documents by name, client, or invoice number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <button
              style={{ ...s.favFilterBtn, ...(filterFavorite ? s.favFilterBtnActive : {}) }}
              onClick={() => setFilterFavorite(!filterFavorite)}
            >
              <Star size={14} style={{ marginRight: 6 }} color={filterFavorite ? "#fff" : "#888"} /> 
              Favorites Only
            </button>
          </div>

          {/* Bottom Row: Tabs and Filters */}
          <div className="docs-toolbar-row2" style={{ display: 'flex', gap: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div className="docs-segmented-control" style={s.segmentedControl}>
              {["all", "invoice", "receipt_template", "client_doc", "compliance", "timeline"].map((f) => (
                <button
                  key={f}
                  className="docs-segmented-btn"
                  style={{ ...s.segmentedBtn, ...(filterType === f ? s.segmentedBtnActive : {}) }}
                  onClick={() => setFilterType(f)}
                >
                  {f === "all" ? "All Types" : (TYPE_META[f]?.label ?? f)}
                </button>
              ))}
            </div>
            
            <div className="docs-filter-group" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <select
                className="docs-filter-select"
                style={{ ...s.filterSelect, appearance: 'auto' } as React.CSSProperties}
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">Any Status</option>
                {ALLOWED_STATUSES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              
              <input
                className="docs-filter-input"
                style={s.filterInput as React.CSSProperties}
                type="text"
                placeholder="Filter by Client..."
                value={filterClient}
                onChange={(e) => setFilterClient(e.target.value)}
              />
              <input
                className="docs-filter-input"
                style={s.filterInput as React.CSSProperties}
                type="text"
                placeholder="Filter by Tag..."
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ── Loading ── */}
        {loading && (
          <div style={s.centerBox}>
            <div style={s.spinner} />
            <p style={{ fontSize: 14, color: "#888", marginTop: 12 }}>Loading documents...</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && docs.length === 0 && (
          <div style={s.centerBox}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 6 }}>
              {!search && filterType === "all" && filterStatus === "all" && !filterClient
                ? "No documents yet"
                : "No matching documents"}
            </p>
            {!search && filterType === "all" && filterStatus === "all" && !filterClient ? (
              <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>
                Create your first document or upload a PDF to get started.
              </p>
            ) : (
              <div style={{ fontSize: 13, color: "#aaa", marginBottom: 24, textAlign: 'left', display: 'inline-block' }}>
                Try:
                <ul style={{ marginTop: 4, paddingLeft: 20 }}>
                  <li>Clearing filters</li>
                  <li>Searching by invoice number</li>
                  <li>Searching by client</li>
                </ul>
              </div>
            )}
            {!search && filterType === "all" && filterStatus === "all" && !filterClient && (
              <Link href="/" style={s.newBtn}>+ New document</Link>
            )}
          </div>
        )}

        {/* ── Documents grid ── */}
        {!loading && docs.length > 0 && (
          <div className="docs-grid" style={s.grid}>
            {docs.map(doc => {
              const meta = TYPE_META[doc.template_type] || { label: doc.template_type, icon: "📄", bg: "#f0f0f0", color: "#666" };
              return (
                <div
                  key={doc.id}
                  style={s.card}
                  onClick={() => router.push(`/doc/${doc.id}`)}
                >
                  {/* Card Header (Checkbox, Title, Favorite) */}
                  <div style={s.cardHeader}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flex: 1 }}>
                      <input 
                        type="checkbox" 
                        checked={selectedDocs.has(doc.id)} 
                        onChange={() => {}} 
                        onClick={(e) => toggleSelection(e, doc.id)}
                        style={s.cardCheckbox as React.CSSProperties}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={s.cardTitle}>{doc.project_name || "Untitled Document"}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={s.cardDate}>{formatDate(doc.createdAt)}</span>
                      <button 
                        onClick={(e) => handleToggleFavorite(e, doc)}
                        style={s.favBtnAction}
                      >
                        <Star size={16} fill={doc.isFavorite ? "#eab308" : "none"} color={doc.isFavorite ? "#eab308" : "#cbd5e1"} />
                      </button>
                    </div>
                  </div>

                  {/* Badges & Tags */}
                  <div style={s.badgesRow}>
                    <span style={{ ...s.badge, background: meta.bg, color: meta.color }}>
                      {meta.label}
                    </span>
                    <span style={{ ...s.badge, background: getStatusColor(doc.status).bg, color: getStatusColor(doc.status).text, border: `1px solid ${getStatusColor(doc.status).border}` }}>
                      {doc.status ?? DocumentStatus.Draft}
                    </span>
                    {(doc.tags || []).map((tag: string) => (
                      <span key={tag} style={s.tagBadge}>
                        <Tag size={10} /> {tag}
                      </span>
                    ))}
                    {doc.notes && (
                      <span style={s.noteBadge}>
                        <StickyNote size={10} /> Notes
                      </span>
                    )}
                  </div>

                  {/* Footer Actions */}
                  <div style={s.cardFooter} onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/doc/${doc.id}`}
                      style={s.btnPrimarySm}
                      onClick={e => e.stopPropagation()}
                    >
                      Open editor →
                    </Link>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        style={s.btnIcon}
                        title="Rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingDoc(doc);
                          setRenameInput(doc.project_name || "Untitled Document");
                        }}
                      >
                        <PencilIcon size={12} color="#666" />
                        Rename
                      </button>
                      <button
                        style={{ ...s.btnIcon, color: deleting === doc.id ? '#bbb' : '#c0392b' }}
                        title="Delete"
                        onClick={e => handleDelete(e, doc.id)}
                        disabled={deleting === doc.id}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Batch Floating Action Bar ── */}
      {selectedDocs.size > 0 && (
        <div style={{ position: 'fixed', bottom: 32, left: '50%', transform: 'translateX(-50%)', background: '#0f172a', color: '#f8fafc', padding: '12px 24px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 16, boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.25)', zIndex: 100 }}>
          <span style={{ fontSize: 14, fontWeight: 500, marginRight: 8 }}>{selectedDocs.size} selected</span>
          <div style={{ height: 24, width: 1, background: '#334155' }} />
          <select 
            onChange={(e) => handleBatchStatus(e.target.value)} 
            disabled={batchStatusLoading}
            style={{ background: 'transparent', color: '#fff', border: 'none', outline: 'none', fontSize: 13, cursor: 'pointer', appearance: 'auto' }}
          >
            <option value="" style={{ color: '#000' }}>Change Status...</option>
            {ALLOWED_STATUSES.map(st => (
              <option key={st} value={st} style={{ color: '#000' }}>{st}</option>
            ))}
          </select>
          <div style={{ height: 24, width: 1, background: '#334155' }} />
          <button 
            onClick={() => setBatchTagModalOpen(true)}
            style={{ background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <Tag size={14} /> Add Tags
          </button>
          <button 
            onClick={() => setSelectedDocs(new Set())}
            style={{ background: 'transparent', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 13, marginLeft: 8 }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* ── Batch Tag Modal ── */}
      {batchTagModalOpen && (
        <div style={s.modalOverlay} onClick={() => setBatchTagModalOpen(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Add Tags to {selectedDocs.size} Documents</h3>
            <input
              autoFocus
              style={s.renameInput as React.CSSProperties}
              placeholder="e.g. Q3, Finance, Urgent (comma separated)"
              value={batchTagInput}
              onChange={e => setBatchTagInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleBatchTags();
                if (e.key === 'Escape') setBatchTagModalOpen(false);
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={s.btnOutline} onClick={() => setBatchTagModalOpen(false)}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleBatchTags}>Apply Tags</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Rename Modal ── */}
      {renamingDoc && (
        <div style={s.modalOverlay} onClick={() => setRenamingDoc(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: 16 }}>Rename Document</h3>
            <input
              autoFocus
              style={s.renameInput as React.CSSProperties}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') setRenamingDoc(null);
              }}
            />
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button style={s.btnOutline} onClick={() => setRenamingDoc(null)}>Cancel</button>
              <button style={s.btnPrimary} onClick={handleSaveRename}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings Modal (Change Password) ── */}
      {showSettings && (
        <div style={s.modalOverlay} onClick={() => setShowSettings(false)}>
          <div style={s.settingsModalContent} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a', letterSpacing: -0.4, fontFamily: '"TT Hoves", system-ui, sans-serif' }}>Settings</h2>
                <p style={{ margin: '3px 0 0', fontSize: 12.5, color: '#64748b' }}>Account & Security Preferences</p>
              </div>
              <button 
                onClick={() => setShowSettings(false)} 
                style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s' }}
                title="Close"
              >
                <X size={15} />
              </button>
            </div>

            <div style={{ borderBottom: '1px solid #e2e8f0', marginBottom: 20 }} />

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.8 }}>Change Password</div>

              {/* Current Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={cpShowCurrent ? 'text' : 'password'}
                    value={cpCurrentPw}
                    onChange={e => setCpCurrentPw(e.target.value)}
                    style={s.settingsInput as React.CSSProperties}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setCpShowCurrent(v => !v)} style={s.eyeToggleBtn}>
                    {cpShowCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* New Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={cpShowNew ? 'text' : 'password'}
                    value={cpNewPw}
                    onChange={e => setCpNewPw(e.target.value)}
                    style={s.settingsInput as React.CSSProperties}
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setCpShowNew(v => !v)} style={s.eyeToggleBtn}>
                    {cpShowNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 600, color: '#334155' }}>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={cpShowConfirm ? 'text' : 'password'}
                    value={cpConfirmPw}
                    onChange={e => setCpConfirmPw(e.target.value)}
                    style={s.settingsInput as React.CSSProperties}
                    placeholder="Repeat new password"
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setCpShowConfirm(v => !v)} style={s.eyeToggleBtn}>
                    {cpShowConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {/* Error / Success messages */}
              {cpError && (
                <div style={{ fontSize: 13, color: '#dc2626', background: '#fff5f5', border: '1px solid #fecaca', borderRadius: 6, padding: '10px 14px' }}>
                  {cpError}
                </div>
              )}
              {cpSuccess && (
                <div style={{ fontSize: 13, color: '#15803d', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, padding: '10px 14px' }}>
                  {cpSuccess}
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
                <button type="button" onClick={() => setShowSettings(false)} className="hdr-btn-nav" style={{ flex: 1, justifyContent: 'center' }}>Cancel</button>
                <button
                  type="submit"
                  disabled={cpLoading}
                  className="hdr-btn-primary"
                  style={{ flex: 1.5, justifyContent: 'center', opacity: cpLoading ? 0.7 : 1, cursor: cpLoading ? 'not-allowed' : 'pointer' }}
                >
                  {cpLoading ? 'Changing…' : 'Change Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}


function AsteriskIcon({ size = 22 }: { size?: number }) {
  return (
    <img
      src={typeof logoImg === "string" ? logoImg : logoImg.src}
      alt="makewithus"
      style={{
        width: size,
        height: size,
        objectFit: "contain",
      }}
    />
  );
}

function PencilIcon({ size = 14, color = "#666" }: { size?: number; color?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#f8fafc", fontFamily: "system-ui,-apple-system,sans-serif" },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "0 24px",
    height: 60,
    background: "#ffffff",
    borderBottom: "1px solid #e2e8f0",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  headerLeft: { display: "flex", alignItems: "center", gap: 12 },
  headerRight: { display: "flex", alignItems: "center", gap: 10 },
  logoLink: { display: "flex", alignItems: "center", gap: 10, textDecoration: "none" },
  logoText: { fontSize: 16, fontWeight: 700, color: "#0f172a", letterSpacing: "-0.4px", fontFamily: '"TT Hoves", system-ui, -apple-system, sans-serif' },

  wrap: { maxWidth: 1360, margin: "0 auto", padding: "36px 24px 80px" },

  pageHeader: { textAlign: "center", padding: "16px 0 44px" },
  pageTitle: { fontSize: 30, fontWeight: 800, margin: "0 0 10px", fontFamily: '"TT Hoves", system-ui, sans-serif', letterSpacing: "-0.6px", color: "#0f172a" },
  pageSubtitle: { color: "#64748b", fontSize: 15, margin: 0, fontWeight: 400 },

  /* ── TOOLBAR ── */
  toolbar: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 32 },
  searchWrap: { position: "relative", flex: 1, display: "flex", alignItems: "center" },
  searchInput: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 14px 9px 38px", fontSize: 13.5, color: "#0f172a", outline: "none", fontFamily: "inherit", background: "#fff", height: 38, boxSizing: "border-box" },
  
  favFilterBtn: { display: "flex", alignItems: "center", justifyContent: "center", padding: "0 16px", height: 38, border: "1px solid #cbd5e1", background: "#fff", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap", boxSizing: "border-box", transition: "all 0.15s ease" },
  favFilterBtnActive: { background: "#0f172a", color: "#fff", border: "1px solid #0f172a" },
  
  segmentedControl: { display: "flex", background: "#f1f5f9", padding: 4, borderRadius: 8, gap: 2 },
  segmentedBtn: { padding: "6px 14px", border: "none", background: "transparent", color: "#64748b", fontSize: 12, fontWeight: 500, cursor: "pointer", borderRadius: 6, fontFamily: "inherit", transition: "all 0.15s ease" },
  segmentedBtnActive: { background: "#fff", color: "#0f172a", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", fontWeight: 600 },
  
  filterSelect: { height: 38, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", fontSize: 13, color: "#0f172a", outline: "none", cursor: "pointer", fontFamily: "inherit", minWidth: 140, boxSizing: "border-box" },
  filterInput: { height: 38, padding: "0 12px", border: "1px solid #cbd5e1", borderRadius: 8, background: "#fff", fontSize: 13, color: "#0f172a", outline: "none", width: 160, fontFamily: "inherit", boxSizing: "border-box" },

  centerBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" },
  spinner: { width: 28, height: 28, border: "2.5px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin .8s linear infinite" },

  /* ── GRID & CARDS ── */
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 18,
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e2e8f0",
    borderRadius: 10,
    padding: "20px",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column",
    transition: "transform 0.15s ease, box-shadow 0.15s ease, border-color 0.15s ease",
    boxShadow: "0 1px 3px rgba(0,0,0,0.02)",
  },
  cardHeader: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  cardCheckbox: { cursor: "pointer", width: 15, height: 15, accentColor: "#0f172a", marginTop: 2 },
  cardTitle: { fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.3, marginBottom: 0, fontFamily: '"TT Hoves", system-ui, sans-serif' },
  cardMetaRow: { display: "flex", alignItems: "center", gap: 8 },
  cardDate: { fontSize: 12, color: "#64748b", fontWeight: 400 },
  cardDot: { fontSize: 12, color: "#cbd5e1" },
  cardId: { fontSize: 11, color: "#94a3b8", fontFamily: "monospace" },
  favBtnAction: { background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" },
  
  badgesRow: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 },
  badge: { fontSize: 11, padding: "3px 8px", borderRadius: 4, fontWeight: 500, display: "flex", alignItems: "center", gap: 4 },
  tagBadge: { fontSize: 11, padding: "3px 8px", background: "#f1f5f9", color: "#475569", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 },
  noteBadge: { fontSize: 11, padding: "3px 8px", background: "#fef3c7", color: "#b45309", borderRadius: 4, display: "flex", alignItems: "center", gap: 4 },

  cardFooter: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 16, borderTop: "1px solid #f1f5f9", marginTop: "auto" },
  btnPrimarySm: { fontSize: 13, color: "#0f172a", fontWeight: 600, textDecoration: "none", display: "flex", alignItems: "center", gap: 6 },
  btnIcon: { display: "flex", alignItems: "center", justifyContent: "center", background: "none", color: "#64748b", border: "none", cursor: "pointer", fontSize: 13, gap: 6 },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,23,42,0.45)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(6px)" },
  modalContent: { background: "#fff", borderRadius: 12, padding: 24, width: 360, boxShadow: "0 20px 40px -10px rgba(15,23,42,0.18)", display: "flex", flexDirection: "column" },
  settingsModalContent: {
    background: "#ffffff",
    borderRadius: 12,
    padding: 28,
    width: 390,
    maxWidth: "calc(100vw - 32px)",
    maxHeight: "calc(100vh - 40px)",
    overflowY: "auto",
    boxShadow: "0 20px 40px -10px rgba(15,23,42,0.2), 0 0 0 1px rgba(0,0,0,0.05)",
    display: "flex",
    flexDirection: "column",
    animation: "scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
  },
  settingsInput: {
    width: "100%",
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "9px 38px 9px 12px",
    fontSize: 13.5,
    outline: "none",
    fontFamily: "inherit",
    background: "#fff",
    color: "#0f172a",
    boxSizing: "border-box",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  eyeToggleBtn: {
    position: "absolute",
    right: 10,
    top: "50%",
    transform: "translateY(-50%)",
    background: "none",
    border: "none",
    cursor: "pointer",
    color: "#94a3b8",
    display: "flex",
    alignItems: "center",
    padding: 4,
    borderRadius: 4,
    transition: "color 0.15s",
  },
  renameInput: { width: "100%", border: "1px solid #cbd5e1", borderRadius: 8, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 12 },
  btnOutline: { background: "#f1f5f9", color: "#334155", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnPrimary: { background: "#0f172a", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600 },
};
