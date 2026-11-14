/* =========================================================
   Cucimato Perhentian Island: package data & page behaviour
   To change prices or packages, edit PACKAGES below.
   ========================================================= */

const WHATSAPP = "60192094669";

// p2d1n / p3d2n: price in RM. null shows "Coming soon".
// id must match the image names in images/photos/ (e.g. kiara-main.webp).
const PACKAGES = [
  { id: "kiara", name: "Kiara Perhentian", tags: ["village", "culture"],
    stay: "Air-conditioned room", extras: [], p2d1n: 195, p3d2n: 240 },
  { id: "fauna", name: "Fauna Beach Chalet", tags: ["beachfront", "seaview", "fireshow"],
    stay: "Beachfront chalet", extras: [], p2d1n: 199, p3d2n: 245 },
  { id: "perhentian-bay", name: "Perhentian Bay", tags: ["seaview", "culture"],
    stay: "Seaview room", extras: [], p2d1n: 219, p3d2n: 289 },
  { id: "nemo", name: "Nemo Chalet", tags: ["honeymoon", "seaview", "culture"],
    stay: "Seaview chalet", extras: [], p2d1n: 219, p3d2n: 289 },
  { id: "flora-bay", name: "Flora Bay Resort", tags: ["beachfront", "seaview", "fireshow"],
    stay: "Beachfront resort", extras: ["breakfast"], p2d1n: 220, p3d2n: 290 },
  { id: "arwana", name: "Arwana Perhentian Resort", tags: ["premium", "honeymoon", "beachfront"],
    stay: "Premium resort", extras: ["breakfast"], p2d1n: null, p3d2n: null },
  { id: "sharila", name: "Shari-la Island Resort", tags: ["sunset", "fireshow"],
    stay: "Resort at a sunset view spot", extras: ["breakfast"], p2d1n: null, p3d2n: null },
];

const TAGS = {
  beachfront: "Beachfront", seaview: "Seaview", honeymoon: "Honeymoon", fireshow: "Fire show",
  culture: "Culture", village: "Village", premium: "Premium", sunset: "Sunset spot",
};
const FILTERS = { all: "All", beachfront: "Beachfront", seaview: "Seaview", honeymoon: "Honeymoon", fireshow: "Fire show", culture: "Culture" };

const GALLERY = ["perhentian-bay-1", "nemo-3", "fauna-3", "perhentian-bay-3", "sharila-3", "nemo-2"];

const MSG_GENERAL = "Hi Cucimato! I'm interested in a Perhentian Island package. Could you share more details?";
const msgFor = (name) => `Hi Cucimato! I'm interested in the *${name}* package.\nDates: \nNumber of people: \nLength (2D1N / 3D2N): `;
const waLink = (msg) => `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(msg)}`;

let filter = "all";
const cheapest = Math.min(...PACKAGES.filter(p => p.p2d1n).map(p => p.p2d1n));

/* ---------- render ---------- */
function renderFilters() {
  document.getElementById("filters").innerHTML = Object.entries(FILTERS).map(([key, label]) =>
    `<button class="chip" role="tab" data-filter="${key}" aria-selected="${key === filter}">${label}</button>`
  ).join("");
}

const price = (label, value) =>
  `<div>${label}<strong${value ? "" : ' class="soon"'}>${value ? "RM" + value : "Coming soon"}</strong></div>`;

function renderPackages() {
  const list = PACKAGES.filter(p => filter === "all" || p.tags.includes(filter));
  document.getElementById("pkgGrid").innerHTML = list.map(p => {
    const badge = p.p2d1n === cheapest ? "Best value" : "";
    const stay = p.stay + (p.extras.includes("breakfast") ? " · Breakfast included" : "");
    return `
    <article class="card">
      <button class="card__media" type="button" data-poster="${p.id}" aria-label="View ${p.name} poster">
        <img src="images/photos/${p.id}-main.webp" alt="${p.name}" loading="lazy">
        ${badge ? `<span class="card__badge">${badge}</span>` : ""}
      </button>
      <div class="card__body">
        <p class="card__tags">${p.tags.map(t => TAGS[t]).join(" · ")}</p>
        <h3>${p.name}</h3>
        <p class="card__stay">${stay}</p>
        <div class="card__price">${price("2D1N from", p.p2d1n)}${price("3D2N from", p.p3d2n)}</div>
        <a class="card__link" href="${waLink(msgFor(p.name))}" target="_blank" rel="noopener">${p.p2d1n ? "Book on WhatsApp" : "Ask for price"} →</a>
      </div>
    </article>`;
  }).join("");
}

function renderGallery() {
  document.getElementById("galleryGrid").innerHTML = GALLERY.map(n =>
    `<button type="button" data-zoom="images/photos/${n}.webp" aria-label="Enlarge photo"><img src="images/photos/${n}.webp" alt="" loading="lazy"></button>`
  ).join("");
}

/* =========================================================
   Boat ticket booking (return trip)
   Edit prices, times and ages here. child: null = "price on WhatsApp".
   ========================================================= */
