# Scottish Mountain Weather Dashboard - E2E Test Report

**Date**: 2026-02-18
**Tested by**: 3-agent team (E2E Tester, UX/UI Analyst, Feature Analyst)
**Frontend**: http://localhost:3001 (Vite dev server)
**Backend**: http://localhost:8000 (simple_api.py mock backend)

---

## Executive Summary

- **8 E2E test suites executed**: 5 PASS, 3 PARTIAL PASS, 0 FAIL - core app is functional
- **4 HIGH-severity bugs found**: search filtering broken, settings buttons navigate away, blank page on invalid locations, compare API endpoint unreachable
- **7 WCAG color contrast failures** and **6 critical accessibility issues** (unlabeled form controls, multiple h1s)
- **4 disconnected components** found in codebase (LocationComparison, GearRecommendation, SafetyAssessment, useOnlineStatus) + **6 unused npm packages** (~67MB waste)
- **N+1 API waterfall on homepage**: 24+ API calls per page load (20 individual weather fetches for BestConditionsToday)

---

## E2E Test Results

| # | Test Suite | Status | Key Findings |
|---|-----------|--------|-------------|
| 1 | Homepage Load | PASS | All 20 locations, 7 areas, map, hero stats render. 0 console errors |
| 2 | Navigation | PASS | All 5 nav buttons + URL routing work. /locations = /search (duplicate) |
| 3 | Weather Data Display | PASS | All data correct, scores color-coded, 6-day forecast, 3 time periods |
| 4 | Search Functionality | PARTIAL PASS | Page renders but search does NOT filter results (always returns all 20) |
| 5 | Favorites & Preferences | PARTIAL PASS | Add/remove works, persists. /favorites page empty, settings buttons broken |
| 6 | Responsive Design | PASS | Desktop/tablet/mobile all correct, nav adapts, no overflow |
| 7 | Error Handling | PARTIAL PASS | Rapid nav stable. No 404 page, blank page for invalid locations |
| 8 | Backend API Endpoints | PASS | 13/14 endpoints correct. Compare route unreachable, CORS mismatch |

---

## All Bugs Found

### HIGH Severity

| # | Bug | Component | Details |
|---|-----|-----------|---------|
| B1 | Search does not filter results | SearchPage.tsx | Typing in search box has no effect - always shows all 20 locations. Backend API correctly filters (GET /api/v1/locations?search=X works), so this is a frontend bug |
| B2 | Settings buttons navigate away | SettingsPage.tsx | Clicking unit toggle buttons (C/F, kph/mph, km/mi) navigates to homepage instead of toggling the preference. All settings toggles are non-functional |
| B3 | Blank page for invalid locations | Location detail page | Navigating to /location/invalid-slug renders layout with blank content. Backend returns proper 404 but frontend shows no error message to user |
| B4 | Compare API endpoint unreachable | simple_api.py | Route /api/v1/weather/compare is shadowed by /api/v1/weather/{location_id} - "compare" is treated as a location ID and returns 404 |

### MEDIUM Severity

| # | Bug | Component | Details |
|---|-----|-----------|---------|
| B5 | /favorites page shows empty state | FavoritesPage.tsx | Only 8 lines of stub code. Homepage favorites section works fine, but dedicated page shows "Your favorite mountains will appear here..." even with favorites in Zustand store |
| B6 | CORS origin mismatch | simple_api.py | Allowed origins include port 3000 but frontend runs on 3001. Works via Vite proxy but direct cross-origin requests fail |

### LOW Severity

| # | Bug | Component | Details |
|---|-----|-----------|---------|
| B7 | No dedicated 404 page | App.tsx routing | Unknown routes silently redirect to homepage |
| B8 | Duplicate routes | App.tsx | /locations and /search render identical SearchPage component |
| B9 | Nav active state stale on back/forward | MobileNavigation.tsx | Browser history navigation doesn't update sidebar active highlight |
| B10 | No /status endpoint in mock API | simple_api.py | Production main.py has /status but mock backend doesn't |
| B11 | "20locations" missing space | LocationMap.tsx | Map legend shows count and "locations" without space between number and text |
| B12 | Double bottom padding on mobile | Layout.tsx + MobileNavigation.tsx | Both h-16 spacer div and pb-20 padding applied simultaneously |

---

## WCAG Accessibility Findings

### Color Contrast Failures (7 found)

| Color Pair | Ratio | Required | Where Used | Fix |
|---|---|---|---|---|
| slate-500 on slate-900 | 3.75:1 | 4.5:1 | Muted text, data labels, inactive nav | Change to slate-400 (5.71:1) |
| slate-500 on slate-800 | 3.07:1 | 4.5:1 | Card labels, weather detail labels | Change to slate-400 |
| slate-600 on slate-900 | 2.36:1 | 4.5:1 | Sidebar footer text | Change to slate-400 |
| White on emerald-600 | 3.77:1 | 4.5:1 | Primary buttons, hero header | Darken to emerald-700 (4.6:1) |
| emerald-100 on emerald-600 | 3.32:1 | 4.5:1 | Hero subtitle | Change to text-white |

