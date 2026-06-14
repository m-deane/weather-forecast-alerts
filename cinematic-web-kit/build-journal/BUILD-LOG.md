# BUILD-LOG — The Descent (aerial photo-essay portfolio)

Autopilot build, 2026-06-09. Source of truth: `drone-photography-site-build-handbook.md`
(+ `cinematic-web-prompt-handbook.md`). Output: `index.html` (single self-contained file,
pinned CDN imports with SRI hashes). Photos: `photos/pXX@1400.jpg` (≤1400px, under the
2048px texture cap).

Phases were built in consolidated passes (0–2 together, 3–6 together, 7 as fix-ups),
but each phase's acceptance criteria were verified individually with tools, as below.
Verification environment: headless Chrome 149 driven over CDP (console, network,
screenshots, viewport/media emulation) against `python3 -m http.server 8123`.
Note: interactive browser verification via the Chrome extension was declined this
session, so all checks ran in headless Chrome instead — wheel-feel of Lenis smoothing
deserves one human spot-check.

## Phase 0 — Scaffold & foundations — VERIFIED
- Pinned CDNs: GSAP 3.12.5 + ScrollTrigger (cdnjs), Lenis 1.0.42 (jsdelivr),
  three 0.160.0 via import map (jsdelivr). All four URLs fetched and given
  sha384 SRI hashes (`integrity` + `crossorigin`; import-map `integrity` for three).
- §2 tokens as CSS custom properties; system font stacks; `prefers-reduced-motion`
  drives a three-way MODE switch (`flight` / `lite` / `static`).
- Verified: Node `--check` on the module script passes; console clean on load.

## Phase 1 — Static editorial essay — VERIFIED
- Hero + 8 location sections (title, photo, caption, telemetry) + flight-log index +
  footer, fully responsive, semantic HTML.
- Verified with JavaScript disabled (CDP `setScriptExecutionDisabled`): full essay
  renders. **Bug found & fixed**: preloader originally trapped no-JS visitors —
  added `<noscript>` hide + a 6s inline (non-CDN-dependent) safety fallback.

## Phase 2 — Lenis + reveals — VERIFIED
- Lenis synced via `lenis.on('scroll', ScrollTrigger.update)` driven from `gsap.ticker`.
- Manual per-word span splitting (no SplitText); fire-once reveals (power3.out,
  0.6–1.2s, stagger .07–.09); `gsap.set()` initial states; reduced-motion path
  collapses to opacity-only.

## Phase 3 — Flight space — VERIFIED (1 bug found & fixed)
- Procedural low-poly terrain (sine-field displacement, flattens to sea by the finale),
  scroll-scrubbed camera path (forward + descending, with a below-terrain dip at the
  canyon waypoint), SRGB output + ACES tone mapping on the atmosphere only.
- **Bug**: the global linear scrub let DOM text drift ~1 section behind the 3D planes
  (glacier photo passed under the Faroes caption). Replaced with a piecewise
  scroll→flight mapping anchoring each section's sticky dwell to its waypoint's t.
- **Bug**: `tMeet` sign error ((−z+86)/L instead of (−z−6)/L) put the camera ~90
  units past each photo at section centres. Fixed; verified photo-centred frames
  at 6 waypoints.

## Phase 4 — Photographs as planes — VERIFIED
- `MeshBasicMaterial` (unlit), `toneMapped:false`, sRGB textures, rendered in a
  second scene/pass after the bloom composer → photos can never be tone-mapped,
  fogged, or bloomed. Aspect ratio taken from each loaded texture.
- Lazy-load confirmed in network log: hero up front, then pairs at +6.5s, +9.3s,
  +12.2s, +14.9s as the camera approached. (Each photo is requested by both the
  hidden DOM `<img>` and the texture loader — same URL, second hit is HTTP cache.)

## Phase 5 — Atmosphere — VERIFIED
- 2,600 light motes + 1,400 stars (AdditiveBlending, capped, drifting; stars fade
  out as day breaks), FogExp2 + layered canvas-texture cloud planes between
  waypoints, fullscreen veil peaking as the camera punches a bank (measured 0.456
  in-bank vs 0.004 at waypoints), UnrealBloom (0.55/0.65/0.72) on the atmosphere
  composer only. Palette interpolates night→dusk→haze→horizon→sun across the route.

## Phase 6 — HUD & navigation — VERIFIED
- Glassmorphism HUD (blur 15px + low-alpha fallback) reads from `LOCATIONS`;
  altitude interpolates between waypoints (measured 1,065 m mid-descent between
  Milky Way and Calton Hill; −8 m in the canyon). Location index flies via
  `lenis.scrollTo`; outro flight-log anchors do the same.

## Phase 7 — Polish / fallbacks / a11y — VERIFIED
- Flight-instrument preloader (altitude count-up), min 900ms, three safety nets
  (texture load, 5s timeout, 6s no-module inline fallback).
- Mobile (≤820px) = `lite`: no 3D, vertical photo parallax, HUD via
  IntersectionObserver — verified at 390×844 (mode=lite, parallax transform applied).
- `prefers-reduced-motion` = `static`: verified via CDP media emulation (mode=static).
- dpr capped at 2; antialias on; resize handler rebuilds anchors; focus-visible
  styles on all interactive elements; semantic HTML behind the canvas.

