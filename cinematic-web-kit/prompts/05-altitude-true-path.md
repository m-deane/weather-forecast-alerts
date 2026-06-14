# Launch Prompt — Altitude-True Flight Path for the Shuffled Route

Paste everything below the line into a Claude Code session in this project.
Single-file change (`index.html` module) + verification + commit.

---

You are editing the flight homepage of my photography site on **autopilot**.
Read first: `BUILD-LOG.md` (waves 1–3 history), then the `<script type="module">`
in `index.html` in full — especially `basePathY`/`pathY`/`pathX`, `tMeetOfZ`,
`panoMaskOf`, the planes placement block, and the HUD altitude interpolation in
`render()`. The §4 photo-fidelity laws hold (photos unlit, never bloomed/fogged,
**never rotated** — the dual-camera rig stays). Dev server runs at
http://localhost:8123; the CDP verification pattern is in `scripts/verify-site.py`.

## The problem

The camera's vertical path is a fixed descent curve that ignores the waypoints'
real altitudes, while the HUD interpolates the true numbers — so on a shuffled
route the HUD says 3,400 m → 5 m → 450 m while the camera barely changes height,
and leg-to-leg motion can feel disconnected from the telemetry.

## The change — fly the actual altitude profile, smoothly

1. **Altitude → scene height mapping.** Derive each waypoint's flight height
   from its real `altM` with a compressive mapping (linear is unflyable across
   3,400 m vs 5 m): e.g. `sceneY(alt) = yMin + k * Math.log1p(Math.max(alt, 0))`
   with a small negative branch for the canyon's −20 m, calibrated so the span
   stays within roughly the current envelope (≈ 9 … 95 scene units, canyon dip
   below terrain preserved). The Milky Way's 3,400 m should read clearly higher
   than the Faroes' 320 m, which reads higher than the Forth's 15 m.
2. **Smooth, kink-free interpolation between waypoint heights.** Replace the
   global descent curve with a per-leg blend through the *shuffled* sequence:
   C1-continuous (cosine/smoothstep per leg or Catmull-Rom through the slot
   heights), with **zero vertical velocity at every photo-meet** — the camera
   levels off briefly at each waypoint so photographs are viewed from a stable
   height, then climbs or descends to the next. Keep the gentle sine
   undulation as a small additive detail, faded out near meets.
3. **Preserve the set pieces**, now expressed through the same system: the
   canyon dip wherever `antelope` lands (its −20 m maps below the terrain
   line); the pano interlude stays level at its 4,100 m-mapped height for the
   whole cruise (`panoMaskOf` logic); the finale at a sea-level waypoint should
   still skim low.
4. **Everything that reads the path follows automatically — verify it does:**
   photo planes are placed at `pathY(tMeet)` (re-check the −3.5/−2 offsets
   still frame correctly at both extreme heights); the terrain corridor is
   flat, but confirm clearance at the *lowest* legs (camera y must stay above
   corridor terrain + ~4 units except the deliberate canyon dip); cloud-bank
   heights (y 28–74) may now sit below high legs — scale each bank's y toward
   the path height at its z so punch-throughs still happen on every route.
5. **HUD agreement.** The HUD already lerps real altitudes between slots —
   switch its interpolation to sample the *same* eased curve the camera uses
   (inverse of the mapping at the camera's current height, or ease the lerp
   identically), so the number and the motion accelerate/decelerate together.
   The pano pin at 4,100 stays.
6. **Climb feel (small, optional polish):** on climbing legs, bias the lookAt
   slightly upward (and downward when descending) proportional to the leg's
   gradient, zeroed at meets — the nose follows the flight. No camera roll on
   photos, ever.

## Verification (tool-grounded, before reporting done)

- `node --check` on the extracted module after every edit.
- Two seeds (`?order=alpha`, `?order=bravo`) headlessly: screenshot at every
  waypoint meet — photo centred, level, fully opaque; HUD shows that
  waypoint's exact altitude at its dwell (the +6 meet offset convention).
- Screenshot mid-leg on the steepest climb of each seed (e.g. 5 m → 3,400 m):
  visible height change against the terrain/horizon, no kink at the meet
  before/after, clouds still materialise and punch on at least one bank.
- Confirm canyon dip + pano cruise unchanged in feel; confirm lite/static
  modes untouched (they don't use the 3D path).
- Regression: full `scripts/verify-site.py` (13 checks) + `check-meta.py`.
- Append a BUILD-LOG entry (what changed, measured evidence) and commit
  (conventional message, no push).

Report the verification checklist line by line with the seed screenshots, then stop.
