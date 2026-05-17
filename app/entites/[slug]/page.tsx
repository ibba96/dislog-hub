import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import { EntityTrendChart } from "@/components/EntityChart";
import KpiEntryForm from "@/components/KpiEntryForm";
import { Suspense } from "react";
import MoncefAIOrb from "@/components/MoncefAIOrb";
import ThemeToggle from "@/components/ThemeToggle";

const PERIODS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-12": "Déc", "2026-01": "Jan", "2026-02": "Fév",
  "2026-03": "Mar", "2026-04": "Avr", "2026-05": "Mai",
};

const PROJ_PERIOD = "2026-05";
const PROJ_FACTOR = 31 / 17;

const DIV_COLORS: Record<string, string> = {
  Food: "#f97316", Hygiene: "#3b82f6", Health: "#22c55e",
};

function fmtM(v: number, unit = "MAD") {
  if (unit === "%") return `${v.toFixed(1)}%`;
  if (unit === "pers." || unit === "nb") return v.toLocaleString("fr-FR");
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}
function pct(a: number, b: number) { return b ? ((a - b) / b) * 100 : 0; }

export default async function EntityPage({
  params, searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const period = sp.period && PERIODS.includes(sp.period) ? sp.period : "2026-05";
  const prevPeriod = PERIODS[PERIODS.indexOf(period) - 1] ?? null;

  const entity = await prisma.entity.findUnique({ where: { slug }, include: { division: true } });
  if (!entity) notFound();

  const [kpiDefs, allEntries] = await Promise.all([
    prisma.kpiDefinition.findMany({ orderBy: { order: "asc" } }),
    prisma.kpiEntry.findMany({
      where: { entityId: entity.id, period: { in: PERIODS } },
      include: { kpiDef: true },
      orderBy: [{ period: "asc" }, { kpiDef: { order: "asc" } }],
    }),
  ]);

  const current = allEntries.filter(e => e.period === period);
  const prev    = prevPeriod ? allEntries.filter(e => e.period === prevPeriod) : [];
  const getVal  = (kid: string, list: typeof current) => list.find(e => e.kpiDefId === kid)?.value ?? 0;
  const getTarget = (kid: string) => current.find(e => e.kpiDefId === kid)?.target ?? null;

  const ca         = getVal("ca", current);
  const marge      = getVal("marge", current);
  const ebitda     = getVal("ebitda", current);
  const effectifs  = getVal("effectifs", current);
  const tauxService = getVal("taux-service", current);
  const stock      = getVal("stock", current);
  const commandes  = getVal("commandes", current);
  const prevCA     = getVal("ca", prev);
  const caTarget   = getTarget("ca");
  const tauxTarget = getTarget("taux-service");

  const divColor   = DIV_COLORS[entity.division.name] ?? "#10b981";
  const caEvol     = pct(ca, prevCA);
  const caProgress = caTarget && ca ? (ca / caTarget) * 100 : null;

  const trendData = PERIODS.map(p => ({
    period: PERIOD_LABELS[p],
    ca:     getVal("ca",     allEntries.filter(e => e.period === p)) / 1e6,
    marge:  getVal("marge",  allEntries.filter(e => e.period === p)) / 1e6,
    ebitda: getVal("ebitda", allEntries.filter(e => e.period === p)) / 1e6,
  }));

  const initialValues = current.map(e => ({ kpiDefId: e.kpiDefId, value: e.value, target: e.target ?? undefined }));

  // Bloc narratif décisionnel — rule-based, zéro API
  const margeRate  = ca ? marge / ca * 100 : 0;
  const ebitdaRate = ca ? ebitda / ca * 100 : 0;
  type Signal = { icon: string; text: string; color: string; bg: string; };
  const signals: Signal[] = [];
  if (!ca) {
    signals.push({ icon: "⚠", text: `Données ${period} manquantes — saisie requise avant consolidation groupe.`, color: "#ef4444", bg: "rgba(239,68,68,0.06)" });
  } else {
    // Situation globale
    if (caProgress !== null) {
      if (caProgress >= 100) signals.push({ icon: "✓", text: `Objectif CA atteint à ${caProgress.toFixed(0)}% — performance en ligne avec les engagements.`, color: "#10b981", bg: "rgba(16,185,129,0.06)" });
      else if (caProgress >= 90) signals.push({ icon: "◎", text: `CA à ${caProgress.toFixed(0)}% de l'objectif — écart de ${fmtM(caTarget! - ca)} MAD à combler.`, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" });
      else signals.push({ icon: "↓", text: `CA en retard significatif — ${caProgress.toFixed(0)}% de l'objectif, manque de ${fmtM(caTarget! - ca)} MAD.`, color: "#ef4444", bg: "rgba(239,68,68,0.06)" });
    }
    // Tendance
    if (prevCA && ca) {
      if (caEvol >= 5) signals.push({ icon: "↑", text: `Croissance solide +${caEvol.toFixed(1)}% vs mois précédent — momentum commercial favorable.`, color: "#10b981", bg: "rgba(16,185,129,0.06)" });
      else if (caEvol < -3) signals.push({ icon: "↓", text: `Recul de ${Math.abs(caEvol).toFixed(1)}% vs mois précédent — analyser pertes clients ou mix produits.`, color: "#ef4444", bg: "rgba(239,68,68,0.06)" });
    }
    // Marge
    if (margeRate > 0) {
      if (margeRate < 20) signals.push({ icon: "⚡", text: `Marge à ${margeRate.toFixed(1)}% — niveau sous seuil cible, vérifier pression achats ou mix SKU.`, color: "#f59e0b", bg: "rgba(245,158,11,0.06)" });
      else if (margeRate >= 25) signals.push({ icon: "★", text: `Marge brute solide à ${margeRate.toFixed(1)}% — pricing et mix produits bien maîtrisés.`, color: "#10b981", bg: "rgba(16,185,129,0.06)" });
    }
    // Taux de service
    if (tauxService > 0 && tauxTarget) {
      if (tauxService < tauxTarget) signals.push({ icon: "⚠", text: `Taux de service ${tauxService.toFixed(1)}% sous objectif ${tauxTarget.toFixed(0)}% — risque rupture, escalader supply chain.`, color: "#ef4444", bg: "rgba(239,68,68,0.06)" });
    } else if (tauxService >= 97) {
      signals.push({ icon: "✓", text: `Taux de service ${tauxService.toFixed(1)}% — disponibilité produit excellente, livraisons fluides.`, color: "#10b981", bg: "rgba(16,185,129,0.06)" });
    }
  }
  // Top drivers : KPIs avec le plus grand delta M/M (hors CA déjà traité)
  const KPI_LABELS: Record<string, string> = {
    "marge": "Marge", "ebitda": "EBITDA", "taux-service": "Taux svc",
    "commandes": "Commandes", "stock": "Stock", "effectifs": "Effectifs",
  };
  type Driver = { label: string; delta: number; };
  // Recommandation prioritaire unique depuis le signal le plus critique
  const ACTION_MAP: Record<string, string> = {
    "↓": "Convoquer revue commerciale d'urgence — analyser pipeline et pertes clients avant fin de semaine.",
    "⚠": "Escalader supply chain immédiatement — risque de rupture client si taux de service non redressé sous 72h.",
    "⚡": "Lancer audit achats & mix SKU — identifier les lignes qui compressent la marge avant clôture du mois.",
    "◎": "Activer leviers promotionnels ciblés — accélération nécessaire pour combler l'écart objectif en fin de mois.",
  };
  const actionSignal = signals.find(s => ["↓","⚠","⚡","◎"].includes(s.icon));
  const recommendation = actionSignal ? ACTION_MAP[actionSignal.icon] : null;

  const drivers: Driver[] = prev.length > 0
    ? Object.entries(KPI_LABELS).map(([id, label]) => {
        const cur = getVal(id, current);
        const prv = getVal(id, prev);
        return prv && cur ? { label, delta: pct(cur, prv) } : null;
      }).filter((d): d is Driver => d !== null && Math.abs(d.delta) >= 1)
        .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
        .slice(0, 3)
    : [];

  const isLive = period === PROJ_PERIOD;

  // Score santé filiale 0–100 (100 = parfait)
  const entityHealth = (() => {
    if (!ca) return 15;
    let s = 0;
    if (caProgress !== null) s += Math.min(caProgress, 100) * 0.45;
    else s += 45;
    if (prevCA) s += Math.max(0, Math.min(50 + caEvol * 2, 100)) * 0.25;
    else s += 25;
    if (tauxService && tauxTarget) s += Math.min(tauxService / tauxTarget * 100, 100) * 0.2;
    else if (tauxService) s += 20;
    const mr = ca ? marge / ca * 100 : 0;
    s += Math.min(mr / 25 * 100, 100) * 0.1;
    return Math.round(s);
  })();
  const ehColor = entityHealth >= 70 ? "#10b981" : entityHealth >= 45 ? "#f59e0b" : "#ef4444";
  const ehLabel = entityHealth >= 70 ? "Sain" : entityHealth >= 45 ? "Vigilance" : "Critique";
  function proj(value: number, unit: string) {
    if (!isLive || !value || unit === "%" ) return null;
    const p = Math.round(value * PROJ_FACTOR);
    return p;
  }

  const kpiCards = [
    { id: "ca",          label: "Chiffre d'affaires", value: ca,          unit: "MAD", target: caTarget,          evol: ca && prevCA ? caEvol : null, proj: proj(ca, "MAD") },
    { id: "marge",       label: "Marge brute",         value: marge,       unit: "MAD", target: getTarget("marge"),  sub: ca ? `${(marge / ca * 100).toFixed(1)}% du CA` : null, proj: proj(marge, "MAD") },
    { id: "ebitda",      label: "EBITDA",               value: ebitda,      unit: "MAD", target: getTarget("ebitda"), sub: ca ? `${(ebitda / ca * 100).toFixed(1)}% du CA` : null, proj: proj(ebitda, "MAD") },
    { id: "taux-service",label: "Taux de service",      value: tauxService, unit: "%",   target: tauxTarget, proj: null },
    { id: "effectifs",   label: "Effectifs",             value: effectifs,   unit: "pers.", target: getTarget("effectifs"), proj: null },
    { id: "commandes",   label: "Commandes",             value: commandes,   unit: "nb",  target: getTarget("commandes"), proj: proj(commandes, "nb") },
    { id: "stock",       label: "Stock",                 value: stock,       unit: "MAD", target: getTarget("stock"), proj: proj(stock, "MAD") },
  ];

  return (
    <div className="h-screen flex flex-col entity-page grid-bg overflow-hidden" style={{ background: "var(--bg-deep)" }}>

      {/* Header */}
      <header className="entity-header flex-shrink-0 px-5 py-3 border-b flex items-center gap-4 transition-all"
        style={{ borderColor: "var(--border)", background: "var(--bg-panel)" }}>
        <Link href="/" className="flex items-center gap-1.5 text-xs font-medium transition-colors hover:opacity-80" style={{ color: "var(--text-3)" }}>
          <ArrowLeft size={14} /> War Room
        </Link>
        <div className="w-px h-4" style={{ background: "var(--border)" }} />
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: divColor }} />
          <h1 className="text-sm font-black" style={{ color: "var(--text-1)" }}>{entity.name}</h1>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${divColor}18`, color: divColor }}>
            {entity.division.name}
          </span>
        </div>
        {entity.description && (
          <p className="text-xs ml-1 truncate" style={{ color: "var(--text-3)" }}>{entity.description}</p>
        )}
        <div className="ml-auto flex items-center gap-3">
          {/* Score santé filiale */}
          <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "3px 10px", borderRadius: 6, background: `${ehColor}0f`, border: `1px solid ${ehColor}30` }}>
            <svg width="20" height="20" viewBox="0 0 20 20" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
              <circle cx="10" cy="10" r="7" fill="none" stroke="var(--border)" strokeWidth="2.5" />
              <circle cx="10" cy="10" r="7" fill="none" stroke={ehColor} strokeWidth="2.5"
                strokeDasharray={`${2 * Math.PI * 7}`}
                strokeDashoffset={`${2 * Math.PI * 7 * (1 - entityHealth / 100)}`}
                strokeLinecap="round" />
            </svg>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: ehColor, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>{ehLabel}</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: ehColor, lineHeight: 1.1, letterSpacing: -0.3 }}>{entityHealth}<span style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>/100</span></div>
            </div>
          </div>
          {/* Period selector */}
          <div style={{ display: "flex", gap: 1 }}>
            {PERIODS.map((p) => (
              <Link key={p} href={`?period=${p}`} style={{
                textDecoration: "none", fontSize: 11, fontWeight: p === period ? 700 : 500,
                padding: "3px 8px", borderRadius: 5,
                color: p === period ? divColor : "var(--text-3)",
                background: p === period ? `${divColor}12` : "transparent",
                border: `1px solid ${p === period ? `${divColor}30` : "transparent"}`,
                transition: "all 0.15s",
              }}>{PERIOD_LABELS[p]}</Link>
            ))}
          </div>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">

        {/* KPI cards */}
        <div className="grid grid-cols-7 gap-3">
          {kpiCards.map((k) => {
            const progress    = k.target && k.value ? (k.value / k.target) * 100 : null;
            const statusColor = !k.value ? "var(--text-3)"
              : progress === null ? divColor
              : progress >= 100 ? "#10b981"
              : progress >= 85  ? "#f59e0b"
              : "#ef4444";
            return (
              <div key={k.id} className="entity-card card-surface p-3">
                <p className="stat-label mb-2 leading-tight">{k.label}</p>
                <p className="text-base font-black number-display leading-none" style={{ color: k.value ? "var(--text-1)" : "var(--text-3)" }}>
                  {k.value ? fmtM(k.value, k.unit) : "—"}
                  {k.unit === "MAD" && k.value
                    ? <span className="text-[9px] font-normal ml-0.5" style={{ color: "var(--text-3)" }}>M MAD</span>
                    : null}
                </p>
                {k.target && (
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-3)" }}>
                    Obj. {fmtM(k.target, k.unit)}{k.unit === "MAD" ? "M" : ""}
                  </p>
                )}
                {progress !== null && (
                  <div className="mt-2 h-0.5 rounded-full overflow-hidden" style={{ background: "var(--border)" }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%`, backgroundColor: statusColor }} />
                  </div>
                )}
                {k.evol !== undefined && k.evol !== null && k.value > 0 && (
                  <div className={`flex items-center gap-0.5 mt-1.5 text-[10px] font-bold ${k.evol >= 0 ? "text-emerald-500" : "text-red-500"}`}>
                    {k.evol >= 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {Math.abs(k.evol).toFixed(1)}%
                  </div>
                )}
                {k.sub && <p className="text-[9px] mt-1" style={{ color: "var(--text-3)" }}>{k.sub}</p>}
                {k.proj && (() => {
                  const gap = k.target ? ((k.proj - k.target) / k.target) * 100 : null;
                  const c   = gap === null ? "var(--text-3)" : gap >= 0 ? "#10b981" : "#f59e0b";
                  return (
                    <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid var(--border2)" }}>
                      <p style={{ fontSize: 9, color: "var(--text-4)", marginBottom: 1 }}>Proj. fin mai</p>
                      <p className="number-display" style={{ fontSize: 11, fontWeight: 700, color: c }}>
                        {fmtM(k.proj, k.unit)}
                        {gap !== null && <span style={{ fontSize: 9, fontWeight: 500, marginLeft: 3, opacity: 0.85 }}>{gap >= 0 ? "▲" : "▼"}{Math.abs(gap).toFixed(0)}% obj.</span>}
                      </p>
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>

        {/* Bloc narratif décisionnel */}
        {(signals.length > 0 || drivers.length > 0) && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {signals.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(signals.length, 2)}, 1fr)`, gap: 8 }}>
                {signals.map((s, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    background: s.bg, border: `1px solid ${s.color}22`,
                  }}>
                    <span style={{ fontSize: 13, lineHeight: 1, marginTop: 1, flexShrink: 0 }}>{s.icon}</span>
                    <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.55, margin: 0 }}>{s.text}</p>
                  </div>
                ))}
              </div>
            )}
            {drivers.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 14px", borderRadius: 8,
                background: "var(--bg-card)", border: "1px solid var(--border)",
              }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: "var(--text-3)", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>Drivers M/M</span>
                {drivers.map((d, i) => (
                  <span key={i} style={{
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 5,
                    background: d.delta >= 0 ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)",
                    color: d.delta >= 0 ? "#10b981" : "#ef4444",
                    border: `1px solid ${d.delta >= 0 ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.2)"}`,
                  }}>{d.label} {d.delta >= 0 ? "+" : ""}{d.delta.toFixed(1)}%</span>
                ))}
              </div>
            )}
            {recommendation && (
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "9px 14px", borderRadius: 8,
                background: "rgba(99,91,255,0.05)", border: "1px solid rgba(99,91,255,0.18)",
              }}>
                <span style={{ fontSize: 11, flexShrink: 0 }}>⚡</span>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: "#635bff", lineHeight: 1.4 }}>
                  <span style={{ fontWeight: 700 }}>Action recommandée — </span>{recommendation}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Alert banner */}
        {caTarget && ca && ca < caTarget * 0.9 && (
          <div className="alert-critical flex items-center gap-3 px-4 py-3 rounded-xl border"
            style={{ background: "rgba(254,242,242,0.3)", borderColor: "rgba(239,68,68,0.3)" }}>
            <AlertTriangle size={14} className="text-red-400 flex-shrink-0" />
            <p className="text-xs text-red-400 font-semibold">
              CA sous objectif — {caProgress?.toFixed(0)}% de l'objectif atteint
              {prevCA ? ` · ${caEvol > 0 ? "+" : ""}${caEvol.toFixed(1)}% vs mois précédent` : ""}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-4">
          {/* Trend chart */}
          <div className="col-span-2 card-surface p-4">
            <div className="flex items-center justify-between mb-4">
              <p className="stat-label">Évolution CA · Marge · EBITDA</p>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  <span className="w-2 h-0.5 inline-block rounded" style={{ backgroundColor: divColor }} /> CA
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  <span className="w-2 h-0.5 inline-block rounded" style={{ background: "var(--text-3)" }} /> Marge
                </span>
                <span className="flex items-center gap-1 text-[10px]" style={{ color: "var(--text-3)" }}>
                  <span className="w-2 h-0.5 inline-block rounded" style={{ background: "var(--border)" }} /> EBITDA
                </span>
              </div>
            </div>
            <EntityTrendChart data={trendData} color={divColor} />
          </div>

          {/* KPI detail panel */}
          <div className="card-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="stat-label">{period}</p>
              {prevPeriod && <p className="stat-label" style={{ color: "var(--text-4)" }}>vs {PERIOD_LABELS[prevPeriod]}</p>}
            </div>
            <div className="space-y-2.5">
              {kpiDefs.map((k) => {
                const val     = getVal(k.id, current);
                const prevVal = getVal(k.id, prev);
                const d       = prevVal && val ? pct(val, prevVal) : null;
                const tgt     = getTarget(k.id);
                const prog    = tgt && val ? (val / tgt) * 100 : null;
                const gc = prog === null ? "var(--border)" : prog >= 100 ? "#10b981" : prog >= 85 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={k.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <div style={{ width: 5, height: 5, borderRadius: "50%", flexShrink: 0, backgroundColor: val ? gc : "var(--border)" }} />
                        <span className="text-[10px] font-medium" style={{ color: "var(--text-3)" }}>{k.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {prevVal > 0 && (
                          <span className="number-display text-[9px]" style={{ color: "var(--text-4)" }}>
                            {fmtM(prevVal, k.unit)}
                          </span>
                        )}
                        <span className="text-xs font-bold number-display" style={{ color: val ? "var(--text-1)" : "var(--text-3)" }}>
                          {val ? fmtM(val, k.unit) : "—"}
                        </span>
                        {d !== null && (
                          <span style={{ fontSize: 9, fontWeight: 700, color: d >= 0 ? "#10b981" : "#ef4444", minWidth: 28, textAlign: "right" }}>
                            {d >= 0 ? "▲" : "▼"}{Math.abs(d).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    </div>
                    {prog !== null && (
                      <div style={{ position: "relative" }}>
                        <div style={{ height: 3, borderRadius: 2, overflow: "hidden", background: "var(--border)" }}>
                          <div style={{ height: "100%", borderRadius: 2, width: `${Math.min(prog, 100)}%`, backgroundColor: gc, transition: "width 0.3s" }} />
                        </div>
                        <span style={{ position: "absolute", right: 0, top: 4, fontSize: 8, fontWeight: 700, color: gc }}>{prog.toFixed(0)}%</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Entry form */}
        <div className="card-surface overflow-hidden">
          <div className="px-5 py-3 border-b flex items-center gap-2" style={{ borderColor: "var(--border2)" }}>
            <Target size={14} className="text-emerald-500" />
            <p className="stat-label">Saisie des KPIs</p>
          </div>
          <div className="p-4">
            <Suspense fallback={null}>
              <KpiEntryForm entityId={entity.id} kpiDefs={kpiDefs} initialPeriod={period} initialValues={initialValues} />
            </Suspense>
          </div>
        </div>
      </div>

      <MoncefAIOrb />
    </div>
  );
}
