"use client";

import React, { useState } from 'react';
import { Tag, X } from 'lucide-react';
import { notify } from '@/lib/notify';

interface TagEditorProps {
  documentId: string;
  initialTags: string[];
}

export function TagEditor({ documentId, initialTags }: TagEditorProps) {
  const [tags, setTags] = useState<string[]>(initialTags || []);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddTag = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (!newTag) return;
      if (newTag.length > 30) {
        notify.error("Tag is too long (max 30 chars)");
        return;
      }
      if (tags.length >= 20) {
        notify.error("Maximum 20 tags allowed");
        return;
      }
      if (tags.some(t => t.toLowerCase() === newTag.toLowerCase())) {
        notify.error("Tag already exists");
        return;
      }

      setInputValue("");
      const previousTags = [...tags];
      const nextTags = [...tags, newTag].sort((a, b) => a.localeCompare(b));
      setTags(nextTags);
      setLoading(true);

      try {
        const res = await fetch(`/api/doc/${documentId}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: newTag })
        });
        if (!res.ok) throw new Error();
      } catch (err) {
        notify.error("Failed to add tag");
        setTags(previousTags);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    const previousTags = [...tags];
    setTags(tags.filter(t => t !== tagToRemove));
    setLoading(true);

    try {
      const res = await fetch(`/api/doc/${documentId}/tags`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: tagToRemove })
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      notify.error("Failed to remove tag");
      setTags(previousTags);
    } finally {
      setLoading(false);
    }
  };

  const [isOpen, setIsOpen] = useState(false);

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
        <Tag size={14} style={{ marginRight: 6 }} /> Tags
      </button>

      {isOpen && (
        <>
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} onClick={() => setIsOpen(false)} />
          <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 6, padding: 12, width: 240, zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: tags.length ? 12 : 0 }}>
              {tags.map(t => (
                <span key={t} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#f5f5f5', color: '#555', fontSize: 12, padding: '2px 8px', borderRadius: 4, fontWeight: 500 }}>
                  {t}
                  <button 
                    onClick={() => handleRemoveTag(t)}
                    disabled={loading}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', color: '#888' }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            
            {tags.length < 20 && (
              <input
                type="text"
                placeholder="Type tag & press enter..."
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={handleAddTag}
                disabled={loading}
                style={{
                  border: '1px solid #e8e8e8',
                  borderRadius: 4,
                  padding: '6px 10px',
                  outline: 'none',
                  fontSize: 13,
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
