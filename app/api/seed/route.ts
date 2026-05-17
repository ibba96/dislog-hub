import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST() {
  const divisions = [
    { name: "Food", color: "#f97316" },
    { name: "Hygiene", color: "#3b82f6" },
    { name: "Health", color: "#22c55e" },
  ];

  const divMap: Record<string, string> = {};
  for (const d of divisions) {
    const div = await prisma.division.upsert({ where: { name: d.name }, update: {}, create: d });
    divMap[d.name] = div.id;
  }

  const entities = [
    { name: "Dislog Food", slug: "dislog-food", divisionId: divMap["Food"], description: "Distribution & snacks" },
    { name: "Dislog Hygiene", slug: "dislog-hygiene", divisionId: divMap["Hygiene"], description: "Distribution P&G + marques propres" },
    { name: "DMD", slug: "dmd", divisionId: divMap["Health"], description: "Dislog Medical Devices — 5 structures regroupées" },
    { name: "Megaflex", slug: "megaflex", divisionId: divMap["Health"], description: "Dispositifs médicaux depuis 1992" },
    { name: "Farmalac", slug: "farmalac", divisionId: divMap["Health"], description: "25 ans d'expérience pharma" },
    { name: "Afrobiomedic", slug: "afrobiomedic", divisionId: divMap["Health"], description: "Dispositifs médicaux depuis 2009" },
    { name: "Eramedic", slug: "eramedic", divisionId: divMap["Health"], description: "Dispositifs médicaux" },
    { name: "Scomedica", slug: "scomedica", divisionId: divMap["Health"], description: "Dispositifs médicaux" },
    { name: "KPH Laboratories", slug: "kph", divisionId: divMap["Health"], description: "Labos pharma & dermo-cosméto" },
    { name: "Steripharma", slug: "steripharma", divisionId: divMap["Health"], description: "Génériques — 15+ pays africains" },
  ];

  const entityMap: Record<string, string> = {};
  for (const e of entities) {
    const ent = await prisma.entity.upsert({ where: { slug: e.slug }, update: {}, create: e });
    entityMap[e.slug] = ent.id;
  }

  const kpiDefs = [
    { id: "ca", name: "Chiffre d'affaires", unit: "MAD", category: "Financier", order: 1 },
    { id: "marge", name: "Marge brute", unit: "MAD", category: "Financier", order: 2 },
    { id: "ebitda", name: "EBITDA", unit: "MAD", category: "Financier", order: 3 },
    { id: "commandes", name: "Commandes", unit: "nb", category: "Commercial", order: 4 },
    { id: "taux-service", name: "Taux de service", unit: "%", category: "Commercial", order: 5 },
    { id: "clients", name: "Clients actifs", unit: "nb", category: "Commercial", order: 6 },
    { id: "stock", name: "Stock", unit: "MAD", category: "Opérationnel", order: 7 },
    { id: "unites", name: "Unités expédiées", unit: "unités", category: "Opérationnel", order: 8 },
    { id: "effectifs", name: "Effectifs", unit: "pers.", category: "Opérationnel", order: 9 },
  ];

  for (const k of kpiDefs) {
    await prisma.kpiDefinition.upsert({ where: { id: k.id }, update: {}, create: k });
  }

  const periods = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];
  const data: Record<string, Record<string, number[]>> = {
    "dislog-food": {
      ca: [18500000, 17200000, 19800000, 21000000, 20500000, 22100000],
      marge: [4200000, 3900000, 4600000, 4900000, 4800000, 5100000],
      ebitda: [1800000, 1600000, 2000000, 2200000, 2100000, 2300000],
      commandes: [1420, 1380, 1510, 1590, 1560, 1640],
      "taux-service": [94.2, 93.8, 95.1, 96.0, 95.5, 96.3],
      clients: [312, 318, 325, 330, 328, 335],
      stock: [8200000, 7900000, 8600000, 8100000, 8400000, 8700000],
      unites: [285000, 270000, 310000, 325000, 318000, 342000],
      effectifs: [145, 145, 148, 148, 150, 150],
    },
    "dislog-hygiene": {
      ca: [42000000, 39500000, 45000000, 48000000, 46500000, 50000000],
      marge: [9800000, 9100000, 10500000, 11200000, 10800000, 11700000],
      ebitda: [4200000, 3900000, 4600000, 5000000, 4800000, 5200000],
      commandes: [3200, 3050, 3400, 3600, 3500, 3750],
      "taux-service": [95.5, 94.9, 96.2, 96.8, 96.5, 97.0],
      clients: [580, 590, 605, 620, 615, 635],
      stock: [18500000, 17800000, 19200000, 18600000, 19000000, 19800000],
      unites: [620000, 590000, 670000, 710000, 690000, 740000],
      effectifs: [280, 280, 285, 285, 290, 290],
    },
    kph: {
      ca: [12000000, 11500000, 13000000, 14000000, 13500000, 14800000],
      marge: [5500000, 5200000, 6000000, 6500000, 6200000, 6800000],
      ebitda: [2800000, 2600000, 3100000, 3400000, 3200000, 3600000],
      commandes: [820, 790, 870, 920, 900, 960],
      "taux-service": [97.2, 96.8, 97.5, 98.0, 97.8, 98.2],
      clients: [145, 148, 152, 158, 155, 162],
      stock: [5800000, 5600000, 6100000, 5900000, 6200000, 6400000],
      unites: [68000000, 65000000, 72000000, 76000000, 74000000, 79000000],
      effectifs: [185, 185, 188, 188, 190, 192],
    },
    steripharma: {
      ca: [8500000, 8200000, 9000000, 9500000, 9200000, 9800000],
      marge: [3800000, 3600000, 4100000, 4400000, 4200000, 4500000],
      ebitda: [1900000, 1800000, 2100000, 2300000, 2200000, 2400000],
      commandes: [520, 500, 550, 580, 570, 600],
      "taux-service": [96.5, 96.0, 97.0, 97.5, 97.2, 97.8],
      clients: [89, 91, 94, 98, 96, 101],
      stock: [3900000, 3700000, 4100000, 3900000, 4100000, 4300000],
      unites: [42000000, 40000000, 45000000, 48000000, 46000000, 50000000],
      effectifs: [200, 200, 200, 200, 200, 200],
    },
  };

  for (const [slug, kpiData] of Object.entries(data)) {
    const eid = entityMap[slug];
    if (!eid) continue;
    for (const [kid, values] of Object.entries(kpiData)) {
      for (let i = 0; i < periods.length; i++) {
        await prisma.kpiEntry.upsert({
          where: { entityId_kpiDefId_period: { entityId: eid, kpiDefId: kid, period: periods[i] } },
          update: { value: values[i], target: values[i] * 1.05 },
          create: { entityId: eid, kpiDefId: kid, period: periods[i], value: values[i], target: values[i] * 1.05 },
        });
      }
    }
  }

  return NextResponse.json({ ok: true, message: "Base de données initialisée avec succès" });
}
