"use client";

import { useState } from "react";
import { Save, ChevronDown, CheckCircle } from "lucide-react";

interface KpiDef { id: string; name: string; unit: string; category: string; }
interface InitialValue { kpiDefId: string; value: number; target?: number; }

const PERIODS = [
  { value: "2025-12", label: "Déc 2025" }, { value: "2026-01", label: "Jan 2026" },
  { value: "2026-02", label: "Fév 2026" }, { value: "2026-03", label: "Mar 2026" },
  { value: "2026-04", label: "Avr 2026" }, { value: "2026-05", label: "Mai 2026" },
];

export default function KpiEntryForm({ entityId, kpiDefs, initialPeriod, initialValues }: {
  entityId: string; kpiDefs: KpiDef[]; initialPeriod: string; initialValues: InitialValue[];
}) {
  const [period, setPeriod] = useState(initialPeriod);
  const [values, setValues] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    for (const v of initialValues) r[v.kpiDefId] = String(v.value);
    return r;
  });
  const [targets, setTargets] = useState<Record<string, string>>(() => {
    const r: Record<string, string> = {};
    for (const v of initialValues) if (v.target) r[v.kpiDefId] = String(v.target);
    return r;
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const categories = [...new Set(kpiDefs.map(k => k.category))];

  async function save() {
    setSaving(true);
    const entries = kpiDefs
      .filter(k => values[k.id] !== undefined && values[k.id] !== "")
      .map(k => ({
        entityId, kpiDefId: k.id, period,
        value: parseFloat(values[k.id]),
        target: targets[k.id] ? parseFloat(targets[k.id]) : undefined,
      }));
    await Promise.all(entries.map(e =>
      fetch("/api/kpis", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(e) })
    ));
    setSaving(false); setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        {/* Period selector */}
        <div className="relative">
          <select
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="select-field"
          >
            {PERIODS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <ChevronDown size={12} className="absolute right-2.5 top-2.5 pointer-events-none" style={{ color: "var(--text-3)" }} />
        </div>

        {/* Save button */}
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-lg transition-all disabled:opacity-50 text-white"
          style={{
            background: saved ? "#10b981" : "rgba(16,185,129,0.15)",
            border: `1px solid rgba(16,185,129,${saved ? "0.8" : "0.3"})`,
          }}
        >
          {saved
            ? <><CheckCircle size={13} /> Enregistré</>
            : saving ? "Enregistrement…"
            : <><Save size={13} /> Sauvegarder</>
          }
        </button>
      </div>

      {categories.map(cat => (
        <div key={cat}>
          <p className="stat-label mb-2">{cat}</p>
          <div className="grid grid-cols-3 gap-2">
            {kpiDefs.filter(k => k.category === cat).map(k => (
              <div key={k.id} className="panel-dark p-3">
                <label className="stat-label block mb-2">
                  {k.name} <span style={{ color: "var(--text-4)", fontWeight: 400 }}>({k.unit})</span>
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    placeholder="Réel"
                    value={values[k.id] ?? ""}
                    onChange={e => setValues(v => ({ ...v, [k.id]: e.target.value }))}
                    className="input-field flex-1 min-w-0"
                  />
                  <input
                    type="number"
                    placeholder="Obj."
                    value={targets[k.id] ?? ""}
                    onChange={e => setTargets(v => ({ ...v, [k.id]: e.target.value }))}
                    className="input-field-dim flex-1 min-w-0"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
