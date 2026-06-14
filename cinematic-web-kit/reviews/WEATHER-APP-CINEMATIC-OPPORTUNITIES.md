# Scottish Mountain Weather — Cinematic-Web-Kit Enhancement Review

## 1. Introduction

This is a **review only** — no application code was changed. It evaluates how techniques catalogued in the `cinematic-web-kit` PATTERNS playbook (a Three.js / WebGL2 / GSAP / Lenis / static-host cinematic flight kit) could enhance the Scottish Mountain Weather app (React 18 + TypeScript + Vite + react-leaflet + Recharts + Tailwind, deployed to a HuggingFace Space).

Each candidate enhancement was generated per UI surface, then put through an **adversarial verdict** that checked three things:

1. **Feasibility in this stack** — does the cited mechanism actually exist here? (The kit is a Three.js playbook; this app has no Three.js, GSAP, Lenis, or WebGL composer, so most patterns transfer only as metaphor.)
2. **Does it help a hiker make a go/no-go decision?** — this is a safety tool first; decoration that adds no decision signal does not clear the bar.
3. **Does it survive accessibility / offline / reduced-motion / mobile-battery scrutiny?**

The headline result: **of 36 proposed enhancements, only 7 survive** — and most of those are downgraded in impact. The recurring failure mode is *category error*: citing WebGL fidelity/scroll-flight laws (PATTERNS A/B/C/D) for a DOM/raster surface they do not govern, and dressing up either a one-line bug-fix or pure decoration as a high-impact cinematic feature. The genuinely valuable survivors are accessibility correctness fixes and one redundant-encoding safety improvement, not cinematic spectacle.

---

## 2. Top 10 Quick-Wins (survivors only, ranked by impact-over-effort)

Only opportunities whose adversarial verdict was `survives: true` are listed. There are **7 survivors total** (not 10) — the remaining 29 were refuted. Ranked by revised impact ÷ effort.

| # | Title | PATTERNS § | Target file | Impact / Effort (revised) |
|---|-------|-----------|-------------|---------------------------|
| 1 | Promote GoNoGoSummary to safety keystone with redundant non-color (shape+text+color) encoding | E4 | `frontend/src/components/GoNoGoSummary.tsx` | **M / S** |
| 2 | Lightbox accessibility + navigation (focus trap, Escape, role=dialog, arrows, return-focus) | C6 | `frontend/src/components/MountainPhotoGallery.tsx` | **M / M** |
| 3 | `usePrefersReducedMotion` hook gating Recharts JS animation (`isAnimationActive`) | C6 | `frontend/src/hooks/usePrefersReducedMotion.ts`, `WeatherCharts.tsx` | **L / S** |
| 4 | Type the `any` props + distinguish missing-vs-zero visibility (whiteout=0) | D2 | `WeatherCharts.tsx`, `HikingSuitabilityDashboard.tsx`, `types/weather.ts` | **L / M** |
| 5 | Reserved-height, non-displacing offline / staleness banner slots (CLS fix) | C6 | `frontend/src/components/Layout.tsx`, `index.css` | **L / S** |
| 6 | Theme-token Recharts: CSS-variable tooltip/axis config (light-mode dark-tooltip bug) | E1 | `WeatherCharts.tsx`, `index.css` | **L / M** |
| 7 | Oversized hero numeral for the hiking score (display-type contrast, capped at weight 700) | E4 | `index.css`, `tailwind.config.js`, `index.html` | **L / S** |

> Note: items 3–7 were all downgraded to **Low** impact in adversarial review — they are real, cheap, correct fixes (an accessibility gap, a theme bug, a CLS jump, a type-safety + missing-vs-zero data hazard, a typographic focal point) but none changes the core go/no-go signal. Items 1 and 2 are the only survivors that genuinely improve the safety/usability of the decision surface.

---

## 3. Per-Surface Detail

Legend: ✅ **SURVIVED** · ❌ **DROPPED / REFUTED**

### 3.1 Maps & 3D

#### ❌ Real wind streamline particle layer on a Leaflet canvas overlay (B8)
- **Target:** `WindAnimationMap.tsx`, `LocationMap.tsx`
- **Mechanism:** Build the inert `WindAnimationMap` stub into a real Leaflet custom pane holding a full-size canvas; seed ~600 desktop / ~150 mobile particles, advect by IDW-interpolated wind vectors across visible markers, fading additive trails encoding `wind_speed_kph`; reposition on move/zoom/resize; pause on `document.hidden`.
- **Outcome (claimed):** Replace the fake 8×8 static-arrow grid with a genuine flow field where trail speed/length encodes wind.
- **Impact/Effort (claimed):** H / M
- **Risk/trap notes:** Must respawn-reject over marker rects or particles bloom over score-coded pins; battery cost on mobile.
- **Safety guardrail:** Explicit `matchMedia('(prefers-reduced-motion: reduce)')` rAF guard (index.css:171 only kills CSS, not rAF); keep windPane z below markers.
- **Verdict — DROPPED (revised L):** The `Location[]` objects the map renders (`types/weather.ts:1-12`) have **no wind fields** — wind lives on a separate forecast/period type the map never receives, and `wind_direction` is a 16-point string enum, not a bearing. IDW over a sparse handful of summit markers is degenerate, so the "gust corridors" are physically unjustifiable. Violates D3 fill discipline (~600 additive-blend trails, no adaptive quality, unmeasured fps). The reduced-motion rAF catch is the one good idea; everything it would drive is fabricated precision over the safety pins.

#### ❌ Seeded precipitation particle layer (kills per-render `Math.random` flicker) (B1)
- **Target:** `WeatherMaps.tsx`
- **Mechanism:** Replace `PrecipitationMap`'s `Math.random()` SVG scatter (re-randomised every render) with a seeded canvas particle field; count/fall-speed scale from `precipitation_mm`.
- **Outcome (claimed):** Continuous, intensity-mapped precipitation instead of a teleporting noise field.
- **Impact/Effort (claimed):** M / M
- **Risk/trap notes:** Unseeded random field is the non-reproducible failure D4 warns about.
- **Safety guardrail:** rAF gated behind reduced-motion; numeric mm readout remains source of truth.
- **Verdict — DROPPED (revised L):** Real bug, wrong cure. The flicker is genuine (10 `Math.random()` calls in the render body, lines 273-311), but the fix is a **one-line seeded `useMemo`**, which kills the flicker and satisfies reproducibility without any animation. The proposal mis-cites a Three.js terrain pattern (B1) onto a react-leaflet card, invents an "F4" trap (PATTERNS F is unnumbered), and over-engineers a decorative 256px overlay. mm readout is already on screen, so zero go/no-go value added.

