# Review Workflow Launch Prompt — Site Critique & Enhancement Plan

Paste everything below the line into a Claude Code session in this project to run
a multi-agent **review** of the photography website. This workflow reviews and
proposes — it must not modify the site.

---

You are running a structured design/engineering/content review of my photography
website, on **autopilot**, orchestrating parallel review agents. The deliverable
is a single report: `REVIEW.md`. **No agent may modify any site file** — the only
files this workflow writes are `REVIEW.md` and agent checkpoints under
`.claude/checkpoints/`.

## Ground truth to load first

- `BUILD-LOG.md` — what was built, verified, and already known to be open
- `index.html` — the Three.js flight homepage (verified working; treat its §4
  constraints as law: photo fidelity, bloom-never-on-photos, reduced-motion, dpr cap)
- `assets/` (tokens.css, site.css, data.js, site.js, lightbox.js/css) and the
  page files under `portfolio/`, `prints/`, `about/`, `contact/`
- `drone-photography-site-build-handbook.md` + `cinematic-web-prompt-handbook.md`
  + the amendments section of `website-workflow-launch-prompt.md`
- The **photographs themselves** in `photos/` (view the `@1400.jpg` files with the
  Read tool — all 16: p01–p16). The content agent must look at every image; other
  agents look at any image their suggestions touch.

A dev server may already be running at http://localhost:8123 (check; if not,
start `python3 -m http.server 8123` in the project root). For live inspection,
reuse the established headless-Chrome CDP pattern (`scripts/verify-site.py`,
BUILD-LOG.md) — screenshots at multiple scroll depths and viewports are expected
evidence for visual claims.

## Review protocol

**Wave 1 — four parallel review agents** (each: checkpoint file FIRST at
`.claude/checkpoints/{ts}-review/agent-{X}.md`, all detail there, inline return
≤150 words; each returns findings as a structured list — id, title, evidence
(file:line or screenshot), proposal, effort S/M/L, impact 1–5):

- **Agent MOTION — animations.** Scroll-scrub feel (piecewise mapping smoothing
  0.085, Lenis 1.15), title per-word reveals and yield timing, caption/meta
  reveal choreography, cloud-veil transitions, preloader, hero entrance, archive
  pages' IntersectionObserver reveals, lightbox open/close/zoom transitions,
  hover micro-interactions, easing-token consistency across flight vs archive.
  Propose concrete enhancements (values, easings, choreography), each with a
  reduced-motion story.
- **Agent RENDER — 3D.** Terrain quality (sine-field displacement — convincing?
  noise octaves? silhouette at horizon?), lighting, palette interpolation stops,
  sun/halo staging, cloud-plane construction vs the veil trick, particle field
  (sprite quality, density, parallax layers), photo-plane presentation (size,
  framing, entrance/exit, possible depth effects that do NOT touch photo pixels),
  camera path drama (banking? look-at easing? canyon dip), post stack (bloom
  params, possible vignette/grain on atmosphere only), and performance (draw
  calls, texture memory at @1400, dpr strategy, mobile-lite ceiling). Every
  proposal must respect: unlit photos, no tone-map/bloom on photos, 60fps desktop.
- **Agent PAGES — UX/IA.** Every page at 1440/768/390 + keyboard-only pass:
  header (flight fade-in timing, current-page marking), portfolio hub hierarchy,
  collection grids (the p03 panorama row, hover labels, ordering), lightbox UX
  (zoom affordance, counter, captions), prints page persuasiveness vs
  alexnail.com / northlandscapes.com patterns, about/contact completeness, footer,
  404 page (missing?), cross-linking between flight waypoints and their archive
  collections, SEO depth (structured data? per-photo pages?), a11y gaps beyond
  what BUILD-LOG covers.
- **Agent CONTENT — photography & copy.** View ALL 16 photos. Assess: which
  images are under-used or mis-collected; whether the 8-waypoint flight uses the
  strongest sequence; captions/titles/blurbs quality (tone: National Geographic
  restraint); what the archive lacks (image counts per collection are thin —
  what shot types would round each out, as a shoot list for Matthew); per-photo
  feature inspiration (e.g. p03's 11:1 panorama → a dedicated horizontal-scroll
  moment; p07 fireworks → finale particle burst; p12 Milky Way → constellation
  detail in the night phase; p06/p15 wildlife → an essay format unlike the
  landscape grids). Also: bio/prints copy placeholders — propose final copy
  drafts Matthew can edit, clearly marked as drafts.

**Wave 2 — adjudication (you, sequentially).** Merge findings; discard anything
that violates the §4 constraints or contradicts BUILD-LOG verified behaviour;
where MOTION/RENDER proposals conflict, resolve explicitly. For each surviving
item, sanity-check the evidence (open the file/screenshot yourself — do not
trust an agent's claim you can cheaply verify). Note explicitly what is already
strong and should NOT be changed (epistemic balance — this is a critique, not a
rewrite hunt).

## REVIEW.md structure

1. **Executive summary** — top 10 enhancements by impact/effort
2. **What's working** — verified strengths to preserve
3. **Findings by area** (Motion / 3D / Pages / Content) — each: evidence,
   proposal, effort, impact, constraint check
4. **Photo-driven inspiration** — ideas sourced from specific images
5. **Shoot list** — gaps in the archive, as concrete photographic briefs
6. **Roadmap** — Quick wins (≤1h each) / Next build wave / Ambitious
7. **Copy drafts** — bio, prints, collection blurbs (marked DRAFT)

Finish by reporting the executive summary inline and stopping. Do not implement
anything — implementation is a separate, future workflow.
