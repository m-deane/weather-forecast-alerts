# FLIGHT-FRONTIER — the 4th review (net-new fly-through enhancements only)

Review/ideation only — **no site file was modified**. Four parallel agents
(CAMERA, INPUT, SENSE, FRONTIER2) swept the four dimensions the three prior
reviews barely touched — **camera/cinematography, input/interaction,
audio/weather/time, and the adaptive-quality meta-enabler** — every finding
hard-deduped against `BUILD-LOG.md` (shipped) and `POSSIBILITIES.md` /
`RESEARCH-REVIEW.md` / `RESEARCH-NOTE-REVIEW.md` / `POLY-MATCH-ROADMAP.md`
(surveyed). 25 findings survived the dedupe. Full agent detail:
`.claude/checkpoints/*-flight-frontier/`.

This is the FOURTH pass; most of the *rendering-texture* frontier was already
shipped or catalogued. Its value is the dimensions the others skipped — and the
single discovery that the heavy showpieces are gated by **fill, not draw calls**.

---

## 0. Adversarial verification — the measured ground truth (read this first)

Every fps claim below was checked against this session's actual CDP measurements,
not the agents' estimates. Two facts govern the whole review:

- **Draw calls are NOT the bottleneck.** Measured peaks this session (CDP,
  innerWidth 1440, `?order=alpha`): **52 default · 53 +rays · 53 +rays+birds** —
  all far under the 57/60 budget. So the lever for the heavy features is
  **render-target resolution + pass count (fill)**, never geometry.
- **The fill-bound 60fps claims are UNPROVEN.** Headless rAF was **vsync-pinned
  at 16.6 ms across every config**, so no fill-bound feature (DoF, motion-blur,
  rain/snow lens, volumetric, flare) could have its 60fps-hold measured here. The
  only hard fill numbers we trust are the *prior* session measurements: god-rays
  **dip to ~39 fps at dpr2/1440p** heaviest-shuffle, murmuration **230px/2500 ⇒
  ~30 fps transient** (shipped config 155px/1600 holds 60). **Every heavy-pass
  item therefore stays flag-gated / needs-adaptive-quality until a real-laptop
  pass — no exceptions.**

Consequence: the findings split cleanly into two trust tiers —
1. **CPU-only / off-thread (TRUST as default-on):** anything that is a
   camera-matrix transform, a scroll-driver, a uniform tweak, an ALU-only shader
   edit, or Web Audio (off the rAF thread). Zero new draw calls, zero new fill —
   60fps holds *by construction*. This is most of Camera + all of Input + most of
   Sense + AQ3.
2. **New fullscreen post-pass / fullscreen composite (DO NOT default-on yet):**
   DoF, motion-blur, radial-blur, rain/snow lens canvas, volumetric, standalone
   flare. Fill-bound, unmeasured at dpr2 → flag-gated, and the real unlock is AQ1.

---

## 1. Executive summary — top 10 NET-NEW by impact ÷ effort

| # | ID | What you'd feel | Impact·Effort | Gating |
|---|----|-----------------|:-:|---|
| 1 | **AQ1** | The heavy showpieces just run — flight silently holds 60fps; weak GPUs get a near-invisible res dip instead of a stutter | 5 · M | **default-on (the enabler)** |
| 2 | **I2** | A play button (and `?tour=1`): the whole route flies itself, hands-free, with a draggable scrub bar — works on a kiosk or a phone on a table | 5 · M | default-on |
| 3 | **C1** | The flight stops feeling metronomic — camera eases to a held-breath hover at each photo, accelerates through the dark transitions | 4 · S | default-on |
| 4 | **C2** | A gentle dolly-zoom 'lock-on': the world subtly compresses behind each photo as it arrives (photo framing unchanged) | 4 · S | default-on |
| 5 | **S1** | A mute-first synthesised wind bed that rises with scroll speed and thins with altitude — the flight finally has moving air, no asset | 4 · M | default-on (audio opt-in) |
| 6 | **I1** | Cursor/device-tilt head-look at each dwell — the frame becomes a window you can lean against; the photo stays pinned | 4 · M | default-on |
| 7 | **AQ2** | God-rays + murmuration become default (no URL flag) on capable machines, auto-shed on weak ones | 4 · S | needs-AQ1 |
| 8 | **S3** | Silent lightning briefly whitens the sky-dome on the dark/storm leg — a weather *event*, the cheapest drama available | 4 · S | flag-gated (≈free) |
| 9 | **AQ3** | The sea actually mirrors the sky-dome + horizon glow, not just the sun hotspot — water reads as water | 3 · S | default-on |
| 10 | **C4 / I4 / I6** | hand-held drone micro-turbulence · keyboard flight (a11y) · always-on progress rail+scrub — three cheap default-on polish wins | 3 · S | default-on |

