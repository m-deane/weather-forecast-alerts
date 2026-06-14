# Cinematic Web Kit

A portable kit of **rendering, motion and design skills** for building
scroll-driven 3D photo-flight websites — distilled from the Matt Deane
photography portfolio so the same techniques can be reused in any new project.

The signature outcome: a visitor scrolls and *flies* a cinematic drone path
through a procedural 3D world, with the owner's photographs appearing as
pixel-perfect waypoints — never lit, graded, bloomed, fogged, or rotated by the
atmosphere around them. Static-host, no build step, holds 60 fps.

This folder is **self-contained and project-agnostic**. It carries the handbooks
(the source briefs), the launch prompts (the multi-agent build workflows that
actually produced the site), the review/roadmap docs (how it was critiqued and
extended), the verification scripts (CDP harnesses + dev server + deploy), the
build journal (the living record of what shipped and why), and `PATTERNS.md`
(the transferable techniques, mechanism-by-mechanism).

---

## What's in here

```
cinematic-web-kit/
├── README.md            ← you are here: index + how to bootstrap a new project
├── PATTERNS.md          ← THE payload: reusable techniques (A–F), mechanism + code shape
├── handbooks/           ← the two source briefs you start a new project from
│   ├── cinematic-web-prompt-handbook.md        — the rendering/motion playbook
│   └── drone-photography-site-build-handbook.md — the site-spec playbook
├── prompts/             ← the launch prompts that drove each build wave (paste-ready)
│   ├── 01-one-shot-flight-artifact.md
│   ├── 02-integrated-multipage-site.md
│   ├── 03-decisions-and-overhaul.md
│   ├── 04-fidelity-upgrade.md
│   ├── 05-altitude-true-path.md
│   ├── 06-photo-matched-geometry.md
│   ├── 10-design-review.md
│   ├── 11-possibilities-review.md
│   ├── 12-research-note-review.md
│   └── 13-flight-frontier-review.md
├── reviews/             ← the critique + roadmap outputs (what to build next, what's a trap)
│   ├── REVIEW.md                 — design/animation/page review + quick-wins
│   ├── POSSIBILITIES.md          — the FRONTIER catalogue (F-items) of what the tech can add
│   ├── RESEARCH-REVIEW.md        — external research-note items, adjudicated
│   ├── RESEARCH-NOTE-REVIEW.md   — the "selective bloom required" claim, falsified by measurement
│   └── POLY-MATCH-ROADMAP.md     — photo-matched per-leg geometry plan (landform data-model)
├── scripts/             ← reusable verification + ops tooling
│   ├── dev-server.py     — no-store static server on :8123 (reloads always fresh)
│   ├── verify-flight.py  — CDP harness: dwell altitudes, draw-call budget, photo-fidelity, console
│   ├── verify-site.py    — multipage CDP harness (links, meta, a11y)
│   ├── check-meta.py     — per-page SEO/OG/meta audit
│   ├── derive-images.sh  — responsive-image + IPTC-embed pipeline
│   └── deploy-hf.py      — generalized deploy to a Hugging Face static Space
└── build-journal/
    └── BUILD-LOG.md      — the living record: every phase, what shipped, every bug found & fixed
```

