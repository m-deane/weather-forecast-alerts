# Wave 3 Launch Prompt — Decisions, Drone-Flight Overhaul, Ambitious Builds

Paste everything below the line into a Claude Code session in this project to run
the build. It folds in Matthew's decisions (2026-06-10) plus the flight overhaul.

**Locked decisions, as interpreted — correct me before launch if any is wrong:**
1. Waypoint order is **randomised per visit** (not the monotonic descent).
2. Prints stay **without prices** — "price on enquiry" replaces the `£—` placeholders.
3. Jaguar is **captive** — caption discloses it.
4. "Highlands & Islands" renames to **"Scotland"** (display title only; the
   /portfolio/highlands/ slug stays so no links/sitemap break — flag if a slug
   rename is wanted later).
5. Metadata VERIFY flags and placeholder IDs (Formspree, domain) stay as-is.
6. **No dog photos anywhere**: p13 (Coastal Path Companion) AND p08 (Holyrood —
   the dog anchors that frame) are removed site-wide. Archive drops to 14
   photos; Wild Encounters becomes jaguar + puffins; /about/ swaps its p08
   image for another frame (suggest p16).
7. Build the **panorama cruise interlude**.
8. Wildlife essay proceeds **without the dog frames** (two-photo essay).
9. Build the **full prints journey** (minus prices).
10. Build **R6 print-mat prototype** and **R11 middle render tier** (flag-gated).

---

You are extending my photography website on **autopilot**, orchestrating agents.
Sources of truth: `BUILD-LOG.md` (state + history), `REVIEW.md` (finding details),
the two handbooks, `index.html` and `assets/`. The §4 photo-fidelity laws are
absolute and now include a new one: **photographs never rotate** — no camera
roll, tilt, or scale may ever be applied to a photo plane's screen presentation.

## Wave 0 — DIAGNOSE FIRST (you, before any dispatch)

Matthew reports **the 3D landscape no longer renders** on the flight page. The
most recent terrain change was R9 (ridged octave + `vertexColors` on the
MeshStandardMaterial — see BUILD-LOG wave 2). Reproduce in headless Chrome
(CDP pattern in BUILD-LOG / scripts/verify-site.py), read the console, inspect
mid-flight screenshots, find the actual cause (do not assume it's R9 —
verify), fix it, and confirm terrain renders at 3+ scroll depths before
anything else proceeds. Record cause + fix in BUILD-LOG.

## Wave 1 — three parallel agents

(Each agent: checkpoint file FIRST under `.claude/checkpoints/{ts}-wave3/`,
all detail there, inline return ≤150 words. Only agent F may touch index.html.)

### Agent F — flight overhaul (sole owner of index.html)

1. **Cinematic drone flight, photos fixed.** Replace the wave-2 camera banking
   with a **dual-camera rig**: the atmosphere camera may bank into turns (and
   optionally FOV-modulate between waypoints, R13-style) for genuine drone
   feel, but the photo pass renders through a second camera sharing position
   and look-at with **zero roll, fixed FOV** — photographs stay perfectly
   level and rectilinear at all times, including between waypoints. Verify
   with screenshots mid-bank: horizon tilted, photo edges parallel to screen.
2. **Random waypoint order per visit.** Shuffle the 8 waypoints at init
   (Fisher–Yates). The DOM sections must follow the same order — reorder the
   `.loc` elements via appendChild before anchors are built, **flight mode
   only** (lite/static/no-JS keep the authored order). HUD numbering (WPT 01…)
   re-derives from the shuffled order. All anchors, lazy-loading, and the
   piecewise mapping must work for any permutation — test two different
   shuffles headlessly (seed via a `?order=` debug param so verification is
   reproducible; random when absent).
3. **Atmosphere follows the photos.** With random order the fixed
   night→gold ramp no longer matches the photographs. Add a `light` profile
   per waypoint (night / bluehour / dawn / dusk / gold → palette colour
   anchors) and interpolate the scene palette, fog, star/sun opacity through
   the *shuffled sequence*, so the sky always matches the photo you're
   approaching. The sun appears only near gold/dusk waypoints; stars only near
   night ones. Smooth long transitions between legs — no hard cuts.
4. **Themed landscapes per leg** (the drone-flight theme): the terrain and
   scene furniture between waypoints should *imitate the landscape of the
   photo you're flying toward*, procedurally only — e.g. ridged peaks rising
   for the mountain/Milky Way legs; a cliff edge dropping to a flat sea plane
   approaching the Faroes; narrowing warm canyon walls (terrain rising beside
   the corridor + warmer fog) into Antelope; open flat sea with glint for the
   golden-hour landing; subtle scattered light-mote "city specks" below for
   the Edinburgh legs. Implement as per-leg terrain amplitude/feature masks
   blended along z at build time from the shuffled order (terrain is built
   once per visit). Keep the flight corridor (|x| ≤ ~12) clear. 60fps budget
   holds; re-verify draw calls stay in the wave-2 envelope.
