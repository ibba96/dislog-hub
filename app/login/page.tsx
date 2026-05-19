"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Simple password check — stored in env or hardcoded
    const PASS = process.env.NEXT_PUBLIC_DASHBOARD_PASSWORD ?? "Dislog2026";

    if (password === PASS) {
      document.cookie = "dislog_auth=1; path=/; max-age=86400";
      router.push("/accueil");
    } else {
      setError(true);
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #020810 0%, #040d1a 40%, #071428 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Grid background */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: `
          linear-gradient(rgba(16,185,129,0.04) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16,185,129,0.04) 1px, transparent 1px)
        `,
        backgroundSize: "48px 48px",
        pointerEvents: "none",
      }} />

      {/* Glow orbs */}
      <div style={{
        position: "absolute", top: "-10%", left: "-5%",
        width: 500, height: 500,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "-10%", right: "-5%",
        width: 600, height: 600,
        borderRadius: "50%",
        background: "radial-gradient(circle, rgba(99,91,255,0.05) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Login card */}
      <div style={{
        position: "relative", zIndex: 10,
        width: "100%", maxWidth: 420,
        padding: "0 24px",
      }}>
        {/* Logo + Brand */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 64, height: 64, borderRadius: 20,
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            boxShadow: "0 0 40px rgba(16,185,129,0.3)",
            marginBottom: 20,
          }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
              <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M10.5 19H21.5" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>

          <h1 style={{
            fontSize: 28, fontWeight: 800, color: "#ffffff",
            margin: 0, letterSpacing: "-0.03em",
          }}>
            Dislog Hub
          </h1>
          <p style={{
            fontSize: 13, color: "rgba(148,163,184,0.7)",
            margin: "6px 0 0", letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}>
            Centre de commandement · Groupe Dislog Belkhyat
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(8,14,26,0.85)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "36px 32px",
          backdropFilter: "blur(24px)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.5)",
        }}>
          <p style={{
            fontSize: 13, color: "rgba(148,163,184,0.6)",
            marginBottom: 28, textAlign: "center",
          }}>
            Accès réservé — Authentification requise
          </p>

          <form onSubmit={handleLogin}>
            {/* Password field */}
            <div style={{ marginBottom: 20 }}>
              <label style={{
                display: "block", fontSize: 11, fontWeight: 600,
                color: "rgba(148,163,184,0.7)", marginBottom: 8,
                textTransform: "uppercase", letterSpacing: "0.08em",
              }}>
                Mot de passe
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(false); }}
                  placeholder="••••••••••••"
                  autoFocus
                  style={{
                    width: "100%",
                    background: error
                      ? "rgba(239,68,68,0.05)"
                      : "rgba(15,28,46,0.8)",
                    border: error
                      ? "1px solid rgba(239,68,68,0.5)"
                      : "1px solid rgba(255,255,255,0.08)",
                    borderRadius: 10,
                    padding: "12px 16px",
                    color: "#e2e8f0",
                    fontSize: 16,
                    outline: "none",
                    boxSizing: "border-box",
                    transition: "border-color 0.2s",
                    letterSpacing: "0.15em",
                  }}
                />
              </div>
              {error && (
                <p style={{
                  fontSize: 12, color: "#ef4444",
                  marginTop: 8, display: "flex", alignItems: "center", gap: 4,
                }}>
                  <span>⚠</span> Mot de passe incorrect
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: "100%",
                background: loading
                  ? "rgba(16,185,129,0.4)"
                  : "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                border: "none",
                borderRadius: 10,
                padding: "13px 24px",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                cursor: loading || !password ? "not-allowed" : "pointer",
                transition: "all 0.2s",
                letterSpacing: "0.02em",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 20px rgba(16,185,129,0.3)",
              }}
            >
              {loading ? (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                  </svg>
                  Connexion…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4M10 17l5-5-5-5M15 12H3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Accéder au War Room
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div style={{
            marginTop: 28,
            paddingTop: 20,
            borderTop: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 8px rgba(16,185,129,0.8)",
              animation: "pulse 2s ease-in-out infinite",
            }} />
            <span style={{ fontSize: 11, color: "rgba(148,163,184,0.5)" }}>
              Données en temps réel · 10 filiales · Groupe Dislog
            </span>
          </div>
        </div>

        {/* Bottom label */}
        <p style={{
          textAlign: "center", marginTop: 20,
          fontSize: 11, color: "rgba(100,116,139,0.5)",
        }}>
          Moncef AI · Powered by Anthropic Claude
        </p>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
