/* Server-side prices. The browser never decides the amount: it only sends the
   trip details, and the price is worked out here again.
   Keep in step with FERRY / AIRPORT in script.js. */

export const FERRY = {
  return: { adult: 80, child: 40 },
  oneway: { adult: 40, child: 20 },
};

// Airport transfer, per adult per way. null = no online price yet (WhatsApp only).
export const AIRPORT = {
  KBR: { name: "Kota Bharu Airport (KBR)", shared: 35, private: null },
  TGG: { name: "Kuala Terengganu Airport (TGG)", private: null },
};

const JETTY = "Kuala Besut Jetty";
const ISLAND = "Perhentian Island";
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => typeof s === "string" && /^\d{1,2}:\d{2} (AM|PM)$/.test(s);
const count = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

/* Returns { amount, purpose, summary } or { error } */
export function quote(b) {
  if (!b || typeof b !== "object") return { error: "Missing booking." };
  const oneway = b.trip === "oneway";
  if (!["oneway", "return"].includes(b.trip)) return { error: "Choose one-way or return." };
  if (!isDate(b.date)) return { error: "Choose a date." };
  if (!oneway && !isDate(b.returnDate)) return { error: "Choose a return date." };
  if (!oneway && b.returnDate < b.date) return { error: "Return date is before the first date." };

  if (b.type === "ferry") {
    const adults = Number(b.adults), children = Number(b.children || 0);
    if (!count(adults, 1, 99) || !count(children, 0, 99)) return { error: "Check the number of passengers." };
    if (!isTime(b.time) || (!oneway && !isTime(b.returnTime))) return { error: "Choose your boat times." };
    const p = FERRY[b.trip];
    const toJetty = oneway && b.direction === "toJetty";
    const [from, to] = toJetty ? [ISLAND, JETTY] : [JETTY, ISLAND];
    return {
      amount: adults * p.adult + children * p.child,
      purpose: `Ferry ticket ${oneway ? "one-way" : "return"}: ${from} → ${to}`,
      summary: { type: "ferry", trip: b.trip, from, to, date: b.date, time: b.time, returnDate: oneway ? "" : b.returnDate, returnTime: oneway ? "" : b.returnTime, adults, children },
    };
  }

  if (b.type === "airport") {
    const a = AIRPORT[b.airport];
    if (!a) return { error: "Choose an airport." };
    const service = b.service;
    const price = a[service];
    if (price == null) return { error: "This transfer is booked on WhatsApp for now." };
    const pax = Number(b.pax);
    if (!count(pax, 1, 30)) return { error: "Check the number of passengers." };
    if (!isTime(b.time) || (!oneway && !isTime(b.returnTime))) return { error: "Choose your pick-up times." };
    const fromAirport = !oneway || b.direction !== "toAirport";
    const [from, to] = fromAirport ? [a.name, JETTY] : [JETTY, a.name];
    return {
      amount: price * pax * (oneway ? 1 : 2),
      purpose: `Airport transfer (${service}) ${oneway ? "one-way" : "return"}: ${from} → ${to}`,
      summary: { type: "airport", trip: b.trip, service, from, to, date: b.date, time: b.time, returnDate: oneway ? "" : b.returnDate, returnTime: oneway ? "" : b.returnTime, pax },
    };
  }
  return { error: "Unknown booking type." };
}
