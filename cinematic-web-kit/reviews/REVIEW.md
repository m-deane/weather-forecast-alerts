# REVIEW — The Descent / Matthew Deane Photography

Multi-agent review, 2026-06-09. Four parallel critics (MOTION, RENDER, PAGES,
CONTENT) + adjudication. All findings are tool-grounded: live CDP measurement,
computed contrast ratios, GL draw-call counting, keyboard passes, and every one
of the 16 photographs viewed. Full per-finding detail (evidence paths, values,
pseudo-code) lives in `.claude/checkpoints/20260609-223712-review/agent-*.md`.
Adjudication spot-verified the headline claims directly against source
(lightbox close, HUD offset, alt duplication, telemetry contrast, data drift —
all confirmed). No site file was modified.

63 findings raised → adjudicated below. One proposal was killed (constellation
overlays on the Milky Way photo — violates the site's own no-overlay commitment;
CONTENT C7 caught it). Two were corrected in collision (fireworks as *finale* →
fireworks as *night waypoint*; M4/R4 same bug, merged).

---

## 1. Executive summary — top 10 by impact

| # | What | Why | Effort | Source |
|---|------|-----|--------|--------|
| 1 | **Distance-fade the cloud banks** — clouds currently render at full opacity from any distance, causing the full-screen grey wash mid-flight and a pale blob behind the night hero | The single biggest visual defect; fix is ~6 lines | S | R1 |
| 2 | **Prints page conversion path** — real prices (placeholders telegraph "not for sale"), a room-context photo, and a per-photo "available as a print" link in the lightbox HUD carrying the image's identity into the enquiry | This is the revenue page; currently the buy journey loses the photo on the way to the form | M–L | P10 |
| 3 | **Resolve "The Descent" contradiction** — altitudes run 3,400→110→15 then *climb* to 450 before descending; the HUD visibly counts back up. Monotonic reorder proposed (milkyway→glacier→faroes→calton→neist→forth→antelope→goldenhour) | Title promise vs visible behaviour; **owner call** — reorder changes the light-arc rhythm too (tradeoffs in §4) | M | C1 |
| 4 | **Panorama cruise interlude** — the 11:1 stitched ridgeline (p03) is the strongest unused asset and currently renders as a 100px sliver in the grid (30px on mobile). Build a "LEVEL FLIGHT · 4,100 M" horizontal-scroll segment; also fix its grid/lightbox treatment | Signature image, effectively invisible today | L (interlude) / M (grid fix) | C5+P5 |
| 5 | **A11y batch** — 4 confirmed WCAG fails, all S-effort: alt-text duplication ("Edinburgh, Edinburgh") on all 5 collection pages; flight-header links keyboard-focusable while invisible (5 phantom tab stops); lightbox telemetry contrast 3.63:1; header touch targets 22px at 390w | Concrete failures, one batch, an hour of work | S | P3,P4,P13,P12 |
| 6 | **Lightbox motion symmetry** — close pops (hidden set synchronously, killing the .35s fade); prev/next is an instant src swap. Add exit fade + .2s navigation crossfade | The most-used interaction on the archive pages | S+M | M1,M2 |
| 7 | **Waypoint → archive deep links** — flight panels never link to collections, yet lightbox hash deep-links already work. A telemetry-styled "View in the archive →" per panel turns the cinematic into a funnel | northlandscapes' core pattern, nearly free | S | P6 |
| 8 | **Flight feel: camera banking + cloud variety** — horizon never tilts (reads as dolly, not aircraft); all 16 cloud planes are the same radial blob. Banking zeroed at waypoints so photo framing is untouched | Two S-effort changes with the largest "feels like flying" return | S | R3,R2 |
| 9 | **Sync fixes batch** — title yield ends *after* the photo is centred (ghost titles over photos, both M and R measured it); HUD altitude misses each waypoint by the −6 meet offset (Calton dwell reads 193 m vs its own "110 M" label); captions reveal long before their photo arrives | Three precision bugs in the flight's choreography | S | M4/R4,M3,M5 |
| 10 | **Link-preview readiness** — og:image is relative on all 10 pages (Facebook/LinkedIn/iMessage previews will show no image), no canonical, no twitter:card. Template now, single token swap at domain time | A photography site lives on link previews | S | P8 |

## 2. What's working — verified, do not change

- **Two-scene photo-fidelity architecture**: photos confirmed crisp, true-colour,
  un-fogged, un-bloomed at every sampled waypoint. Load-bearing; no proposal touches it.
- **Piecewise scroll→t mapping**: zero DOM/3D desync at any of ~25 sampled
  positions across two agents; survives 12,890px End-key jumps (converges 0.7s).
- **Motion language is real, not aspirational**: GSAP eases ≡ CSS bezier tokens,
  70ms staggers both sides — measured identical. (Gap is only the hover/utility layer.)
