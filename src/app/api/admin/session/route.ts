import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifySessionCookie } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// GET /api/admin/session — does the caller have a valid admin_session cookie?
// Used by the /admin layout gate on load to decide login-form vs dashboard.
export async function GET() {
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return NextResponse.json({ authenticated: verifySessionCookie(cookie) });
}