**The shape of the answer:** the biggest wins are *not* more rendering — they're
**a controller (AQ1), a play mode (I2), camera rhythm (C1/C2), and a new sense
(S1)**. All ten are CPU-only or off-thread except AQ1's own res-scaling and the
flag-gated S3. The visual-texture frontier really is mostly spent; the frontier
that's left is *motion, interaction, sound, and the enabler that lets the
already-built showpieces ship on by default.*

---

## 2. The adaptive-quality enabler (AQ1) — assessed first, it gates the rest

**AQ1 — frametime-driven render-target resolution scaling with hysteresis.**
This is the one finding that changes a *prior verdict*. god-rays (`?rays=1`) and
murmuration (`?birds=1`) were flag-gated solely on a fill-fps dip. AQ1 makes that
dip auto-managed, so they can graduate to default-on (that's AQ2).

- **Mechanism:** the render loop already receives `dt` and keeps a rolling fps
  accumulator. Add a controller holding an EMA of frametime with a **band [14 ms
  restore, 20 ms shed]** and an N-frame dwell (~45 frames) to prevent oscillation.
  A **3-rung quality ladder:** rung0 = full dpr + all passes; rung1 = composer
  target ×0.82 (≈0.67 area, **reclaims ~33% fragment work**, bilinear-upscaled by
  OutputPass — canvas CSS size unchanged); rung2 = ×0.82 **and** bloom/rays
  disabled. Climb a rung when EMA>20 ms, descend when <14 ms.
- **One prerequisite line:** name the bloom pass (`const bloomPass = new
  UnrealBloomPass(...)`, currently anonymous) so `.enabled` is reachable —
  mirroring the existing `raysPass`/`gradePass` named-ref pattern.
- **Law-safe by construction:** photos render at full canvas resolution in the
  separate post-composer pass; only the **atmosphere** composer target is scaled.
  The photo pass never reads the scaled target. reduced-motion (static) + lite
  have no composer → the controller is a no-op there.
- **Verdict (adversarial):** the *logic* is sound and the *lever is correct* —
  draw calls measured 52–53/57 confirm fill is the constraint, so scaling
  resolution is right. **But its own 60fps-hold is UNPROVEN here** (headless
  vsync-pin), so AQ1 must itself be validated on a real laptop before AQ2 flips
  any default. Build AQ1 first; everything heavy is downstream of it. **Impact 5,
  effort M.**

---

## 3. Findings by dimension

NEW = no prior doc proposes it. ↔doc = a sharper/narrower spin on an existing
entry (the delta is stated). Trust-tier per §0.

### 3a. Camera & cinematography (almost untouched before this review)

| ID | Title | NEW/↔ | I·E | Gating | Trust |
|----|-------|-------|:-:|---|---|
| **C1** | Reveal speed-ramp (decelerate into dwells, accelerate through dark legs) — modulate the `flight.t` catch-up coefficient by `meetWin`, never decoupling from scroll | NEW | 4·S | default-on | CPU-only ✓ |
| **C2** | Subtle dolly-zoom: atmosphere FOV 55→~50° on the reveal, `photoCam.fov` pinned at 55 so photo framing is identical | ↔REVIEW R13 (FOV was named only as a banking fallback, never reveal-coupled) | 4·S | default-on | CPU-only ✓ |
| **C3** | Rack-focus DoF: atmosphere defocuses as the photo arrives (driven by photo opacity), photo stays pin-sharp in its own pass | ↔POSSIBILITIES F7a (adds the *racked, meet-peaked* timing F7a never specified) | 4·M | flag-gated | **fill, unproven** |
| **C4** | Hand-held drone micro-turbulence (multi-octave look/position jitter, `(1-meetWin)`-gated to dead-still at every reveal) | NEW | 3·S | default-on | CPU-only ✓ |
| **C5** | Per-object velocity motion-blur on the atmosphere buffer (camera Z-velocity gated), photos exempt | NEW (distinct from N5 mote-stretch) | 3·M | flag-gated | **fill, unproven** |

### 3b. Input & interaction (was scroll-only — genuinely greenfield)

Decisive fact: every input idea is a per-frame **camera-matrix transform** —
zero draw calls, zero fill — so the dpr2 fill warning does not gate them. The
only constraint is the photo-immutability law, and they all reuse the proven
atmosphere-only `camera.rotateZ` banking pattern that `photoCam` already ignores.

| ID | Title | NEW/↔ | I·E | Gating |
|----|-------|-------|:-:|---|
| **I2** | Autoplay 'guided tour' — timed hands-free flight, play/pause, draggable scrub bar; any wheel/touch reclaims control. Drives the existing scroll pipeline, never bypasses it | NEW (zero autoplay/tour code exists) | 5·M | default-on |
| **I1** | Cursor / gyro atmosphere parallax (rotation-only, dwell-gated) — head-look into the scene, photo pinned dead-centre | NEW (not the law-bending photo-warp Q1/Q2) | 4·M | default-on |
| **I3** | Cinematic 'dive' on long waypoint-click jumps (FOV widen + exposure dip + overshoot) — click-to-fly already ships; this is the richer delta | ↔ shipped click-to-fly | 3·S | default-on |
| **I4** | Keyboard flight (arrows/space → next/prev waypoint, Home/End) — a11y + power-user nav, the backbone I2 shares | NEW (no keydown handlers exist) | 3·S | default-on |
| **I5** | Drag-to-look orbit at a dwell (body holds, head turns, springs back) — active extension of I1 | NEW | 3·M | default-on |
| **I6** | Always-on progress rail + leg ticks, draggable to scrub — the orientation/scrub affordance scroll-only flights always need | NEW (the `#locindex` is a jump menu, not a live indicator) | 3·S | default-on |
| **I7** | Gyro tilt parallax on **mobile-lite** (the 2D fallback most phones get) — folds into the existing throttled scroll-parallax tick | NEW for lite | 2·S | default-on |

### 3c. Audio, weather & time (entirely greenfield — zero audio/weather code exists)

| ID | Title | NEW/↔ | I·E | Gating | Trust |
|----|-------|-------|:-:|---|---|
| **S1** | Mute-first **synthesised** wind bed (noise→biquad→gain), level+cutoff track scroll-velocity + altitude; nav mute button ships on, audio opt-in | NEW (POSSIBILITIES §4 is a one-line inspiration note, no design) | 4·M | default-on | off-thread ✓ |
| **S2** | Spatialised sea-wash + gull cues (PannerNode) near the sea/Faroes legs, ducked at the meet — the world *sounds* alive where it looks alive | NEW (builds on S1) | 3·M | default-on | off-thread ✓ |
| **S3** | Lightning flash via a sky-dome `flash` uniform on the dark/storm leg — a stochastic weather **event**, seeded off `?order` for reproducibility | NEW (F8 Mie glow is steady-state, not an event) | 4·S | flag-gated | ≈free ✓ |
| **S4** | Rain/snow streaks on a **virtual lens** — a 2D canvas sibling to `#veil`, faded to zero at every meet so the photo is presented clean | NEW (F5a snow is in-*world* Points; this is weather-on-the-glass) | 4·M | needs-AQ | **fill composite** |
| **S5** | Fog-bank visibility **event** — a leg-scaled density swell you fly *through* (reuses the canyon-bump mechanism + haze uniforms + veil), beyond the fixed cloud punch-through | ↔ existing FogExp2/haze (adds the leg-scaled scheduled passage) | 3·S | default-on | uniform-only ✓ |
| **S6** | Sub-leg sun-arc micro-motion — the sun drifts *within* a dwell so time passes, **without** overriding the photo-matched profile | NEW spin (corrects the brief: light already *blends* between legs, isn't a hard snap) | 3·S | flag-gated (taste) | trig-only ✓ |

### 3d. Frontier2 — deferred heavy rendering + the meta-enabler

| ID | Title | NEW/↔ | I·E | Gating | Trust |
|----|-------|-------|:-:|---|---|
| **AQ1** | Adaptive-quality controller (see §2) | NEW | 5·M | default-on | enabler (validate on real HW) |
| **AQ2** | Graduate `?rays=1` + `?birds=1` to **adaptive-default** (on capable HW, auto-shed under load) | ↔F2+F5b (adds the graduation mechanism) | 4·S | needs-AQ1 | gated by AQ1 |
| **AQ3** | Sky-dome + horizon **reflection** term on the water (analytic `reflect()`, reuses the dome's zenith→horizon lerp) — no RT pass, no SSR | ↔F4/S5 (shipped water reflects only the sun; this adds the dome) | 3·S | default-on | ALU-only ✓ |
| **AQ4** | Re-verdict on F1 raymarched volumetric clouds: a **bounded** single pass that only marches when inside a bank, step-count wired to AQ1's rung — still `?vol=1`, but now with a credible adaptive path | ↔F1 (the asked-for re-assessment, not a re-proposal) | 4·L | flag-gated | **heaviest, unproven** |
| **LF1** | Anamorphic lens-flare folded into the **existing** god-rays pass (reuses the sun's already-computed NDC) — the law-safe placement F7b left unspecified | ↔F7b (adds placement+law detail) | 3·S | needs-AQ | ≈free if folded |
| **PB1** | Velocity-scaled radial post-blur at bank punch-throughs — honest 'fake motion blur', **must** be a composer pass (before the photo pass) or it smears the photo | NEW (no MB entry in any doc) | 2·M | needs-AQ | **fill, unproven** |
| **CV1** | Chromatic aberration + CA folded into the **existing** `?grade` pass — lowest-impact item, included for completeness | ↔ extends `?grade` | 1·S | flag-gated | ≈free, taste |
| **WG1** | WebGPU/TSL migration — updated verdict: **still defer.** Draw calls 52–53/57 and boids hold 60 at 1600, so neither compute-particles nor TRAA is the current bottleneck. **Explicit trigger:** revisit only when a feature *requires* it (volumetric froxels too heavy in WebGL, or a 100k-agent murmuration becomes a headline). The load-bearing risk: re-proving the dual-pass photo-isolation law under `WebGPURenderer` | ↔FRONTIER §3 (adds measured numbers + a concrete trigger) | 1·L | defer | N/A |

---

## 4. Law-bending quarantine

**No finding in this review bends the photo-immutability law** — every one passed
its law check, because all camera/input items rotate or translate only the
*atmosphere* camera (`photoCam` re-derives a roll-free orientation and is
ignored by banking), all audio is off-thread and never reaches a render pass,
and all post-passes live in the composer *before* the photo pass
(`renderer.clear → composer.render → clearDepth → render(photoScene, photoCam)`).

Three items carry a **named implementation trap** — law-safe only if built as
specified:

- **PB1 (radial blur)** — law-safe **iff** it is a composer pass *before* the
  photo render. A radial blur applied *after* the photo pass would smear the
  photograph. This is the one real trap in the set.
- **S4 (rain/snow lens)** — composites a fullscreen 2D canvas *over* the frame
  (exactly like the sanctioned `#veil` haze), so streaks pass over the photo's
  *screen* pixels. The photo *texture* is never touched, and the layer is faded
  to zero at every meet so the photograph is presented pristine. If even the
  faded contact reads as too much, confine streaks to a radial edge mask. Flag it.
- **C3/C5 (DoF, motion-blur)** — law-safe by the same render-order isolation, but
  each must be **photo-pixel bit-compared on/off at a dwell** (as
  RESEARCH-NOTE-REVIEW did for bloom: 14,2,1 → 14,2,1) before shipping.

**Explicitly rejected as law-bending and NOT proposed** (proof the dedupe held):
Ken Burns / in-plane photo pan (POSSIBILITIES Q2), 2.5D depth-map photo parallax
(Q1) — both warp the photograph. Any audio *asset* (violates static-host/no-build
— all audio is synthesised). Any profile-*replacing* day-cycle (would fight the
photo-matched per-leg light; S6 adds sub-leg motion only).

---

## 5. Roadmap

**Quick wins (CPU-only / ≈free, default-on, ship in one wave — no AQ1 needed):**
C1 speed-ramp · C2 dolly-zoom · C4 turbulence · I1 parallax · I2 autoplay tour ·
I4 keyboard · I6 progress rail · S5 fog-bank · AQ3 water reflection. All are
camera-transform / scroll-driver / uniform / ALU edits — 60fps holds by
construction. *Highest value-per-risk in the whole review.*

**Next wave (the enabler + its dividends):** AQ1 controller → then AQ2 graduates
rays+birds to default. Plus S1 wind bed (+ S2 spatial cues), I3 dive, I5
drag-to-look, S6 sun-time (taste A/B), I7 lite gyro, S3 lightning (cheap, but
ship behind `?storm=1` and measure a full route first).

**Ambitious (fill-bound, prototype + real-laptop measure, AQ1-gated):** C3
rack-focus DoF · C5 / PB1 motion-blur family · S4 rain/snow lens · LF1 anamorphic
flare · CV1 chromatic aberration. None default-on until measured on real HW.

**Research-grade:** AQ4 bounded volumetric clouds (`?vol=1`, the single most
cinematic deferred item and the riskiest for fill). WG1 WebGPU/TSL — **defer**
until a committed feature requires it.

---

## 6. Already excellent — leave alone

The build has genuinely exhausted most of the visual-texture frontier. Needs
nothing: the dual-pass photo isolation + dual-camera photos-never-rotate rig; the
per-leg photo-matched landform geometry (glacier U-valley, slot, dark ridge, snow
summit, open sea, Faroes sea-stacks, Calton blocks+monument, Forth bridge); the
sun-specular water shader; curl-noise drift; the MSAA 4× half-float composer
(already at the GPU's max — TAA/SMAA correctly killed); the altitude-true
smootherstep path with zero-velocity-at-meets and per-leg furniture
distance-culling.

**Shipped / surveyed — explicitly NOT re-proposed (dedupe proof):** god-rays
`?rays=1`, murmuration `?birds=1`, curl-noise, water shader, Mie sun-glow F8,
exposure adaptation F7c, `?grade` grain+vignette, normal-map `?nmap=1`, aerial
fog-tint A4, the FogExp2 canyon bump, cloud punch-through veil, click-to-fly,
lite vertical photo parallax, the per-leg light blend (already continuous, not a
snap). Surveyed-and-deferred (re-rated, not re-proposed): F1 volumetric (AQ4),
F7a DoF (C3), F7b flare (LF1), WebGPU (WG1). Killed and left killed: TAA/SMAA,
full LOD clipmaps, film-emulation post, photo Ken-Burns/2.5D-parallax,
reflection-RT Water.js, screen-space SSR.

---

*Net: the next gains are motion, interaction, and sound — plus AQ1, the
controller that lets the already-built showpieces ship on by default. Build AQ1
and the quick-wins wave first; everything fill-bound waits for a real-laptop
measurement that the headless harness could not provide.*
