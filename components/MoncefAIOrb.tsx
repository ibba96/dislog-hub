"use client";

import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import MoncefAIChat from "./MoncefAIChat";

export default function MoncefAIOrb() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {open && <MoncefAIChat onClose={() => setOpen(false)} />}

      {/* Floating orb */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-6 right-6 z-50 group"
      >
        {/* Pulse rings */}
        {!open && (
          <>
            <span className="absolute inset-0 rounded-full bg-emerald-500/20 animate-pulse-ring" />
            <span className="absolute inset-[-8px] rounded-full bg-emerald-500/10 animate-pulse-ring" style={{ animationDelay: "0.5s" }} />
          </>
        )}
        <div className={`relative w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-300 animate-float
          ${open
            ? "bg-slate-700 border-2 border-slate-600"
            : "bg-gradient-to-br from-emerald-500 to-emerald-700 border-2 border-emerald-400/50 glow-green"
          }`}>
          {open
            ? <X size={20} className="text-slate-300" />
            : <MessageCircle size={22} className="text-white" />
          }
        </div>
        {!open && (
          <span className="absolute -top-8 right-0 text-[11px] font-semibold text-emerald-400 bg-slate-900/90 border border-emerald-500/30 px-2 py-0.5 rounded-full whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            Moncef AI
          </span>
        )}
      </button>
    </>
  );
}
