/* Shared helpers for the payment functions (Cloudflare Pages Functions).
   Secrets come from the Pages project settings, never from this repo:
     HITPAY_API_KEY       business API key (sandbox or live)
     HITPAY_WEBHOOK_SALT  salt of the webhook endpoint (Developers > Webhook Endpoints)
     HITPAY_MODE          "sandbox" or "live" (required: anything else means payments are off)
*/

// "live" | "sandbox" when payments are fully set up, otherwise null (the site then hides "Pay now")
export function payMode(env) {
  const m = String(env.HITPAY_MODE || "").trim().toLowerCase();
  if ((m === "live" || m === "sandbox") && String(env.HITPAY_API_KEY || "").trim()) return m;
  return null;
}

export const API_BASE = (env) =>
  payMode(env) === "live" ? "https://api.hit-pay.com/v1" : "https://api.sandbox.hit-pay.com/v1";

export const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export const hitpayHeaders = (env) => ({
  "X-BUSINESS-API-KEY": String(env.HITPAY_API_KEY || "").trim(),  // trim: pasted keys often carry a space or newline
  "X-Requested-With": "XMLHttpRequest",
  "Content-Type": "application/x-www-form-urlencoded",
});

// HMAC-SHA256 of the raw body with the webhook salt, hex encoded (HitPay event webhooks)
export async function hmacHex(secret, body) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}

// Constant-time string compare
export function safeEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

/* The booking app (Google Apps Script) listens to one hidden Google Form.
   Messages are not trusted there: the app re-checks the payment through /api/status. */
export const BOOKING_APP_FORM = {
  url: "https://docs.google.com/forms/d/e/1FAIpQLSfZBZ29-qx3KWfvTkTdnQheKYzXzwRR57L3fYttr-bf-Stsog/formResponse",
  entry: "entry.1836089793",
};

export async function tellBookingApp(payload) {
  try {
    const body = new URLSearchParams({ [BOOKING_APP_FORM.entry]: JSON.stringify(payload).slice(0, 4000) });
    const r = await fetch(BOOKING_APP_FORM.url, { method: "POST", body });
    return r.status;
  } catch (e) { return String(e); }
}
