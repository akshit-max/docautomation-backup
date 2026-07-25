"use client";

import { useState, useEffect, useRef } from 'react';
import { getActivities } from '@/lib/api';
import Link from 'next/link';

export function ActivityBell() {
  const [open, setOpen] = useState(false);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(false); // Just a generic dot indicator for MVP
  const ref = useRef<HTMLDivElement>(null);

  // Fetch activities when dropdown opens
  useEffect(() => {
    if (open) {
      setLoading(true);
      getActivities(10)
        .then(res => {
          setActivities(res.data.activities || []);
          setUnread(false);
        })
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [open]);

  // Click outside to close
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

  // Icon depending on status
  const getIcon = (status: string) => {
    if (status === 'success') return <span style={{ color: '#10b981' }}>✔</span>;
    if (status === 'failed') return <span style={{ color: '#ef4444' }}>✖</span>;
    return <span style={{ color: '#3b82f6' }}>ℹ</span>;
  };

  const formatActivityText = (act: any) => {
    const { type, title } = act;
    switch (type) {
      case 'DOCUMENT_CREATED': return `Created: ${title}`;
      case 'OCR_COMPLETED': return `OCR Complete: ${title}`;
      case 'OCR_FAILED': return `OCR Failed: ${title}`;
      case 'VERSION_CREATED': return `Version Created: ${title}`;
      case 'BATCH_COMPLETED': return `Batch Complete: ${title}`;
      case 'BATCH_FAILED': return `Batch Failed: ${title}`;
      default: return title || type;
    }
  };

  const getTargetUrl = (act: any) => {
    if (act.entityType === 'document' || act.entityType === 'version') return `/doc/${act.entityId}`;
    if (act.entityType === 'batch') return `/batch/${act.entityId}`;
    return '#';
  };

  const timeAgo = (dateStr: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(dateStr).getTime()) / 1000);
    if (seconds < 60) return `${Math.max(0, seconds)}s ago`;
    const min = Math.floor(seconds / 60);
    if (min < 60) return `${min}m ago`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `${hr}h ago`;
    const d = Math.floor(hr / 24);
    return `${d}d ago`;
  };

  return (
    <div style={{ position: 'relative' }} ref={ref}>
      <button 
        style={s.bellBtn}
        onClick={() => setOpen(!open)}
        aria-label="Activity"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {/* Mock unread dot if wanted */}
        {unread && <div style={s.unreadDot} />}
      </button>

      {open && (
        <div style={s.dropdown}>
          <div style={s.dropdownHeader}>
            <h3 style={s.dropdownTitle}>Recent Activity</h3>
          </div>
          
          <div style={s.activityList}>
            {loading ? (
              <div style={s.loadingText}>Loading...</div>
            ) : activities.length === 0 ? (
              <div style={s.emptyText}>No recent activity</div>
            ) : (
              activities.map((act) => (
                <Link key={act.id} href={getTargetUrl(act)} style={s.activityItem} onClick={() => setOpen(false)}>
                  <div style={s.activityIcon}>
                    {getIcon(act.status)}
                  </div>
                  <div style={s.activityContent}>
                    <div style={s.activityTitle}>{formatActivityText(act)}</div>
                    <div style={s.activityTime}>
                      {timeAgo(act.createdAt)}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
          
          <div style={s.dropdownFooter}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Activity Center</span>
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
    transition: 'all 0.2s'
  },
  unreadDot: {
    position: 'absolute',
    top: 6,
    right: 8,
    width: 8,
    height: 8,
    background: '#ef4444',
    borderRadius: '50%',
    border: '2px solid #fff'
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 8,
    width: 320,
    background: '#fff',
    border: '1px solid #e2e8f0',
    borderRadius: 12,
    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
    zIndex: 100,
    overflow: 'hidden'
  },
  dropdownHeader: {
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    background: '#f8fafc'
  },
  dropdownTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 600,
    color: '#0f172a'
  },
  activityList: {
    maxHeight: 360,
    overflowY: 'auto'
  },
  loadingText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8'
  },
  emptyText: {
    padding: 24,
    textAlign: 'center',
    fontSize: 13,
    color: '#94a3b8'
  },
  activityItem: {
    display: 'flex',
    padding: '12px 16px',
    borderBottom: '1px solid #f1f5f9',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'background 0.15s'
  },
  activityIcon: {
    fontSize: 14,
    marginRight: 12,
    marginTop: 2
  },
  activityContent: {
    flex: 1
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: 500,
    color: '#1e293b',
    marginBottom: 4,
    lineHeight: 1.4
  },
  activityTime: {
    fontSize: 11,
    color: '#94a3b8'
  },
  dropdownFooter: {
    padding: '8px 16px',
    background: '#f8fafc',
    textAlign: 'center',
    borderTop: '1px solid #f1f5f9'
  }
};
