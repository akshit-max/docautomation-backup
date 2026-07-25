"use client";

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  Upload, 
  Pencil, 
  History, 
  RotateCcw, 
  Languages, 
  Sparkles, 
  MessageSquare, 
  Download, 
  Bell, 
  ArrowRight,
  FileText,
  Tag,
  Star,
  StickyNote
} from 'lucide-react';

const CATEGORIES = ['All', 'Documents', 'AI', 'Versions', 'Export'] as const;
type Category = typeof CATEGORIES[number];

export function ActivityBell() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [category, setCategory] = useState<Category>('All');
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unread, setUnread] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const fetchActivities = async (cat: Category, cursor?: string | null, append: boolean = false) => {
    if (append) setLoadingMore(true);
    else setLoading(true);

    try {
      const url = new URL('/api/activity', window.location.origin);
      url.searchParams.set('limit', '20');
      url.searchParams.set('filter', cat);
      if (cursor) url.searchParams.set('startAfter', cursor);

      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Failed to fetch activities');
      const data = await res.json();

      if (append) {
        setActivities(prev => [...prev, ...(data.activities || [])]);
      } else {
        setActivities(data.activities || []);
        setUnread(false);
      }
      setHasMore(!!data.hasMore);
      setNextCursor(data.nextCursor || null);
    } catch (err) {
      console.error('Error loading activities:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchActivities(category, null, false);
    }
  }, [open, category]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'DOCUMENT_CREATED':
      case 'OCR_COMPLETED':
        return <Upload size={15} color="#475569" />;
      case 'DOCUMENT_UPDATED':
        return <Pencil size={15} color="#475569" />;
      case 'VERSION_CREATED':
        return <History size={15} color="#475569" />;
      case 'VERSION_RESTORED':
        return <RotateCcw size={15} color="#475569" />;
      case 'TRANSLATION_COMPLETED':
        return <Languages size={15} color="#475569" />;
      case 'AI_SUMMARY_GENERATED':
        return <Sparkles size={15} color="#475569" />;
      case 'CHAT_SESSION_STARTED':
        return <MessageSquare size={15} color="#475569" />;
      case 'DOCUMENT_EXPORTED':
        return <Download size={15} color="#475569" />;
      case 'STATUS_CHANGED':
        return <Tag size={15} color="#475569" />;
      case 'TAG_ADDED':
      case 'TAG_REMOVED':
        return <Tag size={15} color="#475569" />;
      case 'FAVORITED':
      case 'UNFAVORITED':
        return <Star size={15} color="#eab308" />;
      case 'NOTES_UPDATED':
        return <StickyNote size={15} color="#475569" />;
      default:
        return <FileText size={15} color="#475569" />;
    }
  };

  const getActivityTitle = (type: string) => {
    switch (type) {
      case 'DOCUMENT_CREATED':
      case 'OCR_COMPLETED':
        return 'Document Uploaded';
      case 'DOCUMENT_UPDATED':
        return 'Document Updated';
      case 'VERSION_CREATED':
        return 'Version Created';
      case 'VERSION_RESTORED':
        return 'Version Restored';
      case 'TRANSLATION_COMPLETED':
        return 'Translation Completed';
      case 'AI_SUMMARY_GENERATED':
        return 'AI Summary Generated';
      case 'CHAT_SESSION_STARTED':
        return 'Chat Session Started';
      case 'DOCUMENT_EXPORTED':
        return 'Document Exported';
      case 'STATUS_CHANGED':
        return 'Status Changed';
      case 'TAG_ADDED':
        return 'Tag Added';
      case 'TAG_REMOVED':
        return 'Tag Removed';
      case 'FAVORITED':
        return 'Favorited';
      case 'UNFAVORITED':
        return 'Unfavorited';
      case 'NOTES_UPDATED':
        return 'Notes Updated';
      default:
        return 'Activity Logged';
    }
  };

  const getTargetUrl = (act: any) => {
    if (act.entityType === 'document' || act.entityType === 'version') return `/doc/${act.entityId}`;
    if (act.entityType === 'batch') return `/batch/${act.entityId}`;
    return act.entityId ? `/doc/${act.entityId}` : '#';
  };

  const formatRelativeTime = (dateStr: string) => {
    if (!dateStr) return '';
    const now = new Date().getTime();
    const date = new Date(dateStr).getTime();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    const min = Math.floor(diffSec / 60);
    if (min < 60) return `${min} min ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr} hour${hr > 1 ? 's' : ''} ago`;
    const d = Math.floor(hr / 24);
    if (d === 1) return 'Yesterday';
    if (d < 7) return `${d} days ago`;

    const dt = new Date(dateStr);
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const formatTooltipTime = (dateStr: string) => {
    if (!dateStr) return '';
    const dt = new Date(dateStr);
    return dt.toLocaleString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button 
        style={s.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Activity Center"
      >
        <Bell size={18} />
        {unread && <div style={s.unreadDot} />}
      </button>

      {open && (
        <div style={s.dropdown}>
          <div style={s.dropdownHeader}>
            <h3 style={s.dropdownTitle}>Activity Center</h3>
            <div style={s.chipsContainer}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  style={{
                    ...s.chip,
                    ...(category === cat ? s.chipActive : s.chipInactive)
                  }}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          
          <div style={s.activityList}>
            {loading ? (
              /* Skeleton Loader */
              <div style={s.skeletonContainer}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={s.skeletonItem}>
                    <div style={s.skeletonIcon} />
                    <div style={s.skeletonContent}>
                      <div style={s.skeletonTitle} />
                      <div style={s.skeletonSub} />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              /* Empty State */
              <div style={s.emptyContainer}>
                <div style={s.emptyTitle}>No recent activity yet</div>
                <div style={s.emptySub}>
                  Upload a document or edit an existing one to see your activity history.
                </div>
              </div>
            ) : (
              activities.map((act) => (
                <div key={act.id} style={s.activityCard}>
                  <div style={s.activityHeader}>
                    <div style={s.iconWrapper}>
                      {getIcon(act.type)}
                    </div>
                    <div style={s.activityMeta}>
                      <div style={s.activityTitle}>{getActivityTitle(act.type)}</div>
                      <div style={s.activitySub} title={act.title || 'Untitled Document'}>
                        {act.type === 'STATUS_CHANGED' && act.metadata?.oldStatus && act.metadata?.newStatus
                          ? `${act.metadata.oldStatus} → ${act.metadata.newStatus}`
                          : act.type === 'TAG_ADDED' && act.metadata?.tag
                          ? `Added tag '${act.metadata.tag}'`
                          : act.type === 'TAG_REMOVED' && act.metadata?.tag
                          ? `Removed tag '${act.metadata.tag}'`
                          : (act.title || 'Untitled Document')}
                      </div>
                    </div>
                    <div style={s.timeBadge} title={formatTooltipTime(act.createdAt)}>
                      {formatRelativeTime(act.createdAt)}
                    </div>
                  </div>
                  
                  <div style={s.cardFooter}>
                    <Link 
                      href={getTargetUrl(act)} 
                      style={s.openLink}
                      onClick={() => setOpen(false)}
                    >
                      <span>Open Document</span>
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              ))
            )}

            {/* Pagination Load More */}
            {hasMore && !loading && (
              <div style={s.loadMoreContainer}>
                <button 
                  style={s.loadMoreBtn} 
                  disabled={loadingMore}
                  onClick={() => fetchActivities(category, nextCursor, true)}
                >
                  {loadingMore ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
          
          <div style={s.dropdownFooter}>
            <span>Enterprise Audit Trail</span>
          </div>
        </div>
      )}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  bellBtn: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: 8,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    transition: 'color 0.15s, background-color 0.15s',
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 7,
    height: 7,
    background: '#ef4444',
    borderRadius: '50%',
    border: '2px solid #fff'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 10,
    width: 360,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.12), 0 10px 15px -5px rgba(0, 0, 0, 0.05)',
    zIndex: 100,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 520,
  },
  dropdownHeader: {
    padding: '14px 16px 12px',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
  },
  dropdownTitle: {
    margin: 0,
    fontSize: 14.5,
    fontWeight: 700,
    color: '#0f172a',
    fontFamily: '"TT Hoves", system-ui, sans-serif',
  },
  chipsContainer: {
    display: 'flex',
    gap: 6,
    overflowX: 'auto',
    paddingBottom: 2,
  },
  chip: {
    padding: '4px 10px',
    borderRadius: 999,
    fontSize: 11.5,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  },
  chipActive: {
    backgroundColor: '#0f172a',
    color: '#ffffff',
  },
  chipInactive: {
    backgroundColor: '#e2e8f0',
    color: '#475569',
  },
  activityList: {
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
  },
  activityCard: {
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    transition: 'background-color 0.15s',
  },
  activityHeader: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  activityMeta: {
    flex: 1,
    minWidth: 0,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: '#0f172a',
    lineHeight: 1.3,
  },
  activitySub: {
    fontSize: 12,
    color: '#64748b',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    marginTop: 2,
  },
  timeBadge: {
    fontSize: 11,
    color: '#94a3b8',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  openLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#2563eb',
    textDecoration: 'none',
  },
  emptyContainer: {
    padding: '36px 20px',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 13.5,
    fontWeight: 600,
    color: '#334155',
  },
  emptySub: {
    fontSize: 12,
    color: '#94a3b8',
    lineHeight: 1.5,
    maxWidth: 240,
  },
  skeletonContainer: {
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  skeletonItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  skeletonIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    flexShrink: 0,
  },
  skeletonContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  skeletonTitle: {
    height: 12,
    width: '60%',
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
  },
  skeletonSub: {
    height: 10,
    width: '40%',
    backgroundColor: '#f8fafc',
    borderRadius: 4,
  },
  loadMoreContainer: {
    padding: '12px 16px',
    textAlign: 'center',
    borderTop: '1px solid #f1f5f9',
  },
  loadMoreBtn: {
    background: '#f1f5f9',
    border: 'none',
    color: '#334155',
    fontSize: 12,
    fontWeight: 600,
    padding: '6px 16px',
    borderRadius: 6,
    cursor: 'pointer',
    transition: 'background-color 0.15s',
  },
  dropdownFooter: {
    padding: '10px 16px',
    background: '#f8fafc',
    textAlign: 'center',
    borderTop: '1px solid #f1f5f9',
    fontSize: 11,
    fontWeight: 600,
    color: '#94a3b8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  }
};
