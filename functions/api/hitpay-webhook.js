/* POST /api/hitpay-webhook — HitPay event webhook (payment_request.completed / .failed).
   Register this URL in HitPay: Developers > Webhook Endpoints, and copy that endpoint's
   salt into the Pages secret HITPAY_WEBHOOK_SALT.
   Every request is checked with HMAC-SHA256(raw body, salt) against the Hitpay-Signature header. */
import { hmacHex, safeEqual, json, tellBookingApp } from "../_lib/hitpay.js";

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

  // Paid: tell the booking app (it re-checks with HitPay, then marks PAID, makes the receipt and emails the e-ticket)
  if (evt.status === "completed" && evt.id) {
    const app = await tellBookingApp({ stage: "completed", paymentId: evt.id, reference: evt.reference_number, name: evt.name, email: evt.email });
    console.log("booking app", app);
  }
  return json({ ok: true });
}
