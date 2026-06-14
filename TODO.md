# TODO

## Done
- [x] Fix mountain photos — verified Wikimedia URLs; accessible lightbox (Esc / ← → / focus-trap / focus restore / scroll-lock)
- [x] Research how to host — HuggingFace Space deployment
- [x] Fix weather trend chart and panel — visibility now distinguishes missing-data (gap) from a real 0 (no false whiteout); axis/tooltip labels `°C`/`°F` (was "°celsius"); light-mode tooltips fixed (were hardcoded dark); Recharts animation gated by prefers-reduced-motion

## Next
- [ ] Cinematic-web-kit review follow-ups — see `cinematic-web-kit/reviews/WEATHER-APP-CINEMATIC-OPPORTUNITIES.md` (7 verified survivors shipped; hero score numeral deferred as decoration)
- [ ] (optional) Hard-suppress `hiking_score` on the estimated/scrape-failure path — currently labelled via a strengthened warning banner rather than nulled (nulling would touch ~15 components)
- [ ] (optional) Untrack `forecasts/` (needs a Dockerfile change — it `COPY`s forecasts/) and a history rewrite to drop the old `backend/venv` blob so plain `git push` to HF works (deploy currently via `hf upload`)

## Done (cinematic-review session)
- [x] Homepage — area cards show today's average hiking score (colour-coded, Go/No-Go thresholds) and areas are sorted best-first. Deployed live.
- [x] Data integrity — `visibility_m`/`humidity_percent` were never scraped (fabricated md5/random); now emit `null` (UI shows "Unavailable"); dropped the fabricated `cloud_base_m` 1000m default; estimated-data alert raised to `warning`. Deployed live + verified.
- [x] Repo hygiene — untracked ~4666 committed-but-ignored files (venv, caches, dev screenshots, PDF) and extended `.gitignore`.
