# LocationMap — A Reimagining

**Status:** Feasibility-verified design document. No application code is changed by this document.
**Scope:** The LOOK and INTEGRATION of `frontend/src/components/LocationMap.tsx` across its three embeds (HomePage, LocationPage, SearchPage).
**Stack lock:** react-leaflet 4.x + leaflet 1.9.4. Markers stay `DivIcon`-based. Any "atmosphere" stays a pointer-events-none DOM sibling. No WebGL, no Three.js, no new map stack.

---

## 1. What this is

This is a single, decisive reimagining of the Scottish-mountain map component, synthesised from four independently-reviewed concepts (`editorial-cartography`, `map-as-navigator`, `conditions-at-a-glance`, `atmospheric-honest`) and the family of transferable patterns from the cinematic-web-kit. Every mechanism named here has been checked against the actual code in `LocationMap.tsx`, the three call sites, the `Location`/`WeatherForecast` types, and the mock backend.

The governing constraint is that this is a **mountain-safety app**. The map's job is to never lie about conditions. That means two hard rules sit above all aesthetics:

1. **No fabricated per-location safety reading.** `Location.current_score` is never populated anywhere in the backend (`grep` confirms zero writes in `backend/`, and `MOCK_LOCATIONS` carries no such field). So `getMarkerColor(location.current_score)` hits its `if (!score)` default branch for **every pin on every list map today**. Any look that paints those default pins in a "good" safety colour while showing a score legend is making a score claim the data cannot back. We fix this, not paper over it.
2. **No safety signal on hue alone.** The danger class must survive greyscale and the global tile tint via shape and glyph, not colour.

Nothing in this document animates a fabricated number, adds a heavy dependency, or fights Leaflet's owned transforms.

---

## 2. Chosen direction

**Primary: `conditions-at-a-glance`** — a verdict-driven marker system that fixes a live fabricated-safety bug and adds a non-hue-alone safety channel — **grafted with**:

- the **palette + glass-HUD + motion-token** chrome discipline from `atmospheric-honest` and `editorial-cartography` (PATTERNS **E1**, **E3**, **E2**);
- the **guided-move / handoff** navigation spine from `map-as-navigator` (PATTERNS **C3**), gated behind a real reduced-motion guard;
- the **honest day-phase caption** residue from `atmospheric-honest` (PATTERNS **C5**), confined to where real time-of-day data exists.

### Why this graft, against the verdicts

| Concept | Verdict highlights | Disposition |
|---|---|---|
| `conditions-at-a-glance` | survives; dataHonest ✓, safetyOk ✓, a11yOk ✓. Core is a **correctness fix mislabelled as a reimagining** — kills the `if(!score)` fake-green bug and the mismatched `>=7/>=5/>=3` buckets, routed through ONE shared verdict module. | **Chosen as the spine.** Highest safety value, lowest fabrication risk. |
| `editorial-cartography` | survives **only with** mandatory edits: fails dataHonest + safetyOk as written (compresses 4 safety classes onto one hue ramp; keeps a score legend over fake-default pins; desaturates danger red). | **Chrome-only graft.** Take its palette/glass discipline (E1/E3) for HUD/popups/controls; **reject** the editorial recolour of the safety-axis marker fills and the always-on score legend. |
| `map-as-navigator` | survives with one required fix: a11yOk ✗ because the reduced-motion gate is a one-shot `matchMedia` read, and the SearchPage list-row is a navigating `<Link>` that unmounts the map. | **Navigation graft, phased last.** Take guided `flyTo` on the surviving persistent-map surfaces only, behind a real re-evaluating reduced-motion hook. |
| `atmospheric-honest` | survives; all five booleans true **contingent on** an edge-vignette pin-safety check and a mandatory `@supports` fallback. Solar geometry is the only honestly-derivable signal from a `Location` (lat/lng non-optional). | **Caption graft + palette.** Take the honest day-phase caption and the palette unification; the full day-arc tint is optional, default-off, LocationPage-only. |

The synthesis is: **`conditions-at-a-glance` decides what the markers MEAN, `atmospheric-honest`/`editorial-cartography` decide how the CHROME LOOKS, and `map-as-navigator` decides how you MOVE between locations** — with the safety-critical marker layer kept off every cosmetic lever.

---

## 3. The new LOOK

