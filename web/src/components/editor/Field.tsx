import React from "react";

interface FieldProps {
  label: string;
  value: string | number;
  onChange?: (val: string) => void;
  multiline?: boolean;
  placeholder?: string;
  disabled?: boolean;
  hint?: string;
  type?: string;
  rows?: number;
  monospace?: boolean;
  required?: boolean;
  error?: boolean;
  autoFocus?: boolean;
}

export default function Field({
  label,
  value,
  onChange,
  multiline = false,
  placeholder = "",
  disabled = false,
  hint = "",
  type = "text",
  rows = 3,
  monospace = false,
  required = false,
  error = false,
  autoFocus = false,
}: FieldProps) {
  const inputStyle = {
    ...s.input,
    ...(disabled ? s.inputDisabled : {}),
    ...(error ? s.inputError : {}),
    ...(monospace ? s.inputMonospace : {}),
  };

  return (
    <div style={s.group}>
      <label style={s.label}>
        {label}
        {required && <span style={s.required}> *</span>}
      </label>

      {multiline ? (
        <textarea
          style={{ ...inputStyle, minHeight: rows * 22, resize: "vertical" } as React.CSSProperties}
          value={value || ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          rows={rows}
          autoFocus={autoFocus}
        />
      ) : (
        <input
          style={inputStyle as React.CSSProperties}
          type={type}
          value={value || ""}
          placeholder={placeholder}
          disabled={disabled}
          onChange={(e) => onChange && onChange(e.target.value)}
          autoFocus={autoFocus}
          data-error={error ? "true" : undefined}
        />
      )}

      {hint && <span style={s.hint}>{hint}</span>}
    </div>
  );
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div style={sl.wrap}>{children}</div>;
}

export function FieldRow({ children, gap = 8 }: { children: React.ReactNode; gap?: number }) {
  return (
    <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
      {children}
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  group: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: 600,
    color: "#888",
    textTransform: "capitalize",
    userSelect: "none",
    fontFamily: "system-ui, sans-serif",
  },
  required: {
    color: "#dc2626",
    fontWeight: 600,
    marginLeft: 2
  },
  input: {
    width: "100%",
    borderWidth: "1px",
    borderStyle: "solid",
    borderColor: "#e8e8e8",
    borderRadius: 4,
    padding: "7px 10px",
    fontSize: 12,
    color: "#333",
    outline: "none",
    fontFamily: "system-ui, sans-serif",
    lineHeight: 1.55,
    background: "#fafafa",
    transition: "border-color .15s, background .15s",
  },
  inputDisabled: {
    background: "#f1f5f9",
    color: "#334155",
    fontWeight: 600,
    cursor: "not-allowed",
    borderColor: "#cbd5e1",
    opacity: 0.9,
  },
  inputError: {
  },
  inputMonospace: {
    fontFamily: "monospace",
    fontSize: 12,
    letterSpacing: 0.3,
  },
  hint: {
    fontSize: 11,
    color: "#bbb",
    lineHeight: 1.4,
    fontFamily: "system-ui, sans-serif",
  },
};

const sl: Record<string, React.CSSProperties> = {
  wrap: {
    fontSize: 10,
    fontWeight: 700,
    color: "#aaa",
    textTransform: "uppercase",
    letterSpacing: 1,
    paddingTop: 10,
    paddingBottom: 6,
    borderBottom: "1px solid #f0f0f0",
    marginBottom: 2,
    fontFamily: "system-ui, sans-serif",
  },
};
