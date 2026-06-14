# Launch Prompt — Flight Frontier Review (net-new enhancements only)

Paste below the line into a Claude Code session. **Review/ideation only — no
site file is modified.** Output: `FLIGHT-FRONTIER.md`. This is the FOURTH review
of the fly-through; its entire value is finding what is **genuinely new** — not
re-surveying ground three prior reviews already covered.

---

You are reviewing the 3D fly-through on **autopilot** with parallel agents to
find what ELSE these technologies (Three.js/WebGL2, GSAP/Lenis, Web Audio,
WebGPU horizon) could add to enhance it. The bar is **net-new**: most of the
obvious rendering space is already shipped or already catalogued.

## MANDATORY first step — load everything already done/surveyed, and DEDUPE
Read in full and treat as the "do-not-re-propose" baseline:
- `BUILD-LOG.md` — everything SHIPPED (photo-matched per-leg geometry: glacier
  U-valley, slot canyon, dark ridge, snow summit, open sea, Faroes sea-stacks,
  Calton city blocks + monument, Forth bridge; water shader, aerial fog-tint,
  curl-noise particles, god-rays `?rays=1`, GPGPU murmuration `?birds=1`, normal
  map `?nmap=1`, print-mat `?mat=1`, middle tier `?tier=flight-lite`; sky dome,
  per-leg light profiles, MSAA half-float composer + bloom, @2400 nearest-photo
  upgrade, dual-camera photos-never-rotate, shuffled waypoints, altitude-true
  smootherstep path, per-leg furniture distance-culling).
- `POSSIBILITIES.md`, `RESEARCH-REVIEW.md`, `POLY-MATCH-ROADMAP.md` — the prior
  surveys (FRONTIER F-items, the research-note items, the per-leg landform plan).
- `index.html` `<script type="module">` IN FULL — the actual architecture.
Any idea already shipped, or already an entry in those three docs, is OUT (cite
the doc/section and move on). A finding that is a NEW spin on an existing entry
must say exactly what it adds beyond it.

## The brief — deliberately steer to UNDER-EXPLORED dimensions
The prior reviews exhaustively covered terrain/particle/post-process *texture*.
Spend this review on the dimensions they barely touched:

1. **CAMERA & cinematography** (almost untouched). The camera does
   altitude-true smootherstep + small banking + look lead. What about: FOV /
   dolly-zoom on reveals; per-object **motion blur** (velocity pass); **rack-
   focus depth-of-field** racking between the terrain and the arriving photo;
   speed ramps (hold at dwells, accelerate through clouds); a hand-held drone
   micro-turbulence; an orbit/arc or a brief barrel move at a hero waypoint;
   look lead/lag and overshoot. Each must keep photos rectilinear (dual-cam) and
   60fps.
2. **INPUT & interaction** (untouched — it is scroll-only). Cursor/gyro
   parallax of the scene (NOT the photos); drag-to-look-around at a dwell;
   click/tap a waypoint in the index to *fly* there (exists?) vs a richer
   "dive"; keyboard fly; an **autoplay "guided tour"** mode (no scroll); a
   scrub/progress affordance; haptics/gyro on mobile lite.
3. **AUDIO, WEATHER & TIME** (untouched). Mute-first ambient wind/rotor whose
   pitch/level track altitude + scroll velocity (Web Audio, static-host-safe,
   no asset if synthesised); spatialised cues near the sea/birds. Weather/temporal
   events per leg: rain or snow streaks on a virtual lens, a storm leg with
   lightning, drifting visibility/fog banks beyond the current punch-through, a
   true continuous day-cycle vs the per-leg light snap.
4. **HEAVY RENDERING still deferred + the META-ENABLER**. Raymarched
   **volumetric clouds** (F1 was deferred — re-evaluate with the now-known
   budget); screen-space reflections / planar reflection on the water;
   anamorphic lens flare; a **motion-blur** post pass; chromatic aberration /
   edge vignette; HDR exposure curves. CRUCIAL meta-win: **adaptive quality /
   dynamic resolution scaling** — measure frame time and scale the render
   target (or toggle bloom/rays/birds) to hold 60fps, which would let the
   fill-bound showpieces (god-rays, murmuration, volumetric clouds) ship
   DEFAULT-ON instead of flag-gated. Assess a **WebGPU/TSL** migration now
   (compute particles at 100k, TRAA) with honest cost.

## Laws (every proposal passes or is flagged LAW-BENDING, owner-decision)
Photographs unlit / never graded·bloomed·fogged·**rotated**, rendered in the
separate post-composer pass; 60fps desktop (current peak 57/60 draw calls,
fill-bound at dpr2 — say if an idea needs the adaptive-quality enabler first);
static host, no build step, three@0.160 pinned (new addons only from the pinned
examples/jsm); reduced-motion (static) + mobile (lite) paths intact; new heavy
features default-OFF behind a `?flag` unless they prove they hold 60fps.

## Wave 1 — four parallel agents
(Each: checkpoint FIRST under `.claude/checkpoints/{ts}-flight-frontier/`, all
detail there, inline ≤150 words. Findings: id, title, what it adds, NEW vs
↔doc§, implementation sketch anchored to the module, honest fps/draw-call/fill
cost (label estimates; you MAY measure via `?debug=1` at
http://localhost:8123/?order=alpha, CDP on :9222), effort S/M/L, impact 1–5,
default-on-able? or flag-gated?, law check.)
- **Agent CAMERA** — dimension 1.
- **Agent INPUT** — dimension 2.
- **Agent SENSE** — dimension 3 (audio + weather + time).
- **Agent FRONTIER2** — dimension 4 (deferred heavy rendering + adaptive quality
  + WebGPU). This agent OWNS the question "what unlocks default-on showpieces?"

## Wave 2 — adjudication (you)
HARD-dedupe every finding against BUILD-LOG (shipped) and the three prior docs
(surveyed) — drop or down-tag duplicates, citing where. Adversarially verify any
fps/feasibility claim you lean on against the session's measured numbers (don't
trust unmeasured estimates — label them). Quarantine law-benders (e.g. any
photo depth-parallax/Ken-Burns) in a clearly-labelled section. Note what is
already excellent and needs nothing.

## FLIGHT-FRONTIER.md structure
1. Executive summary — top 10 NET-NEW by impact/effort, each with a one-line
   "what you'd feel" and its default-on-able/flag-gated/needs-adaptive-quality tag
2. The adaptive-quality enabler — assessed first, since it gates several others
3. Findings by dimension (Camera / Input / Sense / Frontier2), NEW vs ↔doc tagged
4. Law-bending quarantine
5. Roadmap — Quick wins / Next wave / Ambitious / Research-grade (WebGPU)
6. Already excellent — leave alone (and the explicit "already shipped/surveyed,
   not re-proposed" list, as proof the dedupe was done)
Report the executive summary + the adaptive-quality verdict inline, then stop.
No implementation — that's a separate future run.
