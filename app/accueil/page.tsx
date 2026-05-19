import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { JarvisClock } from "@/components/JarvisClock";
import { AccueilThemeToggle } from "@/components/AccueilThemeToggle";
import { AccueilAISection } from "@/components/AccueilAISection";

const PERIOD = "2026-05";
const PREV   = "2026-04";
export const dynamic = "force-dynamic";

function healthScore(
  ca: number | null, ct: number | null,
  tx: number | null, tt: number | null,
  pc: number | null,
): number {
  const s: number[] = [];
  if (ca !== null && ct !== null && ct > 0) s.push(Math.min(100, (ca / ct) * 100));
  if (tx !== null && tt !== null && tt > 0) s.push(Math.min(100, (tx / tt) * 100));
  if (ca !== null && pc !== null && pc > 0) s.push(Math.max(0, Math.min(100, 50 + ((ca - pc) / pc) * 500)));
  return s.length ? Math.round(s.reduce((a, b) => a + b, 0) / s.length) : 50;
}
const scoreColor = (s: number) => s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";
const scoreTag   = (s: number) => s >= 80 ? "Sain" : s >= 60 ? "Attention" : "Critique";

export default async function AccueilPage() {
  const [entities, current, prev] = await Promise.all([
    prisma.entity.findMany({ include: { division: true } }),
    prisma.kpiEntry.findMany({ where: { period: PERIOD } }),
    prisma.kpiEntry.findMany({ where: { period: PREV } }),
  ]);

  const valC = (eid: string, kid: string) => current.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const valP = (eid: string, kid: string) => prev.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const tgt  = (eid: string, kid: string) => current.find(e => e.entityId === eid && e.kpiDefId === kid)?.target ?? null;

  const totalCA    = current.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const totalMarge = current.filter(e => e.kpiDefId === "marge").reduce((s, e) => s + e.value, 0);
  const prevCA     = prev.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const caEvol     = prevCA ? ((totalCA - prevCA) / prevCA * 100) : 0;

  const alerts: { entity: string; slug: string; label: string; sev: "critical" | "warning" }[] = [];
  for (const e of entities) {
    const ca = valC(e.id, "ca"); const ct = tgt(e.id, "ca");
    const pc = valP(e.id, "ca"); const tx = valC(e.id, "taux-service");
    const tt = tgt(e.id, "taux-service");
    if (!ca) continue;
    if (ct && ca < ct * 0.80)    alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/ct*100)}% de l'objectif`, sev: "critical" });
    else if (ct && ca < ct * 0.93) alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/ct*100)}% de l'objectif`, sev: "warning" });
    if (pc && ca < pc * 0.92)    alerts.push({ entity: e.name, slug: e.slug, label: `CA −${Math.abs(Math.round((ca-pc)/pc*100))}% vs mois préc.`, sev: "critical" });
    if (tx && tt && tx < tt)     alerts.push({ entity: e.name, slug: e.slug, label: `Taux service ${tx.toFixed(1)}% (obj. ${tt.toFixed(1)}%)`, sev: "warning" });
  }
  const critCount = alerts.filter(a => a.sev === "critical").length;
  const warnCount = alerts.filter(a => a.sev === "warning").length;

  const healthData = entities.map(e => {
    const ca = valC(e.id, "ca"); const ct = tgt(e.id, "ca");
    const tx = valC(e.id, "taux-service"); const tt = tgt(e.id, "taux-service");
    const pc = valP(e.id, "ca");
    const score = healthScore(ca, ct, tx, tt, pc);
    const evol  = ca && pc ? ((ca - pc) / pc * 100) : 0;
    return { name: e.name, slug: e.slug, score, evol };
  }).sort((a, b) => b.score - a.score);

  const avgHealth = Math.round(healthData.reduce((s, e) => s + e.score, 0) / Math.max(healthData.length, 1));

  const priorities: { text: string; slug?: string; sev?: "critical" | "warning" }[] = [];
  alerts.filter(a => a.sev === "critical").slice(0, 2).forEach(a =>
    priorities.push({ text: `${a.entity} — ${a.label}`, slug: a.slug, sev: "critical" })
  );
  if (priorities.length < 3) {
    const worst = [...healthData].sort((a, b) => a.score - b.score)[0];
    if (worst && worst.score < 70 && !priorities.find(p => p.slug === worst.slug))
      priorities.push({ text: `Analyser ${worst.name} — score santé ${worst.score}/100`, slug: worst.slug, sev: "warning" });
  }
  if (priorities.length < 3) priorities.push({ text: "Comparer la performance vs Baromètre Industrie Maroc 2025" });
  if (priorities.length < 3) priorities.push({ text: "Arbitrer les investissements avec Moncef AI" });

  return (
    <div className="ac-root">

      {/* NAV */}
      <nav className="ac-nav">
        <div className="ac-nav-inner">
          <div className="ac-brand">
            <div className="ac-logo">
              <svg width="15" height="15" viewBox="0 0 32 32" fill="none">
                <path d="M8 24L16 8L24 24" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M11 19H21" stroke="white" strokeWidth="3" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="ac-brand-name">Dislog Hub</span>
            <span className="ac-brand-sep">/</span>
            <span className="ac-brand-page">Tableau de bord</span>
          </div>
          <div className="ac-nav-right">
            <div className="ac-status-pill">
              <span className="ac-status-dot"/>
              Moncef AI actif
            </div>
            <Link href="/war-room" className="ac-nav-btn">War Room →</Link>
            <AccueilThemeToggle/>
          </div>
        </div>
      </nav>

      <main className="ac-main">

        {/* HEADER */}
        <div className="ac-header">
          <JarvisClock/>
          <div className="ac-badges">
            {critCount > 0 && <span className="ac-badge-crit">{critCount} critique{critCount>1?"s":""}</span>}
            {warnCount > 0 && <span className="ac-badge-warn">{warnCount} alerte{warnCount>1?"s":""}</span>}
          </div>
        </div>

        {/* KPI STRIP */}
        <div className="ac-kpi-strip">
          {([
            { label: "CA Groupe",        value: `${(totalCA/1e6).toFixed(0)} M MAD`,   delta: `${caEvol>=0?"+":""}${caEvol.toFixed(1)}% vs mois préc.`,                                  ok: caEvol >= 0 },
            { label: "Marge brute",      value: `${(totalMarge/1e6).toFixed(0)} M MAD`, delta: `${totalCA?(totalMarge/totalCA*100).toFixed(1):"-"}% du CA`,                              ok: true },
            { label: "Filiales actives", value: String(entities.length),                delta: "Groupe Dislog Belkhyat",                                                                  ok: true },
            { label: "Score santé moy.", value: `${avgHealth}/100`,                     delta: `${healthData.filter(h=>h.score>=80).length} saines · ${healthData.filter(h=>h.score<60).length} critiques`, ok: healthData.filter(h=>h.score<60).length===0 },
          ] as const).map((k, i) => (
            <div key={i} className="ac-kpi-card">
              <div className="ac-kpi-label">{k.label}</div>
              <div className="ac-kpi-value">{k.value}</div>
              <div className={`ac-kpi-delta ${k.ok?"pos":"neg"}`}>{k.delta}</div>
            </div>
          ))}
        </div>

        {/* GRID */}
        <div className="ac-grid">

          {/* LEFT */}
          <div className="ac-col">

            {/* PRIORITIES */}
            <div className="ac-card">
              <div className="ac-card-head">
                <span className="ac-card-title">Priorités du matin</span>
                <span className="ac-pill-amber">Aujourd&apos;hui</span>
              </div>
              <div className="ac-priority-list">
                {priorities.slice(0, 3).map((p, i) =>
                  p.slug ? (
                    <Link key={i} href={`/entites/${p.slug}`} className="ac-priority-row link">
                      <span className="ac-priority-num">{i+1}</span>
                      {p.sev === "critical" && <span className="ac-dot-crit"/>}
                      {p.sev === "warning"  && <span className="ac-dot-warn"/>}
                      {!p.sev              && <span className="ac-dot-neutral"/>}
                      <span className="ac-priority-text">{p.text}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ac-chevron">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </Link>
                  ) : (
                    <div key={i} className="ac-priority-row">
                      <span className="ac-priority-num">{i+1}</span>
                      <span className="ac-dot-neutral"/>
                      <span className="ac-priority-text">{p.text}</span>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* ALERTS */}
            {alerts.length > 0 && (
              <div className="ac-card" style={{padding:0,overflow:"hidden"}}>
                <div className="ac-alert-head">
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span className="ac-dot-crit"/>
                    <span className="ac-card-title">Urgences décisionnelles</span>
                  </div>
                  <span className="ac-count-badge">{alerts.length}</span>
                </div>
                <div>
                  {alerts.slice(0, 6).map((a, i) => (
                    <Link key={i} href={`/entites/${a.slug}`} className="ac-alert-row">
                      <span className={a.sev==="critical"?"ac-dot-crit":"ac-dot-warn"}/>
                      <span className="ac-alert-entity">{a.entity}</span>
                      <span className="ac-alert-sep">—</span>
                      <span className="ac-alert-label">{a.label}</span>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ac-chevron">
                        <path d="M9 18l6-6-6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </Link>
                  ))}
                </div>
                <div className="ac-alert-foot">
                  <Link href="/war-room" className="ac-alert-foot-link">Voir tous les signaux dans le War Room →</Link>
                </div>
              </div>
            )}

            {/* BAROMETRE */}
            <div className="ac-card">
              <div className="ac-card-head">
                <span className="ac-card-title">Baromètre Industrie Maroc 2025</span>
                <span className="ac-pill-indigo">Officiel</span>
              </div>
              <div className="ac-macro-grid">
                {([
                  { label:"CA industrie national",   val:"898 Mrd DH",  delta:"+9,2%",            up:true  },
                  { label:"Investissements",          val:"89,7 Mrd DH", delta:"+30,2% — Record",  up:true  },
                  { label:"Emplois industriels",      val:"1 038 133",   delta:"+4,3%",            up:true  },
                  { label:"Automobile — CA sectoriel",val:"196 Mrd DH",  delta:"#1 pour la 1ère fois", up:true },
                  { label:"Capital marocain",         val:"70,2%",       delta:"Souveraineté stable", up:true },
                  { label:"Inflation IPC",            val:"6,6%",        delta:"Pression sur marges",  up:false},
                ] as const).map((m, i) => (
                  <div key={i} className="ac-macro-cell">
                    <div className="ac-macro-label">{m.label}</div>
                    <div className="ac-macro-val">{m.val}</div>
                    <div className={`ac-macro-delta ${m.up?"pos":"neg"}`}>{m.delta}</div>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT */}
          <div className="ac-col">

            {/* MONCEF AI — top of right col */}
            <AccueilAISection/>

            {/* HEALTH SCORES */}
            <div className="ac-card" style={{padding:0,overflow:"hidden"}}>
              <div className="ac-card-head" style={{padding:"14px 18px",borderBottom:"1px solid var(--border)",marginBottom:0}}>
                <span className="ac-card-title">Santé des filiales</span>
                <span className="ac-card-sub">{PERIOD}</span>
              </div>
              <div>
                {healthData.map((h) => {
                  const c = scoreColor(h.score);
                  return (
                    <Link key={h.slug} href={`/entites/${h.slug}`} className="ac-health-row">
                      <div className="ac-health-ring" style={{borderColor:c,color:c}}>{h.score}</div>
                      <div className="ac-health-body">
                        <div className="ac-health-name-row">
                          <span className="ac-health-name">{h.name}</span>
                          <span className="ac-health-tag" style={{color:c,background:`${c}18`}}>{scoreTag(h.score)}</span>
                        </div>
                        <div className="ac-health-track">
                          <div className="ac-health-fill" style={{width:`${h.score}%`,background:c}}/>
                        </div>
                      </div>
                      <span className={`ac-health-evol ${h.evol>=0?"pos":"neg"}`}>
                        {h.evol>=0?"+":""}{h.evol.toFixed(1)}%
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
        /* ─── Root ─── */
        .ac-root {
          min-height:100vh;
          background:var(--bg-deep);color:var(--text-1);
          font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;
          font-size:14px;
          -webkit-font-smoothing:antialiased;
        }

        /* ─── Nav ─── */
        .ac-nav {
          background:var(--bg-panel);border-bottom:1px solid var(--border);
          position:sticky;top:0;z-index:100;
        }
        .ac-nav-inner {
          max-width:1160px;margin:0 auto;padding:0 28px;height:52px;
          display:flex;align-items:center;justify-content:space-between;
        }
        .ac-brand        { display:flex;align-items:center;gap:10px; }
        .ac-logo {
          width:28px;height:28px;border-radius:7px;flex-shrink:0;
          background:linear-gradient(135deg,#10b981,#059669);
          display:flex;align-items:center;justify-content:center;
        }
        .ac-brand-name { font-size:13px;font-weight:700;letter-spacing:-.01em;color:var(--text-1); }
        .ac-brand-sep  { font-size:13px;color:var(--text-4);margin:0 1px; }
        .ac-brand-page { font-size:13px;color:var(--text-3);font-weight:400; }
        .ac-nav-right  { display:flex;align-items:center;gap:8px; }

        .ac-status-pill {
          display:flex;align-items:center;gap:6px;padding:4px 12px;border-radius:999px;
          background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.2);
          font-size:12px;font-weight:600;color:#10b981;letter-spacing:-.01em;
        }
        .ac-status-dot {
          width:6px;height:6px;border-radius:50%;background:#10b981;flex-shrink:0;
          box-shadow:0 0 5px rgba(16,185,129,0.5);
          animation:ac-blink 2s ease-in-out infinite;
        }
        @keyframes ac-blink{0%,100%{opacity:1}50%{opacity:.35}}

        .ac-nav-btn {
          padding:5px 13px;border-radius:6px;font-size:12px;font-weight:600;
          background:var(--bg-card);border:1px solid var(--border);
          color:var(--text-2);text-decoration:none;
          transition:border-color 0.12s,color 0.12s;
          letter-spacing:-.01em;
        }
        .ac-nav-btn:hover { color:var(--text-1);border-color:var(--accent); }

        /* ─── Main ─── */
        .ac-main { max-width:1160px;margin:0 auto;padding:32px 28px 80px; }

        /* ─── Header ─── */
        .ac-header {
          display:flex;align-items:flex-end;justify-content:space-between;
          margin-bottom:24px;flex-wrap:wrap;gap:10px;
        }
        .ac-badges { display:flex;gap:7px;align-items:center; }
        .ac-badge-crit {
          padding:3px 11px;border-radius:999px;font-size:11.5px;font-weight:700;
          background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.22);color:#ef4444;
          letter-spacing:-.01em;
        }
        .ac-badge-warn {
          padding:3px 11px;border-radius:999px;font-size:11.5px;font-weight:600;
          background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.22);color:#f59e0b;
          letter-spacing:-.01em;
        }

        /* ─── KPI Strip ─── */
        .ac-kpi-strip {
          display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px;
        }
        @media(max-width:820px){.ac-kpi-strip{grid-template-columns:repeat(2,1fr);}}
        .ac-kpi-card {
          background:var(--bg-panel);border:1px solid var(--border);border-radius:10px;
          padding:16px 18px;box-shadow:var(--shadow-card);transition:box-shadow 0.15s,border-color 0.15s;
        }
        .ac-kpi-card:hover{box-shadow:var(--shadow-md);border-color:var(--accent);}
        .ac-kpi-label {
          font-size:10.5px;font-weight:600;text-transform:uppercase;
          letter-spacing:.07em;color:var(--text-3);margin-bottom:8px;
        }
        .ac-kpi-value {
          font-size:24px;font-weight:800;color:var(--text-1);
          letter-spacing:-.03em;margin-bottom:4px;
          font-variant-numeric:tabular-nums;line-height:1.1;
        }
        .ac-kpi-delta{font-size:12px;font-weight:500;}
        .ac-kpi-delta.pos{color:#10b981;}
        .ac-kpi-delta.neg{color:#ef4444;}

        /* ─── Grid ─── */
        .ac-grid{
          display:grid;grid-template-columns:1fr 380px;gap:16px;align-items:start;
        }
        @media(max-width:940px){.ac-grid{grid-template-columns:1fr;}}
        .ac-col{display:flex;flex-direction:column;gap:16px;}

        /* ─── Generic card ─── */
        .ac-card {
          background:var(--bg-panel);border:1px solid var(--border);
          border-radius:10px;padding:18px;box-shadow:var(--shadow-card);
        }
        .ac-card-head {
          display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;
        }
        .ac-card-title { font-size:13px;font-weight:700;color:var(--text-1);letter-spacing:-.01em; }
        .ac-card-sub   { font-size:11.5px;color:var(--text-3);font-weight:500; }

        /* Pills */
        .ac-pill-amber {
          font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;
          background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);color:#f59e0b;
          letter-spacing:.02em;
        }
        .ac-pill-indigo {
          font-size:10.5px;font-weight:700;padding:2px 9px;border-radius:999px;
          background:rgba(99,91,255,0.07);border:1px solid rgba(99,91,255,0.18);color:#635bff;
          letter-spacing:.02em;
        }

        /* Dots */
        .ac-dot-crit    { display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;background:#ef4444;box-shadow:0 0 0 2px rgba(239,68,68,0.18); }
        .ac-dot-warn    { display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;background:#f59e0b;box-shadow:0 0 0 2px rgba(245,158,11,0.18); }
        .ac-dot-neutral { display:inline-block;width:7px;height:7px;border-radius:50%;flex-shrink:0;background:var(--text-4); }
        .ac-chevron     { color:var(--text-4);flex-shrink:0; }

        /* ─── Priorities ─── */
        .ac-priority-list{display:flex;flex-direction:column;}
        .ac-priority-row {
          display:flex;align-items:center;gap:10px;
          padding:11px 2px;border-bottom:1px solid var(--border2);
          color:inherit;transition:background 0.1s;border-radius:6px;
        }
        .ac-priority-row:last-child{border-bottom:none;}
        .ac-priority-row.link{text-decoration:none;}
        .ac-priority-row.link:hover{background:var(--bg-card);}
        .ac-priority-num {
          width:20px;height:20px;border-radius:50%;flex-shrink:0;
          background:var(--bg-card2);border:1px solid var(--border);
          display:flex;align-items:center;justify-content:center;
          font-size:10.5px;font-weight:700;color:var(--text-3);
        }
        .ac-priority-text{font-size:13px;color:var(--text-2);flex:1;line-height:1.4;}

        /* ─── Alerts ─── */
        .ac-alert-head {
          display:flex;align-items:center;justify-content:space-between;
          padding:14px 18px;border-bottom:1px solid var(--border);
        }
        .ac-count-badge {
          font-size:11px;font-weight:700;padding:2px 8px;border-radius:999px;
          background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.18);color:#ef4444;
        }
        .ac-alert-row {
          display:flex;align-items:center;gap:8px;padding:10px 18px;
          text-decoration:none;color:inherit;border-bottom:1px solid var(--border2);
          transition:background 0.1s;
        }
        .ac-alert-row:last-child{border-bottom:none;}
        .ac-alert-row:hover{background:var(--bg-card);}
        .ac-alert-entity{font-size:12.5px;font-weight:600;color:var(--text-1);white-space:nowrap;}
        .ac-alert-sep   {font-size:12px;color:var(--text-4);margin:0 1px;}
        .ac-alert-label {font-size:12.5px;color:var(--text-3);flex:1;}
        .ac-alert-foot  {padding:10px 18px;border-top:1px solid var(--border);background:var(--bg-card2);}
        .ac-alert-foot-link{font-size:12px;font-weight:600;color:var(--accent);text-decoration:none;}
        .ac-alert-foot-link:hover{text-decoration:underline;}

        /* ─── Macro ─── */
        .ac-macro-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .ac-macro-cell{background:var(--bg-card);border:1px solid var(--border2);border-radius:8px;padding:12px;}
        .ac-macro-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.07em;color:var(--text-3);margin-bottom:5px;}
        .ac-macro-val  {font-size:17px;font-weight:800;color:var(--text-1);letter-spacing:-.02em;margin-bottom:2px;font-variant-numeric:tabular-nums;}
        .ac-macro-delta{font-size:11px;font-weight:500;}
        .ac-macro-delta.pos{color:#10b981;}
        .ac-macro-delta.neg{color:#ef4444;}

        /* ─── Health ─── */
        .ac-health-row {
          display:flex;align-items:center;gap:12px;
          padding:10px 16px;border-bottom:1px solid var(--border2);
          text-decoration:none;color:inherit;transition:background 0.1s;
        }
        .ac-health-row:last-child{border-bottom:none;}
        .ac-health-row:hover{background:var(--bg-card);}
        .ac-health-ring {
          width:36px;height:36px;border-radius:50%;border:2.5px solid;flex-shrink:0;
          display:flex;align-items:center;justify-content:center;
          font-size:10.5px;font-weight:800;font-variant-numeric:tabular-nums;
        }
        .ac-health-body{flex:1;min-width:0;}
        .ac-health-name-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:5px;}
        .ac-health-name{font-size:12.5px;font-weight:600;color:var(--text-1);}
        .ac-health-tag {
          font-size:10px;font-weight:700;padding:1px 7px;border-radius:999px;
          letter-spacing:.02em;
        }
        .ac-health-track{height:3px;border-radius:3px;background:var(--bg-card2);overflow:hidden;}
        .ac-health-fill {height:100%;border-radius:3px;transition:width 0.4s;}
        .ac-health-evol{font-size:11px;font-weight:600;min-width:44px;text-align:right;flex-shrink:0;}
        .ac-health-evol.pos{color:#10b981;}
        .ac-health-evol.neg{color:#ef4444;}
      `}</style>
    </div>
  );
}