- **Reduced-motion and no-JS discipline**: three-way mode switch, JS-additive
  reveals, lightbox RM path, preloader triple fallback — "rare discipline" (PAGES).
- **Lightbox fundamentals**: focus trap + restore-to-opener verified live, real
  buttons, hash deep-links, neighbour preload, 46×46 targets.
- **Canyon staging and the finale** — the two best moments of the flight; the
  golden-hour landing frame is the best frame on the site.
- **Core palette contrast** (7.74:1 mute-on-night), srcset discipline, captions:
  11 of 16 are keep-as-is; `companion` is the best caption on the site.
- **Performance posture**: 19–47 draws/frame, ~61fps, ≈140MB GPU at dpr2 — large
  headroom; nothing needs a performance rewrite.

## 3. Findings by area (adjudicated)

### Motion (14 findings — agent-MOTION.md)
Fix: M1 lightbox exit fade (S/4) · M2 nav crossfade (M/4) · M4 title yield → end
~'16% top' (merged with R4; S/4) · M3 HUD `ft` formula needs the −6 offset:
`(t*LTOTAL+6)/SPACING-1` (S/3) · M5 split meta reveal to 'top 12%' in flight
mode (S/3) · M6 distance-scaled flyTo duration (S/3) · M9 collection pages +
contact have zero reveals — the only pages that pop (S/3) · M7 rate-limit
native-jump catch-up (M/3) · M8 preloader count snap 0596→3400 (S/2) · M10
asymmetric card hover (S/2) · M11 tokenise hover durations `--dur-hover` (S/2) ·
M12 stagger per IO batch not DOM index (S/2) · M13 animate the scroll cue (S/2) ·
M14 de-duplicate inline tokens in index.html (S/2).

### 3D rendering (13 findings — agent-RENDER.md)
Fix: R1 cloud distance-fade (S/5) · R2 cloud texture variety + drift (S/4) · R3
camera banking, zeroed at meets (S/4) · R9 ridged 4th terrain octave outside the
flight corridor + height vertex colours — mid-flight lower half is currently a
featureless sheet (M/4) · R5 photo entrance smoothstep + exit fade kills the
near-plane clip-through (S/3) · R7 soft-gradient sun halo + finale sea glint
echoing p09's subject (S/3) · R8 particle twinkle layers + near-camera spawn
rejection (fixes the bloomed lens blob) (S/3) · R6 print-mat mount + soft shadow
behind photos, in the photo scene so never bloomed — *taste prototype first*
(S–M/3) · R10 write-on-change DOM updates in render() (S/2) · R12 palette trough
A/B — adjudication: the grey trough is defensible pre-dawn; try only after R1
changes the picture (S/2) · R13 FOV modulation only if R3 isn't enough (S/1) ·
R11 middle render tier: on-paper feasible, **gate behind `?tier=` flag + real
device pass**; mobile stays lite until then (M–L/3).

### Pages / UX / SEO (18 findings — agent-PAGES.md)
Fix: P10 prints conversion (M–L/5) · P3 alt de-dupe + caption-grade alts (S/4) ·
P4 `visibility` pair on header fade (S/4) · P6 waypoint→archive links (S/4) ·
P8 absolute og + canonical + twitter:card template (S/4) · P2 tile titles
visible on touch (`@media (hover:none)`) (S/4) · P1 lightbox `aria-live` +
"2 / 4" counter (S/4) · P5 panorama treatment (M/4) · P13 telemetry → `--mute`
(S/3) · P12 nav touch targets ≥24px (S/3) · P9 JSON-LD (Person, ImageObject
with `acquireLicensePage` — Google "Licensable" badge, direct licensing
relevance; BreadcrumbList) (M/3) · P16 lightbox zoom for print buyers +
`cursor:zoom-in` (M/3) · P17 hub card meta: lead with location, soften counts;
medium-term generate hub from data.js (S–M/3) · P11 newsletter + social links
now; journal/workshops only when content exists — adjudication agrees with the
agent's own counterpoint: no empty shells (S→L/4) · P7 header discoverability:
reveal on upward scroll or idle — owner taste, documented tradeoff (M/3) · P15
2.5s belt-and-braces `.pre` strip for non-frame-pumping renderers (S/2) · P14
branded 404 ("Off the flight path") (S/2) · P18 kicker breadcrumb (S/2).

