import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import path from "path";
import { pathToFileURL } from "url";

const dbPath = path.resolve(process.cwd(), "prisma/dev.db");
const adapter = new PrismaLibSql({ url: pathToFileURL(dbPath).toString() });
const prisma = new PrismaClient({ adapter } as any);

// ─── SCÉNARIO : Mai 2026, Groupe Dislog ───────────────────────────────────────
// CEO Moncef Belkhyat doit arbitrer entre 3 signaux majeurs :
//  1. DMD en chute libre (−26% sur 5 mois) → risque structurel
//  2. Eramedic en décrochage (−35%) → décision de redressement ou arbitrage
//  3. Afrobiomedic en forte croissance (+35%) → opportunité à accélérer
//  4. Dislog Hygiene franchit 50M → record historique
//  5. KPH Laboratories sur trajectory record (marge 46%)

const PERIODS = ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"];

type EntitySeed = {
  slug: string;
  kpi: string;
  values: number[];   // Déc → Mai
  targets: number[];  // objectifs par période
};

// Valeurs en MAD
const DATA: EntitySeed[] = [

  // ══ FOOD ══════════════════════════════════════════════════════════════════
  // Dislog Food : croissance solide, légèrement sous objectif en mai
  { slug: "dislog-food", kpi: "Chiffre d'affaires",
    values:  [18500000, 17200000, 19800000, 21000000, 20500000, 22100000],
    targets: [19000000, 19000000, 20000000, 21500000, 22000000, 23200000] },
  { slug: "dislog-food", kpi: "Marge brute",
    values:  [4255000, 3956000, 4554000, 4830000, 4715000, 5103000],
    targets: [4500000, 4500000, 4750000, 5000000, 5100000, 5500000] },
  { slug: "dislog-food", kpi: "EBITDA",
    values:  [1850000, 1720000, 1980000, 2100000, 2050000, 2310000],
    targets: [1900000, 1900000, 2000000, 2150000, 2200000, 2415000] },
  { slug: "dislog-food", kpi: "Commandes",
    values:  [1420, 1380, 1510, 1590, 1560, 1640],
    targets: [1450, 1450, 1550, 1620, 1620, 1722] },
  { slug: "dislog-food", kpi: "Taux de service",
    values:  [94.2, 93.8, 95.1, 96.0, 95.5, 96.3],
    targets: [96.0, 96.0, 96.0, 97.0, 97.0, 97.0] },
  { slug: "dislog-food", kpi: "Clients actifs",
    values:  [312, 318, 325, 330, 328, 335],
    targets: [320, 320, 330, 340, 340, 350] },
  { slug: "dislog-food", kpi: "Stock",
    values:  [8200000, 7900000, 8600000, 8100000, 8400000, 8700000],
    targets: [9000000, 9000000, 9000000, 9000000, 9000000, 9130000] },
  { slug: "dislog-food", kpi: "Unités expédiées",
    values:  [285000, 270000, 310000, 325000, 318000, 342000],
    targets: [300000, 300000, 320000, 340000, 340000, 360000] },
  { slug: "dislog-food", kpi: "Effectifs",
    values:  [145, 145, 148, 148, 150, 150],
    targets: [148, 148, 150, 150, 152, 157] },

  // Megaflex : déclin du taux de service → risque rupture clients
  { slug: "megaflex", kpi: "Chiffre d'affaires",
    values:  [6200000, 5800000, 6500000, 6800000, 6400000, 6100000],
    targets: [6500000, 6500000, 6800000, 7000000, 7000000, 7200000] },
  { slug: "megaflex", kpi: "Marge brute",
    values:  [1116000, 1044000, 1170000, 1224000, 1088000, 1037000],
    targets: [1300000, 1300000, 1360000, 1400000, 1400000, 1440000] },
  { slug: "megaflex", kpi: "EBITDA",
    values:  [434000, 406000, 455000, 476000, 384000, 366000],
    targets: [520000, 520000, 544000, 560000, 560000, 576000] },
  { slug: "megaflex", kpi: "Commandes",
    values:  [520, 490, 545, 570, 510, 488],
    targets: [540, 540, 560, 580, 580, 600] },
  { slug: "megaflex", kpi: "Taux de service",
    values:  [95.5, 94.8, 95.2, 94.5, 93.0, 91.8],  // dégradation → alerte supply
    targets: [96.0, 96.0, 96.0, 96.0, 96.0, 96.0] },
  { slug: "megaflex", kpi: "Clients actifs",
    values:  [148, 145, 150, 152, 148, 143],
    targets: [150, 150, 155, 158, 158, 160] },
  { slug: "megaflex", kpi: "Stock",
    values:  [3800000, 4100000, 4200000, 4500000, 4700000, 4900000],  // surstock croissant
    targets: [3800000, 3800000, 3900000, 4000000, 4000000, 4100000] },
  { slug: "megaflex", kpi: "Unités expédiées",
    values:  [88000, 82000, 92000, 96000, 85000, 80000],
    targets: [90000, 90000, 95000, 98000, 98000, 100000] },
  { slug: "megaflex", kpi: "Effectifs",
    values:  [85, 85, 85, 88, 88, 88],
    targets: [85, 85, 88, 90, 90, 90] },

  // ══ HYGIENE ═══════════════════════════════════════════════════════════════
  // Dislog Hygiene : locomotive du groupe, franchit 50M en mai → record
  { slug: "dislog-hygiene", kpi: "Chiffre d'affaires",
    values:  [42000000, 39500000, 45000000, 48000000, 46500000, 50200000],
    targets: [44000000, 44000000, 46000000, 49000000, 50000000, 52000000] },
  { slug: "dislog-hygiene", kpi: "Marge brute",
    values:  [9660000, 9085000, 10350000, 11040000, 10695000, 11546000],
    targets: [10120000, 10120000, 10580000, 11270000, 11500000, 11960000] },
  { slug: "dislog-hygiene", kpi: "EBITDA",
    values:  [4200000, 3950000, 4500000, 5040000, 4880000, 5270000],
    targets: [4400000, 4400000, 4600000, 5100000, 5200000, 5460000] },
  { slug: "dislog-hygiene", kpi: "Commandes",
    values:  [3200, 3050, 3400, 3620, 3510, 3780],
    targets: [3300, 3300, 3500, 3700, 3700, 3900] },
  { slug: "dislog-hygiene", kpi: "Taux de service",
    values:  [95.5, 94.9, 96.2, 96.8, 96.5, 97.2],
    targets: [96.0, 96.0, 96.5, 97.0, 97.0, 97.5] },
  { slug: "dislog-hygiene", kpi: "Clients actifs",
    values:  [580, 590, 605, 625, 618, 642],
    targets: [590, 590, 610, 630, 630, 650] },
  { slug: "dislog-hygiene", kpi: "Stock",
    values:  [18500000, 17800000, 19200000, 18600000, 19000000, 19800000],
    targets: [19000000, 19000000, 19500000, 19500000, 20000000, 20000000] },
  { slug: "dislog-hygiene", kpi: "Unités expédiées",
    values:  [620000, 590000, 670000, 712000, 692000, 748000],
    targets: [640000, 640000, 680000, 720000, 720000, 760000] },
  { slug: "dislog-hygiene", kpi: "Effectifs",
    values:  [280, 280, 285, 285, 290, 290],
    targets: [282, 282, 286, 288, 292, 295] },

  // ══ HEALTH ════════════════════════════════════════════════════════════════
  // DMD : chute libre sur 5 mois → décision CEO urgente (restructuration ?)
  { slug: "dmd", kpi: "Chiffre d'affaires",
    values:  [15200000, 14500000, 13800000, 13100000, 12300000, 11500000],  // −24% sur 6 mois
    targets: [15500000, 15500000, 15500000, 15500000, 15500000, 15500000] },
  { slug: "dmd", kpi: "Marge brute",
    values:  [4256000, 4060000, 3864000, 3668000, 3444000, 3220000],
    targets: [4340000, 4340000, 4340000, 4340000, 4340000, 4340000] },
  { slug: "dmd", kpi: "EBITDA",
    values:  [2128000, 1885000, 1656000, 1441000, 1107000, 805000],  // EBITDA en chute
    targets: [2170000, 2170000, 2170000, 2170000, 2170000, 2170000] },
  { slug: "dmd", kpi: "Commandes",
    values:  [920, 875, 832, 791, 738, 685],
    targets: [940, 940, 940, 940, 940, 940] },
  { slug: "dmd", kpi: "Taux de service",
    values:  [96.5, 95.8, 94.2, 92.8, 91.5, 90.2],  // ruptures dispositifs médicaux
    targets: [97.0, 97.0, 97.0, 97.0, 97.0, 97.0] },
  { slug: "dmd", kpi: "Clients actifs",
    values:  [225, 218, 210, 198, 185, 172],  // fuite clients
    targets: [230, 230, 232, 235, 235, 238] },
  { slug: "dmd", kpi: "Stock",
    values:  [6800000, 7200000, 7600000, 8100000, 8600000, 9200000],  // stock mort en hausse
    targets: [6500000, 6500000, 6500000, 6500000, 6500000, 6500000] },
  { slug: "dmd", kpi: "Unités expédiées",
    values:  [48000, 45000, 43000, 40000, 37000, 34000],
    targets: [49000, 49000, 49000, 49000, 49000, 49000] },
  { slug: "dmd", kpi: "Effectifs",
    values:  [165, 165, 162, 158, 155, 150],
    targets: [165, 165, 165, 165, 165, 165] },

  // Farmalac : performer solide, régularité exemplaire
  { slug: "farmalac", kpi: "Chiffre d'affaires",
    values:  [7200000, 6900000, 7800000, 8200000, 8000000, 8500000],
    targets: [7500000, 7500000, 8000000, 8500000, 8500000, 8800000] },
  { slug: "farmalac", kpi: "Marge brute",
    values:  [2736000, 2622000, 2964000, 3116000, 3040000, 3230000],
    targets: [2850000, 2850000, 3040000, 3230000, 3230000, 3344000] },
  { slug: "farmalac", kpi: "EBITDA",
    values:  [1368000, 1311000, 1482000, 1558000, 1520000, 1615000],
    targets: [1425000, 1425000, 1520000, 1615000, 1615000, 1672000] },
  { slug: "farmalac", kpi: "Commandes",
    values:  [580, 560, 620, 655, 640, 680],
    targets: [600, 600, 640, 675, 675, 700] },
  { slug: "farmalac", kpi: "Taux de service",
    values:  [97.2, 96.8, 97.5, 97.8, 97.5, 97.9],
    targets: [97.0, 97.0, 97.0, 97.5, 97.5, 97.5] },
  { slug: "farmalac", kpi: "Clients actifs",
    values:  [198, 200, 205, 212, 210, 218],
    targets: [200, 200, 205, 215, 215, 220] },
  { slug: "farmalac", kpi: "Stock",
    values:  [3200000, 3100000, 3400000, 3300000, 3500000, 3600000],
    targets: [3300000, 3300000, 3500000, 3500000, 3600000, 3700000] },
  { slug: "farmalac", kpi: "Unités expédiées",
    values:  [125000, 120000, 135000, 142000, 138000, 148000],
    targets: [130000, 130000, 138000, 146000, 146000, 152000] },
  { slug: "farmalac", kpi: "Effectifs",
    values:  [95, 95, 98, 98, 100, 100],
    targets: [96, 96, 98, 100, 100, 102] },

  // KPH Laboratories : marques premium (Kaline, Argapur) → marges record
  { slug: "kph", kpi: "Chiffre d'affaires",
    values:  [12000000, 11500000, 13000000, 14000000, 13500000, 14800000],
    targets: [12500000, 12500000, 13500000, 14500000, 14500000, 15000000] },
  { slug: "kph", kpi: "Marge brute",
    values:  [5520000, 5290000, 5980000, 6440000, 6210000, 6808000],
    targets: [5750000, 5750000, 6210000, 6670000, 6670000, 6900000] },
  { slug: "kph", kpi: "EBITDA",
    values:  [2880000, 2760000, 3120000, 3360000, 3240000, 3552000],
    targets: [3000000, 3000000, 3240000, 3480000, 3480000, 3600000] },
  { slug: "kph", kpi: "Commandes",
    values:  [820, 790, 870, 925, 900, 960],
    targets: [840, 840, 890, 950, 950, 980] },
  { slug: "kph", kpi: "Taux de service",
    values:  [97.2, 96.8, 97.5, 98.0, 97.8, 98.2],
    targets: [97.5, 97.5, 97.5, 98.0, 98.0, 98.0] },
  { slug: "kph", kpi: "Clients actifs",
    values:  [145, 148, 152, 158, 155, 163],
    targets: [148, 148, 154, 160, 160, 165] },
  { slug: "kph", kpi: "Stock",
    values:  [5800000, 5600000, 6100000, 5900000, 6200000, 6400000],
    targets: [6000000, 6000000, 6200000, 6200000, 6400000, 6500000] },
  { slug: "kph", kpi: "Unités expédiées",
    values:  [68000, 65000, 72000, 76000, 74000, 79000],
    targets: [70000, 70000, 74000, 78000, 78000, 82000] },
  { slug: "kph", kpi: "Effectifs",
    values:  [185, 185, 188, 188, 190, 192],
    targets: [186, 186, 188, 190, 190, 192] },

  // Steripharma : export africain, légèrement sous objectif → vigilance
  { slug: "steripharma", kpi: "Chiffre d'affaires",
    values:  [8500000, 8200000, 9000000, 9500000, 9200000, 9800000],
    targets: [9000000, 9000000, 9500000, 10000000, 10000000, 10500000] },
  { slug: "steripharma", kpi: "Marge brute",
    values:  [3740000, 3608000, 3960000, 4180000, 4048000, 4312000],
    targets: [3960000, 3960000, 4180000, 4400000, 4400000, 4620000] },
  { slug: "steripharma", kpi: "EBITDA",
    values:  [1955000, 1886000, 2070000, 2185000, 2116000, 2254000],
    targets: [2070000, 2070000, 2185000, 2300000, 2300000, 2415000] },
  { slug: "steripharma", kpi: "Commandes",
    values:  [520, 500, 550, 580, 565, 600],
    targets: [550, 550, 575, 605, 605, 630] },
  { slug: "steripharma", kpi: "Taux de service",
    values:  [96.5, 96.0, 97.0, 97.5, 97.2, 97.8],
    targets: [97.0, 97.0, 97.0, 97.5, 97.5, 98.0] },
  { slug: "steripharma", kpi: "Clients actifs",
    values:  [89, 91, 94, 98, 96, 101],
    targets: [92, 92, 96, 100, 100, 105] },
  { slug: "steripharma", kpi: "Stock",
    values:  [3900000, 3700000, 4100000, 3900000, 4100000, 4300000],
    targets: [4000000, 4000000, 4200000, 4200000, 4300000, 4400000] },
  { slug: "steripharma", kpi: "Unités expédiées",
    values:  [42000, 40000, 45000, 48000, 46000, 50000],
    targets: [44000, 44000, 47000, 50000, 50000, 53000] },
  { slug: "steripharma", kpi: "Effectifs",
    values:  [200, 200, 200, 200, 200, 200],
    targets: [200, 200, 200, 202, 202, 205] },

  // Afrobiomedic : forte croissance → opportunité à accélérer pour le CEO
  { slug: "afrobiomedic", kpi: "Chiffre d'affaires",
    values:  [3200000, 3050000, 3500000, 3800000, 4050000, 4350000],  // +35% sur 6 mois
    targets: [3300000, 3300000, 3600000, 3900000, 4000000, 4200000] },
  { slug: "afrobiomedic", kpi: "Marge brute",
    values:  [960000, 915000, 1050000, 1140000, 1215000, 1305000],
    targets: [990000, 990000, 1080000, 1170000, 1200000, 1260000] },
  { slug: "afrobiomedic", kpi: "EBITDA",
    values:  [416000, 396000, 455000, 494000, 526000, 566000],
    targets: [429000, 429000, 468000, 507000, 520000, 546000] },
  { slug: "afrobiomedic", kpi: "Commandes",
    values:  [185, 178, 202, 220, 235, 252],
    targets: [190, 190, 205, 225, 235, 250] },
  { slug: "afrobiomedic", kpi: "Taux de service",
    values:  [95.8, 95.2, 96.5, 97.0, 97.2, 97.5],
    targets: [96.0, 96.0, 96.5, 97.0, 97.0, 97.5] },
  { slug: "afrobiomedic", kpi: "Clients actifs",
    values:  [68, 70, 76, 82, 88, 95],
    targets: [70, 70, 78, 84, 90, 96] },
  { slug: "afrobiomedic", kpi: "Stock",
    values:  [1400000, 1350000, 1520000, 1650000, 1750000, 1880000],
    targets: [1450000, 1450000, 1580000, 1700000, 1800000, 1900000] },
  { slug: "afrobiomedic", kpi: "Unités expédiées",
    values:  [22000, 21000, 24000, 26000, 28000, 30000],
    targets: [23000, 23000, 25000, 27000, 29000, 31000] },
  { slug: "afrobiomedic", kpi: "Effectifs",
    values:  [38, 38, 40, 42, 44, 46],
    targets: [38, 38, 40, 42, 44, 46] },

  // Eramedic : décrochage critique → restructuration ou cession ?
  { slug: "eramedic", kpi: "Chiffre d'affaires",
    values:  [5800000, 5200000, 4800000, 4400000, 4100000, 3800000],  // −34% sur 6 mois
    targets: [5800000, 5800000, 5800000, 5800000, 5800000, 5800000] },
  { slug: "eramedic", kpi: "Marge brute",
    values:  [1276000, 1144000, 1056000, 968000, 861000, 798000],
    targets: [1276000, 1276000, 1276000, 1276000, 1276000, 1276000] },
  { slug: "eramedic", kpi: "EBITDA",
    values:  [580000, 468000, 384000, 308000, 205000, 114000],  // EBITDA quasi-nul
    targets: [580000, 580000, 580000, 580000, 580000, 580000] },
  { slug: "eramedic", kpi: "Commandes",
    values:  [320, 288, 265, 242, 218, 195],
    targets: [325, 325, 325, 325, 325, 325] },
  { slug: "eramedic", kpi: "Taux de service",
    values:  [96.0, 94.5, 92.8, 91.2, 89.5, 87.8],  // effondrement
    targets: [96.5, 96.5, 96.5, 96.5, 96.5, 96.5] },
  { slug: "eramedic", kpi: "Clients actifs",
    values:  [112, 102, 92, 82, 72, 62],  // fuite massive
    targets: [115, 115, 115, 115, 115, 115] },
  { slug: "eramedic", kpi: "Stock",
    values:  [2600000, 2800000, 3100000, 3400000, 3700000, 4000000],  // stock mort
    targets: [2600000, 2600000, 2600000, 2600000, 2600000, 2600000] },
  { slug: "eramedic", kpi: "Unités expédiées",
    values:  [35000, 31000, 28000, 25000, 22000, 19000],
    targets: [36000, 36000, 36000, 36000, 36000, 36000] },
  { slug: "eramedic", kpi: "Effectifs",
    values:  [72, 72, 68, 65, 62, 58],
    targets: [72, 72, 72, 72, 72, 72] },

  // Scomedica : stable, solide, discret
  { slug: "scomedica", kpi: "Chiffre d'affaires",
    values:  [4200000, 4000000, 4300000, 4500000, 4400000, 4600000],
    targets: [4300000, 4300000, 4500000, 4700000, 4700000, 4800000] },
  { slug: "scomedica", kpi: "Marge brute",
    values:  [1134000, 1080000, 1161000, 1215000, 1188000, 1242000],
    targets: [1161000, 1161000, 1215000, 1269000, 1269000, 1296000] },
  { slug: "scomedica", kpi: "EBITDA",
    values:  [546000, 520000, 559000, 585000, 572000, 598000],
    targets: [559000, 559000, 585000, 611000, 611000, 624000] },
  { slug: "scomedica", kpi: "Commandes",
    values:  [285, 272, 292, 305, 298, 312],
    targets: [292, 292, 300, 315, 315, 325] },
  { slug: "scomedica", kpi: "Taux de service",
    values:  [96.8, 96.5, 97.0, 97.2, 97.0, 97.5],
    targets: [97.0, 97.0, 97.0, 97.5, 97.5, 97.5] },
  { slug: "scomedica", kpi: "Clients actifs",
    values:  [88, 88, 90, 93, 92, 95],
    targets: [89, 89, 91, 94, 94, 96] },
  { slug: "scomedica", kpi: "Stock",
    values:  [1850000, 1780000, 1920000, 1880000, 1960000, 2020000],
    targets: [1900000, 1900000, 1950000, 1950000, 2000000, 2050000] },
  { slug: "scomedica", kpi: "Unités expédiées",
    values:  [28000, 26800, 28900, 30200, 29500, 31000],
    targets: [28500, 28500, 29500, 31000, 31000, 32000] },
  { slug: "scomedica", kpi: "Effectifs",
    values:  [52, 52, 52, 54, 54, 54],
    targets: [52, 52, 54, 54, 54, 56] },
];

