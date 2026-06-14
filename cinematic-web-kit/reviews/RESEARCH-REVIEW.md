# RESEARCH-REVIEW — the geometry/particles note vs the built app

Two-agent review, 2026-06-13 (CORRECTNESS measured the live site; OPPORTUNITY
ranked the new ideas) + adjudication. Review-only: no site file modified.
Reviewing `b91fe86a-researchgeometryparticlesupgrades.md` against the *shipped*
app (the note reads as written against the original single-scene prototype).
Full detail + the bloom toggle harness in
`.claude/checkpoints/20260613-research-review/agent-*.md`. Adjudication
re-verified the three structural claims the report rests on (render sequence
index.html:1275–1280, `flatShading:true` :787, per-leg fog tint :1195).

## 1. The headline claim — FALSIFIED for this app (measured)

The note's one "required correction": *bloom affects the entire frame including
your photographs; `MeshBasicMaterial` doesn't protect from the composer; you
must use selective bloom via layers / two composers.*

**That is true of the prototype the note describes, and moot for the app as
built.** CORRECTNESS settled it by measurement, not theory — a differential
bloom toggle at the golden-hour dwell (same seed, same pixel), bloom strength
0.5 → 0.0:

- Photo's sampled dark pixel: **(14,2,1) → (14,2,1)** — bit-for-bit identical,
  sitting directly beside a 249-bright rendered sun; and it matches the source
  `p09` JPEG's darkest tone (15,4,0).
- The atmosphere sky in the same frame shifted up to **Δ−7** under the same
  toggle — proving bloom is genuinely active, and simply never reaches the photo.

**Why:** the app doesn't rely on material choice at all. It renders the
photographs in a *separate scene through a separate camera, after the whole
composer finishes* — `renderer.clear(); composer.render(); renderer.clearDepth();
renderer.render(photoScene, photoCam)` (index.html:1275–1280). The photographs
are never in the composer's input, so bloom/tone-map/grade physically cannot
touch them. This is **simpler and stronger** than the note's recommended
layer-based selective bloom (no bloom layer to maintain, no second composer to
combine). No change needed; the note is outdated on its central point.

## 2. Note recommendations × shipped status

| Note item | Status | Evidence |
|---|---|---|
| Headline: selective bloom required | **MOOT / OUTDATED** | separate photo pass (1275–1280); measured zero contamination |
| Import-map + pinned version + OutputPass | **SHIPPED** | three@0.160 pinned w/ SRI; composer ends on OutputPass |
| A1 normal maps on terrain | **NOT DONE** | terrain is `MeshStandardMaterial` w/ vertex colours, no normalMap (:787) |
| A2 FBM-noise displacement | **SHIPPED/exceeded** | seeded 5-octave fBm, 160×260 (BUILD-LOG fidelity entry) |
| A3 tri-planar + slope blending | **PARTIAL** | slope-aware vertex *colours* shipped; no tri-planar *texture* blend |
| A4 aerial-perspective fog tint | **PARTIAL (~80%)** | per-leg FogExp2 colour interpolates toward haze (:1195); no explicit view-direction/distance haze term |
| A5 LOD / segment scaling | **PARTIAL** | static TIER (`?tier=flight-lite`) reduces density; not true distance LOD |
| B1 soft radial-alpha sprites | **SHIPPED** | 128px canvas sprite on all Points (`particleSprite()`) |
| B2 depth-aware soft particles | **NOT DONE** | no depth-texture alpha fade |
| B3 curl-noise drift | **NOT DONE** | particles use sine drift (motes/snow/dust) |
| B4 GPGPU sim | **NOT DONE (correctly)** | note itself says unnecessary for ambient haze |
| Avoid-list (SSAO/SSR, multi-shadow, dense-everywhere, grading photos) | **HONOURED** | none present |

