"use client";

import { useState, useRef, useEffect } from "react";

/* ── Markdown renderer ── */
function renderMd(text: string) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let i = 0;
  const parseLine = (line: string): React.ReactNode => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((p, idx) =>
      p.startsWith("**") && p.endsWith("**")
        ? <strong key={idx}>{p.slice(2, -2)}</strong>
        : p
    );
  };
  while (i < lines.length) {
    const line = lines[i];
    if (/^---+$/.test(line.trim())) {
      out.push(<hr key={i} style={{ border: "none", borderTop: "1px solid rgba(255,255,255,0.1)", margin: "8px 0" }} />);
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const tl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tl.push(lines[i]); i++; }
      const rows = tl.filter(r => !/^\|[-| :]+\|$/.test(r.trim()));
      out.push(
        <table key={i} style={{ borderCollapse: "collapse", width: "100%", fontSize: 11, marginBottom: 4 }}>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>{r.split("|").filter((_,ci,a) => ci>0 && ci<a.length-1).map((cell, ci) => (
                <td key={ci} style={{ padding: "2px 6px", borderBottom: "1px solid rgba(255,255,255,0.08)", color: ri===0 ? "#10b981" : "#cbd5e1" }}>{parseLine(cell.trim())}</td>
              ))}</tr>
            ))}
          </tbody>
        </table>
      );
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/);
    if (h3) { out.push(<p key={i} style={{ fontWeight:700, fontSize:12, color:"#10b981", marginTop:8, marginBottom:2 }}>{parseLine(h3[1])}</p>); i++; continue; }
    const h2 = line.match(/^##\s+(.*)/);
    if (h2) { out.push(<p key={i} style={{ fontWeight:700, fontSize:13, color:"#e2e8f0", marginTop:6, marginBottom:2 }}>{parseLine(h2[1])}</p>); i++; continue; }
    const h1 = line.match(/^#\s+(.*)/);
    if (h1) { out.push(<p key={i} style={{ fontWeight:800, fontSize:14, color:"#ffffff", marginTop:6, marginBottom:2 }}>{parseLine(h1[1])}</p>); i++; continue; }
    const li = line.match(/^[-*]\s+(.*)/);
    if (li) { out.push(<p key={i} style={{ margin:"1px 0", paddingLeft:12 }}>• {parseLine(li[1])}</p>); i++; continue; }
    if (line.trim() === "") { out.push(<br key={i} />); i++; continue; }
    out.push(<p key={i} style={{ margin:"2px 0" }}>{parseLine(line)}</p>);
    i++;
  }
  return <div style={{ fontSize:12, lineHeight:1.65 }}>{out}</div>;
}

/* ── Types ── */
interface Message { role: "user" | "assistant"; content: string; }

const QUESTIONS = [
  { icon: "⚡", label: "Mes décisions urgentes du jour" },
  { icon: "📈", label: "Où investir en priorité ?" },
  { icon: "🏭", label: "Quelle filiale arbitrer ce mois ?" },
  { icon: "🌍", label: "Compétitivité Maroc vs région MENA" },
  { icon: "📊", label: "Benchmark vs secteur national" },
  { icon: "🛡️", label: "Risques macro à surveiller" },
];

