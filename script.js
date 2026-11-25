/* =========================================================
   Cucimato Perhentian Island — page behaviour
   Data to edit lives at the top of each section:
     FERRY (prices, times), HOTEL_PACKAGES, GROUND_TRIPS, FERRY_SCHEDULE
   ========================================================= */

const WHATSAPP = "60192094669";
const waLink = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;
const MSG_GENERAL = "Hi Cucimato! I'm interested in a Perhentian Island package. Could you share more details?";
const msgFor = (name) => `Hi Cucimato! I'm interested in the *${name}* package.\nDates: \nNumber of people: \nLength (2D1N / 3D2N): `;
const rm = (n) => "RM" + n.toLocaleString("en-MY", { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });
const $ = (id) => document.getElementById(id);

/* ---------- Hero tabs (Book a ferry / Hotel + Packages / Ground Packages / Ferry Schedule) ---------- */
const heroTabs = [...document.querySelectorAll(".htab")];
function selectTab(name) {
  heroTabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.tab === name)));
  ["ferry", "airport", "hotel", "ground", "schedule"].forEach(p => { $("panel-" + p).hidden = p !== name; });
}
heroTabs.forEach(tab => tab.addEventListener("click", () => selectTab(tab.dataset.tab)));

// Header links open the matching tab and scroll to it
const TAB_HASH = { ferry: "#book-ferry", airport: "#airport-transfer", hotel: "#hotel-packages", ground: "#ground-packages", schedule: "#ferry-schedule" };
function openTabFromLink(name) {
  selectTab(name);
  const bar = document.querySelector(".hero__tabs");
  const y = bar.getBoundingClientRect().top + window.scrollY - 88;
  window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
}
document.querySelectorAll("[data-tab-link]").forEach(a => a.addEventListener("click", (e) => {
  e.preventDefault();
  openTabFromLink(a.dataset.tabLink);
  history.replaceState(null, "", a.getAttribute("href"));
}));
// Deep link, e.g. .../#ferry-schedule
const fromHash = Object.keys(TAB_HASH).find(k => TAB_HASH[k] === location.hash);
if (fromHash) selectTab(fromHash);

/* =========================================================
   Book a ferry — Kuala Besut Jetty <-> Perhentian Island (return)
   ========================================================= */
const FERRY = {
  adult: 80,
  child: 50,                                // child = 1–9 years old
  departWindow: "8am–5pm",                  // to the island: confirmed on WhatsApp
  departTimes: ["8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"], // to the island
  returnTimes: ["8:00 AM", "12:00 PM", "4:00 PM"],
  minDaysAhead: 1,                          // earliest depart = tomorrow
  maxMonthsAhead: 6,
  closedMonths: [],                         // e.g. [11, 12, 1, 2] to block monsoon months
  maxGuests: 30,
  oneWay: { adult: 40, child: 25 },         // one-way price (either direction); null = "Price on request"
};

const today = new Date(); today.setHours(0, 0, 0, 0);
const firstBookable = new Date(today); firstBookable.setDate(today.getDate() + FERRY.minDaysAhead);
const lastBookable = new Date(today.getFullYear(), today.getMonth() + FERRY.maxMonthsAhead + 1, 0);
const fmtDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const shortDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const paxNum = (v) => Math.min(99, Math.max(0, parseInt(String(v).replace(/\D/g, ""), 10) || 0));
const isBookable = (d) => d >= firstBookable && d <= lastBookable && !FERRY.closedMonths.includes(d.getMonth() + 1);

const FERRY_REQUEST_MSG = "Hi Cucimato! I have a special request for my ferry trip (e.g. private boat, different time).\nDate: \nNumber of passengers: \nMy request: ";
const ferry = { trip: "return", dir: "toIsland", picking: "depart", depart: null, ret: null, departTime: null, returnTime: null, adults: 0, children: 0 };
const isOneWay = () => ferry.trip === "oneway";
// One-way can go either way; a return trip always starts at Kuala Besut Jetty
const toJetty = () => isOneWay() && ferry.dir === "toJetty";
const ROUTE = { toIsland: ["Kuala Besut Jetty", "Perhentian Island"], toJetty: ["Perhentian Island", "Kuala Besut Jetty"] };
const firstBoatTimes = () => toJetty() ? FERRY.returnTimes : FERRY.departTimes;
let fView = new Date(firstBookable.getFullYear(), firstBookable.getMonth(), 1);

function fMonthHTML(y, m) {
  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  let html = "<span></span>".repeat(lead);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const isStart = sameDay(date, ferry.depart), isEnd = sameDay(date, ferry.ret);
    const inRange = !isOneWay() && ferry.depart && ferry.ret && date > ferry.depart && date < ferry.ret;
    const beforeDepart = ferry.picking === "return" && ferry.depart && date < ferry.depart;
    html += `<button type="button" class="cal__day${inRange ? " in-range" : ""}" data-fday="${y}-${m}-${d}"
      aria-label="${fmtDate(date)}${isStart ? " (depart)" : isEnd ? " (return)" : ""}"
      aria-pressed="${isStart || isEnd}" ${isBookable(date) && !beforeDepart ? "" : "disabled"}>${d}</button>`;
  }
  const title = new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  return `<div class="fcal__month"><p>${title}</p>
    <div class="cal__grid cal__dow" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
    <div class="cal__grid">${html}</div></div>`;
}

function renderFerryCal() {
  const y = fView.getFullYear(), m = fView.getMonth();
  const second = new Date(y, m + 1, 1); // handles Dec -> Jan
  $("fCalMonths").innerHTML = fMonthHTML(y, m) + fMonthHTML(second.getFullYear(), second.getMonth());
  $("fCalPrev").disabled = y === firstBookable.getFullYear() && m === firstBookable.getMonth();
  $("fCalNext").disabled = second.getFullYear() === lastBookable.getFullYear() && second.getMonth() === lastBookable.getMonth();
  $("fCalHint").textContent = isOneWay() ? "Select your depart date"
    : ferry.picking === "return" ? "Now select your return date" : "Select your depart date";
}

function renderDepSlots() {
  $("fDepSlots").innerHTML = firstBoatTimes().map(t =>
    `<button type="button" class="slot" role="radio" data-dep="${t}" aria-checked="${t === ferry.departTime}">${t}</button>`).join("");
}

function renderRetSlots() {
  $("fRetSlots").innerHTML = FERRY.returnTimes.map(t =>
    `<button type="button" class="slot" role="radio" data-ret="${t}" aria-checked="${t === ferry.returnTime}">${t}</button>`).join("");
}

function renderFerryPanel() {
  const { depart, ret, departTime, returnTime, adults, children } = ferry;
  const oneWay = isOneWay();
  $("panel-ferry").classList.toggle("is-oneway", oneWay);
  const [from, to] = ROUTE[toJetty() ? "toJetty" : "toIsland"];
  $("fFromVal").textContent = from; $("fToVal").textContent = to;
  $("fSwap").disabled = !oneWay;
  $("fDepLbl").textContent = "Depart Time";
  $("fDepPopLbl").textContent = `${from} → ${to}`;
  // Note under the panel: trip type + price (left), e-ticket and time-change help (right)
  const priceText = oneWay
    ? (FERRY.oneWay.adult == null ? `One-way · ${from} → ${to} · Price on request` : `One-way · Adult ${rm(FERRY.oneWay.adult)}${FERRY.oneWay.child != null ? ` · Child ${rm(FERRY.oneWay.child)}` : ""}`)
    : `Return trip · Adult ${rm(FERRY.adult)} · Child ${rm(FERRY.child)}`;
  $("panel-ferry").querySelector(".fpanel__note").innerHTML = `<span class="fnote__price">${priceText}</span>
    <span class="fnote__perks">
      <span class="fnote__perk fnote__perk--tick"><i aria-hidden="true"></i>Book online &amp; get your e-ticket</span>
      <span class="fnote__perk">Special request or private boat? <a href="${waLink(FERRY_REQUEST_MSG)}" target="_blank" rel="noopener">Chat with us on WhatsApp</a></span>
    </span>`;
  // empty fields show faded text; From/To are fixed and stay dark
  const show = (btn, val, value, empty) => { $(val).textContent = value || empty; $(btn).classList.toggle("is-empty", !value); };
  show("fDepartBtn", "fDepartVal", depart && shortDate(depart), "Select date");
  show("fReturnBtn", "fReturnVal", ret && shortDate(ret), "Select date");
  show("fDepBtn", "fDepVal", departTime, "Time");
  show("fRetBtn", "fRetVal", returnTime, "Time");
  show("fPaxBtn", "fPaxVal", adults && `${adults} Adult${adults > 1 ? "s" : ""}${children ? `, ${children} Child${children > 1 ? "ren" : ""}` : ""}`, "Enter number");

  const go = $("fGo");
  const price = oneWay ? FERRY.oneWay : FERRY;
  const total = price.adult == null ? null : adults * price.adult + children * (price.child ?? 0);
  const missing = !depart ? "Select date" : !oneWay && !ret ? "Select return date" : !departTime ? "Select boat time" : !oneWay && !returnTime ? "Select return time" : !adults ? "Enter passengers" : "";
  if (missing) {
    go.textContent = missing;
    go.setAttribute("aria-disabled", "true");
    go.removeAttribute("href");
    return;
  }
  go.textContent = total == null ? "Book now" : `Book · ${rm(total)}`;
  go.removeAttribute("aria-disabled");
  go.href = "#book"; // opens the booking sheet (see "Booking sheet" below)
}

const POPS = { dates: ["fDatesPop", "fDepartBtn"], dep: ["fDepPop", "fDepBtn"], ret: ["fRetPop", "fRetBtn"], pax: ["fPaxPop", "fPaxBtn"] };
const dateBtn = () => ferry.picking === "return" ? "fReturnBtn" : "fDepartBtn";
// Next field still empty after dates: boat to the island, then return boat
const nextFerryStep = () => !ferry.depart || (!isOneWay() && !ferry.ret) ? "dates" : !ferry.departTime ? "dep" : !isOneWay() && !ferry.returnTime ? "ret" : !ferry.adults ? "pax" : null;
function fToggle(which, open) {
  const [popId] = POPS[which];
  const btnId = which === "dates" ? dateBtn() : POPS[which][1];
  const willOpen = open ?? $(popId).hidden;
  closeAllPops();
  $(popId).hidden = !willOpen;
  $(btnId).setAttribute("aria-expanded", String(willOpen));
  if (willOpen && which === "dates") renderFerryCal();
  if (willOpen && which === "pax") setTimeout(() => $("fAdultsIn").focus(), 50);
}
function closeAllPops() {
  Object.values(POPS).forEach(([p, b]) => { $(p).hidden = true; $(b).setAttribute("aria-expanded", "false"); });
  $("fReturnBtn").setAttribute("aria-expanded", "false");
}

