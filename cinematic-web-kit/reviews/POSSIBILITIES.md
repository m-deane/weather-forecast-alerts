# POSSIBILITIES — Handbook Audit + Art of the Possible

Four-agent review, 2026-06-12 (HANDBOOK, FRONTIER, INSPIRATION, ADDITIONS) +
adjudication. Review-only: no site file was modified. Full per-finding detail
(implementation sketches, GLSL recipes, draft handbook amendment text, legal
notes) lives in `.claude/checkpoints/20260612-possibilities/agent-*.md`.
Adjudication spot-verified: four INSPIRATION URLs re-fetched (all 200), the
no-@font-face and zero-localStorage claims (two agents independently agree),
and the "random seed is discarded, never written to the URL" caveat (grep
confirms — A4's first sub-task is real). FRONTIER's frame-time numbers are
labelled estimates throughout (the module didn't boot in its headless
instance); its GPU caps and addon-availability numbers are measured.

## 1. Executive summary — top 10

| # | What | What you'd see | Effort | Impact |
|---|------|----------------|--------|--------|
| 1 | **A8 — static photo pages `/photo/<id>/`** | Every photograph finally has a canonical URL: full-bleed page, story/EXIF, prev/next, print CTA, per-image Licensable JSON-LD — the site's biggest SEO/product gap | M | 5 |
| 2 | **F9 — instanced theme furniture** | Sea stacks sliding past the Faroes leg, scree on the ridges, a lit blocky skyline under Calton — the empty midground becomes per-leg identity for ~3 draw calls | M | 5 |
| 3 | **F4 — animated water on the sea legs** | The flattened "sea" actually moves: scrolling normal-map specular under the dusk/gold sun, the finale's sun-trail becoming real | M | 5 |
| 4 | **I3 — scroll-drawn flight-route map** | A stylised route draws itself across a map as you fly (Codrops ScrollMap pattern) — the single best thematic fit found anywhere; pairs with A2's procedural SVG/globe options | M | 5 |
| 5 | **A1 — EXIF/story panel in the lightbox** | An ⓘ toggle with the photograph's story + real EXIF; the substrate for #1 and the forcing function for the C14 metadata ledger | S–M | 4 |
| 6 | **F2 — god-rays from the sun** | Crepuscular shafts over the terrain horizon on gold/dusk legs — highest atmosphere-payoff-per-line (~40 lines of GLSL in the existing composer) | M | 4 |
| 7 | **A7 — favourites shortlist (localStorage)** | Heart photos across the archive → "Enquire about these prints" with several frames at once — the missing middle of the print funnel (localStorage verified unblocked) | M | 4 |
| 8 | **I1/I2 — shader-wipe page transitions + Flip lightbox continuity** | Flight→archive→lightbox stops hard-cutting; the clicked thumbnail travels into the viewer (verified live exemplars incl. an expedition-photography demo) | M | 4 |
| 9 | **H2 — single-source the flight data** | index.html's inline LOCATIONS merges into data.js (light/theme fields included) — kills the two-copies drift the audit caught | M | 4 |
| 10 | **F7c + F8 — exposure adaptation + Mie sun-glow graft** | Eye-like exposure lag when night hands over to gold; a sun-relative glow in the existing dome — both ~free | S | 3 |

**Quarantined for your call (law-bending):** 2.5D depth parallax of the
photographs and Ken Burns drift (§6) · **Killed:** TAA/SMAA (4×MSAA already at
the GPU max — measured), full LOD clipmaps, hover-displacement on photographs,
film-emulation post.

## 2. Handbook compliance (HANDBOOK, 73 promises scored)

**49 HONOURED · 6 EXCEEDED · 10 DRIFTED · 5 NOT YET · 2 N/A.** The cinematic
handbook's §7 pre-flight checklist scores **9/9** — fully discharged; its only
half-pulled lever is the `?grade=1` grain/vignette pass (shipped OFF awaiting
taste verdict).

**Confirmed NOT YET (the real debts):** production still runs prototype system
font stacks (no `@font-face` anywhere — D5; the licensing mechanics are in
A10); real EXIF/coords (7+ `/* VERIFY */` flags live in data.js — C14 ledger);
live contact form's Formspree `FORM_ID` placeholder (posts nowhere — the most
user-facing debt on the deployed site); empty `sameAs` social arrays; the
standing human checks (Lenis wheel-feel, real-60fps).