All hardcoded hexes currently scattered across `LocationMap.tsx` (lines 34–40 marker colours, 60–78 SVG fill, 324–344 legend, 348 badge, 404–492 popup/control styles, 457–460 tile filter) move to a **single source of truth**: CSS custom properties on `:root` in `frontend/src/index.css` **plus** a mirrored JS palette/verdict module so both the React chrome and the `DivIcon` inner-HTML string read the same tokens.

### 3.1 Palette (PATTERNS E1 — `frontend/src/index.css`, `frontend/src/lib/mapPalette.ts`)

Define the blue-hour → golden-hour palette once, with literal-hex fallbacks so a missing var degrades to today's look, never to unstyled:

```css
:root {
  --map-ink:      #1e293b; /* slate chrome base */
  --map-ink-2:    #0f172a;
  --map-hairline: #334155;
  --map-mute:     #64748b; /* NO-DATA neutral — explicitly NOT a safety colour */
  /* Safety axis — kept high-separation, traffic-light, NOT recoloured editorially */
  --map-go:       #22c55e; /* GO        (score >= 7) */
  --map-caution:  #f59e0b; /* CAUTION   (4 <= score < 7) */
  --map-nogo:     #ef4444; /* NO-GO     (score < 4) */
  --map-unknown:  #64748b; /* UNKNOWN   (score null/undefined) — hollow, never green */
}
```

`mapPalette.ts` exports the same values as a JS object **and** the canonical `getVerdict(score)` function. **Mechanism:** the `DivIcon` HTML string in `createMarkerIcon` (line 49) reads from the JS object; CSS chrome reads from `:root` vars. The danger token is **never desaturated** and **never compressed toward the caution/go tones** — that was `editorial-cartography`'s load-bearing safety failure.