#### ❌ `flyTo` camera choreography on marker selection (C3)
- **Target:** `LocationMap.tsx`
- **Mechanism:** `useMap` child watches `selectedLocationId`, calls `map.flyTo` with distance-scaled duration; also move `fitBounds` out of `useMemo` into `useEffect`.
- **Outcome (claimed):** Glide to selection instead of teleport; fix render-phase side-effect bug.
- **Impact/Effort (claimed):** M / S
- **Risk/trap notes:** Rate-limit overlapping flyTo; tile thrashing on long flights.
- **Safety guardrail:** Reduced-motion → `setView(animate:false)`; maxZoom clamps.
- **Verdict — DROPPED (revised L):** The trigger likely never fires in-place — selection routes through `onLocationSelect`/"View Details" which navigates to `LocationPage` and unmounts the map. **The one genuinely valid sub-fix is real:** line 91 abuses `useMemo` to run `map.fitBounds` as a render-phase side effect (a true React anti-pattern). *Ship the `useMemo → useEffect` fix alone; drop the flyTo choreography.*

#### ❌ Animated RainViewer radar loop with crossfade (C5)
- **Target:** `LocationMap.tsx`
- **Mechanism:** Step through `data.radar.past[]` on a timer, crossfading two stacked `TileLayer`s.
- **Outcome (claimed):** Moving radar showing "where rain is heading"; smooth fade-in.
- **Impact/Effort (claimed):** M / M
- **Risk/trap notes:** Only loop already-fetched frames; stop on `document.hidden`.
- **Safety guardrail:** Reduced-motion → single static frame; cap opacity at 0.5.
- **Verdict — DROPPED (revised L):** Two stack mismatches. react-leaflet `TileLayer` is declarative, so stepping frames means remounting (full re-fetch — the opposite of "frames in hand") or reaching into imperative `setUrl()` which react-leaflet 4 does not expose ergonomically. And the headline "where rain is heading" needs `radar.nowcast`, but the component only models `radar.past` — it shows where rain **was**, adding motion but no forecast.

#### ❌ Score-driven marker depth + staggered reveal (E1)
- **Target:** `LocationMap.tsx`
- **Mechanism:** Derive aura intensity / elevation-shadow from the four score colors as named tokens; CSS staggered entrance with per-marker `animation-delay`.
- **Outcome (claimed):** Atmospheric depth tied to the dark palette without altering color coding.
- **Impact/Effort (claimed):** M / S
- **Risk/trap notes:** Existing tile CSS filter already mutes the map; added aura risks "mud".
- **Safety guardrail:** CSS animations caught by index.css:171; never let aura reduce red-pin contrast.
- **Verdict — DROPPED (revised L):** Redundantly re-encodes elevation (already marker size + popup number) and score (already pin color) as decorative aura/shadow that the proposal's own riskNotes admit "stacks into mud". Leaflet 1.9.4 owns `.leaflet-marker-icon`'s `translate3d` transform and re-applies it on every pan/zoom/fitBounds, so a CSS keyframe on it collides; the one-shot entrance re-fires on every selection/zoom (a bug, not polish). Aura/shadow are static, so the reduced-motion guard does **not** touch the contrast-muddying part.

#### ❌ Lazy r3f terrain with safety altitude planes, 2D fallback (C6)
- **Target:** `TerrainView3D.tsx`, `LocationPage.tsx`
- **Mechanism:** Build the stub into a code-split react-three-fiber terrain (fBm noise stand-in or real DEM) draped with tiles, plus translucent freezing-level / cloud-base planes and visibility-keyed fog; degrade to 2D Leaflet on no-WebGL / reduced-motion / mobile.
- **Outcome (claimed):** Glance-legible 3D read of exposure; low-end users fall back to the working map.
- **Impact/Effort (claimed):** H / L
- **Risk/trap notes:** Only item adding heavy deps (three, @react-three/fiber); fill-bound planes on mobile GPUs.
- **Safety guardrail:** Default OFF behind a flag + WebGL + reduced-motion checks; numbers stay exact labels.
- **Verdict — DROPPED (revised L):** The degradation path is genuinely well-designed and C6-compliant — but it cannot rescue the feature, because **the safety data is fabricated**: the deployed `simple_api.py` returns `freezing_level_m` as `None`, `cloud_base_m` hardcoded/random, and `visibility_m` explicitly mock-random. The "fBm noise stand-in" is invented terrain, not the real mountain. The planes would render at fictitious altitudes, adding false authority to absent data — and every real number is already shown as an exact label by existing `GoNoGoSummary` / `WinterConditionsPanel` / `SafeWindowBar`.

### 3.2 Layout

#### ❌ Scroll-triggered `<Reveal>` primitive replacing on-mount fade cascade (C4)
- **Target:** `HomePage.tsx`, `LocationPage.tsx`, `index.css`
- **Mechanism:** One IntersectionObserver `<Reveal>` wrapper, default `opacity:1`, adds a transition class on crossing `top:88%`; replace ~20 hardcoded `fade-in-up` + `animationDelay` call-sites.
- **Outcome (claimed):** Below-fold sections reveal on arrival instead of finishing unseen on mount.
- **Impact/Effort (claimed):** H / M
- **Risk/trap notes:** IO targets mount late behind React Query skeletons; must observe the real node.
- **Safety guardrail:** Base `opacity:1`; never wrap safety-critical blocks; JS `matchMedia` short-circuit.
- **Verdict — DROPPED (revised L):** C4 is a scrubbed-timeline GSAP/ScrollTrigger 3D pattern — none of that stack exists here, so the patternId is decorative pedigree, not a transferred constraint. The safety guardrail is **self-contradictory**: "base state opacity:1 (never hidden)" and "an authored fade-up reveal" are mutually exclusive (a fade-up needs a hidden pre-reveal state, reintroducing the FOUC the guardrail forbids). It rides React-Query late-mount timing and animates only non-safety chrome → improves zero go/no-go decisions.

