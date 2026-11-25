/* POST /api/pay  — create a HitPay payment request and return its checkout URL.
   Body (JSON): booking details + { name, email, phone }.
   The amount is calculated on the server (functions/_lib/pricing.js). */
import { quote, txnFee, TXN_FEE_PERCENT } from "../_lib/pricing.js";
import { findPromo, promoDiscount } from "../_lib/promo.js";
import { API_BASE, hitpayHeaders, json, payMode, tellBookingApp } from "../_lib/hitpay.js";

const clean = (s, max) => String(s ?? "").replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, max);

// GET /api/pay — is online payment on? The page asks this on load and shows "Pay now" only when it is.
export function onRequestGet({ env }) {
  const mode = payMode(env);
  return json({ enabled: Boolean(mode), test: mode === "sandbox" });
}

export async function onRequestPost({ request, env }) {
  const mode = payMode(env);
  if (!mode) return json({ error: "Online payment is not set up yet. Please WhatsApp us." }, 503);

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

  // Promo code (checked again here, never trusted from the page), then the 4% transaction fee
  // on the price after the discount (same fee for every payment method)
  let promo = null, discount = 0;
  if (String(body.promo || "").trim()) {
    promo = await findPromo(env, body.promo, body.type === "airport" ? "airport" : "ferry");
    if (promo.error) return json({ error: promo.error }, 400);
    discount = promoDiscount(promo, q.amount);
  }
  const net = Math.round((q.amount - discount) * 100) / 100;
  if (net < 1) return json({ error: "This promo code can't be used for this booking." }, 400);
  const fee = txnFee(net), total = Math.round((net + fee) * 100) / 100;

  const origin = new URL(request.url).origin;
  const form = new URLSearchParams({
    amount: total.toFixed(2),
    currency: "MYR",
    name, email,
    purpose: `${q.purpose}${promo ? `, promo ${promo.code}` : ""} (incl. ${TXN_FEE_PERCENT}% transaction fee)`.slice(0, 255),
    reference_number: reference,
    redirect_url: `${origin}/payment`,   // Pages serves payment.html at /payment
  });

  const res = await fetch(`${API_BASE(env)}/payment-requests`, { method: "POST", headers: hitpayHeaders(env), body: form });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) {
    console.log("hitpay create failed", res.status, JSON.stringify(data).slice(0, 500));
    // In sandbox only, pass HitPay's own error text back to help testing (never includes keys)
    const debug = mode === "live" ? undefined : { status: res.status, message: data.message || data.error || data.errors || null };
    return json({ error: "We couldn't start the payment. Please try again or WhatsApp us.", debug }, 502);
  }

  // Hand the trip details to the booking app now; it confirms them once HitPay says "paid".
  const pick = ["type", "trip", "direction", "airport", "service", "package", "date", "returnDate", "time", "returnTime", "adults", "children"];
  const booking = Object.fromEntries(pick.map(k => [k, body[k] ?? ""]));
  if (body.type === "ferry") booking.addons = q.summary.addons || [];
  if (body.type !== "airport") booking.stay = clean(body.stay, 80);   // where they stay on the island (optional)
  booking.base = q.amount; booking.fee = fee; booking.feePercent = TXN_FEE_PERCENT;
  if (promo) { booking.promo = promo.code; booking.discount = discount; }
  // Airport extras: passengers and vehicle as priced here, plus flight details / city address from the customer
  if (body.type === "airport") {
    booking.pax = q.summary.pax; booking.vehicle = q.summary.vehicle;
    for (const k of ["arrAirline", "arrFlight", "depAirline", "depFlight"]) booking[k] = clean(body[k], 40);
    booking.address = clean(body.address, 160);
  }
  const app = await tellBookingApp({ stage: "created", paymentId: data.id, reference, amount: total, booking: { ...booking, name, email, phone } });
  console.log("payment request", reference, data.id, total, "booking app", app);
  return json({ url: data.url, id: data.id, reference, amount: total });
}