**Read order for a newcomer:** `PATTERNS.md` first (the why + the mechanisms),
then skim `build-journal/BUILD-LOG.md` (proof each pattern shipped and what broke),
then the two `handbooks/` (the briefs you'll adapt), then `reviews/` when you want
the menu of what to build next.

---

## The one idea to take away

**Outcome paired with mechanism.** "Make it cinematic" produces nothing.
"Selective bloom via a separate scene pass + exp2 fog + an UnrealBloom composer
tuned to one named palette, photos rendered *after* the composer so they stay
bit-identical" is buildable, verifiable, and reusable. Every pattern in
`PATTERNS.md` is a mechanism bolted to an outcome — that is the skill being
transferred, not any one line of code.

The non-negotiable keystone (PATTERNS §A1): **render pixel-exact content in a
separate scene/camera *after* the post-processing composer.** This is stronger
and simpler than layer-bloom, and it was proven by measurement — a photo pixel
stayed bit-for-bit identical (14,2,1 → 14,2,1) next to a 249-bright sun while the
atmosphere was re-graded around it.

---

## How to bootstrap a new cinematic-web project from this kit

### 0. Decide the two switch variables first
- **What is the pixel-exact content?** Photos, artwork, product shots, type — the
  thing that must NOT be touched by post-processing. This drives the dual-pass
  isolation (PATTERNS §A).
- **What is the journey?** A flight, a descent, an orbit, a walk. This drives the
  waypoint list and the scroll→t camera path (PATTERNS §C).

### 1. Start from a handbook, not a blank page
- `handbooks/cinematic-web-prompt-handbook.md` is the rendering/motion brief —
  copy it, swap the palette/journey/content, keep the laws.
- `handbooks/drone-photography-site-build-handbook.md` is the site-spec brief
  (pages, content model, a11y/SEO/perf budgets) — copy it if you're building a
  full multi-page site, skip it for a one-page showpiece.

### 2. Build in waves, each driven by a launch prompt
The prompts in `prompts/` are the actual multi-agent workflows that built this
site, in order. Re-use them as templates — each is a self-contained brief with
laws, agent decomposition, and verification gates:

1. **`01-one-shot-flight-artifact`** — get a single working `index.html` flight
   first (one module, pinned-CDN Three.js + GSAP + Lenis). Prove the dual-pass
   isolation and the scroll path before anything else.
2. **`02-integrated-multipage-site`** — grow the one-shot into a real site
   (portfolio / collections / lightbox / about / contact) with shared nav + budgets.
3. **`03-decisions-and-overhaul`** — the content/UX decision round (ordering,
   pricing, what to cut, the photos-never-rotate law).
4. **`04-fidelity-upgrade` / `05-altitude-true-path`** — raise rendering fidelity
   (sky dome, fBm terrain, MSAA composer) and make the camera path altitude-true.
5. **`06-photo-matched-geometry`** — the landform data-model that makes each leg's
   terrain *rhyme* with its photo (see `reviews/POLY-MATCH-ROADMAP.md`).
6. **`10`–`13` reviews** — once it's shipped, run the review prompts to find
   quick-wins, catalogue what the tech can still add, and adjudicate external
   research claims by measurement (never by assertion).

The meta-pattern (PATTERNS §D): **design (parallel spec agents) → implement
(serial, one self-contained block per phase) → adversarially verify (a skeptic
agent + a tool-grounded harness).** Don't trust an unmeasured fps/feasibility
claim — measure it.

### 3. Verify with the scripts, not by eye
Start the dev server, point a CDP Chrome at it, run the harness:
```bash
python3 scripts/dev-server.py            # serves the project root on :8123, no-store
# in another shell, launch Chrome with:
#   --remote-debugging-port=9222 --remote-allow-origins=*
python3 scripts/verify-flight.py         # 9 dwell altitudes, draw-call budget, photo-fidelity, console
python3 scripts/verify-site.py           # multipage: links, meta, a11y
python3 scripts/check-meta.py            # per-page SEO/OG audit
```
`verify-flight.py` carries an `EXPECT` dict of dwell altitudes and a `MAX_CALLS`
draw-call budget — edit those to your own waypoints. The photo-fidelity check is
the one that protects the keystone law: it samples a photo pixel at a high-bloom
dwell and confirms the image was never graded.

### 4. Ship to a static host
`scripts/deploy-hf.py` deploys to a Hugging Face static Space (takes the repo as
an argument, auto-discovers the directory, swaps placeholder domains). Any static
host works — there is no build step. **Note the static-host directory-URL quirk**
(PATTERNS §F / §D5): pretty directory URLs may 404; rewrite links to
`/dir/index.html`. Deploying/publishing is an external action — do it on explicit
request, not automatically.

---

## Reusing just the techniques (no new site)

If you only want to lift a technique into an existing project, go straight to
`PATTERNS.md`. Its sections:

| § | Theme | Headline patterns |
|---|-------|-------------------|
| **A** | Image fidelity — the laws | dual-pass isolation, unlit/sRGB/tone-mapped-off material, dual-camera rig |
| **B** | Procedural atmosphere & geometry | fBm terrain, landform data-model, instancing (1 draw call/feature), distance-cull, sky dome, water shader, curl-noise particles, god-rays, GPGPU flocking, fog-tint, flag-gating |
| **C** | Motion, scroll & the day-arc | piecewise scroll→t mapping, altitude-true path, Lenis sync, reveals, day-arc light, three-mode degradation |
| **D** | Engineering meta-skills | design→implement→adversarially-verify, tool-grounded verification, budget discipline, reproducible randomness, static-host realities, version pinning |
| **E** | Design language | the typographic + palette + restraint conventions that read as "editorial," not "demo" |
| **F** | The traps | the hard-won failure modes (scroll/text desync, draw-call shuffle-fragility, GLSL-in-template-literal, static-host URLs, …) |

Each pattern is written as **what it is → why → the key code shape**, so it
transfers without dragging the whole project along.

---

*This kit is a snapshot of working, verified techniques — not a framework. There
is nothing to install. Copy what you need, keep the laws in §A, and verify with
tools rather than by eye.*
