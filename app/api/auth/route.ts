import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.DASHBOARD_PASSWORD ?? "Dislog2026";

export async function POST(req: NextRequest) {
  const { password } = await req.json();

  if (password !== PASSWORD) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set("dislog_auth", "1", {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24, // 24h
    sameSite: "lax",
  });
  return res;
}
