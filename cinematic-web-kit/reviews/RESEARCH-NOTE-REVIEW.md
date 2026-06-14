# Review — "Higher-Detail Geometry, Texturing & Particles" research note vs. the live app

*Read-only graphics review of `index.html` (flight mode) against the research note. No site file modified. Evidence is `index.html:line`. Cross-referenced against `POSSIBILITIES.md` (2026-06-12) so Part 2 is additive, not a repeat of the existing F-/A-/I-series backlog.*

## Files inspected

- `index.html` — single-file app; flight-mode Three.js module at lines 396–1303.
- Pinned version: **three @0.160.0** via jsdelivr import-map **with an SRI integrity hash** (`index.html:28–32`) — stronger than the note's bare pin. Note suggests `0.184.0`/unpkg; staying pinned + hashed is defensible given the note's own addon-drift warning.
- Renderer: WebGL, `ACESFilmicToneMapping`, `autoClear=false` (665–667); composer ends on `OutputPass` (1137). Matches the note's loading recipe.

---

## Part 1 — Gap audit (every note item)

### Headline finding (note's "the one finding that changes the handbook"): selective bloom — **ALREADY SOLVED (different, arguably superior, technique)**

The note's correction — *bloom/tone-mapping must never touch the photographs* — is fully satisfied, but via a **two-scene split** rather than the note's two-composer/bloom-layer approach:

- Two scenes: `atmos` and `photoScene` (674–675).
- The composer renders **only `atmos`** (`RenderPass(atmos, camera)`, 1117) → `UnrealBloomPass` (1118) → optional grade → `OutputPass` (1137).
- Render loop (1275–1280): `renderer.clear()` → `composer.render()` (bloomed atmosphere) → `renderer.clearDepth()` → `renderer.render(photoScene, photoCam)`. **Photos are drawn raw, after the composer, never entering it.**
- Photo material is `MeshBasicMaterial({ toneMapped:false })` (1028–1029); exposure adaptation comment confirms the law by construction (1199–1203).

**Verdict: IMPLEMENTED.** The note's layer-based method is one valid technique; the two-scene split reaches the same guarantee with cleaner isolation. No action — this is a strength to preserve. (Already flagged as "stronger than its own handbook" in POSSIBILITIES §8.)

### A. Geometry & texturing

| # | Note item | Verdict | Evidence | Notes |
|---|-----------|---------|----------|-------|
| A1 | Normal maps on terrain | **MISSING** | terrain mat = `MeshStandardMaterial({ map:detailTex, vertexColors, roughness:.95, flatShading:true })` (786–787); no `normalMap` | **Top actionable gap. = backlog item F3a** (already identified M/4). `flatShading:true` would also fight a normal map — must go smooth or compute per-pixel normals. The `key` DirectionalLight already exists (724). |
| A2 | FBM displacement, moderate segments | **IMPLEMENTED** | `PlaneGeometry(2600, …, 160, 260)` (748); per-vertex `terrainH()` = 5-octave fBm + ridged fBm + canyon (737–753); `computeVertexNormals()` (754) | Matches the note's ~160-segment recommendation precisely. Lite tier drops to 70×110. |
| A3 | Tri-planar + altitude/slope blend | **PARTIAL** | Slope/height **tonal** blend via baked vertex colours (757–769) ✓; tri-planar **texture** mapping ✗ — `detailTex` uses planar UV `repeat(42,70)` (783), so it stretches on steep canyon/ridge faces | Add tri-planar sampling of `detailTex` (and the future normal map) by world normal. |
| A4 | Aerial-perspective fog tint | **IMPLEMENTED (core)** | `FogExp2` (676), per-leg fog colour updated live (1191–1196), density bump near the canyon (1196) | Uniform exp2 only. Enhancement (height/valley gradient) proposed as **N1** below. |
| A5 | LOD / segment scaling | **PARTIAL** | Device-tier scaling: `TIER` 70×110 vs 160×260 (748), MODE static/lite/flight (441), pixel-ratio cap (662), per-tier particle/cloud counts | No distance-based `THREE.LOD` (uniform-density single mesh). Low priority for a forward corridor flight; POSSIBILITIES killed "full LOD clipmaps" as overkill — consistent. |
| — | Avoid parallax-occlusion | **HONOURED** | not present | ✓ |

### B. Particles