## Definition of done (§7) — final status
- [x] Reads as a static essay with JS disabled
- [x] Flight locked to scroll (piecewise mapping; no desync at any waypoint)
- [x] Photos at true colour (unlit, sRGB, no tone mapping, no bloom — separate pass)
- [x] Cloud descents continuous; atmosphere shares the §2 palette
- [x] HUD legible & synced (verified at 10+ scroll positions)
- [x] Preloader prevents pop-in (and never traps no-JS/no-CDN visitors)
- [x] Mobile lightweight fallback (no 3D on phones)
- [x] prefers-reduced-motion honoured (static mode, opacity-only)
- [x] One motion language (§2 tokens throughout)
- [x] Console clean; dpr capped; textures capped (@1400 assets); single-page session
      lifetime, no teardown path required

## Open items for Matthew
- `// VERIFY` metadata: Milky Way + glacier valley coords (guessed Tian Shan),
  Faroes headland, golden-hour location (guessed SE Asia). Lens/EXIF strings are
  formatted placeholders — swap in real EXIF.
- One human pass on scroll feel (Lenis lerp 1.15, scrub smoothing 0.085) — tune to taste.
- Production build (Phase 7+ of the handbook): real display face, multi-file,
  Vercel deploy.

---

# BUILD-LOG — Integrated site (Phases 8–13), 2026-06-09

Autopilot run of `website-workflow-launch-prompt.md`. Multi-page static site
extending the verified flight homepage. Same verification environment
(headless Chrome 149 over CDP + python http.server :8123).

## Wave 0 — foundations (Phase 8) — VERIFIED
- `assets/css/tokens.css` + `assets/css/site.css` (header/footer/page scaffold/
  cards/justified grid/reveals/buttons/tables/forms) extracted from index.html.
- `assets/js/data.js`: PHOTOS (all 16) + COLLECTIONS (5: highlands, mountains,
  desert, sea, wild) + srcset helpers — the site-wide single data source.
- `assets/js/site.js`: dependency-free IntersectionObserver reveals (no-JS safe:
  hidden state only added by JS) + aria-current nav marking.
- `scripts/derive-images.sh` ran: @600 + @2400 derivatives for all 16 masters
  (display @1400 already existed). node --check clean on both JS modules.
- Earlier this session: flight particles upgraded to 128px soft radial sprites
  (3,200 motes + 1,800 stars), verified visually.

## Wave 1 — four parallel agents (Phases 9–12) — VERIFIED
- **A**: `/portfolio/` hub + 5 collection pages (justified `--ar` grids, srcset
  600/1400/2400, no-JS fallback links to @1400) + `assets/js/lightbox.js` +
  `lightbox.css` (focus-trapped, ←/→/Esc, swipe, hash deep-links, @1400→@2400
  upgrade, neighbour preload).
- **B**: `/prints/` (editions table — prices are `data-placeholder`, licensing
  section, enquiry CTAs with ?subject= params) + `/about/` (restrained bio;
  invented specifics wrapped in `data-placeholder` comments).
- **C**: `/contact/` (Formspree-ready form — FORM_ID placeholder, mailto
  fallback, ?subject= preselect) + index.html integration: site header (hidden
  in flight mode until t>0.08, always visible otherwise/no-JS), shared footer,
  outro "Explore the archive" CTA, og: tags. Module script still node --check
  clean.
- **D**: sitemap.xml + robots.txt (EXAMPLE.invalid placeholder domain),
  favicon.svg, `scripts/check-meta.py` (11 checks/page), `scripts/verify-site.py`
  (CDP harness). D's audit caught the missing skip-nav on index.html → fixed in
  Wave 2.
- Agent checkpoints: `.claude/checkpoints/20260609-220151-wave1/agent-{A..D}.md`.

## Wave 2 — integration & verification (Phase 13) — VERIFIED
- `check-meta.py`: 10/10 pages ALL PASS (110 checks).
- `verify-site.py`: 13/13 — every page console-clean, all internal links 200,
  lightbox click→visible→Escape-closes.
- Homepage flight regression: mode=flight, header fades in after first waypoint
  (opacity 0→1 at t>0.08), Neist waypoint alignment intact, HUD synced.
- Lightbox deep-link (`/portfolio/sea/#goldenhour`): opens with @2400 loaded.
- No-JS: collection grid fully visible (reveal mechanism is JS-additive).
- Mobile 390px: **bug found & fixed** — header wordmark/nav collision; wordmark
  span now hidden ≤680px, nav wraps. Re-verified: last link at 374/390px.
- favicon: linked? NOT yet — favicon.svg exists but pages don't reference it
  (browsers fall back to /favicon.ico request). OPEN ITEM.

## Open items
- Replace `EXAMPLE.invalid` in sitemap.xml/robots.txt with the production domain.
- Replace Formspree `FORM_ID` in /contact/.
- `data-placeholder` content: print prices, bio specifics, kit list.
- Add `<link rel="icon" href="/assets/favicon.svg">` to all pages (minor).
- VERIFY photo metadata flagged in assets/js/data.js.
- Production: real display typeface, custom OG images, Vercel deploy.

---

# BUILD-LOG — Review quick-wins wave, 2026-06-09

Implemented the REVIEW.md §7 "quick wins" batch (24 items). Verified after:
index module + all assets JS `node --check` clean; check-meta 10/10 ALL PASS;
verify-site 13/13; targeted regressions below.

## Motion
- M1 lightbox close now fades (.35s) before `hidden` — verified: hidden=false
  immediately after Esc, true after fade. Reopen-mid-fade guarded.
- M3 HUD altitude formula gained the +6 camera-meet offset — verified: Calton
  dwell reads exactly "110 m" (was 193 m).
- M4 title yield scrub now 3%→16% — verified: title opacity 0 at the dwell.
- M8 preloader count completes via a .35s tween instead of snapping 0596→3400.
- M9 collection pages + contact got reveal-up (header block + grid tiles + form).
- M13 hero scroll cue animates (draw-loop, RM-guarded).