5. **Panorama cruise interlude** ("LEVEL FLIGHT · 4,100 M"): a fixed segment
   mid-route (always between waypoints 4 and 5 of whatever shuffle): the
   camera levels off, vertical scroll maps to *lateral* travel along the p03
   panorama rendered as a wide photo plane the camera tracks across; HUD
   altitude pins at 4,100 m, telemetry reads "Panorama · 35mm stitched".
   Reduced/lite modes degrade to a horizontally scrollable strip in the DOM
   section. The panorama plane obeys all photo-fidelity laws.
6. **R6 print-mat prototype**: thin paper-white mount plane (1.045×, 0.5
   behind, photoScene so never bloomed/fogged) + soft shadow plane behind each
   photo, opacity tracking the photo's. Behind a `?mat=1` flag with a
   screenshot pair (on/off) in the checkpoint for Matthew's taste call —
   default OFF until he approves.
7. **R11 middle tier** behind `?tier=flight-lite`: dpr 1.5, no EffectComposer
   (direct render, no bloom), particles ~1600/900, 2 cloud planes per bank,
   terrain 70×110 — document in BUILD-LOG that it ships only after a
   real-device pass; do not change the default mobile-lite behaviour.
8. Remove the holyrood/companion entries from any homepage references (they
   are not flight waypoints — verify none exist).

### Agent G — archive & content (everything except index.html, prints/, contact/)

1. **Remove the dog photos site-wide**: delete p08 + p13 entries from
   `assets/js/data.js`; remove their tiles from /portfolio/highlands/ and
   /portfolio/wild/; swap /about/'s p08 image for p16 (new descriptive alt);
   update collection counts/meta on the hub; update the 5 collection
   JSON-LD graphs; do NOT delete the image files (archive stays on disk).
2. **Rename** the highlands collection to "Scotland" — data.js title, hub
   card, collection page title/meta/OG/JSON-LD, breadcrumb. Slug unchanged.
3. **Jaguar disclosure**: caption → "A jaguar turns at the edge of the
   undergrowth, mouth open, reading the air. Photographed under human care."
   location → "Photographed under human care" stays out of the location
   field — set location to 'South America' /* VERIFY: facility */ and keep
   the disclosure in the caption. Propagate to the wild page alt + JSON-LD.
4. **Wildlife essay** (/portfolio/wild/): rebuild as a two-frame portrait-led
   essay — full-width frames, 2–3 sentence story captions (draft them in the
   NatGeo-restraint voice), grid fallback for no-JS, lightbox still works,
   collection nav intact. With only jaguar + puffins, lean into the contrast
   (predator stillness / colony chaos).
5. Hub blurb for wild updates to match (no "companion on every path").

### Agent H — prints journey & enquiry flow (prints/, contact/, lightbox files)

1. **No prices**: replace the `£—` data-placeholder cells with "Price on
   enquiry" (keep the editions/paper columns; drop the placeholder spans).
2. **Per-photo print affordance**: in the lightbox HUD add a quiet
   "Available as a print →" link to `/prints/?photo={id}`; on /prints/, a
   small inline script reads `?photo=` and personalises the page (shows that
   photo + title above the enquiry CTA, which becomes
   `/contact/?subject=print&photo={id}`); /contact/ pre-fills the message
   textarea ("Print enquiry: {title}") from the params. All of it no-ops
   gracefully with JS off or params absent.
3. **Room-context presentation without fake photography**: a CSS-built
   "in situ" section — the photo (img, untouched) inside a thin frame on a
   wall-toned backdrop with believable scale cues, one per size tier. No
   filters/overlays on the image itself; the frame is DOM around it.
4. Keep the panorama strip; it should also carry the print affordance.

## Wave 2 — integrate & verify (you)

Re-run the full harness (check-meta, verify-site) + flight regressions:
terrain visible at multiple depths (the Wave 0 fix holds); two different
`?order=` shuffles — HUD/captions/photos synced in both; photos level during
banked segments (measure corner y-deltas of a photo plane mid-bank ≈ 0);
palette matches photo light at 4+ waypoints; interlude scrubs laterally and
degrades in lite/static; archive shows 14 photos, no dog anywhere (grep p08/
p13 in pages); prints→contact carries the photo identity end-to-end; JSON-LD
parses; no-JS/mobile/reduced-motion on changed pages; append BUILD-LOG;
report the checklist line by line and stop. R6 ships OFF pending Matthew's
screenshot verdict; R11 ships flag-gated only.
