# Launch Prompt — Photo-Matched Geometry: Roadmap & Implementation Plan

Paste everything below the line into a Claude Code session in this project.
**Planning workflow, not implementation**: it produces one deliverable —
`POLY-MATCH-ROADMAP.md` (a per-leg geometry roadmap + a phased build plan).
No site file is modified; the only writes are that report and agent checkpoints.

---

You are planning, on **autopilot** with parallel agents, how to raise the
**detail, texture, and — above all — the *suitability*** of the procedural
geometry on each flight leg so the polys beneath a photograph *evoke the
landform in that photograph*. Today the terrain is themed only coarsely
(per-leg amplitude masks: base/ridge/canyon/sea/city). The goal of the plan is
per-leg landform fidelity: the glacier photo should fly over something that
reads as a glaciated valley; the Antelope photo over something that reads as a
slot canyon; the Faroes photo over a basalt sea-cliff edge; and so on.

**Honesty constraint baked into the plan:** most of these photographs are *not*
aerial (only ~2 are drone frames). "Matching" therefore means *evoking the
landform, mood, palette and horizon* the photo implies — a visual rhyme — not
photogrammetric reconstruction. The plan must say so and design for evocation.

## Ground truth — load first (do not re-derive or duplicate)
- `assets/js/data.js` + the inline `LOCATIONS` in index.html — **the
  photo↔leg linkage** (which `pNN` image sits on which waypoint, its
  light/theme fields, coords, caption).
- `index.html` `<script type="module">` IN FULL — the geometry to be reshaped:
  `terrainH(x,z)` + `themeAt(z)` + the per-leg `theme` masks, the slope-aware
  vertex colours + tiling detail map, `fieldFromLegs`/`makePoints` particles,
  the gradient sky-dome + per-leg light profiles, FogExp2, the city-specks
  pattern (the one existing "feature" beyond bare terrain).
- `POSSIBILITIES.md` (FRONTIER: instanced furniture F9, normal maps F3a, water
  F4, god-rays, LOD verdict) and `RESEARCH-REVIEW.md` (bloom is moot; the 3 new
  wins: aerial fog-tint, curl-noise, normal map; tri-planar/LOD = skip). The
  roadmap must **reuse and reference these**, tagging each technique NEW vs
  ↔existing-entry — never re-propose what's already surveyed or shipped.
- The photographs themselves in `photos/` (`pNN@1400.jpg`) — the PHOTO agent
  views every linked frame with the Read tool. This is the crux.
- Dev server http://localhost:8123 (`python3 scripts/dev-server.py 8123`);
  CDP harness pattern in `scripts/verify-site.py`; `?order=`, `?debug=1`.

Laws every proposed technique must respect (or be flagged): procedural-only
(2D/canvas texture maps OK, no 3D model files); photographs stay unlit / never
graded·bloomed·fogged·rotated and are never the thing being reshaped; 60fps
desktop; static host; reduced-motion + lite/no-JS paths; mobile stays lite.

## Wave 1 — two parallel agents
(Each: checkpoint FIRST under `.claude/checkpoints/{ts}-poly-match/`, all detail
there, inline ≤150 words.)

### Agent PHOTO — per-photo landform brief (must VIEW every image)
Read every flight-linked photograph (the 8 waypoints + the panorama; check
data.js/LOCATIONS for the exact `pNN`↔leg map). For EACH, produce a structured
**landform brief**:
- dominant landform / geology (e.g. slot canyon, U-glaciated valley, basalt
  sea-stack cliff, tidal estuary + steel bridge, monument-topped city hill,
  braided meltwater river, open sea horizon, dark ridgeline under stars);
- the horizon line & implied vantage (eye-level? aerial? looking up/down?) —
  this tells the flight what altitude/pitch *rhymes* with the shot;
- dominant palette + tonal signature (already partly in the light profiles —
  note agreement/conflict);
- signature silhouette objects a procedural scene could echo (lighthouse,
  bridge truss, monument column, sun disc, glacier tongue, sea stacks);
- one sentence: "the polys on this leg should read as ___".
Be concrete and per-image; flag any `/* VERIFY */` location that changes the
landform call. Output a table keyed by leg.

### Agent GEOMETRY — procedural technique catalogue, mapped to the code
For the landform vocabulary the PHOTO brief will need (canyon walls, U-valley
cross-section, cliff-edge-to-sea, estuary water + bridge, city blocks +
monument, braided river, sea-stacks, low star-ridge), give for EACH a
procedural recipe anchored to the ACTUAL module: which of `terrainH`/`themeAt`/
theme masks / `InstancedMesh` / `fieldFromLegs` / sky-dome / fog it extends or
adds; perf cost (LABEL estimates; you may measure fps via `?debug=1`); law
check; effort S/M/L; impact 1–5; and the **data-model change** required to
drive richer per-leg landforms (e.g. extend each LOCATIONS `theme` with a
`landform` descriptor / feature list). Cross-reference POSSIBILITIES.md +
RESEARCH-REVIEW.md and tag NEW vs ↔F-n / ↔note-item, adding only what's specific
to landform-matching. Call out which techniques are shared infrastructure
(instancing, normal maps, fog-tint) vs per-leg bespoke.

## Wave 2 — synthesis & plan (you)
Cross the two agents into the deliverable: for **each leg**, a row of
*current poly → photo-matched target poly → technique(s) → effort/impact/perf →
law check*. Resolve conflicts (e.g. a non-aerial eye-level photo vs the flight's
downward vantage — decide evoke-not-replicate). Verify any perf/feasibility
claim you lean on (don't trust unmeasured estimates; the live baseline is
~60fps / 42–52 draw calls / 84k tris). De-duplicate against POSSIBILITIES /
RESEARCH-REVIEW by reference. Then sequence it.

## POLY-MATCH-ROADMAP.md structure
1. Executive summary — the per-leg matching opportunity in one table
   (leg · photo · current polys · matched-target · headline technique)
2. Per-photo landform briefs (from PHOTO)
3. Technique catalogue mapped to the module (from GEOMETRY), with the
   data-model (`theme.landform`) refactor that unlocks per-leg control
4. The roadmap — ranked by impact/effort, tagged NEW vs ↔POSSIBILITIES/RESEARCH-REVIEW
5. Phased implementation plan — ordered build steps, each with: files/functions
   touched, the per-leg A/B verification method (screenshot at the dwell +
   dwell-altitude regression + 60fps/draw-call budget), law check, and a
   rollback note. Phase 0 = the `theme.landform` data-model + one pilot leg
   (recommend the strongest single match) before fanning out.
6. What to leave abstract — legs/photos where literal landform-matching fights
   the laws or the aesthetic (say why), and the shared-infra wins that lift
   every leg regardless (fog-tint, normal maps, curl-noise).

Report the executive-summary table + the recommended pilot leg inline, then
stop. Implementation is a separate future workflow run against this plan.
