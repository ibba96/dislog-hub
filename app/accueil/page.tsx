import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { JarvisClock } from "@/components/JarvisClock";
import { AccueilThemeToggle } from "@/components/AccueilThemeToggle";
import { AccueilAISection } from "@/components/AccueilAISection";

const PERIOD = "2026-05";
const PREV   = "2026-04";
export const dynamic = "force-dynamic";

/* ── Health score 0-100 ── */
function healthScore(
  ca: number | null, ct: number | null,
  tx: number | null, tt: number | null,
  pc: number | null,
): number {
  const scores: number[] = [];
  if (ca !== null && ct !== null && ct > 0)
    scores.push(Math.min(100, (ca / ct) * 100));
  if (tx !== null && tt !== null && tt > 0)
    scores.push(Math.min(100, (tx / tt) * 100));
  if (ca !== null && pc !== null && pc > 0) {
    const evol = (ca - pc) / pc;            // −1 → 0  … 0 → 50  … +0.1 → 100
    scores.push(Math.max(0, Math.min(100, 50 + evol * 500)));
  }
  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function scoreColor(s: number) {
  if (s >= 80) return "#10b981";
  if (s >= 60) return "#f59e0b";
  return "#ef4444";
}
function scoreLabel(s: number) {
  if (s >= 80) return "Sain";
  if (s >= 60) return "Attention";
  return "Critique";
}

export default async function AccueilPage() {
  const [entities, current, prev] = await Promise.all([
    prisma.entity.findMany({ include: { division: true } }),
    prisma.kpiEntry.findMany({ where: { period: PERIOD } }),
    prisma.kpiEntry.findMany({ where: { period: PREV } }),
  ]);

  const valC = (eid: string, kid: string) =>
    current.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const valP = (eid: string, kid: string) =>
    prev.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const tgt = (eid: string, kid: string) =>
    current.find(e => e.entityId === eid && e.kpiDefId === kid)?.target ?? null;

  /* ── Group KPIs ── */
  const totalCA    = current.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const totalMarge = current.filter(e => e.kpiDefId === "marge").reduce((s, e) => s + e.value, 0);
  const prevCA     = prev.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const caEvol     = prevCA ? ((totalCA - prevCA) / prevCA * 100) : 0;

  /* ── Alerts ── */
  const alerts: { entity: string; slug: string; label: string; sev: "critical" | "warning" }[] = [];
  for (const e of entities) {
    const ca = valC(e.id, "ca");
    const ct = tgt(e.id, "ca");
    const pc = valP(e.id, "ca");
    const tx = valC(e.id, "taux-service");
    const tt = tgt(e.id, "taux-service");
    if (!ca) continue;
    if (ct && ca < ct * 0.80)   alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca / ct * 100)}% de l'objectif`, sev: "critical" });
    else if (ct && ca < ct * 0.93) alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca / ct * 100)}% de l'objectif`, sev: "warning" });
    if (pc && ca < pc * 0.92)   alerts.push({ entity: e.name, slug: e.slug, label: `CA −${Math.abs(Math.round((ca - pc) / pc * 100))}% vs mois préc.`, sev: "critical" });
    if (tx && tt && tx < tt)    alerts.push({ entity: e.name, slug: e.slug, label: `Taux service ${tx.toFixed(1)}% (obj. ${tt.toFixed(1)}%)`, sev: "warning" });
  }
  const critCount = alerts.filter(a => a.sev === "critical").length;
  const warnCount = alerts.filter(a => a.sev === "warning").length;

  /* ── Health scores ── */
  const healthData = entities.map(e => {
    const ca = valC(e.id, "ca");
    const ct = tgt(e.id, "ca");
    const tx = valC(e.id, "taux-service");
    const tt = tgt(e.id, "taux-service");
    const pc = valP(e.id, "ca");
    const score = healthScore(ca, ct, tx, tt, pc);
    const evol  = ca && pc ? ((ca - pc) / pc * 100) : 0;
    return { name: e.name, slug: e.slug, score, evol, ca, ct };
  }).sort((a, b) => b.score - a.score);

  /* ── Top 3 morning priorities ── */
  const priorities: { icon: string; text: string; slug?: string }[] = [];
  const critAlerts = alerts.filter(a => a.sev === "critical").slice(0, 2);
  critAlerts.forEach(a =>
    priorities.push({ icon: "🔴", text: `${a.entity} — ${a.label}`, slug: a.slug })
  );
  const lowestHealth = [...healthData].sort((a, b) => a.score - b.score)[0];
  if (lowestHealth && lowestHealth.score < 70 && !priorities.find(p => p.slug === lowestHealth.slug))
    priorities.push({ icon: "⚠️", text: `Analyser ${lowestHealth.name} — santé ${lowestHealth.score}/100`, slug: lowestHealth.slug });
  if (priorities.length < 3)
    priorities.push({ icon: "📊", text: "Comparer la performance vs Baromètre Industrie Maroc 2025" });
  if (priorities.length < 3)
    priorities.push({ icon: "💡", text: "Consulter Moncef AI pour arbitrer les investissements ce mois" });

  return (
    <div className="accueil-root">

      {/* ── TOP NAV ── */}
      <nav className="accueil-nav">
        <div className="accueil-nav-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="brand-logo">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <span className="brand-name">Dislog Hub</span>
            <span className="brand-sep">/</span>
            <span className="brand-sub">Tableau de bord</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="status-pill">
              <span className="status-dot" />
              Moncef AI actif
            </div>
            <Link href="/war-room" className="nav-link-btn">War Room →</Link>
            <AccueilThemeToggle />
          </div>
        </div>
      </nav>

      <main className="accueil-main">

        {/* ── HEADER ── */}
        <div className="accueil-header">
          <JarvisClock />
          <div className="header-badges">
            {critCount > 0 && <div className="badge-critical">{critCount} critique{critCount > 1 ? "s" : ""}</div>}
            {warnCount > 0 && <div className="badge-warning">{warnCount} alerte{warnCount > 1 ? "s" : ""}</div>}
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div className="kpi-strip">
          {[
            {
              label: "CA Groupe", icon: "💰",
              value: `${(totalCA / 1e6).toFixed(0)} M MAD`,
              delta: `${caEvol >= 0 ? "+" : ""}${caEvol.toFixed(1)}% vs mois préc.`,
              positive: caEvol >= 0,
            },
            {
              label: "Marge brute", icon: "📊",
              value: `${(totalMarge / 1e6).toFixed(0)} M MAD`,
              delta: `${totalCA ? (totalMarge / totalCA * 100).toFixed(1) : "-"}% du CA`,
              positive: true,
            },
            {
              label: "Filiales actives", icon: "🏢",
              value: String(entities.length),
              delta: "Groupe Dislog Belkhyat",
              positive: true,
            },
            {
              label: "Score santé moy.", icon: "🏥",
              value: `${Math.round(healthData.reduce((s, e) => s + e.score, 0) / Math.max(healthData.length, 1))}/100`,
              delta: `${healthData.filter(h => h.score >= 80).length} saines · ${healthData.filter(h => h.score < 60).length} critiques`,
              positive: healthData.filter(h => h.score < 60).length === 0,
            },
          ].map((k, i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-label-row">
                <span className="kpi-icon">{k.icon}</span>
                <span className="kpi-label">{k.label}</span>
              </div>
              <div className="kpi-value">{k.value}</div>
              <div className={`kpi-delta ${k.positive ? "positive" : "negative"}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* ── MAIN GRID ── */}
        <div className="accueil-grid">

          {/* LEFT COL */}
          <div className="accueil-left">

            {/* MORNING PRIORITIES */}
            <div className="stripe-card priorities-card">
              <div className="card-header">
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🎯</span>
                  <span className="card-title">Priorités du matin</span>
                </div>
                <span className="card-badge amber">Aujourd&apos;hui</span>
              </div>
              <div className="priorities-list">
                {priorities.slice(0, 3).map((p, i) => (
                  p.slug ? (
                    <Link key={i} href={`/entites/${p.slug}`} className="priority-row">
                      <div className="priority-num">{i + 1}</div>
                      <span className="priority-icon">{p.icon}</span>
                      <span className="priority-text">{p.text}</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.4 }}>
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </Link>
                  ) : (
                    <div key={i} className="priority-row static">
                      <div className="priority-num">{i + 1}</div>
                      <span className="priority-icon">{p.icon}</span>
                      <span className="priority-text">{p.text}</span>
                    </div>
                  )
                ))}
              </div>
            </div>

            {/* ALERTS */}
            {alerts.length > 0 && (
              <div className="stripe-card" style={{ padding: 0, overflow: "hidden" }}>
                <div className="alert-card-header">
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="sev-dot critical" />
                    <span className="alert-card-title">Urgences décisionnelles</span>
                  </div>
                  <span className="alert-count-badge">{alerts.length}</span>
                </div>
                <div className="alert-list">
                  {alerts.slice(0, 6).map((a, i) => (
                    <Link key={i} href={`/entites/${a.slug}`} className="alert-row">
                      <span className={`sev-dot ${a.sev}`} />
                      <div style={{ flex: 1 }}>
                        <span className="alert-entity">{a.entity}</span>
                        <span className="alert-label"> — {a.label}</span>
                      </div>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" className="alert-arrow">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                    </Link>
                  ))}
                </div>
                <div className="alert-card-footer">
                  <Link href="/war-room" className="alert-footer-link">Voir tous les signaux dans le War Room →</Link>
                </div>
              </div>
            )}

            {/* BAROMETRE */}
            <div className="stripe-card">
              <div className="card-header">
                <span className="card-title">Baromètre Industrie Maroc 2025</span>
                <span className="card-badge indigo">Officiel</span>
              </div>
              <div className="macro-grid">
                {[
                  { label: "CA Industrie national", val: "898 Mrd DH",  delta: "+9,2%", up: true },
                  { label: "Investissements",        val: "89,7 Mrd DH", delta: "+30,2% 🔥 Record", up: true },
                  { label: "Emplois industriels",    val: "1 038 133",   delta: "+4,3%", up: true },
                  { label: "Auto — #1 sectoriel",    val: "196 Mrd DH",  delta: "Première fois", up: true },
                  { label: "Capital marocain",       val: "70,2%",       delta: "Souveraineté stable", up: true },
                  { label: "Inflation IPC",          val: "6,6%",        delta: "↑ Pression marges", up: false },
                ].map((m, i) => (
                  <div key={i} className="macro-item">
                    <div className="macro-item-label">{m.label}</div>
                    <div className="macro-item-val">{m.val}</div>
                    <div className={`macro-item-delta ${m.up ? "positive" : "negative"}`}>{m.delta}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT COL */}
          <div className="accueil-right">

            {/* HEALTH SCORES */}
            <div className="stripe-card" style={{ padding: 0, overflow: "hidden" }}>
              <div className="card-header" style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", margin: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 16 }}>🏥</span>
                  <span className="card-title">Santé des filiales</span>
                </div>
                <span className="card-subtitle">{PERIOD}</span>
              </div>
              <div className="health-list">
                {healthData.map(h => {
                  const color = scoreColor(h.score);
                  const label = scoreLabel(h.score);
                  return (
                    <Link key={h.slug} href={`/entites/${h.slug}`} className="health-row">
                      {/* Score ring */}
                      <div className="health-score-ring" style={{ borderColor: color, color }}>
                        {h.score}
                      </div>
                      {/* Name + bar */}
                      <div className="health-info">
                        <div className="health-name-row">
                          <span className="health-name">{h.name}</span>
                          <span className="health-label" style={{ color, background: `${color}18` }}>{label}</span>
                        </div>
                        <div className="health-bar-bg">
                          <div className="health-bar-fill" style={{ width: `${h.score}%`, background: color }} />
                        </div>
                      </div>
                      {/* Evol */}
                      <span className={`health-evol ${h.evol >= 0 ? "positive" : "negative"}`}>
                        {h.evol >= 0 ? "+" : ""}{h.evol.toFixed(1)}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* MONCEF AI CHAT */}
            <AccueilAISection />

          </div>
        </div>
      </main>

      {/* ── STYLES ── */}
      <style>{`
        /* Root */
        .accueil-root {
          min-height:100vh;
          background:var(--bg-deep);
          color:var(--text-1);
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;
          transition:background 0.2s,color 0.2s;
        }

        /* Nav */
        .accueil-nav {
          background:var(--bg-panel);border-bottom:1px solid var(--border);
          position:sticky;top:0;z-index:50;
        }
        .accueil-nav-inner {
          max-width:1160px;margin:0 auto;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 24px;height:54px;
        }
        .brand-logo {
          width:30px;height:30px;border-radius:8px;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;flex-shrink:0;
        }
        .brand-name { font-weight:700;font-size:14px;color:var(--text-1); }
        .brand-sep  { color:var(--text-4);font-size:14px;margin:0 2px; }
        .brand-sub  { font-size:13px;color:var(--text-3); }
        .status-pill {
          display:flex;align-items:center;gap:6px;
          padding:5px 12px;border-radius:999px;
          background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);
          font-size:12px;font-weight:600;color:#10b981;
        }
        .status-dot {
          width:6px;height:6px;border-radius:50%;background:#10b981;
          box-shadow:0 0 6px rgba(16,185,129,0.6);
          animation:blink 2s ease-in-out infinite;
        }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}
        .nav-link-btn {
          padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-2);text-decoration:none;transition:all 0.15s;
        }
        .nav-link-btn:hover { color:var(--text-1);border-color:var(--accent); }

        /* Main */
        .accueil-main { max-width:1160px;margin:0 auto;padding:28px 24px 60px; }

        /* Header */
        .accueil-header {
          display:flex;align-items:flex-end;justify-content:space-between;
          margin-bottom:24px;flex-wrap:wrap;gap:12px;
        }
        .header-badges { display:flex;gap:8px;align-items:center; }
        .badge-critical {
          padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;
          background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);color:#ef4444;
        }
        .badge-warning {
          padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;
          background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);color:#f59e0b;
        }

        /* KPI Strip */
        .kpi-strip {
          display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px;
        }
        @media(max-width:820px){.kpi-strip{grid-template-columns:repeat(2,1fr);}}
        .kpi-card {
          background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
          padding:16px 18px;box-shadow:var(--shadow-card);transition:all 0.15s;
        }
        .kpi-card:hover { box-shadow:var(--shadow-md);border-color:var(--accent); }
        .kpi-label-row { display:flex;align-items:center;gap:6px;margin-bottom:8px; }
        .kpi-icon { font-size:14px; }
        .kpi-label { font-size:10.5px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3); }
        .kpi-value { font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:4px;font-variant-numeric:tabular-nums; }
        .kpi-delta { font-size:12px;font-weight:600; }
        .kpi-delta.positive { color:#10b981; }
        .kpi-delta.negative { color:#ef4444; }

        /* Grid */
        .accueil-grid {
          display:grid;grid-template-columns:1fr 380px;gap:18px;align-items:start;
        }
        @media(max-width:920px){.accueil-grid{grid-template-columns:1fr;}}
        .accueil-left,.accueil-right { display:flex;flex-direction:column;gap:18px; }

        /* Generic card */
        .stripe-card {
          background:var(--bg-panel);border:1px solid var(--border);
          border-radius:10px;padding:18px;box-shadow:var(--shadow-card);
        }
        .card-header {
          display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;
        }
        .card-title   { font-size:13.5px;font-weight:700;color:var(--text-1); }
        .card-subtitle{ font-size:12px;color:var(--text-3); }
        .card-desc    { font-size:13px;color:var(--text-3);margin:0 0 14px;line-height:1.5; }
        .card-badge   { font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px; }
        .card-badge.green  { background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#10b981; }
        .card-badge.indigo { background:rgba(99,91,255,0.08);border:1px solid rgba(99,91,255,0.2);color:#635bff; }
        .card-badge.amber  { background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:#f59e0b; }

        /* Priorities */
        .priorities-list { display:flex;flex-direction:column;gap:0; }
        .priority-row {
          display:flex;align-items:center;gap:10px;
          padding:11px 4px;border-bottom:1px solid var(--border2);
          text-decoration:none;color:inherit;transition:background 0.1s;
          border-radius:6px;
        }
        .priority-row:last-child { border-bottom:none; }
        .priority-row:not(.static):hover { background:var(--bg-card); }
        .priority-num {
          width:22px;height:22px;border-radius:50%;flex-shrink:0;
          background:var(--bg-card2);border:1px solid var(--border);
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:700;color:var(--text-3);
        }
        .priority-icon { font-size:15px;flex-shrink:0; }
        .priority-text { font-size:13px;color:var(--text-2);flex:1; }

        /* Alert card */
        .alert-card-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 18px;border-bottom:1px solid var(--border);
        }
        .alert-card-title { font-size:13.5px;font-weight:700;color:var(--text-1); }
        .alert-count-badge {
          font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;
          background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;
        }
        .alert-list { padding:2px 0; }
        .alert-row {
          display:flex;align-items:center;gap:10px;padding:10px 18px;
          text-decoration:none;border-bottom:1px solid var(--border2);
          transition:background 0.1s;color:inherit;
        }
        .alert-row:last-child { border-bottom:none; }
        .alert-row:hover { background:var(--bg-card); }
        .alert-entity { font-size:13px;font-weight:600;color:var(--text-1); }
        .alert-label  { font-size:13px;color:var(--text-3); }
        .alert-arrow  { color:var(--text-4);flex-shrink:0; }
        .alert-card-footer { padding:11px 18px;border-top:1px solid var(--border);background:var(--bg-card2); }
        .alert-footer-link { font-size:12px;font-weight:600;color:var(--accent);text-decoration:none; }

        .sev-dot { width:7px;height:7px;border-radius:50%;flex-shrink:0; }
        .sev-dot.critical { background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,0.2); }
        .sev-dot.warning  { background:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.2); }

        /* Macro grid */
        .macro-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .macro-item { background:var(--bg-card);border:1px solid var(--border2);border-radius:8px;padding:11px; }
        .macro-item-label { font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:5px; }
        .macro-item-val   { font-size:16px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:2px; }
        .macro-item-delta { font-size:11px;font-weight:600; }
        .macro-item-delta.positive { color:#10b981; }
        .macro-item-delta.negative { color:#ef4444; }

        /* Health list */
        .health-list { display:flex;flex-direction:column; }
        .health-row {
          display:flex;align-items:center;gap:10px;
          padding:10px 16px;border-bottom:1px solid var(--border2);
          text-decoration:none;color:inherit;transition:background 0.1s;
        }
        .health-row:last-child { border-bottom:none; }
        .health-row:hover { background:var(--bg-card); }

        .health-score-ring {
          width:38px;height:38px;border-radius:50%;flex-shrink:0;
          border:2.5px solid;
          display:flex;align-items:center;justify-content:center;
          font-size:11px;font-weight:800;
          background:transparent;
        }
        .health-info { flex:1;min-width:0; }
        .health-name-row {
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:5px;
        }
        .health-name { font-size:12.5px;font-weight:600;color:var(--text-1); }
        .health-label {
          font-size:10px;font-weight:700;padding:2px 7px;border-radius:999px;
        }
        .health-bar-bg {
          height:3px;border-radius:3px;background:var(--bg-card2);overflow:hidden;
        }
        .health-bar-fill { height:100%;border-radius:3px;transition:width 0.4s; }
        .health-evol {
          font-size:11px;font-weight:600;min-width:44px;text-align:right;flex-shrink:0;
        }
        .health-evol.positive { color:#10b981; }
        .health-evol.negative { color:#ef4444; }
      `}</style>
    </div>
  );
}