## 3D rendering
- R1 cloud banks distance-fade (.42 → 0 over 180–420 units, per-bank materials)
  — verified: hero night sky is now pristine (no distant cloud blob); in-bank
  punch-through preserved.
- R2 cloud textures are lumpy multi-gradient variants (3) with idle drift.
- R8a particles spawn-reject |x|<14 — no more near-lens bloom blobs.

## Pages / a11y / SEO
- P3 caption-grade alts on all 5 collection grids + lightbox (de-duped,
  generated from data.js captions).
- P4 flight header pairs visibility with opacity — no invisible tab stops.
- P13 lightbox telemetry --haze → --mute (3.63:1 → 7.74:1).
- P12 mobile nav links padded to ≥24px touch targets.
- P2 grid tile titles always visible on touch (`hover:none`).
- P1 lightbox aria-live="polite" + "n / N" counter — verified live ("1 / 3").
- P6 all 8 flight waypoints link "View in the archive →" to their collection
  deep-link (antelope → #sandstone).
- P8 og:url + canonical + twitter:card on all 10 pages; og:image absolutised
  against https://EXAMPLE.invalid (single find-replace at domain time;
  check-meta already resolves absolute URLs).
- P14 branded 404.html ("Off the flight path", noindex).
- P18 collection kicker is now a breadcrumb link to the archive.

## Content
- C3 holyrood caption names the dog; C9 colorada caption names the flamingos;
  C17 calton caption gains the torch-trail line (data.js + flight DOM in sync).
- C12 shutter values synced into data.js lens strings (single source restored;
  values still placeholder-flagged pending EXIF — C14 ledger).
- C18 prints page shows the p03 panorama strip above the panoramic-sizes note,
  linking to its archive deep-link.

## Still open (decisions / next wave — see REVIEW.md §7)
Owner decisions: C1 descent reorder · prints prices (P10) · C10 collection
rename · C4 jaguar captive/wild · C14 metadata ledger.
Next wave: M2/M5/M6/M7/M10–M12 · R3/R5/R7/R9/R10 · P5/P9/P15/P16/P17 ·
C2/C6/C13 · newsletter/social. Ambitious: C5 pano interlude · C8 wildlife
essay · P10 full journey · R6/R11.

---

# BUILD-LOG — Review wave 2 (next-build-wave items), 2026-06-09

Implemented REVIEW.md §7 "next build wave" (19 items; C6/C13 deferred — they
interact with Matthew's pending descent-reorder and altitude-convention calls;
newsletter/social deferred pending real handles/provider). Verified: module +
assets JS node --check clean, all JSON-LD parses, check-meta 10/10,
verify-site 13/13, live flight + lightbox regressions.

## Motion
- M2 lightbox prev/next now micro-crossfades (.16s via img.decode(); never on
  the @2400 upgrade or first open; RM instant) — verified: counter advances,
  zoom resets on navigation.
- M5 flight captions/telemetry now reveal at 'top 12%' (when their photo
  arrives), titles still at 'top 62%'; other modes unchanged.
- M6 location-index flyTo scales with distance (1.2–4.6s, in-out quart ≥3 sections).
- M7 native jumps (End key, hash entry) rate-limited to a ~2.2s guided
  catch-up. **Bug found & fixed during verification**: the first cap was
  frame-ratio-based and became glacial at throttled frame rates — switched to
  wall-clock (gsap ticker deltaTime, .25s clamp). Deep-link to the finale now
  verified arriving correctly.
- M10 card hover asymmetric (.5s exit / 1.2s enter).
- M11 `--dur-hover` token added; site.css hover/utility durations swept onto
  tokens; jgrid label fade now uses --ease-reveal.
- M12 reveal stagger is per intersection batch (sorted by top), not DOM index.

## 3D rendering
- R3 camera banks into the sway between waypoints (≤~4.5°), meetWin (same +6
  offset as the HUD) zeroes roll at every photo-meet — verified: Neist framing
  rectilinear, mid-segment horizon visibly banked.
- R5 photo planes ease in (invisible >130, full by 60) and fade out 12→4 —
  kills the near-plane clip-through.
- R7 sun halo carries a radial sprite map (soft falloff); finale sea glint
  (additive plane on the flattened sea, opacity = sunUp·smoothstep(.88,.96)·.3).
- R9 ridged 4th terrain octave outside |x|<240 + height-lerped vertex colours
  (0x10182e→0x232f52) — mid-flight lower half now reads as relief.
- R10 write-on-change guards on hdr-on toggle, veil opacity/background, HUD
  altitude text.

## Pages / SEO
- P5 the p03 panorama renders as a full-width 4:1 row (measured 1129×282, was
  ×100) with a glass "Panorama" badge; zoom (P16) provides the full view.
- P9 JSON-LD: WebSite+Person on /, Person on /about/, BreadcrumbList +
  licensable ImageObject graph (license/acquireLicensePage → /prints/) on all
  5 collection pages — all blocks parse.
- P15 2.5s belt-and-braces strips `.pre` from above-fold reveals in
  frame-starved renderers.
- P16 lightbox zoom: dedicated button (aria-pressed) + click-to-zoom,
  natural-size pan, swipe disabled while zoomed, zoom-in/out cursors, in the
  focus trap — verified live.
- P17 hub card meta leads with locations ("Tian Shan, Kyrgyzstan · 3 photographs").

## Content
- C2 retitled: "The Descent — Matthew Deane Photography"; kicker "A photo essay
  in one continuous descent"; meta/og descriptions from the CONTENT draft.

