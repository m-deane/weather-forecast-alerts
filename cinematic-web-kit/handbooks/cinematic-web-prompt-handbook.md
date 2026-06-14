# The Cinematic Web Prompt Handbook

*Reverse-engineered from the web.with.ai / ByAstral prompt template, with a deep dive on every technology it names and how to prompt each one for a clean, professional result.*

---

## 1. What this style actually is

Across all the examples (luxury coaster, logistics, observability command-centre, AI company, design studio, surreal desert agency, and the fantasy portal world), it is **one prompt skeleton reskinned**. Only the subject and the metaphor change. The screenshot of the rendered "L'UNIVERS" site — floating rocks, a desert horizon, a glowing portal door, a warm orange palette — is the proof the recipe works, and it tells you *which* levers produce that look (warm gradient + bloom + fog + simple floating geometry).

The important mental shift: this is **not a magic one-liner**. It is a compact *spec*. Every aesthetic goal is bolted to a named tool. That is the whole reason it produces consistent output instead of vague "make it cinematic" mush.

---

## 2. The formula

1. **Vision line** — `Create a [futuristic/cinematic] [thing] with [3–5 aesthetic descriptors] and a premium [X] design language.`
2. **Tech-to-effect mappings** — a stack of `Use [tool] to/for [concrete outcome]` lines. This is the engine.
3. **Reference anchors** — `Apple / Tesla storytelling`, `editorial`, `gallery-like`, `digital art`. Two words that compress an enormous amount of taste.
4. **Polish parameters** — `Fine tune animation timing (0.6s–1.2s), easing curves and blur transitions.`
5. **Packaging** (hook, CTA, hashtags) — for the algorithm, irrelevant to the build. Ignore it when prompting.

The single most important principle: **outcome paired with mechanism**. "Make it feel alive" → nothing. "Use dynamic lighting, volumetric fog and particle systems to make every world feel alive" → a buildable instruction.

---

## 3. The technology stack — deep dive

For each: **what it does**, **how to prompt it cleanly**, the **levers that separate amateur from professional**, and **where it runs in Claude**.

### Three.js + WebGL — the renderer

**What it does.** WebGL is the browser's low-level GPU API; Three.js is the library that makes it usable (scene, camera, renderer, meshes, materials, lights). Everything 3D in these sites runs on it.