### Critical WCAG Violations (6 found)

| # | Issue | WCAG | Fix Effort |
|---|-------|------|-----------|
| C1 | Multiple h1 elements per page (MobileNavigation + page content) | 1.3.1 | Low - change nav h1 to div |
| C2 | Search input has no accessible label | 1.3.1, 4.1.2 | Low - add aria-label |
| C3 | Toggle switches have no labels | 4.1.2 | Low - add aria-labelledby |
| C4 | Radio buttons have no labels or fieldset | 1.3.1, 4.1.2 | Medium - add fieldset/legend/label |
| C5 | Segmented controls (C/F etc) lack ARIA semantics | 4.1.2 | Medium - add aria-pressed, role="group" |
| C6 | Select dropdowns on location detail have no labels | 4.1.2 | Low - add aria-label |

### Major WCAG Issues (5 found)

| # | Issue | WCAG | Fix Effort |
|---|-------|------|-----------|
| M1 | Heading hierarchy skips h2->h4 in multiple places | 1.3.1 | Low |
| M2 | No aria-live regions for dynamic content (search results count) | 4.1.3 | Low |
| M3 | Map markers keyboard-inaccessible (no tabindex, no aria-label) | 2.1.1 | High |
| M4 | Filters button missing aria-expanded | 4.1.2 | Low |
| M5 | Homepage sections have no aria-labelledby | 1.3.1 | Low |

### Good Practices Confirmed

- Skip link present and functional
- `lang="en"` on html element
- `prefers-reduced-motion` support
- `focus-visible` ring styles
- `aria-current="page"` on active nav
- Semantic HTML landmarks (main, nav, header, aside)
- Favorite toggle has proper aria-label and aria-pressed

---

## UX/UI Design Findings

### Visual Design Assessment

**Overall**: The emerald dark theme ("Highland Dark") is professional and cohesive. The card system (5 variants) is well-designed with gradient backgrounds and subtle borders.

**Issues Found**:
1. **P2**: Inconsistent hover lift heights - WeatherCard uses `hover-lift` (4px) while card hover is 2px
2. **P2**: `section-title` class renders smaller than `<h2>` base styles
3. **P3**: Sidebar logo SVG duplicated inline (should be shared component)
4. **P3**: 30+ CSS animations fire simultaneously on page load (performance concern)

### User Flow Pain Points

| Priority | Pain Point | Impact | Recommended Fix |
|----------|-----------|--------|----------------|
| P0 | FavoritesPage is a stub - nav links to dead-end | Users can't view favorites from nav | Populate with WeatherCards from Zustand store |
| P1 | /search and /locations are identical | 2 of 5 nav slots wasted | Remove "Locations" or make it area-browse page |
| P2 | Browse lists show NO weather/safety data | Users can't compare without clicking each | Add hiking score badge + temp to location cards |
| P2 | Homepage extremely long (7 stacked sections, 20+ cards) | Requires excessive scrolling | Collapse "All Locations" to 5 with "Show more" |
| P3 | No comparison view | Comparing mountains requires opening each | Wire up existing LocationComparison component |
| P3 | Safety info hierarchy inverted | Most important data (scores) hidden in detail pages | Add sortable safety overview table |

### Information Architecture Issues

1. **Safety data absent from browse views**: Search and "All Locations" show name/area/elevation but NO hiking scores. For a safety-focused app, this is the primary value proposition being hidden.
2. **Redundant content**: Homepage duplicates /locations and /favorites content.
3. **No "at a glance" safety overview**: No single view shows all locations ranked by hiking safety.
4. **Area browsing fragmented**: Area links -> search cards -> no weather data -> must click each location.

---

## Feature Gap Analysis

### Disconnected Components (Code exists, not wired to UI)

| Component | Description | Effort to Wire Up |
|-----------|-------------|-------------------|
| LocationComparison.tsx | Side-by-side weather comparison with "Best Conditions" badge | Small (add route) |
| GearRecommendationCard.tsx | Hiking gear checklist with importance levels | Small (add to detail page) |
| SafetyAssessment.tsx | Pre-hike safety checklist | Small (add to detail page) |
| useOnlineStatus.ts | Online/offline detection hook | Small (already built) |

### Missing Features (Prioritized)

| # | Feature | Impact | Effort | Priority |
|---|---------|--------|--------|----------|
| F1 | "Best day this week" recommendation | HIGH | Small | P0 - Quick win using existing 6-day data |
| F2 | Wire up LocationComparison to a route | HIGH | Small | P0 - Component already built |
| F3 | Populate FavoritesPage properly | HIGH | Small | P0 - Store data already exists |
| F4 | Risk tolerance setting affects scores | HIGH | Medium | P1 - Settings exist but do nothing |
| F5 | Notification/alert system | HIGH | Large | P2 - Settings toggles exist but no backend |
| F6 | Hourly forecast breakdown for current day | Medium | Medium | P2 |
| F7 | Wind chill / multi-elevation data | Medium | Medium | P2 |
| F8 | Remove auth redirect to non-existent /login | Low | Small | P0 - Dead code removal |

