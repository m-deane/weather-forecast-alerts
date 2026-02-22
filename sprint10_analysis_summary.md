# Sprint 10: Improvement Analysis Summary

**Date**: 2026-02-21
**Source**: User PDF review (Scottish-Weather_improvements_210226_1513.pdf)
**Analyzed by**: 4-agent team (integrations, maps, UI, data)

## All 13 Items at a Glance

| # | Item | Priority | Effort | Key Insight |
|---|------|----------|--------|-------------|
| 1 | Walk Highland integration | P1 | Medium | Static JSON mapping of routes per mountain, link out to WH |
| 2 | Fotovue photo guide | P2 | Medium | Curated viewpoint data + Fotovue purchase links (copyright-safe) |
| 3 | Parking & route navigation | P1 | Medium | Deep links to Google/Apple/Waze Maps, parking coords in backend |
| 4a | Map interactivity | P1 | Low-Med | Add marker clustering (`react-leaflet-cluster`), locate-me button |
| 4b | Map theme | P0 | Low | CSS filter on `.leaflet-tile-pane` to tint tiles emerald |
| 5 | Rich cards for All Locations | P0 | Medium | Replace plain links with WeatherCard + batch prefetch via /compare |
| 6 | Reorder homepage sections | P0 | Low | Pure JSX reorder in HomePage.tsx, zero risk |
| 7 | Full backend scrape refresh | P1 | Medium | New /scrape/trigger + /scrape/status endpoints, subprocess scraper |
| 8 | Location access denied | P1 | Low | Replace red error with amber card + manual city picker dropdown |
| 9 | Search page map | P1 | Low | Reuse existing LocationMap with filteredLocations in SearchPage |
| 10 | Mountain photos | P1 | Medium | Wikimedia Commons curated gallery, static JSON per mountain |
| 11 | Weather trend UX | P2 | Medium | Add score zone bands, real time labels, tap-to-detail interaction |
| 12 | Chart granularity | P1 | Low-Med | Add "By Period" toggle (AM/PM/Night), fix fake time labels |
| 13 | Settings review | P0/P1 | Med-High | Risk tolerance is non-functional (P0), add elevation/pressure units |

## Recommended Implementation Order

### Phase 1: Quick Wins (Low effort, high impact)
1. **Item 6** - Reorder homepage sections (JSX reorder only)
2. **Item 4b** - Map emerald theme (single CSS rule)
3. **Item 8** - Location denied graceful degradation (dark theme + city picker)
4. **Item 9** - Search page map (reuse LocationMap component)

### Phase 2: Core UX Improvements
5. **Item 5** - Rich WeatherCards for All Locations (batch prefetch)
6. **Item 13 P0** - Make Risk Tolerance functional + add elevation unit
7. **Item 12** - Chart granularity (AM/PM/Night toggle, fix fake labels)

### Phase 3: Data Infrastructure
8. **Item 7** - Full backend scrape refresh (new API endpoints)
9. **Item 11** - Weather trend panel UX overhaul

### Phase 4: External Integrations (require data curation)
10. **Item 10** - Mountain photo gallery (Wikimedia Commons)
11. **Item 1** - Walk Highland route integration
12. **Item 3** - Parking & route navigation
13. **Item 2** - Fotovue photography viewpoints

## Files Impact Matrix

| File | Items Affected |
|------|---------------|
| `frontend/src/pages/HomePage.tsx` | 5, 6 |
| `frontend/src/pages/SearchPage.tsx` | 9 |
| `frontend/src/pages/LocationPage.tsx` | 1, 2, 3, 10, 13 |
| `frontend/src/pages/SettingsPage.tsx` | 3, 13 |
| `frontend/src/components/LocationMap.tsx` | 4a, 4b, 9 |
| `frontend/src/components/LocationDetection.tsx` | 8 |
| `frontend/src/components/WeatherCharts.tsx` | 12, 13 |
| `frontend/src/components/weather/WeatherTrend.tsx` | 11, 13 |
| `frontend/src/components/DataStalenessWarning.tsx` | 7 |
| `frontend/src/components/WeatherCard.tsx` | 5, 13 |
| `frontend/src/stores/useAppStore.ts` | 3, 13 |
| `frontend/src/types/weather.ts` | 1, 2, 3, 10, 13 |
| `frontend/src/api/client.ts` | 1, 2, 7, 10 |
| `frontend/src/utils/weather.ts` | 13 |
| `backend/simple_api.py` | 1, 2, 3, 7, 10 |

## New Files Required

| File | Item | Purpose |
|------|------|---------|
| `data/walkhighlands_routes.json` | 1 | Static route mapping per mountain |
| `data/photography_viewpoints.json` | 2 | Curated viewpoint data per mountain |
| `data/mountain_photos.json` | 10 | Wikimedia Commons photo metadata |
| `frontend/src/components/WalkHighlandsRoutes.tsx` | 1 | Route display component |
| `frontend/src/components/PhotographyViewpoints.tsx` | 2 | Viewpoint display component |
| `frontend/src/components/MountainPhotoGallery.tsx` | 10 | Photo gallery component |
| `frontend/src/components/GettingThere.tsx` | 3 | Parking + navigation links |

## New Dependencies

| Package | Item | Purpose |
|---------|------|---------|
| `react-leaflet-cluster` | 4a | Marker clustering on map |

## Critical Findings

### Broken Feature: Risk Tolerance (Item 13)
The Settings page has a Risk Tolerance selector (conservative/moderate/aggressive) that stores a preference but **no code anywhere reads it**. The descriptions promise "Adjust how conditions are assessed for hiking" but hiking scores are displayed identically regardless of setting. This is a broken promise to users.

### Misleading Refresh Button (Item 7)
The DataStalenessWarning "Refresh" button only re-fetches cached API data. It does NOT trigger a new scrape. Users who see "data is 51 hours old" and click Refresh will get the same 51-hour-old data back. This is deceptive for a safety-critical app.

### No Weather Data in All Locations (Item 5)
The only view showing all 73 mountains provides zero weather or safety information. A hiker scanning the full list cannot distinguish dangerous conditions from excellent ones without clicking into each location individually.

### Fake Time Labels in Charts (Item 12)
WeatherCharts uses `${index * 8}:00` to fabricate time labels (0:00, 8:00, 16:00) instead of showing actual period names (AM, PM, Night). This creates false precision.

## CLAUDE.md Use Case Links

All items trace back to the primary use case: **"Help hikers and mountaineers make safety-informed decisions about Scottish mountain conditions."**

- **Safety-critical**: Items 7 (stale data), 13 (broken risk tolerance), 5 (no safety data in listing)
- **Trip planning**: Items 1 (routes), 3 (parking/navigation), 8 (location access)
- **Decision support**: Items 11 (trend readability), 12 (time granularity), 9 (spatial context)
- **Visual context**: Items 10 (photos), 4b (map theme), 2 (photography viewpoints)
- **Navigation UX**: Items 6 (section order), 4a (map interactivity)

## Detailed Reports

- [Items 1, 2, 10 - External Integrations](./analysis_items_1_2_10.md)
- [Items 3, 4, 8, 9 - Map & Navigation](./analysis_items_3_4_8_9.md)
- [Items 5, 6 - UI Layout](./analysis_items_5_6.md)
- [Items 7, 11, 12, 13 - Data & Settings](./analysis_items_7_11_12_13.md)
