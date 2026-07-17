import crypto from "node:crypto";

// Stateless signed-cookie session for the single-password /admin gate.
// No session store: the cookie carries its own expiry + an HMAC (keyed on
// ADMIN_PASSWORD) proving it was minted by this server, so verification is
// just "recompute the HMAC and compare" — no DB round-trip.

export const ADMIN_COOKIE_NAME = "admin_session";
export const ADMIN_SESSION_DAYS = 7;

function secret(): string {
  const s = process.env.ADMIN_PASSWORD;
  if (!s) throw new Error("ADMIN_PASSWORD is not set");
  return s;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("hex");
}

/** Constant-time string compare (avoids leaking length/content via timing). */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) {
    // Still run a comparison of equal-length buffers so failure timing
    // doesn't depend on whether the length check itself short-circuited.
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Does the submitted password match ADMIN_PASSWORD? */
export function verifyPassword(submitted: string): boolean {
  return timingSafeEqual(submitted, secret());
}

/** Mint a new signed session cookie value, valid for ADMIN_SESSION_DAYS. */
export function createSessionCookie(): { value: string; maxAgeSeconds: number } {
  const maxAgeSeconds = ADMIN_SESSION_DAYS * 24 * 60 * 60;
  const expiresAt = Date.now() + maxAgeSeconds * 1000;
  const payload = String(expiresAt);
  const value = `${payload}.${sign(payload)}`;
  return { value, maxAgeSeconds };
}

/** Verify a session cookie value (signature + not expired). */
export function verifySessionCookie(value: string | undefined): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot === -1) return false;
  const payload = value.slice(0, dot);
  const sig = value.slice(dot + 1);
  if (!timingSafeEqual(sig, sign(payload))) return false;
  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
