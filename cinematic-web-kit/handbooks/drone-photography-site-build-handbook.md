# Build Handbook — Aerial Landscape Drone Photography Portfolio

*A complete, self-contained brief for iteratively building the site with Claude. The whole site is a single continuous flight over a landscape; the photographs are waypoints revealed along the descent.*

---

## 0. How to use this handbook

This document is written to be **handed to Claude**. It contains the locked creative decisions, the technology rules, and a phase-by-phase build plan.

- **Build in phases.** One phase per turn. Claude builds a phase, shows it, and stops. You verify against the acceptance criteria, give feedback, and only then say *"proceed to Phase N."* Do not let it skip ahead.
- **Two contexts.** Prototype the flight in a **claude.ai HTML artifact** (single self-contained file, CDN imports). Build the production multi-file version in **Claude Code → Vercel**, with real fonts and your own images.
- **Start with the kickoff prompt in §9.** After that, each turn is just *"proceed to Phase N"* plus any notes.

---

## 1. The concept

The visitor doesn't scroll a website — they **fly**. Scrolling moves a camera forward and gently down over a procedural landscape, descending past each photograph in turn, passing through cloud layers between chapters. Photographs are presented like waypoints; the only interface is a minimal drone-telemetry HUD. The emotional target: a National Geographic / *Sidetracked* photo essay with the production polish of an Apple launch page.

The site must still work as a **beautiful static photo essay** if every clever layer is stripped away. That fallback is built first (Phase 1) and never sacrificed.

---

## 2. Design system — the locked decisions

Claude should treat these as fixed unless told otherwise, and express them as CSS custom properties / JS constants so they're changed in one place.

### Palette — blue-hour → golden-hour aerial atmosphere
```
--night:   #0B1026   /* deep indigo, top of sky / night */
--dusk:    #1B2A4A   /* slate blue, mid sky */
--haze:    #5B6E8C   /* cool grey-blue, fog + distance */
--horizon: #C97B3C   /* warm amber, horizon glow */
--sun:     #F4C77B   /* pale gold, highlights + bloom tint */
--ink:     #F2F4F8   /* near-white, primary text */
--mute:    #9AA7BD   /* muted, captions + telemetry */
```
Fog, particles and bloom all share this gradient's hues. (Swappable — this is the default.)

### Typography
- **Display** (location titles): refined editorial face. Prototype: a system serif stack (`Charter, Georgia, "Times New Roman", serif`). Production: a licensed display face. Oversized, fluid `clamp()` sizing, tight tracking.
- **Neutral** (captions, telemetry, body): a clean grotesque. Prototype: `-apple-system, "Helvetica Neue", Arial, sans-serif`. Production: Inter or similar.
- Note: **Google Fonts may be blocked in the artifact sandbox** — use the system stacks for the prototype and swap real fonts in the Claude Code build.

### Motion language
```
--ease-reveal: power3.out     /* photo + text entrances */
--ease-scene:  expo.out       /* big altitude / scene changes */
--dur-fast:    0.6s
--dur-slow:    1.2s
stagger:       0.05–0.1s
```
One consistent motion language everywhere. Inconsistent easing is the main thing that makes a polished-looking site feel amateur.

### Layout & UI principles
- No traditional nav bar. Navigation *is* the flight, plus an optional minimal location index that flies the camera to a shot when tapped.
- Minimal glassmorphism telemetry HUD as the only persistent UI.
- Oversized titles briefly own the frame, then yield to the photograph.

### Content model — make the site data-driven
The whole experience is generated from one array, so adding a shot is editing data, not code:
```js
const LOCATIONS = [
  {
    id: 'forth',
    title: 'Firth of Forth',
    coords: '56.0021° N, 3.1700° W',
    altitude: '120 m',
    lens: 'Mavic 3 Pro · 24mm · ƒ/2.8 · 1/240s',
    image: 'assets/forth.jpg',
    caption: 'Dawn haze over the estuary.'
  },
  // Quiraing, Glencoe, Northumberland coast, ...
];
```
Telemetry HUD fields, photo planes, and the location index all read from this.

---

## 3. Technology stack — how to prompt each, applied to this site

Condensed from the reference handbook and specialised for a *photography* site.

### Three.js + WebGL — the flight space
- Photographs are flat **planes** at varying depths/altitudes; the camera flies past and through them. Procedural geometry only (low-poly terrain below, cloud planes) — no external 3D models.
- **Colour management is the whole ballgame for a photo site:** renderer in **SRGB output colour space**; photos on **`MeshBasicMaterial` (unlit)** so scene lights never darken/tint them; **tone mapping OFF the photo planes.** Apply grading/tone mapping only to the atmospheric layer.
- Antialiasing on; cap `devicePixelRatio` at 2; resize handler; cap photo textures ~2048px longest edge.

### GSAP + ScrollTrigger — the camera flight
- ScrollTrigger with `scrub` drives the flight path; fire-once `toggleActions` for text/UI reveals.
- Easing/duration tokens from §2. Set initial states with `gsap.set()` to kill load flashes.

