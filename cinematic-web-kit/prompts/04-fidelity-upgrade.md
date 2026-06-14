# Launch Prompt — Fly-Through Resolution, Fidelity & Texture Upgrade

Paste everything below the line into a Claude Code session in this project.
Single-file target (`index.html` module), phased, with A/B evidence and a hard
performance budget.

---

You are upgrading the visual fidelity of my photography site's 3D fly-through
on **autopilot**. Read first: `BUILD-LOG.md` (full history — especially waves
3+, the altitude-true path, and the dual-camera rig), then the
`<script type="module">` in `index.html` in full. Dev server: http://localhost:8123;
CDP harness pattern in `scripts/verify-site.py`. Use seeded routes
(`?order=alpha` / `?order=bravo`) so every before/after screenshot is at an
identical camera position.

**Laws (absolute, re-verify at the end):** photographs stay unlit
(`MeshBasicMaterial`, `toneMapped:false`, sRGB), never bloomed/fogged/graded,
and **never rotate** (photo pass renders through the roll-free camera). All
fidelity work below applies to the ATMOSPHERE only. 60fps on desktop is a hard
budget — measure frame time before and after every phase (rAF delta sampling
over ~5s at three scroll depths) and roll back any phase that breaks it.
`?tier=flight-lite` must keep working (give it the cheap variants).

Work in phases; after each phase: `node --check` the module, capture the A/B
pair at fixed seed+positions, record measured frame time in your notes, then
proceed. Stop only when all phases land or the budget forces a documented cut.

## Phase 0 — Baseline
Capture reference screenshots (seed `alpha`: hero, slot-2 meet, mid-leg climb,
cloud punch, pano cruise, finale; same for `bravo` hero+finale) and baseline
frame times + draw-call count (`renderer.info.render.calls` exposed temporarily
via a `?debug=1` overlay you add and keep — it's useful permanently).

## Phase 1 — Render pipeline resolution
- The EffectComposer chain currently renders without multisampling, so the
  post chain undoes the canvas MSAA. Use a multisampled render target
  (WebGL2: `samples: 4` on the composer's target — r160 supports
  `EffectComposer` with `WebGLRenderTarget` samples; verify and wire) so
  terrain/cloud edges are antialiased through bloom.
- Half-float render targets if not already (banding in the sky gradient).
- Keep the dpr cap at 2; confirm `UnrealBloomPass` resolution follows resize.

## Phase 2 — Sky dome (the biggest single win)
Replace the flat `scene.background` colour with a procedural gradient sky
dome: a large inverted sphere (or screen-space background plane) carrying a
canvas/shader vertical gradient — zenith → horizon using the same two light-
profile colours the flat version lerps today, plus a subtle warm horizon band
whose intensity follows `sunMix`. It must keep interpolating per-leg exactly
as the flat colour does (same profile inputs), tone-mapped with the atmosphere.
Stars/sun/glint render in front of it. Fog colour continues to track.

## Phase 3 — Terrain fidelity & texture
- Replace the 3-sine height field with seeded fBm value noise (4–5 octaves,
  same seed per visit so `?order=` stays reproducible), keeping the existing
  theme-mask system (per-leg ridge/canyon/sea/base amplitudes) and the flat
  corridor (|x| ≤ ~12) exactly as is.
- Raise mesh density within budget (try 180×280; measure).
- Slope- and height-aware vertex colouring (steeper = darker, ridge crests
  catch a faint key-light warmth at high `sunMix`) instead of the current
  two-colour height lerp.
- Add a tiling procedural detail texture (canvas noise, 256², repeat ~40×) on
  the terrain material modulating colour at close range — this is the
  "texture" the fly-through currently lacks at low altitude.

## Phase 4 — Clouds & atmosphere texture
- Cloud canvas textures 256² → 512² with more, smaller stacked puffs and per-
  texture random rotation; 4 variants instead of 3.
- Two-layer parallax inside each bank (near planes drift slightly faster than
  far ones) for volumetric depth while flying through.
- A faint high cirrus sheet (one huge transparent plane far above the route,
  very low alpha) visible during high-altitude legs only (fade by camera y).
- Sea legs: animate the existing glint subtly (slow scale/opacity breathing)
  and add a barely-visible specular shimmer strip on the flattened sea —
  atmosphere material only.

## Phase 5 — Photo plane sharpness (within the laws)
At the meet, photos render from @1400 textures — soft on retina/dpr-2. Upgrade
the **nearest plane only** to its `@2400` texture as the camera approaches
(swap silently like the lightbox does; keep all others at @1400; release the
2400 when it leaves range to cap GPU memory; anisotropy to
min(8, max supported)). Verify: texture memory stays bounded across a full
route (report `renderer.info.memory.textures` at start/end), no visible swap
pop, colour identical (sRGB on both).

## Phase 6 — Final grade (atmosphere only)
- Tune bloom for the new sky (threshold likely rises; keep photos clean by
  construction, not by threshold).
- Optional, taste-gated behind `?grade=1` for Matthew's review: ultra-subtle
  film grain + vignette as a final pass on the ATMOSPHERE composer only —
  ship OFF by default with an A/B pair.

## Verification & close-out
Full regression: `check-meta.py` 10/10, `verify-site.py` 13/13, both seeds'
dwell altitudes exact, photos rectilinear mid-bank, lite/static/no-JS
untouched, `?tier=flight-lite` runs with the cheap variants. Report: per-phase
A/B pairs, frame-time table (baseline vs final at three depths), draw calls,
texture memory. Append BUILD-LOG, commit (conventional, no push), stop.