**How to prompt it cleanly.** Don't just say "use Three.js." Specify:
- **Scene composition** — how many objects, rough layout, what's hero vs background.
- **Camera** — perspective (cinematic) vs orthographic; starting position and field of view.
- **Lighting** — an ambient fill *plus* one or two directional/point lights, with intensities. Flat lighting is the #1 amateur tell.
- **Materials** — `MeshStandardMaterial` with explicit `metalness` and `roughness` (this is physically-based rendering; it's what makes the "luxury hardware" feel).
- **Performance budget** — cap pixel ratio at `Math.min(window.devicePixelRatio, 2)`, dispose geometries, keep poly counts sane.

**Pro levers most prompts miss (ask for these explicitly):**
- **Colour management**: set `renderer.outputColorSpace = SRGBColorSpace` and `toneMapping = ACESFilmicToneMapping`. This single pair is the biggest "looks pro vs looks washed-out" difference in the whole stack.
- **Antialiasing** on, and a resize handler so it isn't broken on other screens.

**Where it runs in Claude.** Yes in artifacts — but the React-artifact environment ships **Three.js r128 (old)**, so no `OrbitControls` import, no `CapsuleGeometry`. In an **HTML artifact** you can load any version from a CDN, which is the better route for this style.

### GSAP + ScrollTrigger — the motion system

**What it does.** GSAP is a timeline-based animation library; ScrollTrigger ties animations to scroll position. This is what makes sections reveal cinematically and parallax layer correctly.

**How to prompt it cleanly.** Specify:
- **Timeline order and stagger** — what animates, in what sequence, with what offset (`stagger: 0.05–0.1`).
- **Explicit easing** — name them: `power3.out` for entrances, `expo.out` for big hero moves, `power2.inOut` for transitions. Vague easing reads as cheap.
- **Durations** — the `0.6s–1.2s` band from the posts is genuinely a good default.
- **Reveal vs scrub** — `toggleActions` for fire-once reveals; `scrub: true` for animations scrubbed by the scrollbar.
- **Initial states** — ask it to set start states with `gsap.set()` so there's no flash of unstyled content on load.
- **`prefers-reduced-motion`** — ask it to honour this. A pro never forgets it.

**Caveat to bake into the prompt:** **SplitText** (for per-letter staggered typography) is a *paid* GSAP plugin. Tell Claude to split text into spans manually instead, or it'll write code that silently fails.

**Where it runs in Claude.** **Not in the React-artifact whitelist** — a React artifact importing GSAP will fail. Use an **HTML artifact + CDN**, or Claude Code. This is the most common reason these prompts "don't work" when people paste them into a React artifact.

### Lenis (or Locomotive Scroll) — smooth scrolling

**What it does.** Replaces the browser's stepwise scroll with interpolated, buttery motion. Lenis is the modern, lightweight choice; Locomotive is older and heavier.

**How to prompt it cleanly.** The thing that breaks for amateurs is **sync**. Explicitly ask to:
- Drive Lenis from a `requestAnimationFrame` loop (or `gsap.ticker`).
- Wire `lenis.on('scroll', ScrollTrigger.update)` so scroll-triggered animations stay locked to the smooth scroll.
- Set a sensible `lerp` / `duration`; disable or soften on touch devices where native scroll already feels good.

**Where it runs in Claude.** HTML artifact + CDN, or Claude Code.

### React Three Fiber (+ drei) — declarative 3D

**What it does.** R3F lets you write Three.js as React components; `drei` adds ready-made helpers (`Float`, `Environment`, `OrbitControls`). The "design studio" example used this.

**How to prompt it cleanly.** Name the helpers you want by name — `Float` for floating objects, `Environment` for image-based lighting, `useFrame` for per-frame animation, `dpr={[1, 2]}` on the `<Canvas>`.

**Where it runs in Claude.** **Not available in claude.ai React artifacts** (only base `three` r128 is). Use Claude Code or a local/Vercel project for anything R3F.

### Blender / Spline → GLTF / GLB — the 3D assets

**What it does.** These are 3D authoring tools; you export models as `.gltf`/`.glb` for the web. Spline is web-first and easy; Blender is the full professional tool.

**The honest limit.** Claude **cannot generate these asset files.** You have two real options:
1. **Supply your own** `.glb` URL and ask Claude to load it (`GLTFLoader`, or `useGLTF` in R3F). Optimise with Draco compression, keep it under ~100k polys.
2. **Drop the assets entirely** and ask for **procedural geometry** — boxes, spheres, extrusions, instanced meshes. For abstract sci-fi (and the floating-rocks look in the L'UNIVERS shot), procedural geometry + good materials + lighting + bloom gets you ~80% of the way with zero asset pipeline.

For most one-shot builds, **go procedural** — it's the difference between a prompt that runs and one that asks for files you don't have.

### Glassmorphism UI — frosted panels

**What it does.** The frosted-glass card look: blurred, semi-transparent panels over a busy background.

**How to prompt it cleanly.** Give the recipe, not the buzzword:
- `background: rgba(...)` at low alpha
- `backdrop-filter: blur(12–20px)`
- a hairline `1px` border in `rgba(255,255,255,0.1–0.2)`
- generous `border-radius` and a soft shadow

**Pro levers:** it only works over a **colourful/busy background** (the 3D canvas) — over flat colour it disappears. Demand a `backdrop-filter` fallback for unsupported browsers, and check **text contrast** — pretty glass with unreadable text is the most common failure.

### Atmosphere — particles, fog, bloom, grading

This is the cluster that creates "cinematic," and it's where the posts are vaguest. Be specific:
- **Particle systems** — Three.js `Points` + `BufferGeometry`. Specify a **capped count** (a few thousand, not millions), small size, `AdditiveBlending` for glow, subtle drift.
- **Volumetric fog** — true volumetrics are expensive; ask Claude to **fake it**: `scene.fog` (exp2) plus a couple of layered transparent planes. That's what sells the desert haze in the L'UNIVERS shot.
- **Bloom / post-processing** — `EffectComposer` + `UnrealBloomPass`. After tone mapping, this is the #1 cinematic lever. Tune `threshold`, `strength`, `radius`.
- **Colour grading** — the warm "thermal" palette = a warm gradient background + bloom + fog tuned to the same hue. Name the palette in the prompt (e.g. "amber-to-rust thermal gradient").

### Typography — oversized, staggered

**How to prompt it cleanly.** Ask for fluid sizing with `clamp()`, tight `line-height`, and a strong typeface pairing (one display, one neutral). For staggered reveals, remember the SplitText caveat above — request manual span-splitting.

---

## 4. The "pro polish" layer the posts leave out

These are the levers that separate the screenshots that look real from the ones that look like a tech demo. Add a block like this to every prompt:

- **Colour pipeline:** SRGB output + ACES Filmic tone mapping. (Biggest single lever.)
- **Bloom / post-processing** for glow.
- **A preloader** so the 3D scene doesn't pop in half-loaded and ugly.
- **Performance budget:** dpr cap, instancing for repeated objects, dispose on unmount, lazy-load heavy bits.
- **A mobile fallback:** real-time 3D murders phone batteries — ask for a static or lightweight hero on small screens.
- **Accessibility:** `prefers-reduced-motion`, focus states, semantic HTML behind the canvas, WCAG-legible contrast on glass.
- **One consistent motion language:** the same easing and duration band everywhere. Inconsistency is what makes a site feel amateur even when each piece is nice.

---

## 5. Where to actually build it

| Target | Good for | Watch out for |
|---|---|---|
| **claude.ai HTML artifact** | Single-page cinematic hero with Three.js + GSAP + Lenis via CDN. ~70% of the look in one shot. | No `localStorage`; load libs from cdnjs; keep it to one file. |
| **claude.ai React artifact** | Component-driven UI. | Only `three` **r128**; **no GSAP, no R3F, no Lenis**. Avoid for this style. |
| **Claude Code → Vercel** | The full multi-section, multi-file experiences in the posts; R3F, real `.glb` assets, post-processing pipelines. | This is where the actual "agency-grade" results live. You have both connected. |

Rule of thumb: **prototype the hero in an HTML artifact, build the real thing in Claude Code.**

---

## 6. The master template (fill-in)

```
Create a [futuristic/cinematic] [PRODUCT / SITE TYPE] with [DESCRIPTOR 1],
[DESCRIPTOR 2], [DESCRIPTOR 3] and a premium [AESTHETIC] design language.

RENDERING
Use Three.js + WebGL to render [WHAT THE 3D ELEMENTS ARE] directly in the browser.
Use procedural geometry (no external assets) — [boxes/spheres/instanced shapes].
Set SRGB output colour space and ACES Filmic tone mapping. Antialiasing on.
Lighting: one ambient fill + one directional key light, MeshStandardMaterial with
explicit metalness/roughness. Cap devicePixelRatio at 2. Handle resize.

MOTION
Use GSAP + ScrollTrigger for section reveals and layered parallax.
Easing: power3.out for entrances, expo.out for hero moves. Durations 0.6–1.2s,
stagger 0.05–0.1. Use gsap.set() for initial states. Honour prefers-reduced-motion.
Split text into spans manually for staggered type (do NOT use SplitText).
Use Lenis for smooth scrolling, synced to ScrollTrigger via lenis.on('scroll', ...).

ATMOSPHERE
Particle system (capped a few thousand, AdditiveBlending, subtle drift).
Fake volumetric fog via scene.fog (exp2) + layered transparent planes.
Post-processing: EffectComposer + UnrealBloomPass for cinematic glow.
Palette: [NAME THE GRADIENT, e.g. amber-to-rust thermal].

UI
Glassmorphism panels: low-alpha bg, backdrop-filter blur 12–20px, 1px hairline
border, soft shadow, with a fallback. Oversized clamp() typography, minimal UI so
the [environment/product] stays the focus. Reference: [Apple / Tesla / editorial].

POLISH
Add a preloader. Provide a lightweight static hero on mobile. Keep one consistent
motion language site-wide. Fine-tune timing, easing curves and blur transitions.

Build this as a single self-contained HTML file using CDN imports.
```

(Swap the last line for "Build as a multi-section project" when you're in Claude Code.)

---

## 7. Pre-flight checklist

- [ ] Did I name a **palette**, not just "cinematic"?
- [ ] Did I specify **lighting** (not relying on defaults)?
- [ ] Did I ask for **SRGB + ACES tone mapping**?
- [ ] Did I ask for **bloom**?
- [ ] Did I pick **procedural geometry** or supply real `.glb` URLs?
- [ ] Did I choose the **right target** (HTML artifact vs Claude Code)?
- [ ] Did I avoid **GSAP/R3F/Lenis in a React artifact**?
- [ ] Did I request **mobile fallback + reduced-motion + preloader**?
- [ ] Did I avoid **SplitText**?

---

## 8. Worked example — reskinned to a command-centre

The observability prompt is the closest cousin to the fantasy-portal one. Reskinned into something concrete:

> Create a cinematic command-centre website for a European gas-balance monitoring platform — a living 3D pipeline network, real-time flow alerts, HUD overlays, bold typography and immersive sci-fi storytelling. Use Three.js + WebGL to render the network as procedural glowing nodes and arcs (instanced geometry, no external assets). SRGB + ACES tone mapping; one ambient + one directional light; emissive node materials. GSAP + ScrollTrigger to fly the camera between regions (power3.out, 0.8–1.2s); Lenis for smooth scroll synced to ScrollTrigger. Capped particle field + exp2 fog + UnrealBloom for the control-room glow; dark base with strategic amber alert highlights. Glassmorphism HUD panels (blur 16px, hairline border, legible contrast). Preloader, mobile static hero, reduced-motion respected. Single self-contained HTML file, CDN imports.

That's the same skeleton — just with the polish layer the originals omit.
