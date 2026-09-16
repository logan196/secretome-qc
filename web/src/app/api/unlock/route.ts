import { NextResponse } from "next/server";

import { MEETING_PASSCODE, SESSION_COOKIE } from "@/lib/passcode";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { passcode?: unknown } | null;
  const passcode = typeof body?.passcode === "string" ? body.passcode : "";
  const expected = process.env.SECRETOMEQC_PASSCODE ?? MEETING_PASSCODE;

  if (passcode !== expected) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "unlocked",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
