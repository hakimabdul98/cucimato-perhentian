/* GET /api/promo?code=RAYA10&type=ferry|airport — check a promo code for the booking sheet.
   The discount is applied again on the server in /api/pay, so this is only a preview. */
import { json } from "../_lib/hitpay.js";
import { findPromo } from "../_lib/promo.js";

export async function onRequestGet({ request, env }) {
  const qs = new URL(request.url).searchParams;
  const type = qs.get("type") === "airport" ? "airport" : "ferry";
  const p = await findPromo(env, qs.get("code"), type);
  return p.error ? json({ error: p.error }, 400) : json(p);
}
