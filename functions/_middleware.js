/* Coming soon gate (Cloudflare Pages middleware)

   While COMING_SOON is true, the home page ("/") shows coming-soon.html to everyone,
   e.g. visitors from the Instagram bio link. Everything else works as before:
   /api/* (HitPay payments and webhook), /payment, /terms, images, css and js.

   The owner can still see the real site:
     open  https://cucimatoperhentianisland.my/?preview=<key>   once (sets a cookie for this browser)
     open  https://cucimatoperhentianisland.my/?preview=off     to see the coming soon page again
   Only the SHA-256 of the key is kept here, so the public repo does not reveal it.

   To launch the site: set COMING_SOON to false (or delete this file) and push. */
const COMING_SOON = true;
const PREVIEW_HASH = "d174a6e02ecc9b894e5c4d188ffd1cfe5e8ce8fc0f80ca6cacbaaa37615d2901";
const COOKIE = "cm_preview";
const HOME = new Set(["/", "/index", "/index.html"]);

async function sha256(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
}

function cookieValue(request, name) {
  const m = (request.headers.get("Cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : "";
}

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  if (!COMING_SOON || !HOME.has(url.pathname) || !["GET", "HEAD"].includes(request.method)) return next();

  // ?preview=<key> remembers this browser; ?preview=off forgets it
  const asked = url.searchParams.get("preview");
  if (asked !== null) {
    url.searchParams.delete("preview");
    const back = url.pathname + (url.search || "");
    if (asked === "off") {
      return new Response(null, { status: 302, headers: { Location: back, "Set-Cookie": `${COOKIE}=; Path=/; Max-Age=0; Secure; HttpOnly; SameSite=Lax`, "Cache-Control": "no-store" } });
    }
    if ((await sha256(asked)) === PREVIEW_HASH) {
      return new Response(null, { status: 302, headers: { Location: back, "Set-Cookie": `${COOKIE}=${encodeURIComponent(asked)}; Path=/; Max-Age=31536000; Secure; HttpOnly; SameSite=Lax`, "Cache-Control": "no-store" } });
    }
  }
  const seen = cookieValue(request, COOKIE);
  if (seen && (await sha256(seen)) === PREVIEW_HASH) {
    const res = await next();
    const out = new Response(res.body, res);
    out.headers.set("Cache-Control", "no-store");
    return out;
  }

  // everyone else: the coming soon page (Pages serves coming-soon.html at /coming-soon)
  const page = await env.ASSETS.fetch(new URL("/coming-soon", url.origin));
  const out = new Response(page.body, { status: 200, headers: page.headers });
  out.headers.set("Cache-Control", "no-store");
  return out;
}