#### ❌ Sticky condensed safety header on LocationPage (C1)
- **Target:** `LocationPage.tsx`, `index.css`
- **Mechanism:** Pin a condensed identity + verdict strip once the hero scrolls past, gated by an IO sentinel.
- **Outcome (claimed):** The GoNoGo headline stays on screen through the dense 14-block page.
- **Impact/Effort (claimed):** H / M
- **Risk/trap notes:** Must sit below the z-50 mobile header; verdict must mirror GoNoGoSummary.
- **Safety guardrail:** Same data source as full GoNoGoSummary; keep skip-link/focus order.
- **Verdict — DROPPED (revised L) — helpsHikers acknowledged TRUE but mechanism broken:** Sound safety instinct, but `sticky top-0 z-20` slides **under** the opaque `fixed top-0 z-50` mobile header (Layout.tsx has no scroll container; the body scrolls), rendering it invisible on the primary hiker device without a hardcoded magic offset. Worse, **there is no single GoNoGo verdict to mirror** — `GoNoGoSummary.tsx:69` computes a separate verdict per day; the condensed chip must invent a "today vs worst-of-3" heuristic, which *is* the desync its own guardrail forbids.

#### ✅ Reserved-height, non-displacing banner slots (C6) — **SURVIVES (revised L)**
- **Target:** `Layout.tsx`, `index.css`
- **Mechanism:** Wrap the offline banner (Layout.tsx:49) and `DataStalenessWarning` (Layout.tsx:61) in a persistent slot that animates `max-height` open instead of synchronously inserting DOM that shoves `<main>` down.
- **Outcome:** Banners slide in without yanking the settled page downward (real CLS jump today).
- **Impact/Effort:** M / S → revised **L / S**
- **Risk/trap notes:** None of the PATTERNS F WebGL traps apply (correctly stays in CSS/React). Real risk is a live-region announce-vs-visibility desync — the layout analogue of the C1 caption-desync trap.
- **Safety guardrail:** Banner legible the instant its condition is true; cap transition ~200ms; reduced-motion snaps open via the existing index.css:171 guard.
- **Verdict — SURVIVES with downgrade to Low:** The CLS premise is real (both banners are in normal flow today) and the fix is cheap, with the existing `.expand-height` utility (index.css:1477) and reduced-motion guard already in place. **Ship only with an explicit acceptance test that the banner is mounted, announced, and fully legible at t=0 (not gated behind the slide), and add the missing `aria-live` to the silent offline banner (Layout.tsx:50) while in the file.** It is scroll-preservation polish, not a go/no-go change — hence Low.

#### ❌ Establishing hero scene with sticky map-as-backdrop (E4)
- **Target:** `HomePage.tsx`, `index.css`
- **Mechanism:** Promote the thin hero to a tall band whose backdrop is the lazy `LocationMap` (`interactive={false}` + scrim), pinned then released on scroll.
- **Outcome (claimed):** A hero "sense of place" without inventing imagery.
- **Impact/Effort (claimed):** M / L
- **Risk/trap notes:** Leaflet hijacks wheel/touch; must stay non-interactive; lazy/Suspense mount timing.
- **Safety guardrail:** Modest hero height on phones; reduced-motion disables parallax via matchMedia.
- **Verdict — DROPPED (revised L):** The keystone claim is **false** — `interactive={false}` in this component only maps to scrollWheelZoom/dragging/zoomControl; `.leaflet-container` still captures pointer/touch, and the required `pointer-events:none` does not exist anywhere in the codebase. Hoisting one Leaflet map to serve backdrop **and** section-7 is impossible (one map = one DOM node); the fallback "second instance" means a second full tile fetch + marker layer over 77 locations on the most-loaded page. Pins go/no-go conditions below the fold on mobile; zero safety change.

#### ❌ Adaptive scroll-stagger for the 6-Day forecast list (C4)
- **Target:** `LocationPage.tsx`, `index.css`
- **Mechanism:** Replace the `.stagger-children` 8-child nth-child cap with a length-adaptive `--reveal-i` × 60ms cascade firing on scroll-entry.
- **Outcome (claimed):** Cascade adapts to any count and plays when scrolled into view.
- **Impact/Effort (claimed):** M / S
- **Risk/trap notes:** 6-Day list is core safety content; must not delay legibility.
- **Safety guardrail:** Base state fully visible; preserve the line-241 confidence-opacity fade.
- **Verdict — DROPPED (revised L):** **The premise is false** — `forecast.forecasts` is a 6-day array (n≤6 < 8), so the nth-child cap never overflows. The cited "C4 reveal primitive" doesn't exist (only test-mock IntersectionObservers). Worst of all, `transition-delay` is **not** neutralised by the index.css:171 reduced-motion guard (it zeroes duration, not delay), so the change trades a free CSS reduced-motion guarantee for a JS IO that can leave a core safety day-card at `opacity:0` on fast scroll. Strictly worse for hikers.

#### ❌ Choreographed route transition Home ↔ Location (C3)
- **Target:** `App.tsx`, `Layout.tsx`, `index.css`
- **Mechanism:** Key the `<Outlet/>` on `pathname` for a CSS `fadeInScale` enter transition.
- **Outcome (claimed):** Brief guided fade instead of a hard swap.
- **Impact/Effort (claimed):** L / S
- **Risk/trap notes:** Keyed remount can re-trigger lazy/Suspense mounts.
- **Safety guardrail:** Enter-only, sub-300ms, never a content gate.
- **Verdict — DROPPED (revised L):** A `key={pathname}` wrapper is a **full subtree remount**, not "opacity on an already-rendered tree". It destroys/recreates the lazy `LocationMap` and `CustomizableDashboard` on every nav — re-flashing Suspense skeletons and re-fetching OSM tiles, a net regression for a safety tool (especially offline). The guardrail's "already-rendered tree" claim directly contradicts the riskNote's own admission. *The folded-in scroll-to-top is fine and could ship standalone.*

### 3.3 UI Components

#### ✅ `usePrefersReducedMotion` hook gating Recharts JS animation (C6) — **SURVIVES (revised L)**
- **Target:** `hooks/usePrefersReducedMotion.ts`, `WeatherCharts.tsx`, `WeatherCard.tsx`, `weather/HikingScoreGauge.tsx`
- **Mechanism:** A matchMedia hook with a change listener; pass `isAnimationActive={!reduced}` to every Recharts series (currently unset → defaults to animating draw-in); thread the flag through the icon and gauge.
- **Outcome:** Reduced-motion actually stops the chart draw-in that CSS cannot reach.
- **Impact/Effort:** H / S → revised **L / S**
- **Risk/trap notes:** Relying on CSS-only reduced-motion silently fails for library JS animation — but **only** for Recharts. matchMedia listener must clean up.
- **Safety guardrail:** Reduced-motion disables motion, never hides/delays data (Recharts draws final frame immediately).
- **Verdict — SURVIVES in narrowest form:** The Recharts gap is real and worth a one-line fix per series. But the headline rationale is two-thirds false: the WeatherIcon (CSS keyframes) and HikingScoreGauge (Tailwind `duration-1000` transition) are **already** caught by the global index.css:171 `*` guard — they are not "the JS layer the CSS guard misses". **Reduce to a Recharts-only patch.** matchMedia + cleanup is already the proven pattern in `Layout.tsx:23-24`.