## Remaining (owner decisions, then ambitious)
C1 descent reorder · P10 prints prices/journey · C4 jaguar disclosure · C10
collection rename · C14 metadata ledger · C6 fireworks waypoint (after C1) ·
C13 altitude convention · newsletter/social handles. Ambitious: C5 panorama
cruise interlude · C8 wildlife essay · R6 mount prototype · R11 middle tier ·
C15 24-hours micro-essay.

---

# BUILD-LOG — Wave 3: decisions + drone-flight overhaul, 2026-06-10

Run of `wave3-launch-prompt.md`. Orchestrator built the flight (F); agents G
(archive) + H (prints journey) ran in parallel (checkpoints under
.claude/checkpoints/20260610-wave3/).

## Wave 0 — "landscape removed" diagnosis
Reproduced with cache disabled + fresh profile: NO regression — terrain renders
at all depths, console clean. Verdict: stale browser cache on the reporting
machine (dev server sends no cache headers — hard-refresh) and/or haze
legibility. Themed terrain below addresses presence regardless.

## F — flight overhaul (index.html module rewritten, 32k chars)
- **Random waypoint order per visit**: Fisher–Yates over the 8 photos, seedable
  via ?order= for reproducible verification; DOM sections reordered to match
  (flight mode only; authored order intact for lite/static/no-JS); WPT
  numbering + location index rebuilt per shuffle. Verified with seeds
  alpha/bravo: distinct orders, HUD/captions synced at sampled slots, zero
  exceptions.
- **Photos never rotate (new law)**: dual-camera rig — atmosphere camera banks
  (≤~4.5°, zeroed at meets and during the cruise); photo pass renders through a
  roll-free fixed-FOV camera. Verified rectilinear at meets and on the pano.
- **Sky follows the photos**: per-waypoint light profiles (night/bluehour/
  dawn/dusk/gold) drive sky/fog colour, star opacity, sun/halo/glint intensity,
  interpolated through the shuffled sequence. Verified: gold-first shuffle
  opens warm with sun + sparse stars.
- **Themed landscapes per leg**: terrain blends per-leg theme params (base
  amplitude, distant ridge, canyon walls flanking the corridor, sea flattening)
  from the shuffled order at build time; city light-speck points under urban
  legs; canyon fog boost follows wherever antelope lands.
- **Panorama cruise interlude**: fixed slot 5 of 9; camera levels to 4,100 m
  (HUD pinned) and pans laterally across a 450-unit p03 plane, completing the
  pan before the meet. **Bug found & fixed in verification**: look-ahead aimed
  at the pan target skewed the panorama — camera now faces dead ahead while
  translating (rectilinear confirmed). DOM section degrades to a horizontal
  scroll strip in lite/static/no-JS.
- **R6 print-mat prototype** behind ?mat=1 (default OFF): white mount 1.045× +
  soft shadow in the photo scene; screenshot pair /tmp/mat_on.png vs
  mat_off.png for Matthew's call.
- **R11 middle tier** behind ?tier=flight-lite: dpr 1.5, no composer/bloom,
  reduced particles/clouds/terrain, no Lenis. Ships only after a real-device
  pass; default mobile-lite unchanged.
- Hero copy now tells the truth: "eight photographs and a level-flight
  interlude — in a new order every visit".

## G — archive (agent, verified)
p08+p13 removed site-wide (PHOTOS=14; image files kept on disk); about/ swaps
to p16; hub counts/blurbs updated; "Highlands & Islands" → "Scotland" (slug
kept); jaguar caption gains the captive disclosure; /portfolio/wild/ rebuilt
as a two-frame portrait-led essay (stillness vs colony chaos) with lightbox +
no-JS intact (verified).

## H — prints journey (agent, verified)
Prices → "Price on enquiry" (placeholders gone); lightbox "Available as a
print →" (in the focus trap) → /prints/?photo=id → personalised enquiry block
→ /contact/?subject=print&photo=id with prefilled message (full chain verified
live: subject preselected, textarea "Print enquiry: Neist Point, Isle of Skye
(neist)"); CSS-built "In the room" scenes (no image filters); featured cards +
pano strip carry enquiry CTAs.

## Wave 2 — verification
check-meta 10/10 · verify-site 13/13 · two shuffle seeds clean · pano
rectilinear + altitude pinned · prints/contact chain end-to-end · wild essay
incl. no-JS · all JS node --check clean · JSON-LD parses.
**Harness fix**: headless frame starvation froze CSS transitions, falsely
failing the lightbox-visible check — verify-site now forces a compositor
frame before sampling; lightbox open also gained a timeout fallback alongside
double-rAF (robust in throttled real tabs).

## Open items
R6 mat: Matthew's verdict on /tmp/mat_on.png vs mat_off.png (then default on
or delete). R11: real-device pass before enabling. Still pending his data:
Formspree ID, domain swap, VERIFY metadata, bio placeholders. Ambitious left:
C15 24-hours micro-essay, journal/workshops when content exists. Not a git
repo — recommend git init + commit.

---

# 2026-06-10 — header always visible (owner request)
Removed the flight-mode header fade-in (was hidden until t>0.08, REVIEW P7).
The nav now renders from first paint, above the preloader (z-60), always
clickable. Also moots the old invisible-focusable-links concern entirely.
Verified: opacity 1 + visible during preloader and at hero; module node --check
clean.

---

# 2026-06-10 — altitude-true flight path (altitude-path-launch-prompt.md)

The camera now flies the real altitude profile of the shuffled route instead
of a fixed descent curve:
- `sceneY(alt)`: compressive mapping (linear ≤100 m, log above; negative branch
  for the canyon) — 3,400 m and 5 m share one ~10–84-unit envelope.
