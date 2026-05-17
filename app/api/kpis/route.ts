import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period");
  const entityId = searchParams.get("entityId");
  const entitySlug = searchParams.get("slug");

  const where: any = {};
  if (period) where.period = period;
  if (entityId) where.entityId = entityId;
  if (entitySlug) where.entity = { slug: entitySlug };

  const entries = await prisma.kpiEntry.findMany({
    where,
    include: { kpiDef: true, entity: { include: { division: true } } },
    orderBy: [{ period: "asc" }, { kpiDef: { order: "asc" } }],
  });
  return NextResponse.json(entries);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { entityId, kpiDefId, period, value, target, note } = body;

  const entry = await prisma.kpiEntry.upsert({
    where: { entityId_kpiDefId_period: { entityId, kpiDefId, period } },
    update: { value, target, note },
    create: { entityId, kpiDefId, period, value, target, note },
    include: { kpiDef: true },
  });
  return NextResponse.json(entry);
}
