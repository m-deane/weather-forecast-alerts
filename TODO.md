# TODO

## Done
- [x] Fix mountain photos — verified Wikimedia URLs; accessible lightbox (Esc / ← → / focus-trap / focus restore / scroll-lock)
- [x] Research how to host — HuggingFace Space deployment
- [x] Fix weather trend chart and panel — visibility now distinguishes missing-data (gap) from a real 0 (no false whiteout); axis/tooltip labels `°C`/`°F` (was "°celsius"); light-mode tooltips fixed (were hardcoded dark); Recharts animation gated by prefers-reduced-motion

## Next
- [ ] Sort by score on homepage — show average score by area
- [ ] Cinematic-web-kit review follow-ups — see `cinematic-web-kit/reviews/WEATHER-APP-CINEMATIC-OPPORTUNITIES.md` (7 verified survivors shipped; hero score numeral deferred as decoration)
- [ ] Data integrity: confirm the deployed `simple_api.py` is not serving mock/`None` for `freezing_level_m` / `cloud_base_m` / `visibility_m` (surfaced during review — outranks UI polish)
