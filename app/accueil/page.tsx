import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { JarvisClock } from "@/components/JarvisClock";

const PERIOD = "2026-05";
const PREV   = "2026-04";

export const dynamic = "force-dynamic";

export default async function AccueilPage() {
  const [entities, current, prev] = await Promise.all([
    prisma.entity.findMany({ include: { division: true } }),
    prisma.kpiEntry.findMany({ where: { period: PERIOD }, include: { kpiDef: true } }),
    prisma.kpiEntry.findMany({ where: { period: PREV } }),
  ]);

  const val = (eid: string, kid: string, src: typeof prev = prev) =>
    src.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const valC = (eid: string, kid: string) =>
    current.find(e => e.entityId === eid && e.kpiDefId === kid)?.value ?? null;
  const tgt = (eid: string, kid: string) =>
    current.find(e => e.entityId === eid && e.kpiDefId === kid)?.target ?? null;

  // Group totals
  const totalCA    = current.filter(e => e.kpiDefId === "ca").reduce((s,e) => s + e.value, 0);
  const totalMarge = current.filter(e => e.kpiDefId === "marge").reduce((s,e) => s + e.value, 0);
  const prevTotalCA = prev.filter(e => e.kpiDefId === "ca").reduce((s,e) => s + e.value, 0);
  const caEvol = prevTotalCA ? ((totalCA - prevTotalCA) / prevTotalCA * 100) : 0;

  // Build alerts
  const alerts: { entity: string; slug: string; label: string; severity: "critical"|"warning" }[] = [];
  for (const e of entities) {
    const ca = valC(e.id, "ca");
    const caTarget = tgt(e.id, "ca");
    const prevCA = val(e.id, "ca");
    const taux = valC(e.id, "taux-service");
    const tauxT = tgt(e.id, "taux-service");
    if (!ca) continue;
    if (caTarget && ca < caTarget * 0.80) {
      alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/caTarget*100)}% de l'objectif`, severity: "critical" });
    } else if (caTarget && ca < caTarget * 0.93) {
      alerts.push({ entity: e.name, slug: e.slug, label: `CA à ${Math.round(ca/caTarget*100)}% de l'objectif`, severity: "warning" });
    }
    if (prevCA && ca < prevCA * 0.92) {
      alerts.push({ entity: e.name, slug: e.slug, label: `CA en baisse de ${Math.abs(Math.round((ca-prevCA)/prevCA*100))}% vs mois précédent`, severity: "critical" });
    }
    if (taux && tauxT && taux < tauxT) {
      alerts.push({ entity: e.name, slug: e.slug, label: `Taux de service dégradé (${taux.toFixed(1)}%)`, severity: "warning" });
    }
  }

  // Top critical alert (for hero card)
  const topAlert = alerts.filter(a => a.severity === "critical")[0] ?? alerts[0];
  const critCount = alerts.filter(a => a.severity === "critical").length;
  const warnCount = alerts.filter(a => a.severity === "warning").length;

  // Best performer
  const performers = entities.map(e => {
    const ca = valC(e.id, "ca") ?? 0;
    const caT = tgt(e.id, "ca") ?? 0;
    return { name: e.name, slug: e.slug, pct: caT ? ca/caT*100 : 0 };
  }).sort((a,b) => b.pct - a.pct);
  const S = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(160deg, #020810 0%, #040d1a 50%, #071428 100%)",
      fontFamily: "-apple-system, BlinkMacSystemFont,'Segoe UI','Inter',sans-serif",
      color: "#e2e8f0",
      position: "relative" as const,
      overflow: "auto" as const,
    } as React.CSSProperties,
    grid: {
      position: "absolute" as const, inset: 0, pointerEvents: "none" as const,
      backgroundImage: `linear-gradient(rgba(16,185,129,0.03) 1px, transparent 1px),linear-gradient(90deg, rgba(16,185,129,0.03) 1px, transparent 1px)`,
      backgroundSize: "48px 48px",
    } as React.CSSProperties,
    inner: { position: "relative" as const, zIndex: 1, maxWidth: 900, margin: "0 auto", padding: "28px 24px 48px" } as React.CSSProperties,
  };

  return (
    <div style={S.page}>
      <div style={S.grid} />
      <div style={S.inner}>

        {/* ── HEADER ── */}
        <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom: 32, flexWrap:"wrap", gap:16 }}>
          <JarvisClock />
          <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
            <div style={{
              display:"flex", alignItems:"center", gap:8, padding:"8px 16px",
              background:"rgba(16,185,129,0.1)", border:"1px solid rgba(16,185,129,0.3)",
              borderRadius:999, fontSize:12, color:"#10b981", fontWeight:600,
            }}>
              <span style={{ width:7,height:7,borderRadius:"50%",background:"#10b981",boxShadow:"0 0 8px #10b981",display:"inline-block" }}/>
              Moncef AI actif
            </div>
            <Link href="/war-room" style={{
              display:"flex", alignItems:"center", gap:6, padding:"8px 16px",
              background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)",
              borderRadius:999, fontSize:12, color:"rgba(148,163,184,0.8)", textDecoration:"none",
              fontWeight:600,
            }}>
              🗺 War Room
            </Link>
          </div>
        </div>

        {/* ── TABS ── */}
        <div style={{ display:"flex", gap:8, marginBottom:28 }}>
          {[
            { label:"☀️  Briefing du groupe", active:true },
            { label:`⚡ Urgences${critCount > 0 ? ` (${critCount})` : ""}`, active:false, href:"/war-room" },
          ].map((tab,i) => (
            tab.href
              ? <Link key={i} href={tab.href} style={{
                  padding:"10px 20px", borderRadius:999, fontSize:13, fontWeight:600,
                  background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)",
                  color:"rgba(148,163,184,0.7)", textDecoration:"none",
                }}>
                  {tab.label}
                </Link>
              : <button key={i} style={{
                  padding:"10px 20px", borderRadius:999, fontSize:13, fontWeight:600,
                  background: tab.active ? "linear-gradient(135deg,rgba(16,185,129,0.2),rgba(16,185,129,0.08))" : "rgba(255,255,255,0.04)",
                  border: tab.active ? "1px solid rgba(16,185,129,0.4)" : "1px solid rgba(255,255,255,0.08)",
                  color: tab.active ? "#10b981" : "rgba(148,163,184,0.7)",
                  cursor:"pointer",
                }}>
                  {tab.label}
                </button>
          ))}
        </div>

        {/* ── HERO ALERT CARD ── */}
        {topAlert && (
          <div style={{
            background:"rgba(8,14,26,0.7)", border:"1px solid rgba(239,68,68,0.3)",
            borderRadius:16, padding:"24px", marginBottom:20,
            backdropFilter:"blur(12px)",
            boxShadow:"0 0 40px rgba(239,68,68,0.06)",
          }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                <span style={{ fontSize:18 }}>⚠️</span>
                <div>
                  <span style={{ fontSize:15, fontWeight:700, color:"#fbbf24" }}>
                    {topAlert.entity} · Décision urgente requise
                  </span>
                </div>
              </div>
              <div style={{
                padding:"6px 14px", borderRadius:8, fontSize:11, fontWeight:800,
                background:"rgba(239,68,68,0.15)", border:"1px solid rgba(239,68,68,0.3)",
                color:"#ef4444", letterSpacing:"0.06em",
              }}>
                ⚡ CRITIQUE
              </div>
            </div>

            {/* 3 metrics */}
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
              {[
                { label:"ALERTE", value: topAlert.label, color:"#ef4444" },
                { label:"FILIALES EN ROUGE", value: `${critCount} filiale${critCount>1?"s":""}`, color:"#ef4444" },
                { label:"FILIALES EN ALERTE", value: `${warnCount} filiale${warnCount>1?"s":""}`, color:"#f59e0b" },
              ].map((m,i) => (
                <div key={i}>
                  <div style={{ fontSize:10, fontWeight:700, color:"rgba(148,163,184,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:6 }}>{m.label}</div>
                  <div style={{ fontSize:16, fontWeight:800, color:m.color }}>{m.value}</div>
                </div>
              ))}
            </div>

            {/* Alert list */}
            <div style={{ marginBottom:20 }}>
              {alerts.slice(0,3).map((a,i) => (
                <div key={i} style={{
                  display:"flex", alignItems:"center", gap:8, padding:"8px 0",
                  borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none",
                }}>
                  <span style={{
                    width:6, height:6, borderRadius:"50%", flexShrink:0,
                    background: a.severity==="critical" ? "#ef4444" : "#f59e0b",
                    boxShadow: `0 0 6px ${a.severity==="critical" ? "#ef4444" : "#f59e0b"}`,
                  }}/>
                  <span style={{ fontSize:13, color:"rgba(148,163,184,0.8)" }}>
                    <strong style={{ color:"#e2e8f0" }}>{a.entity}</strong> — {a.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div style={{ display:"flex", gap:12 }}>
              <Link href={`/entites/${topAlert.slug}`} style={{
                flex:1, padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:700,
                background:"linear-gradient(135deg,#b45309,#92400e)", border:"none",
                color:"#fde68a", textDecoration:"none", textAlign:"center" as const,
                cursor:"pointer",
              }}>
                📋 Analyse détaillée
              </Link>
              <Link href="/war-room" style={{
                flex:1, padding:"11px 20px", borderRadius:10, fontSize:13, fontWeight:600,
                background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)",
                color:"rgba(148,163,184,0.8)", textDecoration:"none", textAlign:"center" as const,
                cursor:"pointer",
              }}>
                🗺 Vue consolidée
              </Link>
            </div>
          </div>
        )}

        {/* ── STATS ROW ── */}
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16, marginBottom:20 }}>
          {[
            {
              label:"CA GROUPE",
              value: `${(totalCA/1e6).toFixed(0)}M MAD`,
              sub: `${caEvol >= 0 ? "+" : ""}${caEvol.toFixed(1)}% vs mois préc.`,
              color: caEvol >= 0 ? "#10b981" : "#ef4444",
              icon:"📈",
            },
            {
              label:"MARGE BRUTE",
              value: `${(totalMarge/1e6).toFixed(0)}M MAD`,
              sub: `${totalCA ? (totalMarge/totalCA*100).toFixed(1) : "-"}% du CA`,
              color:"#818cf8",
              icon:"💹",
            },
            {
              label:"URGENCES ACTIVES",
              value: String(critCount + warnCount),
              sub: `${critCount} critique${critCount>1?"s":""} · ${warnCount} alerte${warnCount>1?"s":""}`,
              color: critCount > 0 ? "#ef4444" : "#f59e0b",
              icon:"🚨",
            },
          ].map((s,i) => (
            <div key={i} style={{
              background:"rgba(8,14,26,0.7)", border:"1px solid rgba(255,255,255,0.07)",
              borderRadius:14, padding:"20px", backdropFilter:"blur(12px)",
            }}>
              <div style={{ fontSize:10, fontWeight:700, color:"rgba(148,163,184,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:12 }}>
                {s.icon} {s.label}
              </div>
              <div style={{ fontSize:28, fontWeight:800, color:"#ffffff", letterSpacing:"-0.02em", marginBottom:4, fontVariantNumeric:"tabular-nums" }}>
                {s.value}
              </div>
              <div style={{ fontSize:12, color:s.color, fontWeight:600 }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* ── BAROMETRE MACRO CARD ── */}
        <div style={{
          background:"rgba(8,14,26,0.7)", border:"1px solid rgba(99,91,255,0.2)",
          borderRadius:14, padding:"20px 24px", marginBottom:20,
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(99,91,255,0.8)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>
            📊 Contexte — Baromètre Industrie Maroc 2025
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12 }}>
            {[
              { label:"CA Industrie Maroc", value:"898 Mrd DH", delta:"+9,2%", color:"#10b981" },
              { label:"Investissements", value:"89,7 Mrd DH", delta:"+30,2% 🔥 Record", color:"#f59e0b" },
              { label:"Emplois industriels", value:"1 038 133", delta:"+4,3%", color:"#818cf8" },
              { label:"Capital marocain", value:"70,2%", delta:"Souveraineté stable", color:"#10b981" },
            ].map((m,i) => (
              <div key={i} style={{ padding:"12px", background:"rgba(255,255,255,0.03)", borderRadius:10, border:"1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ fontSize:10, color:"rgba(148,163,184,0.5)", marginBottom:6, textTransform:"uppercase", letterSpacing:"0.06em" }}>{m.label}</div>
                <div style={{ fontSize:18, fontWeight:800, color:"#ffffff", marginBottom:2, letterSpacing:"-0.02em" }}>{m.value}</div>
                <div style={{ fontSize:11, color:m.color, fontWeight:600 }}>{m.delta}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── MONCEF AI SECTION ── */}
        <div style={{
          background:"rgba(8,14,26,0.7)", border:"1px solid rgba(16,185,129,0.2)",
          borderRadius:14, padding:"20px 24px", marginBottom:20,
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ display:"flex", alignItems:"center", gap:16, marginBottom:20 }}>
            <div style={{
              width:52, height:52, borderRadius:"50%",
              background:"linear-gradient(135deg,#065f46,#047857)",
              border:"2px solid rgba(16,185,129,0.4)",
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:22, flexShrink:0,
              boxShadow:"0 0 20px rgba(16,185,129,0.2)",
            }}>🎙</div>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:16, fontWeight:700, color:"#ffffff" }}>Parler à Moncef AI</div>
              <div style={{ fontSize:12, color:"rgba(148,163,184,0.6)" }}>Données Dislog + Baromètre 2025 + Macro DEPF</div>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:4, fontSize:11, color:"rgba(148,163,184,0.4)" }}>
              <span style={{ width:5,height:5,borderRadius:"50%",background:"#10b981",display:"inline-block" }}/>
              En ligne
            </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:10 }}>
            {[
              { icon:"🌍", cat:"ÉCONOMIE", label:"Scène économique du jour" },
              { icon:"⚡", cat:"ARBITRAGE", label:"Mes 3 décisions urgentes" },
              { icon:"🌐", cat:"INTERNATIONAL", label:"Signaux géopolitiques MENA" },
              { icon:"🛡", cat:"SOUVERAINETÉ", label:"Compétitivité vs Tunisie/Égypte" },
              { icon:"📈", cat:"INVESTISSEMENT", label:"Où investir en priorité ?" },
              { icon:"🏭", cat:"FILIALES", label:"Quelle filiale arbitrer ce mois ?" },
            ].map((q,i) => (
              <Link key={i} href={`/?q=${encodeURIComponent(q.label)}`} style={{
                display:"block", padding:"14px 16px", borderRadius:10,
                background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)",
                textDecoration:"none", transition:"all 0.15s",
              }}>
                <div style={{ fontSize:9, fontWeight:700, color:"rgba(148,163,184,0.4)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:4 }}>
                  {q.icon} {q.cat}
                </div>
                <div style={{ fontSize:13, color:"rgba(226,232,240,0.85)", fontWeight:500 }}>{q.label}</div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── TOP PERFORMERS ── */}
        <div style={{
          background:"rgba(8,14,26,0.7)", border:"1px solid rgba(255,255,255,0.07)",
          borderRadius:14, padding:"20px 24px",
          backdropFilter:"blur(12px)",
        }}>
          <div style={{ fontSize:11, fontWeight:700, color:"rgba(148,163,184,0.5)", letterSpacing:"0.1em", textTransform:"uppercase", marginBottom:16 }}>
            🏆 Performance filiales — Mai 2026
          </div>
          <div style={{ display:"flex", flexDirection:"column" as const, gap:10 }}>
            {performers.slice(0,5).map((p,i) => {
              const color = p.pct >= 100 ? "#10b981" : p.pct >= 90 ? "#f59e0b" : "#ef4444";
              const icon = p.pct >= 100 ? "🟢" : p.pct >= 90 ? "🟡" : "🔴";
              return (
                <Link key={p.slug} href={`/entites/${p.slug}`} style={{
                  display:"flex", alignItems:"center", gap:14, padding:"10px 12px",
                  borderRadius:10, background:"rgba(255,255,255,0.03)",
                  border:"1px solid rgba(255,255,255,0.05)", textDecoration:"none",
                }}>
                  <span style={{ fontSize:16 }}>{icon}</span>
                  <span style={{ flex:1, fontSize:13, color:"#e2e8f0", fontWeight:500 }}>{p.name}</span>
                  <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{
                      width:120, height:4, borderRadius:4,
                      background:"rgba(255,255,255,0.06)", overflow:"hidden",
                    }}>
                      <div style={{
                        height:"100%", borderRadius:4,
                        width:`${Math.min(p.pct,100)}%`,
                        background: color,
                      }}/>
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color, minWidth:38, textAlign:"right" as const }}>
                      {p.pct.toFixed(0)}%
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
