import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { JarvisClock } from "@/components/JarvisClock";
import { AccueilThemeToggle } from "@/components/AccueilThemeToggle";

const PERIOD = "2026-05";
const PREV   = "2026-04";
export const dynamic = "force-dynamic";

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

  const totalCA    = current.filter(e => e.kpiDefId === "ca").reduce((s,e) => s + e.value, 0);
  const totalMarge = current.filter(e => e.kpiDefId === "marge").reduce((s,e) => s + e.value, 0);
  const prevCA     = prev.filter(e => e.kpiDefId === "ca").reduce((s,e) => s + e.value, 0);
  const caEvol     = prevCA ? ((totalCA - prevCA) / prevCA * 100) : 0;

  const alerts: { entity: string; slug: string; label: string; sev: "critical"|"warning" }[] = [];
  for (const e of entities) {
    const ca = valC(e.id, "ca");
    const ct = tgt(e.id, "ca");
    const pc = valP(e.id, "ca");
    const tx = valC(e.id, "taux-service");
    const tt = tgt(e.id, "taux-service");
    if (!ca) continue;
    if (ct && ca < ct * 0.80)  alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/ct*100)}% de l'objectif`, sev: "critical" });
    else if (ct && ca < ct * 0.93) alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/ct*100)}% de l'objectif`, sev: "warning" });
    if (pc && ca < pc * 0.92)  alerts.push({ entity: e.name, slug: e.slug, label: `CA −${Math.abs(Math.round((ca-pc)/pc*100))}% vs mois préc.`, sev: "critical" });
    if (tx && tt && tx < tt)   alerts.push({ entity: e.name, slug: e.slug, label: `Taux service ${tx.toFixed(1)}% (obj. ${tt.toFixed(1)}%)`, sev: "warning" });
  }

  const critCount  = alerts.filter(a => a.sev === "critical").length;
  const warnCount  = alerts.filter(a => a.sev === "warning").length;
  const topAlert   = alerts.find(a => a.sev === "critical") ?? alerts[0];

  const performers = entities.map(e => {
    const ca = valC(e.id, "ca") ?? 0;
    const ct = tgt(e.id, "ca") ?? 0;
    const pc = valP(e.id, "ca");
    const evol = pc ? ((ca - pc) / pc * 100) : 0;
    const pct  = ct ? ca / ct * 100 : 0;
    return { name: e.name, slug: e.slug, ca, pct, evol };
  }).sort((a,b) => b.pct - a.pct);

  return (
    <div className="accueil-root">
      {/* ── TOP NAV ── */}
      <nav className="accueil-nav">
        <div className="accueil-nav-inner">
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="brand-logo">
              <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
                <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="brand-name">Dislog Hub</span>
            <span className="brand-sep">/</span>
            <span className="brand-sub">Tableau de bord</span>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div className="status-pill">
              <span className="status-dot"/>
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
            {critCount > 0 && (
              <div className="badge-critical">{critCount} critique{critCount>1?"s":""}</div>
            )}
            {warnCount > 0 && (
              <div className="badge-warning">{warnCount} alerte{warnCount>1?"s":""}</div>
            )}
          </div>
        </div>

        {/* ── KPI STRIP ── */}
        <div className="kpi-strip">
          {[
            { label:"CA Groupe", value:`${(totalCA/1e6).toFixed(0)} M MAD`,
              delta:`${caEvol>=0?"+":""}${caEvol.toFixed(1)}% vs mois préc.`,
              positive: caEvol >= 0 },
            { label:"Marge brute", value:`${(totalMarge/1e6).toFixed(0)} M MAD`,
              delta:`${totalCA?(totalMarge/totalCA*100).toFixed(1):"-"}% du CA`,
              positive: true },
            { label:"Filiales actives", value:"10",
              delta:"Groupe Dislog Belkhyat", positive: true },
            { label:"Urgences", value:String(critCount + warnCount),
              delta:`${critCount} critique${critCount>1?"s":""} · ${warnCount} alerte${warnCount>1?"s":""}`,
              positive: critCount === 0 },
          ].map((k,i) => (
            <div key={i} className="kpi-card">
              <div className="kpi-label">{k.label}</div>
              <div className="kpi-value">{k.value}</div>
              <div className={`kpi-delta ${k.positive?"positive":"negative"}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        <div className="accueil-grid">
          {/* LEFT COL */}
          <div className="accueil-left">

            {/* ALERT CARD */}
            {topAlert && (
              <div className="alert-card">
                <div className="alert-card-header">
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span className={`sev-dot ${topAlert.sev}`}/>
                    <span className="alert-card-title">Urgences décisionnelles</span>
                  </div>
                  <span className="alert-count-badge">{alerts.length}</span>
                </div>
                <div className="alert-list">
                  {alerts.slice(0,5).map((a,i) => (
                    <Link key={i} href={`/entites/${a.slug}`} className="alert-row">
                      <span className={`sev-dot ${a.sev}`}/>
                      <div style={{ flex:1 }}>
                        <span className="alert-entity">{a.entity}</span>
                        <span className="alert-label"> — {a.label}</span>
                      </div>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="alert-arrow">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </Link>
                  ))}
                </div>
                <div className="alert-card-footer">
                  <Link href="/war-room" className="alert-footer-link">Voir tous les signaux dans le War Room →</Link>
                </div>
              </div>
            )}

            {/* BAROMETRE CARD */}
            <div className="stripe-card">
              <div className="card-header">
                <span className="card-title">Baromètre Industrie Maroc 2025</span>
                <span className="card-badge indigo">Officiel</span>
              </div>
              <div className="macro-grid">
                {[
                  { label:"CA Industrie national", val:"898 Mrd DH", delta:"+9,2%", up:true },
                  { label:"Investissements", val:"89,7 Mrd DH", delta:"+30,2% 🔥 Record", up:true },
                  { label:"Emplois industriels", val:"1 038 133", delta:"+4,3%", up:true },
                  { label:"Capital marocain", val:"70,2%", delta:"Souveraineté stable", up:true },
                  { label:"Auto — CA sectoriel", val:"196 Mrd DH", delta:"#1 pour la 1ère fois", up:true },
                  { label:"Inflation IPC (déc.2022)", val:"6,6%", delta:"↑ Pression marges", up:false },
                ].map((m,i) => (
                  <div key={i} className="macro-item">
                    <div className="macro-item-label">{m.label}</div>
                    <div className="macro-item-val">{m.val}</div>
                    <div className={`macro-item-delta ${m.up?"positive":"negative"}`}>{m.delta}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COL */}
          <div className="accueil-right">

            {/* MONCEF AI */}
            <div className="stripe-card">
              <div className="card-header">
                <span className="card-title">Moncef AI</span>
                <span className="card-badge green">En ligne</span>
              </div>
              <p className="card-desc">
                Connecté à vos données groupe + Baromètre 2025 + Macro DEPF.
                Posez n&apos;importe quelle question.
              </p>
              <div className="ai-questions">
                {[
                  { icon:"⚡", label:"Mes décisions urgentes du jour" },
                  { icon:"📈", label:"Où investir en priorité ?" },
                  { icon:"🏭", label:"Quelle filiale arbitrer ce mois ?" },
                  { icon:"🌍", label:"Compétitivité Maroc vs région MENA" },
                  { icon:"📊", label:"Benchmark vs secteur national" },
                  { icon:"🛡", label:"Risques macro à surveiller" },
                ].map((q,i) => (
                  <Link key={i} href={`/war-room`} className="ai-question-chip">
                    <span>{q.icon}</span>
                    <span>{q.label}</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ marginLeft:"auto", opacity:0.4 }}>
                      <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </Link>
                ))}
              </div>
            </div>

            {/* PERFORMANCES */}
            <div className="stripe-card">
              <div className="card-header">
                <span className="card-title">Performance filiales</span>
                <span className="card-subtitle">Mai 2026</span>
              </div>
              <div className="perf-list">
                {performers.slice(0,6).map((p,i) => {
                  const color = p.pct >= 100 ? "#10b981" : p.pct >= 90 ? "#f59e0b" : "#ef4444";
                  const icon  = p.pct >= 100 ? "🟢" : p.pct >= 90 ? "🟡" : "🔴";
                  return (
                    <Link key={p.slug} href={`/entites/${p.slug}`} className="perf-row">
                      <span style={{ fontSize:14 }}>{icon}</span>
                      <span className="perf-name">{p.name}</span>
                      <div className="perf-bar-wrap">
                        <div className="perf-bar-bg">
                          <div className="perf-bar-fill" style={{ width:`${Math.min(p.pct,100)}%`, background:color }}/>
                        </div>
                        <span className="perf-pct" style={{ color }}>{p.pct.toFixed(0)}%</span>
                      </div>
                      <span className={`perf-evol ${p.evol>=0?"positive":"negative"}`}>
                        {p.evol>=0?"+":""}{p.evol.toFixed(1)}%
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </main>

      <style>{`
        /* ─── Root & theme ─── */
        .accueil-root {
          min-height:100vh;
          background:var(--bg-deep);
          color:var(--text-1);
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Inter',sans-serif;
          transition:background 0.2s,color 0.2s;
        }

        /* ─── Nav ─── */
        .accueil-nav {
          background:var(--bg-panel);
          border-bottom:1px solid var(--border);
          position:sticky;top:0;z-index:50;
        }
        .accueil-nav-inner {
          max-width:1100px;margin:0 auto;
          display:flex;align-items:center;justify-content:space-between;
          padding:0 24px;height:56px;
        }
        .brand-logo {
          width:30px;height:30px;border-radius:8px;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
          flex-shrink:0;
        }
        .brand-name { font-weight:700;font-size:14px;color:var(--text-1); }
        .brand-sep  { color:var(--text-4);font-size:14px;margin:0 2px; }
        .brand-sub  { font-size:13px;color:var(--text-3); }

        .status-pill {
          display:flex;align-items:center;gap:6px;
          padding:5px 12px;border-radius:999px;
          background:rgba(16,185,129,0.08);
          border:1px solid rgba(16,185,129,0.2);
          font-size:12px;font-weight:600;color:#10b981;
        }
        .status-dot {
          width:6px;height:6px;border-radius:50%;
          background:#10b981;
          box-shadow:0 0 6px rgba(16,185,129,0.6);
          animation:blink 2s ease-in-out infinite;
        }
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.4}}

        .nav-link-btn {
          padding:6px 14px;border-radius:6px;font-size:13px;font-weight:600;
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-2);text-decoration:none;
          transition:all 0.15s;
        }
        .nav-link-btn:hover { color:var(--text-1);border-color:var(--accent); }

        /* ─── Main ─── */
        .accueil-main {
          max-width:1100px;margin:0 auto;
          padding:32px 24px 60px;
        }

        /* ─── Header ─── */
        .accueil-header {
          display:flex;align-items:flex-end;justify-content:space-between;
          margin-bottom:28px;flex-wrap:wrap;gap:12px;
        }
        .header-badges { display:flex;gap:8px;align-items:center; }
        .badge-critical {
          padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700;
          background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.25);
          color:#ef4444;
        }
        .badge-warning {
          padding:4px 12px;border-radius:999px;font-size:12px;font-weight:600;
          background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.25);
          color:#f59e0b;
        }

        /* ─── KPI Strip ─── */
        .kpi-strip {
          display:grid;grid-template-columns:repeat(4,1fr);gap:16px;
          margin-bottom:24px;
        }
        @media(max-width:800px){.kpi-strip{grid-template-columns:repeat(2,1fr);}}
        .kpi-card {
          background:var(--bg-panel);
          border:1px solid var(--border);
          border-radius:10px;padding:18px 20px;
          box-shadow:var(--shadow-card);
          transition:box-shadow 0.15s,border-color 0.15s;
        }
        .kpi-card:hover { box-shadow:var(--shadow-md);border-color:var(--accent); }
        .kpi-label { font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:8px; }
        .kpi-value { font-size:22px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:4px;font-variant-numeric:tabular-nums; }
        .kpi-delta { font-size:12px;font-weight:600; }
        .kpi-delta.positive { color:#10b981; }
        .kpi-delta.negative { color:#ef4444; }

        /* ─── Grid ─── */
        .accueil-grid {
          display:grid;grid-template-columns:1fr 380px;gap:20px;
          align-items:start;
        }
        @media(max-width:900px){.accueil-grid{grid-template-columns:1fr;}}
        .accueil-left,.accueil-right { display:flex;flex-direction:column;gap:20px; }

        /* ─── Cards ─── */
        .stripe-card {
          background:var(--bg-panel);
          border:1px solid var(--border);
          border-radius:10px;padding:20px;
          box-shadow:var(--shadow-card);
        }
        .card-header {
          display:flex;align-items:center;justify-content:space-between;
          margin-bottom:16px;
        }
        .card-title { font-size:14px;font-weight:700;color:var(--text-1); }
        .card-subtitle { font-size:12px;color:var(--text-3); }
        .card-desc { font-size:13px;color:var(--text-3);margin:0 0 16px;line-height:1.5; }
        .card-badge {
          font-size:11px;font-weight:700;padding:3px 9px;border-radius:999px;
        }
        .card-badge.green {
          background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);color:#10b981;
        }
        .card-badge.indigo {
          background:rgba(99,91,255,0.08);border:1px solid rgba(99,91,255,0.2);color:#635bff;
        }

        /* ─── Alert card ─── */
        .alert-card {
          background:var(--bg-panel);border:1px solid var(--border);
          border-radius:10px;overflow:hidden;box-shadow:var(--shadow-card);
        }
        .alert-card-header {
          display:flex;align-items:center;justify-content:space-between;
          padding:16px 20px;border-bottom:1px solid var(--border);
        }
        .alert-card-title { font-size:14px;font-weight:700;color:var(--text-1); }
        .alert-count-badge {
          font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;
          background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.2);color:#ef4444;
        }
        .alert-list { padding:4px 0; }
        .alert-row {
          display:flex;align-items:center;gap:10px;
          padding:11px 20px;text-decoration:none;
          border-bottom:1px solid var(--border2);
          transition:background 0.1s;
          color:inherit;
        }
        .alert-row:last-child { border-bottom:none; }
        .alert-row:hover { background:var(--bg-card); }
        .alert-entity { font-size:13px;font-weight:600;color:var(--text-1); }
        .alert-label  { font-size:13px;color:var(--text-3); }
        .alert-arrow  { color:var(--text-4);flex-shrink:0; }
        .alert-card-footer {
          padding:12px 20px;border-top:1px solid var(--border);
          background:var(--bg-card2);
        }
        .alert-footer-link {
          font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;
        }

        .sev-dot {
          width:7px;height:7px;border-radius:50%;flex-shrink:0;
        }
        .sev-dot.critical { background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,0.2); }
        .sev-dot.warning  { background:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.2); }

        /* ─── Macro grid ─── */
        .macro-grid {
          display:grid;grid-template-columns:1fr 1fr;gap:12px;
        }
        .macro-item {
          background:var(--bg-card);border:1px solid var(--border2);
          border-radius:8px;padding:12px;
        }
        .macro-item-label { font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-3);margin-bottom:6px; }
        .macro-item-val   { font-size:17px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:2px; }
        .macro-item-delta { font-size:11px;font-weight:600; }
        .macro-item-delta.positive { color:#10b981; }
        .macro-item-delta.negative { color:#ef4444; }

        /* ─── AI questions ─── */
        .ai-questions { display:flex;flex-direction:column;gap:6px; }
        .ai-question-chip {
          display:flex;align-items:center;gap:10px;
          padding:10px 12px;border-radius:8px;
          background:var(--bg-card);border:1px solid var(--border2);
          font-size:13px;color:var(--text-2);text-decoration:none;
          transition:all 0.15s;
        }
        .ai-question-chip:hover {
          background:var(--bg-card2);border-color:var(--border);color:var(--text-1);
        }

        /* ─── Perf list ─── */
        .perf-list { display:flex;flex-direction:column;gap:8px; }
        .perf-row {
          display:flex;align-items:center;gap:10px;
          padding:8px 10px;border-radius:8px;
          text-decoration:none;color:inherit;
          transition:background 0.1s;
        }
        .perf-row:hover { background:var(--bg-card); }
        .perf-name { font-size:13px;font-weight:500;color:var(--text-2);flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
        .perf-bar-wrap { display:flex;align-items:center;gap:8px; }
        .perf-bar-bg {
          width:80px;height:4px;border-radius:4px;
          background:var(--bg-card2);overflow:hidden;
        }
        .perf-bar-fill { height:100%;border-radius:4px;transition:width 0.3s; }
        .perf-pct { font-size:12px;font-weight:700;min-width:34px;text-align:right; }
        .perf-evol { font-size:11px;font-weight:600;min-width:44px;text-align:right; }
        .perf-evol.positive { color:#10b981; }
        .perf-evol.negative { color:#ef4444; }
      `}</style>
    </div>
  );
}
