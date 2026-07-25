"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ActivityBell } from "@/components/ActivityBell";
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

  // Pagination & Filtering state
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterClient, setFilterClient] = useState("");
  // Additional filters could go here (from, to, sort)

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
      client: filterClient || undefined,
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
  }, [debouncedSearch, filterType, filterClient]);

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

  return (
    <div style={s.page}>
      {/* ── Header ── */}
      <div style={s.header}>
        <div style={s.headerLeft}>
          <Link href="/" style={s.logoLink}>
            <AsteriskIcon size={18} />
            <span style={s.logoText}>makewithus</span>
          </Link>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <ActivityBell />
          <Link href="/analytics" style={{ ...s.newBtn, background: '#fff', color: '#111', border: '1px solid #ddd' }}>Analytics</Link>
          <Link href="/" style={s.newBtn}>+ New document</Link>
        </div>
      </div>

      <div style={s.wrap}>
        {/* ── Search + Filter bar ── */}
        <div style={s.toolbar}>
          <input
            style={s.searchInput as React.CSSProperties}
            type="text"
            placeholder="Search documents by name, client, or invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div style={s.filterRow}>
            {["all", "invoice", "receipt_template", "client_doc", "compliance", "timeline"].map((f) => (
              <button
                key={f}
                style={{ ...s.filterBtn, ...(filterType === f ? s.filterBtnActive : {}) }}
                onClick={() => setFilterType(f)}
              >
                {f === "all" ? "All" : (TYPE_META[f]?.label ?? f)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
            <input
              style={s.filterInput as React.CSSProperties}
              type="text"
              placeholder="Filter by Client Name..."
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
            />
            {/* Future filters: Date from, Date to, Sort order can be added here easily */}
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
              {!search && filterType === "all" && !filterClient
                ? "No documents yet"
                : "No matching documents"}
            </p>
            {!search && filterType === "all" && !filterClient ? (
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
            {!search && filterType === "all" && !filterClient && (
              <Link href="/" style={s.newBtn}>+ New document</Link>
            )}
          </div>
        )}

        {/* ── Documents grid ── */}
        {!loading && docs.length > 0 && (
          <div style={s.grid}>
            {docs.map(doc => {
              const meta = TYPE_META[doc.template_type] || { label: doc.template_type, icon: "📄", bg: "#f0f0f0", color: "#666" };
              return (
                <div
                  key={doc.id}
                  style={s.card}
                  onClick={() => router.push(`/doc/${doc.id}`)}
                >
                  {/* Card top row */}
                  <div style={s.cardTop}>
                    <span style={{ ...s.typeBadge, background: meta.bg, color: meta.color }}>
                      {meta.icon} {meta.label}
                    </span>
                    <span style={s.cardDate}>{formatDate(doc.createdAt)}</span>
                  </div>

                  <div style={s.cardName}>
                    {doc.project_name || "Untitled Document"}
                  </div>

                  <div style={s.cardId}>/doc/{doc.id}</div>

                  {typeof doc.source_file === 'string' && (
                    <div style={s.cardSource}>
                      📄 {doc.source_file.split("/").pop()?.split("\\").pop()}
                    </div>
                  )}

                  {/* Actions */}
                  <div style={s.cardActions} onClick={e => e.stopPropagation()}>
                    <Link
                      href={`/doc/${doc.id}`}
                      style={s.editLink}
                      onClick={e => e.stopPropagation()}
                    >
                      Open editor →
                    </Link>
                    <div style={{ display: "flex", gap: 12 }}>
                      <button
                        style={{ ...s.deleteBtn, color: "#555", display: "flex", alignItems: "center", gap: 4 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenamingDoc(doc);
                          setRenameInput(doc.project_name || "Untitled Document");
                        }}
                      >
                        <PencilIcon size={12} color="#555" />
                        Rename
                      </button>
                      <button
                        style={deleting === doc.id ? s.deleteBtnDisabled : s.deleteBtn}
                        onClick={e => handleDelete(e, doc.id)}
                        disabled={deleting === doc.id}
                      >
                        {deleting === doc.id ? "Deleting..." : "Delete"}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
    </div>
  );
}


function AsteriskIcon({ size = 18 }: { size?: number }) {
  return (
    <img
      src="/logo.png"
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
  page: { minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui,-apple-system,sans-serif" },

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", height: 56, background: "#fff", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 },
  headerLeft: { display: "flex", alignItems: "center" },
  logoLink: { display: "flex", alignItems: "center", gap: 8, textDecoration: "none" },
  logoText: { fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: -0.3, fontFamily: '"TT Hoves", system-ui, sans-serif' },
  newBtn: { fontSize: 13, fontWeight: 600, background: "#111", color: "#fff", padding: "8px 18px", borderRadius: 4, textDecoration: "none", cursor: "pointer", border: "none" },

  wrap: { maxWidth: 1100, margin: "0 auto", padding: "36px 24px 80px" },

  toolbar: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 },
  searchInput: { width: "100%", maxWidth: 360, border: "1px solid #e8e8e8", borderRadius: 4, padding: "8px 14px", fontSize: 13, color: "#333", outline: "none", fontFamily: "inherit", background: "#fff" },
  filterInput: { padding: "8px 14px", borderRadius: 4, border: "1px solid #e8e8e8", fontSize: 13, outline: "none", width: 200, fontFamily: "inherit" },
  filterRow: { display: "flex", flexWrap: "wrap", gap: 8 },
  filterBtn: { fontSize: 12, padding: "5px 14px", borderRadius: 4, border: "1px solid #e8e8e8", background: "#fff", color: "#666", cursor: "pointer", fontFamily: "inherit" },
  filterBtnActive: { background: "#111", color: "#fff", border: "1px solid #111" },

  centerBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" },
  spinner: { width: 28, height: 28, border: "2.5px solid #eee", borderTopColor: "#111", borderRadius: "50%", animation: "spin .8s linear infinite" },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  },
  card: {
    background: "#fff",
    border: "1px solid #efefef",
    borderRadius: 4,
    padding: "18px 20px",
    cursor: "pointer",
    transition: "box-shadow .15s, border-color .15s",
  },
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  typeBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 4, fontWeight: 500 },
  cardDate: { fontSize: 11, color: "#bbb" },
  cardName: { fontSize: 17, fontWeight: 700, color: "#111", lineHeight: 1.3, marginBottom: 5, fontFamily: '"TT Hoves", system-ui, sans-serif' },
  cardId: { fontSize: 11, color: "#ccc", fontFamily: "monospace", marginBottom: 6 },
  cardSource: { fontSize: 11, color: "#bbb", marginBottom: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  cardActions: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f5f5f5", marginTop: 4 },
  editLink: { fontSize: 13, color: "#111", fontWeight: 600, textDecoration: "none" },
  deleteBtn: { fontSize: 12, color: "#c0392b", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" },
  deleteBtnDisabled: { fontSize: 12, color: "#bbb", background: "none", border: "none", padding: 0 },

  modalOverlay: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.4)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(2px)" },
  modalContent: { background: "#fff", borderRadius: 4, padding: 24, width: 340, boxShadow: "0 10px 40px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column" },
  renameInput: { width: "100%", border: "1.5px solid #e8e8e8", borderRadius: 4, padding: "10px 12px", fontSize: 14, outline: "none", fontFamily: "inherit", marginBottom: 12 },
  btnOutline: { background: "#f5f5f5", color: "#555", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 },
  btnPrimary: { background: "#111", color: "#fff", border: "none", padding: "8px 16px", borderRadius: 4, cursor: "pointer", fontSize: 13, fontWeight: 600 },
};
