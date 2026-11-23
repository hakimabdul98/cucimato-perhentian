/* POST /api/hitpay-webhook — HitPay event webhook (payment_request.completed / .failed).
   Register this URL in HitPay: Developers > Webhook Endpoints, and copy that endpoint's
   salt into the Pages secret HITPAY_WEBHOOK_SALT.
   Every request is checked with HMAC-SHA256(raw body, salt) against the Hitpay-Signature header. */
import { hmacHex, safeEqual, json } from "../_lib/hitpay.js";

export async function onRequestPost({ request, env }) {
  const raw = await request.text();
  const sig = request.headers.get("Hitpay-Signature") || "";
  if (!env.HITPAY_WEBHOOK_SALT) return json({ error: "Not set up." }, 503);
  const expected = await hmacHex(env.HITPAY_WEBHOOK_SALT, raw);
  if (!safeEqual(sig.toLowerCase(), expected)) {
    console.log("webhook: bad signature");
    return json({ error: "Bad signature." }, 401);
  }

  let evt;
  try { evt = JSON.parse(raw); } catch { return json({ error: "Bad body." }, 400); }
  const type = request.headers.get("Hitpay-Event-Type") || "";
  const object = request.headers.get("Hitpay-Event-Object") || "";
  console.log("webhook ok", object, type, evt.reference_number, evt.status, evt.amount);

  // Next step: hand the paid booking to the booking app (mark PAID, receipt, e-ticket email).
  if (env.BOOKING_APP_URL && env.BOOKING_APP_TOKEN && evt.status === "completed") {
    const r = await fetch(env.BOOKING_APP_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: env.BOOKING_APP_TOKEN, event: "payment_completed", payment: {
        id: evt.id, reference: evt.reference_number, amount: evt.amount, currency: evt.currency,
        email: evt.email, name: evt.name, purpose: evt.purpose, paidAt: evt.updated_at,
      } }),
    }).catch(e => ({ ok: false, status: String(e) }));
    console.log("booking app", r.status);
  }
  return json({ ok: true });
}