// Depart and Return are separate boxes that share one calendar
$("fDepartBtn").addEventListener("click", () => { const open = $("fDatesPop").hidden || ferry.picking !== "depart"; ferry.picking = "depart"; fToggle("dates", open); });
$("fReturnBtn").addEventListener("click", () => { const want = ferry.depart ? "return" : "depart"; const open = $("fDatesPop").hidden || ferry.picking !== want; ferry.picking = want; fToggle("dates", open); });
// Swap direction (one-way only): Kuala Besut -> island, or island -> Kuala Besut
$("fSwap").addEventListener("click", () => {
  if (!isOneWay()) return;
  ferry.dir = ferry.dir === "toIsland" ? "toJetty" : "toIsland";
  if (!firstBoatTimes().includes(ferry.departTime)) ferry.departTime = null; // times differ per direction
  closeAllPops(); renderDepSlots(); renderFerryPanel();
});
// One-way / Return tick
document.querySelectorAll('input[name="ftrip"]').forEach(r => r.addEventListener("change", () => {
  ferry.trip = r.value;
  if (isOneWay()) { ferry.ret = null; ferry.returnTime = null; renderRetSlots(); }
  else if (ferry.dir !== "toIsland") { ferry.dir = "toIsland"; ferry.departTime = null; renderDepSlots(); }
  ferry.picking = "depart";
  closeAllPops(); renderFerryPanel();
}));
$("fDepBtn").addEventListener("click", () => fToggle("dep"));
$("fRetBtn").addEventListener("click", () => fToggle("ret"));
$("fPaxBtn").addEventListener("click", () => fToggle("pax"));
document.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", () => fToggle(b.dataset.close, false)));
$("fCalPrev").addEventListener("click", () => { fView.setMonth(fView.getMonth() - 1); renderFerryCal(); });
$("fCalNext").addEventListener("click", () => { fView.setMonth(fView.getMonth() + 1); renderFerryCal(); });
$("fCalMonths").addEventListener("click", (e) => {
  const b = e.target.closest("[data-fday]");
  if (!b || b.disabled) return;
  const [y, m, d] = b.dataset.fday.split("-").map(Number);
  const date = new Date(y, m, d);
  let done;
  if (ferry.picking === "return") { ferry.ret = date; ferry.picking = "depart"; done = true; } // same day allowed (day trip)
  else {
    ferry.depart = date;
    if (ferry.ret && ferry.ret < date) ferry.ret = null;
    done = isOneWay() || Boolean(ferry.ret);
    if (!done) ferry.picking = "return";
  }
  renderFerryCal(); renderFerryPanel();
  if (done) setTimeout(() => { const n = nextFerryStep(); n === "dates" ? fToggle("dates", true) : n ? fToggle(n, true) : closeAllPops(); }, 250); // next: boat times
  else { $("fDepartBtn").setAttribute("aria-expanded", "false"); $("fReturnBtn").setAttribute("aria-expanded", "true"); }
});
$("fDepSlots").addEventListener("click", (e) => {
  const b = e.target.closest("[data-dep]");
  if (!b) return;
  ferry.departTime = b.dataset.dep;
  renderDepSlots(); renderFerryPanel();
  setTimeout(() => { const n = nextFerryStep(); n === "ret" ? fToggle("ret", true) : fToggle("dep", false); }, 200);
});
$("fRetSlots").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ret]");
  if (!b) return;
  ferry.returnTime = b.dataset.ret;
  renderRetSlots(); renderFerryPanel();
  setTimeout(() => { if (nextFerryStep() === "pax") fToggle("pax", true); else fToggle("ret", false); }, 200);
});
// Passengers are typed in (easier for big groups). Empty children = 0.
$("fPaxPop").addEventListener("input", (e) => {
  const key = e.target.dataset.fpax;
  if (!key) return;
  ferry[key] = paxNum(e.target.value);
  renderFerryPanel();
});
// Book button: when something is missing, open the field that needs it
$("fGo").addEventListener("click", (e) => {
  e.preventDefault();
  if ($("fGo").getAttribute("aria-disabled") !== "true") { openBooking("ferry"); return; }
  e.stopPropagation();
  const step = nextFerryStep() || "dates";
  if (step === "dates") ferry.picking = ferry.depart && !isOneWay() ? "return" : "depart";
  fToggle(step, true);
});
// composedPath() keeps the clicked element's ancestors even after the calendar re-renders
// and removes that day button, so picking the first date no longer closes the popover.
document.addEventListener("click", (e) => {
  const inside = e.composedPath().some(n => n instanceof Element && (n.matches(".fpop-wrap") || n.id === "fGo"));
  if (!inside) closeAllPops();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAllPops(); });

renderDepSlots();
renderRetSlots();
renderFerryPanel();

/* =========================================================
   Hotel + Packages — DUMMY data copied from the 2026 posters.
   Update before the new season.
   ========================================================= */
const HOTEL_PACKAGES = [
  { id: "flora-bay", name: "Flora Bay Resort", tagline: "Snorkeling | Fireshow | Beachfront | Seaview", stay: "Beachfront accommodation", breakfast: true, p2d1n: 220, p3d2n: 290, type: "Resort" },
  { id: "arwana", name: "Arwana Perhentian Resort", tagline: "Premium Stay | Honeymoon | Beach", stay: "Premium accommodation", breakfast: true, p2d1n: null, p3d2n: null, type: "Resort" },
  { id: "sharila", name: "Shari-la Island Resort", tagline: "Sunset Spot | Fireshow | Windmills", stay: "Comfy accommodation at sunset view spot", breakfast: true, p2d1n: null, p3d2n: null, type: "Resort" },
  { id: "fauna", name: "Fauna Beach Chalet", tagline: "Snorkeling | Beachfront | Seaview | Fireshow", stay: "Beachfront accommodation", breakfast: false, p2d1n: 199, p3d2n: 245, type: "Chalet" },
  { id: "nemo", name: "Nemo Chalet", tagline: "Snorkeling | Honeymoon | Seaview | Cultures", stay: "Seaview accommodation", breakfast: false, p2d1n: 219, p3d2n: 289, type: "Resort" },
  { id: "perhentian-bay", name: "Perhentian Bay", tagline: "Snorkeling | Seaview | Cultures", stay: "Seaview accommodation", breakfast: false, p2d1n: 219, p3d2n: 289, type: "Resort" },
  { id: "kiara", name: "Kiara Perhentian", tagline: "Snorkeling | Village | Community | Cultures", stay: "Aircond accommodation", breakfast: false, p2d1n: 195, p3d2n: 240, type: "Hotel" },
];

const posterIncludes = (p) => [
  p.stay,
  "Snorkeling Perhentian Island trip",
  "Equipment provided",
  "Round trip transfer boat",
  ...(p.breakfast ? ["Free breakfast buffet"] : []),
  "Free lunch",
  "Free gift",
];

// Card widths that fill a 4-column row: wide, narrow, narrow / narrow, narrow, wide ...
function bentoSpans(n) {
  const pattern = [2, 1, 1, 1, 1, 2];
  const spans = Array.from({ length: n }, (_, i) => pattern[i % pattern.length]);
  const used = spans.reduce((a, b) => a + b, 0) % 4;
  if (used) spans[n - 1] += 4 - used; // last card stretches to close the row
  return spans;
}

function renderBento() {
  const spans = bentoSpans(HOTEL_PACKAGES.length);
  $("bento").innerHTML = HOTEL_PACKAGES.map((p, i) => `
    <article class="bcard${spans[i] > 1 ? " bcard--w" + spans[i] : ""}">
      <img src="images/photos/${p.id}-main.webp" alt="" loading="lazy">
      <div class="bcard__body">
        <div>
          <div class="bcard__name">${p.name}</div>
          <span class="bcard__from">2D1N from</span>
          <span class="bcard__price">${p.p2d1n ? rm(p.p2d1n) : "Stay tuned"}</span>
        </div>
        <div class="bcard__actions">
          <button type="button" class="bbtn bbtn--solid" data-book="hotel" data-id="${p.id}">Check availability</button>
          <button type="button" class="bbtn bbtn--ghost" data-pinfo="${p.id}">More Info</button>
        </div>
      </div>
    </article>`).join("");
}

const pinfo = $("pkgInfo");
function showInfo(html) { $("pinfoBody").innerHTML = html; pinfo.showModal(); }
$("pinfoClose").addEventListener("click", () => pinfo.close());
pinfo.addEventListener("click", (e) => { if (e.target === pinfo) pinfo.close(); });

function openPkgInfo(id) {
  const p = HOTEL_PACKAGES.find(x => x.id === id);
  const price = (v) => v ? rm(v) : "Stay tuned";
  showInfo(`
    <div class="pinfo__poster"><img src="images/posters/${p.id}.webp" alt="${p.name} package poster"></div>
    <div class="pinfo__text">
      <h3 id="pinfoName">${p.name}</h3>
      <p class="pinfo__tags">${p.tagline}</p>
      <ul class="pinfo__list">${posterIncludes(p).map(x => `<li>${x}</li>`).join("")}</ul>
      <div class="pinfo__prices">
        <div><small>2 days 1 night from</small><strong>${price(p.p2d1n)}</strong></div>
        <div><small>3 days 2 nights from</small><strong>${price(p.p3d2n)}</strong></div>
      </div>
      <p class="pinfo__inc">Guide · ${p.type} · Snorkeling · Sea transfer</p>
      <button type="button" class="btn" data-book="hotel" data-id="${p.id}">Check availability</button>
    </div>`);
}
$("bento").addEventListener("click", (e) => {
  const b = e.target.closest("[data-pinfo]");
  if (b) openPkgInfo(b.dataset.pinfo);
});
renderBento();

/* =========================================================
   Ground Packages — ferry + snorkeling trips.
   DUMMY photos for now; info from the Boat Service & Snorkeling
   poster. price: null = "Price on request".
   ========================================================= */
const GROUND_TRIPS = [
  { id: "perhentian", name: "Ferry + Perhentian Island Snorkeling Trip", img: "ground-perhentian", pos: "50% 30%", price: 130 },
  { id: "rawa", name: "Ferry + Rawa Island Snorkeling Trip", img: "ground-rawa", pos: "50% 55%", price: 150 },
  { id: "redang", name: "Ferry + Redang Island Snorkeling Trip", img: "ground-redang", pos: "50% 60%", price: null },
];
const GROUND_INCLUDES = [
  "Minimum stay 2D1N",
  "Resorts or hotels around Perhentian Island (book your own stay)",
  "Round trip transfer boat",
  "Snorkeling activity",
  "Free gift",
];

function renderGround() {
  $("bentoGround").innerHTML = GROUND_TRIPS.map(t => `
    <article class="bcard">
      <img src="images/photos/${t.img}.webp" alt="" loading="lazy" style="object-position:${t.pos}">
      <div class="bcard__body">
        <div>
          <div class="bcard__name">${t.name}</div>
          <span class="bcard__from">From</span>
          <span class="bcard__price">${t.price ? rm(t.price) : "Price on request"}</span>
          ${t.price ? '<span class="bcard__note">per adult</span>' : ""}
        </div>
        <div class="bcard__actions">
          <button type="button" class="bbtn bbtn--solid" data-book="ground" data-id="${t.id}">Book Now</button>
          <button type="button" class="bbtn bbtn--ghost" data-ginfo="${t.id}">More Info</button>
        </div>
      </div>
    </article>`).join("");
}

