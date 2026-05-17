import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const entities = await prisma.entity.findMany({
    include: { division: true },
    orderBy: [{ division: { name: "asc" } }, { name: "asc" }],
  });
  return NextResponse.json(entities);
}
