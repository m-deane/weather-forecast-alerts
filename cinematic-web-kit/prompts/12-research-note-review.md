# Launch Prompt — Review the Research Note Against the Built App

Paste everything below the line into a Claude Code session in this project.
Review-only: no site file may be modified. Output: `RESEARCH-REVIEW.md` (+ agent
checkpoints). The point is to test the note's claims against what's *actually
shipped* — not to re-propose things already done, and not to accept the note's
assumptions (it appears to describe the original single-file prototype, not the
current app).

---

You are reviewing an external research note against my photography website on
**autopilot**, orchestrating parallel agents. The note:
`/Users/matthewdeane/.claude/uploads/bf520170-b957-4358-b588-3820b06c4434/b91fe86a-researchgeometryparticlesupgrades.md`
— "Higher-Detail Geometry, Texturing & Particles", ranked upgrades for the
aerial-flight homepage (normal maps, FBM displacement, tri-planar/slope
blending, aerial-perspective fog tint, LOD; soft sprites, depth-aware soft
particles, curl-noise drift, GPGPU; and a headline claim that "bloom on
atmosphere only can't be done by material choice alone — you need selective
bloom via layers / two composers").

**Critical framing:** the note reads as written against the *original prototype*
(it cites three@0.184, the §-phase handbook, "MeshBasicMaterial doesn't protect
from the composer"). The current app has moved well past that — so the job is
not to implement the note, but to **adjudicate it against reality**: what's
already shipped (and how it compares to the note's recommended technique),
what's genuinely new and worth doing, and where the note is simply outdated.

## Ground truth to load first
- The research note (path above) — read in full.
- `index.html` `<script type="module">` IN FULL — the live architecture:
  dual **scene + camera** photo isolation (`photoScene`/`photoCam`, rendered
  AFTER `composer.render()` via `renderer.clearDepth()` then
  `renderer.render(photoScene, photoCam)`), MSAA half-float `EffectComposer` +
  `UnrealBloomPass` + `OutputPass`, seeded 5-octave fBm terrain (160×260) with
  slope-aware vertex colours + a tiling canvas detail map, soft radial-sprite
  particles (the note's B1 — already done), gradient sky-dome ShaderMaterial,
  per-leg light profiles, themed terrain, three@0.160 pinned with SRI.
- `BUILD-LOG.md` (what shipped, every wave) and `POSSIBILITIES.md` (the prior
  frontier survey — FRONTIER already costed normal maps, LOD, god-rays, water,
  instancing, etc.). **Reconcile against both; do not re-derive or duplicate.**
- Dev server http://localhost:8123 (`python3 scripts/dev-server.py 8123` if
  down); CDP harness pattern in `scripts/verify-site.py`; seeds via `?order=`.

Laws (every proposal respects or is flagged): photos unlit / never
graded·bloomed·fogged·rotated; 60fps desktop; static host; reduced-motion +
lite/no-JS paths; mobile stays lite.

## Wave 1 — two parallel agents

(Each: checkpoint FIRST under `.claude/checkpoints/{ts}-research-review/`, all
detail there, inline ≤150 words. Findings: id, note-section ref, verdict,
evidence, effort S/M/L, impact 1–5, perf cost.)

### Agent CORRECTNESS — adjudicate the note's claims against the code
1. **The headline bloom claim — verify empirically, adversarially.** The note
   says bloom contaminates the whole frame and material choice can't stop it,
   so layer-based selective bloom is "a required correction." The app instead
   isolates photos in a *separate scene rendered after the composer*. Settle it
   with measurement, not theory: on the live site (CDP), sample pixel RGB of a
   known photo-plane region at a waypoint dwell **with bloom on vs forced off**
   (toggle the bloom pass via the console), and of a bright atmosphere region
   as a control. Conclude one of: (a) the two-pass architecture already gives
   full photo protection → the note's "correction" is moot here and the current
   approach is *simpler* than layer bloom (say so); (b) there is measurable
   contamination → the note is right and quantify it. Either way, report the
   pixel numbers.
2. **Per-item shipped-status table** for every note recommendation (A1–A5,
   B1–B4, the avoid-list): ALREADY-SHIPPED / PARTIAL / NOT-DONE / N-A, each with
   file:line or BUILD-LOG evidence. Flag where the note is outdated (e.g. B1
   soft sprites already done; fBm displacement done; the §-phase mapping no
   longer maps to anything).
3. **Version question:** three@0.160 (pinned, SRI) vs the note's @0.184 — is
   there a concrete reason to bump (addon/API drift, the OutputPass colour
   note), or is 0.160 fine? Recommend with evidence; if bump, list the SRI/API
   re-verification cost.

### Agent OPPORTUNITY — the genuinely-new, ranked & reconciled
For each note item NOT already shipped, assess against THIS codebase with an
implementation sketch anchored to the real module (name the functions it
extends), perf cost (label estimates), and law check — then **cross-reference
POSSIBILITIES.md**: mark each as NEW vs ALREADY-IN-ROADMAP (and if already
there, add only what the note sharpens). Cover at least: A1 procedural normal
map from the fBm heightmap (note's #1 — and the tension it raises: normal maps
need *lit* terrain, which the build already does for terrain only — does this
change the look?); A3 tri-planar + altitude/slope **texture** blending (vs the
shipped slope-aware vertex *colours* — what does tri-planar add?); A4
aerial-perspective fog tint (cheap, claimed high payoff — is it already implicit
in the fog/dome?); A5/LOD (FRONTIER said skip — does the note change that?);
B2 depth-aware soft particles (haze meeting terrain without hard lines);
B3 curl-noise drift (vs the current sine drift on motes/snow/dust). Produce a
ranked "do next" list distinguishing note-only ideas from note∩POSSIBILITIES
overlaps.

## Wave 2 — adjudication (you)
Resolve the bloom question definitively from CORRECTNESS's measured numbers
(this is the note's central claim — get it right). Merge the two agents; drop
anything already shipped or already in POSSIBILITIES (cross-reference, don't
duplicate — point to the existing entry); keep a short "note is outdated about
X" list so the research note can be annotated. Verify any pixel/perf claim you
rely on rather than trusting it.

## RESEARCH-REVIEW.md structure
1. Verdict on the headline bloom claim — with the measured pixel evidence
2. Note recommendations × shipped-status table (with the "outdated about X" calls)
3. Genuinely-new opportunities, ranked (effort/impact/perf/law), each tagged
   NEW or ↔POSSIBILITIES.md§n
4. The three@0.160 vs 0.184 recommendation
5. Top-5 do-next, and what to leave alone
Report the bloom verdict + top-5 inline, then stop. No implementation.
