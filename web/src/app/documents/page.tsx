"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listDocuments, deleteDocument } from "@/lib/api";

const TYPE_META: Record<string, { label: string, icon: string, bg: string, color: string }> = {
  receipt_template: { label: "Receipt Template",    icon: "⚙️", bg: "#EEEDFE", color: "#534AB7" },
  client_doc:       { label: "Client Proposal",     icon: "📋", bg: "#E1F5EE", color: "#0F6E56" },
  compliance:       { label: "Compliance",          icon: "📄", bg: "#FAEEDA", color: "#854F0B" },
  invoice:          { label: "Invoice",             icon: "🧾", bg: "#FAECE7", color: "#993C1D" },
  timeline:         { label: "Timeline",            icon: "🧾", bg: "#FAECE7", color: "#993C1D" },
};

export default function Documents() {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [renamingDoc, setRenamingDoc] = useState<any | null>(null);
  const [renameInput, setRenameInput] = useState("");
  const router = useRouter();

  const load = () => {
    setLoading(true);
    listDocuments()
      .then(r => {
        setDocs(r.data.documents || r.data || []);
      })
      .catch(err => {
        console.error(err);
        setDocs([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm("Delete this document permanently?")) return;
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
      if (docToUpdate.template_type === "compliance") key = "client_name";  // compliance shows client_name in dashboard
      if (docToUpdate.template_type === "receipt_template") key = "for_service"; // fixed: was 'service_name' (legacy name removed in Phase 4)
      if (docToUpdate.template_type === "developer_doc") key = "title";
      
      const { updateDocument } = await import('@/lib/api');
      await updateDocument(docToUpdate.id, { ...(docToUpdate.content || {}), [key]: newName });
    } catch (err) {
      alert("Rename failed. Please try again.");
      load(); // revert
    }
  };

  const filtered = docs.filter(d => {
    const matchType = filter === "all" || d.template_type === filter;
    
    const term = search.toLowerCase();
    let matchSearch = true;
    
    if (term) {
      const pName = (d.project_name || "").toLowerCase();
      const rawText = (d.raw_input || "").toLowerCase();
      // [ARCH-DEBT: CLIENT-SIDE SEARCH]
      // Condition for replacement: When total document count exceeds ~1000 and rendering/searching becomes a measurable bottleneck,
      // move to server-side querying or an indexed search solution (e.g. Algolia/Elastic). Do not replace prematurely.
      const contentText = d.content ? JSON.stringify(d.content).toLowerCase() : "";
      
      matchSearch = pName.includes(term) || contentText.includes(term) || rawText.includes(term);
    }
    
    return matchType && matchSearch;
  });

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
        <div style={{ display: 'flex', gap: 12 }}>
          <Link href="/analytics" style={{...s.newBtn, background: '#fff', color: '#111', border: '1px solid #ddd'}}>Analytics</Link>
          <Link href="/" style={s.newBtn}>+ New document</Link>
        </div>
      </div>

      <div style={s.wrap}>
        {/* ── Search + Filter bar ── */}
        {!loading && (
          <div style={s.toolbar}>
            <input
              style={s.searchInput as React.CSSProperties}
              type="text"
              placeholder="Search documents..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div style={s.filterRow}>
              {["all", "invoice", "receipt_template", "client_doc", "compliance", "timeline"].map((f) => (
                <button
                  key={f}
                  style={{ ...s.filterBtn, ...(filter === f ? s.filterBtnActive : {}) }}
                  onClick={() => setFilter(f)}
                >
                  {f === "all" ? "All" : (TYPE_META[f]?.label ?? f)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {loading && (
          <div style={s.centerBox}>
            <div style={s.spinner} />
            <p style={{ fontSize: 14, color: "#888", marginTop: 12 }}>Loading documents...</p>
          </div>
        )}

        {/* ── Empty state ── */}
        {!loading && filtered.length === 0 && (
          <div style={s.centerBox}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            <p style={{ fontSize: 16, fontWeight: 600, color: "#333", marginBottom: 6 }}>
              {docs.length === 0 ? "No documents yet" : "No documents match your search"}
            </p>
            <p style={{ fontSize: 13, color: "#aaa", marginBottom: 24 }}>
              {docs.length === 0
                ? "Create your first document or upload a PDF to get started."
                : "Try adjusting your search or filter."}
            </p>
            {docs.length === 0 && (
              <Link href="/" style={s.newBtn}>+ New document</Link>
            )}
          </div>
        )}

        {/* ── Documents grid ── */}
        {!loading && filtered.length > 0 && (
          <div style={s.grid}>
            {filtered.map(doc => {
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

                  {doc.source_file && (
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
        <div style={modalStyles.overlay} onClick={() => setRenamingDoc(null)}>
          <div style={modalStyles.content} onClick={e => e.stopPropagation()}>
            <h3 style={modalStyles.title}>Rename Document</h3>
            <input 
              autoFocus
              style={modalStyles.input as React.CSSProperties}
              value={renameInput}
              onChange={e => setRenameInput(e.target.value)}
              onKeyDown={e => {
                 if (e.key === 'Enter') handleSaveRename();
                 if (e.key === 'Escape') setRenamingDoc(null);
              }}
              onFocus={e => e.target.select()}
            />
            <div style={modalStyles.actions}>
              <button style={modalStyles.cancel} onClick={() => setRenamingDoc(null)}>Cancel</button>
              <button style={modalStyles.save} onClick={handleSaveRename}>Save changes</button>
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
      <path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>
      <path d="m15 5 4 4"/>
    </svg>
  );
}

const s = {
  page: { minHeight: "100vh", background: "#fafafa", fontFamily: "system-ui,-apple-system,sans-serif" } as React.CSSProperties,

  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 24px", height: 56, background: "#fff", borderBottom: "1px solid #e8e8e8", position: "sticky", top: 0, zIndex: 10 } as React.CSSProperties,
  headerLeft: { display: "flex", alignItems: "center" } as React.CSSProperties,
  logoLink: { display: "flex", alignItems: "center", gap: 8, textDecoration: "none" } as React.CSSProperties,
  logoText: { fontSize: 15, fontWeight: 700, color: "#111", letterSpacing: -0.3 } as React.CSSProperties,
  newBtn: { fontSize: 13, fontWeight: 600, background: "#111", color: "#fff", padding: "8px 18px", borderRadius: 8, textDecoration: "none" } as React.CSSProperties,

  wrap: { maxWidth: 1100, margin: "0 auto", padding: "36px 24px 80px" } as React.CSSProperties,

  toolbar: { display: "flex", flexDirection: "column", gap: 12, marginBottom: 28 } as React.CSSProperties,
  searchInput: { width: "100%", maxWidth: 360, border: "1px solid #e8e8e8", borderRadius: 8, padding: "8px 14px", fontSize: 13, color: "#333", outline: "none", fontFamily: "inherit", background: "#fff" } as React.CSSProperties,
  filterRow: { display: "flex", flexWrap: "wrap", gap: 8 } as React.CSSProperties,
  filterBtn: { fontSize: 12, padding: "5px 14px", borderRadius: 20, border: "1px solid #e8e8e8", background: "#fff", color: "#666", cursor: "pointer", fontFamily: "inherit" } as React.CSSProperties,
  filterBtnActive: { background: "#111", color: "#fff", border: "1px solid #111" } as React.CSSProperties,

  centerBox: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0", textAlign: "center" } as React.CSSProperties,
  spinner: { width: 28, height: 28, border: "2.5px solid #eee", borderTopColor: "#111", borderRadius: "50%", animation: "spin .8s linear infinite" } as React.CSSProperties,

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: 14,
  } as React.CSSProperties,
  card: {
    background: "#fff",
    border: "1px solid #efefef",
    borderRadius: 12,
    padding: "18px 20px",
    cursor: "pointer",
    transition: "box-shadow .15s, border-color .15s",
  } as React.CSSProperties,
  cardTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 } as React.CSSProperties,
  typeBadge: { fontSize: 11, padding: "3px 10px", borderRadius: 20, fontWeight: 500 } as React.CSSProperties,
  cardDate: { fontSize: 11, color: "#bbb" } as React.CSSProperties,
  cardName: { fontSize: 17, fontWeight: 700, color: "#111", lineHeight: 1.3, marginBottom: 5 } as React.CSSProperties,
  cardId: { fontSize: 11, color: "#ccc", fontFamily: "monospace", marginBottom: 6 } as React.CSSProperties,
  cardSource: { fontSize: 11, color: "#bbb", marginBottom: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as React.CSSProperties,
  cardActions: { display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #f5f5f5", marginTop: 4 } as React.CSSProperties,
  editLink: { fontSize: 13, color: "#111", fontWeight: 600, textDecoration: "none" } as React.CSSProperties,
  deleteBtn: { fontSize: 12, color: "#c0392b", background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" } as React.CSSProperties,
  deleteBtnDisabled: { fontSize: 12, color: "#bbb", background: "none", border: "none", padding: 0 } as React.CSSProperties,
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