### Lenis — smooth scroll
- Sync to ScrollTrigger via `lenis.on('scroll', ScrollTrigger.update)`, driven from `gsap.ticker`, so the flight stays locked to scroll. Soften/disable on touch. Honour `prefers-reduced-motion`.

### Atmosphere — particles, fog, bloom
- Capped particle field (a few thousand, `AdditiveBlending`, slow drift).
- Faked volumetric cloud: `scene.fog` (exp2) + layered transparent cloud planes the camera passes through between sections.
- **`UnrealBloom` on sky/sun/particles ONLY — never on the photographs.**

### Glassmorphism telemetry HUD
- Low-alpha bg, `backdrop-filter: blur(14–16px)`, hairline border, soft shadow, with a fallback. High-contrast, legible text. Updates location/coords/altitude/lens as you fly past each shot.

### Typography motion
- Staggered per-word title reveals tied to scroll. **Split text into spans manually — do NOT use GSAP SplitText (paid plugin).**

---

## 4. Non-negotiable constraints (the traps)

Claude must respect all of these:

1. Photos: **unlit + tone-mapping-off + sRGB.** Colour fidelity beats effects.
2. **Bloom on atmosphere only**, never on images.
3. **No GSAP / React Three Fiber / Lenis in a React artifact** — they aren't in the whitelist. Use a single **HTML artifact** with CDN imports.
4. **SplitText is paid** → manual span splitting.
5. **Procedural geometry only** — no Blender/Spline assets to import.
6. **Google Fonts may be blocked in the sandbox** → system font stacks for the prototype.
7. **No `localStorage`/`sessionStorage`** in artifacts — keep state in memory.
8. **Mobile gets a lightweight fallback**, not the full real-time flight.

---

## 5. The iterative build plan

**Claude: build only the current phase, output the complete file, summarise what changed and what to inspect, then stop and wait.** Each phase depends on the previous one being stable.

### Phase 0 — Scaffold & foundations
- **Build:** single HTML file; pinned CDN imports (Three.js, GSAP+ScrollTrigger, Lenis); page skeleton; all design tokens from §2 as CSS variables / JS constants; font stacks; a global `prefers-reduced-motion` switch; the `LOCATIONS` array stub.
- **Acceptance:** loads with no console errors; tokens defined; fonts render; reduced-motion flag readable in JS.

### Phase 1 — Editorial layout & typography (no 3D, no motion)
- **Build:** the entire site as a clean, static, scrollable photo essay — hero, one section per location (title, photo, caption, telemetry block), location index, footer. Perfect the type system and responsive behaviour.
- **Acceptance:** reads beautifully as a static essay; fully responsive; legible; this is the permanent safety net.

### Phase 2 — Smooth scroll + scroll reveals (still 2D)
- **Build:** add Lenis, sync to ScrollTrigger; staggered per-word title reveals and section fade-ins using the motion tokens; full reduced-motion path (reveals collapse to instant/opacity).
- **Acceptance:** buttery scroll with no desync; reveals fire once; reduced-motion path verified.

### Phase 3 — Three.js flight space (geometry only, no photos)
- **Build:** a `<canvas>` behind the content; procedural terrain + camera; scroll-scrubbed flight path; correct SRGB renderer setup. Use flat coloured placeholder planes where photos will go.
- **Acceptance:** camera flies on scroll, locked to Lenis; ~60fps desktop; resize correct; placeholders sit where each section is.

### Phase 4 — Photographs as planes
- **Build:** replace placeholders with image-textured planes (`MeshBasicMaterial`, sRGB, tone mapping off); lazy-load each as the camera approaches; texture-size cap; only the hero loads up front.
- **Acceptance:** photos appear at true colour and full fidelity; lazy-load confirmed in network tab; no colour shift vs the originals.

### Phase 5 — Atmosphere
- **Build:** capped particle field; faked volumetric cloud (fog + layered planes the camera flies through between sections); subtle `UnrealBloom` on sky/particles only; unify everything to the palette.
- **Acceptance:** entering/leaving cloud feels like a real descent; **photos remain clean (no bloom)**; perf still acceptable.

### Phase 6 — Telemetry HUD & navigation
- **Build:** glassmorphism HUD reading from `LOCATIONS`, updating as you fly past each shot; the location index that flies the camera to a shot on tap; backdrop-filter fallback.
- **Acceptance:** HUD legible and in sync with the active photo; index navigation flies smoothly; fallback works.

### Phase 7 — Polish, performance, mobile, accessibility, ship
- **Build:** flight-instrument-style preloader; mobile lightweight fallback (vertical parallax of photos, HUD + typography intact, no full 3D); consistency pass on motion; perf budget (dpr cap, dispose on teardown, instancing where repeated); accessibility (focus states, semantic HTML behind canvas, contrast, full reduced-motion); cross-browser check.
- **Acceptance:** the §7 definition-of-done checklist passes.

---

## 6. Iteration protocol

