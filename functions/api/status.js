/* GET /api/status?id=<payment request id> — ask HitPay for the real status.
   Used by payment.html, because the redirect back from HitPay alone can be faked. */
import { API_BASE, hitpayHeaders, hmacHex, json, payMode, safeEqual, tellBookingApp } from "../_lib/hitpay.js";

export async function onRequestGet({ request, env, waitUntil }) {
  const qs = new URL(request.url).searchParams;
  const id = qs.get("id") || "";
  // Free booking (100% promo): no HitPay payment, valid only with the token made in /api/pay
  if (/^FREE-[A-Z0-9-]{6,40}$/.test(id)) {
    const t = String(qs.get("t") || "").toLowerCase();
    if (!env.HITPAY_WEBHOOK_SALT) return json({ error: "Not set up." }, 503);
    const ok = safeEqual(t, await hmacHex(env.HITPAY_WEBHOOK_SALT, `free|${id}`));
    if (!ok) return json({ error: "Not found." }, 404);
    return json({ status: "completed", amount: "0.00", currency: "MYR", reference: id.slice(5), purpose: "Free booking (promo code)", free: true });
  }
  if (!/^[0-9a-f-]{20,64}$/i.test(id)) return json({ error: "Bad id." }, 400);
  if (!payMode(env)) return json({ error: "Not set up." }, 503);

  const res = await fetch(`${API_BASE(env)}/payment-requests/${id}`, { headers: hitpayHeaders(env) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: "Not found." }, 404);
  // Back-up for the webhook: when the customer lands on /payment and it is paid, nudge the booking app too.
  // The app itself calls with quiet=1 so this never loops; repeats are ignored by the app.
  if (d.status === "completed" && !qs.get("quiet")) {
    waitUntil(tellBookingApp({ stage: "completed", paymentId: id, reference: d.reference_number }));
  }
  return json({
    status: d.status,                       // pending | completed | ...
    amount: d.amount, currency: d.currency,
    reference: d.reference_number, purpose: d.purpose,
  });
}