### Content & photography (18 findings — agent-CONTENT.md)
Decide: C1 descent reorder (M/5, §1.3) · C2 "An Aerial Photo Essay" overstates —
2 of 16 frames are aerial; retitle "A photo essay in one continuous descent"
(S/4) · C6 fireworks (p07) as a *night* waypoint or outro backdrop — finale
placement correctly killed (M/4) · C8 wildlife essay format for /portfolio/wild/
with p08 cross-listed (the dog is the link) (M/4) · C3 p08 caption/alt erase the
dog — factual completeness, revision drafted (S/4) · C4 jaguar caption is the one
purple passage + captive/wild disclosure needed (S/4) · C9 the Laguna Colorada
flamingos go unmentioned (S/3) · C10 "Highlands & Islands" is ¾ Edinburgh —
rename "Scotland" or shoot the gap (S/3) · C16 p12 is technically the weakest
frame opening the site — re-edit/denoise or replace; keep the slot (S/3) · C18
prints page sells panoramas without showing one — add p03 strip (S/3) · C15
Tian Shan "one range, 24 hours" micro-essay once location confirmed (M/3) · C14
metadata VERIFY ledger — 8 items for Matthew (S/3) · C12 data.js↔index.html
telemetry drift (shutter speeds exist only in the homepage; single-source
contract already broken) (S/2) · C13 altM mixes three reference frames — pick
metres-ASL or label honestly (S/2) · C17 p01 torch-trail caption variant (S/2) ·
C11 em-dash tic — two blurbs redrafted dash-free (S/2) · C7 constellation
overlays KILLED (would violate the About page's no-overlay commitment; atmosphere-
layer star alternative optional) · C5 panorama interlude (§1.4).

## 4. The descent-order decision (needs Matthew)

Current order: night → blue hour → dusk → dusk-pink → dawn → dawn → canyon →
sunset; altitude 3,400→110→15→90→320→450→−20→5 (climbs mid-flight, HUD shows it).
Proposed: milkyway → glacier → faroes → calton → neist → forth → antelope →
goldenhour; altitude monotonic 3,400→450→320→110→90→15→−20→5, below ground at
the canyon, resurfacing to land on the sea.
**For**: the title's promise becomes literally true; stronger ending beat.
**Against**: the current order alternates Scotland/abroad for variety, and the
proposed one front-loads both drone frames. Light-arc is imperfect either way.
Cheap alternative if keeping current order: reframe the HUD label so altitude
reads as waypoint data, not flight telemetry.

## 5. Photo-driven inspiration (from viewing the images)

- **p03 panorama** → the cruise interlude (§1.4) + full-width strip on /prints/.
- **p07 fireworks** → night-phase waypoint 02, or animated outro backdrop.
- **p11 flamingos** → caption enrichment now; a 400mm shoreline frame later.
- **p08 + p13 the dog** → the thread that makes the wildlife essay a story
  (met / followed / watched / rested), p08 cross-listed as its closer.
- **p01 torch trail** → one-line caption variant naming the one human trace.
- **p12 Milky Way** → atmosphere-layer enrichment only; never on the photograph.

## 6. Shoot list (full briefs in agent-CONTENT.md)

Scotland: a true Highland landform in broken weather; west-coast stack at dawn;
Old Town rain at street level. Mountains: scale figure beneath the ridge;
serac/crevasse abstract; tracked astro to back up p12. Desert: dune ridgelines
at lowest sun; Laguna flamingos at 400mm; desert-rock nightscape. Sea: storm
water; working harbour before dawn; a second aerial. Wild: puffin portrait with
sand eels; Highland stag in mist; the dog, backlit, new terrain.

## 7. Roadmap

**Quick wins (each ≤1h, no decisions needed):**
M1 · M3 · M4/R4 · M8 · M9 · M13 · R1 · R2 · R8a (spawn rejection) · P3 · P4 ·
P13 · P12 · P2 · P1 · P6 · P8 · P14 · P18 · C3 · C9 · C12 · C17 · C18 — plus
prints prices the moment Matthew supplies numbers.

**Next build wave (a second workflow):**
M2 · M5 · M6 · M7 · M10–M12 · R3 · R5 · R7 · R9 · R10 · P5 · P9 · P15 · P16 ·
P17 · C2 · C6 · C10 · C13 · newsletter/social (P11-near) · hub from data.js.

**Ambitious (decide, then dedicate a workflow each):**
C1 descent reorder (after Matthew's call) · C5 panorama cruise interlude ·
C8 wildlife essay layout · P10 full prints/licensing journey · R6 mount
prototype · R11 middle tier with real-device verification · C15 24-hours
micro-essay · journal/workshops when content exists.

## 8. Copy drafts (DRAFT — Matthew edits; full versions in agent-CONTENT.md)

- **Bio** (about): two restrained paragraphs around the work, [BRACKETED] facts
  only Matthew can fill; no invented credentials.
- **Site meta**: "Landscape photography by Matthew Deane, presented as one
  continuous descent — from the Milky Way over a black ridgeline to a
  golden-hour crossing at sea level. Sixteen photographs, five collections,
  prints and licensing available."
- **Caption verdicts**: 11 keep / 2 revise (jaguar, holyrood) / 3 enrich
  (colorada, lightshaft soft-variant, calton variant) — table in agent-CONTENT.md.
- **Collection blurbs**: five redrafts (two now dash-free); "highlands" pending
  the C10 rename decision.
- **Prints intro + how-it-works**: current copy is essentially ship-ready;
  tightened variants provided.