**For Claude, each turn:**
- Build *only* the current phase. Output the full, runnable file (don't paste fragments that assume prior state I have to merge).
- End with: (a) one-line summary of what changed, (b) exactly what I should look at to verify, (c) any decision you made that I should confirm. Then stop.
- If something in this handbook conflicts with a request, flag it rather than silently overriding.

**For me (giving feedback that lands):** be specific and concrete. Not *"make it feel better"* but *"the title reveal at 0.6s is too snappy — try 1.0s with more stagger"*, or *"photo 3 looks washed out — check tone mapping is off that plane."* Reference phase acceptance criteria when a phase isn't done.

**Locking:** when a phase passes, say *"Phase N locked, proceed to Phase N+1."* Claude should not revisit locked phases without being asked.

---

## 7. Definition of done

- [ ] Reads as a beautiful static essay with JS disabled (Phase 1 survives).
- [ ] Scroll is smooth and the flight is locked to it — no desync.
- [ ] Photographs render at **true colour** (unlit, sRGB, no tone mapping, no bloom).
- [ ] Cloud descents feel continuous; atmosphere shares the palette.
- [ ] Telemetry HUD is legible and synced to the active shot.
- [ ] Preloader prevents half-loaded pop-in.
- [ ] Mobile serves the lightweight fallback; no battery-melting 3D on phones.
- [ ] `prefers-reduced-motion` fully honoured.
- [ ] One consistent easing/duration language throughout.
- [ ] No console errors; dpr capped; textures capped; resources disposed.

---

## 8. Build targets

| Phase | Where |
|---|---|
| 0–6 (prototype) | claude.ai **HTML artifact** — single file, CDN imports, system fonts, placeholder images |
| 7 + production | **Claude Code → Vercel** — multi-file, real fonts, your own images, full perf/a11y pass |

Rule of thumb: prove the flight in the artifact, build the real thing in Claude Code.

---

## 9. Kickoff prompt (paste this to start)

```
You are building my aerial landscape drone photography portfolio. The attached/above
build handbook is the source of truth — follow its design system, constraints and
phased build plan exactly.

Work iteratively. Build ONLY Phase 0 now: the scaffold and foundations. Output the
complete single HTML file with pinned CDN imports for Three.js, GSAP + ScrollTrigger
and Lenis, all design tokens from §2 as CSS variables / JS constants, the font stacks,
a global prefers-reduced-motion switch, and the LOCATIONS array stub (use 6 Scottish/
Northumberland placeholder locations).

Respect every rule in §4. When Phase 0 is done, summarise what changed, tell me what to
check, and STOP — do not start Phase 1 until I say "proceed to Phase 1".
```

Then each subsequent turn: *"Phase N locked, proceed to Phase N+1"* plus any notes.

---

## 10. Appendix — the one-shot prompt

If you'd rather attempt the whole thing in a single artifact first (then iterate to fix what breaks), this is the consolidated prompt the handbook is built around:

```
Create a cinematic aerial drone photography portfolio that makes the visitor feel like
they're flying — the entire site is one continuous flight over a landscape, with
photographs revealed like waypoints along the route. Premium editorial photo-essay
design language: National Geographic / Sidetracked meets an Apple launch.

RENDERING — Three.js + WebGL: photographs as flat planes at varying depths/altitudes;
camera flies past and through them; procedural geometry only (low-poly terrain + cloud
planes). Photos on MeshBasicMaterial (unlit); SRGB output colour space; tone mapping
OFF the photo planes. Antialiasing on; cap devicePixelRatio at 2; resize handler; cap
photo textures ~2048px; lazy-load images as the camera approaches; only the hero up front.

MOTION — GSAP + ScrollTrigger + Lenis: scroll drives a continuous camera flight forward
and down, descending past each photo; ScrollTrigger scrub for the path, toggleActions for
reveals. Easing power3.out (reveals) / expo.out (scene changes), durations 0.6–1.2s,
stagger 0.05–0.1, gsap.set() initial states. Lenis synced to ScrollTrigger via
lenis.on('scroll', ScrollTrigger.update) from gsap.ticker. Honour prefers-reduced-motion.

ATMOSPHERE: capped particle field (AdditiveBlending, slow drift); faked volumetric cloud
via scene.fog (exp2) + layered transparent planes the camera flies through; subtle
UnrealBloom on sky/sun/particles ONLY, never on photos. Palette: blue-hour to golden-hour
atmospheric gradient (see handbook §2) — fog/particles/bloom share its hues.

UI & TYPOGRAPHY: minimal glassmorphism telemetry HUD (location, GPS, altitude, lens) that
updates as you fly past each shot — blur 14–16px, hairline border, fallback, legible.
Display serif + neutral grotesque; fluid clamp() sizing; tight tracking; staggered
per-word title reveals (split into spans manually, NOT SplitText). No nav bar — navigation
is the flight, plus a minimal location index that flies the camera to a shot on tap.

POLISH: flight-instrument-style preloader; lightweight mobile fallback (vertical photo
parallax, HUD + type intact, no full 3D); one consistent motion language; fine-tune
timing, easing and cloud-transition blurs until each descent feels like a single
continuous shot.

Build as a single self-contained HTML file using CDN imports. Use 6–8 placeholder
landscape images I can swap for my own drone shots.
```
