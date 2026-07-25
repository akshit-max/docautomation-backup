"use client";

import React, { useState, useEffect } from 'react';
import { StickyNote, Check, Loader2 } from 'lucide-react';
import { notify } from '@/lib/notify';

interface NotesPanelProps {
  documentId: string;
  initialNotes: string;
}

export function NotesPanel({ documentId, initialNotes }: NotesPanelProps) {
  const [notes, setNotes] = useState(initialNotes || "");
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isSaved) {
      const timer = setTimeout(() => setIsSaved(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isSaved]);

  const handleSave = async () => {
    if (notes === initialNotes && !isOpen) return; // No changes
    setIsSaving(true);
    try {
      const res = await fetch(`/api/doc/${documentId}/notes`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save notes');
      }
      setIsSaved(true);
    } catch (err: any) {
      notify.error(err.message || "Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          background: isOpen ? "#f5f5f5" : "#fff", 
          border: "1px solid #e8e8e8", 
          color: "#111", 
          padding: "6px 12px", 
          borderRadius: 4, 
          cursor: "pointer", 
          fontSize: 13, 
          fontWeight: 500, 
          display: "flex", 
          alignItems: "center" 
        }}
      >
        <StickyNote size={14} style={{ marginRight: 6 }} /> 
        Notes
        {notes && <span style={{ marginLeft: 6, display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: '#eab308' }} />}
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, width: 320, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <textarea
              style={{
                width: '100%',
                minHeight: 120,
                padding: '10px 12px',
                border: '1px solid #e8e8e8',
                borderRadius: 4,
                fontSize: 13,
                fontFamily: 'inherit',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
                marginBottom: 12
              }}
              placeholder="Add private notes, reminders, or client details here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={handleSave}
                disabled={isSaving || (notes === initialNotes)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: isSaved ? '#16a34a' : '#111',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: 4,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: (isSaving || (notes === initialNotes && !isSaved)) ? 'not-allowed' : 'pointer',
                  opacity: (isSaving || (notes === initialNotes && !isSaved)) ? 0.7 : 1
                }}
              >
                {isSaving ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> : isSaved ? <Check size={14} /> : <StickyNote size={14} />}
                {isSaving ? 'Saving...' : isSaved ? 'Saved' : 'Save Notes'}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
