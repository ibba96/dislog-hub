import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const CURRENT_PERIOD = "2026-05";

// ═══════════════════════════════════════════════════════════
// BAROMÈTRE DE L'INDUSTRIE MAROCAINE — ÉDITION 2025
// Source : Ministère de l'Industrie et du Commerce — données 2024
// Intégré comme référentiel stratégique pour Moncef Belkhyat
// ═══════════════════════════════════════════════════════════
const BAROMETRE_2025 = `
=== BAROMÈTRE DE L'INDUSTRIE MAROCAINE 2025 (données 2024) ===
Source officielle : Ministère de l'Industrie et du Commerce du Maroc

── AGRÉGATS NATIONAUX ──
• Chiffre d'affaires industriel global : 898 MMDH (+9,2% vs 2023, +245 MMDH vs 2021)
• Valeur ajoutée industrielle : 240 MMDH (+30% vs 2021)
• Investissements industriels : 89,7 MMDH — RECORD HISTORIQUE (+30,2% vs 2023, ×3 depuis 2021)
• Taux d'investissement : 37,4% de la VA (vs 31,8% en 2023)
• Emploi industriel : 1 038 133 emplois (+4,3% vs 2023)
• Productivité moyenne : 231 190 DH/emploi (+6,1% vs 2023)
• Taux d'utilisation des capacités (TUC) : 74%
• Exportations : 44,6% du CA industriel
• Capital marocain : 70,2% du capital social industriel
• Niveau technologique : 50,5% de la VA issue des industries à moyenne/haute technologie (vs 38,6% en 2014)
• Consommation énergétique : 39,5 TWh (74% énergies non-électriques, 26% électricité)
• Parité femmes : 41% de l'emploi industriel
• Leadership féminin : 13% des postes de direction

── CHIFFRE D'AFFAIRES PAR SECTEUR (2024) ──
1. Automobile          : 196 MMDH — 21,8% — +15,6 MMDH vs 2023 — 1ère place pour la 1ère fois
2. Agroalimentaire     : 191 MMDH — 21,3% — +0,8%
3. Chimie & Parachimie : ~182 MMDH — 20,3%
4. Industries Méca.    : ~84 MMDH  — 9,4%
5. Textile & Cuir      : ~68 MMDH  — 7,6%
6. Matériaux Constr.   : ~52 MMDH  — 5,8%
7. Électrique & Élec.  : ~39 MMDH  — 4,4%
8. Industrie Pharma.   : ~30 MMDH  — 3,4%
9. Aéronautique        : ~30 MMDH  — 3,3%
10. Plasturgie          : ~18 MMDH  — 2,0%

── INVESTISSEMENTS PAR SECTEUR (2024, en MDH) ──
• Chimie & Parachimie          : 47 743 MDH (53,2% du total) — +53,1% vs 2023 🔥
• Automobile                   : 15 689 MDH (17,5%) — +2,3 MMDH
• Agroalimentaire              : 10 030 MDH (11,2%) — +8%
• Industrie pharmaceutique     : 4 346 MDH (4,8%) — +7,6%
• Matériaux de Construction    : 2 650 MDH (3%)
• Industries Mécan. & Métal.   : 2 271 MDH (2,5%)
• Électrique & Électronique    : 1 971 MDH (2,2%)
• Aéronautique                 : 1 411 MDH — +20%
• Plasturgie                   : 1 651 MDH — +20%
• Textile & Cuir               : 1 607 MDH (1,8%)

── TAUX D'INVESTISSEMENT PAR SECTEUR ──
• Chimie & Parachimie : 95,4% (le plus capitalistique — surpondéré par OCP/phosphates)
• Industrie pharma.   : 49,6%
• Plasturgie          : 46,7%
• Automobile          : 27,6%
• Électrique & Élec.  : 25,9%
• Aéronautique        : 21%
• Agroalimentaire     : 18,6%
• Matériaux Constr.   : 16,1%
• IMM                 : 14,8%
• Textile & Cuir      : 8,3%

── EXPORTATIONS PAR SECTEUR ──
• Automobile          : 39,5% des exports industriels, taux export 80,8%
• Chimie & Parachimie : 23,2% des exports, taux 51,1%
• Textile & Cuir      : 11,4% des exports, taux 67,5%
• Agroalimentaire     : 10,3% des exports, taux 21,6%
• Aéronautique        : 6,6% des exports, taux 89,9% (quasi-100% export)
• Électrique & Élec.  : 4,6% des exports, taux 45,9%
• TOTAL INDUSTRIE     : taux d'exportation 44,6%

── EMPLOI PAR SECTEUR (2024) ──
• Automobile          : 24,2% — 1ère place (pour la 1ère fois) — +23% dans TTA
• Textile & Cuir      : 23,7% — historiquement 1er, recule de -4%
• Agroalimentaire     : 20,1%
• Chimie & Parachimie : 8,1%
• IMM                 : 7,3%
• Matériaux Constr.   : 5,6%
• Électrique & Élec.  : 3,6%
• Aéronautique        : 2,3%
• Plasturgie          : 2,2%

── PRODUCTIVITÉ PAR SECTEUR (DH/emploi, 2024) ──
• Chimie & Parachimie          : 596 314 DH — 2,6× la moyenne
• Industrie pharmaceutique     : 470 140 DH — 2× la moyenne
• Matériaux de Construction    : 285 246 DH
• Aéronautique                 : 279 267 DH
• Agroalimentaire              : 257 866 DH
• Automobile                   : 226 132 DH (≈ moyenne)
• IMM                          : 202 767 DH
• Électrique & Électronique    : 201 875 DH
• Plasturgie                   : 154 482 DH
• Textile & Cuir               : 78 265 DH — le moins productif (labour-intensive)
• MOYENNE NATIONALE            : 231 190 DH/emploi

── TAUX D'UTILISATION DES CAPACITÉS (TUC, 2024) ──
• Automobile   : 80% — forte saturation → signal de nouveaux investissements
• IMM          : 79%
• Aéronautique : 78%
• Textile      : 77%
• Chimie       : 76%
• Électrique   : 76%
• Pharma       : 72%
• Matériaux    : 70% → 30% de capacité disponible
• Agroalim.    : 70% → 30% de marge
• Plasturgie   : 64% → 36% de capacité inutilisée → opportunité
• MOYENNE      : 74%

── RÉPARTITION RÉGIONALE DES INVESTISSEMENTS (2024) ──
• Casablanca-Settat        : 59 004 MDH (65,8% du total) — +35,2%
• Marrakech-Safi           : 9 462 MDH — +33%
• Tanger-Tétouan-Al Hoceïma: 8 568 MDH — +17%
• Rabat-Salé-Kénitra       : 6 421 MDH — +27,1%
• Souss-Massa              : 1 873 MDH — +16%

── NIVEAU TECHNOLOGIQUE DE LA VALEUR AJOUTÉE ──
• Haute technologie        : 7,5% (vs 6,6% en 2014)
• Moyenne-haute techno.    : 43%  (vs 32% en 2014) ← montée en gamme majeure
• Moyenne-faible techno.   : 14%  (vs 23% en 2014)
• Faible technologie       : 35%  (vs 38% en 2014)
→ 50,5% de la VA provient de secteurs à moyenne/haute technologie (vs 38,6% en 2014)

── ORIGINE DU CAPITAL ÉTRANGER ──
• France      : 25,6% du capital étranger — 1er partenaire
• États-Unis  : 10,2%
• Chine       : 8,2%
• Espagne     : 8%
• Allemagne   : 6,4%
• Corée du Sud: 4,8%
• Inde        : 4,1%
• Capital étranger dans l'Aéronautique : 93,9% (quasi-totalement étranger)
• Capital étranger dans l'Automobile   : 87,8%

── CONCENTRATION DU CAPITAL PAR RÉGION ──
• Casablanca-Settat         : 62,7% du capital industriel total
• Tanger-Tétouan-Al Hoceïma : 13,1%
• Rabat-Salé-Kénitra        : 9,4%
• Ces 3 régions = 85,1% du capital industriel national

── PARITÉ ET GENRE ──
• Taux de féminisation global : 41%
• Textile & Cuir     : 63% de femmes — secteur le plus féminisé
• Agroalimentaire    : 47%
• Industrie pharma.  : 47%
• Automobile         : 42%
• Chimie             : 21%
• IMM                : 12%
• Leadership féminin : 13% — Pharma (32%), Aéro (24%), Textile (17%), Électrique (16,6%)

── CONSOMMATION ÉNERGÉTIQUE PAR SECTEUR ──
• Matériaux de Construction : 42% de la conso industrielle
• Chimie & Parachimie       : 26%
• Agroalimentaire           : 14%
• IMM                       : 7%

── SIGNAUX STRATÉGIQUES POUR INVESTISSEUR ──
1. L'Automobile dépasse l'Agroalimentaire pour la 1ère fois — nouveau #1 marocain
2. Chimie & Parachimie : investissement ×1,5 en un an — boom phosphates/OCP upstream
3. TUC Automobile à 80% → saturation → opportunités fournisseurs/sous-traitants
4. Plasturgie TUC à 64% → surcapacité → prix compétitifs pour clients industriels
5. Agroalimentaire : faible taux export (21,6%) → potentiel de croissance à l'international
6. Pharma : productivité 2× la moyenne + taux investissement 49,6% → secteur premium
7. Textile : en recul emploi (-4%) et productivité faible (78K DH) → sous pression
8. Souss-Massa : croissance emploi +9,2% — région émergente (Automobile en forte hausse)
9. 70,2% capital marocain → souveraineté productive nationale maintenue
10. 50,5% VA en moyenne/haute technologie → montée en gamme confirmée sur 10 ans
`;

