import { prisma } from "@/lib/prisma";
import { Suspense } from "react";
import LiveClock from "@/components/LiveClock";
import MoncefAIOrb from "@/components/MoncefAIOrb";
import WarRoomCharts from "@/components/WarRoomCharts";
import ThemeToggle from "@/components/ThemeToggle";
import Link from "next/link";
import {
  AlertTriangle, TrendingUp, TrendingDown, ArrowUpRight,
  Activity, ChevronRight, Zap,
} from "lucide-react";

const PERIODS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
const PERIOD_LABELS: Record<string, string> = {
  "2025-12": "Déc 25", "2026-01": "Jan 26", "2026-02": "Fév 26",
  "2026-03": "Mar 26", "2026-04": "Avr 26", "2026-05": "Mai 26",
};
const LATEST = "2026-05";

const DIV_COLORS: Record<string, string> = {
  Food: "#f97316", Hygiene: "#3b82f6", Health: "#10b981",
};
const DIV_LABELS: Record<string, string> = {
  Food: "Grande Conso", Hygiene: "Hygiène & Soin", Health: "Santé & Pharma",
};

function fmt(v: number) {
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}Md`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (v >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return `${v.toFixed(0)}`;
}
function pct(a: number, b: number) { return b ? ((a - b) / b) * 100 : 0; }

// Projection — seulement pour le mois en cours (2026-05, J17/31)
const PROJ_PERIOD = "2026-05";
const PROJ_FACTOR = 31 / 17;

const ACTIONS: Record<string, string> = {
  "Données manquantes":       "→ Relancer le contrôleur de gestion pour saisie immédiate",
  "CA sous objectif":         "→ Convoquer revue commerciale + analyse pipeline deals",
  "Objectif CA non atteint":  "→ Vérifier pipeline Q+1 et accélérateurs promotionnels",
  "Recul mensuel":            "→ Analyser mix produits et pertes clients vs mois précédent",
  "Taux de service dégradé":  "→ Escalader supply chain — ruptures ou lead times fournisseurs",
};

function riskScore(ca: number, caTarget: number | null, prevCA: number, taux: number, tauxTgt: number | null): number {
  let s = 0;
  if (!ca) return 85; // données manquantes = risque élevé
  if (caTarget) s += Math.min(Math.max(0, (caTarget - ca) / caTarget) * 200, 50);
  if (prevCA)   s += Math.min(Math.max(0, (prevCA - ca) / prevCA) * 150, 30);
  if (taux && tauxTgt) s += Math.min(Math.max(0, (tauxTgt - taux) / tauxTgt) * 100, 20);
  return Math.round(Math.min(s, 100));
}

async function WarRoomContent({ period, div }: { period: string; div: string | null }) {
  const prevPeriod = PERIODS[PERIODS.indexOf(period) - 1] ?? null;
  const isLive = period === PROJ_PERIOD;

  const [entities, , currentEntries, prevEntries, allTrend] = await Promise.all([
    prisma.entity.findMany({ include: { division: true }, orderBy: { name: "asc" } }),
    prisma.kpiDefinition.findMany({ orderBy: { order: "asc" } }),
    prisma.kpiEntry.findMany({ where: { period }, include: { kpiDef: true, entity: { include: { division: true } } } }),
    prisma.kpiEntry.findMany({ where: { period: prevPeriod ?? "__none__" }, include: { kpiDef: true } }),
    prisma.kpiEntry.findMany({ where: { kpiDefId: "ca", period: { in: PERIODS } }, include: { entity: { include: { division: true } } } }),
  ]);

  const getVal = (eid: string, kid: string, list: typeof currentEntries) =>
    list.find((e) => e.entityId === eid && e.kpiDefId === kid)?.value ?? 0;
  const getTarget = (eid: string, kid: string) =>
    currentEntries.find((e) => e.entityId === eid && e.kpiDefId === kid)?.target ?? null;

  if (entities.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-10 panel max-w-sm" style={{ borderRadius: 16 }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <Zap size={20} style={{ color: "#10b981" }} />
          </div>
          <p className="font-semibold mb-1" style={{ color: "var(--text-1)", fontSize: 15 }}>Base de données vide</p>
          <p className="text-sm mb-4" style={{ color: "var(--text-3)" }}>Initialisez les données pour démarrer</p>
          <form action="/api/seed" method="POST">
            <button type="submit" className="w-full px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "#10b981" }}>
              Initialiser les données
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Totaux groupe
  const totalCA      = currentEntries.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const totalMarge   = currentEntries.filter(e => e.kpiDefId === "marge").reduce((s, e) => s + e.value, 0);
  const totalEbitda  = currentEntries.filter(e => e.kpiDefId === "ebitda").reduce((s, e) => s + e.value, 0);
  const totalEff     = currentEntries.filter(e => e.kpiDefId === "effectifs").reduce((s, e) => s + e.value, 0);
  const prevTotalCA  = prevEntries.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const evCA         = pct(totalCA, prevTotalCA);
  const margeRate    = totalCA ? totalMarge / totalCA * 100 : 0;
  const ebitdaRate   = totalCA ? totalEbitda / totalCA * 100 : 0;

  // Alerts
  type Alert = { level: "critical" | "warn"; entity: string; slug: string; msg: string; detail: string; risk: number; impact?: string; };
  const alerts: Alert[] = [];
  for (const e of entities) {
    const ca       = getVal(e.id, "ca", currentEntries);
    const caTarget = getTarget(e.id, "ca");
    const taux     = getVal(e.id, "taux-service", currentEntries);
    const tauxTgt  = getTarget(e.id, "taux-service");
    const prevCA   = getVal(e.id, "ca", prevEntries as typeof currentEntries);
    const risk = riskScore(ca, caTarget, prevCA, taux, tauxTgt);
    if (!ca) {
      alerts.push({ level: "critical", entity: e.name, slug: e.slug, msg: "Données manquantes", detail: `Période ${period} non saisie`, risk });
    } else {
      if (caTarget && ca < caTarget * 0.9)
        alerts.push({ level: "critical", entity: e.name, slug: e.slug, msg: "CA sous objectif", detail: `${((ca / caTarget) * 100).toFixed(0)}% de l'objectif`, risk, impact: `−${fmt(caTarget - ca)} MAD` });
      else if (caTarget && ca < caTarget)
        alerts.push({ level: "warn", entity: e.name, slug: e.slug, msg: "Objectif CA non atteint", detail: `${((ca / caTarget) * 100).toFixed(0)}% atteint`, risk, impact: `−${fmt(caTarget - ca)} MAD` });
      if (prevCA && ca < prevCA * 0.97)
        alerts.push({ level: "warn", entity: e.name, slug: e.slug, msg: "Recul mensuel", detail: `−${Math.abs(pct(ca, prevCA)).toFixed(1)}% vs mois précédent`, risk });
      if (taux && tauxTgt && taux < tauxTgt)
        alerts.push({ level: "warn", entity: e.name, slug: e.slug, msg: "Taux de service dégradé", detail: `${taux.toFixed(1)}% · obj. ${tauxTgt.toFixed(0)}%`, risk });
    }
  }
  alerts.sort((a, b) => b.risk - a.risk);
  const critCount = alerts.filter(a => a.level === "critical").length;

  // Division breakdown
  const divBreakdown = ["Food", "Hygiene", "Health"].map((div) => {
    const divEntities = entities.filter(e => e.division.name === div);
    const ca     = divEntities.reduce((s, e) => s + getVal(e.id, "ca", currentEntries), 0);
    const prevCa = divEntities.reduce((s, e) => s + getVal(e.id, "ca", prevEntries as typeof currentEntries), 0);
    const marge  = divEntities.reduce((s, e) => s + getVal(e.id, "marge", currentEntries), 0);
    const active = divEntities.filter(e => getVal(e.id, "ca", currentEntries) > 0).length;
    return { div, ca, prevCa, marge, active, total: divEntities.length, color: DIV_COLORS[div] };
  });

  // Trend data
  const trendData = PERIODS.map((p) => {
    const pe = allTrend.filter(e => e.period === p);
    return {
      p: PERIOD_LABELS[p],
      Food:    pe.filter(e => e.entity.division.name === "Food").reduce((s, e) => s + e.value, 0) / 1e6,
      Hygiene: pe.filter(e => e.entity.division.name === "Hygiene").reduce((s, e) => s + e.value, 0) / 1e6,
      Health:  pe.filter(e => e.entity.division.name === "Health").reduce((s, e) => s + e.value, 0) / 1e6,
    };
  });

  // Entity rows
  // Spark data: CA par période par entité depuis allTrend
  const sparkMap: Record<string, number[]> = {};
  for (const e of entities) {
    sparkMap[e.id] = PERIODS.map(p => allTrend.find(t => t.entityId === e.id && t.period === p)?.value ?? 0);
  }

  const entityRows = entities.map((e) => {
    const ca       = getVal(e.id, "ca", currentEntries);
    const caTarget = getTarget(e.id, "ca");
    const prevCA   = getVal(e.id, "ca", prevEntries as typeof currentEntries);
    const taux     = getVal(e.id, "taux-service", currentEntries);
    const marge    = getVal(e.id, "marge", currentEntries);
    const evol     = prevCA ? pct(ca, prevCA) : null;
    const progress = caTarget && ca ? (ca / caTarget) * 100 : null;
    const tauxTgt  = getTarget(e.id, "taux-service");
    const status: "ok" | "warn" | "critical" =
      !ca ? "critical" :
      caTarget && ca < caTarget * 0.9 ? "critical" :
      evol !== null && evol < -3 ? "warn" : "ok";
    const risk    = riskScore(ca, caTarget, prevCA, taux, tauxTgt);
    const projCA  = isLive && ca > 0 ? Math.round(ca * PROJ_FACTOR) : 0;
    const projGap = caTarget && projCA ? ((projCA - caTarget) / caTarget) * 100 : null;
    const spark   = sparkMap[e.id] ?? [];
    return { ...e, ca, caTarget, prevCA, taux, marge, evol, progress, status, risk, projCA, projGap, spark };
  }).sort((a, b) => b.ca - a.ca);

  const visibleRows  = div ? entityRows.filter(e => e.division.name === div) : entityRows;
  const withData     = visibleRows.filter(e => e.ca > 0);
  const withoutData  = visibleRows.filter(e => e.ca === 0);

  // Stats de la vue active (filtrée ou groupe)
  const viewCA    = visibleRows.reduce((s, e) => s + e.ca, 0);
  const viewPrev  = visibleRows.reduce((s, e) => s + e.prevCA, 0);
  const viewEv    = pct(viewCA, viewPrev);
  const viewMarge = div ? currentEntries.filter(e => e.kpiDefId === "marge" && visibleRows.some(r => r.id === e.entityId)).reduce((s, e) => s + e.value, 0) : totalMarge;
  const viewMRate = viewCA ? viewMarge / viewCA * 100 : 0;

  // Score de santé groupe : moyenne pondérée des risques par CA (inversé → 100 = parfait)
  const groupHealth = (() => {
    const totalW = entityRows.reduce((s, e) => s + Math.max(e.ca, 1), 0);
    const raw    = entityRows.reduce((s, e) => s + e.risk * Math.max(e.ca, 1), 0) / totalW;
    return Math.round(100 - raw);
  })();
  const healthColor = groupHealth >= 70 ? "#10b981" : groupHealth >= 45 ? "#f59e0b" : "#ef4444";
  const healthLabel = groupHealth >= 70 ? "Sain" : groupHealth >= 45 ? "Vigilance" : "Critique";

  const totalProjCA  = entityRows.reduce((s, e) => s + e.projCA, 0);
  const totalCATarget = currentEntries.filter(e => e.kpiDefId === "ca" && e.target).reduce((s, e) => s + (e.target ?? 0), 0);
  const projGapGrp   = totalCATarget && totalProjCA ? ((totalProjCA - totalCATarget) / totalCATarget) * 100 : null;

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: "var(--bg-deep)" }}>

      {/* ── HEADER ── */}
      <header style={{
        background: "var(--bg-panel)",
        borderBottom: "1px solid var(--border)",
        padding: "0 20px",
        height: 56,
        display: "flex",
        alignItems: "center",
        gap: 16,
        flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 1px 4px rgba(16,185,129,0.35)",
            flexShrink: 0,
          }}>
            <span style={{ color: "#fff", fontWeight: 800, fontSize: 14, letterSpacing: -1 }}>M</span>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-1)", letterSpacing: -0.2 }}>Moncef AI</div>
            <div style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500, marginTop: -1 }}>Groupe Dislog · War Room</div>
          </div>
        </div>

        {/* Active filter badge */}
        {div && (
          <Link href={`?period=${period}`} style={{
            textDecoration: "none", display: "flex", alignItems: "center", gap: 5,
            padding: "3px 8px 3px 10px", borderRadius: 100,
            background: `${DIV_COLORS[div]}12`,
            border: `1px solid ${DIV_COLORS[div]}35`,
            fontSize: 11, fontWeight: 700, color: DIV_COLORS[div],
          }}>
            {div}
            <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7, lineHeight: 1 }}>×</span>
          </Link>
        )}

        {/* Separator */}
        <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

        {/* Mode tabs */}
        <div style={{ display: "flex", gap: 2 }}>
          {[{ label: "Groupe", val: null }, { label: "Food", val: "Food" }, { label: "Hygiene", val: "Hygiene" }, { label: "Health", val: "Health" }].map(({ label, val }) => {
            const active = div === val;
            const href = val ? `?period=${period}&div=${val}` : `?period=${period}`;
            return (
              <Link key={label} href={href} style={{ textDecoration: "none" }}>
                <span className={`mode-btn ${active ? "active" : ""}`}>{label}</span>
              </Link>
            );
          })}
        </div>

        <div style={{ width: 1, height: 20, background: "var(--border)", flexShrink: 0 }} />

        {/* Period tabs */}
        <div style={{ display: "flex", gap: 1 }}>
          {PERIODS.map((p) => (
            <Link key={p} href={div ? `?period=${p}&div=${div}` : `?period=${p}`} style={{ textDecoration: "none" }}>
              <span className={`mode-btn ${p === period ? "active" : ""}`} style={{ fontSize: 11 }}>
                {PERIOD_LABELS[p]}
              </span>
            </Link>
          ))}
        </div>

        {/* Right */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>

          {/* Score santé groupe */}
          <div style={{
            display: "flex", alignItems: "center", gap: 7,
            padding: "4px 10px", borderRadius: 6,
            background: `${healthColor}0f`,
            border: `1px solid ${healthColor}30`,
          }}>
            <div style={{ position: "relative", width: 22, height: 22, flexShrink: 0 }}>
              <svg width="22" height="22" viewBox="0 0 22 22" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="11" cy="11" r="8" fill="none" stroke="var(--border)" strokeWidth="2.5" />
                <circle cx="11" cy="11" r="8" fill="none" stroke={healthColor} strokeWidth="2.5"
                  strokeDasharray={`${2 * Math.PI * 8}`}
                  strokeDashoffset={`${2 * Math.PI * 8 * (1 - groupHealth / 100)}`}
                  strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div style={{ fontSize: 9, fontWeight: 600, color: healthColor, textTransform: "uppercase", letterSpacing: "0.06em", lineHeight: 1 }}>{healthLabel}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: healthColor, lineHeight: 1.1, letterSpacing: -0.3 }}>{groupHealth}<span style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>/100</span></div>
            </div>
          </div>

          {critCount > 0 && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 6,
              background: "rgba(239,68,68,0.07)",
              border: "1px solid rgba(239,68,68,0.2)",
              fontSize: 12, fontWeight: 600, color: "#dc2626",
            }}>
              <AlertTriangle size={11} />
              {critCount} alerte{critCount > 1 ? "s" : ""} critique{critCount > 1 ? "s" : ""}
            </div>
          )}
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "4px 10px", borderRadius: 6,
            background: "var(--bg-card)",
            border: "1px solid var(--border)",
            fontSize: 12, fontWeight: 500, color: "var(--text-3)",
          }}>
            <Activity size={11} style={{ color: "#10b981" }} />
            {period}
          </div>
          <LiveClock />
          <ThemeToggle />
        </div>
      </header>

      {/* Alerts banner (only if critical) */}
      {critCount > 0 && (
        <div style={{
          flexShrink: 0, padding: "8px 20px",
          background: "rgba(239,68,68,0.04)",
          borderBottom: "1px solid rgba(239,68,68,0.12)",
          display: "flex", alignItems: "center", gap: 12, overflowX: "auto",
        }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.06em", flexShrink: 0 }}>
            Alertes critiques
          </span>
          {alerts.filter(a => a.level === "critical").slice(0, 4).map((a, i) => (
            <Link key={i} href={`/entites/${a.slug}`} style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "3px 10px", borderRadius: 100,
              background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)",
              fontSize: 12, color: "#dc2626", fontWeight: 500, whiteSpace: "nowrap",
              textDecoration: "none", flexShrink: 0,
            }}>
              <span style={{ fontWeight: 700 }}>{a.entity}</span>
              <span style={{ opacity: 0.7 }}>·</span>
              {a.msg}
            </Link>
          ))}
        </div>
      )}

      {/* ── MAIN 3-COLUMN ── */}
      <div className="flex-1 overflow-hidden" style={{ display: "grid", gridTemplateColumns: "260px 1fr 248px" }}>

        {/* ══ LEFT: FILIALES ══ */}
        <aside style={{
          borderRight: "1px solid var(--border)",
          background: "var(--bg-panel)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span className="stat-label">Filiales</span>
            <span style={{
              fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 100,
              background: "var(--bg-card)", border: "1px solid var(--border)", color: "var(--text-3)",
            }}>{withData.length} actives</span>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {div && viewCA > 0 && (
              <div style={{
                padding: "10px 12px", borderRadius: 8, marginBottom: 2,
                background: `${DIV_COLORS[div]}08`, border: `1px solid ${DIV_COLORS[div]}25`,
              }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: DIV_COLORS[div], textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>{DIV_LABELS[div]}</div>
                <div className="number-display" style={{ fontSize: 20, fontWeight: 800, color: "var(--text-1)", letterSpacing: -0.5, lineHeight: 1 }}>{fmt(viewCA)}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>MAD · {withData.length} filiale{withData.length !== 1 ? "s" : ""}</span>
                  {viewPrev > 0 && (
                    <span className="number-display" style={{ fontSize: 10, fontWeight: 700, color: viewEv >= 0 ? "#10b981" : "#ef4444" }}>
                      {viewEv >= 0 ? "▲" : "▼"}{Math.abs(viewEv).toFixed(1)}%
                    </span>
                  )}
                  <span style={{ fontSize: 10, color: "var(--text-3)" }}>· Marge {viewMRate.toFixed(1)}%</span>
                </div>
              </div>
            )}
            {withData.map((e) => {
              const color = DIV_COLORS[e.division.name];
              const statusColor = e.status === "critical" ? "#ef4444" : e.status === "warn" ? "#f59e0b" : "#10b981";
              const prog = e.progress ?? 0;
              return (
                <Link key={e.id} href={`/entites/${e.slug}`} className="signal-card" style={{ display: "block", padding: 12, textDecoration: "none" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 6, height: 6, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                        backgroundColor: statusColor,
                        boxShadow: `0 0 0 2px ${statusColor}25`,
                      }} />
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)", lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {e.name}
                        </div>
                        <div style={{ fontSize: 11, color, fontWeight: 500, marginTop: 1 }}>
                          {DIV_LABELS[e.division.name]}
                        </div>
                      </div>
                    </div>
                    <span style={{
                      fontSize: 9, fontWeight: 800, padding: "1px 5px", borderRadius: 4, flexShrink: 0,
                      background: e.risk >= 60 ? "rgba(239,68,68,0.08)" : e.risk >= 30 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                      color: e.risk >= 60 ? "#ef4444" : e.risk >= 30 ? "#f59e0b" : "#10b981",
                      border: `1px solid ${e.risk >= 60 ? "rgba(239,68,68,0.2)" : e.risk >= 30 ? "rgba(245,158,11,0.2)" : "rgba(16,185,129,0.2)"}`,
                    }}>{e.risk}</span>
                  </div>

                  <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                    <div>
                      <div className="number-display" style={{ fontSize: 18, fontWeight: 700, color: "var(--text-1)", lineHeight: 1 }}>
                        {fmt(e.ca)}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 2 }}>
                        MAD{e.caTarget ? ` · obj. ${fmt(e.caTarget)}` : ""}
                      </div>
                    </div>
                    {e.evol !== null && (
                      <div className="number-display" style={{
                        fontSize: 12, fontWeight: 700,
                        color: e.evol >= 0 ? "#10b981" : "#ef4444",
                        display: "flex", alignItems: "center", gap: 2,
                      }}>
                        {e.evol >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                        {Math.abs(e.evol).toFixed(1)}%
                      </div>
                    )}
                  </div>

                  {e.progress !== null && (
                    <div style={{ marginTop: 8, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{
                        height: "100%", borderRadius: 2,
                        width: `${Math.min(prog, 100)}%`,
                        backgroundColor: statusColor, opacity: 0.7,
                      }} />
                    </div>
                  )}
                  {e.spark.some(v => v > 0) && (() => {
                    const W = 212, H = 20;
                    const vals = e.spark;
                    const max  = Math.max(...vals, 1);
                    const pts  = vals.map((v, i) =>
                      `${(i / (vals.length - 1)) * W},${H - (v / max) * H}`
                    ).join(" ");
                    const last = vals[vals.length - 1];
                    const prev2 = vals[vals.length - 2];
                    const sparkColor = last >= prev2 ? "#10b981" : "#f59e0b";
                    return (
                      <div style={{ marginTop: 8 }}>
                        <svg width={W} height={H} style={{ display: "block", overflow: "visible" }}>
                          <polyline points={pts} fill="none" stroke={sparkColor} strokeWidth="1.5"
                            strokeLinejoin="round" strokeLinecap="round" opacity="0.7" />
                          <circle
                            cx={(((vals.length - 1) / (vals.length - 1)) * W)}
                            cy={H - (last / max) * H}
                            r="2.5" fill={sparkColor} />
                        </svg>
                      </div>
                    );
                  })()}
                  {e.projCA > 0 && (
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 9, color: "var(--text-4)", fontWeight: 500 }}>Proj. fin mai</span>
                      <span className="number-display" style={{
                        fontSize: 10, fontWeight: 700,
                        color: e.projGap !== null ? (e.projGap >= 0 ? "#10b981" : "#f59e0b") : "var(--text-3)",
                      }}>
                        {fmt(e.projCA)}
                        {e.projGap !== null && (
                          <span style={{ fontSize: 9, fontWeight: 600, marginLeft: 3, opacity: 0.85 }}>
                            {e.projGap >= 0 ? "▲" : "▼"}{Math.abs(e.projGap).toFixed(0)}% obj.
                          </span>
                        )}
                      </span>
                    </div>
                  )}
                </Link>
              );
            })}

            {withoutData.length > 0 && (
              <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--border)" }}>
                <div className="stat-label" style={{ paddingLeft: 4, marginBottom: 6 }}>En attente</div>
                {withoutData.map((e) => (
                  <Link key={e.id} href={`/entites/${e.slug}`} className="pending-entity-row" style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 8px", borderRadius: 6, textDecoration: "none",
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--border)", flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: "var(--text-3)", flex: 1 }}>{e.name}</span>
                    <span style={{ fontSize: 11, color: "var(--text-4)", fontWeight: 500 }}>—</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* ══ CENTER ══ */}
        <main style={{ overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12, background: "var(--bg-deep)" }}>

          {/* Division cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
            {divBreakdown.map((d) => {
              const evol = pct(d.ca, d.prevCa);
              const share = totalCA ? d.ca / totalCA * 100 : 0;
              return (
                <div key={d.div} className="panel" style={{ padding: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: d.color }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-1)" }}>
                        {d.div}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 100,
                      backgroundColor: `${d.color}12`, color: d.color,
                    }}>{share.toFixed(0)}%</span>
                  </div>
                  <div className="number-display" style={{ fontSize: 26, fontWeight: 800, color: "var(--text-1)", lineHeight: 1, letterSpacing: -1 }}>
                    {d.ca > 0 ? fmt(d.ca) : <span style={{ color: "var(--text-4)" }}>—</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 3 }}>
                    MAD · {d.active} filiale{d.active !== 1 ? "s" : ""} active{d.active !== 1 ? "s" : ""}
                  </div>
                  <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${share}%`, backgroundColor: d.color, opacity: 0.6, borderRadius: 2 }} />
                    </div>
                    <div className="number-display" style={{
                      fontSize: 12, fontWeight: 700,
                      color: evol >= 0 ? "#10b981" : "#ef4444",
                      display: "flex", alignItems: "center", gap: 2,
                    }}>
                      {evol >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {Math.abs(evol).toFixed(1)}%
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts + KPI panel */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 220px", gap: 12 }}>
            <div className="panel" style={{ padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span className="stat-label">Évolution CA — 6 mois</span>
                <div style={{ display: "flex", gap: 12 }}>
                  {Object.entries(DIV_COLORS).map(([div, color]) => (
                    <span key={div} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>
                      <span style={{ width: 8, height: 2, borderRadius: 1, display: "inline-block", backgroundColor: color }} />
                      {div}
                    </span>
                  ))}
                </div>
              </div>
              <WarRoomCharts
                trendData={trendData}
                entityData={withData.map(e => ({
                  name: e.name.replace("Dislog ", "").replace(" Laboratories", ""),
                  ca: e.ca / 1e6,
                  color: DIV_COLORS[e.division.name],
                }))}
              />
            </div>

            {/* KPI summary */}
            <div className="panel" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              <span className="stat-label">Consolidé · {period}</span>
              {[
                { label: "Chiffre d'affaires", value: totalCA, color: "#10b981", evol: evCA },
                { label: "Marge brute", value: totalMarge, color: "#3b82f6", rate: margeRate },
                { label: "EBITDA", value: totalEbitda, color: "#8b5cf6", rate: ebitdaRate },
                { label: "Effectifs", value: totalEff, color: "#f59e0b", unit: "pers." },
              ].map(k => (
                <div key={k.label}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span style={{ fontSize: 12, color: "var(--text-3)", fontWeight: 500 }}>{k.label}</span>
                    {"evol" in k && k.evol !== undefined ? (
                      <span className="number-display" style={{ fontSize: 11, fontWeight: 700, color: k.evol >= 0 ? "#10b981" : "#ef4444" }}>
                        {k.evol >= 0 ? "▲" : "▼"}{Math.abs(k.evol).toFixed(1)}%
                      </span>
                    ) : "rate" in k && k.rate !== undefined ? (
                      <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{k.rate.toFixed(1)}%</span>
                    ) : null}
                  </div>
                  <div className="number-display" style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1 }}>
                    <span style={{ color: k.color }}>{k.unit ? k.value.toLocaleString("fr-FR") : fmt(k.value)}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, color: "var(--text-3)", marginLeft: 4 }}>{k.unit ?? "MAD"}</span>
                  </div>
                  <div style={{ marginTop: 6, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", borderRadius: 2, opacity: 0.6,
                      width: k.label === "Effectifs" ? "100%" : `${Math.min((k.value / totalCA) * 100 * (k.label === "Chiffre d'affaires" ? 1 : 5), 100)}%`,
                      backgroundColor: k.color,
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Entity table */}
          <div className="panel" style={{ overflow: "hidden" }}>
            <div style={{
              padding: "12px 16px", borderBottom: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <span className="stat-label">Tableau des filiales</span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {div && <span style={{ fontSize: 11, fontWeight: 600, padding: "1px 7px", borderRadius: 100, background: `${DIV_COLORS[div]}12`, color: DIV_COLORS[div] }}>{visibleRows.length} / {entityRows.length}</span>}
                <span style={{ fontSize: 11, color: "var(--text-3)", fontWeight: 500 }}>{period}</span>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border)" }}>
                  {["", "Filiale", "Division", "CA réel", "vs Objectif", "Marge", "Taux svc", "Δ M/M", "Risk", ""].map((h, i) => (
                    <th key={i} className="stat-label" style={{
                      padding: i === 0 ? "8px 0 8px 16px" : "8px 12px",
                      textAlign: i >= 3 && i <= 7 ? "right" : "left",
                      width: i === 0 ? 24 : "auto", fontWeight: 600,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleRows.map((e) => {
                  const sc = e.status === "critical" ? "#ef4444" : e.status === "warn" ? "#f59e0b" : "#10b981";
                  return (
                    <tr key={e.id} className="table-row-hover entity-row" style={{ borderBottom: "1px solid var(--border2)", cursor: "pointer" }}>
                      <td style={{ paddingLeft: 16, paddingTop: 10, paddingBottom: 10 }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: sc }} />
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: 13, fontWeight: 600, color: "var(--text-1)", whiteSpace: "nowrap" }}>
                        <Link href={`/entites/${e.slug}`} className="entity-row-link" style={{ color: "inherit", textDecoration: "none" }}>
                          {e.name}
                        </Link>
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 100,
                          backgroundColor: `${DIV_COLORS[e.division.name]}12`, color: DIV_COLORS[e.division.name],
                        }}>{e.division.name}</span>
                      </td>
                      <td className="number-display" style={{ padding: "10px 12px", textAlign: "right", fontSize: 13, fontWeight: 700, color: "var(--text-1)" }}>
                        {e.ca ? fmt(e.ca) : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {e.progress !== null ? (
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 6 }}>
                            <div style={{ width: 40, height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                              <div style={{
                                height: "100%", borderRadius: 2,
                                width: `${Math.min(e.progress, 100)}%`,
                                backgroundColor: e.progress >= 100 ? "#10b981" : e.progress >= 85 ? "#f59e0b" : "#ef4444",
                              }} />
                            </div>
                            <span className="number-display" style={{
                              fontSize: 12, fontWeight: 700,
                              color: e.progress >= 100 ? "#10b981" : e.progress >= 85 ? "#f59e0b" : "#ef4444",
                            }}>{e.progress.toFixed(0)}%</span>
                          </div>
                        ) : <span style={{ color: "var(--text-4)", fontSize: 13 }}>—</span>}
                      </td>
                      <td className="number-display" style={{ padding: "10px 12px", textAlign: "right", fontSize: 12, color: "var(--text-2)" }}>
                        {e.marge ? fmt(e.marge) : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>
                      <td className="number-display" style={{ padding: "10px 12px", textAlign: "right", fontSize: 12 }}>
                        {e.taux ? (
                          <span style={{ color: e.taux >= 96 ? "#10b981" : e.taux >= 94 ? "#f59e0b" : "#ef4444", fontWeight: 600 }}>
                            {e.taux.toFixed(1)}%
                          </span>
                        ) : <span style={{ color: "var(--text-4)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        {e.evol !== null && e.ca > 0 ? (
                          <span className="number-display" style={{
                            fontSize: 12, fontWeight: 700,
                            color: e.evol >= 0 ? "#10b981" : "#ef4444",
                            display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2,
                          }}>
                            {e.evol >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {Math.abs(e.evol).toFixed(1)}%
                          </span>
                        ) : <span style={{ color: "var(--text-4)", fontSize: 12 }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <span style={{
                          fontSize: 10, fontWeight: 800, padding: "2px 5px", borderRadius: 4,
                          background: e.risk >= 60 ? "rgba(239,68,68,0.08)" : e.risk >= 30 ? "rgba(245,158,11,0.08)" : "rgba(16,185,129,0.08)",
                          color: e.risk >= 60 ? "#ef4444" : e.risk >= 30 ? "#f59e0b" : "#10b981",
                        }}>{e.risk}</span>
                      </td>
                      <td style={{ paddingRight: 12 }}>
                        <ArrowUpRight size={13} className="entity-row-arrow" style={{ color: "#10b981", opacity: 0, transition: "opacity 0.15s" }} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </main>

        {/* ══ RIGHT: CO-PILOT ══ */}
        <aside style={{
          borderLeft: "1px solid var(--border)",
          background: "var(--bg-panel)",
          display: "flex", flexDirection: "column", overflow: "hidden",
        }}>
          <div style={{
            padding: "12px 16px", borderBottom: "1px solid var(--border)",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <span className="stat-label">Moncef AI · Co-pilot</span>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div className="animate-blink" style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
              <span style={{ fontSize: 10, fontWeight: 600, color: "#10b981", textTransform: "uppercase", letterSpacing: "0.06em" }}>Actif</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: 12, display: "flex", flexDirection: "column", gap: 8 }}>

            {/* Situation */}
            <div style={{
              padding: 12, borderRadius: 8,
              background: "rgba(16,185,129,0.05)",
              border: "1px solid rgba(16,185,129,0.15)",
            }}>
              <div className="stat-label" style={{ marginBottom: 6 }}>
                {div ? `${div} · ${period}` : `Groupe · ${period}`}
              </div>
              <p style={{ fontSize: 12, color: "var(--text-2)", lineHeight: 1.6 }}>
                CA {div ? `division ${div}` : "consolidé"}{" "}
                <strong style={{ color: "var(--text-1)", fontWeight: 700 }}>{fmt(viewCA)} MAD</strong>{" "}
                <span style={{ fontWeight: 700, color: viewEv >= 0 ? "#10b981" : "#ef4444" }}>
                  {viewEv >= 0 ? "+" : ""}{viewEv.toFixed(1)}%
                </span>{" "}
                vs {prevPeriod ? PERIOD_LABELS[prevPeriod] : "mois préc."}. Marge{" "}
                <strong style={{ color: "var(--text-1)" }}>{viewMRate.toFixed(1)}%</strong>
                {!div && <>, EBITDA <strong style={{ color: "var(--text-1)" }}>{ebitdaRate.toFixed(1)}%</strong></>}.
              </p>
            </div>

            {/* Urgences */}
            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="stat-label" style={{ marginBottom: 8 }}>Urgences décisionnelles</div>
              {alerts.length === 0 ? (
                <p style={{ fontSize: 12, color: "#10b981", fontWeight: 500 }}>✓ Aucune action urgente</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {alerts.slice(0, 5).map((a, i) => (
                    <Link key={i} href={`/entites/${a.slug}`} style={{ display: "flex", gap: 10, textDecoration: "none" }}>
                      <div style={{
                        width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 10, fontWeight: 800,
                        background: a.level === "critical" ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                        color: a.level === "critical" ? "#ef4444" : "#f59e0b",
                        border: `1px solid ${a.level === "critical" ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                      }}>{String(i + 1).padStart(2, "0")}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {a.entity}
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 800, flexShrink: 0, padding: "1px 4px", borderRadius: 3,
                            background: a.risk >= 60 ? "rgba(239,68,68,0.08)" : "rgba(245,158,11,0.08)",
                            color: a.risk >= 60 ? "#ef4444" : "#f59e0b",
                          }}>R{a.risk}</span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-3)", marginTop: 1 }}>{a.msg}</div>
                        <div style={{ fontSize: 10, marginTop: 1, display: "flex", gap: 6 }}>
                          <span style={{ color: "var(--text-4)" }}>{a.detail}</span>
                          {a.impact && <span style={{ color: "#ef4444", fontWeight: 600 }}>{a.impact}</span>}
                        </div>
                        {ACTIONS[a.msg] && (
                          <div style={{ fontSize: 10, marginTop: 3, color: "#10b981", fontWeight: 500, fontStyle: "italic" }}>
                            {ACTIONS[a.msg]}
                          </div>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Top performers */}
            <div style={{ padding: 12, borderRadius: 8, background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <div className="stat-label" style={{ marginBottom: 8 }}>Top filiales · CA</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {withData.slice(0, 4).map((e, i) => {
                  const color = DIV_COLORS[e.division.name];
                  const share = totalCA ? e.ca / totalCA * 100 : 0;
                  return (
                    <Link key={e.id} href={`/entites/${e.slug}`} style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-4)", width: 12, flexShrink: 0 }}>{i + 1}</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {e.name}
                          </span>
                          <span className="number-display" style={{ fontSize: 11, fontWeight: 700, color: "var(--text-1)", marginLeft: 4, flexShrink: 0 }}>
                            {fmt(e.ca)}
                          </span>
                        </div>
                        <div style={{ height: 2, background: "var(--border)", borderRadius: 2, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${share}%`, backgroundColor: color, opacity: 0.7, borderRadius: 2 }} />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Moncef AI CTA */}
            <div style={{
              padding: 12, borderRadius: 8,
              background: "linear-gradient(135deg, rgba(16,185,129,0.06), rgba(16,185,129,0.02))",
              border: "1px solid rgba(16,185,129,0.2)",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 6 }}>
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "linear-gradient(135deg, #10b981, #059669)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 1px 4px rgba(16,185,129,0.4)", flexShrink: 0,
                }}>
                  <span style={{ color: "#fff", fontWeight: 800, fontSize: 10 }}>M</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#10b981" }}>Intelligence active</span>
              </div>
              <p style={{ fontSize: 11, color: "var(--text-3)", lineHeight: 1.6, fontStyle: "italic" }}>
                Posez une question sur vos filiales ou objectifs — cliquez sur la bulle verte.
              </p>
            </div>
          </div>
        </aside>
      </div>

      {/* ── BOTTOM STATS BAR ── */}
      <footer style={{
        flexShrink: 0, height: 48,
        background: "var(--bg-panel)",
        borderTop: "1px solid var(--border)",
        display: "flex", alignItems: "stretch",
      }}>
        {[
          { label: "CA Groupe",   value: fmt(totalCA),                    unit: "MAD", color: "#10b981", evol: evCA },
          { label: "Marge brute", value: fmt(totalMarge),                 unit: "MAD", sub: `${margeRate.toFixed(1)}%`, color: "#3b82f6" },
          { label: "EBITDA",      value: fmt(totalEbitda),                unit: "MAD", sub: `${ebitdaRate.toFixed(1)}%`, color: "#8b5cf6" },
          { label: "Effectifs",   value: totalEff.toLocaleString("fr-FR"), unit: "pers.", color: "#f59e0b" },
          { label: "Filiales",    value: `${entities.length}`,            unit: "entités", color: "var(--text-3)" },
          { label: "Alertes",     value: `${alerts.length}`,              unit: `dont ${critCount} critique${critCount !== 1 ? "s" : ""}`, color: alerts.length > 0 ? "#ef4444" : "#10b981" },
          { label: isLive ? "Proj. fin mai" : "Période clôturée", value: isLive && totalProjCA ? fmt(totalProjCA) : "—", unit: isLive ? "MAD" : "", color: projGapGrp === null ? "var(--text-3)" : projGapGrp >= 0 ? "#10b981" : "#f59e0b", sub: projGapGrp !== null ? `${projGapGrp >= 0 ? "+" : ""}${projGapGrp.toFixed(0)}% obj.` : undefined },
        ].map((s, i) => (
          <div key={i} style={{
            flex: 1, display: "flex", alignItems: "center", padding: "0 16px", gap: 8,
            borderRight: i < 6 ? "1px solid var(--border)" : "none",
          }}>
            <div style={{ width: 2, height: 16, borderRadius: 2, backgroundColor: s.color, opacity: 0.7, flexShrink: 0 }} />
            <div>
              <div className="stat-label" style={{ marginBottom: 1 }}>{s.label}</div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span className="number-display" style={{ fontSize: 14, fontWeight: 800, letterSpacing: -0.3, color: s.color }}>
                  {s.value}
                </span>
                <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>{s.unit}</span>
                {"evol" in s && s.evol !== undefined && (
                  <span className="number-display" style={{ fontSize: 10, fontWeight: 700, color: s.evol >= 0 ? "#10b981" : "#ef4444" }}>
                    {s.evol >= 0 ? "+" : ""}{s.evol.toFixed(1)}%
                  </span>
                )}
                {"sub" in s && s.sub && (
                  <span style={{ fontSize: 10, color: "var(--text-3)", fontWeight: 500 }}>{s.sub}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}

export default async function WarRoomPage({ searchParams }: { searchParams: Promise<{ period?: string; div?: string }> }) {
  const sp = await searchParams;
  const period = sp.period && PERIODS.includes(sp.period) ? sp.period : LATEST;
  const div = sp.div && ["Food", "Hygiene", "Health"].includes(sp.div) ? sp.div : null;
  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: "var(--bg-deep)" }}>
      <Suspense fallback={
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", border: "2px solid #10b981", borderTopColor: "transparent", animation: "spin 0.7s linear infinite" }} />
          <p style={{ fontSize: 12, color: "var(--text-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>Chargement…</p>
        </div>
      }>
        <WarRoomContent period={period} div={div} />
      </Suspense>
      <MoncefAIOrb />
    </div>
  );
}