| # | Note item | Verdict | Evidence | Notes |
|---|-----------|---------|----------|-------|
| B1 | Soft radial-alpha sprites, custom ShaderMaterial, per-particle size/alpha | **PARTIAL (look achieved)** | Soft radial-gradient canvas sprite (791–803) + `AdditiveBlending` + `sizeAttenuation` + `alphaTest` (816–818) ✓ — but on **`PointsMaterial`**, not a custom `ShaderMaterial`; no per-particle size/alpha attributes (uniform per field) | The note's headline ("turn confetti into glowing dust") is already done. Remaining upgrade = per-particle variation via a custom shader; do it **with B3**. |
| B2 | Depth-aware "soft particles" | **MISSING** | `depthWrite:false` (818) but no depth-texture fade | Motes/snow/dust hard-intersect terrain & cloud planes. Needs a depth texture on the atmos RT. |
| B3 | Curl-noise / flow-field drift | **MISSING** | Motion is whole-field sinusoidal (1208–1213) | No per-particle organic flow. Pair with the B1 ShaderMaterial upgrade. |
| B4 | GPGPU / FBO sim | **CORRECTLY AVOIDED** | counts 1.6–3.2k (821–822) | ✓ Matches "not needed for ambient dust." (POSSIBILITIES proposes F5b murmuration as the one justified GPGPU moment.) |
| — | three-nebula | **CORRECTLY AVOIDED** | custom Points used | ✓ |

### Global "avoid" list — all honoured

SSAO/SSR/heavy post: only bloom + optional taste-gated vignette/grain behind `?grade=1` (1119–1136) ✓ · multi-light real-time shadows: a single `DirectionalLight` + ambient, no shadow maps, shadows faked with a baked radial gradient under photos (1015–1024) ✓ · high-segment terrain everywhere: tier-capped ✓ · grading/blooming the photo planes: avoided by construction ✓.

### Bottom line for Part 1