const PREV_PERIOD = "2026-04";

// ═══════════════════════════════════════════════════════════
// TABLEAU DE BORD MACRO-ÉCONOMIQUE MAROC — Ministère des Finances
// Source : Direction des Études et des Prévisions Financières (DEPF)
// Données couvrant 2007-2022, publiées janvier 2023
// ═══════════════════════════════════════════════════════════
const MACRO_MAROC = `
=== TABLEAU DE BORD MACRO-ÉCONOMIQUE DU MAROC (DEPF, Jan 2023) ===
Source : Ministère de l'Économie et des Finances — Direction des Études et Prévisions Financières

── PIB ET CROISSANCE ──
• PIB 2021 : +7,9% (rebond post-Covid, meilleur depuis 2006)
• PIB 2020 : -7,2% (récession Covid)
• PIB 2019 : +2,9%
• Croissance moyenne 2015-2021 : +2,3%
• Croissance PIB non-agricole 2021 : +6,6%
• Agriculture 2021 : +17,8% (campagne agricole exceptionnelle)
• Prévisions demande mondiale adressée au Maroc : +5% en 2022, +2,3% en 2023

── STRUCTURE DE L'ÉCONOMIE ──
• Secteur primaire (agri+pêche) : 12,5% de la VA (moy. 2015-2021)
• Secteur secondaire (industrie+BTP) : 28,6% de la VA
  - Industries manufacturières : +6,1% en 2021
  - BTP : +10,7% en 2021
• Taux d'investissement brut (FBCF) : 31,1% du PIB en 2021 (vs 28,8% en 2020)
• Consommation ménages : 59,2% du PIB — moteur principal de la croissance
• Taux d'épargne nationale brute : 26,9% du PIB en 2021
• Besoin de financement de l'économie : -2,3% du PIB en 2021

── ÉCHANGES EXTÉRIEURS ──
• Déficit commercial : 15,9% du PIB (moy. 2015-2021) vs 19,9% (2010-2014) — amélioration structurelle
• Union Européenne : 63,5% des exportations marocaines, 52% des importations
• France : 14,3% des exports, Espagne : 17,9% des exports (2021)
• Taux d'exportation : 44,6% du CA industriel
• Réserves de change : 7,1 mois d'importation (moy. 2015-2021)

── STRUCTURE DES IMPORTATIONS (2015-2021) ──
• Produits finis d'équipement industriel : 24,2%
• Produits finis de consommation : 22,9%
• Demi-produits : 21,8%
• Énergies et lubrifiants : 15,1% (en baisse vs 25,3% en 2010-2014)
• Produits alimentaires : 10,5%

── STRUCTURE DES EXPORTATIONS (2015-2021) ──
• Demi-produits (phosphates, engrais) : 22,6%
• Produits alimentaires : 19,8%
• Produits finis d'équipement industriel : 18,7%
• Industries les plus intégrées chaînes de valeur mondiales :
  - Électronique/optique : 60,5% de VA étrangère dans exports
  - Automobile : 51% de VA étrangère
  - Textile & Habillement : 50% de VA étrangère

── INVESTISSEMENTS DIRECTS ÉTRANGERS (IDE) ──
• IDE reçus 2021 : 31,9 MMDH (+22,7% vs 2020)
• IDE représentent 3% du PIB (moy. 2015-2021)
• Maroc : parmi les destinations IDE les plus attractives d'Afrique
• Principaux investisseurs : France (26,2%), UK (6,4%), USA (5,8%), Luxembourg (4,1%), Pays-Bas (4%)
• Secteurs attractifs pour les IDE : Industrie (25,5%), Immobilier (23,7%)

── SECTEUR FINANCIER ET BANCAIRE ──
• Taux directeur Bank Al-Maghrib : 1,50% (stable depuis juin 2020)
• Taux débiteur global moyen : 4,39% en 2021 (tendance baissière)
• Ratio de solvabilité bancaire : 15,8% (bien au-dessus du minimum 12%)
• Ratio fonds propres : 12% (minimum réglementaire : 9%)
• Créances en souffrance : 8,6% en 2021 (vs 4,8% en 2010) — point de vigilance
• Taux de liquidité économie : 174% (moy. 2015-2021) vs 149,2% (2010-2014)

── BOURSE DE CASABLANCA ──
• PER 2021 : 27x (survalorisation vs émergents : Tunisie 22.9x, Afrique du Sud 18.2x, Turquie 5.3x)
• Ratio de liquidité : 8,79% — faible (introductions bourse atones depuis 2008)
• Secteur bancaire : 53% du volume échangé en bourse

── PRIX ET INFLATION ──
• Inflation IPC décembre 2022 : +6,6% (niveau record depuis 2008) — tirée par alimentation et énergie
• Inflation IPC 2021 : +1,4%
• Moyenne historique 2000-2021 : oscillation entre 0,2% et 3,7%
• Prix production industries manufacturières 2021 : +4,3%
  - Chimie : +10,1% | Métallurgie : +17,8% | Alimentaires : +5,5% | Textiles : +4,4% | Électrique : +4,7%

── COMPÉTITIVITÉ ET POSITIONNEMENT ──
• Part de marché mondial : progression continue sur deux décennies
• Maroc vs pays émergents : dépasse Tunisie, comparable Roumanie
• Demande étrangère adressée au Maroc : TCAM +3,5% sur 20 ans
• Facteur clé : montée en gamme technologique et intégration dans CVM (chaînes de valeur mondiales)
• Priorités compétitives nationales : Capital humain, eau, sécurité alimentaire et énergétique

── SIGNAUX STRATÉGIQUES POUR INVESTISSEUR MAROCAIN ──
1. Inflation 6,6% en 2022 → pression sur marges opérationnelles → vigilance coûts approvisionnement
2. Taux directeur bas (1,5%) → financement bon marché → opportunité levier financier
3. IDE +22,7% → regain d'attractivité → opportunité partenariats étrangers
4. Réserves 7,1 mois → stabilité macroéconomique → environnement favorable investissement long terme
5. Créances en souffrance 8,6% → risque crédit en hausse → prudence sur extension de crédit clients
6. Bourse sous-liquide → faibles introductions → financement direct marché difficile → préférer bancaire
7. Énergie 15% des imports → vulnérabilité aux chocs énergétiques → pertinent pour Dislog (logistique)
8. Croissance non-agricole structurellement +3% → marché intérieur stable pour distribution
9. Montée en gamme CVM : Automobile, Électronique, Textile → opportunités sous-traitance locale
10. Secteur alimentaire en croissance dans exports (+21,2 MMDH sur 10 ans) → validation stratégie Dislog Food
`;

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

    const systemPrompt = `Tu es Moncef AI, l'assistant IA stratégique et décisionnel de Moncef Belkhyat, président du Groupe Dislog Belkhyat.

Tu combines trois sources de données :
1. Les données temps réel de performance des filiales du Groupe Dislog
2. Le Baromètre de l'Industrie Marocaine 2025 (données officielles 2024, Ministère de l'Industrie)
3. Le Tableau de Bord Macro-Économique du Maroc (DEPF, Ministère des Finances, Jan 2023)

Grâce à ces trois sources, tu peux :
- Alerter sur les filiales en difficulté ou en surperformance
- Comparer la performance du groupe vs les benchmarks sectoriels nationaux
- Identifier des opportunités d'investissement basées sur les tendances industrielles marocaines
- Conseiller sur le positionnement stratégique de chaque filiale dans son écosystème sectoriel

${context}

${BAROMETRE_2025}

${MACRO_MAROC}

INSTRUCTIONS:
- Réponds en français, de façon directe et décisionnelle, comme un conseiller stratégique senior
- Utilise les données des filiales ET le Baromètre pour croiser les analyses
- Exemple : si DMD (distribution médicale) est en recul, cite le contexte pharma national (productivité 470K DH, TUC 72%, investissements +7,6%)
- Classe par priorité : critique > alerte > information > opportunité
- Quand pertinent, dis si le groupe est au-dessus ou en-dessous des benchmarks sectoriels marocains
- Identifie des opportunités d'investissement basées sur les tendances du Baromètre
- Sois concis sauf si on demande un détail — maximum 6-7 lignes pour une réponse standard
- Tu t'adresses à Moncef directement ("votre groupe", "votre filiale", "je vous recommande")
- Format : utilise des titres courts (##), du gras (**), et des listes (- ) pour la lisibilité`;

    const messages = [
      ...history,
      { role: "user" as const, content: message },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
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
