/* GET /api/status?id=<payment request id> — ask HitPay for the real status.
   Used by payment.html, because the redirect back from HitPay alone can be faked. */
import { API_BASE, hitpayHeaders, json, payMode, tellBookingApp } from "../_lib/hitpay.js";

export async function onRequestGet({ request, env, waitUntil }) {
  const qs = new URL(request.url).searchParams;
  const id = qs.get("id") || "";
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
