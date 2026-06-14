# PATTERNS — reusable cinematic-web rendering, motion & engineering techniques

The transferable "skills" behind the scroll-driven 3D photo-flight, distilled so
you can apply them in any new project. Each pattern is **what it is → why →
the key code shape**. Stack: Three.js (WebGL2), GSAP + ScrollTrigger, Lenis;
static-host, no build step, pinned-CDN ESM with SRI. Worked examples live in
`build-journal/BUILD-LOG.md` and `reviews/`.

The single most important idea: **outcome paired with mechanism.** "Make it
cinematic" produces nothing; "selective bloom via a separate scene pass +
exp2 fog + a UnrealBloom composer tuned to one named palette" is buildable.
Every pattern below is a mechanism bolted to an outcome.

---

## A. Image fidelity — the non-negotiable laws

**A1. Dual-pass content isolation (the keystone).** Render your photographs (or
any pixel-exact content) in a **separate `THREE.Scene` through a separate camera,
*after* the post-processing composer finishes** — never inside it:
```js
renderer.clear();
composer.render();                       // atmosphere: bloom, grade, fog, tone-map
renderer.clearDepth();
renderer.render(photoScene, photoCam);   // photos: untouched by anything above
```
This is **stronger and simpler** than "selective bloom via layers/two composers."
Measured proof (this project): toggling bloom 0.5→0 left a photo pixel
**bit-for-bit identical (14,2,1 → 14,2,1)** next to a 249-bright sun, while the
atmosphere shifted. Material choice alone (`MeshBasicMaterial`) does NOT protect
from the composer — the separate pass does, by construction. If a "research
note" tells you you *must* use layer-bloom, this pattern makes that moot.

**A2. Content material = unlit, sRGB, tone-mapping-off.**
`new THREE.MeshBasicMaterial({ map: tex, toneMapped: false })`, `tex.colorSpace =
SRGBColorSpace`. Combined with A1, the image can never be lit, fogged, bloomed,
or graded.

**A3. Never rotate the content — dual-camera rig.** Let the *atmosphere* camera
bank/dive/turbulence for drama; render the content plane through a **second
camera sharing position + look-at but with zero roll and fixed FOV**:
```js
camera.position.set(...); camera.lookAt(...); camera.rotateZ(bank);  // atmosphere
photoCam.position.copy(camera.position); photoCam.lookAt(lookX, lookY, lookZ); // roll-free
```
The horizon tilts around perfectly rectilinear photographs.

**A4. No CSS filters/overlays/tints on `<img>` anywhere** (site-wide extension of
A1–A3). "In situ" / room mockups are built as DOM frames *around* the image, not
effects *on* it.

---

## B. Procedural atmosphere & geometry

**B1. Seeded fBm value-noise terrain** — reproducible per visit (seed the RNG),
so randomised behaviour is verifiable. 4–5 octaves; a *ridged* variant
(`pow(1-|n|, k)`) for sharp crests. Displace a moderate plane (≈160×260 near the
path), recompute normals.

**B2. Slope/height-aware vertex colours + a tiling detail map** beat a flat
height-lerp: darken steep faces, warm high gentle crests, plus a 256² canvas-noise
albedo at `repeat(40,70)` for close-range texture. Optional **procedural normal
map from the *same* height field** (`onBeforeCompile`, derivative-of-detail,
flag-gated `?nmap` because it fights `flatShading:true`).

**B3. The landform data-model (per-section geometry switching).** Give each
"section"/waypoint a **discrete label** (`landform: 'glacier'|'slot'|…`). Consume
it with a **nearest-slot (non-lerped) pick** plus a **dwell-proximity weight**
`lfW` = 1 at a dwell, 0 at the transition midpoint:
```js
return { ...amplitudes, landform: fr<.5 ? lf(k0) : lf(k0+1),
         lfW: 1 - 2*Math.abs(w - Math.round(w)) };
// in terrainH: h = lerp(h, landformShape, th.lfW)  → seam-free, full at the dwell
```
This is the keystone for matching geometry to content per section without hard
snaps. Amplitude scalars keep lerping (smooth morph); the *label* snaps mid-gap
where it's hidden.

**B4. Instanced furniture via one helper.** `instanceField(geo, mat, placements)`
→ one `InstancedMesh` (**≤1 draw call** regardless of count), placed by a
label-gated scan. Sea-stacks, city blocks, a parametric bridge truss, a colonnade
— each is one draw call. The biggest *detail* win on smooth procedural terrain.

**B5. Distance-cull per-section furniture** so the draw-call peak is
**independent of order** and far objects cost no fill:
```js
const legFurn = [];                  // {m, z} registry, push on creation
// per frame: legFurn.forEach(f => f.m.visible = Math.abs(camZ - f.z) < 640);
```
Measured: a 12-shuffle sweep peak dropped from 60 (at the ceiling) to 57.

