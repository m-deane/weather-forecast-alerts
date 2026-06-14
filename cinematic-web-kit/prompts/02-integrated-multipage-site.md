# Workflow Launch Prompt — Integrated Landscape Photography Website

Paste everything below the line into a Claude Code session in this project to run
the multi-agent build. It extends the verified flight experience (`index.html`,
see `BUILD-LOG.md`) into a fully integrated, multi-page landscape photography
website. Reference models: **alexnail.com** (services IA: gallery / book /
workshops / licensing / prints / about / contact) and **northlandscapes.com**
(dark minimal archive: series grid, image-first, prints + licensing pathways
woven through rather than siloed).

---

You are extending my photography portfolio into a complete, integrated landscape
photography website, on **autopilot**, orchestrating parallel agents. Sources of
truth, in priority order:

1. **Handbook amendments** (below) — these override the originals where they conflict
2. `drone-photography-site-build-handbook.md` — design system §2, constraints §4
3. `cinematic-web-prompt-handbook.md` — technology playbook
4. `index.html` + `BUILD-LOG.md` — the verified flight experience; its design tokens,
   HUD glass recipe, and motion language are the site-wide design system

## Site architecture (lock this)

Multi-page static site, no build step, deployable to any static host (Vercel later):

```
/                       index.html        The Descent — the flight stays the homepage
/portfolio/             portfolio page    collections grid (northlandscapes-style cards)
/portfolio/{collection} one page each     justified photo grid + lightbox
/prints/                prints page       fine-art prints + licensing info, enquiry CTA
/about/                 about page        bio, approach, kit, publications
/contact/               contact page      enquiry form (mailto action + Formspree-ready)
/assets/css/tokens.css                    design tokens extracted from index.html §2
/assets/css/site.css                      shared layout/typography/components
/assets/js/data.js                        PHOTOS + COLLECTIONS — single data source
/assets/js/site.js                        header, reveals, lightbox, shared behaviour
/sitemap.xml, robots.txt
```

- **Design language**: keep the blue-hour→golden-hour palette and editorial
  serif/grotesque pairing site-wide — the dark, image-first northlandscapes
  aesthetic, not a white alexnail-style theme. Photographs are the only colour.
- **Navigation** (amends the "no nav bar" rule): every page gets a minimal fixed
  header — wordmark left, four links right (Portfolio · Prints · About · Contact),
  glassmorphism treatment from the HUD recipe, plain markup (no-JS functional).
  On the flight homepage the header fades in only after the first waypoint and a
  final "Explore the archive →" CTA is added to the outro section.
- **Content model**: promote the `LOCATIONS` array into `assets/js/data.js` as
  `PHOTOS` (all 16 images: id, title, location, coords, altM, lens, caption,
  collection, srcs for each derivative size) + `COLLECTIONS` (id, title, blurb,
  cover, photo order). The flight keeps its curated 8; the archive shows all 16.
  Suggested collections (curate freely, flag your choices): Highlands & Islands
  (p01 p05 p07 p08 p16) · Mountains & Night (p02 p03 p12) · Desert Light
  (p04 p11 p14) · Sea & Sun (p09 p10) · Wild Encounters (p06 p13 p15).
- **Images**: generate derivatives with a script (`scripts/derive-images.sh`,
  macOS `sips`): thumb @600px, display @1400px (already exist), zoom @2400px max.
  Grids load thumbs with `srcset`; lightbox loads display, upgrades to zoom.
  Photo fidelity rules from §4 extend site-wide: **no CSS filters, no overlays,
  no tinting on any photograph anywhere** — true colour everywhere.
- **Lightbox**: keyboard navigable (←/→/Esc), focus-trapped, caption + telemetry
  line (coords · altitude · lens) in HUD typography, swipe on touch, lazy
  preloading of neighbours, URL hash per photo for deep linking.
- **Commerce scope**: prints page is informational (sizes, papers, editions,
  pricing table) with enquiry CTAs into the contact form — no payment backend in
  this phase. Licensing section on the same page, northlandscapes-style.
- **SEO/a11y**: per-page title/description/OG tags (OG image per collection),
  sitemap.xml, skip-nav link, focus states, semantic landmarks, reduced-motion
  honoured on every page, every page readable with JS disabled.

## Workflow protocol

Run as orchestrated agent waves (max 4 agents per wave; every agent prompt must
embed: "Write ALL code and detail to your checkpoint file under
`.claude/checkpoints/`. Inline return ≤150 words. Write checkpoint FIRST."):

- **Wave 0 — foundations (sequential, you do this directly)**: extract
  `tokens.css` / `site.css` / `data.js` / `site.js` skeleton from `index.html`;
  run the image-derivative script; define the shared header/footer markup snippet
  agents must copy verbatim into each page. Verify before dispatch.
- **Wave 1 — pages (4 parallel agents)**:
  A: `/portfolio/` hub + all collection pages + lightbox;
  B: `/prints/` + `/about/`;
  C: `/contact/` + homepage integration (header fade-in, outro CTA, link wiring);
  D: SEO pass (meta/OG/sitemap/robots) + responsive `srcset` audit.
  Every agent prompt restates the photo-fidelity and no-JS constraints explicitly —
  agents inherit nothing implicitly.
- **Wave 2 — integration & verification (sequential)**: resolve collisions, then
  verify with tools headlessly (the CDP harness pattern in BUILD-LOG.md): console
  clean on every page; every nav link and lightbox deep-link resolves; lightbox
  keyboard flow; mobile + reduced-motion + no-JS on every page; flight homepage
  still passes its original §7 checklist (regression). Log everything to
  `BUILD-LOG.md` (append, don't overwrite). Report the checklist line by line,
  then stop.

## Handbook amendments (override the originals)

1. **§2 "No traditional nav bar"** → applies to the flight *experience* only, and
   only until the first waypoint. Site-wide, a minimal glass header is required;
   navigation may never depend on JavaScript.
2. **§2 Content model** → `LOCATIONS` is superseded by site-wide `PHOTOS` +
   `COLLECTIONS` in `assets/js/data.js`. The flight homepage imports its 8
   waypoints from there. One data source for flight, HUD, archive, lightbox, OG.
3. **§4 constraint 1 (photo fidelity)** → extended: no CSS `filter`, `opacity`
   stacking, blend modes, or gradient overlays on any `<img>`/texture site-wide.
4. **§4 "cap textures ~2048px"** → generalised into the derivative pipeline:
   thumb 600 / display 1400 / zoom 2400, delivered via `srcset`.
5. **§4 "single HTML file"** → retired for production. Multi-file static site;
   pinned CDN imports with SRI on every page; no build step.
6. **§5 phase plan** → append: Phase 8 foundations extraction, Phase 9 archive
   (portfolio + galleries + lightbox), Phase 10 commerce/info pages, Phase 11
   homepage integration, Phase 12 SEO, Phase 13 site-wide verification.
7. **§7 definition of done** → add: per-page meta/OG + sitemap; lightbox fully
   keyboard accessible; every page passes no-JS, mobile, and reduced-motion
   checks; shared tokens are the only source of colour/type/motion values;
   flight homepage regression-clean.
8. **Reference anchors** → add alexnail.com (multi-revenue IA: workshops,
   licensing, commissions — future phases) and northlandscapes.com (dark archive
   grid, commerce woven through). Cinematic handbook needs no changes — its
   glassmorphism and motion recipes now also govern the header and lightbox.

## Definition of done

Amended §7 (item 7 above), verified with tools and reported line by line — plus:
every photograph identical in colour to its source file on every page, and the
whole site navigable end-to-end with JavaScript disabled.
