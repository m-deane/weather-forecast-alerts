# POLY-MATCH-ROADMAP — Photo-matched geometry per flight leg

Planning workflow, 2026-06-13 (Agent PHOTO viewed all 9 linked photographs;
Agent GEOMETRY mapped landforms to the live module and measured the baseline) +
adjudication. **No code was changed** — this is the roadmap + implementation
plan. Full detail: `.claude/checkpoints/20260613-poly-match/agent-{PHOTO,GEOMETRY}.md`.

Measured live baseline (CDP, mid-route, `?order=alpha&debug=1`): **60 fps · 47
draw calls · 84,320 tris · 26 textures.** The number to protect is **draw
calls**, not triangles — so every per-leg feature must be **one** InstancedMesh
/ Points / extra terrain term, never per-object meshes.

**Framing (honest):** only faroes and glacier are genuine aerial drone frames;
the rest are eye-level/ground or enclosed. "Matching" therefore means **evoking
landform, palette, horizon and silhouette — a visual rhyme**, not
reconstruction. Palette already agrees with each leg's light profile in all 9
cases (the light assignments were chosen well), so this work is about *form*,
not colour.

## 1. Executive summary — the per-leg opportunity

| Leg · photo | Current polys | Photo-matched target | Headline technique | Diff. | Effort·Impact |
|---|---|---|---|---|---|
| **glacier** p02 | generic ridged hills | U-valley + silver braided river to a glowing snow peak | `glacierU` trough term + river decal (+S5 water) | EASY | M · 4 |
| **faroes** p10 | generic hills + flat sea | knife-edge ochre cliff buttress into navy ocean, sea-stacks | asym cliff term + **S1 sea-stack instances** + S5 water | EASY | M · 5 |
| **neist** p05 | generic hills | tapering green-basalt headland stepping into glassy sea | headland taper term + optional lighthouse instance | EASY | M · 4 |
| **antelope** p14 | smooth `canyon` bump | rippling near-vertical sandstone slot, fluted walls | sharpen `canyon` term (narrow+fluting); dust shipped | HARD* | S · 4 |
| **milkyway** p12 | ridged hills + snow | low **black** saw-tooth ridge under a star dome | darken crest verts + **suppress** snow + boost stars | MED | S · 3 |
| **goldenhour** p09 | near-flat sea + glint | living mirror sea under a vast low sun | force-flat + **S5 water** on the glint (mostly shipped) | HARD* | S · 4 |
| **ridgeline** p03 | tall ridged crests + snow | endless saw-tooth snow skyline, lateral sweep | extend ridge band + whiten crests (+S4 normal) | MED | M · 4 |
| **calton** p01 | low hills + city specks | dark hill shoulder → carpet of lit blocks, cobalt sky | dome term + **S1 city-block instances** + monument | HARD | M · 5 |
| **forth** p16 | flat-ish sea + specks | wide reflective estuary, a dark span crossing | flatten + **S1 cantilever-truss** (the one new model task) | HARD | L · 5 |

*HARD = vantage-hostile (enclosed slot / flat sea): evoke palette + form-feel
only, do not attempt to reproduce the shot.

**Recommended pilot leg: `glacier` (p02).** It is a top-3 photo match, it is
almost entirely terrain math (free) plus one cheap river decal (+1 draw call),
and it has **no dependency on the new instancing system** — so it proves the
whole `landform` data-model end-to-end at low risk before any infra is built.

## 2. Per-photo landform briefs (condensed from PHOTO)

EASY ×3 (landform-led, aerial/near-aerial): **faroes** vertical basalt cliffs
into ocean (the one true aerial fit) · **glacier** U-valley + braided river to
an alpenglow peak · **neist** tapering headland into glassy dusk sea (richest
palette). MEDIUM ×2: **milkyway** low dark ridge under the galactic core
(vantage looks *up* — rhyme by tilting to the star dome) · **ridgeline** snow
range panorama (peer-height lateral sweep, not a dive). HARD ×4 (object-led or
vantage-hostile, evoke-only): **calton** monument + city hill · **forth**
estuary dominated by the red cantilever bridge · **antelope** enclosed slot
canyon (no horizon, no sky) · **goldenhour** open sea + sun disc (no terrain at
all). Full field-by-field briefs in the PHOTO checkpoint. None of the
`/* VERIFY */` location flags change a landform call — all are image-confirmed.

## 3. Technique catalogue + the data-model unlock (from GEOMETRY)

**The core enabler (S2 — data-model).** Today `theme` is five amplitude scalars
`{base,ridge,canyon,sea,city}` shared coarsely, so every leg gets the *same kind*
of terrain at different amplitudes. Add a discrete **`landform` string** to each
`LOCATIONS` entry (`'glacier'|'seastack'|'slot'|'darkRidge'|'openSea'|'snowSummit'|'cityhill'|'estuary'`).
Consume it in two small places: `themeAt(z)` gains a **nearest-slot (non-lerped)
landform pick** (the label snaps at the midpoint while the amplitude scalars keep
lerping — geometry morphs smoothly, behaviour switches cleanly); `terrainH(x,z)`
branches on `th.landform` to add the right extra term. Feature spawners reuse the
existing `fieldFromLegs`/city-specks idiom, gated on `landform===X`.
Backward-compatible: a leg with no `landform` falls through to today's terrain.