### Unused Dependencies (67+ MB waste)

| Package | Size | Status |
|---------|------|--------|
| mapbox-gl | 56 MB | ZERO imports - app uses Leaflet |
| msw | 7.2 MB | ZERO imports |
| react-use | 2.1 MB | ZERO imports |
| @headlessui/react | 1.1 MB | ZERO imports |
| react-map-gl | 1.1 MB | ZERO imports |
| react-hot-toast | 252 KB | ZERO imports |
| date-fns | - | ZERO imports |

---

## Performance Analysis

### Bundle Sizes (Current)

| Chunk | Size | Gzipped | Notes |
|-------|------|---------|-------|
| index.js (main) | 434.87 KB | 131.67 KB | Contains unused dep artifacts |
| CustomizableDashboard.js | 475.23 KB | 125.45 KB | Lazy loaded (good) |
| LocationMap.js | 164.68 KB | 48.39 KB | Lazy loaded (good) |
| index.css | 85.25 KB | 13.41 KB | 1614 lines, includes unused styles |
| **TOTAL JS** | **1,074.78 KB** | **305.51 KB** | |

### Critical Performance Issues

| Priority | Issue | Impact | Fix |
|----------|-------|--------|-----|
| HIGH | N+1 API waterfall: 24+ requests on homepage | Slow page load, server load | Add /api/v1/weather/best endpoint |
| HIGH | No React Query global defaults | All queries immediately stale, refetch on window focus | Set staleTime: 2min, refetchOnWindowFocus: false |
| HIGH | Unused npm packages (67+ MB) | Slow installs, potential bundle leaks | npm uninstall 7 packages |
| MEDIUM | Duplicate weather fetches (same location fetched by multiple components) | Wasted API calls | Use shared React Query cache keys |
| MEDIUM | Missing `type: "module"` in package.json | CJS/ESM reparsing warning | Add to package.json |
| LOW | 2 console.log statements in production code | Debug noise | Remove from ErrorBoundary.tsx and monitoring.ts |
| LOW | Recharts CSS in global stylesheet | Bloats initial CSS | Move to lazy-loaded component |

---

## Prioritized Action Plan

### P0 - Fix Immediately (Blocking / Core Functionality)

1. **Fix search filtering** (B1) - Frontend doesn't pass search query to API
2. **Fix settings buttons** (B2) - Unit toggles navigate away instead of toggling
3. **Fix blank page on invalid locations** (B3) - Show error message to user
4. **Fix compare API route ordering** (B4) - Move /compare before /{location_id}
5. **Remove unused npm packages** - `npm uninstall mapbox-gl react-map-gl react-use @headlessui/react react-hot-toast date-fns` + `msw` from devDeps

### P1 - Fix Soon (User Experience / Safety)

6. **Fix WCAG color contrast** (7 failures) - slate-500->slate-400, emerald-600->emerald-700
7. **Fix critical WCAG form labels** (C1-C6) - Most are one-line aria-label additions
8. **Populate FavoritesPage** (B5) - Wire up to Zustand store with WeatherCards
9. **Add hiking score to search/browse cards** - Safety data visible when comparing
10. **Wire up LocationComparison component** - Add route and link from search results
11. **Fix CORS for port 3001** (B6) - Add to allowed origins

### P2 - Improve (Performance / Polish)

12. **Add backend "best conditions" endpoint** - Replace 20 individual weather fetches
13. **Configure React Query defaults** - staleTime, refetchOnWindowFocus: false
14. **Fix heading hierarchy and ARIA attributes** (M1-M5)
15. **Deduplicate nav routes** (B8) - Remove /locations or differentiate from /search
16. **Add "best day this week" feature** (F1) - Quick win from existing data
17. **Collapse homepage "All Locations"** - Show 5 with "Show more"

### P3 - Nice to Have (Polish / Future)

18. **Add dedicated 404 page** (B7)
19. **Fix map marker accessibility** (M3)
20. **Risk tolerance setting affects scores** (F4)
21. **Standardize hover effects and typography scale**
22. **Add `type: "module"` to frontend package.json**
23. **Remove remaining console.log statements**
24. **Extract sidebar logo SVG to shared component**
25. **Wire up GearRecommendation and SafetyAssessment components**

---

## Test Environment Notes

- Frontend served by Vite 5.4.21 dev server on port 3001
- Backend is simple_api.py (mock data) on port 8000
- Weather data from most recent scraper run (2026-02-18)
- Tests performed via Playwright browser automation + curl API testing
- Screenshots timed out on some pages (Leaflet map rendering delay)
- Mock backend returns randomized weather data, so some score values may vary between test runs
