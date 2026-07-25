"use client";

import React, { useMemo } from 'react';
import { validateDocument, REQUIRED_FIELDS, RECOMMENDED_FIELDS } from '@/lib/validation';
import { Check } from 'lucide-react';

interface Props {
  templateType: string;
  content: any;
  onApplySuggestion?: (newContent: any) => void;
}

export const AiValidationPanel: React.FC<Props> = ({ templateType, content, onApplySuggestion }) => {
  const validation = useMemo(() => {
    return validateDocument(templateType, content);
  }, [templateType, content]);

  if (!content) return null;

  const reqFields = REQUIRED_FIELDS[templateType] || [];
  const recFields = RECOMMENDED_FIELDS[templateType] || [];

  const hasMissing = validation.missingRequired.length > 0 || validation.missingRecommended.length > 0;
  const hasSuggestions = validation.suggestions.length > 0;
  
  if (!hasMissing && !hasSuggestions && validation.confidenceScore >= 98) {
    return (
      <div style={s.panelSuccess}>
        <div style={s.header}>
          <span style={s.title}>Validation Pass</span>
          <span style={s.scoreHigh}>Confidence: {validation.confidenceScore}%</span>
        </div>
        <div style={s.body}>All required and recommended fields are populated.</div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>Validation Status</span>
        <span style={
          validation.confidenceScore >= 80 ? s.scoreHigh : 
          validation.confidenceScore >= 50 ? s.scoreMed : s.scoreLow
        }>
          Confidence: {validation.confidenceScore}%
        </span>
      </div>

      <div style={s.body}>
        {/* Confidence reasoning */}
        <div style={{ marginBottom: 16, fontSize: 12, color: "#64748b" }}>
          Reason:<br/>
          {reqFields.map(f => {
            const isMissing = validation.missingRequired.includes(f.label);
            return (
              <div key={f.key} style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
                <span style={{ color: isMissing ? "#dc2626" : "#16a34a", fontSize: 11, fontWeight: "bold" }}>
                  {isMissing ? "✕" : "✓"}
                </span>
                <span style={{ color: isMissing ? "#b91c1c" : "#334155", fontWeight: isMissing ? 500 : 400 }}>
                  {f.label} {isMissing ? "missing" : "detected"}
                </span>
              </div>
            );
          })}
          {recFields.map(f => {
            const isMissing = validation.missingRecommended.includes(f.label);
            return (
              <div key={f.key} style={{ display: "flex", gap: 6, marginTop: 5, alignItems: "center" }}>
                <span style={{ color: isMissing ? "#d97706" : "#16a34a", fontSize: 11, fontWeight: "bold" }}>
                  {isMissing ? "⚠" : "✓"}
                </span>
                <span style={{ color: isMissing ? "#b45309" : "#334155", fontWeight: isMissing ? 500 : 400 }}>
                  {f.label} {isMissing ? "missing" : "detected"}
                </span>
              </div>
            );
          })}
          
          <div style={{ marginTop: 10, fontStyle: "italic", fontSize: 11, color: "#94a3b8" }}>
            {validation.confidenceScore < 80 
              ? "Overall confidence reduced due to missing required fields." 
              : "Confidence is high, but some optimizations exist."}
          </div>
        </div>

        {hasSuggestions && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Required Format Fixes:</div>
            <div style={s.suggestionList}>
              {validation.suggestions.map(sug => (
                <div key={sug.id} style={s.suggestionItem}>
                  <div style={{ flex: 1 }}>
                    {sug.originalValue && sug.newValue ? (
                      <>
                        <div style={{ fontSize: 11, color: "#64748b" }}>Detected: {sug.originalValue}</div>
                        <div style={{ fontSize: 13, color: "#334155", fontWeight: 500, marginTop: 2 }}>Convert to: <br/>{sug.newValue}</div>
                      </>
                    ) : (
                      <span style={s.suggestionText}>{sug.message}</span>
                    )}
                  </div>
                  {onApplySuggestion && (
                    <button 
                      style={s.fixBtn} 
                      onClick={() => onApplySuggestion(sug.apply(content))}
                    >
                      <Check size={12} style={{ marginRight: 4, display: 'inline-block', verticalAlign: 'middle' }} />
                      <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>{sug.actionLabel}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const s: Record<string, React.CSSProperties> = {
  panel: {
    border: '1px solid #e2e8f0',
    borderRadius: '4px',
    backgroundColor: '#fff',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  panelSuccess: {
    border: '1px solid #bbf7d0',
    borderRadius: '4px',
    backgroundColor: '#f0fdf4',
    padding: '20px',
    fontFamily: 'system-ui, sans-serif',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  title: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#1e293b',
    display: 'flex',
    alignItems: 'center',
    gap: '6px'
  },
  scoreHigh: {
    fontWeight: 600,
    fontSize: '11px',
    color: '#16a34a',
    backgroundColor: '#ecfdf5',
    border: '1px solid #d1fae5',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  scoreMed: {
    fontWeight: 600,
    fontSize: '11px',
    color: '#d97706',
    backgroundColor: '#fffbeb',
    border: '1px solid #fef3c7',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  scoreLow: {
    fontWeight: 600,
    fontSize: '11px',
    color: '#dc2626',
    backgroundColor: '#fef2f2',
    border: '1px solid #fee2e2',
    padding: '3px 8px',
    borderRadius: '4px'
  },
  body: {
    fontSize: '13px',
    color: '#475569'
  },
  section: {
    marginTop: '16px',
    borderTop: '1px solid #f1f5f9',
    paddingTop: '16px'
  },
  sectionTitle: {
    fontWeight: 700,
    marginBottom: '12px',
    color: '#1e293b',
    fontSize: '13px'
  },
  suggestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    border: '1px solid #f1f5f9',
    padding: '12px',
    borderRadius: '4px',
  },
  suggestionText: {
    color: '#475569',
    fontSize: '12px'
  },
  fixBtn: {
    backgroundColor: '#1e293b',
    color: '#fff',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'background 0.2s',
    display: 'flex',
    alignItems: 'center'
  }
};
