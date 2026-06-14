# Autopilot Launch Prompt — Aerial Drone Photography Portfolio

Paste everything below the line into a fresh Claude Code session in this project
(`p-photography-website/`). It runs the full build end-to-end on autopilot —
no phase-by-phase sign-off — using the two handbooks as source of truth and
your real photos from `photos/`.

---

You are building my cinematic drone photography portfolio on **autopilot**. Two
documents in this repo are the source of truth — read both in full before writing
any code:

- `cinematic-web-prompt-handbook.md` — the technology playbook (how to prompt/build each layer)
- `drone-photography-site-build-handbook.md` — the locked design system (§2), the
  non-negotiable constraints (§4), the phased build plan (§5) and the definition of done (§7)

## Autopilot protocol (replaces the handbook's stop-and-wait iteration rule)

Execute Phases 0 → 7 sequentially in this single session **without stopping for
sign-off**. For each phase: build it, then **self-verify against that phase's
acceptance criteria using tools** (open the file in a browser or headless check,
read the console for errors, confirm network lazy-loading behaviour where specified)
before moving on. If a phase fails verification, fix it before proceeding — never
carry a broken phase forward. Keep a running build log in `BUILD-LOG.md`: one entry
per phase with what was built, what was verified, and any deviation from the
handbooks (deviations must be flagged, not silent). Stop only when the §7
definition-of-done checklist passes, then report the checklist line by line.

## Output

Build `index.html` in the project root — a single self-contained file using pinned
CDN imports (Three.js, GSAP + ScrollTrigger, Lenis), system font stacks, referencing
my photographs by **relative path** from the `photos/` folder. Use the `@1400.jpg`
variants as textures (they are pre-capped below the 2048px texture limit; full-size
versions exist without the suffix if ever needed).

## The experience

The entire site is one continuous flight: scroll flies the camera forward and gently
down over a procedural low-poly landscape, descending past each photograph in turn,
breaking through cloud layers between chapters. The flight is also a **descent
through the day**: it opens at night under the stars and lands at golden hour —
the scene palette (handbook §2: `--night → --dusk → --haze → --horizon → --sun`)
must interpolate along the route so the atmosphere at each waypoint matches the
light in that photograph. National Geographic / Sidetracked photo-essay tone,
Apple-launch production polish.

All §4 constraints apply verbatim. The ones that protect my images are absolute:
photos on unlit `MeshBasicMaterial`, sRGB output, tone mapping OFF the photo planes,
bloom on atmosphere only — **never** on the photographs.

## LOCATIONS — my real shots, in flight order

This array is the single data source for photo planes, HUD telemetry, and the
location index. Location names/coords marked `// VERIFY` are my best inference from
the image — flag them in the final report so I can correct them. Lens/EXIF strings
are placeholders in the right format — I will swap in real EXIF.

```js
const LOCATIONS = [
  {
    id: 'milkyway',
    title: 'Under the Milky Way',
    coords: '42.1500° N, 78.5000° E',            // VERIFY — night sky over mountain ridge
    altitude: '3,400 m',
    lens: 'Astro · 16mm · ƒ/2.8 · 20s · ISO 3200',
    image: 'photos/p12@1400.jpg',
    caption: 'The galaxy rising over a black ridgeline — the flight begins in darkness.'
  },
  {
    id: 'calton',
    title: 'Calton Hill, Edinburgh',
    coords: '55.9553° N, 3.1830° W',
    altitude: '110 m',
    lens: 'Blue hour · 24mm · ƒ/8 · 8s · ISO 100',
    image: 'photos/p01@1400.jpg',
    caption: 'The Dugald Stewart Monument over a city of amber lights at blue hour.'
  },
  {
    id: 'forth',
    title: 'Firth of Forth',
    coords: '55.9908° N, 3.3886° W',
    altitude: '15 m',
    lens: 'Long exposure · 16mm · ƒ/11 · 30s · ISO 64',
    image: 'photos/p16@1400.jpg',
    caption: 'The Forth Bridge holding its red line against a moving sky.'
  },
  {
    id: 'neist',
    title: 'Neist Point, Isle of Skye',
    coords: '57.4231° N, 6.7884° W',
    altitude: '90 m',
    lens: 'Dusk · 14mm · ƒ/9 · 25s · ISO 100',
    image: 'photos/p05@1400.jpg',
    caption: 'The lighthouse at the end of Skye under a rose-and-violet sky.'
  },
  {
    id: 'faroes',
    title: 'Sea Cliffs, Faroe Islands',  // VERIFY exact headland
    coords: '61.9500° N, 6.8000° W',     // VERIFY
    altitude: '320 m',
    lens: 'Mavic 3 Pro · 24mm · ƒ/4 · 1/120s · ISO 100',
    image: 'photos/p10@1400.jpg',
    caption: 'Vertical basalt walls dropping into the North Atlantic at first light.'
  },
  {
    id: 'glacier',
    title: 'Glacier Valley, Tian Shan',  // VERIFY range/valley
    coords: '42.2000° N, 78.6000° E',    // VERIFY
    altitude: '450 m',
    lens: 'Mavic 3 Pro · 24mm · ƒ/5.6 · 1/200s · ISO 100',
    image: 'photos/p02@1400.jpg',
    caption: 'A braided meltwater river unwinding from the glacier snout at dawn.'
  },
  {
    id: 'antelope',
    title: 'Antelope Canyon, Arizona',
    coords: '36.8619° N, 111.3743° W',
    altitude: '−20 m',
    lens: 'Canyon · 24mm · ƒ/4 · 1/60s · ISO 800',
    image: 'photos/p14@1400.jpg',
    caption: 'Below ground level now — sandstone waves lit from a slot of sky.'
  },
  {
    id: 'goldenhour',
    title: 'Golden Hour Crossing',       // VERIFY location (SE Asia?)
    coords: '10.3000° N, 123.9000° E',   // VERIFY
    altitude: '5 m',
    lens: 'Telephoto · 200mm · ƒ/8 · 1/500s · ISO 200',
    image: 'photos/p09@1400.jpg',
    caption: 'An outrigger crossing the sun\'s reflection — the flight lands on the water.'
  }
];
```

Narrative beats to honour in the flight path: the **opening** (milkyway) is the
highest altitude and darkest atmosphere; the **Antelope Canyon** waypoint should
feel like dropping *below* the terrain (negative altitude on the HUD, warm
`--horizon` fog closing in); the **finale** (goldenhour) descends to just above
the water with the richest `--sun` glow and the bloom at its gentlest. HUD altitude
must track the camera, not just the data values.

Alternates I may swap in later (build nothing for them, just leave the array
data-driven so a swap is a data edit): `p03` ultra-wide sunrise panorama,
`p11` Laguna Colorada, `p07` castle fireworks, `p04` second slot-canyon frame.
Excluded by design (wildlife/pet shots, wrong genre for this essay): `p06`, `p08`,
`p13`, `p15`.

## Definition of done

The §7 checklist in the build handbook, verified with tools and reported line by
line — plus: every photo loads from `photos/`, colours match the source files
(no tint, no tone-map, no bloom on the planes), and the day-cycle palette
interpolation is visible across the full scroll.