**B6. Sky as a gradient ShaderMaterial dome** (zenith→horizon from a named
palette) with a **Mie sun-glow term grafted in** (`pow(max(dot(dir,sunDir),0),k)
* sunMix`) — palette-native, cheaper than physical Preetham `Sky.js`, and it
won't fight your content's own skies.

**B7. Custom water ShaderMaterial — NOT reflection-RT `Water.js`** (which costs a
second scene render). Scrolling tiling-normal samples + Blinn-Phong specular
toward the sun + a fresnel rim + a proximity alpha fade. One shared material
across all water planes; drive `uTime/uSunDir/uSunMix` once per frame.

**B8. Soft particles done right.** A 128² radial-gradient **canvas sprite**
(`AdditiveBlending`) turns "confetti" points into glowing motes — no asset.
Cap counts (low thousands); **reject spawns in the camera corridor** (`while
(|x|<14) respawn`) so nothing blooms on the lens. **Curl-noise drift** (a
divergence-free flow field in the vertex shader via `onBeforeCompile` + a
`uTime` uniform) makes them swirl organically with zero CPU cost.

**B9. God-rays as a composer pass, not geometry.** A radial-blur `ShaderPass`
marching from the sun's **projected NDC position** toward each pixel, weighted by
`sunMix`, **early-out (`if uSunMix<=.002 return scene`)** on dark legs → zero fill
there. Atmosphere-only by construction (it's in the composer, before the content
pass). Fill-bound at dpr2 → ship flag-gated until you add adaptive quality.

**B10. GPGPU flocking** (`GPUComputationRenderer`): ping-pong position+velocity
float textures, **bounded-tap boids** (32 stride samples, not O(N²)), rendered as
**one `THREE.Points`** reading the position texture. `compute()` save/restores the
render target → the content pass is untouched. **Dynamic-`import()` it inside the
flag branch** so default visitors download nothing. Visibility is fill-bound:
perspective point sprites are tiny when far, huge when near — place the flock at a
*medium approach depth*, flatten the seed cloud (nothing spawns on the lens), and
balance `gl_PointSize` vs count for 60fps.

**B11. Aerial-perspective fog-tint** via terrain `onBeforeCompile` (desaturate +
bias toward a haze colour by `length(vViewPosition)`), layered on `FogExp2`. Note
`vViewPosition` is only declared under `FLAT_SHADED || USE_NORMALMAP_TANGENTSPACE`
— document that invariant if you rely on it.

**B12. Flag-gating idiom** for taste/perf-gated features:
`const RAYS = Q.get('rays')==='1'`. Defaults off (`?rays/?birds/?nmap/?mat/?grade/
?tier`), so the base experience stays in budget and you ship showpieces on demand.

---

## C. Motion, scroll & the day-arc

**C1. Piecewise scroll→t mapping (no desync).** Don't scrub a global linear
`t` — anchor each DOM section's sticky dwell to its 3D waypoint's `t`, and map
scroll position piecewise between anchors. DOM captions and 3D planes stay locked
together. Harden by sorting the (scroll, t) anchor pairs so a DOM/data mismatch
degrades gracefully instead of desyncing the whole flight.

**C2. Altitude-true smootherstep path.** Map real per-waypoint values (altitudes)
to scene heights with a **compressive** function (`yMin + k*log1p(alt)`) so 3,400
and 5 share one flyable envelope; interpolate legs with **smootherstep** (C2: zero
velocity *and* acceleration at every dwell) so the camera levels off at each
section then eases to the next — no kinks. Drive the HUD readout off the *same*
curve so number and motion accelerate together.

**C3. Lenis + ScrollTrigger + gsap.ticker sync.**
`lenis.on('scroll', ScrollTrigger.update)`; drive `lenis.raf` from `gsap.ticker`;
`lagSmoothing(0)`. Rate-limit the catch-up so native jumps (End key, hash entry)
play as a guided move, not a hyperspace jolt; scale `flyTo` duration by distance.

**C4. Reveal choreography.** Manual per-word `<span>` splitting (never the paid
SplitText). Title *yields* (scrubbed fade) before the content arrives; the
caption/meta block reveals only when its content fades in (`'top 12%'`), so the
punchline doesn't precede the picture.

**C5. The day-arc as interpolated light profiles.** Give each section a `light`
profile (sky/fog colours, star/sun intensities); interpolate the scene palette,
fog, particle and sun opacity through the *sequence* (works even when sections are
shuffled per visit) so the sky always matches the content you're approaching.