function openGroundInfo(id) {
  const t = GROUND_TRIPS.find(x => x.id === id);
  const priced = GROUND_TRIPS.filter(x => x.price);
  showInfo(`
    <div class="pinfo__poster"><img src="images/posters/boat-snorkeling.webp" alt="Boat Service and Snorkeling poster"></div>
    <div class="pinfo__text">
      <h3 id="pinfoName">${t.name}</h3>
      <p class="pinfo__tags">Ground Package | Self Hotel Booking</p>
      <ul class="pinfo__list">${GROUND_INCLUDES.map(x => `<li>${x}</li>`).join("")}</ul>
      <div class="pinfo__prices">
        <div><small>This trip, per adult</small><strong>${t.price ? rm(t.price) : "On request"}</strong></div>
        <div><small>${priced.map(o => o.name.replace("Ferry + ", "").replace(" Snorkeling Trip", "")).join(" / ")}</small><strong>${priced.map(o => rm(o.price)).join(" / ")}</strong></div>
      </div>
      <p class="pinfo__inc">Guide · Snorkeling · Sea transfer</p>
      <button type="button" class="btn" data-book="ground" data-id="${t.id}">Book Now</button>
    </div>`);
}
$("bentoGround").addEventListener("click", (e) => {
  const b = e.target.closest("[data-ginfo]");
  if (b) openGroundInfo(b.dataset.ginfo);
});
renderGround();

/* =========================================================
   Ferry Schedule
   ========================================================= */
const FERRY_SCHEDULE = {
  depart: ["8", "9", "10", "11", "12", "1", "2", "3", "4", "5"].map((h, i) => ({ t: `${h}:00`, ap: i < 4 ? "AM" : "PM" })),
  ret: [{ t: "8:00", ap: "AM" }, { t: "12:00", ap: "PM" }, { t: "4:00", ap: "PM" }],
};
const slotsHTML = (list) => list.map(s => `<div class="sched__slot"><b>${s.t}</b><span>${s.ap}</span></div>`).join("");
const privateFerryLink = waLink("Hi Cucimato! I'd like to request a private ferry.\nDate: \nNumber of people: ");

document.querySelectorAll("[data-sched]").forEach(el => {
  el.innerHTML = `
    <div class="sched__block">
      <div class="sched__head"><strong>Departure</strong><small>Kuala Besut Jetty → Perhentian Island</small></div>
      <div class="sched__grid">${slotsHTML(FERRY_SCHEDULE.depart)}</div>
    </div>
    <div class="sched__block sched__block--ret">
      <div class="sched__head"><strong>Return</strong><small>Perhentian Island → Kuala Besut Jetty</small></div>
      <div class="sched__grid">${slotsHTML(FERRY_SCHEDULE.ret)}</div>
    </div>
    <ul class="sched__notes">
      <li>Subject to weather and traffic conditions.</li>
      <li>Private ferry on request, <a href="${privateFerryLink}" target="_blank" rel="noopener">WhatsApp us</a>.</li>
      <li>Please arrive 20 minutes before departure.</li>
    </ul>`;
});

/* ---------- Site chrome: WhatsApp links, intro, mobile menu, year ---------- */
document.querySelectorAll("[data-wa]").forEach(el => {
  const key = el.dataset.wa;
  el.href = waLink(key === "general" ? MSG_GENERAL : msgFor(key));
});

// intro: skip on click/tap or Esc (it also ends by itself via CSS after ~4s)
const skipIntro = () => document.documentElement.classList.add("no-intro");
$("intro").addEventListener("click", skipIntro);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") skipIntro(); }, { once: true });

const nav = document.querySelector(".nav");
const burger = $("burger");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", open);
});
$("navLinks").addEventListener("click", (e) => {
  if (e.target.closest("a")) { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
});

$("year").textContent = new Date().getFullYear();

/* =========================================================
   Hero banner slider (2 slides, cross-fade, dots, swipe)
   ========================================================= */
(() => {
  const banner = document.querySelector(".hero__banner");
  if (!banner) return;
  const slides = [...banner.querySelectorAll(".hero__slide")];
  const dots = [...banner.querySelectorAll(".hero__dots button")];
  if (slides.length < 2) return;
  let current = 0, timer = null;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const show = (i) => {
    current = (i + slides.length) % slides.length;
    slides.forEach((s, n) => {
      s.classList.toggle("is-active", n === current);
      s.setAttribute("aria-hidden", n !== current);
    });
    dots.forEach((d, n) => d.setAttribute("aria-current", n === current));
  };
  const stop = () => { clearInterval(timer); timer = null; };
  const start = () => { if (!reduce && !timer) timer = setInterval(() => show(current + 1), 6000); };

  dots.forEach((d, n) => d.addEventListener("click", () => { show(n); stop(); start(); }));
  banner.addEventListener("mouseenter", stop);
  banner.addEventListener("mouseleave", start);
  banner.addEventListener("focusin", stop);
  banner.addEventListener("focusout", start);

  let x0 = null;
  banner.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; stop(); }, { passive: true });
  banner.addEventListener("touchend", (e) => {
    if (x0 !== null) {
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    }
    x0 = null; start();
  });

  start();
})();

/* =========================================================
   Gallery — expanding-slide carousel (active = wide & sharp,
   neighbours = narrow & blurred). One slide is an Instagram reel
   that loads only when tapped.
   pos   = crop focus (object-position)
   grade = light/colour touch-up (CSS filter) so photos match
   ========================================================= */
const GALLERY = [
  { src: "g11", pos: "45% 55%", grade: "contrast(1.04) saturate(1.06)", caption: "Perhentian Island from above", alt: "Aerial view of a Perhentian Island bay with boats heading to the jetty" },
  { src: "g7", pos: "50% 58%", grade: "contrast(1.05) saturate(1.05)", caption: "Snorkeling day out", alt: "Friends in life jackets standing in clear shallow water" },
  { src: "g8", pos: "50% 55%", grade: "brightness(1.02) contrast(1.04) saturate(1.04)", caption: "Floating together", alt: "Group floating hand in hand in a circle in turquoise water" },
  { src: "g9", pos: "50% 62%", grade: "contrast(1.06) saturate(1.08)", caption: "Sunset with the crew", alt: "Group sitting on the beach watching the sunset" },
  { reel: "DU9Qd-Hk465", poster: "images/photos/perhentian-bay-3.webp", pos: "50% 50%", grade: "contrast(1.04) saturate(1.06)", caption: "Watch our reel", alt: "Instagram reel: Perhentian Island" },
  { src: "g12", pos: "55% 50%", grade: "contrast(1.04) saturate(1.04)", caption: "Crystal clear water", alt: "Snorkelers floating in clear water next to a boat" },
  { src: "g13", pos: "40% 50%", grade: "brightness(.97) contrast(1.08) saturate(1.06)", caption: "Lata Air Berani, Perhentian Island", alt: "Group photo at Lata Air Berani, Perhentian Island" },
  { src: "g10", pos: "50% 45%", grade: "brightness(.95) contrast(1.1) saturate(1.06)", caption: "Ready to cross", alt: "Guests gathered at the jetty before the boat ride" },
];

const playIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
const gtrack = $("gtrack");
gtrack.innerHTML = GALLERY.map((g, i) => `
  <button type="button" class="gslide${g.reel ? " gslide--reel" : ""}" data-g="${i}" style="--grade:${g.grade}"
    aria-label="${i + 1} of ${GALLERY.length}: ${g.alt}">
    <img src="${g.reel ? g.poster : `images/gallery/${g.src}.webp`}" alt="" loading="lazy" style="object-position:${g.pos}">
    ${g.reel ? `<span class="greel__play">${playIcon}</span>` : ""}
    <span class="gslide__cap">
      <span class="gslide__text">${g.caption}</span>
      <img class="gslide__logo" src="images/brand/cucimato-logo-white.webp" alt="" width="800" height="587">
    </span>
  </button>`).join("");

const gslides = [...gtrack.children];
let gActive = 0, gTimer = null;
const gReduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

// Sizes: active slide takes a share of the width; the two neighbours fill the rest,
// so exactly 3 slides show. The track slides so the active one sits in view.
function gLayout() {
  const W = $("gslider").clientWidth;
  const gap = W < 560 ? 8 : 12;
  const A = Math.round(W * (W < 560 ? 0.7 : 0.52));
  const n = Math.max(40, Math.round((W - A - 2 * gap) / 2));
  gtrack.style.setProperty("--a", A + "px");
  gtrack.style.setProperty("--n", n + "px");
  gtrack.style.setProperty("--gap", gap + "px");
  const total = A + (GALLERY.length - 1) * (n + gap);
  const left = gActive * (n + gap);
  const offset = Math.min(Math.max(0, left - (n + gap)), Math.max(0, total - W));
  gtrack.style.transform = `translateX(${-offset}px)`;
}

function gShow(i) {
  gActive = (i + GALLERY.length) % GALLERY.length;
  gslides.forEach((s, n) => {
    s.classList.toggle("is-active", n === gActive);
    s.setAttribute("aria-current", String(n === gActive));
  });
  gLayout();
}
const gStop = () => { clearInterval(gTimer); gTimer = null; };
const gStart = () => { if (!gReduce && !gTimer) gTimer = setInterval(() => gShow(gActive + 1), 4000); };

const gview = $("gview");
function gOpen(i) {
  const g = GALLERY[i];
  $("gviewBody").innerHTML = g.reel
    ? `<iframe src="https://www.instagram.com/reel/${g.reel}/embed/" title="Instagram reel by @cucimatopulauperhentian" allowfullscreen loading="lazy"></iframe>`
    : `<img src="images/gallery/${g.src}.webp" alt="${g.alt}" style="filter:${g.grade}">`;
  gview.showModal();
  gStop();
}
gtrack.addEventListener("click", (e) => {
  const s = e.target.closest("[data-g]");
  if (!s) return;
  const i = +s.dataset.g;
  if (i === gActive) gOpen(i);          // active slide: open big / play reel
  else { gShow(i); gStop(); gStart(); } // side slide: bring it to the front
});
$("gPrev").addEventListener("click", () => { gShow(gActive - 1); gStop(); gStart(); });
$("gNext").addEventListener("click", () => { gShow(gActive + 1); gStop(); gStart(); });
$("gslider").addEventListener("mouseenter", gStop);
$("gslider").addEventListener("mouseleave", gStart);
$("gslider").addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") { gShow(gActive + 1); gslides[gActive].focus(); }
  if (e.key === "ArrowLeft") { gShow(gActive - 1); gslides[gActive].focus(); }
});
let gx0 = null;
$("gslider").addEventListener("touchstart", (e) => { gx0 = e.touches[0].clientX; gStop(); }, { passive: true });
$("gslider").addEventListener("touchend", (e) => {
  if (gx0 !== null) {
    const dx = e.changedTouches[0].clientX - gx0;
    if (Math.abs(dx) > 40) gShow(gActive + (dx < 0 ? 1 : -1));
  }
  gx0 = null; gStart();
});
window.addEventListener("resize", gLayout);
// only run the auto-play while the gallery is on screen
new IntersectionObserver(([en]) => { en.isIntersecting ? gStart() : gStop(); }, { threshold: 0.3 }).observe($("gslider"));

