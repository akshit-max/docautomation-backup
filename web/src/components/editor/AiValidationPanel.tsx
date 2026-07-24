"use client";

import React, { useMemo } from 'react';
import { validateDocument } from '@/lib/validation';

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

  const hasMissing = validation.missingRequired.length > 0 || validation.missingRecommended.length > 0;
  const hasSuggestions = validation.suggestions.length > 0;
  
  if (!hasMissing && !hasSuggestions && validation.confidenceScore >= 98) {
    return (
      <div style={s.panelSuccess}>
        <div style={s.header}>
          <span style={s.title}>✨ AI Validation Pass</span>
          <span style={s.scoreHigh}>{validation.confidenceScore}% Confidence</span>
        </div>
        <div style={s.body}>All required and recommended fields are populated.</div>
      </div>
    );
  }

  return (
    <div style={s.panel}>
      <div style={s.header}>
        <span style={s.title}>🤖 AI Validation</span>
        <span style={
          validation.confidenceScore >= 80 ? s.scoreHigh : 
          validation.confidenceScore >= 50 ? s.scoreMed : s.scoreLow
        }>
          {validation.confidenceScore}% Confidence
        </span>
      </div>

      <div style={s.body}>
        {validation.missingRequired.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Missing Required Fields:</div>
            <ul style={s.list}>
              {validation.missingRequired.map(f => (
                <li key={f} style={s.missingReq}>— {f}</li>
              ))}
            </ul>
          </div>
        )}

        {validation.missingRecommended.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Missing Recommended Fields:</div>
            <ul style={s.list}>
              {validation.missingRecommended.map(f => (
                <li key={f} style={s.missingRec}>— {f}</li>
              ))}
            </ul>
          </div>
        )}

        {hasSuggestions && (
          <div style={s.section}>
            <div style={s.sectionTitle}>One-click Fixes:</div>
            <div style={s.suggestionList}>
              {validation.suggestions.map(sug => (
                <div key={sug.id} style={s.suggestionItem}>
                  <span style={s.suggestionText}>{sug.message}</span>
                  {onApplySuggestion && (
                    <button 
                      style={s.fixBtn} 
                      onClick={() => onApplySuggestion(sug.apply(content))}
                    >
                      {sug.actionLabel}
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
    borderRadius: '8px',
    backgroundColor: '#f8fafc',
    padding: '16px',
    marginBottom: '24px',
    fontFamily: 'system-ui, sans-serif'
  },
  panelSuccess: {
    border: '1px solid #bbf7d0',
    borderRadius: '8px',
    backgroundColor: '#f0fdf4',
    padding: '16px',
    marginBottom: '24px',
    fontFamily: 'system-ui, sans-serif'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px'
  },
  title: {
    fontWeight: 600,
    fontSize: '14px',
    color: '#0f172a'
  },
  scoreHigh: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#16a34a',
    backgroundColor: '#dcfce7',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  scoreMed: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#ca8a04',
    backgroundColor: '#fef08a',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  scoreLow: {
    fontWeight: 600,
    fontSize: '13px',
    color: '#dc2626',
    backgroundColor: '#fee2e2',
    padding: '4px 8px',
    borderRadius: '4px'
  },
  body: {
    fontSize: '13px',
    color: '#475569'
  },
  section: {
    marginTop: '12px'
  },
  sectionTitle: {
    fontWeight: 600,
    marginBottom: '4px',
    color: '#334155'
  },
  list: {
    margin: 0,
    padding: 0,
    listStyle: 'none'
  },
  missingReq: {
    color: '#ef4444',
    marginBottom: '2px'
  },
  missingRec: {
    color: '#f59e0b',
    marginBottom: '2px'
  },
  suggestionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  suggestionItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    padding: '8px',
    borderRadius: '6px'
  },
  suggestionText: {
    color: '#334155'
  },
  fixBtn: {
    backgroundColor: '#3b82f6',
    color: '#fff',
    border: 'none',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer'
  }
};