**Shared infrastructure (build once, many legs benefit):**
- **S1 — instancing** `instanceField(geo,mat,placements)` → one `InstancedMesh`
  per feature (≤1 draw call). Unlocks sea-stacks, city blocks, bridge truss,
  monument. Highest-leverage new infra. ↔POSSIBILITIES F9.
- **S3 — aerial fog-tint** distance haze term → distant terrain melts to
  `--haze`. ~0 ms, 0 draw calls, lifts depth on *every* leg. ↔RESEARCH-REVIEW A4 (free).
- **S5 — water shader** scrolling-normal specular on the flat-sea plane (the
  `glint` plane already proves the geometry). Reused by glacier river, faroes
  base, open-sea. ↔F4.
- **S4 — procedural normal map** from the fBm heightmap, flag-gated (fights the
  deliberate `flatShading:true` look → high-frequency-only, A/B for taste). Most
  useful on slot + snow-summit micro-relief. ↔F3a / RESEARCH-REVIEW A1.

Per-leg bespoke terms (each small, anchored to `terrainH`/a spawner block) are
catalogued with perf/effort/law in the GEOMETRY checkpoint.

## 4. Roadmap — ranked by impact ÷ effort

**Tier A — terrain-only, near-zero cost, no new infra (do first):**
slot-canyon (S/4), open-sea force-flat (S/4), dark-ridge (S/3), snow-summit
ridge extension (M/4), + **S3 fog-tint (free, lifts all)**. All are math/colour
in the existing vertex loop or a spawner gate.

**Tier B — one shared system unlocks three high-impact legs:** build **S1
instancing** once → faroes sea-stacks (5), calton city blocks (5), + the
glacier river/neist garnish. **S5 water** → glacier river + faroes base +
open-sea shimmer.

**Tier C — genuinely-new modelling, object-led HARD legs:** forth cantilever
bridge (the one new model task — instanced box trusses as a silhouette), calton
monument, S4 normal-map (flag-gated).

Tags: S1↔F9 · S3↔A4 · S4↔F3a · S5↔F4 — all already in POSSIBILITIES/RESEARCH-REVIEW;
the **NEW** contribution of this plan is the `landform` data-model (S2) and the
per-leg bespoke terms that turn those shared tools into photo-matched identity.

## 5. Phased implementation plan

Each phase: edit only `index.html` module; after each, `node --check` the
extracted module, screenshot the affected leg's **dwell** at a fixed `?order=`
seed (A/B vs current), confirm **dwell-altitude regression unchanged** (the
9/9-exact check), and confirm `?debug=1` stays **≤60 draw calls / 60 fps**.
Lite/`?tier=flight-lite` + reduced-motion + no-JS must be re-checked at the end
of each phase. Rollback = the phase is one self-contained block; revert the commit.

- **Phase 0 — data-model + pilot.** Add `landform` to all 9 `LOCATIONS`;
  add the nearest-slot pick to `themeAt`; branch `terrainH` on it (no-op for
  unset legs — prove zero regression first). Then implement the **glacier**
  pilot: `glacierU` parabolic trough term + a braided-river decal ribbon.
  Gate: glacier dwell visibly a U-valley with a river; all other legs
  pixel-unchanged; altitudes 9/9 exact; draw calls +0–1.
- **Phase 1 — Tier A terrain wins.** slot-canyon (sharpen `canyon`), open-sea
  force-flat, dark-ridge (darken crest + suppress snow + boost stars),
  snow-summit ridge-band extension, and **S3 aerial fog-tint** (shared, lifts
  all). All terrain-math; target +0 draw calls.
- **Phase 2 — S1 instancing + S5 water.** Build `instanceField()` once;
  deliver faroes sea-stacks (flagship) + the cliff-edge asym term; add S5 water
  and retro-fit it to the glacier river + open-sea glint. Budget: ≤+3 draw calls.
- **Phase 3 — bespoke / object-led.** forth cantilever-truss generator (+ TIER
  fallback = a flat canvas-silhouette plane), calton city blocks + monument,
  S4 normal-map behind a flag. These are the HARD evoke-only legs — verify they
  read as *gestures*, not failed reconstructions.

## 6. What to leave abstract (and the free lifts)

- **antelope** — enclosed slot, no horizon/sky: match palette + wave-form
  ripple only; do **not** try to build a sky-read on this leg.
- **goldenhour** — no terrain at all: flatten + let sun/water/palette carry it;
  the boat silhouette is optional garnish.
- **forth / calton** — the emotional payload is a bridge / a monument; procedural
  geometry can only gesture at them (a dark span; a column on a hill). Ship them
  as silhouettes against the right sky, or accept palette-only if the gesture
  reads as kitsch.
- **Free lifts that improve every leg regardless of matching:** S3 aerial
  fog-tint (Phase 1), S4 normal map (flag-gated), and — from RESEARCH-REVIEW,
  atmosphere not geometry — curl-noise particle drift. Do these even if the
  bespoke per-leg work stalls; they raise the whole flight's detail floor.

**Net:** the `landform` data-model (Phase 0) is the keystone — it is cheap,
backward-compatible, and turns the existing shared tools (instancing, water,
fog-tint, normal map) into per-leg photographic identity. Pilot on **glacier**,
prove the mechanism, then the three EASY legs (glacier/faroes/neist) deliver the
strongest matches for the least bespoke geometry.