const BOAT = {
  trips: [
    { id: "boat", name: "Boat transfer (return)", adult: 80, child: 40 },
    { id: "perhentian", name: "Boat + Snorkeling Perhentian", adult: 130, child: null },
    { id: "rawa", name: "Boat + Snorkeling Rawa Island", adult: 150, child: null },
  ],
  departWindow: "8am–4pm",                  // to the island: flexible, confirmed on WhatsApp
  returnTimes: ["8:00 AM", "12:00 PM", "4:00 PM"], // back to the jetty: fixed
  adultAge: "Age 12+",
  childAge: "Age 3–11",
  minDaysAhead: 1,      // earliest departure = today + this many days
  maxMonthsAhead: 6,    // how far ahead the calendar goes
  closedMonths: [],     // e.g. [11, 12, 1, 2] to block monsoon months (1 = Jan)
  maxGuests: 30,
};

const booking = { trip: BOAT.trips[0].id, depart: null, ret: null, returnTime: null, adults: 2, children: 0 };
const today = new Date(); today.setHours(0, 0, 0, 0);
const firstBookable = new Date(today); firstBookable.setDate(today.getDate() + BOAT.minDaysAhead);
const lastBookable = new Date(today.getFullYear(), today.getMonth() + BOAT.maxMonthsAhead + 1, 0);
let calView = new Date(firstBookable.getFullYear(), firstBookable.getMonth(), 1);

const rm = (n) => "RM" + n.toLocaleString("en-MY");
const fmtDate = (d) => d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const sameDay = (a, b) => a && b && a.getTime() === b.getTime();
const isBookable = (d) => d >= firstBookable && d <= lastBookable && !BOAT.closedMonths.includes(d.getMonth() + 1);

function renderCalendar() {
  const y = calView.getFullYear(), m = calView.getMonth();
  document.getElementById("calMonth").textContent = calView.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  document.getElementById("calPrev").disabled = y === firstBookable.getFullYear() && m === firstBookable.getMonth();
  document.getElementById("calNext").disabled = y === lastBookable.getFullYear() && m === lastBookable.getMonth();

  const lead = (new Date(y, m, 1).getDay() + 6) % 7; // Monday first
  const days = new Date(y, m + 1, 0).getDate();
  let html = "<span></span>".repeat(lead);
  for (let d = 1; d <= days; d++) {
    const date = new Date(y, m, d);
    const isStart = sameDay(date, booking.depart), isEnd = sameDay(date, booking.ret);
    const inRange = booking.depart && booking.ret && date > booking.depart && date < booking.ret;
    // while picking the return date, days before departure are not selectable
    const beforeDepart = booking.depart && !booking.ret && date < booking.depart;
    const cls = ["cal__day", sameDay(date, today) && "is-today", isStart && "is-start", isEnd && "is-end", inRange && "in-range"].filter(Boolean).join(" ");
    const tag = isStart ? " (departure)" : isEnd ? " (return)" : "";
    html += `<button type="button" class="${cls}" data-day="${d}" aria-label="${fmtDate(date)}${tag}"
      aria-pressed="${isStart || isEnd}" ${isBookable(date) && !beforeDepart ? "" : "disabled"}>${d}</button>`;
  }
  document.getElementById("calDays").innerHTML = html;
  document.getElementById("calHint").textContent =
    !booking.depart ? "Tap your departure date." :
    !booking.ret ? "Now tap your return date." :
    "Tap a date to start again.";
}

function renderTrips() {
  document.getElementById("tripList").innerHTML = BOAT.trips.map(t =>
    `<button type="button" class="trip" role="radio" data-trip="${t.id}" aria-checked="${t.id === booking.trip}">
      ${t.name}<span>${rm(t.adult)} / adult</span></button>`
  ).join("");
}

function renderSlots() {
  document.getElementById("slotList").innerHTML = BOAT.returnTimes.map(t =>
    `<button type="button" class="slot" role="radio" data-slot="${t}" aria-checked="${t === booking.returnTime}">${t}</button>`
  ).join("");
}