- Per-leg smoothstep between slot heights: C1-continuous, **zero vertical
  velocity at every photo-meet** (stable, level viewing), faint sine
  undulation mid-leg only, entry from +12 above the first waypoint, settle
  after the last. The canyon dip is now just antelope's −20 m expressed
  through the same system (old gaussian removed); the pano cruise levels at
  sceneY(4100).
- Cloud banks ride each leg's mean flight height (punch-throughs survive any
  shuffle); HUD altitude eases along the same smoothstep as the camera.
- **Hardening**: one unreproducible first-load showed DOM order ≠ slot order
  (3 retries clean); buildAnchors now sorts (scroll,t) anchor pairs so a
  mismatch degrades gracefully instead of desyncing the mapping.
Verified: 9/9 dwell altitudes EXACT on both seeds (alpha + bravo); steepest
legs (Δ4,120 m / Δ4,095 m) screenshot mid-flight with eased HUD (2,055 m) and
in-cloud descent; zero exceptions; check-meta 10/10; verify-site 13/13;
node --check clean. Lite/static modes untouched (no 3D path).

---

# 2026-06-10 — rebrand to "Matt Deane Photography" + logo, flight smoothing

- **Logo**: designed assets/logo.svg — six-blade aperture iris, ink strokes,
  warm sun-dot centre (palette-native); favicon.svg rebuilt on the same mark
  (night rounded-square bg). Verified legible at 23px header size and 300px.
- **Rebrand**: "The Descent" replaced site-wide with "Matt Deane Photography" —
  hero h1, header lockup (logo + "Matt Deane Photography") on all 11 pages,
  titles/og/JSON-LD site name, footer link → "Home", preloader carries the
  mark, prints meta description. Hero kicker now "Landscape photography · one
  continuous flight". Person remains "Matthew Deane".
- **Flight smoothing (altitude variation kept)**: leg interpolation upgraded
  smoothstep → smootherstep (C2 — zero velocity AND acceleration at every
  meet); HUD eases on the same curve; mid-leg undulation 1.6→0.9; nose pitch
  softened to 65% of look-ahead gradient; scrub smoothing .085→.075. Slot
  heights (the altitude profile) unchanged.
- Verified: dwell altitudes still exact (−20 / 4,100 / 3,400 sampled on
  bravo), logo loads on-page, zero exceptions, check-meta 10/10,
  verify-site 13/13, no "The Descent" strings left in pages.

---

# 2026-06-10 — fly-through fidelity upgrade (fidelity-launch-prompt.md)

All six phases landed, single session, A/B at seeded positions (alpha):
- **Pipeline**: composer now renders into a 4× multisampled half-float target
  (post chain keeps MSAA; sky banding gone). Permanent ?debug=1 overlay
  (fps/calls/tris/textures, accumulating both passes).
- **Sky dome**: gradient ShaderMaterial dome (zenith→horizon from the same
  per-leg light profiles, warm horizon band follows sunMix) replaces the flat
  background colour. Tone-mapped via OutputPass; follows the camera.
- **Terrain**: 3-sine field → seeded 5-octave value-noise fBm (ridged variant
  for crests), reproducible per ?order seed; mesh 110×170 → 160×260; slope-
  and height-aware vertex colouring (steep faces darken, high crests warm);
  tiling 256² noise detail map for close-range ground texture. Theme masks +
  flat corridor unchanged.
- **Clouds/atmosphere**: 512² textures, 22 puffs, 4 variants; per-plane drift
  amplitude (parallax depth in banks); high cirrus sheet fading in above
  45–72 units; sea glint breathes.
- **Photos (within the laws)**: nearest plane silently upgrades to @2400 on
  approach, released after passing — texture count measured flat at 30 across
  a full route; anisotropy 8; colour identical (sRGB both).
- **Grade**: bloom retuned for the dome (threshold .72→.8, strength .55→.5);
  optional grain+vignette pass gated behind ?grade=1, ships OFF.
Verified: dwell altitudes exact at 4 sampled waypoints (bravo), zero
exceptions, 25–46 draw calls/frame (prior envelope 19–47), 84k tris,
check-meta 10/10, verify-site 13/13. Headless fps is throttled (30) — real
60fps confirmation needs the standing human pass. TIER (flight-lite) keeps
cheap variants (no dome-composer cost, no cirrus, low terrain density).

---

# 2026-06-10 — fine-line logo rework + harness timeout
Logo regenerated as a fine-line mark (hairline 1.4 rim, 1.8 blades, smaller
sun dot, longer blade sweep); favicon variant keeps slightly heavier strokes
for tile legibility. Banner mark halved 15px → 8px (owner request), midline
alignment with nav preserved; preloader mark 46→38px. verify-site websocket
timeout 30→120s (GPU-heavy headless instances measured 26.8s for the lightbox
sequence — site itself verified fine; 13/13 after widening).

---

# 2026-06-11 — hosted on Hugging Face (static Space)