#### ✅ Promote GoNoGoSummary to safety keystone with redundant non-color encoding (E4) — **SURVIVES (revised M)**
- **Target:** `GoNoGoSummary.tsx`
- **Mechanism:** Add a verdict **glyph** per card (check / triangle-exclaim / octagon-x from already-imported heroicons) so meaning survives color-blindness and grayscale → encoding becomes shape + text + color. Widen the accent strip; add a ring on the NO-GO card only.
- **Outcome:** The clearest safety element becomes legible to color-blind users and in grayscale — graspable in under a second.
- **Impact/Effort:** H / S → revised **M / S**
- **Risk/trap notes:** No WebGL traps apply (pure DOM). Don't over-decorate; reserve motion (none on a safety tool).
- **Safety guardrail:** Emphasis never obscures the verdict words/reason; no motion delaying the verdict.
- **Verdict — SURVIVES (downgrade H→M):** Verified feasible — `@heroicons/react` already ships both outline/solid variants in use elsewhere; `CheckCircleIcon`/`ExclamationTriangleIcon`/`XCircleIcon` all exist. The redundant **shape+text+color** encoding genuinely helps a color-blind hiker (WCAG 1.4.1 spirit), introduces no motion, and none of the WebGL/budget traps apply. **Two cautions:** glyphs MUST be `aria-hidden` (the text label already carries an `aria-label`, else double-announce); verify the monochrome glyph's own non-text contrast clears 3:1 (WCAG 1.4.11). **Drop the resize/reorder-today sub-item** — it risks breaking chronological scan order. This is one of only two survivors that actually improves the decision surface.

#### ✅ Image-fidelity pass on the photo gallery: aspect-ratio, LQIP blur-up, async decode, no filters (A4)
- **Target:** `MountainPhotoGallery.tsx`
- **Mechanism:** Reserve layout with `aspect-[3/2]` + width/height attrs (kill CLS); CSS-only blur-up (scaled blurred thumbnail behind the full-res modal image, opacity swap on `onLoad`); `decoding='async'` + `fetchpriority='high'`; **never** apply a CSS filter/tint to the `<img>`.
- **Outcome (claimed):** Photos stop popping in, fade from a placeholder with reserved space, stay pixel-faithful.
- **Impact/Effort (claimed):** M / M
- **Risk/trap notes:** "Enhancing" photos with brightness/saturation would corrupt owner/attribution fidelity — explicitly forbidden (A4).
- **Safety guardrail:** Attribution preserved; blur is decorative, full `<img>` always in DOM.
- **Verdict — DROPPED (revised L):** Technically clean and **law-compliant** (it *enforces* A4 rather than breaking it), fully feasible, low a11y risk — but it is perceived-quality polish on **illustrative** photos that does not change any go/no-go datum. Correct, harmless, and worth doing if photo polish is a goal; it just does not clear the survival bar for a safety app.

#### ✅ Lightbox accessibility + navigation (C6) — **SURVIVES (revised M)**
- **Target:** `MountainPhotoGallery.tsx`
- **Mechanism:** Track selected index; `keydown` effect (Escape closes, Arrow Left/Right step prev/next); `role='dialog'` + `aria-modal`; focus to close button on open, restore to the triggering thumbnail on close; trap Tab; visible 44px prev/next buttons; scroll-edge mask-fade on the strip.
- **Outcome:** The lightbox becomes keyboard- and screen-reader-operable — no AT user is trapped behind the page.
- **Impact/Effort:** M / M → revised **M / M**
- **Risk/trap notes:** Remove the listener on close; don't break click-backdrop-to-close; prev/next wrap deterministically.
- **Safety guardrail:** Arrow handlers scoped to the open modal only; never trap focus or swallow Escape.
- **Verdict — SURVIVES:** A legitimate, in-stack C6 fix for a **real defect** — the current modal (lines 75-133) has no `role=dialog`, no focus trap, no Escape, no focus restoration, so a keyboard/AT user is genuinely trapped today. No PATTERNS law or F-trap applies. **Tighten or drop the cosmetic edge-fade** (it can clip the focus-visible ring); ensure the hand-rolled trap removes its listener on unmount. The photos are decorative but the trap is not — this is the other survivor that materially helps users.

#### ✅ Theme-token Recharts: CSS-variable tooltip/axis config (E1) — **SURVIVES (revised L)**
- **Target:** `WeatherCharts.tsx`, `index.css`
- **Mechanism:** Replace the six repeated hardcoded `rgb(...)` Tooltip `contentStyle` blocks with a single config reading `var(--color-bg-secondary)` etc.; replace series stroke hex literals with named palette tokens; DRY six near-duplicate `ComposedChart` configs to one helper.
- **Outcome:** Charts follow the light/dark toggle the rest of the app honors; data-viz reads as one system.
- **Impact/Effort:** M / M → revised **L / M**
- **Risk/trap notes:** Recharts renders the tooltip in-tree (var inheritance works), but a CSS-class approach via `.recharts-tooltip-wrapper` is more robust. Don't let a token swap silently recolor the temperature/danger lines.
- **Safety guardrail:** Preserve exact semantic color mapping; tooltip text ≥ WCAG AA in both themes.
- **Verdict — SURVIVES (M→L):** The bug is real and reproducible — the app genuinely reaches light mode (Settings → Zustand → `Layout.tsx`), but all six inline `contentStyle` blocks force a dark tooltip in **both** themes (a dark tooltip on a light page). No WebGL budget applies. **The unverified `hex == token` equivalence must be checked** so the refactor doesn't silently recolor the temperature/danger series; make WCAG-AA-in-both-themes a verification step, not a comment. Cosmetic polish, zero go/no-go value → Low.

