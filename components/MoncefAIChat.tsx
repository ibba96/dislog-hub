"use client";

import { useState, useRef, useEffect } from "react";
import { X, Send, Loader2 } from "lucide-react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const SUGGESTIONS = [
  "Quelles filiales sont en retard sur leurs objectifs ?",
  "Quelle est l'évolution du CA de Dislog Hygiene ?",
  "Où sont les alertes critiques ce mois ?",
  "Quel est le taux de service moyen du groupe ?",
  "Quelle filiale a la meilleure marge brute ?",
];

export default function MoncefAIChat({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Bonjour Moncef. Je suis connecté à l'ensemble des données du Groupe Dislog Belkhyat en temps réel. Posez-moi n'importe quelle question sur la performance de vos filiales, les alertes actives ou les tendances.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(text?: string) {
    const q = text ?? input.trim();
    if (!q || loading) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: q }]);
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: q }),
      });
      const data = await res.json();
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: "Erreur de connexion. Veuillez réessayer." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-24 right-6 w-[420px] z-50 animate-slide-up">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-900/90 to-slate-900/95 border border-emerald-500/30 rounded-t-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-xl">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center text-sm font-bold text-white">M</div>
          <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-900 animate-blink" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Moncef AI</p>
          <p className="text-[10px] text-emerald-400">Connecté • Données temps réel</p>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="bg-slate-950/95 border-x border-emerald-500/20 backdrop-blur-xl h-80 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
            {m.role === "assistant" && (
              <div className="w-6 h-6 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white mt-0.5">M</div>
            )}
            <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
              m.role === "user"
                ? "bg-emerald-600/20 border border-emerald-500/30 text-slate-100 rounded-tr-none"
                : "bg-slate-800/80 border border-slate-700/50 text-slate-200 rounded-tl-none"
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex gap-2">
            <div className="w-6 h-6 rounded-full bg-emerald-600 flex-shrink-0 flex items-center justify-center text-[10px] font-bold text-white">M</div>
            <div className="bg-slate-800/80 border border-slate-700/50 px-3 py-2 rounded-xl rounded-tl-none flex items-center gap-2">
              <Loader2 size={12} className="animate-spin text-emerald-400" />
              <span className="text-xs text-slate-400">Analyse en cours…</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="bg-slate-950/95 border-x border-emerald-500/20 px-3 pb-2">
          <p className="text-[10px] text-slate-500 mb-2 uppercase tracking-widest">Questions fréquentes</p>
          <div className="flex flex-col gap-1">
            {SUGGESTIONS.slice(0, 3).map((s) => (
              <button key={s} onClick={() => send(s)}
                className="text-left text-xs text-emerald-400/80 hover:text-emerald-300 hover:bg-emerald-900/20 px-2 py-1.5 rounded-lg border border-transparent hover:border-emerald-500/20 transition-all truncate">
                → {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-slate-950/95 border border-emerald-500/20 rounded-b-2xl px-3 py-3 backdrop-blur-xl">
        <div className="flex items-center gap-2 bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Posez votre question…"
            className="flex-1 bg-transparent text-sm text-slate-100 placeholder-slate-500 outline-none"
            autoFocus
          />
          <button onClick={() => send()} disabled={!input.trim() || loading}
            className="text-emerald-400 hover:text-emerald-300 disabled:text-slate-600 transition-colors">
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
