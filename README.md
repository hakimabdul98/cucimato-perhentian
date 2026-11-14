# Cucimato Perhentian Island 🐢

Website for Cucimato's Perhentian Island holiday packages: accommodation, snorkeling, return boat transfer, and booking straight through WhatsApp.

Static site (HTML + CSS + JavaScript), no build step. Ready for GitHub Pages.

## Structure

```
index.html          Page
style.css           Styles
script.js           Package data and page behaviour
images/brand/       Logo (white for dark backgrounds, dark for light)
images/photos/      Photos cropped from the package posters
images/posters/     Full posters (opened with "View poster")
```

## Update prices or packages

Edit the `PACKAGES` list at the top of `script.js`:

```js
{ id: "arwana", name: "Arwana Perhentian Resort", p2d1n: null, p3d2n: null, ... }
```

- `p2d1n` / `p3d2n`: 2D1N and 3D2N price in RM. `null` shows "Coming soon".
- `id` must match the image names in `images/photos/` (e.g. `arwana-main.webp`).

The WhatsApp number is set in `WHATSAPP` at the top of `script.js`.

## Run locally

```bash
python3 -m http.server 8765
```

Then open http://localhost:8765

## Publish with GitHub Pages

Repo → **Settings** → **Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
