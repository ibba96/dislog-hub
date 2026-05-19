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
      out.push(<hr key={i} style={{ border:"none", borderTop:"1px solid var(--border)", margin:"8px 0" }}/>);
      i++; continue;
    }
    if (line.trim().startsWith("|")) {
      const tl: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tl.push(lines[i]); i++; }
      const rows = tl.filter(r => !/^\|[-| :]+\|$/.test(r.trim()));
      out.push(
        <table key={i} style={{ borderCollapse:"collapse", width:"100%", fontSize:11, marginBottom:4 }}>
          <tbody>{rows.map((r, ri) => (
            <tr key={ri}>{r.split("|").filter((_,ci,a)=>ci>0&&ci<a.length-1).map((cell,ci)=>(
              <td key={ci} style={{ padding:"2px 6px", borderBottom:"1px solid var(--border2)", color: ri===0?"#10b981":"var(--text-2)" }}>
                {parseLine(cell.trim())}
              </td>
            ))}</tr>
          ))}</tbody>
        </table>
      );
      continue;
    }
    const h3 = line.match(/^###\s+(.*)/); if (h3) { out.push(<p key={i} style={{fontWeight:700,fontSize:11.5,color:"#10b981",marginTop:8,marginBottom:2}}>{parseLine(h3[1])}</p>); i++; continue; }
    const h2 = line.match(/^##\s+(.*)/);  if (h2) { out.push(<p key={i} style={{fontWeight:700,fontSize:12.5,color:"var(--text-1)",marginTop:6,marginBottom:2}}>{parseLine(h2[1])}</p>); i++; continue; }
    const h1 = line.match(/^#\s+(.*)/);   if (h1) { out.push(<p key={i} style={{fontWeight:800,fontSize:13,color:"var(--text-1)",marginTop:6,marginBottom:2}}>{parseLine(h1[1])}</p>); i++; continue; }
    const li = line.match(/^[-*]\s+(.*)/); if (li) { out.push(<p key={i} style={{margin:"2px 0",paddingLeft:12,color:"var(--text-2)"}}>· {parseLine(li[1])}</p>); i++; continue; }
    if (line.trim()==="") { out.push(<br key={i}/>); i++; continue; }
    out.push(<p key={i} style={{margin:"2px 0",color:"var(--text-2)"}}>{parseLine(line)}</p>);
    i++;
  }
  return <div style={{fontSize:12,lineHeight:1.65}}>{out}</div>;
}

interface Message { role:"user"|"assistant"; content:string; }

const QUESTIONS = [
  "Mes decisions urgentes du jour",
  "Ou investir en priorite ce mois ?",
  "Quelle filiale arbitrer ou restructurer ?",
  "Competitivite Maroc vs region MENA",
  "Benchmark vs secteur national",
  "Risques macro a surveiller",
];

export function AccueilAISection() {
  const [open,    setOpen]    = useState(false);
  const [messages,setMessages]= useState<Message[]>([{
    role:"assistant",
    content:"Bonjour Excellence. Je suis connecte a l'ensemble des donnees du Groupe Dislog Belkhyat en temps reel — KPIs, alertes, Barometre Industrie 2025 et indicateurs macro DEPF. Que souhaitez-vous analyser ?",
  }]);
  const [input,   setInput]   = useState("");
  const [loading, setLoading] = useState(false);

  /* scroll the messages CONTAINER, not the page */
  const messagesRef = useRef<HTMLDivElement>(null);
  const cardRef     = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLInputElement>(null);

  /* scroll to bottom inside the chat box whenever messages change */
  useEffect(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, loading]);

  /* when chat opens: scroll CARD into view (so user can see it), then focus input */
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior:"smooth", block:"start" });
        inputRef.current?.focus();
      }, 60);
    }
  }, [open]);

  async function send(text?: string) {
    const q = (text ?? input).trim();
    if (!q || loading) return;
    setInput("");
    if (!open) setOpen(true);
    setMessages(m => [...m, { role:"user", content:q }]);
    setLoading(true);
    try {
      const res  = await fetch("/api/chat", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ message:q }),
      });
      const data = await res.json();
      setMessages(m => [...m, { role:"assistant", content: data.reply ?? "Pas de reponse." }]);
    } catch {
      setMessages(m => [...m, { role:"assistant", content:"Erreur de connexion. Reessayez." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div ref={cardRef} className="ais-card">

        {/* Header */}
        <div className="ais-header">
          <div className="ais-brand">
            <div className="ais-avatar">M</div>
            <div>
              <p className="ais-name">Moncef AI</p>
              <p className="ais-status">Connecte · Donnees temps reel</p>
            </div>
          </div>
          {open
            ? <button className="ais-btn-ghost" onClick={() => setOpen(false)}>Reduire</button>
            : <button className="ais-btn-primary" onClick={() => setOpen(true)}>Discuter</button>
          }
        </div>

        {/* Chat messages — only when open */}
        {open && (
          <div className="ais-messages" ref={messagesRef}>
            {messages.map((m, i) => (
              <div key={i} className={`ais-msg-row ${m.role}`}>
                {m.role==="assistant" && <div className="ais-msg-av">M</div>}
                <div className={`ais-bubble ${m.role}`}>
                  {m.role==="assistant" ? renderMd(m.content) : m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="ais-msg-row assistant">
                <div className="ais-msg-av">M</div>
                <div className="ais-bubble assistant" style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:5}}>
                  <span className="ais-dot" style={{animationDelay:"0ms"}}/>
                  <span className="ais-dot" style={{animationDelay:"160ms"}}/>
                  <span className="ais-dot" style={{animationDelay:"320ms"}}/>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Question chips — only when closed */}
        {!open && (
          <div className="ais-chips">
            <p className="ais-chips-label">Questions frequentes</p>
            {QUESTIONS.map((q, i) => (
              <button key={i} className="ais-chip" onClick={() => send(q)}>
                <span className="ais-chip-arrow">&#8594;</span>
                <span className="ais-chip-text">{q}</span>
              </button>
            ))}
          </div>
        )}

        {/* Input bar — always visible */}
        <div className="ais-input-bar">
          <input
            ref={inputRef}
            className="ais-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder={open ? "Posez une question..." : "Ou ecrivez directement votre question..."}
          />
          <button
            className="ais-send"
            onClick={() => send()}
            disabled={!input.trim()||loading}
            aria-label="Envoyer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <style>{`
        .ais-card {
          background:var(--bg-panel);
          border:1px solid var(--border);
          border-radius:10px;
          overflow:hidden;
          box-shadow:var(--shadow-card);
          display:flex;
          flex-direction:column;
          font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          -webkit-font-smoothing:antialiased;
        }

        /* Header */
        .ais-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 16px;border-bottom:1px solid var(--border);flex-shrink:0;
        }
        .ais-brand    { display:flex;align-items:center;gap:10px; }
        .ais-avatar {
          width:34px;height:34px;border-radius:50%;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
          font-size:12px;font-weight:800;color:#fff;letter-spacing:-.01em;
          box-shadow:0 0 0 2.5px var(--bg-panel), 0 0 0 4px rgba(16,185,129,0.2);
        }
        .ais-name   { font-size:13px;font-weight:700;color:var(--text-1);line-height:1.2;margin:0;letter-spacing:-.01em; }
        .ais-status { font-size:11px;color:#10b981;font-weight:500;margin:2px 0 0;line-height:1; }

        .ais-btn-primary {
          padding:5px 13px;border-radius:6px;font-size:12px;font-weight:600;
          background:linear-gradient(135deg,#10b981,#059669);
          border:none;color:#fff;cursor:pointer;letter-spacing:-.01em;
          box-shadow:0 1px 4px rgba(16,185,129,0.3);transition:opacity 0.12s;
          white-space:nowrap;
        }
        .ais-btn-primary:hover{opacity:.9;}
        .ais-btn-ghost {
          padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-3);cursor:pointer;transition:color 0.12s,border-color 0.12s;
          letter-spacing:-.01em;white-space:nowrap;
        }
        .ais-btn-ghost:hover{color:var(--text-1);border-color:var(--accent);}

        /* Messages — overflow-y:auto so ONLY this box scrolls, not the page */
        .ais-messages {
          overflow-y:auto;
          padding:14px;
          display:flex;flex-direction:column;gap:10px;
          height:320px;          /* fixed height — no layout shift */
          background:var(--bg-deep);
          flex-shrink:0;
        }
        .ais-messages::-webkit-scrollbar{width:3px;}
        .ais-messages::-webkit-scrollbar-thumb{background:var(--border);border-radius:4px;}

        .ais-msg-row{display:flex;gap:8px;align-items:flex-start;}
        .ais-msg-row.user{flex-direction:row-reverse;}
        .ais-msg-av {
          width:22px;height:22px;border-radius:50%;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
          font-size:9.5px;font-weight:800;color:#fff;margin-top:2px;
        }
        .ais-bubble {
          max-width:86%;padding:9px 12px;border-radius:9px;
          font-size:12px;line-height:1.65;
        }
        .ais-bubble.assistant {
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-2);border-top-left-radius:2px;
        }
        .ais-bubble.user {
          background:rgba(16,185,129,0.10);border:1px solid rgba(16,185,129,0.22);
          color:var(--text-1);border-top-right-radius:2px;font-size:12.5px;
        }
        .ais-dot {
          display:inline-block;width:5px;height:5px;border-radius:50%;
          background:#10b981;animation:aisDot 1s ease-in-out infinite;
        }
        @keyframes aisDot{0%,100%{transform:translateY(0);opacity:.4}50%{transform:translateY(-4px);opacity:1}}

        /* Chips */
        .ais-chips{padding:12px 14px 8px;border-bottom:1px solid var(--border);}
        .ais-chips-label {
          font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;
          color:var(--text-4);margin:0 0 8px;
        }
        .ais-chip {
          display:flex;align-items:baseline;gap:8px;width:100%;
          padding:8px 10px;border-radius:6px;margin-bottom:4px;
          background:transparent;border:1px solid var(--border2);
          cursor:pointer;text-align:left;transition:all 0.1s;
        }
        .ais-chip:hover {
          background:var(--bg-card);border-color:rgba(16,185,129,0.3);
          box-shadow:0 0 0 3px rgba(16,185,129,0.05);
        }
        .ais-chip:last-child{margin-bottom:0;}
        .ais-chip-arrow{font-size:11px;color:#10b981;flex-shrink:0;font-weight:700;}
        .ais-chip-text {font-size:12.5px;color:var(--text-2);line-height:1.4;}
        .ais-chip:hover .ais-chip-text{color:var(--text-1);}

        /* Input bar */
        .ais-input-bar {
          display:flex;align-items:center;gap:8px;
          padding:10px 12px;border-top:1px solid var(--border);flex-shrink:0;
        }
        .ais-input {
          flex:1;background:var(--bg-card);border:1px solid var(--border2);
          border-radius:6px;padding:7px 11px;font-size:13px;
          color:var(--text-1);outline:none;
          font-family:'Inter',-apple-system,sans-serif;
          transition:border-color 0.12s,box-shadow 0.12s;letter-spacing:-.01em;
        }
        .ais-input::placeholder{color:var(--text-4);}
        .ais-input:focus{
          border-color:rgba(16,185,129,0.45);
          box-shadow:0 0 0 3px rgba(16,185,129,0.08);
        }
        .ais-send {
          width:32px;height:32px;border-radius:6px;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          border:none;color:#fff;cursor:pointer;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 1px 4px rgba(16,185,129,0.25);
          transition:opacity 0.12s,box-shadow 0.12s;
        }
        .ais-send:hover:not(:disabled){opacity:.9;box-shadow:0 2px 8px rgba(16,185,129,0.35);}
        .ais-send:disabled{opacity:.28;cursor:not-allowed;}
      `}</style>
    </>
  );
}
