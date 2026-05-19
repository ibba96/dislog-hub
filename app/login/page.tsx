"use client";

import { useState, useEffect } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError]       = useState(false);
  const [loading, setLoading]   = useState(false);
  const [isDark, setIsDark]     = useState(false);

  useEffect(() => {
    const check = () =>
      setIsDark(document.documentElement.getAttribute("data-theme") === "dark");
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => obs.disconnect();
  }, []);

  function toggleTheme() {
    const next = isDark ? null : "dark";
    if (next) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    localStorage.setItem("theme", next ?? "light");
    setIsDark(!isDark);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) { window.location.href = "/accueil"; }
      else { setError(true); setLoading(false); }
    } catch { setError(true); setLoading(false); }
  }

  const d = isDark;

  return (
    <div style={{
      minHeight: "100vh",
      background: d ? "#0a0e1a" : "#f6f9fc",
      display: "flex", flexDirection: "column",
      fontFamily: "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",
      transition: "background 0.2s",
    }}>

      {/* Top bar */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "20px 32px",
        borderBottom: `1px solid ${d ? "rgba(255,255,255,0.06)" : "#e3e8ef"}`,
        background: d ? "#080c17" : "#ffffff",
      }}>
        {/* Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg,#10b981,#059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
              <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 15, color: d ? "#e2e8f0" : "#1a1f36" }}>
            Dislog Hub
          </span>
        </div>

        {/* Theme toggle */}
        <button onClick={toggleTheme} style={{
          width: 36, height: 36, borderRadius: 8,
          border: `1px solid ${d ? "rgba(255,255,255,0.1)" : "#e3e8ef"}`,
          background: d ? "rgba(255,255,255,0.05)" : "#ffffff",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
          color: d ? "#94a3b8" : "#697386", fontSize: 16,
          transition: "all 0.15s",
        }}>
          {d ? "☀️" : "🌙"}
        </button>
      </div>

      {/* Main */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 400 }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{
              display: "inline-flex", width: 56, height: 56, borderRadius: 16,
              background: "linear-gradient(135deg,#10b981,#059669)",
              alignItems: "center", justifyContent: "center",
              marginBottom: 20,
              boxShadow: "0 4px 16px rgba(16,185,129,0.3)",
            }}>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
                <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <h1 style={{
              fontSize: 22, fontWeight: 700, margin: "0 0 8px",
              color: d ? "#e2e8f0" : "#1a1f36", letterSpacing: "-0.02em",
            }}>
              Connexion au War Room
            </h1>
            <p style={{ fontSize: 14, color: d ? "#475569" : "#697386", margin: 0 }}>
              Groupe Dislog Belkhyat · Accès sécurisé
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: d ? "#0f1623" : "#ffffff",
            border: `1px solid ${d ? "rgba(255,255,255,0.08)" : "#e3e8ef"}`,
            borderRadius: 12,
            padding: "28px 28px",
            boxShadow: d ? "none" : "0 2px 8px rgba(0,0,0,0.05), 0 0 0 1px rgba(0,0,0,0.03)",
          }}>
            <form onSubmit={handleLogin}>
              {/* Field */}
              <div style={{ marginBottom: 20 }}>
                <label style={{
                  display: "block", fontSize: 13, fontWeight: 500,
                  color: d ? "#94a3b8" : "#3c4257", marginBottom: 6,
                }}>
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError(false); }}
                  placeholder="••••••••••"
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    padding: "10px 12px", borderRadius: 6, fontSize: 15,
                    background: d ? "rgba(15,28,46,0.9)" : "#ffffff",
                    border: `1.5px solid ${error ? "#ef4444" : d ? "rgba(255,255,255,0.1)" : "#e3e8ef"}`,
                    color: d ? "#e2e8f0" : "#1a1f36",
                    outline: "none",
                    transition: "border-color 0.15s, box-shadow 0.15s",
                    letterSpacing: "0.08em",
                  }}
                  onFocus={e => {
                    e.target.style.borderColor = "#10b981";
                    e.target.style.boxShadow = "0 0 0 3px rgba(16,185,129,0.12)";
                  }}
                  onBlur={e => {
                    e.target.style.borderColor = error ? "#ef4444" : d ? "rgba(255,255,255,0.1)" : "#e3e8ef";
                    e.target.style.boxShadow = "none";
                  }}
                />
                {error && (
                  <p style={{
                    fontSize: 12, color: "#ef4444", margin: "6px 0 0",
                    display: "flex", alignItems: "center", gap: 4,
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
                      <path d="M12 8v4M12 16h.01" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    Mot de passe incorrect
                  </p>
                )}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !password}
                style={{
                  width: "100%", padding: "11px 20px",
                  borderRadius: 6, fontSize: 14, fontWeight: 600,
                  background: !password || loading
                    ? d ? "rgba(16,185,129,0.3)" : "#d1fae5"
                    : "linear-gradient(135deg,#10b981,#059669)",
                  border: "none",
                  color: !password || loading ? (d ? "#475569" : "#6ee7b7") : "#ffffff",
                  cursor: !password || loading ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: !password || loading ? "none" : "0 2px 8px rgba(16,185,129,0.3)",
                  transition: "all 0.15s",
                }}>
                {loading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      style={{ animation: "spin 0.8s linear infinite" }}>
                      <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
                      <path d="M12 3a9 9 0 0 1 9 9" stroke="white" strokeWidth="3" strokeLinecap="round"/>
                    </svg>
                    Connexion…
                  </>
                ) : "Accéder au tableau de bord →"}
              </button>
            </form>
          </div>

          {/* Footer info */}
          <div style={{
            marginTop: 20, display: "flex", alignItems: "center",
            justifyContent: "center", gap: 6,
          }}>
            <span style={{
              display: "inline-block", width: 6, height: 6, borderRadius: "50%",
              background: "#10b981",
              boxShadow: "0 0 0 2px rgba(16,185,129,0.2)",
            }}/>
            <span style={{ fontSize: 12, color: d ? "#334155" : "#c1c9d2" }}>
              10 filiales · Données temps réel · Moncef AI
            </span>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div style={{
        textAlign: "center", padding: "16px",
        fontSize: 11, color: d ? "#1e293b" : "#c1c9d2",
        borderTop: `1px solid ${d ? "rgba(255,255,255,0.04)" : "#f0f2f5"}`,
      }}>
        © 2026 Groupe Dislog Belkhyat · Powered by Anthropic Claude
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