const closeGview = () => { gview.close(); $("gviewBody").innerHTML = ""; gStart(); }; // also stops the reel
$("gviewClose").addEventListener("click", closeGview);
gview.addEventListener("click", (e) => { if (e.target === gview) closeGview(); });
gview.addEventListener("cancel", () => { $("gviewBody").innerHTML = ""; gStart(); });

gShow(0);

/* =========================================================
   Google reviews (under the gallery slides)
   Paste each review's text exactly as written on Google into `text`
   (you can shorten it with "…"). Cards without text stay hidden.
   stars: the star count shown on Google (1–5).
   ========================================================= */
const GOOGLE_RATING = { score: 4.8, count: 46 };
const GOOGLE_REVIEWS_URL = "https://www.google.com/maps/search/?api=1&query=Cucimato%20Pulau%20Perhentian%20Kuala%20Besut";
const REVIEWS = [
  { name: "Jazmeen J.", when: "2 months ago", stars: 5,
    text: "Everything was so smooth, and the person in charge was really accommodating with all our enquiries. We stayed at arwana and the place and location wise was perfect because its not too congested with people. …" },
  { name: "Lily S.", when: "5 months ago", stars: 5,
    text: "I took the package for Perhentian Island with CuciMato Perhentian. Had a wonderful 3 days and 2 nights stay. Such a beautiful beach, clean, crystal clear water and very relaxing, just as I needed. …" },
  { name: "Manisah F.", when: "4 months ago", stars: 5,
    text: "Terima kasih pada semua krew cucimato yang terlibat, saya mendapat pengalaman yang seronok sepanjang di perhentian. Thanks to boatman fendi for guiding me during snorkeling point where i can see shark in my eyes! Chalet yang selesa dan makanan yang sedap." },
];

const starRow = (n) => `<span class="stars" aria-label="${n} out of 5 stars">${"★".repeat(Math.round(n))}${"☆".repeat(5 - Math.round(n))}</span>`;
(() => {
  const box = $("greviews");
  const ready = REVIEWS.filter(r => r.text.trim());
  box.innerHTML = `
    <div class="greviews__bar">
      ${starRow(GOOGLE_RATING.score)}
      <strong>${GOOGLE_RATING.score}</strong>
      <span>· ${GOOGLE_RATING.count} Google reviews</span>
      <a href="${GOOGLE_REVIEWS_URL}" target="_blank" rel="noopener">Read all on Google →</a>
    </div>
    ${ready.length ? `<div class="greviews__list">${ready.map(r => `
      <figure class="rcard">
        ${r.stars ? starRow(r.stars) : ""}
        <blockquote>${r.text}</blockquote>
        <figcaption><strong>${r.name}</strong><span>${r.when} · Google</span></figcaption>
      </figure>`).join("")}</div>` : ""}`;
  box.hidden = false;
})();

/* =========================================================
   Booking sheet
   - Ferry Ticket and Ground Packages: "Book Now" (price is fixed).
   - Hotel + Packages: "Check availability" (rooms are confirmed
     with the resort first, so no price is shown here).
   Everything is sent to the "CUCIMATO Booking Form 2027" Google Form,
   which feeds the Cucimato Booking app (Hotel = CM, Ferry/Ground = BS).
   Choice values below must match the Google Form options exactly.
   ========================================================= */
const BOOKING_FORM = {
  action: "https://docs.google.com/forms/d/e/1FAIpQLSddu1zrP8cpOQGOaDvgNoNB9bwXizUQxHKTk9d_RGXYWAIMgQ/formResponse",
  name: "entry.1834496729", phone: "entry.485293669", service: "entry.653706730",
  adults: "entry.1132398241", children: "entry.494899219",
  start: "entry.1522944943", end: "entry.1490842790",
  hotel: "entry.296580635", addons: "entry.1251123119",
  ground: "entry.1185550471", stay: "entry.790395174",
  HOTEL: "Hotel + Package", GROUND: "Ground Package (Ferry Ticket)",
};
// Ground package option names in the Google Form
const GROUND_FORM_NAME = {
  ferry: "Ferry Ticket",
  perhentian: "Ferry Ticket + Perhentian Island Snorkeling Trip",
  rawa: "Ferry Ticket + Rawa Island Snorkeling Trip",
  redang: "Ferry Ticket + Redang Island Snorkeling Trip",
};
// Add-on activities (Hotel + Packages). price: null = no price shown (quoted in the invoice).
const ADDONS = [
  { value: "Rawa Island Snorkeling Trip", price: null },
  { value: "Redang & Lang Tengah Snorkeling Trip", price: null },
  { value: "Windmills Hiking & Sunset View", price: null },
  { value: "Windmills Sight-seeing & Romantic Beach", price: null },
  { value: "Discovery Scuba Diving", price: null },
  { value: "Fishing Trip", price: null },
  { value: "Action Camera Rental RM90/day", label: "Action Camera Rental", price: 90, unit: "day" },
];

// WhatsApp country codes. Malaysia first (default).
const COUNTRY_CODES = [
  ["+60", "MY"], ["+65", "SG"], ["+673", "BN"], ["+62", "ID"], ["+66", "TH"], ["+63", "PH"], ["+84", "VN"],
  ["+86", "CN"], ["+852", "HK"], ["+886", "TW"], ["+81", "JP"], ["+82", "KR"], ["+91", "IN"],
  ["+966", "SA"], ["+971", "AE"], ["+44", "UK"], ["+49", "DE"], ["+33", "FR"], ["+31", "NL"],
  ["+61", "AU"], ["+64", "NZ"], ["+1", "US/CA"],
];
// Full WhatsApp number, e.g. "+60 123456789". A number typed with its own "+" code is kept as is.
function bkPhone() {
  const raw = bk.phone.trim();
  if (raw.startsWith("+")) { const d = raw.replace(/\D/g, ""); const c = COUNTRY_CODES.map(x => x[0].slice(1)).find(c => d.startsWith(c)) || d.slice(0, 2); return `+${c} ${d.slice(c.length)}`; }
  let d = raw.replace(/\D/g, "");
  const code = bk.cc.slice(1);
  if (d.startsWith(code) && d.length > 9) d = d.slice(code.length); // typed the code without "+"
  if (bk.cc === "+60") d = d.replace(/^0+/, "");                     // 012... -> 12...
  return `${bk.cc} ${d}`;
}

// Boat time dropdown (scrollable picker on phones)
const timeSelect = (name, times) => `<select name="${name}" required>
  <option value=""${bk[name] ? "" : " selected"} disabled>Select time</option>
  ${times.map(t => `<option${t === bk[name] ? " selected" : ""}>${t}</option>`).join("")}</select>`;

// Boat to the island: same times as the Ferry Schedule tab
const DEPART_TIMES = FERRY.departTimes;

const bkSheet = $("bookSheet");
const bk = { mode: "ferry", id: "", start: "", end: "", dep: "", ret: "", cc: "+60", adults: 0, children: 0, addons: new Set(), name: "", phone: "", email: "", stay: "", sending: false, error: "", done: false };
const isoDate = (d) => d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "";
const fromIso = (s) => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function bkItem() {
  if (bk.mode === "airport") { const a = bk.air; return { name: `Airport Transfer (${a.trip === "oneway" ? "One-way" : "Return"})`, img: "about-sea", pos: "50% 50%", sub: `${a.serviceName} transfer${a.vehicle ? ` (${a.vehicle})` : ""}: ${a.pick} → ${a.drop}${a.trip === "oneway" ? "" : " and back"}.` }; }
  if (bk.mode === "hotel") { const p = HOTEL_PACKAGES.find(x => x.id === bk.id); return { name: p.name, img: `${p.id}-main`, pos: "50% 50%", sub: "Rooms are confirmed with the resort before any payment." }; }
  if (bk.mode === "ground") { const t = GROUND_TRIPS.find(x => x.id === bk.id); return { name: t.name, img: t.img, pos: t.pos, sub: "Return ferry from Kuala Besut Jetty, with snorkeling trip.", price: t.price }; }
  if (bk.oneway) return { name: "Ferry Ticket (One-way)", img: "about-sea", pos: "50% 50%", sub: `One-way ferry: ${ROUTE[bk.toJetty ? "toJetty" : "toIsland"].join(" → ")}.` };
  return { name: "Ferry Ticket", img: "about-sea", pos: "50% 50%", sub: "Return ferry: Kuala Besut Jetty ⇄ Perhentian Island." };
}

function openBooking(mode, id = "") {
  Object.assign(bk, { mode, id, error: "", done: false, sending: false, addons: new Set() });
  bk.oneway = mode === "ferry" && isOneWay();
  bk.toJetty = mode === "ferry" && toJetty();
  if (mode === "ferry") Object.assign(bk, { start: isoDate(ferry.depart), end: isoDate(bk.oneway ? ferry.depart : ferry.ret), dep: ferry.departTime || "", ret: bk.oneway ? "" : ferry.returnTime || "", adults: ferry.adults, children: ferry.children });
  if ($("pkgInfo").open) $("pkgInfo").close();
  renderBooking();
  bkSheet.showModal();
}

function bkPrice() {
  if (bk.mode === "airport") return { lines: bk.air.lines, total: bk.air.total };
  if (bk.mode === "ferry" && bk.oneway) {
    const o = FERRY.oneWay;
    if (o.adult == null) return { lines: [], total: null };
    return { lines: [[`${rm(o.adult)} × ${bk.adults} adult${bk.adults > 1 ? "s" : ""}`, bk.adults * o.adult], ...(bk.children && o.child != null ? [[`${rm(o.child)} × ${bk.children} child${bk.children > 1 ? "ren" : ""}`, bk.children * o.child]] : [])], total: bk.adults * o.adult + bk.children * (o.child ?? 0) };
  }
  if (bk.mode === "ferry") return { lines: [[`${rm(FERRY.adult)} × ${bk.adults} adult${bk.adults > 1 ? "s" : ""}`, bk.adults * FERRY.adult], ...(bk.children ? [[`${rm(FERRY.child)} × ${bk.children} child${bk.children > 1 ? "ren" : ""}`, bk.children * FERRY.child]] : [])], total: bk.adults * FERRY.adult + bk.children * FERRY.child };
  if (bk.mode === "ground") {
    const p = bkItem().price;
    if (!p) return { lines: [], total: null };
    return { lines: [[`${rm(p)} × ${bk.adults} adult${bk.adults > 1 ? "s" : ""}`, bk.adults * p]], total: bk.adults * p, childNote: bk.children > 0 };
  }
  return null;
}

function bkSumHTML(price) {
  if (!bk.adults && bk.mode !== "airport") return `<div class="muted"><span>Enter the number of guests to see the price</span></div>`;
  return `${price.lines.map(l => `<div><span>${l[0]}</span><span>${rm(l[1])}</span></div>`).join("")}
    ${price.childNote ? `<div class="muted"><span>Children</span><span>In your invoice</span></div>` : ""}
    ${price.total != null && payMode() ? `<div><span>Transaction fee (${PAY.feePercent}%)</span><span>${rm(txnFee(price.total))}</span></div>` : ""}
    ${price.total != null ? `<div class="t"><span>${payMode() ? "Total to pay" : "Estimated total"}</span><span>${rm(payMode() ? payTotal(price.total) : price.total)}</span></div>` : `<div class="t"><span>Price</span><span>On request</span></div>`}`;
}

