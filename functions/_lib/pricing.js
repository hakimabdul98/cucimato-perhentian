/* Server-side prices. The browser never decides the amount: it only sends the
   trip details, and the price is worked out here again.
   Keep in step with FERRY / AIRPORT in script.js. */

export const FERRY = {
  return: { adult: 80, child: 50 },
  oneway: { adult: 40, child: 25 },
};
// Optional snorkeling trips at the Book a ferry checkout, per person, for every passenger on the booking
export const FERRY_ADDONS = {
  perhentian: { name: "Perhentian Island Snorkeling Trip", adult: 55, child: 30 },
  rawa: { name: "Rawa Island Snorkeling Trip", adult: 80, child: 50 },
  redang: { name: "Redang Island Snorkeling Trip", adult: 180, child: 100 },
};

/* Airport transfer to/from Kuala Besut Jetty.
   shared: RM per person, per way (null = no shared service).
   private: RM per vehicle, per way, one price per size in VEHICLES (published rate + RM20). */
export const AIRPORT = {
  KBR: { name: "Kota Bharu Airport (KBR)", airport: true, shared: { adult: 35, child: 30 }, private: [130, 215, 265, 315] },
  TGG: { name: "Kuala Terengganu Airport (TGG)", airport: true, shared: null, private: [200, 275, 325, 375] },
};
export const VEHICLES = [
  { max: 4, name: "Car (1–4 pax)" },
  { max: 8, name: "8-seater van" },
  { max: 12, name: "12-seater van" },
  { max: 15, name: "15-seater van" },
];
export const SHARED_MIN = 2;
// Transaction fee added to every online payment, whatever the method (shown to the customer before paying)
export const TXN_FEE_PERCENT = 4;
export const txnFee = (base) => Math.round(base * TXN_FEE_PERCENT) / 100;
// Shared van schedule (departure times). Private: any listed time.
export const SHARED_TIMES = { fromPlace: ["8:00 AM", "11:00 AM", "3:00 PM"], fromJetty: ["9:00 AM", "1:00 PM", "5:00 PM"] };

const JETTY = "Kuala Besut Jetty";
const ISLAND = "Perhentian Island";
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);
const isTime = (s) => typeof s === "string" && /^\d{1,2}:\d{2} (AM|PM)$/.test(s);
const count = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;

// Booking season (inclusive). Keep in step with SEASON in script.js.
export const SEASON = { start: "2027-02-15", end: "2027-10-15", label: "15 Feb – 15 Oct 2027" };
const inSeason = (iso) => iso >= SEASON.start && iso <= SEASON.end;

/* Returns { amount, purpose, summary } or { error } */
export function quote(b) {
  if (!b || typeof b !== "object") return { error: "Missing booking." };
  const oneway = b.trip === "oneway";
  if (!["oneway", "return"].includes(b.trip)) return { error: "Choose one-way or return." };
  if (!isDate(b.date)) return { error: "Choose a date." };
  if (!oneway && !isDate(b.returnDate)) return { error: "Choose a return date." };
  if (!oneway && b.returnDate < b.date) return { error: "Return date is before the first date." };
  if (!inSeason(b.date) || (!oneway && !inSeason(b.returnDate))) return { error: `Off season. We take bookings for ${SEASON.label} only.` };

  if (b.type === "ferry") {
    const adults = Number(b.adults), children = Number(b.children || 0);
    if (!count(adults, 1, 99) || !count(children, 0, 99)) return { error: "Check the number of passengers." };
    if (!isTime(b.time) || (!oneway && !isTime(b.returnTime))) return { error: "Choose your boat times." };
    const p = FERRY[b.trip];
    const toJetty = oneway && b.direction === "toJetty";
    const [from, to] = toJetty ? [ISLAND, JETTY] : [JETTY, ISLAND];
    // Add-ons: [{ id, adults, children }] (people joining that trip, up to the ferry numbers)
    const raw = Array.isArray(b.addons) ? b.addons : [];
    const addons = [], seen = new Set();
    for (const x of raw) {
      const id = typeof x === "string" ? x : x && x.id;
      if (!FERRY_ADDONS[id] || seen.has(id)) return { error: "Please check the add-on trip." };
      const a = typeof x === "string" ? adults : Number(x.adults), c = typeof x === "string" ? children : Number(x.children || 0);
      if (!count(a, 0, adults) || !count(c, 0, children) || a + c < 1) return { error: "Please check the number of people on the add-on trip." };
      seen.add(id); addons.push({ id, adults: a, children: c });
    }
    const addonAmount = addons.reduce((t, x) => t + x.adults * FERRY_ADDONS[x.id].adult + x.children * FERRY_ADDONS[x.id].child, 0);
    return {
      amount: adults * p.adult + children * p.child + addonAmount,
      purpose: `Ferry ticket ${oneway ? "one-way" : "return"}: ${from} → ${to}${addons.length ? " + " + addons.map(x => FERRY_ADDONS[x.id].name).join(" + ") : ""}`,
      summary: { type: "ferry", trip: b.trip, from, to, date: b.date, time: b.time, returnDate: oneway ? "" : b.returnDate, returnTime: oneway ? "" : b.returnTime, adults, children, addons },
    };
  }

  if (b.type === "airport") {
    const a = AIRPORT[b.airport];
    if (!a) return { error: "Choose an airport." };
    const service = b.service === "shared" ? "shared" : b.service === "private" ? "private" : "";
    if (!service) return { error: "Choose shared or private." };
    const adults = Number(b.adults), children = Number(b.children || 0);
    if (!count(adults, 1, 30) || !count(children, 0, 30)) return { error: "Check the number of passengers." };
    const pax = adults + children;
    if (!isTime(b.time) || (!oneway && !isTime(b.returnTime))) return { error: "Choose your pick-up times." };
    const fromPlace = !oneway || b.direction !== "toAirport";
    const ways = oneway ? 1 : 2;
    let amount, vehicle = "";
    if (service === "shared") {
      if (!a.shared) return { error: "Shared transfer isn't available here. Please choose private." };
      if (pax < SHARED_MIN) return { error: "Shared transfer needs at least 2 passengers. Please choose private." };
      const first = fromPlace ? SHARED_TIMES.fromPlace : SHARED_TIMES.fromJetty;
      if (!first.includes(b.time) || (!oneway && !SHARED_TIMES.fromJetty.includes(b.returnTime))) return { error: "Please choose a shared transfer time." };
      amount = (adults * a.shared.adult + children * a.shared.child) * ways;
    } else {
      const v = VEHICLES.findIndex(x => pax <= x.max);
      if (v < 0) return { error: "For more than 15 passengers, please WhatsApp us." };
      amount = a.private[v] * ways;
      vehicle = VEHICLES[v].name;
    }
    const [from, to] = fromPlace ? [a.name, JETTY] : [JETTY, a.name];
    return {
      amount,
      purpose: `Airport transfer (${service}${vehicle ? ", " + vehicle : ""}) ${oneway ? "one-way" : "return"}: ${from} → ${to}`,
      summary: { type: "airport", trip: b.trip, service, vehicle, from, to, date: b.date, time: b.time, returnDate: oneway ? "" : b.returnDate, returnTime: oneway ? "" : b.returnTime, adults, children, pax },
    };
  }
  return { error: "Unknown booking type." };
}
