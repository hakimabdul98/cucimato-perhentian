/* GET /api/status?id=<payment request id> — ask HitPay for the real status.
   Used by payment.html, because the redirect back from HitPay alone can be faked. */
import { API_BASE, hitpayHeaders, json } from "../_lib/hitpay.js";

export async function onRequestGet({ request, env }) {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!/^[0-9a-f-]{20,64}$/i.test(id)) return json({ error: "Bad id." }, 400);
  if (!env.HITPAY_API_KEY) return json({ error: "Not set up." }, 503);

  const res = await fetch(`${API_BASE(env)}/payment-requests/${id}`, { headers: hitpayHeaders(env) });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) return json({ error: "Not found." }, 404);
  return json({
    status: d.status,                       // pending | completed | ...
    amount: d.amount, currency: d.currency,
    reference: d.reference_number, purpose: d.purpose,
  });
}