function renderBooking() {
  const trip = BOAT.trips.find(t => t.id === booking.trip);
  const { adults, children, depart, ret, returnTime } = booking;
  document.getElementById("adultsOut").textContent = adults;
  document.getElementById("childrenOut").textContent = children;
  document.querySelector('[data-step="adults"][data-d="-1"]').disabled = adults <= 1;
  document.querySelector('[data-step="children"][data-d="-1"]').disabled = children <= 0;
  document.querySelectorAll('[data-d="1"]').forEach(b => { b.disabled = adults + children >= BOAT.maxGuests; });

  const childKnown = trip.child !== null;
  const total = adults * trip.adult + (childKnown ? children * trip.child : 0);
  const rows = [
    ["Trip", trip.name],
    ["Departure", depart ? `${fmtDate(depart)}, ${BOAT.departWindow}` : "Not selected"],
    ["Return", ret ? `${fmtDate(ret)}${returnTime ? ", " + returnTime : ""}` : "Not selected"],
    [`${adults} adult${adults > 1 ? "s" : ""} × ${rm(trip.adult)}`, rm(adults * trip.adult)],
  ];
  if (children) rows.push([`${children} child${children > 1 ? "ren" : ""}${childKnown ? " × " + rm(trip.child) : ""}`,
    childKnown ? rm(children * trip.child) : "Price on WhatsApp"]);
  document.getElementById("summary").innerHTML =
    rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("") +
    `<div class="total"><dt>Total${children && !childKnown ? " (adults)" : ""}</dt><dd>${rm(total)}</dd></div>`;

  const btn = document.getElementById("bookBtn");
  const missing = !depart ? "Choose your departure date" : !ret ? "Choose your return date" : !returnTime ? "Choose a return boat time" : "";
  if (missing) {
    btn.textContent = missing;
    btn.setAttribute("aria-disabled", "true");
    btn.removeAttribute("href");
    return;
  }
  const msg = [
    "Hi Cucimato! I'd like to book a boat ticket.",
    `Trip: ${trip.name}`,
    `Departure: ${fmtDate(depart)} (${BOAT.departWindow}, please confirm the time)`,
    `Return: ${fmtDate(ret)}, ${returnTime}`,
    `Adults: ${adults}`,
    `Children: ${children}`,
    `Total: ${rm(total)}${children && !childKnown ? " + children" : ""}`,
  ].join("\n");
  btn.textContent = `Book for ${rm(total)}${children && !childKnown ? "+" : ""}`;
  btn.removeAttribute("aria-disabled");
  btn.href = waLink(msg);
}

document.getElementById("calDays").addEventListener("click", (e) => {
  const b = e.target.closest("[data-day]");
  if (!b || b.disabled) return;
  const date = new Date(calView.getFullYear(), calView.getMonth(), +b.dataset.day);
  if (!booking.depart || booking.ret) { booking.depart = date; booking.ret = null; }
  else booking.ret = date; // same day allowed (day trip)
  renderCalendar(); renderBooking();
});
document.getElementById("calPrev").addEventListener("click", () => { calView.setMonth(calView.getMonth() - 1); renderCalendar(); });
document.getElementById("calNext").addEventListener("click", () => { calView.setMonth(calView.getMonth() + 1); renderCalendar(); });
document.getElementById("tripList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-trip]");
  if (!b) return;
  booking.trip = b.dataset.trip;
  renderTrips(); renderBooking();
});
document.getElementById("slotList").addEventListener("click", (e) => {
  const b = e.target.closest("[data-slot]");
  if (!b) return;
  booking.returnTime = b.dataset.slot;
  renderSlots(); renderBooking();
});
document.getElementById("booker").addEventListener("click", (e) => {
  const b = e.target.closest("[data-step]");
  if (!b || b.disabled) return;
  booking[b.dataset.step] += +b.dataset.d;
  renderBooking();
});
document.querySelectorAll(".guest small")[0].textContent = BOAT.adultAge;
document.querySelectorAll(".guest small")[1].textContent = BOAT.childAge;

/* ---------- events ---------- */
document.getElementById("filters").addEventListener("click", (e) => {
  const b = e.target.closest("[data-filter]");
  if (!b) return;
  filter = b.dataset.filter;
  renderFilters();
  renderPackages();
});

const lb = document.getElementById("lightbox");
const lbImg = document.getElementById("lbImg");
function openLightbox(src, alt = "") {
  lbImg.src = src; lbImg.alt = alt;
  if (typeof lb.showModal === "function") lb.showModal(); else window.open(src, "_blank");
}
document.getElementById("lbClose").addEventListener("click", () => lb.close());
lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });

document.addEventListener("click", (e) => {
  const poster = e.target.closest("[data-poster]");
  if (poster) return openLightbox(`images/posters/${poster.dataset.poster}.webp`, "Package poster");
  const zoom = e.target.closest("[data-zoom]");
  if (zoom) return openLightbox(zoom.dataset.zoom);
});

// WhatsApp links in static HTML
document.querySelectorAll("[data-wa]").forEach(el => {
  const key = el.dataset.wa;
  el.href = waLink(key === "general" ? MSG_GENERAL : msgFor(key));
});

// intro: skip on click/tap or Esc (it also ends by itself via CSS after ~4s)
const skipIntro = () => document.documentElement.classList.add("no-intro");
document.getElementById("intro").addEventListener("click", skipIntro);
document.addEventListener("keydown", (e) => { if (e.key === "Escape") skipIntro(); }, { once: true });

// mobile menu
const nav = document.querySelector(".nav");
const burger = document.getElementById("burger");
burger.addEventListener("click", () => {
  const open = nav.classList.toggle("is-open");
  burger.setAttribute("aria-expanded", open);
});
document.getElementById("navLinks").addEventListener("click", (e) => {
  if (e.target.closest("a")) { nav.classList.remove("is-open"); burger.setAttribute("aria-expanded", "false"); }
});

document.getElementById("year").textContent = new Date().getFullYear();
renderGallery();
renderFilters();
renderPackages();
renderCalendar();
renderTrips();
renderSlots();
renderBooking();