function renderBooking() {
  const it = bkItem(), hotel = bk.mode === "hotel";
  if (bk.done) { renderBookingDone(it); return; }
  const min = isoDate(firstBookable), max = isoDate(lastBookable);
  const price = bkPrice();
  // Guests are typed in (easier for big groups). Empty children = 0.
  const pax = (key, label, placeholder) => `<label class="bk__f">${label}<input type="number" name="${key}" inputmode="numeric" min="${key === "adults" ? 1 : 0}" max="99" value="${bk[key] || ""}" placeholder="${placeholder}"${key === "adults" ? " required" : ""}></label>`;
  $("bkBody").innerHTML = `
    <div class="bk__hero" style="background-image:url(images/photos/${it.img}.webp);background-position:${it.pos}"></div>
    <form class="bk__in" id="bkForm" novalidate>
      <div>
        <p class="bk__kicker">${hotel ? "Check availability" : "Book now"}</p>
        <h3 class="bk__title" id="bkTitle">${esc(it.name)}</h3>
        <p class="bk__sub">${it.sub}</p>
      </div>
      ${bk.mode === "ferry" ? ferryTripSummary() : bk.mode === "airport" ? airportTripSummary() : `<div class="bk__grid">
        <label class="bk__f">${hotel ? "Check-in" : "Depart"}<input type="date" name="start" min="${min}" max="${max}" value="${bk.start}" required></label>
        <label class="bk__f">${hotel ? "Check-out" : "Return"}<input type="date" name="end" min="${bk.start || min}" max="${max}" value="${bk.end}" required></label>
      </div>
      ${hotel ? "" : `<div>
        <div class="bk__grid">
          <label class="bk__f">Boat to the island${timeSelect("dep", DEPART_TIMES)}</label>
          <label class="bk__f">Return boat${timeSelect("ret", FERRY.returnTimes)}</label>
        </div>
        <small class="bk__hint">Times follow our ferry schedule. If anything changes, we'll WhatsApp you.</small></div>`}
      <div class="bk__grid">${pax("adults", "Adults", "e.g. 2")}${pax("children", "Children (1–9 years)", "0")}</div>`}
      ${hotel ? `<details class="bk__dd"><summary><span class="bk__ddlbl">Add-on activities (optional)</span><strong id="bkAddonVal">${addonSummary()}</strong></summary>
        <div class="bk__ddlist">${ADDONS.map(a => `<label class="bk__ddopt"><input type="checkbox" data-bkaddon="${esc(a.value)}"${bk.addons.has(a.value) ? " checked" : ""}><span>${esc(a.label || a.value)}</span>${a.price ? `<small>+${rm(a.price)}${a.unit ? "/" + a.unit : ""}</small>` : ""}</label>`).join("")}</div></details>`
        : bk.mode === "airport" ? "" : `<label class="bk__f">Where are you staying? (optional)<input type="text" name="stay" value="${esc(bk.stay)}" placeholder="Resort or hotel name" autocomplete="off"></label>`}
      <div><p class="bk__lbl">Your details</p>
        <div class="bk__stack">
          <label class="bk__f"><span class="sr-only">Full name</span><input type="text" name="name" value="${esc(bk.name)}" placeholder="Full name" autocomplete="name" required></label>
          <div class="bk__phone">
            <label class="bk__f"><span class="sr-only">Country code</span><select name="cc" autocomplete="tel-country-code">${COUNTRY_CODES.map(([c, n]) => `<option value="${c}"${c === bk.cc ? " selected" : ""}>${n} ${c}</option>`).join("")}</select></label>
            <label class="bk__f"><span class="sr-only">WhatsApp number</span><input type="tel" name="phone" value="${esc(bk.phone)}" placeholder="12 345 6789" autocomplete="tel-national" inputmode="tel" required></label>
          </div>
          <label class="bk__f"><span class="sr-only">Email</span><input type="email" name="email" value="${esc(bk.email)}" placeholder="Email" autocomplete="email" required></label>
          ${bk.mode === "airport" ? airportExtraFields() : ""}
        </div></div>
      ${price ? `<div class="bk__sum" id="bkSum">${bkSumHTML(price)}</div>` : ""}
      ${bk.error ? `<p class="bk__err" role="alert">${bk.error}</p>` : ""}
      <button type="submit" class="btn bk__go" ${bk.sending ? "disabled" : ""}>${bk.sending ? (payMode() ? "Opening secure payment…" : "Sending…") : hotel ? "Check availability" : payMode() && price?.total != null ? `Pay now · ${rm(payTotal(price.total))}` : "Confirm booking"}</button>
      <p class="bk__note">${hotel ? "No payment yet. We'll WhatsApp you once the room is confirmed." : payMode() ? `${PAY.test ? "<b>Test mode:</b> no real money is taken. " : ""}Secure payment by HitPay: FPX online banking, DuitNow QR, e-wallet or card. A ${PAY.feePercent}% transaction fee applies to every online payment. Your confirmation and e-ticket are emailed after payment. By paying you agree to our <a href="terms.html" target="_blank" rel="noopener">booking terms</a>.` : "Your invoice will be sent to your email and WhatsApp within 24 hours. A 50% deposit secures the booking."}</p>
    </form>`;
}

// Add-on dropdown label: "Select activities", or the chosen names
function addonSummary() {
  const names = ADDONS.filter(a => bk.addons.has(a.value)).map(a => a.label || a.value);
  return names.length ? names.join(", ") : "Select activities";
}

// Book a Ferry: trip details were already chosen in the ferry panel, so only show them here
function ferryTripSummary() {
  const people = `${bk.adults} adult${bk.adults > 1 ? "s" : ""}${bk.children ? `, ${bk.children} child${bk.children > 1 ? "ren" : ""}` : ""}`;
  return `<div class="bk__trip">
    <div><small>Depart</small><strong>${shortDate(fromIso(bk.start))} · ${bk.dep}</strong></div>
    ${bk.oneway ? `<div><small>Trip</small><strong>One-way, ${bk.toJetty ? "to Kuala Besut" : "to the island"}</strong></div>` : `<div><small>Return</small><strong>${shortDate(fromIso(bk.end))} · ${bk.ret}</strong></div>`}
    <div><small>Passengers</small><strong>${people}</strong></div>
    <button type="button" class="bk__change" data-bkclose>Change</button>
  </div>`;
}

// Airport Transfer: details were chosen in the airport panel, so only show them here
function airportTripSummary() {
  const a = bk.air;
  return `<div class="bk__trip">
    <div><small>Pick-up</small><strong>${shortDate(fromIso(a.date))} · ${a.time}</strong></div>
    ${a.trip === "oneway" ? `<div><small>Trip</small><strong>One-way, ${a.serviceName}</strong></div>` : `<div><small>Return pick-up</small><strong>${shortDate(fromIso(a.returnDate))} · ${a.returnTime}</strong></div>`}
    <div><small>Passengers</small><strong>${paxLabel(a.adults, a.children)}</strong></div>
    <button type="button" class="bk__change" data-bkclose>Change</button>
  </div>`;
}

// Airport: flight details (so the driver can follow the flight), or the hotel/address for a city pick-up
const airArrives = (a) => a.trip === "return" || a.fromAirport;   // a leg starts at the airport/city
const airLeaves = (a) => a.trip === "return" || !a.fromAirport;   // a leg ends at the airport/city
function airportExtraFields() {
  const a = bk.air;
  if (!a.isAirport) return `<label class="bk__f">Hotel or address in ${esc(a.city)}<input type="text" name="address" value="${esc(bk.address || "")}" placeholder="Where we pick you up / drop you off" autocomplete="street-address" required></label>`;
  const flight = (key, label) => `<div><p class="bk__lbl">${label}</p><div class="bk__grid">
      <label class="bk__f"><span class="sr-only">Flight number</span><input type="text" name="${key}Flight" value="${esc(bk[key + "Flight"] || "")}" placeholder="Flight number" autocomplete="off" autocapitalize="characters" required></label>
      <label class="bk__f"><span class="sr-only">Airline</span><input type="text" name="${key}Airline" list="bkAirlines" value="${esc(bk[key + "Airline"] || "")}" placeholder="Airline" autocomplete="off" required></label>
    </div><small class="bk__hint">e.g. AK6220 · AirAsia</small></div>`;
  return `${airArrives(a) ? flight("arr", `Arrival flight · landing at ${esc(a.place)}`) : ""}${airLeaves(a) ? flight("dep", `Departure flight · from ${esc(a.place)}`) : ""}
    <datalist id="bkAirlines">${AIRPORT.airlines.map(x => `<option value="${x}">`).join("")}</datalist>`;
}

// Opened by the Airport Transfer panel when the trip has an online price
function openAirportBooking(details) { bk.air = details; openBooking("airport"); }

function renderBookingDone(it) {
  const hotel = bk.mode === "hotel";
  const when = `${fmtDate(fromIso(bk.start))}${bk.end && bk.end !== bk.start ? " – " + fmtDate(fromIso(bk.end)) : ""}`;
  const people = `${bk.adults} adult${bk.adults > 1 ? "s" : ""}${bk.children ? `, ${bk.children} child${bk.children > 1 ? "ren" : ""}` : ""}`;
  const steps = hotel
    ? [["ok", "Request received", "Just now"], ["now", "Checking room availability", "Usually within 24 hours"], ["", "Invoice and 50% deposit", "Sent by email and WhatsApp"], ["", "Booking confirmed", "Receipt after the deposit"]]
    : [["ok", "Booking received", "Just now"], ["now", "Invoice on its way", "Within 24 hours, by email and WhatsApp"], ["", "Pay the 50% deposit", "Bank transfer, details in the invoice"], ["", "Booking confirmed", "Receipt after the deposit"]];
  const msg = [`Hi Cucimato! I just ${hotel ? "sent an availability request" : "booked"} on your website.`, `${it.name}`, `Dates: ${when}`, `Guests: ${people}`, ...(hotel ? [] : bk.toJetty ? ["One-way to Kuala Besut Jetty", `Boat from the island: ${bk.dep}`] : [`Boat to the island: ${bk.dep}`, ...(bk.oneway ? ["One-way"] : [`Return boat: ${bk.ret}`])]), `Name: ${bk.name}`].join("\n");
  $("bkBody").innerHTML = `
    <div class="bk__done">
      <div class="bk__tick" aria-hidden="true">✓</div>
      <h3 class="bk__title" id="bkTitle" style="padding:0">${hotel ? "We're checking your room" : "Booking received"}</h3>
      <p class="bk__sub">${esc(it.name)} · ${when} · ${people}</p>
      <ul class="bk__tl">${steps.map(s => `<li><i class="${s[0]}">${s[0] === "ok" ? "✓" : ""}</i><div>${s[1]}<small>${s[2]}</small></div></li>`).join("")}</ul>
      <a class="btn btn--wa" href="${waLink(msg)}" target="_blank" rel="noopener">Chat with us on WhatsApp</a>
      <button type="button" class="btn btn--outline" data-bkclose>Done</button>
    </div>`;
}

