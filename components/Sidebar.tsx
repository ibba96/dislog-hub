"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Utensils,
  Droplets,
  HeartPulse,
  ChevronDown,
  ChevronRight,
  Building2,
} from "lucide-react";
import { useState } from "react";

const DIVISIONS = [
  {
    name: "Food",
    color: "#f97316",
    icon: Utensils,
    entities: [{ name: "Dislog Food", slug: "dislog-food" }],
  },
  {
    name: "Hygiene",
    color: "#3b82f6",
    icon: Droplets,
    entities: [{ name: "Dislog Hygiene", slug: "dislog-hygiene" }],
  },
  {
    name: "Health",
    color: "#22c55e",
    icon: HeartPulse,
    entities: [
      { name: "DMD", slug: "dmd" },
      { name: "Megaflex", slug: "megaflex" },
      { name: "Farmalac", slug: "farmalac" },
      { name: "Afrobiomedic", slug: "afrobiomedic" },
      { name: "Eramedic", slug: "eramedic" },
      { name: "Scomedica", slug: "scomedica" },
      { name: "KPH Laboratories", slug: "kph" },
      { name: "Steripharma", slug: "steripharma" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({ Health: true });

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-slate-100 flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 uppercase tracking-widest font-medium">Groupe</p>
            <p className="text-sm font-bold text-white leading-tight">Dislog Hub</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            pathname === "/"
              ? "bg-emerald-600 text-white"
              : "text-slate-300 hover:bg-slate-800 hover:text-white"
          }`}
        >
          <LayoutDashboard size={16} />
          Vue Groupe
        </Link>

        <div className="pt-3 pb-1">
          <p className="px-3 text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            Filiales
          </p>
        </div>

        {DIVISIONS.map((div) => {
          const Icon = div.icon;
          const isOpen = open[div.name] ?? false;

          return (
            <div key={div.name}>
              <button
                onClick={() => setOpen((o) => ({ ...o, [div.name]: !o[div.name] }))}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <Icon size={16} style={{ color: div.color }} />
                <span className="flex-1 text-left">{div.name}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {isOpen && (
                <div className="ml-6 mt-0.5 space-y-0.5">
                  {div.entities.map((e) => {
                    const active = pathname === `/entites/${e.slug}`;
                    return (
                      <Link
                        key={e.slug}
                        href={`/entites/${e.slug}`}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs transition-colors ${
                          active
                            ? "bg-slate-700 text-white font-medium"
                            : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: div.color }}
                        />
                        {e.name}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="px-5 py-3 border-t border-slate-700">
        <p className="text-[10px] text-slate-500">Belkhyat Group © 2026</p>
      </div>
    </aside>
  );
}
