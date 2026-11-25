/* Promo codes live in the Google Sheet "Cucimato Promo Codes 2027" (tab PROMO_CODES, view-only link).
   Its file ID is the Pages variable PROMO_SHEET_ID. Columns:
     Code | Type (Percent or RM) | Value | Start | End (yyyy-mm-dd) | Applies (All, Ferry, Airport)
     | MaxUses (empty = no limit) | Used (counted by the booking app) | Active (YES/NO) | Notes
   The booking app adds 1 to Used each time a paid booking uses the code. */

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = "";
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

const todayMY = () => new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10);

// Returns { code, kind: "percent" | "rm", value, label } or { error }
export async function findPromo(env, code, type) {
  const id = String(env.PROMO_SHEET_ID || "").trim();
  if (!id) return { error: "Promo codes aren't available right now." };
  const want = String(code || "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{2,24}$/.test(want)) return { error: "Please check the promo code." };

  let rows;
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${id}/export?format=csv&gid=0`, { redirect: "follow", cf: { cacheTtl: 30, cacheEverything: true } });
    if (!res.ok) throw new Error(String(res.status));
    rows = parseCsv(await res.text());
  } catch (e) {
    console.log("promo sheet", String(e));
    return { error: "We couldn't check the promo code. Please try again." };
  }
  const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
  const col = (k) => head.indexOf(k);
  const r = rows.find(x => String(x[col("code")] || "").trim().toUpperCase() === want);
  if (!r) return { error: "This promo code isn't valid." };
  const g = (k) => String(r[col(k)] ?? "").trim();

  if (g("active").toUpperCase() !== "YES") return { error: "This promo code isn't active." };
  const today = todayMY(), start = g("start"), end = g("end");
  if (start && today < start) return { error: `This promo code starts on ${start}.` };
  if (end && today > end) return { error: "This promo code has ended." };
  const applies = (g("applies") || "All").toLowerCase();
  if (applies !== "all" && applies !== type) return { error: `This promo code is for ${applies === "ferry" ? "ferry tickets" : "airport transfers"} only.` };
  const max = Number(g("maxuses") || 0), used = Number(g("used") || 0);
  if (max > 0 && used >= max) return { error: "This promo code has been fully used." };
  const kind = /^p/i.test(g("type")) ? "percent" : "rm";
  const value = Number(g("value").replace(/[^\d.]/g, ""));
  if (!(value > 0) || (kind === "percent" && value > 100)) return { error: "This promo code isn't valid." };
  return { code: want, kind, value, label: kind === "percent" ? `${value}% off` : `RM${value} off` };
}

// Discount in RM on the trip price (never more than the price)
export const promoDiscount = (p, base) =>
  !p || p.error ? 0 : Math.min(base, Math.round((p.kind === "percent" ? base * p.value / 100 : p.value) * 100) / 100);