function bkValidate() {
  if (bk.mode === "airport") {
    const a = bk.air, has = (k) => String(bk[k] || "").trim().length >= 2;
    if (!a.isAirport && (bk.address || "").trim().length < 4) return `Please enter your hotel or address in ${a.city}.`;
    if (a.isAirport && airArrives(a) && (!has("arrAirline") || !has("arrFlight"))) return "Please enter your arrival flight number and airline.";
    if (a.isAirport && airLeaves(a) && (!has("depAirline") || !has("depFlight"))) return "Please enter your departure flight number and airline.";
  }
  if (bk.mode !== "airport") {
  if (!bk.start || !bk.end) return "Please choose your dates.";
  if (bk.end < bk.start) return "Your return date is before your departure date.";
  if (bk.mode !== "hotel" && !bk.dep) return bk.toJetty ? "Please choose your boat time from the island." : "Please choose your boat time to the island.";
  if (bk.mode !== "hotel" && !bk.oneway && !bk.ret) return "Please choose a return boat time.";
  if (!bk.adults) return "Please enter the number of adults.";
  if (bk.adults + bk.children > 99) return "For groups above 99 guests, please WhatsApp us.";
  }
  if (bk.name.trim().length < 2) return "Please enter your full name.";
  const local = bkPhone().replace(/^\+\d+\s/, "");
  if (local.length < 7 || local.length > 12) return "Please enter your WhatsApp number with the right country code.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(bk.email.trim())) return "Please enter a valid email for your invoice.";
  return "";
}

/* ---------- Online payment (HitPay through /api/pay on Cloudflare) ----------
   Book a ferry and Airport Transfer are paid online. The server works the price out
   again; the page only sends the trip details. If payment isn't available (e.g. the
   site runs somewhere without the payment functions), ferry falls back to the old
   "invoice by email" booking and airport falls back to WhatsApp. */
const PAY = { enabled: false, test: false, endpoint: "/api/pay", feePercent: 4 };
// 4% transaction fee on every online payment (any method). Same sum as functions/_lib/pricing.js
const txnFee = (base) => Math.round(base * PAY.feePercent) / 100;
const payTotal = (base) => Math.round((base + txnFee(base)) * 100) / 100;
// Ask the server once whether online payment is switched on (off on GitHub Pages or until HitPay is set up)
fetch(PAY.endpoint, { cache: "no-store" })
  .then(r => r.ok ? r.json() : null)
  .then(d => { PAY.enabled = Boolean(d?.enabled); PAY.test = Boolean(d?.test); if (bkSheet.open && !bk.done && !bk.sending) renderBooking(); })
  .catch(() => {});
const payMode = () => PAY.enabled && (bk.mode === "ferry" || bk.mode === "airport");

function payPayload() {
  const who = { name: bk.name.trim(), email: bk.email.trim(), phone: bkPhone() };
  if (bk.mode === "airport") {
    const a = bk.air;
    const f = (k) => String(bk[k] || "").trim();
    return { type: "airport", trip: a.trip, airport: a.code, service: a.service, direction: a.fromAirport ? "fromAirport" : "toAirport",
      date: a.date, returnDate: a.returnDate, time: a.time, returnTime: a.returnTime, adults: a.adults, children: a.children, ...who,
      ...(a.isAirport ? { arrAirline: airArrives(a) ? f("arrAirline") : "", arrFlight: airArrives(a) ? f("arrFlight").toUpperCase() : "",
        depAirline: airLeaves(a) ? f("depAirline") : "", depFlight: airLeaves(a) ? f("depFlight").toUpperCase() : "" } : { address: f("address") }) };
  }
  return { type: "ferry", trip: bk.oneway ? "oneway" : "return", direction: bk.toJetty ? "toJetty" : "toIsland",
    date: bk.start, returnDate: bk.end, time: bk.dep, returnTime: bk.ret, adults: bk.adults, children: bk.children, ...who };
}

// Returns { url, reference } on success, { unavailable: true } when payment isn't set up, or { error }
async function startPayment() {
  try {
    const res = await fetch(PAY.endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payPayload()) });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.url) return data;
    if (!data || res.status === 503 || res.status === 404 || res.status === 405 || res.status === 501) return { unavailable: true };
    return { error: data.error || "We couldn't start the payment." };
  } catch { return { unavailable: true }; }
}

async function bkSubmit() {
  bk.error = bkValidate();
  if (bk.error) { renderBooking(); bkSheet.querySelector(".bk__err")?.scrollIntoView({ block: "center" }); return; }
  if (payMode()) {
    bk.sending = true; renderBooking();
    const pay = await startPayment();
    if (pay.url) {
      bk.payRef = pay.reference;           // the server already handed the trip to the booking app
      location.href = pay.url;             // HitPay secure checkout
      return;
    }
    bk.sending = false;
    if (pay.error) { bk.error = `${esc(pay.error)} Or <a href="${waLink(MSG_GENERAL)}" target="_blank" rel="noopener">WhatsApp us</a>.`; renderBooking(); return; }
    if (bk.mode === "airport") { bk.error = `Online payment isn't available right now. <a href="${esc(bk.air.waHref)}" target="_blank" rel="noopener">Book on WhatsApp</a> instead.`; renderBooking(); return; }
    // ferry: fall through to the normal booking (invoice by email)
  }
  bk.sending = true; renderBooking();
  try {
    await sendBookingForm();
    bk.done = true;
  } catch {
    bk.error = `We couldn't send your ${bk.mode === "hotel" ? "request" : "booking"}. Please check your connection, or <a href="${waLink(MSG_GENERAL)}" target="_blank" rel="noopener">WhatsApp us</a>.`;
  }
  bk.sending = false; renderBooking();
  bkSheet.scrollTop = 0;
}

// Sends the booking to the Google Form that feeds the booking app
async function sendBookingForm() {
  const F = BOOKING_FORM, hotel = bk.mode === "hotel";
  const p = new URLSearchParams();
  p.append("emailAddress", bk.email.trim());
  p.append(F.name, bk.name.trim());
  p.append(F.phone, bkPhone());
  p.append(F.service, hotel ? F.HOTEL : F.GROUND);
  p.append(F.adults, String(bk.adults));
  p.append(F.children, String(bk.children));
  [["start", bk.start], ["end", bk.end]].forEach(([k, v]) => {
    const [y, m, d] = v.split("-");
    p.append(F[k] + "_year", y); p.append(F[k] + "_month", String(+m)); p.append(F[k] + "_day", String(+d));
  });
  if (hotel) {
    p.append(F.hotel, bkItem().name);
    bk.addons.forEach(a => p.append(F.addons, a));
    p.append("pageHistory", "0,1");
  } else {
    p.append(F.ground, GROUND_FORM_NAME[bk.mode === "ferry" ? "ferry" : bk.id]);
    const oneWayTag = bk.oneway ? (bk.toJetty ? "ONE-WAY Perhentian → Kuala Besut" : "ONE-WAY Kuala Besut → Perhentian") : "";
    const payTag = bk.payRef ? `PAY ONLINE ${bk.payRef}` : "";
    p.append(F.stay, [bk.stay.trim(), payTag, oneWayTag, `${bk.toJetty ? "Boat from island" : "Depart boat"}: ${bk.dep}`, bk.oneway ? "" : `Return boat: ${bk.ret}`].filter(Boolean).join(" | "));
    p.append("pageHistory", "0,2");
  }
  await fetch(F.action, { method: "POST", mode: "no-cors", body: p });
}

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-book]");
  if (b) { e.preventDefault(); openBooking(b.dataset.book, b.dataset.id); }
});
$("bkClose").addEventListener("click", () => bkSheet.close());
bkSheet.addEventListener("click", (e) => {
  if (e.target === bkSheet || e.target.closest("[data-bkclose]")) { bkSheet.close(); return; }
  const add = e.target.closest("[data-bkaddon]");
  if (add) { const v = add.dataset.bkaddon; add.checked ? bk.addons.add(v) : bk.addons.delete(v); $("bkAddonVal").textContent = addonSummary(); }
});
bkSheet.addEventListener("input", (e) => {
  const n = e.target.name;
  if (!n) return;
  if (n === "adults" || n === "children") {
    bk[n] = paxNum(e.target.value);
    const price = bkPrice();
    if (price && $("bkSum")) $("bkSum").innerHTML = bkSumHTML(price);
    return;
  }
  bk[n] = e.target.value;
  if (n === "start") {
    const endEl = bkSheet.querySelector('[name="end"]');
    endEl.min = bk.start;
    if (bk.end && bk.end < bk.start) { bk.end = ""; endEl.value = ""; }
  }
});
bkSheet.addEventListener("submit", (e) => { e.preventDefault(); bkSubmit(); });

/* =========================================================
   Airport Transfer — Kota Bharu (KBR) / Kuala Terengganu (TGG) airport <-> Kuala Besut Jetty
   shared:  RM per person, per way (null = no shared van there). Min 2 passengers, fixed times.
   private: RM per vehicle, per way (published rate + RM20), one price per size in vehicles[].
   Return = 2 ways. Keep in step with functions/_lib/pricing.js (the server works the price out again).
   ========================================================= */
const AIRPORT_REQUEST_MSG = "Hi Cucimato! I have a special request for my airport transfer.\nDate: \nNumber of passengers: \nMy request: ";
const AIRPORT = {
  jetty: "Kuala Besut Jetty",
  places: [
    { code: "KBR", short: "KBR Airport", name: "Kota Bharu Airport (KBR)", airport: true, shared: { adult: 35, child: 30 }, private: [130, 215, 265, 315] },
    { code: "TGG", short: "TGG Airport", name: "Kuala Terengganu Airport (TGG)", airport: true, shared: null, private: [200, 275, 325, 375] },
  ],
  vehicles: [{ max: 4, name: "Car (1–4 pax)" }, { max: 8, name: "8-seater van" }, { max: 12, name: "12-seater van" }, { max: 15, name: "15-seater van" }],
  serviceName: { private: "Private", shared: "Shared" },
  typeLabel: { private: "Private Trip", shared: "Shared Trip" },   // options in the "Transfer Type" dropdown
  sharedMin: 2,
  // Shared van departures (from the airport/city, and from the jetty)
  sharedTimes: { fromPlace: ["8:00 AM", "11:00 AM", "3:00 PM"], fromJetty: ["9:00 AM", "1:00 PM", "5:00 PM"] },
  // Private: estimated pick-up at the airport or city, hourly. Flights should land within this window.
  privateTimes: ["7:00 AM", "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"],
  flightWindow: "7am and 4pm",
  // Pick-up at Kuala Besut Jetty (one-way to the airport, and the return leg), after the boats arrive
  jettyTimes: ["9:00 AM", "1:00 PM", "5:00 PM"],
  maxPax: 30,
  airlines: ["AirAsia", "Malaysia Airlines", "Firefly", "Batik Air"],
};
const paxLabel = (a, c) => `${a} Adult${a > 1 ? "s" : ""}${c ? `, ${c} Child${c > 1 ? "ren" : ""}` : ""}`;