**The headline finding (H10):** the handbooks describe a site that no longer
exists. The signature behaviours — per-visit shuffle, altitude-true
smootherstep path, dual-camera photos-never-rotate law, per-leg light
profiles, themed fBm terrain, sky dome, pano cruise, the multi-page
architecture and all 8 amendments (which live only inside a launch-prompt
file) — are undocumented exceedance. **Recommendation: MAJOR revision of the
drone handbook** (4 superseded rules, 2 new sections — paste-ready amendment
drafts H1–H12 are written in the checkpoint), **minor for the cinematic
handbook**. Notable drifts needing a decision, not just paperwork: H2 (flight
doesn't actually import data.js — two copies of titles/coords/lens exist) and
the texture-cap law (the @2400 upgrade exceeds the written ≤2048 cap — amend
the law to match the shipped, measured-safe behaviour).

## 3. Texture / detail / resolution — the rendering frontier (FRONTIER, 17 items)

Ranked for this codebase (full sketches anchored to actual functions in the
checkpoint):

**Do:** F9 instanced furniture (M/5) · F4 custom water shader — NOT three's
reflection-RT Water.js (M/5) · F2 god-rays radial blur in the composer (M/4) ·
F7c exposure adaptation, ~3 lines (S/3) · F8 Mie sun-glow grafted into the
existing dome rather than full Preetham (S/3 — full Sky.js would fight the
brand palette) · F5a snow + canyon dust via the existing points pattern (S/3) ·
F3a terrain per-pixel normals via onBeforeCompile, canyon/ridge legs (M/4).

**When budget allows:** F5b GPGPU starling murmuration off the Faroes cliffs —
4,096 agents via GPUComputationRenderer, the "world is alive" signature moment
(L/4) · F1 raymarched volumetric cloud impostors at punch-through banks only —
the riskiest fps item, ship behind `?vol=1` and measure (L/4) · F7a mid-leg
depth-of-field, taste-test (M/3) · F7b anamorphic flare sprite (S/2–3).

**Measured facts that changed the plan:** GPU `MAX_TEXTURE_SIZE` 16384 — photo
resolution is **source-limited, not GPU-limited**: masters are 2600px and
@2400 is already ~92% of that; a @3600 rung only pays if you re-export from
RAW. The single weakest asset on the site is the **pano master at 2600×231** —
re-stitching it at full height is the highest-value single file swap available
(it textures a 450-unit plane during its own dedicated cruise). MSAA is
already at the GPU's 4× max → TAA/SMAA killed. KTX2/BasisU compression
rejected for photographs (block artefacts ≈ grading-law violation in spirit).

**WebGPU/TSL migration:** real but not now — no fps win at 25–46 draw calls;
do it as a dedicated wave when a feature needs it (100k-agent murmurations,
TRAA), re-proving the photo-pass isolation law under the new renderer.

## 4. State of the art worth stealing (INSPIRATION, 14 verified-live patterns)

Best fits (every URL fetched; key ones re-verified at adjudication):
- **Scroll-drawn SVG route map** — tympanus.net/Tutorials/ScrollMap/ (law-safe, impact 5)
- **Mood-based environment from the upcoming photo** — DepthGallery pattern:
  sky/fog tinted toward the next photograph's palette; *the law-compliant
  inverse of grading* (the environment adapts to the photo, never vice versa)
- **Shader-wipe + View-Transition page changes** — thibaultguignand.com + Codrops writeup
- **Flip lightbox continuity** — pixelimageeffect.pages.dev (itself an
  expedition-photography demo); thumbnail travels into the viewer
- **Full-GPU lightbox sequencing** (Camille Mormal school, L) · **DOM-synced
  WebGL titles** with velocity shimmer (Troika pattern, M) · **circular shader
  reveal** for lightbox open (S–M) · **ambient audio, mute-first** (lusion.co
  exemplar, M) · **infinite print strip** (flat = law-safe, M) · **free-pan
  infinite-canvas archive mode** (L) · **within-frame parallax rows** (law-safe
  reframe family, S–M) · **WebXR print room** (niche, L)

Flagged law-benders among the patterns: hover displacement grids, wavy
carousels, pixel reveals — lawful substitutes documented (displace frames/
terrain/typography, never photographs). Not found live anywhere award-level:
PWA/offline portfolios (tutorials only) — consistent with A16's "defer".

## 5. Feature additions (ADDITIONS, 19 ideas — 18 fully static-feasible)

Top tier: **A8** photo pages (M/5) · **A1** EXIF/story panel (S–M/4) · **A7**
favourites→multi-enquiry (M/4) · **A2** flight-path map — SVG mini-map (M) or
wireframe globe in the existing scene (L), Natural Earth public-domain
coastlines, gated on C14 coords (4) · **A15** Stripe Payment Links — genuinely
zero-server checkout *when prices exist*; needs a terms-of-sale page (M/4–5).

Quick wins: **A17** IPTC/XMP copyright embedded in every derivative (exiftool
one-liner; second Licensable-badge signal) · **A10** preload/preconnect/
speculation-rules hints + the typeface-licence decision path · **A9** RSS/JSON
feed + image sitemap (one generator) · **A4** shuffle-share UX (persist the
seed to the URL first — verified currently discarded) · **A13** a11y batch
(lightbox long-descriptions, keyboard zoom-pan, "skip the flight" link,
Save-Data, and the generic focus-trap fix that A1/A7/A8 all depend on) ·
**A12** GoatCounter (cookieless, no banner) to de-blind the funnel · **A18**
size-toggle on the room scenes · **A14** altitude-band archive chips.

Honest backend tally: only general per-seed OG cards (A5) truly needs one
(cheapest: one free Cloudflare Worker); a curated named-flights set covers 80%
statically. AR print preview (A6) is static-feasible but consumer-law-flagged
("approximate scale" until editions are final) — gate `?ar=1`.

**Cross-cutting traps (read before building anything):** deploy-hf.py's
hard-coded DIRS list must become glob-auto-discovered before any idea that
adds directories; the lightbox focus-trap is a hard-coded array touched by
four ideas — fix generically first; one data.js schema addition
(`story`/`exif{}`/`date`/verified coords) unblocks five ideas at once.

## 6. Law-bending — Matthew's call only, never recommendations

- **Q1 — 2.5D depth-map parallax of photographs** (L / impact 3–4): genuine wow
  on the cliff/canyon shots, but pixel-honest truth: it warps the photograph
  and fabricates disoccluded pixels — the image mid-approach is no longer the
  photograph as shot. If ever trialled: ≤1% UV amplitude, hard-zero before
  every dwell, behind a flag.
- **Q2 — Ken Burns in-plane drift** (S / 2–3): a crop, not a warp — identical
  to today at every meet; mild-bending, defensible as "the camera drifts".
- From the patterns: pixel-reveal lightbox opens, image displacement, plane
  bending — all documented with lawful substitutes.

## 7. Roadmap

**Quick wins (no decisions, ≤1 day total):** F7c · F8 graft · F5a · A17 · A9 ·
A10 hints · A13 batch (incl. trap fix) · A4 seed persistence + share · A14.
**Next wave:** A1 → A8 (+ deploy-hf DIRS refactor + data.js schema) · F9 · F4 ·
F2 · I1/I2 transitions · A7 · A12 · H2 single-sourcing · handbook major
revision (drafts ready) · F3a.
**Ambitious:** I3/A2 route map · F5b murmuration · F1 volumetric clouds
(flag-gated) · I5 GPU lightbox · A15 (blocked on prices) · A6 AR (flagged) ·
pano re-stitch + @3600 rung (blocked on RAW sources).
**Research-grade / later:** WebGPU-TSL wave · infinite-canvas archive mode ·
WebXR room · PWA (defer).

## 8. Already excellent — leave alone

The dual-pass photo-fidelity architecture (stronger than its own handbook);
the piecewise scroll mapping + anchor-sort hardening; the altitude-true
smootherstep path; per-leg light profiles; the shuffle with seedable
verification; MSAA half-float post chain (at GPU max); the three-mode
fallback discipline (no-JS/lite/static verified every wave); SRI-pinned CDNs;
the BUILD-LOG verification culture itself. None of the 60+ ideas above
requires touching any of these — they are the platform the ideas stand on.