Live: https://helwyr55-matt-deane-photography.static.hf.space/
(Space repo: https://huggingface.co/spaces/helwyr55/matt-deane-photography)
- Domain swap done for real: EXAMPLE.invalid → the Space URL across 12 files
  (og/canonical/JSON-LD/sitemap/robots).
- **HF static quirk found**: the Space server resolves some directory URLs but
  systematically 401s depth-2 dirs (/portfolio/*/) and 404s /contact/
  (query-string cache-bypass proved it wasn't CDN). Explicit
  /dir/index.html paths always serve.
- Fix: scripts/deploy-hf.py — rsyncs the site subset, rewrites the DEPLOY
  COPY's internal links/canonicals/sitemap to /dir/index.html (hash/query
  preserved; local repo keeps pretty URLs for Vercel-style hosts), adds the
  Space README front-matter, uploads via huggingface_hub.
- Verified live: all pages + assets 200; the flight itself runs over the wire
  (mode=flight, HUD synced, waypoint render clean, zero exceptions).
Caveats: Formspree FORM_ID still placeholder (contact form posts nowhere);
re-run deploy-hf.py after any local change to redeploy.

---

# 2026-06-12 — possibilities review (possibilities-review-launch-prompt.md)

Four-agent review-only workflow → POSSIBILITIES.md. HANDBOOK: 73 promises
scored (49 honoured / 6 exceeded / 10 drifted / 5 not-yet); cinematic §7
checklist 9/9; verdict = MAJOR drone-handbook revision needed (paste-ready
amendment drafts in checkpoint). FRONTIER: 17 rendering upgrades (measured:
photo res is source-limited at 2600px masters, pano master 2600×231 is the
weakest asset; MSAA at GPU max → TAA killed; biggest unexploited capability =
GPU instancing). INSPIRATION: 14 live-verified patterns (best fit:
scroll-drawn route map; mood-based environment = law-compliant inverse of
grading). ADDITIONS: 19 ideas, 18 fully static (top: /photo/<id>/ pages,
EXIF/story panel, localStorage favourites — verified unblocked; only
general per-seed OG cards need a backend). Law-bending quarantined (2.5D
parallax, Ken Burns). Adjudication re-verified 4 URLs + 3 code claims.
Checkpoints: .claude/checkpoints/20260612-possibilities/.

---

# 2026-06-13 — quick-wins batch from POSSIBILITIES.md §7

Five no-decision quick wins implemented + verified (check-meta 10/10,
verify-site 13/13, flight dwell altitudes still exact 4/4 on seed bravo,
console clean):
- **F8 — Mie sun-glow** grafted into the existing dome shader (sunDir uniform
  fed from the sun's world bearing each frame); soft glow around the sun on
  gold/dusk legs. Atmosphere-only.
- **F7c — exposure adaptation**: lagged follower on toneMappingExposure
  (1.18 dark → .95 gold). Photos are toneMapped:false → immune by construction.
- **F5a — snow + canyon dust**: theme-gated point fields (snow where
  theme.ridge ≥ 30 = mountain/Milky-Way legs, falling+wind-drift; warm dust
  where theme.canyon > 0). Reuses the city-specks spawn pattern, no schema
  change; TIER skips both. Verified visually at milkyway/antelope/goldenhour.
- **A17 — IPTC/XMP copyright** embedded in all 64 JPEGs (By-line, Copyright
  Notice, Credit, dc:Creator/Rights, xmpRights:Marked/WebStatement, PLUS
  Licensor→/prints/); derive-images.sh now tags future derivatives too.
  Licensable-badge signal + attribution on escaped copies.
- **A10 (partial) — preconnect** to cdnjs + jsdelivr on the flight page's
  critical three.js path.
Remaining POSSIBILITIES quick wins (deferred, need care/schema): A9 feed
(needs data.js `date`), A13 batch (focus-trap generalise, skip-flight,
keyboard zoom-pan), A4 seed persistence+share (seed currently discarded),
A14 altitude chips, A10 LCP image preload (shuffle makes the flight hero
variable). Re-run scripts/deploy-hf.py to push the metadata + render changes live.

---

# 2026-06-13 — second HF Space (v2) with the upgraded build

Hosted the current build (altitude path + fidelity upgrade + quick-wins:
sun-glow/exposure/snow/dust + embedded copyright) on a fresh static Space:
- Live: https://helwyr55-matt-deane-photography-v2.static.hf.space/
  (repo: huggingface.co/spaces/helwyr55/matt-deane-photography-v2)
- The original Space (matt-deane-photography) is untouched and still live.
- **deploy-hf.py generalised** (addresses the ADDITIONS "hardcoded DIRS trap"):
  takes an optional `user/space-name` arg; auto-discovers dirs by globbing
  index.html (longest-path-first); derives the Space URL from the repo id and
  rewrites the baked absolute domain (OLD_URL → this Space) so each deploy is
  self-consistent in og/canonical/twitter/sitemap/robots. The /dir/index.html
  link rewrite (HF static quirk) is unchanged.
- Verified live: all explicit paths 200; canonical + og:url point at the v2
  host; new render code present (fieldFromLegs/sunDir/expoTarget markers).
- Note: photos' embedded IPTC WebStatement/Licensor still point at the original
  /prints/ URL (same content; baked into the committed JPEGs). Harmless — both
  Spaces serve identical /prints/. Re-tag in deploy copy only if v2 becomes canonical.

---

# 2026-06-13 — research-note review (research-review-launch-prompt.md)

Two-agent review-only of the external note b91fe86a → RESEARCH-REVIEW.md.
Headline: the note's "required correction" (selective bloom via layers) is
FALSIFIED for this app — measured differential bloom toggle at the gold dwell
showed the photo's pixel bit-for-bit identical (14,2,1→14,2,1) while atmosphere
shifted Δ−7; the separate-scene-after-composer topology (index.html:1275–1280)
already protects photos and is simpler than the note's fix. Of 9 ranked recs:
3 shipped (A2 fBm, A4 fog ~80%, B1 soft sprites), 2 sharpen POSSIBILITIES (A1↔F3a,
A5↔F3b), 3 genuinely new (A4 aerial fog-tint = cheapest win POSSIBILITIES missed,
B3 curl-noise drift, B2 depth-aware particles). Keep three@0.160 (no driver to
bump). Skip A3 tri-planar, A5 LOD, B4 GPGPU. No code changed.

---

# 2026-06-13 — photo-matched-geometry roadmap (poly-match-workflow-launch-prompt.md)

Two-agent PLANNING workflow → POLY-MATCH-ROADMAP.md (no code changed). PHOTO
viewed all 9 linked frames → per-leg landform briefs (EASY×3 faroes/glacier/
neist, MEDIUM×2 milkyway/ridgeline, HARD×4 calton/forth/antelope/goldenhour;
palette agrees w/ light profile in all 9). GEOMETRY mapped landforms to the
module + measured baseline (60fps/47 calls/84k tris/26 tex). Core unlock: add a
discrete `landform` string to each LOCATIONS entry, consumed by a nearest-slot
pick in themeAt + a branch in terrainH (backward-compatible). Shared infra:
S1 instancing↔F9, S3 fog-tint↔A4, S4 normal↔F3a, S5 water↔F4. Plan: Phase 0
data-model + glacier pilot; P1 terrain-only wins (slot/openSea/darkRidge/
snowSummit + fog-tint); P2 instancing+water (faroes stacks, calton blocks);
P3 bespoke (forth bridge truss = only new model task, monument, normal map).
Checkpoints in .claude/checkpoints/20260613-poly-match/.

---

# 2026-06-13 — Phase 0 of POLY-MATCH-ROADMAP (landform data-model + glacier pilot)

Implemented Phase 0 (index.html module only):
- **`landform` data-model**: added a discrete `landform` string to all 9
  LOCATIONS entries (darkRidge/cityhill/estuary/headland/seastack/glacier/slot/
  openSea/snowSummit). `themeAt` now also returns the nearest-slot `landform`
  (never lerped) + `lfW` (dwell-proximity weight: 1 at a dwell, 0 at the
  transition midpoint). Backward-compatible — `terrainH` only deviates for a
  recognised landform; all other legs are bit-identical (kept the original
  height formula verbatim).
- **glacier pilot**: `terrainH` branches on `landform==='glacier'` → a
  flat-floored U-valley (parabolic walls W=175, calmed floor fBm), blended by
  `lfW` so it is full at the dwell and seamlessly absent by the midpoint (no
  hard snap). Corridor stays flat (wall(12)≈0.3u). + a procedural braided-river
  ribbon decal on the valley floor (canvas multi-channel texture, unlit/fogged,
  +1 draw call, dropped under TIER).
- Verified (CDP, seed bravo): dwell altitudes exact at glacier/milkyway/
  antelope/goldenhour/faroes (no regression); 60 fps; draw calls 25–49
  (≤60 budget; glacier +1 for the river); console clean; lite + reduced-motion
  modes load with zero exceptions; module node --check clean after every edit.
- **Honest note for the next decision**: at this framing the photo plane fills
  the frame at the dwell, so the matched U-valley terrain reads mainly on
  approach/at the edges — the per-leg geometry payoff is real but subtle behind
  the dominant photo. Worth weighing before fanning out to Phases 1–3: the
  matching may want smaller/offset photo planes or more dramatic near-terrain
  to pay off visibly.

---

# 2026-06-13 — Phase 1 (terrain landforms) + (b) framing trim

(b) FRAMING: photo planes trimmed (PHOTO_H 26->23) and pushed further
off-centre (offset +-7->+-10, meet push 5->7) so the matched terrain reads
around the frame instead of being fully occluded at the dwell. Photo still the
hero; terrain now visible on the open side + edges.

(a) PHASE 1 landform branches (all terrain-only, lfW-blended, seam-free):
- slot (antelope): narrow near-vertical fluted canyon walls in terrainH +
  sandstone vertex tint. The standout — clearly echoes the slot-canyon photo.
- snowSummit (ridgeline): sharper wider-banded alpine crests + white crest tint.
- openSea (goldenhour): forced flat mirror.
- darkRidge (milkyway): crest-darkening vertex tint + snow suppressed on this
  leg (snow gate now passes the whole location, excludes darkRidge).
- per-leg vertex colours computed via themeAt(z) per vertex at build (one-time).
Verified (seed bravo): exact dwell altitudes (glacier/milkyway/neist 450/3400/90);
60 fps; peak 52 draw calls (<=60); console clean; lite mode clean; check-meta
10/10; verify-site 13/13; node --check clean. Deferred from Phase 1: S3 aerial
fog-tint (needs a shader; ~80% already in FogExp2 — follow-up).

---

# 2026-06-13 — Phase 2 (instancing half): Faroes sea-stacks + Calton city blocks

S1 instancing system + the two flagship bespoke legs it unlocks:
- `instanceField(geo, mat, placements)` → one InstancedMesh per feature
  (≤1 draw call), placed by a landform-gated scan of the shuffled slots.
- **Faroes seastack**: terrainH cliff-edge term (sheer drop one flank → flat
  sea the other) + 16 instanced tapered hex-prism basalt stacks rising from the
  sea side. Reads as the knife-edge buttress of the photo.
- **Calton cityhill**: terrainH broad dome term + 70 instanced dark emissive
  city blocks on the hill flanks (atop the existing warm city-specks).
Verified (seed bravo): dwell altitudes exact (faroes 320, calton 110); 60 fps;
peak 50 draw calls (≤60); tris 84.3k→85.5k; console clean; lite mode clean;
check-meta 10/10; verify-site 13/13; node --check clean.
Remaining: Phase 2 S5 water shader (glacier river / faroes base / open-sea
shimmer); Phase 3 (Forth cantilever-bridge truss — the one new model task,
Calton monument, flag-gated normal map); Phase-1 S3 aerial fog-tint.

---

# 2026-06-13 — Phases 1-3 completion (ultracode-orchestrated): water, fog, bridge, monument

Completed POLY-MATCH-ROADMAP via a design workflow (5 parallel specs) → serial
implementation → adversarial-review workflow (3 lenses) → fixes → verify.
- **S5 water shader**: one shared ShaderMaterial (scrolling fbm normal map, sun
  specular toward skyUniforms.sunDir, fresnel, proximity alpha) on faroes/
  goldenhour/forth sea planes. Glacier river kept its braided texture (identity).
- **S3 aerial fog-tint**: terrain onBeforeCompile desaturate+haze by view
  distance, layered on FogExp2. (vViewPosition dependency documented.)
- **Forth bridge**: one InstancedMesh parametric cantilever truss; LOWERED so the
  camera flies over it (apex≈+2 vs forth dwell y≈11.7) — fixes the x=0 clip the
  review caught; reads as a drone passing over the bridge.
- **Calton monument**: colonnade InstancedMesh + dome cap on the cityhill crest.
- (S4 normal map was already shipped; not re-done.)
- **Adversarial review found 3 real issues, 2 fixed**: (1) Forth bridge clipped
  the camera at x=0 → lowered the bridge; (2) draw-call peak was shuffle-fragile
  (could exceed 60 on a pathological order) → added per-leg distance culling
  (legFurn registry, visible=false beyond 640 units) — empirically bounded:
  **12-shuffle sweep peak = 57** (was hitting 60); (3) vViewPosition fragility →
  documented the flatShading/normalMap invariant.
Verified: verify-flight both seeds ALL PASS (9/9 altitudes, peak 57/56, 60fps,
console clean); 12-seed draw-call sweep ≤57; lite/static clean; check-meta 10/10;
verify-site 13/13; node --check clean.

---

# 2026-06-13 — atmosphere wins: curl-noise (default-on) + god-rays (?rays=1)

Design workflow (3 specs) → implemented the 2 budget-safe ones; murmuration
deferred (needs an always-loaded GPGPU dep for a default-off easter-egg).
- **Curl-noise drift (B3, default-on)**: mote field swirls via a divergence-free
  curl flow in the vertex shader (onBeforeCompile + uTime). 0 draw calls/CPU.
  ?nocurl=1 disables; TIER/lite keep the sine path. (commit 16260fe)
- **God-rays (F2, ?rays=1, default OFF)**: radial-blur ShaderPass smearing the
  scene from the sun's projected NDC position, weighted by sunMix (early-outs to
  passthrough on night/bluehour legs → 0 fill there), inserted between
  RenderPass and bloom. Flag-gated per the agent's honest fill-rate finding
  (one extra pass dipped min-fps to ~39 at dpr2/1440p on the heaviest shuffle).
  Also FIXED a latent fragility the review flagged: the grade pass's uTime update
  used a hard-coded `composer.passes.length===4`/`passes[2]` index — refactored
  grade + rays to named refs (gradePass/raysPass) so the per-frame update can
  never desync regardless of which passes are active.
Verified: default path both seeds ALL PASS (9/9 alt, peak 57, 60fps, clean);
?rays=1 shows shafts on gold/dusk, early-outs on night, no exceptions; ?grade=1
preserved; ?rays=1&grade=1 (5-pass chain) clean; lite/static clean;
verify-site 13/13; check-meta 10/10; node --check clean.

---

# 2026-06-13 — GPGPU murmuration (?birds=1) + particle counts −33%

- **Murmuration (F5b, ?birds=1, default OFF)**: 2,704 GPGPU boids (52² ping-pong
  position/velocity float textures via GPUComputationRenderer) wheeling off the
  Faroes cliff, rendered as ONE THREE.Points reading the position texture. Boids:
  bounded 32-tap neighbourhood (separation/alignment/cohesion) + an orbiting
  target; dark starling silhouettes, proximity+sunMix faded. compute() runs
  before the clear/composer and save/restores the render target, so the photo
  pass is untouched. **Adapted from the spec**: (1) DYNAMIC import() inside the
  flag branch → zero cost (no 12KB GPUComputationRenderer download) for default
  users; (2) fixed a spec bug (`new THREE.GPUComputationRenderer` → bare
  `GPUComputationRenderer`). gpu.init() failure (WebGL1/no-float-tex) → clean
  console.warn no-op. Verified: ?birds=1 loads (no import error), init succeeds,
  +1 draw call near faroes (32→33, proven), 60fps; default path both seeds ALL
  PASS, console clean.
- **Particle counts −33%** (owner request): motes 3200→2144 (TIER 1600→1072),
  stars 1800→1206 (900→603), snow 700→469, dust 500→335, city-specks 360→241,
  murmuration 64²→52² (4096→2704). Both seeds ALL PASS, console clean.

---

# 2026-06-13 — particles −33% (again) + murmuration tuned visible

- **Ambient particles −33% again**: motes 2144→1437 (TIER 1072→718), stars
  1206→808 (603→404), snow 469→314, dust 335→224, city-specks 241→161
  (cumulative ~−55% from the original).
- **Murmuration tuned visible** (owner request): the two reductions + off-screen
  placement had made the flock invisible. Fixed: re-centred in the forward view
  at a medium approach depth (ORBIT (-8, cliffY+64, fz+60)) with a flatter seed
  cloud (no birds spawning on the lens), opacity floor 0.5→0.88, lighter
  silhouette (0x2b2f3a), point size 90→155, count 1600 (40²), tighter orbit
  wheel. Now a clearly-visible cloud of dark starlings against the dawn sky.
  **fps**: the bigger sprites are fill-bound — settled at 60fps with 155px/1600
  birds (230px/2500 dipped to 30 transiently); peak 33 calls at the faroes leg.
Verified: default both seeds ALL PASS (9/9, peak 57, 60fps, clean); ?birds=1
faroes 60fps settled + flock visible; lite/static clean; node --check clean.