// Price of one airport trip: { total, lines, vehicle } or { total: null, why } when it must go to WhatsApp
function airportQuote(p, type, adults, children, ways) {
  const n = adults + children, w = ways > 1 ? ` × ${ways} ways` : "";
  if (type === "shared") {
    if (!p.shared) return { total: null, why: "noshared" };
    const lines = [[`${rm(p.shared.adult)} × ${adults} adult${adults > 1 ? "s" : ""}${w}`, p.shared.adult * adults * ways],
      ...(children ? [[`${rm(p.shared.child)} × ${children} child${children > 1 ? "ren" : ""}${w}`, p.shared.child * children * ways]] : [])];
    return { total: lines.reduce((s, l) => s + l[1], 0), lines, vehicle: "" };
  }
  const v = AIRPORT.vehicles.findIndex(x => n <= x.max);
  if (v < 0) return { total: null, why: "big" };
  const one = p.private[v], vehicle = AIRPORT.vehicles[v].name;
  return { total: one * ways, lines: [[`${vehicle} · ${rm(one)} per way${w}`, one * ways]], vehicle };
}

(() => {
  if (!$("aForm")) return;
  let payDetails = null;
  const st = { trip: "oneway", type: "", airport: "", fromAirport: true, date: null, ret: null, picking: "date", time: null, retTime: null, adults: 0, children: 0 };
  const typeSel = $("aType"), go = $("aGo"), note = $("aNote");
  const oneway = () => st.trip === "oneway";
  const ap = () => AIRPORT.places.find(a => a.code === st.airport);
  let view = new Date(firstBookable.getFullYear(), firstBookable.getMonth(), 1);

  // ---------- route: the airport/city side is a dropdown ("Choose airport"), the jetty side is fixed ----------
  const airportSelect = () => `<select id="aAirport" aria-label="Airport"><option value="" disabled${st.airport ? "" : " selected"}>Choose airport</option>${AIRPORT.places.map(a => `<option value="${a.code}"${a.code === st.airport ? " selected" : ""}>${a.short}</option>`).join("")}</select>`;
  const jettyText = `<strong>${AIRPORT.jetty}</strong>`;
  function drawRoute() {
    $("aPickSlot").innerHTML = st.fromAirport ? airportSelect() : jettyText;
    $("aDropSlot").innerHTML = st.fromAirport ? jettyText : airportSelect();
    $("aPickBox").classList.toggle("ffield--fixed", !st.fromAirport);
    $("aDropBox").classList.toggle("ffield--fixed", st.fromAirport);
    $("aAirport").addEventListener("change", (e) => { st.airport = e.target.value; drawTypes(); drawSlots(); update(); });
  }

  // ---------- transfer dropdown: only what the place offers (Kuala Terengganu = private) ----------
  function drawTypes() {
    const a = ap();
    const list = a && !a.shared ? ["private"] : ["private", "shared"];
    if (!list.includes(st.type)) st.type = list.length === 1 ? list[0] : "";
    typeSel.innerHTML = `<option value="" disabled${st.type ? "" : " selected"}>Select type</option>` +
      list.map(t => `<option value="${t}"${t === st.type ? " selected" : ""}>${AIRPORT.typeLabel[t]}${a && list.length === 1 ? " (only option)" : ""}</option>`).join("");
  }

  // ---------- times: same time boxes as Book a ferry; shared follows the van schedule ----------
  const shared = () => st.type === "shared";
  const firstTimes = () => st.fromAirport ? (shared() ? AIRPORT.sharedTimes.fromPlace : AIRPORT.privateTimes) : (shared() ? AIRPORT.sharedTimes.fromJetty : AIRPORT.jettyTimes);
  const retTimes = () => shared() ? AIRPORT.sharedTimes.fromJetty : AIRPORT.jettyTimes;
  const slotHTML = (list, chosen, key) => list.map(t => `<button type="button" class="slot" role="radio" data-${key}="${t}" aria-checked="${t === chosen}">${t}</button>`).join("");
  function drawSlots() {
    if (!firstTimes().includes(st.time)) st.time = null;
    if (!retTimes().includes(st.retTime)) st.retTime = null;
    $("aTimeSlots").innerHTML = slotHTML(firstTimes(), st.time, "atime");
    $("aRetTimeSlots").innerHTML = slotHTML(retTimes(), st.retTime, "aret");
  }

  // ---------- calendar: same look and flow as Book a ferry (pick-up date, then return date) ----------
  function monthHTML(y, m) {
    const lead = (new Date(y, m, 1).getDay() + 6) % 7;
    const days = new Date(y, m + 1, 0).getDate();
    let html = "<span></span>".repeat(lead);
    for (let d = 1; d <= days; d++) {
      const date = new Date(y, m, d);
      const isStart = sameDay(date, st.date), isEnd = sameDay(date, st.ret);
      const inRange = !oneway() && st.date && st.ret && date > st.date && date < st.ret;
      const before = st.picking === "ret" && st.date && date < st.date;
      html += `<button type="button" class="cal__day${inRange ? " in-range" : ""}" data-aday="${y}-${m}-${d}"
        aria-label="${fmtDate(date)}${isStart ? " (pick-up)" : isEnd ? " (return)" : ""}"
        aria-pressed="${isStart || isEnd}" ${isBookable(date) && !before ? "" : "disabled"}>${d}</button>`;
    }
    const title = new Date(y, m, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
    return `<div class="fcal__month"><p>${title}</p>
      <div class="cal__grid cal__dow" aria-hidden="true"><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span><span>Su</span></div>
      <div class="cal__grid">${html}</div></div>`;
  }
  function drawCal() {
    const y = view.getFullYear(), m = view.getMonth(), second = new Date(y, m + 1, 1);
    $("aCalMonths").innerHTML = monthHTML(y, m) + monthHTML(second.getFullYear(), second.getMonth());
    $("aCalPrev").disabled = y === firstBookable.getFullYear() && m === firstBookable.getMonth();
    $("aCalNext").disabled = second.getFullYear() === lastBookable.getFullYear() && second.getMonth() === lastBookable.getMonth();
    $("aCalHint").textContent = st.picking === "ret" ? "Now select your return date" : "Select your pick-up date";
  }

  // ---------- popovers ----------
  const POPS = { dates: "aDatesPop", time: "aTimePop", ret: "aRetTimePop", pax: "aPaxPop" };
  const BTNS = ["aDateBtn", "aRetDateBtn", "aTimeBtn", "aRetTimeBtn", "aPaxBtn"];
  function closeAll() { Object.values(POPS).forEach(p => { $(p).hidden = true; }); BTNS.forEach(b => $(b).setAttribute("aria-expanded", "false")); }
  function open(which) {
    closeAll();
    $(POPS[which]).hidden = false;
    const btn = which === "dates" ? (st.picking === "ret" ? "aRetDateBtn" : "aDateBtn") : which === "time" ? "aTimeBtn" : which === "ret" ? "aRetTimeBtn" : "aPaxBtn";
    $(btn).setAttribute("aria-expanded", "true");
    if (which === "dates") drawCal();
    if (which === "pax") setTimeout(() => $("aAdultsIn").focus(), 50);
  }
  const nextStep = () => !st.date || (!oneway() && !st.ret) ? "dates" : !st.time ? "time" : !oneway() && !st.retTime ? "ret" : null;

  function update() {
    const a = ap(), ow = oneway(), ways = ow ? 1 : 2;
    $("panel-airport").classList.toggle("is-oneway", ow);
    $("panel-airport").querySelector(".apanel__row").dataset.cols = ow ? "5" : "7";
    $("aSwap").disabled = !ow; // return trips always start at the airport

    const [pick, drop] = a ? (st.fromAirport ? [a.name, AIRPORT.jetty] : [AIRPORT.jetty, a.name]) : (st.fromAirport ? ["Airport", AIRPORT.jetty] : [AIRPORT.jetty, "Airport"]);
    $("aTimeLabel").textContent = st.fromAirport && !shared() && (!a || a.airport) ? "Estimated Pickup Time" : "Pick-up Time";
    $("aRetTimeLabel").textContent = "Return pick-up";
    $("aTimePopLbl").textContent = `${shared() ? "Shared van from" : "Pick-up at"} ${pick}`;
    $("aRetTimePopLbl").textContent = `${shared() ? "Shared van from" : "Pick-up at"} ${AIRPORT.jetty}`;

    const show = (btn, val, value, empty) => { $(val).textContent = value || empty; $(btn).classList.toggle("is-empty", !value); };
    show("aDateBtn", "aDateVal", st.date && shortDate(st.date), "Select date");
    show("aRetDateBtn", "aRetDateVal", st.ret && shortDate(st.ret), "Select date");
    show("aTimeBtn", "aTimeVal", st.time, "Time");
    show("aRetTimeBtn", "aRetTimeVal", st.retTime, "Time");
    show("aPaxBtn", "aPaxVal", st.adults && paxLabel(st.adults, st.children), "Enter number");
    $("aAirport").closest(".afield").classList.toggle("is-empty", !st.airport);
    typeSel.closest(".afield").classList.toggle("is-empty", !typeSel.value);

    const n = st.adults + st.children;
    const q = a && st.type && st.adults ? airportQuote(a, st.type, st.adults, st.children, ways) : null;
    const svc = AIRPORT.serviceName[st.type] || "";

    // Note: same three lines as Book a ferry (price · ✓ perk · special request)
    const privFrom = Math.min(...(a ? [a] : AIRPORT.places).map(x => x.private[0]));
    const priceText = st.type === "private" || (a && !a.shared)
      ? `Private from ${rm(privFrom)} per vehicle, per way`
      : st.type === "shared" ? `Shared · Adult ${rm(AIRPORT.places[0].shared.adult)} · Child ${rm(AIRPORT.places[0].shared.child)} per way` : `Adult from ${rm(AIRPORT.places[0].shared.adult)} per way`;
    const perk = shared()
      ? (st.fromAirport ? "Shared van leaves at 8am, 11am and 3pm · min. 2 passengers" : "Shared van leaves the jetty at 9am, 1pm and 5pm · min. 2 passengers")
      : a && !a.airport ? `We pick you up at your hotel or address in ${a.city}` : `Please book a flight that lands between ${AIRPORT.flightWindow}`;
    note.innerHTML = `<span class="fnote__price">${ow ? "One-way" : "Return"} · ${priceText}</span>
      <span class="fnote__perks">
        <span class="fnote__perk fnote__perk--tick"><i aria-hidden="true"></i>${perk}</span>
        <span class="fnote__perk">Special request? <a href="${waLink(AIRPORT_REQUEST_MSG)}" target="_blank" rel="noopener">Chat with us on WhatsApp</a></span>
      </span>`;

    const missing = !st.airport ? "Choose airport" : !st.date ? "Select date" : !ow && !st.ret ? "Select return date" : !st.time ? "Select time" : !ow && !st.retTime ? "Select return time"
      : !st.type ? "Choose transfer type" : !st.adults ? "Enter passengers" : shared() && n < AIRPORT.sharedMin ? "Shared: min. 2 passengers" : "";
    go.setAttribute("aria-disabled", String(Boolean(missing)));
    if (missing) { go.textContent = missing; go.removeAttribute("href"); return; }
    const total = q && q.total;
    go.textContent = total == null ? "Book now" : `Book · ${rm(total)}`;
    // priced trips are paid online in the booking sheet; others (e.g. more than 15 on private) go to WhatsApp
    go.dataset.pay = total == null ? "" : "1";
    payDetails = total == null ? null : { trip: ow ? "oneway" : "return", code: a.code, place: a.name, isAirport: a.airport, city: a.city || "",
      service: st.type, serviceName: svc, vehicle: q.vehicle, fromAirport: st.fromAirport, pick, drop,
      date: isoDate(st.date), time: st.time, returnDate: ow ? "" : isoDate(st.ret), returnTime: ow ? "" : st.retTime,
      adults: st.adults, children: st.children, pax: n, lines: q.lines, total };
    go.href = waLink([
      "Hi Cucimato! I'd like to book an airport transfer.",
      `Service: ${svc} transfer${q && q.vehicle ? ` (${q.vehicle})` : ""}, ${ow ? "one-way" : "return"}`,
      `Pick-up: ${pick}`,
      `Drop-off: ${drop}`,
      `Pick-up date: ${fmtDate(st.date)}`,
      `${$("aTimeLabel").textContent}: ${st.time}`,
      ...(ow ? [] : [`Return date: ${fmtDate(st.ret)} (${drop} → ${pick})`, `Return pick-up time: ${st.retTime}`]),
      `Passengers: ${paxLabel(st.adults, st.children)}`,
      ...(total == null ? [] : [`Price: ${rm(total)}`]),
    ].join("\n"));
  }

  // ---------- events ----------
  document.querySelectorAll('input[name="atrip"]').forEach(r => r.addEventListener("change", () => {
    st.trip = r.value;
    if (oneway()) { st.ret = null; st.retTime = null; }
    else if (!st.fromAirport) { st.fromAirport = true; drawRoute(); } // return = airport first
    st.picking = "date"; closeAll(); drawSlots(); update();
  }));
  typeSel.addEventListener("change", () => { st.type = typeSel.value; drawSlots(); update(); });
  // Passengers are typed in, like Book a ferry. Empty children = 0.
  $("aPaxBtn").addEventListener("click", () => $("aPaxPop").hidden ? open("pax") : closeAll());
  $("aPaxPop").addEventListener("input", (e) => {
    const key = e.target.dataset.apax;
    if (!key) return;
    st[key] = Math.min(AIRPORT.maxPax, paxNum(e.target.value));
    update();
  });
  document.querySelector("[data-apaxclose]").addEventListener("click", closeAll);
  $("aSwap").addEventListener("click", () => { if (!oneway()) return; st.fromAirport = !st.fromAirport; closeAll(); drawRoute(); drawSlots(); update(); });

  $("aDateBtn").addEventListener("click", () => { const was = !$("aDatesPop").hidden && st.picking === "date"; st.picking = "date"; was ? closeAll() : open("dates"); });
  $("aRetDateBtn").addEventListener("click", () => { const want = st.date ? "ret" : "date"; const was = !$("aDatesPop").hidden && st.picking === want; st.picking = want; was ? closeAll() : open("dates"); });
  $("aTimeBtn").addEventListener("click", () => $("aTimePop").hidden ? open("time") : closeAll());
  $("aRetTimeBtn").addEventListener("click", () => $("aRetTimePop").hidden ? open("ret") : closeAll());
  document.querySelector("[data-aclose]").addEventListener("click", closeAll);
  $("aCalPrev").addEventListener("click", () => { view.setMonth(view.getMonth() - 1); drawCal(); });
  $("aCalNext").addEventListener("click", () => { view.setMonth(view.getMonth() + 1); drawCal(); });
  $("aCalMonths").addEventListener("click", (e) => {
    const b = e.target.closest("[data-aday]");
    if (!b || b.disabled) return;
    const [y, m, d] = b.dataset.aday.split("-").map(Number);
    const date = new Date(y, m, d);
    let done;
    if (st.picking === "ret") { st.ret = date; st.picking = "date"; done = true; }
    else {
      st.date = date;
      if (st.ret && st.ret < date) st.ret = null;
      done = oneway() || Boolean(st.ret);
      if (!done) st.picking = "ret";
    }
    drawCal(); update();
    if (done) setTimeout(() => { const n = nextStep(); n && n !== "dates" ? open(n) : closeAll(); }, 250);
    else { $("aDateBtn").setAttribute("aria-expanded", "false"); $("aRetDateBtn").setAttribute("aria-expanded", "true"); }
  });
  $("aTimeSlots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-atime]"); if (!b) return;
    st.time = b.dataset.atime; drawSlots(); update();
    setTimeout(() => { nextStep() === "ret" ? open("ret") : closeAll(); }, 200);
  });
  $("aRetTimeSlots").addEventListener("click", (e) => {
    const b = e.target.closest("[data-aret]"); if (!b) return;
    st.retTime = b.dataset.aret; drawSlots(); update();
    setTimeout(closeAll, 200);
  });
  // Clicks outside the airport fields close its popovers
  document.addEventListener("click", (e) => {
    const inside = e.composedPath().some(n => n instanceof Element && n.closest && n.closest("#panel-airport .fpop-wrap"));
    if (!inside && e.target !== go) closeAll();
  });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });
  // Book button before everything is filled: open (or focus) the first empty field
  go.addEventListener("click", (e) => {
    if (go.getAttribute("aria-disabled") !== "true") {
      if (go.dataset.pay === "1" && payDetails && PAY.enabled) { e.preventDefault(); openAirportBooking({ ...payDetails, waHref: go.href }); }
      return;
    }
    e.preventDefault(); e.stopPropagation();
    if (!st.airport) { $("aAirport").focus(); try { $("aAirport").showPicker?.(); } catch {} return; }
    const n = nextStep();
    if (n === "dates") { st.picking = st.date && !oneway() ? "ret" : "date"; open("dates"); return; }
    if (n) { open(n); return; }
    if (!st.type) { typeSel.focus(); try { typeSel.showPicker?.(); } catch {} return; }
    open("pax");
  });

  drawRoute(); drawTypes(); drawSlots(); update();
})();