**C6. Three-mode degradation, always.** `flight` (desktop 3D) / `lite`
(≤820px or no-WebGL: no 3D, vertical parallax, IO-driven HUD) / `static`
(`prefers-reduced-motion`: opacity-only). Plus **no-JS**: the page is a complete
static essay; a preloader must never trap a no-JS or CDN-failed visitor
(`<noscript>` hide + an inline non-CDN timeout fallback).

---

## D. The engineering meta-skills (how the work got done)

**D1. Design → implement → adversarially verify.** For substantial features: fan
out **independent specs in parallel** (one agent per feature, each returns
paste-ready code + exact anchors + honest fps estimate), implement **serially**
(one file can't be edited in parallel), then run **independent reviewers that try
to *refute*** correctness/perf/law. This caught real bugs live testing missed: a
bridge clipping the camera at x=0, a draw-call peak that was shuffle-fragile, a
latent `composer.passes` index that any new pass would desync.

**D2. Tool-grounded verification — measure, don't estimate.** A reusable headless
harness (`scripts/verify-flight.py`) checks every section's dwell value, the
draw-call/fps budget, and console cleanliness in one run; sweep *many seeds* to
bound a randomised peak; sample pixels to prove fidelity. "I think it's fine" is
not verification; a measured number is.

**D3. Budget discipline.** The scarce resource is **draw calls** (keep ≤~58) and
**60fps**; at dpr2 the scene is **fill-bound** (big sprites, post passes, large
transparent planes all cost fill, not draws). Each instanced feature = 1 draw;
post passes = 1 draw + fill; distance-cull everything optional. **Adaptive
quality** (dynamic resolution scaling + toggling heavy passes to hold 60fps) is
the meta-unlock that lets fill-bound showpieces ship default-on.

**D4. Reproducible randomness.** Seed every RNG (`?order=<seed>`); a shuffled
experience must be verifiable on a fixed seed and swept across many.

**D5. Static-host realities.** A **no-store dev server** (`scripts/dev-server.py`)
kills stale-cache confusion. The **HF static Space quirk**: it 401/404s some
pretty directory URLs — `scripts/deploy-hf.py` rewrites the deploy copy's links to
`/dir/index.html` and rewrites the absolute domain so the copy is self-consistent;
auto-discover dirs (don't hand-maintain a list). Per-shuffle OG cards need a
backend; curated named-flight pages are the 80% static answer.

**D6. Pin the version + SRI.** Pinned-CDN ESM import map (`three@0.160`), SRI on
every `<script>`. Don't chase `@latest` (addon paths/APIs drift). WebGPU/TSL is
the future but stays a *dedicated* migration wave, justified by a feature
(100k-agent compute, TRAA) — not for an fps win you don't need today.

---

## E. Design language

**E1. Name the palette** (e.g. blue-hour→golden-hour: night/dusk/haze/horizon/
sun/ink/mute) as CSS custom properties **and** scene constants; fog, particles,
bloom and the sky dome all share its hues. "Cinematic" is the palette + lighting +
sRGB/ACES + bloom tuned to that one palette — not a vibe.

**E2. One motion language.** Two eases (`power3.out` reveals ≡ `cubic-bezier(.22,
1,.36,1)`; `expo.out` scene ≡ `(.16,1,.3,1)`), durations 0.6–1.2s, stagger
0.05–0.1, tokenised so GSAP and CSS agree. Inconsistent easing is what makes a
polished site feel amateur.

**E3. Glass HUD recipe.** Low-alpha bg + `backdrop-filter: blur(14–16px)` +
hairline border + soft shadow, with a fallback; high-contrast legible text;
it only works over a busy (3D) backdrop.

**E4. Content-matched geometry.** Analyse each photograph's landform and **evoke**
it (visual rhyme, not photogrammetric reconstruction) on its leg — a glaciated
valley, a slot canyon, a sea-stack cliff. Most photos are eye-level, not aerial:
match mood/palette/horizon/silhouette, and say so where literal matching fights
the laws.

---

## F. The traps (hard-won)

- Post-processing affects the **whole frame including your images** — material
  choice won't save them; use the separate pass (A1).
- `flatShading:true` **discards smooth normals** → a normal map needs smooth
  shading or a high-frequency-only term (B2).
- Perspective **point sprites scale with distance** — a "flock" is invisible far
  and a fill bomb near; place at medium depth, balance size×count (B10).
- A shuffle makes **two test seeds non-exhaustive** — sweep many; distance-cull to
  bound the peak structurally (B5, D2).
- `composer.passes[i]` **index updates are fragile** — hold named refs (D1).
- The HF static host **rejects some pretty URLs** — rewrite to `/dir/index.html`
  (D5).
- GSAP **SplitText is paid**, R3F/GSAP/Lenis **aren't in the React-artifact
  whitelist** — manual spans, HTML artifact + CDN or a real project.
