# Launch Prompt — Handbook Audit + "Art of the Possible" Review

Paste everything below the line into a Claude Code session in this project.
This is a REVIEW workflow: no site file may be modified. The only outputs are
`POSSIBILITIES.md` and agent checkpoints under `.claude/checkpoints/`.

---

You are running a two-sided review of my photography website on **autopilot**,
orchestrating parallel agents: (A) audit the built site against its own
handbooks, and (B) chart everything this technology stack could still do for a
dynamic photography website — texture, detail, resolution, and entirely new
capabilities. Deliverable: `POSSIBILITIES.md`.

## Ground truth to load first
- `BUILD-LOG.md` end-to-end (waves 1–3, altitude path, fidelity upgrade — don't
  re-propose what's already shipped) and `REVIEW.md` (what was already
  adjudicated; unbuilt roadmap items carry forward, not rediscovered)
- `drone-photography-site-build-handbook.md`, `cinematic-web-prompt-handbook.md`,
  and the amendments in `website-workflow-launch-prompt.md`
- `index.html` module in full (current architecture: shuffled waypoints,
  altitude-true smootherstep path, dual-camera rig, light profiles, themed fBm
  terrain, sky dome, MSAA composer, @2400 nearest-photo upgrade, flags
  ?debug/?mat/?grade/?tier) + `assets/`
- Live site: http://localhost:8123 (start `python3 scripts/dev-server.py 8123`
  if down); CDP pattern in `scripts/verify-site.py`; seeds via `?order=`.

**Laws every proposal must respect (or be explicitly flagged as law-bending,
owner-decision):** photographs unlit, never tone-mapped/bloomed/fogged/tinted,
never rotated; 60fps desktop; reduced-motion/no-JS paths; works as a static
host (HF Space / Vercel — no server code).

## Wave 1 — four parallel agents
(Each: checkpoint FIRST under `.claude/checkpoints/{ts}-possibilities/`,
detail there, inline return ≤150 words. Findings: id, title, evidence/source,
what it adds, effort S/M/L, impact 1–5, perf cost, law check.)

### Agent HANDBOOK — compliance & drift audit
Walk both handbooks section by section against the built site, in BOTH
directions: (1) promises not yet honoured (e.g. §2 "production: licensed
display face" — still system stacks; real EXIF; anything else); (2) places the
site now exceeds or contradicts the handbooks (shuffle, altitude path, dual
camera, sky dome — none are §2/§4 canon) → propose concrete handbook
amendments so the docs match reality; (3) the cinematic handbook's pro-levers
checklist (§4/§7) — score the current build against every lever and list any
still unpulled. Output: a compliance table + amendment drafts.

### Agent FRONTIER — what this stack can still do (texture/detail/resolution)
A technically grounded survey of upgrades within Three.js/WebGL2 (and the
WebGPU horizon), each assessed against THIS codebase: raymarched/volumetric
cloud impostors vs the current billboards; god-rays/crepuscular shafts from
the sun; terrain normal/derivative maps + LOD rings or clipmaps vs the single
displaced plane; animated water shader for the sea legs (normal-scrolling
specular) vs the glint plane; GPGPU or instanced particle systems (birds/
murmurations along coastal legs, snow on mountain legs, dust in the canyon);
TAA or SMAA vs current MSAA; lens effects on the ATMOSPHERE camera only
(anamorphic flare, depth-of-field on terrain between meets, exposure
adaptation night→gold); HDR sky with real sun disc + physically-based
atmosphere (Preetham/Hosek-style) vs the gradient dome; instanced scene
furniture per theme (scree, sea stacks, city blocks); photo-presentation
ideas that touch the laws — depth-map 2.5D parallax of photographs, Ken Burns
in-plane drift — present these honestly as LAW-BENDING with exact pixel
implications, never as recommendations. For each: implementation sketch
anchored in the existing module, frame-time estimate, and what it visibly buys
at this site's scale. Use hf/web docs research where it sharpens claims; cite.

### Agent INSPIRATION — research the state of the art (web research agent)
Search and fetch: Awwwards/FWA-level photography portfolios and Three.js
showcase pieces (three.js forum/showcase, Codrops demos, Bruno Simon-school
work, GSAP showcases) for patterns applicable to a *photography-first* site.
For each pattern found: name the live example URL, what it does, whether it
fits the photo-fidelity laws, and what it would mean here (e.g. WebGL page
transitions between flight and archive; scroll-driven shader wipes; cursor
parallax; image-grid hover displacement — law check!; route-drawn map of the
flight; ambient generative audio with mute-first UX; WebXR "stand in the
gallery" mode; PWA offline archive). 8–14 sourced patterns, no vapourware.

### Agent ADDITIONS — product/feature additions for a photography site
Beyond rendering: what should a dynamic photography site HAVE that this one
doesn't yet — EXIF/story panel per photo in the lightbox; a live flight-path
map (the route drawn on a stylised globe/map as you scroll, procedural, no
tiles); per-collection mini-flights; a "random frame" entry point;
share-card generator (OG image per shuffle); print-room AR preview
(law-sensitive); guestbook-free contact nudges; analytics-free view counters
(static-host constraints!); journal/workshops scaffolding criteria from
REVIEW P11; i18n; performance/SEO additions (preload hints, font-display,
speculation rules). Static-host feasibility is a hard filter — say HOW each
works with no server (HF Space), or mark it "needs a backend" honestly.

## Wave 2 — adjudication (you)
Merge; kill law-breakers (or quarantine to a clearly-labelled "law-bending,
Matthew's call" section); de-duplicate against REVIEW.md's surviving roadmap;
sanity-check the FRONTIER frame-time claims against the wave-history numbers
in BUILD-LOG (don't trust unmeasured estimates — label them estimates);
verify INSPIRATION's URLs actually resolve. Note explicitly what is already
state-of-the-art here and needs nothing.

## POSSIBILITIES.md structure
1. Executive summary — top 10 by impact/effort with a one-line "what you'd see"
2. Handbook compliance table + proposed handbook amendments
3. Texture / detail / resolution upgrades (FRONTIER, ranked, each with perf cost)
4. State-of-the-art patterns worth stealing (INSPIRATION, with live URLs)
5. Feature additions (ADDITIONS, static-host-feasible vs needs-backend)
6. Law-bending ideas — photo-presentation experiments, clearly quarantined
7. Roadmap: Quick wins / Next wave / Ambitious / Research-grade
8. What's already excellent — leave alone

Report the executive summary inline, then stop. Implementation is a separate
future workflow.
