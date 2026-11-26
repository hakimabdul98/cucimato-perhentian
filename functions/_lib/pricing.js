/* Server-side prices. The browser never decides the amount: it only sends the
   trip details, and the price is worked out here again.
   Keep in step with FERRY / GROUND_TRIPS / AIRPORT in script.js. */

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

// Ground packages (Ferry + snorkeling trip): return ferry + one snorkeling trip, per person. Keep in step with GROUND_TRIPS in script.js.
export const GROUND = {
  perhentian: { name: "Ferry + Perhentian Island Snorkeling Trip", adult: 135, child: 80 },
  rawa: { name: "Ferry + Rawa Island Snorkeling Trip", adult: 155, child: 100 },
  redang: { name: "Ferry + Redang Island Snorkeling Trip", adult: 200, child: 120 },
};

/* Snorkeling days. Trips start 9:00 AM (Redang) or 10:00 AM (Perhentian, Rawa); one trip per day.
   Day 1: 8:00 AM boat for Redang, 8:00/9:00 AM for Perhentian/Rawa.
   Last day (going home): no snorkeling.
   Packages: 2D1N = package trip on day 1, no add-on; 3D2N+ = any day but the last, add-on must be another island.
   Add-ons only on return ferry tickets.
   Keep in step with SNORKEL in script.js. */
export const SNORKEL = {
  start: { perhentian: "10:00 AM", rawa: "10:00 AM", redang: "9:00 AM" },
  early: { perhentian: ["8:00 AM", "9:00 AM"], rawa: ["8:00 AM", "9:00 AM"], redang: ["8:00 AM"] },
};
const ISLAND = { perhentian: "Perhentian Island", rawa: "Rawa Island", redang: "Redang Island" };
// trips: [{ id, day, included }] -> { schedule: [{ id, name, day, date, time, included }] } or { error }
function planSnorkel(b, trips, nDays) {
  const seen = new Set();
  for (const t of trips) {
    const name = `${ISLAND[t.id]} snorkeling`;
    if (!Number.isInteger(t.day) || t.day < 1 || t.day > nDays) return { error: `Please choose a day for the ${name}.` };
    if (t.day === nDays) return { error: `Snorkeling can't be on your last day. Please choose another day for the ${name}.` };
    if (seen.has(t.day)) return { error: "Only one snorkeling trip per day, please choose another day." };
    seen.add(t.day);
    if (t.day === 1 && !SNORKEL.early[t.id].includes(b.time)) return { error: `The ${name} on day 1 needs the ${SNORKEL.early[t.id].join(" or ")} boat.` };
  }
  return { schedule: trips.map(t => ({ id: t.id, name: ISLAND[t.id], day: t.day, date: addDays(b.date, t.day - 1), time: SNORKEL.start[t.id], included: Boolean(t.included) })).sort((a, z) => a.day - z.day) };
}
// Add-on list from the page: [{ id, adults, children, day? }] (people joining, up to the booking's numbers)
function readAddons(raw, adults, children, allowed) {
  const out = [], seen = new Set();
  for (const x of Array.isArray(raw) ? raw : []) {
    const id = typeof x === "string" ? x : x && x.id;
    if (!FERRY_ADDONS[id] || seen.has(id) || (allowed && !allowed.includes(id))) return { error: "Please check the add-on trip." };
    const a = typeof x === "string" ? adults : Number(x.adults), c = typeof x === "string" ? children : Number(x.children || 0);
    if (!count(a, 0, adults) || !count(c, 0, children) || a + c < 1) return { error: "Please check the number of people on the add-on trip." };
    seen.add(id); out.push({ id, adults: a, children: c, day: x && x.day != null ? Number(x.day) : undefined });
  }
  return { addons: out };
}
const addonPrice = (list) => list.reduce((t, x) => t + x.adults * FERRY_ADDONS[x.id].adult + x.children * FERRY_ADDONS[x.id].child, 0);
const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const nightsBetween = (a, b) => Math.round((Date.parse(b + "T00:00:00Z") - Date.parse(a + "T00:00:00Z")) / 864e5);

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
const ISLAND_NAME = "Perhentian Island";
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
    const [from, to] = toJetty ? [ISLAND_NAME, JETTY] : [JETTY, ISLAND_NAME];
    const ra = readAddons(b.addons, adults, children);
    if (ra.error) return ra;
    const addons = ra.addons;
    // Add-ons only on return tickets; every add-on has a day and follows the snorkeling rules
    if (oneway && addons.length) return { error: "Snorkeling add-ons are for return ferry tickets only." };
    let schedule = [];
    if (addons.length) {
      const plan = planSnorkel(b, addons.map(x => ({ id: x.id, day: x.day })), nightsBetween(b.date, b.returnDate) + 1);
      if (plan.error) return plan;
      schedule = plan.schedule;
    }
    const addonAmount = addonPrice(addons);
    return {
      amount: adults * p.adult + children * p.child + addonAmount,
      purpose: `Ferry ticket ${oneway ? "one-way" : "return"}: ${from} → ${to}${addons.length ? " + " + addons.map(x => FERRY_ADDONS[x.id].name).join(" + ") : ""}`,
      summary: { type: "ferry", trip: b.trip, from, to, date: b.date, time: b.time, returnDate: oneway ? "" : b.returnDate, returnTime: oneway ? "" : b.returnTime, adults, children, addons: addons.map(({ day, ...x }) => x), schedule },
    };
  }

  if (b.type === "ground") {
    const g = GROUND[b.package];
    if (!g) return { error: "Choose a package." };
    if (oneway) return { error: "Packages include a return ferry." };
    if (b.returnDate <= b.date) return { error: "Packages need at least 1 night on the island (2D1N)." };
    const adults = Number(b.adults), children = Number(b.children || 0);
    if (!count(adults, 1, 99) || !count(children, 0, 99)) return { error: "Check the number of guests." };
    if (!isTime(b.time) || !isTime(b.returnTime)) return { error: "Choose your boat times." };
    const nDays = nightsBetween(b.date, b.returnDate) + 1;
    const allowed = nDays === 2 ? [] : Object.keys(FERRY_ADDONS).filter(id => id !== b.package);
    const ra = readAddons(b.addons, adults, children, allowed);
    if (ra.error) return ra;
    const addons = ra.addons;
    // Package trip: day 1 for 2D1N, otherwise the day the customer chose (old pages: day 2)
    const pkgDay = nDays === 2 ? 1 : Number(b.snorkelDay || 2);
    const plan = planSnorkel(b, [{ id: b.package, day: pkgDay, included: true }, ...addons.map(x => ({ id: x.id, day: x.day }))], nDays);
    if (plan.error) return plan;
    const snorkelDate = addDays(b.date, pkgDay - 1);
    return {
      amount: adults * g.adult + children * g.child + addonPrice(addons),
      purpose: `${g.name}${addons.length ? " + " + addons.map(x => FERRY_ADDONS[x.id].name).join(" + ") : ""}: ${JETTY} ⇄ ${ISLAND_NAME}`,
      summary: { type: "ground", package: b.package, trip: "return", from: JETTY, to: ISLAND_NAME, date: b.date, time: b.time, returnDate: b.returnDate, returnTime: b.returnTime, adults, children, snorkelDate, snorkelTime: SNORKEL.start[b.package],
        addons: addons.map(({ day, ...x }) => x), schedule: plan.schedule },
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
