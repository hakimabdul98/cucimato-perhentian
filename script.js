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