The app already satisfies **~70%** of the note, including its single highest-severity item. The **real remaining gaps** are: **A1 normal maps** (= existing backlog F3a; the note independently reprioritises it to #1), **A3 tri-planar**, **B2 depth-soft particles**, **B3 curl-noise drift**, and **B1's per-particle shader** upgrade. The note's **net-new contributions** beyond the prior FRONTIER backlog are **A3 tri-planar, B2 depth-aware particles, B3 curl-noise, and the A4 fog enhancement** — none of those four appear in POSSIBILITIES.

#### Ready-to-run fix snippets (note style)

**A1 — terrain normal map (highest impact-per-cost):**
> Generate a tangent-space normal map procedurally from the same fBm field used by `terrainH` (compute it once on an offscreen 512² canvas at init from height differences), assign it as the terrain `material.normalMap` with a modest `normalScale`. Switch the terrain material off `flatShading:true` to smooth shading (keep `computeVertexNormals`) so the map reads, and verify the existing `key` DirectionalLight still grades it. Do NOT touch the photo planes — they stay unlit `MeshBasicMaterial`, rendered in the separate `photoScene` pass.

**A3 — tri-planar + slope texture blend (kills UV stretch on canyon/ridge faces):**
> Via `onBeforeCompile` on the terrain `MeshStandardMaterial`, sample `detailTex` (and the new normal map) tri-planar by world-space normal instead of planar UVs, and blend a second darker rock tone in by slope on the steep canyon/ridge faces. Keep the existing baked vertex-colour height/slope tint as the base.

**B2 + B3 — depth-soft, curl-drifting particles (do together):**
> Replace the `PointsMaterial` motes/snow/dust with one custom `ShaderMaterial` (point sprites): add per-particle `aSize`/`aSeed` attributes, drive slow per-particle curl-noise drift in the vertex shader from a `uTime` uniform, and fade alpha where a particle's depth approaches scene depth (sample a depth texture attached to the atmosphere render target) so haze meets terrain and cloud planes without hard lines. Keep counts in the low thousands and all of it on the atmosphere pass — never the photo pass.

---

## Part 2 — Additional possibilities (NEW vs. both the note and POSSIBILITIES.md)

Rendering-frontier ideas that are *not* in the research note and *not* already in `POSSIBILITIES.md` (which thoroughly covers god-rays/F2, water/F4, instanced furniture/F9, exposure/F7c, Mie glow/F8, murmuration/F5b, volumetric clouds/F1, DoF/F7a, anamorphic flare/F7b, and the whole A-/I- product/feature frontier — see that doc for those). Each obeys the hard invariants. Ranked by impact-per-cost.

**N1 — Height/valley gradient fog (true aerial perspective) · high impact / low cost.**
Today's `FogExp2` is uniform; real aerial scenes have haze pooling in valleys and clearing with altitude. Add a height term so fog density falls with world-Y, sampled in the atmos materials.
- Constraint-fit: atmosphere only (photos are a separate pass with no fog); procedural; free on mobile.
> Extend the atmosphere fog from uniform exp2 to a height-graded fog: denser below a valley threshold, clearing with altitude, driven by a `uFogHeight`/`uFogFalloff` uniform pair, sampled in the terrain/cloud/sky shaders. Tune per leg from the existing light profile. Leave the photo pass fog-free.

**N2 — Soft-depth fade on the cloud *bank planes* (not just particles) · medium-high / low once N/B2's depth texture exists.**
The billboard cloud planes (946–948) hard-cut where they cross terrain or each other. Reuse the B2 depth texture to soft-fade their edges.
- Constraint-fit: atmosphere pass only; reuses one depth texture; mobile path = skip (clouds already thinner in lite).
> Once a scene depth texture exists, give the cloud-bank `MeshBasicMaterial` planes a soft-depth alpha fade (fragment fades as plane depth approaches scene depth) so banks meet terrain and overlap each other without hard seams.

**N3 — Baked curvature/ambient-occlusion term in the terrain vertex-colour bake · medium / ~zero runtime.**
You already bake slope-darkening into vertex colours (757–769). Extend the *same init loop* with a cheap cavity term (compare each vertex height to its neighbours) to darken crevices and canyon floors — the look SSAO would give, with no screen-space pass (POSSIBILITIES explicitly killed SSAO; this is the law/perf-safe substitute).
- Constraint-fit: init-time only, zero per-frame cost; identical on all tiers.
> In the terrain vertex-colour bake, add an ambient-occlusion term from local height curvature (sample neighbouring `terrainH`), multiplying crevices/valley floors darker. Pure init-time bake — no runtime cost, no SSAO pass.

**N4 — Depth-shelled star parallax on night/Milky-Way legs · medium / low.**
Stars are a single Points field at fixed y (822–823). Split into 2–3 depth shells with differential parallax against camera translation for a genuine 3D sky on the dark legs.
- Constraint-fit: atmosphere; cheap; mobile path = keep single shell.
> Split the star field into 2–3 depth shells and offset each by a fraction of camera Z-motion so the night and Milky-Way legs gain real parallax depth instead of a flat sprite plane.

**N5 — Velocity-stretched motes during fast scrub · low-medium / low.**
During fast scrubbing the motes read static. Stretch each sprite along the flight axis proportional to camera velocity for a subtle speed cue (motion-blur feel) — naturally falls out of the B1 custom shader.
- Constraint-fit: atmosphere only; a `uVelocity` uniform; mobile path = disable.
> In the new particle ShaderMaterial, stretch point sprites along the flight axis proportional to a `uVelocity` uniform (camera Z speed), so motes streak gently during fast scroll and round out at the dwells.

**N6 — Anisotropic snow/ridge glint (gated to snow legs), after A1 lands · medium / low-medium.**
Once a terrain normal map exists, add a view-dependent sparkle term on the high snow/ridge legs (`theme.ridge ≥ 30`) for crystalline glint — distinct from F4's water (which is the sea legs).
- Constraint-fit: terrain (atmosphere) only; leg-gated; mobile path = off.
> After the A1 normal map exists, add a subtle view-dependent specular sparkle to the terrain on snow/ridge legs only (gate by the existing `theme.ridge` field), so high crests catch the low sun. Keep it off the sea legs (that's F4's domain).

---

## Invariant self-check

Every Part-1 fix and Part-2 idea operates on the **atmosphere pass only** (terrain/particles/clouds/sky/fog); none touches `photoScene`, none adds lighting/tone-mapping/bloom to the photographs, all are procedural (canvas/shader, no shipped assets), all stay on WebGL, and each names a mobile/lite degradation path. No hard invariant is broken.

## Top 3 highest-leverage actions

1. **A1 normal map (= F3a).** The note's #1 and the biggest single visual jump per line; the lighting rig already exists. Watch live FPS after (repo's standing "real-60fps" check).
2. **B2 + B3 together** — one custom particle `ShaderMaterial` delivering depth-soft edges *and* curl-noise drift (covers B1's remaining gap too). The depth texture it creates also unlocks **N2**.
3. **A3 tri-planar** — removes the visible UV stretch on the canyon/ridge faces the displacement already produces; cheap once A1's `onBeforeCompile` hook is in place.

*Caveat: photo-pass isolation is verified at the code/architecture level (definitive). Frame-rate impact of any new shader work must be measured live on real hardware before shipping, per the repo's verification culture — I did not boot the module for this review.*