#### ❌ Lazy-load Recharts as a code-split chunk (B12)
- **Target:** `CustomizableDashboard.tsx`, `WeatherCharts.tsx`
- **Mechanism:** `React.lazy(() => import('./WeatherCharts'))` + Suspense skeleton.
- **Outcome (claimed):** Heavy Recharts no longer taxes initial load of the GoNoGo card surface.
- **Impact/Effort (claimed):** M / S
- **Risk/trap notes:** Boundary must sit where charts are conditionally shown; don't double-wrap.
- **Safety guardrail:** GO/NO-GO verdict must not live in the lazy chunk.
- **Verdict — DROPPED (revised L):** **The win already exists.** recharts is imported by exactly one file (`WeatherCharts`), imported by exactly one component (`CustomizableDashboard`), which is **already** `React.lazy` + Suspense-wrapped at `LocationPage.tsx:37`. With no `manualChunks`, Vite already emits recharts + its 66 `d3-*` deps as a separate async chunk loaded only when the dashboard mounts. `GoNoGoSummary` imports none of it. Adding a second boundary splits nothing and could add a serialized round-trip + second skeleton flash — a mild regression. (D2 "measure don't estimate" violated: node_modules isn't even installed, so no build was run.)

#### ✅ Type the `any` props + missing-vs-zero visibility (D2) — **SURVIVES (revised L)**
- **Target:** `WeatherCharts.tsx`, `HikingSuitabilityDashboard.tsx`, `types/weather.ts`
- **Mechanism:** Replace `preferences: any` / `assessment: any` with real interfaces; distinguish missing (`undefined` → "N/A") from genuine zero, because **0 visibility is a real whiteout value** that `|| 0` currently launders into "no data".
- **Outcome:** Compiler guarantees the shape of data flowing through the decision surface; a whiteout-vs-no-data ambiguity can no longer silently mislead.
- **Impact/Effort:** M / M → revised **L / M**
- **Risk/trap notes:** No PATTERNS F traps (a TypeScript/data-contract change). Recharts renders gaps for `null` (`connectNulls` defaults false); tooltips tolerate undefined.
- **Safety guardrail:** When distinguishing missing from zero, default to the more cautious reading — show explicit "no data" rather than implying good visibility.
- **Verdict — SURVIVES (M→L):** The **missing-vs-zero visibility fix is a real safety win and the load-bearing part.** The typing half rests on a false premise — `Assessment`/`RiskFactor`/`UserPreferences` interfaces **already exist** and are merely discarded at the `any` boundaries (a one-token swap, not a derivation) — and overstates "the compiler now guarantees the shape". It also misses the actual latent bug annotation would expose: `WeatherCharts` renders `°${units.temperature}` = `"°celsius"`. Ship for the visibility fix; the typing is hygiene.

### 3.4 Visual Design Language

#### ❌ Day-arc light model driven by forecast sunrise/sunset (C5)
- **Target:** `index.css`, `tailwind.config.js`
- **Mechanism:** 4-5 named CSS-var light profiles on `<html data-arc>`, a tiny App.tsx effect reading sun times, body gradient `var(--arc-bg-top)→var(--arc-bg-bottom)` with a 1200ms transition.
- **Outcome (claimed):** Background shifts cool-dawn → warm-golden → night, "encoding daylight remaining".
- **Impact/Effort (claimed):** H / M
- **Safety guardrail:** Status colors excluded; clamp arc to min-luminance; reduced-motion instant.
- **Verdict — DROPPED (revised L):** Two load-bearing mechanics are false: `App.tsx` is a pure router with **no location/forecast/lat-long** in scope (sun times live in a self-labelled "simplified" approximation), and **`linear-gradient()` is not transition-animatable** — `transition: background 1200ms` hard-cuts, so the signature "subtle shift" cannot be produced. Deleting the static `.dark body` gradient with no fallback custom-property values leaves no-JS/pre-hydration visitors with **no background at all**. Cue would be wall-clock, not hike-time. Decoration mis-sold as safety info.

#### ❌ Decouple brand chrome from the safety signal (named palette split) (E1)
- **Target:** `tailwind.config.js`, `index.css`
- **Mechanism:** Introduce a desaturated `--brand` token for buttons/links/FAB/tabs while keeping emerald = "safe", so a green status badge reads differently from a brand action.
- **Outcome (claimed):** Danger/caution stop competing with all-green chrome.
- **Impact/Effort (claimed):** H / M
- **Safety guardrail:** Safety ramps untouched; brand ≥ 3:1 for focus ring; never reuse red/amber.
- **Verdict — DROPPED (revised L):** **The "small set of chrome classes" choke point does not exist** — grep finds 362 inline emerald utility classes across 41 `.tsx` files, and the *same literal class* (`text-emerald-400`, `bg-emerald-500`) serves both chrome (`MobileNavigation`) and the safety signal (`HikingSuitabilityDashboard:90-101`). Re-pointing index.css recipes leaves most chrome green. The real change is an app-wide per-occurrence audit (H, not M) that trips its own "don't break components app-wide" constraint, plus a desaturated teal-on-dark focus ring is the most likely place to fail WCAG 1.4.11. Pure decoration; no go/no-go change.

#### ❌ Reserve glow + motion for the safety state; strip decorative motion (E2)
- **Target:** `index.css`, `tailwind.config.js`
- **Mechanism:** Remove emerald glow from neutral chrome; keep glow only on danger/alert; tokenise easing to two curves.
- **Outcome (claimed):** Glow becomes meaningful when the danger pulse fires.
- **Impact/Effort (claimed):** H / S
- **Verdict — DROPPED (revised L):** The "desensitization" it fixes **doesn't exist** — the danger pulse is RED and on a separate hue channel from the GREEN chrome glow. Two of its three keep-targets are broken: the cited `safety-danger` selector doesn't exist and `alert-banner-danger` has no glow at all. Its self-flagged `glow-breathe` danger-coupling trap is a phantom (glowBreathe is green, on one PullToRefresh button, wired to no danger state). Harmless cosmetic refactor mis-sold as H-impact safety legibility.

#### ✅ Oversized hero numeral for the hiking score (E4) — **SURVIVES (revised L)**
- **Target:** `index.css`, `tailwind.config.js`, `index.html`
- **Mechanism:** A `.score-hero` class using existing Inter at `clamp(3.5rem,12vw,7rem)`, weight 700, tabular-lining nums, colored by the safety ramp; no count-up animation.
- **Outcome:** The hero score reads as the deliberate focal point instead of one equally-weighted value, at zero added network cost.
- **Impact/Effort:** M / S → revised **L / S**
- **Risk/trap notes:** Avoid paid/heavy display fonts (FOUT/perf trap) — the clamp+Inter path sidesteps it.
- **Safety guardrail:** Numeral always accompanied by text label + badge; reduced-motion → final value, no count-up.
- **Verdict — SURVIVES (M→L):** Harmless, low-cost typographic polish; no WebGL traps apply. **Constrain to weight 700** — Inter is loaded at 400/500/600/700 only, so weight 800 either faux-synthesizes bold or adds a font request, breaking the "zero-cost" claim. **Do not wire up the inert `.count-up` placeholder.** Verify "10/10" doesn't clip at 320px. It is decoration over an already-solved focal point (`HikingScoreGauge` + `GoNoGoSummary`), so Low impact and no new safety information — but genuinely harmless and cheap.

#### ❌ Fix dead Mapbox CSS and theme Leaflet (E3)
- **Target:** `index.css`
- **Mechanism:** Delete dead `.mapboxgl-*` overrides; add real Leaflet glass popup / control / attribution selectors + a tile-pane filter.
- **Outcome (claimed):** Map stops breaking the dark language.
- **Impact/Effort (claimed):** M / S
- **Verdict — DROPPED (revised L):** Wrong file — **the Leaflet theming it proposes to "add" already exists, fully implemented, in `LocationMap.tsx:404-490`** (popup gradient, dark zoom controls with emerald hover, attribution blur). The app already uses a dark CARTO basemap **and** a tile filter; stacking the proposed `brightness(.7) contrast(1.1)` on the OpenTopoMap route-finding layer degrades contour/precip legibility (the exact A4-spirit/safety trap it claims to avoid). Only the trivial "delete dead `.mapboxgl-*` rules" half is valid.

#### ❌ Weather-reactive atmospheric layer from cloud-inversion data (B11)
- **Target:** `index.css`
- **Mechanism:** Promote the unused 3% `.noise-overlay` into a fixed haze + vignette gated on `data-atmos="inversion|mist|clear"`.
- **Outcome (claimed):** Subtle mist atmosphere responding to scraper inversion data.
- **Impact/Effort (claimed):** M / M
- **Verdict — DROPPED (revised L):** The referenced `--arc-haze` token **doesn't exist** anywhere in `src` (resolves to invalid/transparent → does nothing). `.noise-overlay` is genuinely orphaned, so this is net-new wiring, not a "promotion". patternId B11 is a Three.js `onBeforeCompile` shader-fog pattern keyed to `vViewPosition` — a GLSL invariant absent from a CSS app. Inversion data is per-location/per-period, so it can't honestly drive a single root attribute; a screen-wide mist on a safety surface risks miscommunicating conditions.

#### ❌ Commit to dark-only cinematic (retire vestigial light mode) (C6)
- **Target:** `index.css`, `tailwind.config.js`, `index.html`
- **Mechanism:** Make dark the single source of truth or remove the broken light-mode toggle entry point.
- **Outcome (claimed):** A cohesive single design language.
- **Impact/Effort (claimed):** M / M
- **Verdict — DROPPED (revised L):** A **live** Light/Dark/System toggle is reachable (`SettingsPage` → Zustand `useAppStore` → `Layout` `classList.toggle`), and its owning files are **excluded** from the proposal's `targetFiles`. As scoped it leaves the "Light" control as a dead no-op — the exact "no-op-control-breaks-trust" trap its own riskNotes name. The cited day-arc scaffolding doesn't exist (`:root` is an unused light palette read by zero components).

### 3.5 Navigation

#### ❌ View-Transitions route crossfade on `<Outlet/>` (C6)
- **Target:** `MobileNavigation.tsx`, `Layout.tsx`
- **Mechanism:** Wrap `navigate()` in `document.startViewTransition(() => flushSync(() => navigate(path)))` with a capability + reduced-motion guard; `::view-transition-*` 220ms crossfade.
- **Outcome (claimed):** Continuous tab/page changes on Chromium/Safari; instant fallback elsewhere.
- **Impact/Effort (claimed):** H / S
- **Verdict — DROPPED (revised L):** Broken in this stack. Every destination is gated by react-query `isLoading` + `React.lazy`/Suspense, so `startViewTransition` captures the **loading skeleton**, not content — the crossfade animates old-page → skeleton, then content hard-cuts in. `flushSync` forces an unbounded synchronous commit of a data-heavy route (the real jank), contradicting the ≤250ms guardrail. C6 is mis-cited: the capable-browser path degrades *below* the current instant swap. Net a11y regression (two perceived state changes, delayed live-region update).

#### ❌ Shared-element "magic ink" active indicator via FLIP (D1)
- **Target:** `MobileNavigation.tsx`
- **Mechanism:** One moving `<span>` indicator per nav region, measured from `getBoundingClientRect` in `useLayoutEffect`, transitioning transform/width.
- **Outcome (claimed):** A single morphing pointer slides between tabs.
- **Impact/Effort (claimed):** M / M
- **Verdict — DROPPED (revised L):** Rests on a **fabricated** mechanism — it claims the indicator "follows the View-Transition crossfade", but grep shows **zero** `startViewTransition`/view-transition usage anywhere; routing is plain synchronous react-router. "No framer-motion" is a strawman (never a dependency). The conditionally-mounted mobile menu has null refs (FLIP on null = throw). The reduced-motion guardrail fights the existing `!important` global rule. The cited `expo.out` ease token doesn't exist. Pure decorative nav polish; zero safety value.

#### ❌ Cinematic drawer enter/exit with focus trap, scroll-lock, Escape, return-focus (C6)
- **Target:** `MobileNavigation.tsx`
- **Mechanism:** `isClosing` state runs an exit slide then unmounts on `transitionend` (with timeout fallback); plus focus trap, body scroll-lock, Escape, return-focus.
- **Outcome (claimed):** Symmetric slide choreography + real a11y upgrade.
- **Impact/Effort (claimed):** H / M
- **Verdict — DROPPED (revised L) — but salvage the a11y half:** The exit is gated on `transitionend`, but `slide-in-right` is a **CSS keyframe animation** (`animationend`, not `transitionend`), so the cited mechanism never fires and the unmount falls entirely through the timeout — which can **leak a `z-50 inset-0` overlay over safety data** if cleared. **The genuine a11y wins (focus close button on open, Tab trap, Escape, return focus to the hamburger, body scroll-lock) are real and currently absent — extract and ship those separately, without the broken motion mechanism.**

#### ❌ First-class reduced-motion / offline / low-power motion gate in JS (C6)
- **Target:** `MobileNavigation.tsx`, `Layout.tsx`
- **Mechanism:** A `useReducedMotion()`-style hook also true on `saveData`, offline, or battery ≤20%, gating every decorative nav animation.
- **Outcome (claimed):** One off-switch for all nav motion, honoring low-power field users.
- **Impact/Effort (claimed):** H / S
- **Verdict — DROPPED (revised L):** The only defensible 20% (reduced-motion) is **better done in pure CSS** per C6 with zero JS. The novel 80% is broken: `getBattery()` is undefined on **iOS Safari and Firefox** — every iPhone hiker, the stated core user — so the battery gate is inert on the exact device it serves; `navigator.connection` is Chromium-only. It also **inverts safety**: tying motion-off to `isOnline === false` removes the active-tab orientation cue precisely when a stressed offline hiker needs it. C6 keys modes on viewport/WebGL/reduced-motion only; offline + battery are invented inputs. It gates a FLIP/crossfade that don't exist.

#### ❌ `location.pathname` as single source of truth + CSS press-state (C1)
- **Target:** `MobileNavigation.tsx`
- **Mechanism:** Delete `activeIndex` state, derive active item from `pathname` per render; replace the `setTimeout(150ms)` tap hack with `active:scale-95`.
- **Outcome (claimed):** No mid-transition flicker; instant, timer-free tap feedback.
- **Impact/Effort (claimed):** M / S
- **Verdict — DROPPED (revised L):** Sound code-hygiene direction, ships unsafe. It **never addresses the four swipe/render sites** that read `activeIndex` — once it resolves to `-1`/undefined on `/location/:id`, `Math.min(-1+1,3)=0` makes a left-swipe jump to Home (a real touch-gesture regression). Replacing the deterministic 150ms tap feedback with CSS `:active` loses reliable feedback on iOS Safari (the riskNote flags this untested) — a usability regression for a glove-wearing hiker. Misappropriates C1/C6/D3 (WebGL scroll-sync laws). Zero go/no-go value.

#### ❌ Scoped hide-on-scroll bottom bar with Leaflet/3D exclusion (C3)
- **Target:** `MobileNavigation.tsx`, `Layout.tsx`
- **Mechanism:** Passive scroll listener on `<main>` toggling `translateY(110%)` on the bottom bar on downward scroll; suppress on `/location/:id` and inside `.leaflet-container`.
- **Outcome (claimed):** Reading room on long lists without fighting Leaflet/3D.
- **Impact/Effort (claimed):** M / M
- **Verdict — DROPPED (revised L):** **Non-functional as written** — the listener is on a non-scrolling `<main>` (the window/document actually scrolls), so it never fires; the mandatory Leaflet guard targets `/location/:id` but the real route is `location/:locationId` (literal mismatch → guard disabled); it guards a "3D terrain view" that is a 56-line placeholder `div`; and it leans on a "C6 calm flag" that does not exist. All to hide the safety nav — an accessibility-and-safety regression, not a neutral one.

### 3.6 Overall App / Journey

#### ❌ Scroll-driven reveal observer replacing fixed-delay entrances (C4)
- **Target:** `index.css`, `LocationPage.tsx`, `HomePage.tsx`
- **Mechanism:** A ~30-line `useReveal()` IO hook adding `is-revealed`; `.reveal { opacity:0; transform:translateY(16px) }` base.
- **Verdict — DROPPED (revised L):** **The guardrail's central premise is false.** index.css:171-180 only sets `animation-duration`/`transition-duration` to 0.01ms — it does **not** force `opacity:1`. The current `.fade-in-up` is reduced-motion-safe only because it is `animation ... forwards` (snaps to the opacity:1 end-state). The proposed `.reveal { opacity:0 }` is a **static** rule the existing guard cannot touch, so reduced-motion **and** no-JS users would get blank Weather-Alerts / GoNoGo / freezing-level sections. This inverts a fail-safe pattern into a fail-dangerous one — a new way to hide safety warnings.

#### ❌ Stage the GoNoGo verdict as a payoff beat with settle + ambient verdict tint (C5)
- **Target:** `GoNoGoSummary.tsx`, `index.css`, `LocationPage.tsx`
- **Mechanism:** Promote today's card to a hero tile; one-shot `settle` (scale 0.97→1 + ring glow); low-alpha radial verdict-hued wash behind the section.
- **Verdict — DROPPED (revised L):** Decoration restating a verdict already legible at frame 0, **plus a real safety hazard**: a red/amber/emerald ambient wash directly adjacent to severity-coded `AlertCard`s (rendered immediately above at `LocationPage.tsx:191-206`) competes with severity reads — a false "everything is red/calm" cue can miscolour a genuine alert. The reduced-motion guardrail is structurally wrong: the global rule collapses the *fade* but a static steady-state tint element persists at full strength. Smuggles in an unscoped 3-up grid restructure under "a settle animation".

#### ❌ Count-up settle on the hiking score / verdict numbers (C2)
- **Target:** `SafeWindowBar.tsx`, `GoNoGoSummary.tsx`, `index.css`
- **Mechanism:** A `useCountUp` rAF hook animating 0→resolved score.
- **Verdict — DROPPED (revised L):** Factually wrong about the named files — `SafeWindowBar` uses neither `safety-bar-fill` nor `score-gauge-fill` (it is equal-width flex segments, no bar curve to pair with), and **`GoNoGoSummary` renders zero numeric scores** (categorical badge + text only), so there is no number to count up. Uniquely on a safety number, the **transient mid-sweep value (0.0→7.2) is a wrong reading shown to sighted users**, and the visible span *is* the accessible text (splitting it is the text-desync trap). Per-frame React churn (~36 re-renders × N concurrent loops) on mobile for negative value.

#### ❌ Severity-driven ambient atmosphere on the hero/header (C5)
- **Target:** `index.css`, `LocationPage.tsx`, `HomePage.tsx`
- **Mechanism:** 3-4 named header gradient profiles + an ultra-light CSS drizzle keyed to today's dominant condition.
- **Verdict — DROPPED (revised L):** Storm desaturation as a header overlay is exactly the A4 no-filters-on-content class, and would sit over header text/SVG. The reduced-motion claim is half-false — index.css:171 zeroes animation but does **not** `display:none` a static drizzle texture, so it persists and can reduce contrast on white header text (location name, elevation, controls). Defaulted OFF on small viewports = off for the primary mobile audience. On HomePage there is **no single "dominant condition"** to key to (it aggregates 12+ locations), so it cannot deliver a trustworthy glance.

#### ❌ View Transitions API route morph carrying the tapped card into the LocationPage header (A3)
- **Target:** `Layout.tsx`, `index.css`, `LocationPage.tsx`
- **Mechanism:** `view-transition-name: hill-<id>` on source card name + LocationPage `h1`; browser auto-morphs.
- **Verdict — DROPPED (revised L):** Category error — PATTERNS A governs WebGL photo-fidelity (dual-pass composer, dual-camera), not DOM route morphs. **Broken as specified:** the main entry points are react-router `<Link>` components (no wrappable `navigate()` handler), and react-router-dom 6.20.1 predates built-in View Transition support — proper support needs an upgrade or replacing `<Link>` across 5 files (M-to-H, not L). On HomePage a favorite that is also best-conditions renders its name 3-4× concurrently → **duplicate `view-transition-name` aborts the whole transition** on the most-trafficked screen.

#### ❌ Crossfade skeleton→content swap (E2)
- **Target:** `index.css`, `LocationPage.tsx`, `SearchPage.tsx`
- **Mechanism:** A `.data-fade-in` 250ms opacity utility on real content containers.
- **Verdict — DROPPED (revised L):** **Solves a non-problem** — all three surfaces *already* fade skeleton→content (`fade-in`, `fade-in-up/down`, baked into `WeatherCard` line 78). The "jarring instant pop" does not exist. Worse, it **violates the very E2 "one motion language" law it invokes** by adding a fourth opacity mechanism (250ms transition + new ease) on top of three existing keyframes that already disagree on duration/curve. A CSS class fires on mount, not on a react-query state change, so the stated "key to loading→success only" fix is mis-specified. Latent safety-data flash risk on background refetch.

#### ❌ Confident HomePage hero answer with attention hierarchy (C4)
- **Target:** `HomePage.tsx`, `index.css`
- **Mechanism:** Promote `BestConditionsToday` into a hero answer card revealing first, supporting sections on a C4 staircase via "the scroll-reveal hook from the first opportunity".
- **Verdict — DROPPED (revised L):** The cited reuse is **fictional** — no IntersectionObserver reveal hook exists in `src/hooks` (only `useGeolocation`, `useSwipeGesture`), and C4's real mechanism (GSAP ScrollTrigger + Lenis + scrubbed per-word fades) is absent from `package.json`. The cinematic staircase contradicts its own "fast triage scan" riskNote, and promoting a single scraped `hiking_score` to dominate the first viewport works **against** the safety-first go/no-go read. The only sound kernel (plain Tailwind size hierarchy on the already-rank-badged `BestConditionsToday`) is a different, lower-impact change.

---

## 4. Traps & Non-Negotiables (any future build MUST keep these)

### Image-fidelity laws (PATTERNS A) — apply to every `<img>` and any photographic surface
- **A4 — never apply CSS filters/overlays/tints to content images.** Mountain photos in `MountainPhotoGallery.tsx` carry owner attribution and licensing intent; brightness/saturation/tint corrupts that fidelity. The existing caption scrim must stay a **sibling div**, never a filter on the `<img>`. (The one photo-gallery proposal that survived adversarial review *honored* A4 rather than breaking it.)
- **A1/A3 (separate-pass isolation, dual-camera, never-rotate-content)** are WebGL photo-flight laws. This app has **no Three.js / composer / WebGL**, so they do not literally apply — but their *spirit* transfers: do not layer effects over content that carries meaning (the safety pins, the attribution, the score color).

### Failure modes (PATTERNS F) that recur in this codebase
1. **Reduced-motion is enforced for CSS *duration only* (index.css:171-180), NOT for:** (a) JS `requestAnimationFrame` loops, (b) static `opacity:0` base states, (c) `transition-delay`, (d) static `box-shadow`/tint elements. Any JS animation, any `opacity:0` default on safety content, and any delay-based stagger needs a **separate JS `matchMedia` short-circuit** — and that hook must subscribe to `change` for mid-session OS toggles.
2. **Never gate safety content behind an observer or animation end-state.** IntersectionObserver / `transitionend` / View-Transition snapshots can fail to fire (already-in-view at mount, lazy/Suspense late-mount, fast scroll, dropped events) and leave Weather-Alerts / GoNoGo / freezing-level warnings invisible. Base state of all safety blocks must be unconditionally visible.
3. **Leaflet owns its DOM.** Leaflet 1.9.4 sets `translate3d` inline on `.leaflet-marker-icon` and re-applies it on pan/zoom/fitBounds; CSS transforms on it collide. `TileLayer` is declarative (frame-stepping = re-fetch). `interactive={false}` here does NOT add `pointer-events:none`. One Leaflet map = one DOM node.
4. **The deployed data is mocked.** `simple_api.py` returns `freezing_level_m: None`, hardcoded/random `cloud_base_m`, and mock-random `visibility_m`. No cinematic feature may render these as precise values — and `|| 0` on visibility laundres a real whiteout (0) into "no data".
5. **No measurement harness exists for the frontend.** D2 "measure, don't estimate" is unmet — several refuted proposals asserted perf/coverage/initial-load claims that inspection of the import graph or render body contradicted. Verify against the actual code, not the brief.
6. **`view-transition-name` must be unique per visible element.** HomePage renders the same hill name 3-4× (Best widgets + favorites + map marker) → duplicate names abort the transition.

---

## 5. What NOT to Do (cinematic ideas that conflict with the safety / a11y / offline mission)

- **Do not build WebGL/Three.js terrain, wind particle fields, or precipitation particle systems.** The data to drive them is absent or fabricated (no wind on `Location`, mocked freezing-level/visibility), and they add fill-bound rAF battery cost to a mobile safety surface for zero go/no-go information.
- **Do not animate route changes by remounting (`key={pathname}`) or by `flushSync(navigate)` inside `startViewTransition`.** Both destroy/re-flash the lazy `LocationMap`/`CustomizableDashboard`, re-fetch OSM tiles, and crossfade into loading skeletons — a net regression, worst offline.
- **Do not lay decorative motion or color tint over the safety signal.** No marker auras (mud the 4-color read), no verdict-hued ambient wash adjacent to severity-coded AlertCards, no storm desaturation under white header text, no count-up that shows a wrong transient score.
- **Do not hide the navigation or safety header on scroll.** Hiding the path to other locations' conditions, or sliding a sticky verdict under the z-50 mobile header, is a safety regression on the device a hiker uses in the field.
- **Do not gate decorative motion on offline/battery.** `getBattery()` is inert on iOS/Firefox (every iPhone hiker), and removing the active-tab cue when offline inverts safety.
- **Do not "encode daylight/conditions" via a background gradient.** `linear-gradient()` is not transition-animatable, `App.tsx` has no forecast data, and the cue would be wall-clock not hike-time — false precision dressed as a hiker signal.
- **Do not re-cite PATTERNS A/B/C/D draw-call / fill / scroll-to-t laws as governing this app.** It is a DOM/raster/Recharts surface with no WebGL composer; using those budgets as justification is a category error, and several refuted proposals leaned on exactly that.

**What to do instead:** the survivors — fix the keyboard focus trap (lightbox), add redundant shape encoding to the verdict, stop Recharts JS draw-in under reduced-motion, distinguish whiteout-from-no-data, reserve banner height, fix the light-mode dark-tooltip, and give the score one display-type moment. Accessibility correctness and honest safety encoding, not spectacle.
