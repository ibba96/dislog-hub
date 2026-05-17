"use client";

import { useState } from "react";
import { Database } from "lucide-react";

export default function SeedButton() {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function seed() {
    setLoading(true);
    await fetch("/api/seed", { method: "POST" });
    setLoading(false);
    setDone(true);
    setTimeout(() => window.location.reload(), 800);
  }

  return (
    <button
      onClick={seed}
      disabled={loading || done}
      className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
    >
      <Database size={15} />
      {done ? "Données chargées !" : loading ? "Chargement…" : "Initialiser les données"}
    </button>
  );
}