/* Airport Transfer Schedule (Ferry Schedule tab): shared van times, same boxes as the ferry schedule */
const toSlot = (t) => { const [hm, ap] = t.split(" "); return { t: hm, ap }; };
document.querySelectorAll("[data-asched]").forEach(el => {
  el.innerHTML = `
    <div class="sched__block sched__block--ret">
      <div class="sched__head"><strong>To the jetty</strong><small>KBR Airport → Kuala Besut Jetty</small></div>
      <div class="sched__grid">${slotsHTML(AIRPORT.sharedTimes.fromPlace.map(toSlot))}</div>
    </div>
    <div class="sched__block sched__block--ret">
      <div class="sched__head"><strong>From the jetty</strong><small>Kuala Besut Jetty → KBR Airport</small></div>
      <div class="sched__grid">${slotsHTML(AIRPORT.sharedTimes.fromJetty.map(toSlot))}</div>
    </div>
    <ul class="sched__notes">
      <li>Shared trip times, about 1 hour on the road. Min. 2 passengers.</li>
      <li>Private trip: pick-up any hour from 7am to 4pm, or 9am, 1pm, 5pm from the jetty.</li>
      <li>Flight delayed? <a href="${waLink(AIRPORT_REQUEST_MSG)}" target="_blank" rel="noopener">WhatsApp us</a>.</li>
    </ul>`;
});

/* Ferry & Airport Transfer Prices (Ferry Schedule tab): same data as the booking panels */
document.querySelectorAll("[data-prices]").forEach(el => {
  const sh = AIRPORT.places.find(p => p.shared).shared;
  const rows = [["KBR Airport", "KBR"], ["TGG Airport", "TGG"]]
    .map(([label, code]) => [label, AIRPORT.places.find(p => p.code === code).private]);
  const sizes = ["1–4 pax", "5–8 pax", "9–12 pax", "13–15 pax"];
  el.innerHTML = `
    <div class="ptables">
      <div class="ptable">
        <p class="ptable__title">Ferry ticket<small>Kuala Besut Jetty ⇄ Perhentian Island</small></p>
        <table><thead><tr><th></th><th>Return</th><th>One-way</th></tr></thead><tbody>
          <tr><th>Adult</th><td>${rm(FERRY.adult)}</td><td>${rm(FERRY.oneWay.adult)}</td></tr>
          <tr><th>Child <span>1–9 yrs</span></th><td>${rm(FERRY.child)}</td><td>${rm(FERRY.oneWay.child)}</td></tr>
        </tbody></table>
      </div>
      <div class="ptable">
        <p class="ptable__title">Shared airport transfer<small>KBR Airport ⇄ Kuala Besut Jetty · min. 2 pax</small></p>
        <table><thead><tr><th></th><th>Per way</th><th>Return</th></tr></thead><tbody>
          <tr><th>Adult</th><td>${rm(sh.adult)}</td><td>${rm(sh.adult * 2)}</td></tr>
          <tr><th>Child <span>1–9 yrs</span></th><td>${rm(sh.child)}</td><td>${rm(sh.child * 2)}</td></tr>
        </tbody></table>
        <p class="ptable__note">Leaves at 8am, 11am, 3pm · from the jetty at 9am, 1pm, 5pm</p>
      </div>
      <div class="ptable ptable--wide">
        <p class="ptable__title">Private transfer<small>Per car or van, per way, to or from Kuala Besut Jetty</small></p>
        <div class="ptable__scroll"><table><thead><tr><th></th>${sizes.map(x => `<th>${x}</th>`).join("")}</tr></thead><tbody>
          ${rows.map(([label, prices]) => `<tr><th>${label}</th>${prices.map(v => `<td>${rm(v)}</td>`).join("")}</tr>`).join("")}
        </tbody></table></div>
        <div class="ptable__cards">${rows.map(([label, prices]) => `<table><thead><tr><th>${label}</th><th></th></tr></thead><tbody>
          ${prices.map((v, i) => `<tr><th>${sizes[i]}</th><td>${rm(v)}</td></tr>`).join("")}</tbody></table>`).join("")}</div>
      </div>
    </div>
    <p class="ptable__note">Online payments add a ${PAY.feePercent}% transaction fee, shown before you pay.</p>`;
});

/* Hero tab bar slides sideways on small screens: keep the chosen tab in view */
(() => {
  const bar = document.querySelector(".hero__tabs");
  if (!bar) return;
  const reveal = () => {
    const t = bar.querySelector('.htab[aria-selected="true"]');
    if (!t || bar.scrollWidth <= bar.clientWidth) return;
    const first = t === bar.querySelector(".htab");  // first tab: slide right back to the logo
    const left = first ? 0 : t.offsetLeft - 8, right = t.offsetLeft + t.offsetWidth + 36;
    if (left < bar.scrollLeft) bar.scrollTo({ left, behavior: "smooth" });
    else if (right > bar.scrollLeft + bar.clientWidth) bar.scrollTo({ left: right - bar.clientWidth, behavior: "smooth" });
  };
  new MutationObserver(reveal).observe(bar, { subtree: true, attributes: true, attributeFilter: ["aria-selected"] });
  // hide the right-edge fade once there is nothing more to slide
  const edge = () => bar.classList.toggle("is-end", bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 2);
  bar.addEventListener("scroll", edge, { passive: true });
  addEventListener("resize", edge);
  reveal(); edge();
})();
