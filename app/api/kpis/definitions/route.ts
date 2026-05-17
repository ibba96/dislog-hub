import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const defs = await prisma.kpiDefinition.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json(defs);
}
