import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { SESSION_COOKIE } from "@/lib/passcode";

export async function GET() {
  const store = await cookies();
  const unlocked = store.get(SESSION_COOKIE)?.value === "unlocked";
  return NextResponse.json({ unlocked });
}