**The note is outdated about:** the bloom "correction" (§1), B1 soft sprites
(done), A2 displacement (done), the §-phase mapping (the phase structure was
superseded by the wave workflow), and three@0.184 (see §4).

## 3. Genuinely-new opportunities (ranked, reconciled with POSSIBILITIES.md)

Of the note's nine ranked items: 3 already shipped, 2 sharpen existing
POSSIBILITIES entries, **3 genuinely new**.

1. **A4 — aerial-perspective fog tint** · NEW (POSSIBILITIES missed it) · S ·
   impact 2–3 · ~0 ms, 0 draw calls. The cheapest high-impact win the note
   surfaces. FogExp2 + the dome already carry ~80%; the refinement is a
   view-direction/distance haze term (~15 GLSL lines) so distant terrain melts
   toward `--haze` and reads as genuine altitude. Plumbing (`fogColor`, dome
   shader) already exists.
2. **B3 — curl-noise particle drift** · NEW · S–M · impact 3. The only
   *route-wide* atmosphere upgrade (every leg has motes); swaps the sine drift
   on the `makePoints`/`fieldFromLegs` fields for a curl-noise flow field in a
   time uniform — "floating" → "alive". Gentle velocities so it reads as air.
3. **A1 — procedural normal map from the fBm heightmap** · ↔ POSSIBILITIES F3a
   (the note sharpens it with the bake-from-FBM recipe) · M · impact 3–4 ·
   canyon/ridge legs only. **Honest tension:** the terrain is `flatShading:true`
   (:787) — a deliberate low-poly look that *discards* smooth normals, which a
   normal map needs. Adding it either changes the aesthetic (smooth shading) or
   must be a high-frequency-only derivative term layered on flat faces.
   Recommend low-amplitude, flag-gated, A/B for taste — not an unconditional win.
4. **B2 — depth-aware soft particles** · NEW · M · impact 2–3. Fades particle
   alpha where haze meets terrain/cloud (needs depth-texture access). Nice for
   the low-altitude/canyon dust just added; moderate complexity for a subtle gain.

**Already in the roadmap (do not duplicate):** A1 ↔ POSSIBILITIES F3a;
A5 LOD ↔ F3b (FRONTIER verdict **skip** for a fixed −z corridor — the note does
not change that; static TIER already covers the mobile case).

## 4. three@0.160 vs the note's @0.184 — keep 0.160

No functional driver to bump: the OutputPass colour pipeline the note worries
about is already correct, every addon used resolves at 0.160, and a bump forces
regenerating all four SRI hashes + a full re-verification of the photo-pass
isolation law for zero visible gain. The note's version advice was about
*avoiding `@latest`* — which this build already honours (pinned + SRI).
Revisit only as part of a deliberate WebGPU/TSL wave (POSSIBILITIES F-WebGPU).

## 5. Top-5 do-next, and what to leave alone

**Do next (all law-safe, all atmosphere-only):**
1. A4 aerial fog-tint (S, ~0 ms) — cheapest, the note's best catch
2. B3 curl-noise drift (S–M) — route-wide "alive" upgrade
3. A1 normal map, flag-gated low-amplitude, canyon/ridge (M) — A/B for taste
4. B2 depth-aware soft particles (M) — pairs with the new snow/dust
5. (from POSSIBILITIES, higher impact than any note item) F9 instanced
   furniture + F4 water + F2 god-rays remain the bigger atmosphere wins

**Leave alone:** the bloom architecture (measured-perfect, simpler than the
note's fix); A3 tri-planar (vertex-colour slope shading already reads well from
the air; UV-stretch is a non-issue on noise terrain); A5 LOD (skip for the
fixed corridor); B4 GPGPU (unnecessary, per the note itself); the version pin.

**Net:** the note is a sound general reference whose single "required
correction" doesn't apply here (the app already solved it better), most of
whose A-tier is shipped, and which contributes exactly one cheap win
POSSIBILITIES had missed — the aerial fog-tint.
