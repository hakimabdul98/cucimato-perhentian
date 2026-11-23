/* POST /api/pay  — create a HitPay payment request and return its checkout URL.
   Body (JSON): booking details + { name, email, phone }.
   The amount is calculated on the server (functions/_lib/pricing.js). */
import { quote } from "../_lib/pricing.js";
import { API_BASE, hitpayHeaders, json } from "../_lib/hitpay.js";

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

export async function onRequestPost({ request, env }) {
  if (!env.HITPAY_API_KEY) return json({ error: "Online payment is not set up yet. Please WhatsApp us." }, 503);

  let body;
  try { body = await request.json(); } catch { return json({ error: "Bad request." }, 400); }

  const q = quote(body);
  if (q.error) return json({ error: q.error }, 400);

  const name = clean(body.name, 80), email = clean(body.email, 120), phone = clean(body.phone, 30);
  if (name.length < 2) return json({ error: "Please enter your full name." }, 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return json({ error: "Please enter a valid email." }, 400);

  // Our own reference, e.g. CW-261126-4F7K (shown to the customer and stored in HitPay)
  const d = q.summary.date.replace(/-/g, "").slice(2);
  const rand = [...crypto.getRandomValues(new Uint8Array(4))].map(n => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[n % 32]).join("");
  const reference = `CW-${d}-${rand}`;

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    amount: q.amount.toFixed(2),
    currency: "MYR",
    name, email,
    purpose: q.purpose.slice(0, 255),
    reference_number: reference,
    redirect_url: `${origin}/payment`,   // Pages serves payment.html at /payment
  });

  const res = await fetch(`${API_BASE(env)}/payment-requests`, { method: "POST", headers: hitpayHeaders(env), body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    console.log("hitpay create failed", res.status, JSON.stringify(data).slice(0, 500));
    return json({ error: "We couldn't start the payment. Please try again or WhatsApp us." }, 502);
  }

  // Phone and the trip summary travel with the booking form submission on the website side.
  console.log("payment request", reference, data.id, q.amount, phone ? "phone given" : "no phone");
  return json({ url: data.url, id: data.id, reference, amount: q.amount });
}

export const onRequest = () => json({ error: "Use POST." }, 405);
