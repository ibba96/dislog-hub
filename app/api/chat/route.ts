import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CURRENT_PERIOD = "2026-05";
const PREV_PERIOD = "2026-04";

async function buildContext(): Promise<string> {
  const [entities, kpiDefs, current, prev] = await Promise.all([
    prisma.entity.findMany({ include: { division: true } }),
    prisma.kpiDefinition.findMany({ orderBy: { order: "asc" } }),
    prisma.kpiEntry.findMany({ where: { period: CURRENT_PERIOD }, include: { kpiDef: true, entity: { include: { division: true } } } }),
    prisma.kpiEntry.findMany({ where: { period: PREV_PERIOD }, include: { kpiDef: true } }),
  ]);

  const getVal = (entityId: string, kpiId: string, entries: typeof current) =>
    entries.find((e) => e.entityId === entityId && e.kpiDefId === kpiId)?.value ?? null;

  const getTarget = (entityId: string, kpiId: string) =>
    current.find((e) => e.entityId === entityId && e.kpiDefId === kpiId)?.target ?? null;

  let ctx = `=== DONNÉES GROUPE DISLOG BELKHYAT — ${CURRENT_PERIOD} ===\n\n`;

  // Totaux groupe
  const totalCA = current.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);
  const totalMarge = current.filter(e => e.kpiDefId === "marge").reduce((s, e) => s + e.value, 0);
  const totalEbitda = current.filter(e => e.kpiDefId === "ebitda").reduce((s, e) => s + e.value, 0);
  const totalEffectifs = current.filter(e => e.kpiDefId === "effectifs").reduce((s, e) => s + e.value, 0);
  const prevCA = prev.filter(e => e.kpiDefId === "ca").reduce((s, e) => s + e.value, 0);

  ctx += `CONSOLIDÉ GROUPE:\n`;
  ctx += `  CA: ${(totalCA / 1e6).toFixed(1)}M MAD (${prevCA ? ((totalCA - prevCA) / prevCA * 100).toFixed(1) : "N/A"}% vs mois précédent)\n`;
  ctx += `  Marge brute: ${(totalMarge / 1e6).toFixed(1)}M MAD (${totalCA ? (totalMarge / totalCA * 100).toFixed(1) : "-"}% du CA)\n`;
  ctx += `  EBITDA: ${(totalEbitda / 1e6).toFixed(1)}M MAD (${totalCA ? (totalEbitda / totalCA * 100).toFixed(1) : "-"}% du CA)\n`;
  ctx += `  Effectifs: ${totalEffectifs} collaborateurs\n\n`;

  // Par entité
  ctx += `DÉTAIL PAR FILIALE:\n`;
  for (const e of entities) {
    const ca = getVal(e.id, "ca", current);
    const marge = getVal(e.id, "marge", current);
    const ebitda = getVal(e.id, "ebitda", current);
    const taux = getVal(e.id, "taux-service", current);
    const effectifs = getVal(e.id, "effectifs", current);
    const prevCaVal = getVal(e.id, "ca", prev as typeof current);
    const caTarget = getTarget(e.id, "ca");
    const tauxTarget = getTarget(e.id, "taux-service");

    if (!ca) {
      ctx += `  ${e.name} (${e.division.name}): Aucune donnée pour ${CURRENT_PERIOD}\n`;
      continue;
    }

    const evol = prevCaVal ? ((ca - prevCaVal) / prevCaVal * 100).toFixed(1) : null;
    const vsTarget = caTarget ? ((ca / caTarget) * 100).toFixed(0) : null;
    const tauxVsTarget = tauxTarget && taux ? (taux >= tauxTarget ? "✓" : "⚠") : "-";

    ctx += `  ${e.name} (${e.division.name}):\n`;
    ctx += `    CA: ${(ca / 1e6).toFixed(2)}M MAD${evol ? ` (${evol}% vs mois précédent)` : ""}${vsTarget ? ` — ${vsTarget}% de l'objectif` : ""}\n`;
    if (marge) ctx += `    Marge brute: ${(marge / 1e6).toFixed(2)}M MAD (${ca ? (marge / ca * 100).toFixed(1) : "-"}%)\n`;
    if (ebitda) ctx += `    EBITDA: ${(ebitda / 1e6).toFixed(2)}M MAD\n`;
    if (taux) ctx += `    Taux de service: ${taux.toFixed(1)}% ${tauxVsTarget}\n`;
    if (effectifs) ctx += `    Effectifs: ${effectifs}\n`;
  }

  // Alertes
  ctx += `\nALERTES ACTIVES:\n`;
  let alertCount = 0;
  for (const e of entities) {
    const ca = getVal(e.id, "ca", current);
    const caTarget = getTarget(e.id, "ca");
    const taux = getVal(e.id, "taux-service", current);
    const tauxTarget = getTarget(e.id, "taux-service");
    const prevCaVal = getVal(e.id, "ca", prev as typeof current);

    if (!ca) {
      ctx += `  CRITIQUE: ${e.name} — aucune donnée saisie pour ${CURRENT_PERIOD}\n`;
      alertCount++;
    } else {
      if (caTarget && ca < caTarget * 0.9) {
        ctx += `  ALERTE: ${e.name} — CA sous objectif (${((ca / caTarget) * 100).toFixed(0)}% de l'objectif)\n`;
        alertCount++;
      }
      if (prevCaVal && ca < prevCaVal) {
        ctx += `  ATTENTION: ${e.name} — CA en baisse de ${Math.abs((ca - prevCaVal) / prevCaVal * 100).toFixed(1)}% vs mois précédent\n`;
        alertCount++;
      }
      if (taux && tauxTarget && taux < tauxTarget) {
        ctx += `  ATTENTION: ${e.name} — Taux de service dégradé (${taux.toFixed(1)}% vs objectif ${tauxTarget.toFixed(1)}%)\n`;
        alertCount++;
      }
    }
  }
  if (alertCount === 0) ctx += `  Aucune alerte critique\n`;

  return ctx;
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith("sk-ant-...")) {
    return NextResponse.json({
      reply: "⚠️ Clé API Anthropic non configurée. Ajoutez ANTHROPIC_API_KEY dans le fichier .env du projet, puis redémarrez le serveur.",
    });
  }

  try {
    const { message, history = [] } = await req.json();

    const context = await buildContext();

    const systemPrompt = `Tu es Moncef AI, l'assistant IA personnel de Moncef Belkhyat, président du Groupe Dislog.

Tu as accès en temps réel aux données de performance de toutes les filiales du groupe (Dislog Food, Dislog Hygiene, DMD, Megaflex, Farmalac, Afrobiomedic, Eramedic, Scomedica, KPH Laboratories, Steripharma).

${context}

INSTRUCTIONS:
- Réponds en français, de façon directe et décisionnelle
- Sois précis avec les chiffres réels du contexte
- Classe par priorité : critique > alerte > information
- Si une question concerne une filiale sans données, signale-le clairement
- Recommande des actions concrètes quand c'est pertinent
- Sois concis : maximum 4-5 phrases sauf si on demande un détail
- Tu t'adresses à Moncef directement ("votre groupe", "votre filiale")`;

    const messages = [
      ...history,
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "Erreur de traitement.";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("Chat error:", err);
    return NextResponse.json({ reply: "Erreur de connexion à Moncef AI. Vérifiez la clé API." }, { status: 500 });
  }
}
