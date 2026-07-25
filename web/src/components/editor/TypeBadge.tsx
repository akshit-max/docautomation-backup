import React from "react";

const TYPES: Record<string, { label: string, icon?: string, bg: string, color: string, border: string }> = {
  developer_doc: {
    label: "Developer Doc",
    bg:    "#EEEDFE",
    color: "#534AB7",
    border:"#AFA9EC",
  },
  client_doc: {
    label: "Client Proposal",
    bg:    "#E1F5EE",
    color: "#0F6E56",
    border:"#5DCAA5",
  },
  compliance: {
    label: "Compliance",
    bg:    "#FAEEDA",
    color: "#854F0B",
    border:"#EF9F27",
  },
  invoice: {
    label: "Invoice",
    bg:    "#FAECE7",
    color: "#993C1D",
    border:"#F0997B",
  },
  timeline: {
    label: "Timeline",
    bg:    "#E6F1FB",
    color: "#185FA5",
    border:"#85B7EB",
  },
};

const FALLBACK = {
  label: "Document",
  bg:    "#f0f0f0",
  color: "#666",
  border:"#ddd",
};

const SIZES: Record<string, React.CSSProperties> = {
  sm: { fontSize: 10, padding: "1px 7px", borderRadius: 4 },
  md: { fontSize: 11, padding: "2px 9px", borderRadius: 4 },
  lg: { fontSize: 12, padding: "4px 12px", borderRadius: 4 },
};

interface TypeBadgeProps {
  type: string;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
}

export default function TypeBadge({ type, size = "md", iconOnly = false }: TypeBadgeProps) {
  const meta = TYPES[type] || FALLBACK;
  const sizeStyle = SIZES[size] || SIZES.md;

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: iconOnly ? 0 : 5,
        background: meta.bg,
        color: meta.color,
        border: `0.5px solid ${meta.border}`,
        fontWeight: 500,
        fontFamily: "system-ui, -apple-system, sans-serif",
        whiteSpace: "nowrap",
        flexShrink: 0,
        ...sizeStyle,
      }}
      title={meta.label}
    >
      {meta.icon && (
        <span style={{ fontSize: (sizeStyle.fontSize as number) + 1 }}>{meta.icon}</span>
      )}
      {!iconOnly && <span>{meta.label}</span>}
    </span>
  );
}