**Critical ordering (from `map-as-navigator` risk #1):** vars live on `:root` in `index.css`, **not** in the component's scoped inline `<style>`, so they exist before any lazy/Suspense-mounted map renders.

### 3.2 Marker / DivIcon — verdict shape + glyph, elevation size (PATTERNS E1 — `LocationMap.tsx`, `mapPalette.ts`)

This is the spine. Replace `getMarkerColor` (lines 34–40) entirely with a verdict routed through the shared module. The encoding gains a **second, non-hue channel**:

| Verdict | Score | Colour token | Shape | Glyph (greyscale-safe) |
|---|---|---|---|---|
| GO | `>= 7` | `--map-go` | teardrop (current) | check ✓ |
| CAUTION | `4–6.99` | `--map-caution` | teardrop | `!` |
| NO-GO | `< 4` | `--map-nogo` | teardrop | `✕` |
| UNKNOWN | `null`/`undefined` | `--map-unknown` | **hollow** teardrop (stroke, no fill) | — |

- **The glyph, not the outline, carries the greyscale/colour-blind signal** (`conditions-at-a-glance` refutation 3). A near-octagon vs a diamond collapses to ~3px of corner difference at the 24px tier; a `✓`/`!`/`✕` glyph survives small sizes. **Do not** add a GO/CAUTION/NO-GO micro-text label at the marker tier — it is unreadable below ~9px. Keep that text in the legend only.
- **UNKNOWN is hollow** (stroke-only) so that today, with all list scores undefined, the map is visibly honest: a field of neutral hollow pins, never a field of fake green. This is the dataHonest fix.
- **Elevation still drives SIZE only** — `elevation_m >= 1200 → 32px`, `>= 1000 → 28px`, else `24px` (line 44, unchanged). Real field, honest encoding, keep it.
- **The glyph and stroke live inside the DivIcon inner `<div>`** (lines 50–79), never on `.custom-marker` (the Leaflet-owned wrapper). This sidesteps the **E1 trap**: Leaflet 1.9.4 re-applies `translate3d` to `.leaflet-marker-icon` on every pan/zoom, so any keyframe or transform on the wrapper collides. The existing pulse halo (lines 51–58) is already on the inner div — fine.
- **Bug to fix while here:** the existing `.custom-marker:hover { transform: scale(1.15) }` (lines 400–402) IS on the Leaflet-owned wrapper (`.custom-marker` is the `className` at line 48), so it collides with `translate3d` on hover. Migrate the hover scale to a child element inside the inner `<div>`. (`editorial-cartography` refutation 3 corrected the claim that this was already safe.)

### 3.3 Triplication — one verdict table, enforced (PATTERNS E1)

The colour/verdict scale is duplicated in THREE-plus places today and **must move together in one change or it desyncs on a safety key**:
- `getMarkerColor` → `mapPalette.getVerdict`;
- the legend JSX (lines 324–344, hardcoded Tailwind `bg-green/emerald/amber/red`) → rewritten to inline style / arbitrary-value classes reading the tokens;
- the popup pill (lines 294–301, more Tailwind classes) → same;
- **and `GoNoGoSummary.tsx`** (`verdictConfig` lines 37–74, `getVerdict` lines 12–18) must import the same module **in the same PR** (`conditions-at-a-glance` refutation 5). "Ideally shared" is the drift vector — make it mandatory, or two verdict tables that read identically today silently diverge on the next edit.

### 3.4 Glass-HUD legend (PATTERNS E3 — `LocationMap.tsx`)

Build the legend and count-badge as the glass recipe over the busy tile backdrop:

```css
.map-glass-hud {
  background: rgba(15, 23, 42, 0.16);      /* var(--map-ink-2) at low alpha */
  backdrop-filter: blur(12px);              /* NOT 15px — see perf note */
  border: 1px solid rgba(51, 65, 85, 0.6);  /* hairline */
  box-shadow: 0 4px 16px rgba(0,0,0,0.35);
}
@supports not (backdrop-filter: blur(1px)) {
  .map-glass-hud { background: rgba(15, 23, 42, 0.92); } /* MANDATORY opaque fallback */
}
```

- **Mechanism:** absolutely-positioned React overlay sibling of `MapContainer` at the existing `z-[1000]` tier (matching the current legend/badge pattern), `pointer-events` only where interactive.
- **Honesty gate:** the legend renders **only when at least one location in `locations` has a defined score** — repurpose the existing `locations.length > 1` clutter gate into a "has-any-real-score" gate. With scores universally undefined today, **no score legend ships anywhere** on list maps, and it auto-enables correctly if scores later populate. Label it **"area average"** when fed area scores, so a deadly individual summit is never implied to be the area beacon.
- **Perf (`editorial-cartography` D3 gap):** `blur(12px)` not `15px`; **gate blur off entirely on the h-48 (192px) HomePage thumbnail** rendered inside a scrolling list. The `@supports` fallback covers *absence* of backdrop-filter, not *slow* support — so measure, don't assert (see §5).

### 3.5 Honest day-phase caption (PATTERNS C5 — LocationPage only)

The only honestly-derivable atmosphere signal is **solar geometry from lat/lng** (non-optional fields). On **LocationPage only** (single location, real coordinates), the glass legend may carry a caption like `"sunset ~21:47"`. On HomePage's fixed `[57,-5]` it must read generically (`"Highlands · sunset ~21:47"`), never as a named peak's time.

- **The full day-arc gradient TINT is optional, default-OFF behind `?dayarc=1`** (PATTERNS B12), LocationPage-only, lerped **only** from `overall_hiking_score` + the viewed period — **never** from the mock `visibility_m`/`cloud_base_m`/`freezing_level_m` fields (those are `None`/random in the deployed `simple_api.py`). See §6 for why the list-view day-arc is dropped.
- If the tint ships, it is a **horizon-glow vignette concentrated at the edges with a near-transparent centre** (alpha ≤ 0.25, hue-neutral over pin pixels) so the score-coded pins read through it — a sibling-of-MapContainer DIV paints OVER the marker pane, so this is the load-bearing safety constraint. It must auto-reduce when `showRadar` is true.

### 3.6 Motion tokens (PATTERNS E2 — `index.css`)

Tokenise the two eases (`--ease-reveal: cubic-bezier(.22,1,.36,1)`, `--ease-scene: cubic-bezier(.16,1,.3,1)`) and durations (0.6–1.2s) as CSS vars, harmonised with the existing 0.2s marker hover. DOM chrome transitions use the exact beziers; Leaflet camera moves (§4) use `easeLinearity` (scalar approximation) tuned into the 0.6–1.2s band.

### 3.7 Tile / theming — leave the tint, scope the radar

The global `.leaflet-tile-pane { filter: sepia/hue-rotate(120deg)/saturate/brightness }` (lines 457–460) green-tints **every** basemap AND the RainViewer radar (which lives in the same pane). **Decision: leave the tint as-is.** Restating it via a palette var is pure churn that changes no behaviour and still distorts radar precipitation colours (`conditions-at-a-glance` refutation 2). If the tint is ever revisited, the radar `TileLayer` must first move to its own pane — a larger change out of scope here.

---

## 4. Integration model per surface

| Surface | File | Data in | Role | New look | New behaviour |
|---|---|---|---|---|---|
| **HomePage** | `frontend/src/pages/HomePage.tsx` | `locations={allLocations}` (all pins, no scores) | h-48 overview, "Explore full map" → /search | **UNKNOWN hollow pins** (honest); **glass legend suppressed** (no real scores); **blur off** on thumbnail | Pass already-computed `areaAvgScores` (lines 81–97, currently discarded) into `<LocationMap areaScores={...}>` → render GO/CAUTION/NO-GO **area-average** verdict where an average exists, hollow UNKNOWN where not. **Zero new fetches.** |
| **LocationPage** | `frontend/src/pages/LocationPage.tsx` | `locations={[location]}`, `interactive={false}` | static single-pin locator, selected/pulsing | Pass `currentDay.summary.overall_hiking_score` (already read lines 307/314) as the **true single-beacon verdict** — real data, honest glyph + colour. Glass caption may show day-phase. | Optional `?dayarc=1` edge-vignette tint, reduced-motion-guarded. `interactive=false` keeps drag/zoom/radar off. |
| **SearchPage** | `frontend/src/pages/SearchPage.tsx` | `locations={filteredLocations}` (no scores) | h-64 interactive map of filtered results | UNKNOWN hollow pins; glass legend suppressed; glass HUD chrome on controls | **The persistent-map surface for guided moves.** Filter changes re-frame via `flyToBounds` (guided, distance-scaled). See handoff note. |

### Cross-page navigation / handoff (PATTERNS C3)

- **Marker-click → navigate is unchanged.** On HomePage and SearchPage, `onLocationSelect` calls `navigate(...)`, which **unmounts the map** — so wiring `flyTo` to marker clicks is pointless (the C3 prior-review trap). Do not do it.
- **The only persistent-map guided-move surface is SearchPage filter re-framing.** When `filteredLocations` changes, replace the instantaneous `fitBounds` with `map.flyToBounds(bounds, { duration, easeLinearity })`, duration scaled by `map.distance(...)` and clamped to 0.6–1.2s, rate-limited via a `moveend` latch (NOT the private `map._panAnim` field).
- **List-row → flyTo is BLOCKED by a `<Link>`.** SearchPage's `LocationCard` is a navigating `<Link>` (line 371) that unmounts on click, so "list-select drives the camera then optionally hands off" cannot work without restructuring the row into a non-navigating select-region + an explicit "View details" control. **This is deferred** (`map-as-navigator` required-fix B) and is not in the shippable first slice.
- **All three call sites keep the default export and their own Suspense fallback.** New props (`areaScores?`, `handoffMode?`, `enableGuidedMoves?`) default to preserve current behaviour.

---

## 5. Phased build plan

Ordered so the highest-value safety fix ships first and the riskiest motion work ships last, behind a flag.

### Phase 1 — Verdict spine + honest markers (the fix)
- **Files:** `frontend/src/lib/mapPalette.ts` (new), `LocationMap.tsx`, `frontend/src/components/GoNoGoSummary.tsx`, `frontend/src/index.css`.
- **Mechanism (PATTERNS E1):** create `mapPalette.ts` with palette object + canonical `getVerdict`; replace `getMarkerColor` (lines 34–40) — delete the `if(!score)` fake-green bug and the mismatched buckets; add shape-glyph + hollow-UNKNOWN to the `DivIcon` inner HTML; migrate legend (324–344) and popup pill (294–301) and `GoNoGoSummary.verdictConfig` to the same module **in this PR**.
- **Impact:** high (kills a live fabricated-safety bug; adds non-hue-alone channel). **Effort:** medium.
- **Risk:** triplication desync if any consumer is missed — mitigated by doing all in one PR. The glyph must be inside the inner div (E1 trap).
- **Reduced-motion / offline / mobile:** no new motion. Hollow pins render identically offline. Glyph legible at 24px on mobile (verify in §7).

### Phase 2 — Palette + glass chrome + motion tokens (the look)
- **Files:** `index.css`, `LocationMap.tsx` (inline `<style>` → consume vars).
- **Mechanism (PATTERNS E1/E3/E2):** lift remaining hexes to `:root` vars with literal-hex fallbacks; formalise `.map-glass-hud` **with the mandatory `@supports` opaque fallback**; tokenise eases/durations; fix the `.custom-marker:hover` translate3d collision by moving scale to a child.
- **Impact:** medium (cohesive look, single source of truth). **Effort:** low–medium.
- **Risk:** the inline `<style>` re-injects globally per map instance — accept that all maps on a page share one palette (acceptable), or lift the block to `index.css` once. `blur(12px)` not 15px; gate blur off on the 192px thumbnail.
- **Reduced-motion / offline / mobile:** chrome transitions are CSS — covered by the existing `index.css` reduced-motion block. `@supports` fallback keeps the HUD readable without backdrop-filter. **Measure fps** on a low-end device before default-on.

### Phase 3 — Area scores + single-beacon verdict (wire real data)
- **Files:** `HomePage.tsx` (pass `areaAvgScores` → `areaScores` prop), `LocationPage.tsx` (pass `overall_hiking_score`), `LocationMap.tsx` (consume `areaScores`, label legend "area average").
- **Mechanism:** props only, **zero new fetches** — `areaAvgScores` already computed and discarded; `overall_hiking_score` already read.
- **Impact:** medium-high (the map finally shows *real* verdicts where they exist). **Effort:** low.
- **Risk:** must label "area average" so an individual summit is never implied; UNKNOWN-hollow where no average exists (no fake green).
- **Reduced-motion / offline / mobile:** static; no concerns.

### Phase 4 — Guided moves on SearchPage (motion spine, flagged)
- **Files:** `LocationMap.tsx` (new `flyToBounds` controller as a **sibling `useEffect`**; do NOT regress the already-correct `MapBounds` useEffect at lines 91–96), `frontend/src/hooks/usePrefersReducedMotion.ts` (reuse — its docstring already states the JS-gate axiom).
- **Mechanism (PATTERNS C3):** on `filteredLocations` change, `flyToBounds` with distance-scaled duration, `moveend`-latch rate-limit.
- **Impact:** medium (polish, not safety). **Effort:** medium.
- **Risk:** a11y — the reduced-motion gate **must be the re-evaluating `usePrefersReducedMotion` hook** (matchMedia + `addEventListener('change')`), mounted ABOVE the flyTo sibling so no un-guarded move fires through Suspense. When reduced-motion is true: `setView` (instant), and pass `zoomAnimation/fadeAnimation/markerZoomAnimation={false}` to `MapContainer`.
- **Reduced-motion / offline / mobile:** instant `setView` under reduced-motion; flyTo is Leaflet-native (no rAF). **Measure** a Chrome perf trace on the h-64 map before claiming budget.

### Phase 5 (optional) — Day-phase caption + edge-vignette tint
- **Files:** `LocationMap.tsx`, `mapPalette.ts` (solar math).
- **Mechanism (PATTERNS C5, B12):** honest day-phase caption (LocationPage real coords; HomePage generic label). Optional tint behind `?dayarc=1`, edge-vignette only, alpha ≤ 0.25, auto-reduce on `showRadar`, lerped only from `overall_hiking_score`.
- **Impact:** low (atmosphere). **Effort:** medium.
- **Risk:** sibling DIV paints over markers — edge-vignette + low alpha + screenshot pin-discriminability check are hard gates. Solar math must be unit-tested for BST/GMT/DST and the midsummer "never fully dark" case.
- **Reduced-motion / offline / mobile:** reuse `usePrefersReducedMotion` (static light, no cross-fade); `setInterval` 60s not rAF; pause on `document.hidden`; tint is cosmetic-only so offline content never depends on it.

---

## 6. What NOT to do (restated traps)

| Don't | Why (verified) |
|---|---|
| **Wind/precip particle canvas layer (B8/B1)** | `Location[]` has NO wind/precip fields (`types/weather.ts:1-12`); wind lives on a separate type the map never receives, `wind_direction` is a 16-point string. IDW over a handful of summit pins is degenerate — fabricated precision over safety pins. |
| **Recolour the score legend's default to a "good" token** | `current_score` is never populated, so the default branch is universal. A "horizon = good" pin next to a "horizon = good" legend IS a score claim regardless of authorial intent — the inversion of the safety-data-fabrication trap. Use hollow UNKNOWN instead. |
| **Compress 4 safety classes onto one hue ramp / desaturate danger red** | Hue-alone encoding for a safety signal; the current traffic-light hexes are far more separable. Keep the glyph as the non-hue channel; never desaturate `--map-nogo`. |
| **Day-arc tint on HomePage/SearchPage** | List maps have no selected forecast time and no timestamp on `Location[]` — the day-arc would be static or fed a fabricated "now". Restrict to LocationPage, default-off, or drop. |
| **`flyTo` on marker click** | Marker click → `onLocationSelect` → `navigate` unmounts the map. The animation never fires. |
| **RainViewer frame-stepping / crossfade (C5)** | react-leaflet 4 `TileLayer` is declarative — stepping frames means remount (full re-fetch) or reaching into `setUrl()` (not ergonomic in v4). And the component only models `radar.past` (where rain WAS), so motion adds no forecast value. |
| **CSS keyframe / score-aura on `.leaflet-marker-icon` (E1)** | Leaflet 1.9.4 owns and re-applies `translate3d` on every pan/zoom/fitBounds; a keyframe on the wrapper collides and the one-shot entrance re-fires on every zoom. Keep all marker motion inside the inner `<div>`. |
| **3D r3f terrain with safety altitude planes (C6)** | Deployed `simple_api.py` returns `freezing_level_m=None`, `cloud_base_m` hardcoded/random, `visibility_m` mock-random. Planes at fictitious altitudes add false authority to absent data, plus the only heavy-dep item (three, r3f). |
| **One-shot `matchMedia` reduced-motion gate** | Won't react to an OS toggle after mount, and a flyTo controller mounted before the branch resolves fires one un-guarded move through Suspense. Use the re-evaluating `usePrefersReducedMotion` hook. |
| **Var-ize the global tile-pane filter as a "fix"** | Pure churn — still one global selector hitting every map AND the radar TileLayer; behaviour unchanged. Leave the tint, or move the radar to its own pane (out of scope). |

**Two surviving sub-fixes from the prior review:** (1) the `MapBounds` `fitBounds` is **already** a `useEffect` (lines 91–96), not a render-phase `useMemo` — verified; do not regress it. (2) `WeatherMaps.tsx` PrecipitationMap's 10 per-render `Math.random()` calls (lines ~273–311) want a single seeded `useMemo` — separate component, out of scope here.

---

## 7. Recommended first slice

**Ship Phase 1 alone: the verdict spine + honest markers.** It is the single highest-leverage step, needs no new dependencies, fabricates no data, and fixes a live safety defect.

**Exactly what to build:**

1. **Create `frontend/src/lib/mapPalette.ts`:**
   ```ts
   export type Verdict = 'GO' | 'CAUTION' | 'NO-GO' | 'UNKNOWN'
   export function getVerdict(score?: number | null): Verdict {
     if (score === null || score === undefined) return 'UNKNOWN'
     if (score >= 7) return 'GO'
     if (score >= 4) return 'CAUTION'
     return 'NO-GO'   // score < 4 — and a true 0 now correctly reaches NO-GO
   }
   export const VERDICT_TOKEN: Record<Verdict, string> = {
     GO: '#22c55e', CAUTION: '#f59e0b', 'NO-GO': '#ef4444', UNKNOWN: '#64748b',
   }
   export const VERDICT_GLYPH: Record<Verdict, string> = {
     GO: '✓', CAUTION: '!', 'NO-GO': '✕', UNKNOWN: '',
   }
   ```
   Note this also fixes the `if (!score)` latent bug: a true score of `0` now reaches `NO-GO` instead of falling through to default.

2. **In `LocationMap.tsx`:** delete `getMarkerColor` (lines 34–40). In `createMarkerIcon`, compute `verdict = getVerdict(score)`; for `UNKNOWN` render a **stroke-only hollow** teardrop (no fill); for the others fill with `VERDICT_TOKEN[verdict]` and place `VERDICT_GLYPH[verdict]` as a small centred `<text>`/`<div>` **inside the inner `<div>`** (NOT on `.custom-marker`). Keep elevation→size (line 44) and the pulse halo unchanged.

3. **Migrate the popup pill (lines 294–301) and legend (lines 324–344)** to read `VERDICT_TOKEN`/`getVerdict` (inline style or arbitrary-value Tailwind), and **gate the legend** to render only when `locations.some(l => l.current_score != null)` — so it does not ship today.

4. **In `GoNoGoSummary.tsx`,** replace the local `getVerdict` (lines 12–18) and `verdictConfig` (lines 37–74) to import from `mapPalette.ts` — same PR, so the two verdict tables can never diverge.

**Verification:** `npm run type-check` + `npm run lint`; load HomePage and confirm all list pins render as **neutral hollow UNKNOWN** (the honest state today), the score legend is absent, and a `?` does NOT imply "good". Confirm the `✓`/`!`/`✕` glyphs are legible at the 24px tier on a mobile width before merge.

This slice changes only marker meaning and three score-table consumers, introduces no motion, no atmosphere, no new tile source, and no fabricated number — and it converts the map from "silently fake-green everywhere" to "honestly unknown until real scores arrive."
