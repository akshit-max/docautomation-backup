"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, ArrowRight } from "lucide-react";
import logoImg from "../../../public/logo.png";

/**
 * Official Brand Logo Component for makewithus
 */
function BrandLogo({ color = "#0f172a", iconSize = 28, textSize = 20 }: { color?: string; iconSize?: number; textSize?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, userSelect: "none" }}>
      <img
        src={typeof logoImg === "string" ? logoImg : logoImg.src}
        alt="makewithus"
        style={{ width: iconSize, height: iconSize, objectFit: "contain" }}
      />
      <span
        style={{
          fontSize: textSize,
          fontWeight: 700,
          color: color,
          letterSpacing: "-0.5px",
          fontFamily: '"TT Hoves", system-ui, -apple-system, sans-serif',
          lineHeight: 1,
        }}
      >
        makewithus
      </span>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  // Tracks whether we're still verifying the existing session.
  // Hides the login form until we know the user isn't already logged in.
  const [checkingAuth, setCheckingAuth] = useState(true);

  // On mount: if a valid session already exists, skip the login page entirely.
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch("/api/auth/me", { method: "GET" });
        if (res.ok) {
          // Already authenticated — redirect away from login
          router.replace("/");
        }
      } catch (err) {
        console.error("Auth check failed:", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAuth();
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        // Successful login, cookie is set automatically
        router.push("/");
      } else {
        const data = await res.json();
        setError(data.error || "Invalid email or password. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError("A network error occurred. Please try again.");
      setLoading(false);
    }
  };

  // Show a minimal loading state while the session check is in-flight
  if (checkingAuth) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", background: "#f8f9fa" }}>
        <div style={{ width: 32, height: 32, border: "3px solid #e2e8f0", borderTopColor: "#0f172a", borderRadius: "50%", animation: "spin 0.75s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={s.pageWrapper}>
      <div style={s.container}>
        
        {/* ── Left Panel: Solid Obsidian Dark Marketing Panel ── */}
        <div style={s.leftPanel} className="login-left-panel">
          
          {/* Top Brand Header */}
          <div style={s.leftHeader}>
            <BrandLogo color="#ffffff" iconSize={28} textSize={22} />
          </div>

          {/* Marketing Copy */}
          <div style={s.leftContent}>
            <h1 style={s.heroTitle}>
              Automate your document workflows.
            </h1>
            <p style={s.heroDesc}>
              Instantly generate, calculate, and manage invoices, receipts, and compliance documents with enterprise speed and precision.
            </p>
          </div>

          {/* Clean Bottom Note */}
          <div style={s.leftFooter}>
            <span style={s.footerNote}>DocAutomation Engine v2.4</span>
          </div>
        </div>

        {/* ── Right Panel: Sharp Clean Login Card ── */}
        <div style={s.rightPanel}>
          
          <div style={s.cardWrapper}>
            <div style={s.card} className="login-card">
              
              {/* Card Header with Brand Logo */}
              <div style={s.cardHeader}>
                <BrandLogo color="#0f172a" iconSize={32} textSize={24} />
                <div style={s.cardSubtitle}>
                  DOCUMENT AUTOMATION PLATFORM
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleLogin} style={s.form} noValidate>
                
                {/* Email Address */}
                <div style={s.fieldGroup}>
                  <label htmlFor="email" style={s.fieldLabel}>
                    EMAIL ADDRESS
                  </label>
                  <div style={s.inputContainer}>
                    <Mail size={16} style={s.inputIcon} />
                    <input
                      id="email"
                      type="email"
                      autoComplete="email"
                      autoFocus
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        setError("");
                      }}
                      placeholder="admin@mwu"
                      style={s.input}
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password */}
                <div style={s.fieldGroup}>
                  <label htmlFor="password" style={s.fieldLabel}>
                    PASSWORD
                  </label>
                  <div style={s.inputContainer}>
                    <Lock size={16} style={s.inputIcon} />
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        setError("");
                      }}
                      placeholder="••••••••"
                      style={s.input}
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      style={s.eyeToggle}
                      tabIndex={-1}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Error Banner */}
                {error && (
                  <div style={s.errorBanner} role="alert">
                    <span>{error}</span>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  style={loading ? { ...s.submitBtn, opacity: 0.8, cursor: "not-allowed" } : s.submitBtn}
                >
                  {loading ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Loader2 size={16} style={s.spinner} />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span>Sign In</span>
                      <ArrowRight size={16} />
                    </div>
                  )}
                </button>
              </form>

            </div>
          </div>

        </div>
      </div>

      {/* Responsive & Focus Rules */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-left-panel {
          display: flex !important;
        }

        @media (max-width: 900px) {
          .login-left-panel {
            display: none !important;
          }
        }

        @media (max-width: 480px) {
          .login-card {
            padding: 32px 20px !important;
          }
        }

        input:-webkit-autofill,
        input:-webkit-autofill:hover, 
        input:-webkit-autofill:focus, 
        input:-webkit-autofill:active {
          -webkit-box-shadow: 0 0 0 30px #f8fafc inset !important;
          -webkit-text-fill-color: #0f172a !important;
        }

        input:focus {
          border-color: #0f172a !important;
          background-color: #ffffff !important;
          box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.06) !important;
        }
      `}} />
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  pageWrapper: {
    minHeight: "100vh",
    width: "100vw",
    backgroundColor: "#f8fafc",
    fontFamily: '"TT Hoves", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: "flex",
    overflowX: "hidden",
  },
  container: {
    display: "flex",
    width: "100%",
    minHeight: "100vh",
  },
  leftPanel: {
    width: "50%",
    backgroundColor: "#090d16",
    color: "#ffffff",
    padding: "60px 80px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    boxSizing: "border-box",
  },
  leftHeader: {
    display: "flex",
    alignItems: "center",
  },
  leftContent: {
    maxWidth: 460,
    marginTop: "auto",
    marginBottom: "auto",
    paddingTop: 40,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 42,
    fontWeight: 800,
    lineHeight: 1.15,
    letterSpacing: "-1px",
    color: "#ffffff",
    marginBottom: 20,
    fontFamily: '"TT Hoves", system-ui, -apple-system, sans-serif',
  },
  heroDesc: {
    fontSize: 16,
    lineHeight: 1.6,
    color: "#94a3b8",
    fontWeight: 400,
  },
  leftFooter: {
    display: "flex",
    alignItems: "center",
  },
  footerNote: {
    fontSize: 12,
    fontWeight: 600,
    letterSpacing: "0.05em",
    color: "#475569",
  },
  rightPanel: {
    width: "100%",
    flex: 1,
    backgroundColor: "#f8fafc",
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    padding: "40px 24px",
    boxSizing: "border-box",
    minHeight: "100vh",
  },
  mobileBrandBar: {
    width: "100%",
    maxWidth: 400,
    justifyContent: "center",
    marginBottom: 24,
  },
  cardWrapper: {
    width: "100%",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    border: "1px solid #e2e8f0",
    boxShadow: "0 10px 30px -10px rgba(15, 23, 42, 0.05), 0 0 0 1px rgba(15, 23, 42, 0.04)",
    padding: "44px 36px",
    boxSizing: "border-box",
  },
  cardHeader: {
    textAlign: "center",
    marginBottom: 32,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  cardSubtitle: {
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "0.14em",
    color: "#64748b",
    marginTop: 8,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 20,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: "0.08em",
    color: "#475569",
  },
  inputContainer: {
    position: "relative",
    display: "flex",
    alignItems: "center",
  },
  inputIcon: {
    position: "absolute",
    left: 14,
    color: "#94a3b8",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    height: 44,
    backgroundColor: "#f8fafc",
    border: "1px solid #cbd5e1",
    borderRadius: 6,
    paddingLeft: 40,
    paddingRight: 40,
    fontSize: 14,
    color: "#0f172a",
    outline: "none",
    transition: "all 0.15s ease",
  },
  eyeToggle: {
    position: "absolute",
    right: 12,
    background: "transparent",
    border: "none",
    color: "#64748b",
    cursor: "pointer",
    padding: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorBanner: {
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#dc2626",
    fontSize: 13,
    fontWeight: 500,
    padding: "10px 14px",
    borderRadius: 6,
    textAlign: "center",
  },
  submitBtn: {
    width: "100%",
    height: 44,
    backgroundColor: "#0f172a",
    color: "#ffffff",
    border: "none",
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    marginTop: 4,
    boxShadow: "0 4px 12px rgba(15, 23, 42, 0.15)",
  },
  spinner: {
    animation: "spin 1s linear infinite",
  },
};