async function main() {
  console.log("🌱 Seeding Dislog Group — scénario décisionnel CEO…");

  // Divisions
  const food = await prisma.division.upsert({
    where: { name: "Food" }, update: {},
    create: { name: "Food", color: "#f97316" },
  });
  const hygiene = await prisma.division.upsert({
    where: { name: "Hygiene" }, update: {},
    create: { name: "Hygiene", color: "#3b82f6" },
  });
  const health = await prisma.division.upsert({
    where: { name: "Health" }, update: {},
    create: { name: "Health", color: "#22c55e" },
  });

  // Entities
  const entities = [
    { name: "Dislog Food",     slug: "dislog-food",     divisionId: food.id,    description: "Distribution grande conso & snacks — leader national" },
    { name: "Megaflex",        slug: "megaflex",        divisionId: food.id,    description: "Emballages souples & films alimentaires" },
    { name: "Dislog Hygiene",  slug: "dislog-hygiene",  divisionId: hygiene.id, description: "Distributeur exclusif P&G Maroc — ACE, Ariel, Pampers" },
    { name: "DMD",             slug: "dmd",             divisionId: health.id,  description: "Dislog Medical Devices — 5 structures regroupées" },
    { name: "Farmalac",        slug: "farmalac",        divisionId: health.id,  description: "Distribution pharmaceutique — 25 ans d'expérience" },
    { name: "KPH Laboratories",slug: "kph",             divisionId: health.id,  description: "Marques premium Kaline & Argapur — dermo-cosmétique" },
    { name: "Steripharma",     slug: "steripharma",     divisionId: health.id,  description: "Génériques & export — 15 pays africains" },
    { name: "Afrobiomedic",    slug: "afrobiomedic",    divisionId: health.id,  description: "Dispositifs médicaux — forte croissance Afrique subsaharienne" },
    { name: "Eramedic",        slug: "eramedic",        divisionId: health.id,  description: "Équipements médicaux hospitaliers" },
    { name: "Scomedica",       slug: "scomedica",       divisionId: health.id,  description: "Consommables médicaux & stérilisation" },
  ];

  for (const e of entities) {
    await prisma.entity.upsert({
      where: { slug: e.slug }, update: { description: e.description },
      create: e,
    });
  }

  // KPI Definitions
  const kpiDefs = [
    { id: "ca",           name: "Chiffre d'affaires", unit: "MAD",    category: "Financier",    order: 1 },
    { id: "marge",        name: "Marge brute",         unit: "MAD",    category: "Financier",    order: 2 },
    { id: "ebitda",       name: "EBITDA",               unit: "MAD",    category: "Financier",    order: 3 },
    { id: "commandes",    name: "Commandes",             unit: "nb",     category: "Commercial",   order: 4 },
    { id: "taux-service", name: "Taux de service",      unit: "%",      category: "Commercial",   order: 5 },
    { id: "clients",      name: "Clients actifs",        unit: "nb",     category: "Commercial",   order: 6 },
    { id: "stock",        name: "Stock",                 unit: "MAD",    category: "Opérationnel", order: 7 },
    { id: "unites",       name: "Unités expédiées",      unit: "unités", category: "Opérationnel", order: 8 },
    { id: "effectifs",    name: "Effectifs",             unit: "pers.",  category: "Opérationnel", order: 9 },
  ];

  // KPI name → id mapping
  const kpiNameToId: Record<string, string> = {
    "Chiffre d'affaires": "ca",
    "Marge brute":        "marge",
    "EBITDA":             "ebitda",
    "Commandes":          "commandes",
    "Taux de service":    "taux-service",
    "Clients actifs":     "clients",
    "Stock":              "stock",
    "Unités expédiées":   "unites",
    "Effectifs":          "effectifs",
  };

  for (const k of kpiDefs) {
    await prisma.kpiDefinition.upsert({
      where: { id: k.id }, update: { name: k.name, unit: k.unit, category: k.category, order: k.order },
      create: k,
    });
  }

  // Seed entries
  const allEntities = await prisma.entity.findMany();
  let count = 0;

  for (const row of DATA) {
    const entity = allEntities.find(e => e.slug === row.slug);
    if (!entity) { console.warn(`⚠ Entity not found: ${row.slug}`); continue; }

    const kpiId = kpiNameToId[row.kpi];
    if (!kpiId) { console.warn(`⚠ KPI not found: ${row.kpi}`); continue; }

    for (let i = 0; i < PERIODS.length; i++) {
      await prisma.kpiEntry.upsert({
        where: { entityId_kpiDefId_period: { entityId: entity.id, kpiDefId: kpiId, period: PERIODS[i] } },
        update: { value: row.values[i], target: row.targets[i] },
        create: { entityId: entity.id, kpiDefId: kpiId, period: PERIODS[i], value: row.values[i], target: row.targets[i] },
      });
      count++;
    }
  }

  console.log(`✅ ${count} entrées KPI créées`);
  console.log("");
  console.log("📊 Scénario décisionnel actif :");
  console.log("  🔴 DMD         : −24% CA sur 6 mois, EBITDA quasi-nul → décision urgente");
  console.log("  🔴 Eramedic    : −34% CA, taux service 87.8% → restructuration ?");
  console.log("  🟡 Megaflex    : taux service 91.8% ↓, surstock croissant");
  console.log("  🟡 Steripharma : CA sous objectif (93%) export Afrique");
  console.log("  🟢 Dislog Hyg  : record 50.2M MAD en mai");
  console.log("  🟢 KPH Labs    : marge 46%, trajectoire record");
  console.log("  🟢 Afrobiomedic: +35% sur 6 mois → accélération à décider");
}

main().catch(console.error).finally(() => prisma.$disconnect());