export function AccueilAISection() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Bonjour Excellence. Je suis connecté à l'ensemble des données du Groupe Dislog Belkhyat en temps réel — KPIs, alertes, Baromètre 2025 et macro DEPF. Que souhaitez-vous analyser aujourd'hui ?",
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    if (!open) setOpen(true);
    setMessages(m => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role: "assistant", content: data.reply ?? "Pas de réponse." }]);
    } catch {
      setMessages(m => [...m, { role: "assistant", content: "Erreur de connexion. Veuillez réessayer." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* ── Chat card ── */}
      <div className="stripe-card ai-section-card" style={{ padding: 0, overflow: "hidden" }}>

        {/* Header — always visible */}
        <div className="ai-sec-header">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="ai-avatar-ring">
              <div className="ai-avatar-inner">M</div>
              <span className="ai-online-dot" />
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:"var(--text-1)", lineHeight:1.2 }}>Moncef AI</div>
              <div style={{ fontSize:11, color:"#10b981", fontWeight:500 }}>Connecté · Données temps réel</div>
            </div>
          </div>
          {open ? (
            <button className="ai-back-btn" onClick={() => setOpen(false)}>✕ Réduire</button>
          ) : (
            <button className="ai-open-btn-pill" onClick={() => setOpen(true)}>💬 Discuter</button>
          )}
        </div>

        {/* Chat messages — visible when open */}
        {open && (
          <div className="ai-messages-area">
            {messages.map((m, i) => (
              <div key={i} className={`ai-msg-row ${m.role}`}>
                {m.role === "assistant" && <div className="ai-msg-avatar-sm">M</div>}
                <div className={`ai-bubble ${m.role}`}>
                  {m.role === "assistant" ? renderMd(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ai-msg-row assistant">
                <div className="ai-msg-avatar-sm">M</div>
                <div className="ai-bubble assistant" style={{ display:"flex", alignItems:"center", gap:4, padding:"10px 12px" }}>
                  <span className="typing-dot" style={{ animationDelay:"0ms" }} />
                  <span className="typing-dot" style={{ animationDelay:"160ms" }} />
                  <span className="typing-dot" style={{ animationDelay:"320ms" }} />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Question chips — visible when closed */}
        {!open && (
          <div className="ai-chips-area">
            <p className="ai-chips-hint">Cliquez une question ou tapez la vôtre →</p>
            <div className="ai-chips-list">
              {QUESTIONS.map((q, i) => (
                <button key={i} className="ai-question-chip" onClick={() => send(q.label)}>
                  <span className="ai-chip-icon">{q.icon}</span>
                  <span className="ai-chip-label">{q.label}</span>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" style={{ marginLeft:"auto", flexShrink:0, opacity:0.35 }}>
                    <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input — always visible */}
        <div className="ai-input-bar">
          <input
            ref={inputRef}
            className="ai-text-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={open ? "Répondez ou posez une nouvelle question…" : "Posez votre question à Moncef AI…"}
            onFocus={() => { if (!open && input.length > 0) setOpen(true); }}
          />
          <button
            className="ai-send-btn"
            onClick={() => send()}
            disabled={!input.trim() || loading}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── CSS ── */}
      <style>{`
        .ai-section-card {
          display:flex;flex-direction:column;
          border:1px solid var(--border);border-radius:10px;
          background:var(--bg-panel);
          box-shadow:var(--shadow-card);
          transition:box-shadow 0.15s;
        }

        .ai-sec-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 16px;
          border-bottom:1px solid var(--border);
          flex-shrink:0;
        }

        .ai-avatar-ring {
          position:relative;width:36px;height:36px;flex-shrink:0;
        }
        .ai-avatar-inner {
          width:36px;height:36px;border-radius:50%;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
          font-size:13px;font-weight:800;color:white;
        }
        .ai-online-dot {
          position:absolute;bottom:1px;right:1px;
          width:9px;height:9px;border-radius:50%;
          background:#10b981;border:2px solid var(--bg-panel);
          animation:blink 2s ease-in-out infinite;
        }

        .ai-open-btn-pill {
          padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;
          background:linear-gradient(135deg,#10b981,#059669);
          border:none;color:white;cursor:pointer;
          box-shadow:0 2px 8px rgba(16,185,129,0.3);
          transition:all 0.15s;
        }
        .ai-open-btn-pill:hover { opacity:0.9;box-shadow:0 3px 12px rgba(16,185,129,0.4); }

        .ai-back-btn {
          padding:5px 10px;border-radius:6px;font-size:12px;font-weight:500;
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-3);cursor:pointer;
          transition:all 0.15s;
        }
        .ai-back-btn:hover { color:var(--text-1);border-color:var(--accent); }

        /* Messages */
        .ai-messages-area {
          flex:1;overflow-y:auto;padding:12px 14px;
          display:flex;flex-direction:column;gap:10px;
          max-height:320px;min-height:180px;
          background:var(--bg-deep);
        }
        .ai-msg-row {
          display:flex;gap:8px;align-items:flex-start;
        }
        .ai-msg-row.user { flex-direction:row-reverse; }
        .ai-msg-avatar-sm {
          width:24px;height:24px;border-radius:50%;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
          font-size:10px;font-weight:800;color:white;margin-top:2px;
        }
        .ai-bubble {
          max-width:85%;padding:9px 12px;border-radius:10px;
          font-size:12px;line-height:1.6;
        }
        .ai-bubble.assistant {
          background:var(--bg-card);
          border:1px solid var(--border);
          color:var(--text-2);
          border-top-left-radius:2px;
        }
        .ai-bubble.user {
          background:rgba(16,185,129,0.12);
          border:1px solid rgba(16,185,129,0.25);
          color:var(--text-1);
          border-top-right-radius:2px;
        }

        /* Typing animation */
        .typing-dot {
          display:inline-block;width:6px;height:6px;border-radius:50%;
          background:#10b981;
          animation:typingBounce 1s ease-in-out infinite;
        }
        @keyframes typingBounce{0%,100%{transform:translateY(0);opacity:0.4}50%{transform:translateY(-4px);opacity:1}}

        /* Chips */
        .ai-chips-area {
          padding:12px 14px 8px;
          border-bottom:1px solid var(--border);
        }
        .ai-chips-hint {
          font-size:11px;color:var(--text-4);margin:0 0 8px;font-weight:500;
        }
        .ai-chips-list { display:flex;flex-direction:column;gap:5px; }
        .ai-question-chip {
          display:flex;align-items:center;gap:9px;
          padding:9px 11px;border-radius:7px;
          background:var(--bg-card);border:1px solid var(--border2);
          font-size:12.5px;color:var(--text-2);
          cursor:pointer;text-align:left;width:100%;
          transition:all 0.12s;
        }
        .ai-question-chip:hover {
          background:var(--bg-card2);border-color:rgba(16,185,129,0.35);
          color:var(--text-1);
          box-shadow:0 0 0 3px rgba(16,185,129,0.06);
        }
        .ai-chip-icon { font-size:14px;flex-shrink:0; }
        .ai-chip-label { flex:1;text-align:left; }

        /* Input bar */
        .ai-input-bar {
          display:flex;align-items:center;gap:8px;
          padding:10px 12px;
          border-top:1px solid var(--border);
          flex-shrink:0;
        }
        .ai-text-input {
          flex:1;background:var(--bg-card);
          border:1px solid var(--border2);
          border-radius:7px;padding:8px 12px;
          font-size:13px;color:var(--text-1);
          outline:none;
          transition:border-color 0.15s,box-shadow 0.15s;
        }
        .ai-text-input::placeholder { color:var(--text-4); }
        .ai-text-input:focus {
          border-color:rgba(16,185,129,0.5);
          box-shadow:0 0 0 3px rgba(16,185,129,0.1);
        }
        .ai-send-btn {
          width:34px;height:34px;border-radius:7px;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          border:none;color:white;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(16,185,129,0.3);
          transition:all 0.15s;
        }
        .ai-send-btn:hover:not(:disabled) { opacity:0.9;box-shadow:0 3px 10px rgba(16,185,129,0.4); }
        .ai-send-btn:disabled { opacity:0.3;cursor:not-allowed; }
      `}</style>
    </>
  );
}
