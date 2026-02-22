# Analysis Report: Items 7, 11, 12, 13 (Data, Charts & Settings)

**Analyst**: data-analyst
**Date**: 2026-02-21
**Scope**: Backend refresh, weather trend UX, chart granularity, settings review

---

## Item 7: Full Backend Scrape Refresh

### Problem Statement

The `DataStalenessWarning` component (line 60-63) has a Refresh button that calls `queryClient.invalidateQueries({ queryKey: ['weather'] })`. This only re-fetches cached API data from the backend -- it does NOT trigger a new scrape from mountain-forecast.com. The backend `simple_api.py` has no endpoint to invoke the scraper. The weather data served is whatever JSON files already exist in `forecasts/`. If those files are hours or days old, the "Refresh" button just re-serves the same stale data, making it misleading.

The scraper (`weather_scraper.py`) is a standalone CLI script with no API integration. There is no mechanism to trigger it remotely.

### CLAUDE.MD Link

Primary use case: "Help hikers and mountaineers make safety-informed decisions about Scottish mountain conditions." Stale weather data directly undermines safety decisions -- hikers may rely on outdated forecasts. The ability to refresh data on-demand is essential for real-time situational awareness.

### Plan

1. Add a `/api/v1/scrape/trigger` POST endpoint to simple_api.py that runs the scraper as a subprocess
2. Add a `/api/v1/scrape/status` GET endpoint that returns scrape progress/status (running, completed, last_run, error)
3. Modify `DataStalenessWarning` to call the trigger endpoint, then poll status until complete
4. On scrape completion, invalidate React Query cache so the UI auto-updates with fresh data
5. Add safeguards: rate-limit scrape triggers (max once per 30 min), show progress indicator, handle failures

### Implementation Plan

**Backend changes** (`backend/simple_api.py`):

- Add a module-level `scrape_status` dict tracking: `is_running`, `last_triggered`, `last_completed`, `error`, `progress`
- Add `POST /api/v1/scrape/trigger`:
  - Check if scrape is already running (return 409 Conflict if so)
  - Check if last scrape was < 30 min ago (return 429 Too Many Requests if so)
  - Launch `weather_scraper.py` as an `asyncio.subprocess` in background
  - Return `{"status": "started", "estimated_duration_seconds": 120}`
  - On subprocess completion, update `scrape_status` with timestamp/result
- Add `GET /api/v1/scrape/status`:
  - Return current `scrape_status` dict including `is_running`, `last_completed`, `error`

**Frontend changes**:

- `frontend/src/api/client.ts`: Add `scrapeApi.trigger()` and `scrapeApi.getStatus()` methods
- `frontend/src/components/DataStalenessWarning.tsx`:
  - Modify `handleRefresh` to call `scrapeApi.trigger()` instead of just invalidating queries
  - Add polling loop: call `scrapeApi.getStatus()` every 5s while `is_running === true`
  - Show spinner/progress text: "Fetching fresh weather data..." with elapsed time
  - On completion: invalidate all weather queries (existing logic), show success toast
  - On failure: show error message with retry option
- `frontend/src/stores/useDataStalenessStore.ts`: Add `isScraping` and `scrapeError` state fields

**Files to modify**:
| File | Change |
|------|--------|
| `backend/simple_api.py` | Add 2 new endpoints + subprocess scrape logic |
| `frontend/src/api/client.ts` | Add scrapeApi methods |
| `frontend/src/components/DataStalenessWarning.tsx` | Replace cache-only refresh with full scrape trigger + polling |
| `frontend/src/stores/useDataStalenessStore.ts` | Add scraping state |

**New files**: None

---

## Item 11: Weather Trend Panel UX

### Problem Statement

The `WeatherTrend` component (`frontend/src/components/weather/WeatherTrend.tsx`) displays a sparkline chart with score dots and a timeline, but users reported it is "very hard to intuitively understand." Specific UX issues:

1. **No Y-axis labels or scale reference**: The sparkline SVG (viewBox 0 0 160 40) shows dots but no reference for what 0 vs 10 means. The dashed grid lines at y=10, 20, 30 are unlabeled.
2. **Unclear time labels**: Labels like "+3h", "+6h", "+24h", "+30h", "+48h" are ambiguous -- they don't show actual times or dates. The mapping logic (lines 89-103) uses period index heuristics that don't accurately map to real hours.
3. **Score numbers are small**: The `text-[10px]` labels and `text-xs` scores (lines 224-233) are very small, especially on mobile.
4. **No color coding on the sparkline itself**: The trend line is a single color (emerald, orange, or grey), but individual segments don't show whether specific points are good/bad.
5. **Summary text is terse**: "Conditions improving. Best: Mon PM (7.2/10)" lacks context about what makes conditions good or bad.
6. **No interactive hover/tap**: Users can't tap a data point to see details.

### CLAUDE.MD Link

"Help hikers make safety-informed decisions" -- the trend panel's purpose is to communicate whether conditions are getting better or worse. If users can't understand it, they lose a key decision-making signal. A clear trend visualization helps hikers choose the optimal departure time.

### Plan

1. Replace cryptic relative time labels with actual day/period labels (e.g., "Mon AM", "Tue PM")
2. Add Y-axis reference markers showing score zones (Excellent/Good/Challenging/Dangerous)
3. Color-code each data point and segment according to the score's quality band
4. Enlarge touch targets and text; add a tap-to-detail interaction
5. Add a plain-English "when to go" recommendation below the chart
6. Add a legend explaining the score scale

### Implementation Plan

**File**: `frontend/src/components/weather/WeatherTrend.tsx`

**Changes**:

1. **Replace time labels** (lines 89-112): Instead of "+3h", "+6h", compute actual period labels from `day.date` and `period.period_type`:
   ```
   "Mon AM" | "Mon PM" | "Mon Night" | "Tue AM" | ...
   ```

2. **Add score zone backgrounds** to the sparkline SVG:
   - Green band: y-range for scores 8-10 (top of chart)
   - Yellow band: scores 6-7
   - Orange band: scores 4-5
   - Red band: scores 1-3
   - Semi-transparent fills so the trend line is visible over them

3. **Color-code data points individually**: Each circle gets a fill based on its own score, not the overall trend direction. Use the existing color logic: `>= 7` emerald, `>= 5` yellow, `>= 3` orange, else red.

4. **Add Y-axis labels**: On the right side of the SVG, add text labels "10", "7.5", "5", "2.5" at appropriate Y positions.

5. **Increase label sizes**: Change `text-[10px]` to `text-xs` (12px) and `text-xs` to `text-sm` for the score values.

6. **Add tooltip on tap/hover**: Wrap each SVG circle in a `<g>` with an onClick handler that shows a small popover with:
   - Period name (e.g., "Monday Afternoon")
   - Score with description (e.g., "7.2/10 - Good conditions")
   - Key metrics: wind, rain, temp

7. **Enhance summary section** (lines 239-241): Instead of just the trend direction, add:
   - "Best time to go: Monday afternoon (score 7.2)"
   - "Avoid: Tuesday night (score 2.1 - high winds expected)"
   - Key risk factor driving the trend

8. **Add legend below sparkline**: Small inline legend showing the 4 color zones with labels.

**Files to modify**:
| File | Change |
|------|--------|
| `frontend/src/components/weather/WeatherTrend.tsx` | All UX improvements above |

**New files**: None

---

## Item 12: Weather Trend Charts Granularity

### Problem Statement

The `WeatherCharts` component (`frontend/src/components/WeatherCharts.tsx`) currently provides two levels of granularity:

1. **Daily view** (Overview, Temperature, Precipitation, Wind tabs): Shows one data point per day, aggregated from the `DailyForecast.summary` (lines 60-74). X-axis shows "Today", "Mon", "Tue", etc.
2. **Day Detail view**: Shows period-level data for a single selected day (lines 77-89, select dropdown lines 130-153). X-axis shows "0:00", "8:00", "16:00" which are hardcoded approximations, not actual period labels.

**Missing capabilities**:
- No way to view ALL periods across ALL days in a single continuous chart
- No aggregation selector (hour, morning/afternoon/night, day)
- Day Detail uses fabricated time values (`${index * 8}:00` on line 79) rather than actual period names (AM/PM/Night)
- No real data validation -- the "Day Detail" tab could show mock data without the user knowing

**Data reality**: The scraper parses 3 periods per day from mountain-forecast.com: typically AM, PM, and Night (extracted from `<span class="en">` elements in time header cells). These map to `period_type` values of "am", "pm", "night" in the API. This is the maximum granularity available -- there is no hourly data from the scraper. Any "hourly" option would require additional data sources (e.g., OpenWeatherMap hourly API).

### CLAUDE.MD Link

"Help hikers make safety-informed decisions" -- granular time-based weather views help hikers plan departure times and route timing. The afternoon period in Scottish mountains is often when weather deteriorates; morning may offer a window. Seeing this clearly across multiple days is critical for multi-day trip planning.

### Plan

1. Add an aggregation selector: "By Period" (AM/PM/Night) and "By Day" (current default)
2. Replace the Day Detail select-a-day dropdown with a continuous multi-day period chart
3. Fix fabricated time labels to use actual period names
4. Ensure real scraped data is clearly distinguished from mock/estimated data
5. Do NOT add "hourly" option since the scraper only provides 3 periods/day

### Implementation Plan

**File**: `frontend/src/components/WeatherCharts.tsx`

**Changes**:

1. **Add aggregation toggle** (new UI element above the chart tabs):
   - Two options: "Daily Summary" | "By Period (AM/PM/Night)"
   - Styled as a SegmentedControl matching the existing design system
   - Default to "Daily Summary" for backward compatibility

2. **New data preparation for period view** (replace/augment `periodData`):
   ```typescript
   // Flatten ALL periods across ALL days into a continuous series
   const allPeriodsData = forecasts.flatMap((day, dayIdx) =>
     day.periods.map(period => ({
       label: `${dayIdx === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-GB', { weekday: 'short' })} ${period.period_type.toUpperCase()}`,
       ...period,
       date: day.date,
     }))
   )
   ```

3. **Fix the Day Detail time labels** (line 79): Replace `${index * 8}:00` with actual `period.period_type.toUpperCase()` ("AM", "PM", "NIGHT").

4. **Remove "Day Detail" tab** and replace with the period-level aggregation toggle:
   - When "By Period" is selected, ALL chart tabs (Overview, Temp, Precip, Wind) show period-level data
   - When "Daily Summary" is selected, they show the existing daily aggregation

5. **Add data source indicator**: Show a small badge in the chart header: "Real data" (green) or "Estimated" (amber), based on `forecast.data_source`.

6. **Chart X-axis for period view**: Show abbreviated labels like "Mon AM", "Mon PM", "Mon Ni", "Tue AM"... Rotate labels 45 degrees if too crowded.

**Files to modify**:
| File | Change |
|------|--------|
| `frontend/src/components/WeatherCharts.tsx` | Add aggregation toggle, period-level data prep, fix time labels, add data source badge |

**New files**: None

**Important constraint**: The scraper provides AM/PM/Night granularity only. Do NOT add "hourly" as an option. If hourly data is desired in the future, it would require integrating OpenWeatherMap's hourly endpoint (which requires API key and has rate limits).

---

## Item 13: Review Settings

### Problem Statement

The current `SettingsPage` (`frontend/src/pages/SettingsPage.tsx`) has 5 sections:

1. **Unit Preferences**: Temperature (C/F), Wind Speed (kph/mph), Distance (km/mi)
2. **Notifications**: Master toggle, Severe weather alerts, Favorite location updates
3. **Risk Tolerance**: Conservative/Moderate/Aggressive
4. **Data & Storage**: Cache size display, Clear cache button
5. **About**: Version, data sources, disclaimer text

**What's missing for a mountain weather/hiking safety app**:

- **No pressure unit** (hPa/mbar vs inHg) -- pressure is critical for weather reading and is commonly used by experienced hill-walkers
- **No elevation unit** (meters vs feet) -- many UK hikers think in feet for hill heights
- **No snow depth unit** (cm vs inches)
- **No default location/home area** -- users have to navigate to their preferred area every time
- **No data refresh interval setting** -- related to Item 7, users should be able to set auto-refresh frequency
- **No theme/display settings** -- dark mode is forced, no option for light mode or font size
- **No precipitation display preference** -- some prefer mm, others prefer inches or descriptive ("light", "heavy")
- **Risk tolerance has no visible effect** -- it's stored but never used to adjust displayed scores or warnings. The settings description says "Adjust how conditions are assessed for hiking" but no code reads `preferences.riskTolerance` to modify score display or alert thresholds
- **Notifications are non-functional** -- toggles exist but there is no push notification infrastructure; no service worker registration, no notification permission request
- **No export/import settings** -- users on multiple devices can't sync preferences
- **No map layer preferences** -- if map features are expanded (Item 3), users will need terrain/satellite toggle defaults

### CLAUDE.MD Link

"Help hikers make safety-informed decisions" -- settings that control how data is displayed, what units are used, and what constitutes a "safe" score directly impact the quality of safety decisions. A conservative hiker viewing scores calibrated for experienced mountaineers could misjudge conditions. Elevation in meters vs feet affects route planning comprehension.

### Plan

Prioritize additions by impact on the primary use case (safety-informed decisions):

**P0 (Must have -- directly impacts safety interpretation)**:
1. Make Risk Tolerance functional: adjust displayed hiking scores and warning thresholds
2. Add Default Home Area setting
3. Add Elevation unit (m/ft)

**P1 (Should have -- improves usability)**:
4. Add Pressure unit (hPa/inHg)
5. Add Precipitation display (mm/inches)
6. Add Auto-refresh interval (30min/1hr/2hr/4hr/manual)
7. Mark Notifications section as "Coming Soon" with disabled state

**P2 (Nice to have)**:
8. Add Font size / accessibility options (normal/large/extra-large)
9. Add Export/Import settings
10. Add Snow depth unit (cm/inches)

### Implementation Plan

**P0 Items**:

1. **Make Risk Tolerance functional**:

   - **File**: `frontend/src/utils/weather.ts`
   - Add `adjustScoreForRiskTolerance(score: number, tolerance: 'conservative' | 'moderate' | 'aggressive'): number`
     - Conservative: subtract 1.0 from displayed score (lower scores = more cautious)
     - Moderate: no adjustment (current behavior)
     - Aggressive: add 0.5 to displayed score (higher scores = less cautious)
   - **Files**: Every component that displays `hiking_score` or calls `getHikingScoreColor`/`getHikingScoreDescription` needs to apply the adjustment. Key locations:
     - `LocationPage.tsx` (CurrentConditionsCard, DayForecastCard, PeriodCard)
     - `WeatherTrend.tsx`
     - `WeatherCharts.tsx`
     - `WeatherCard.tsx` (homepage cards)
   - Alternative approach (simpler): Adjust the **thresholds** rather than the scores. Conservative uses higher score boundaries for "good" (e.g., 8.5 instead of 8), aggressive uses lower (e.g., 7 instead of 8). This is cleaner because it doesn't change the underlying data.
   - **File**: `frontend/src/utils/weather.ts` -- modify `getHikingScoreColor` and `getHikingScoreDescription` to accept a `riskTolerance` parameter.

2. **Add Default Home Area**:

   - **File**: `frontend/src/types/index.ts` -- Add `defaultArea?: string` to `UserPreferences`
   - **File**: `frontend/src/stores/useAppStore.ts` -- Add to defaultPreferences
   - **File**: `frontend/src/pages/SettingsPage.tsx` -- Add dropdown in Unit Preferences or new "Home Area" section. Populate from areas list (Torridon, Glencoe, Cairngorms, etc.)
   - **File**: `frontend/src/pages/HomePage.tsx` -- If `defaultArea` is set, pre-filter the homepage to show that area's locations first

3. **Add Elevation unit (m/ft)**:

   - **File**: `frontend/src/types/index.ts` -- Add `elevation: 'meters' | 'feet'` to `units`
   - **File**: `frontend/src/stores/useAppStore.ts` -- Add default `elevation: 'meters'`
   - **File**: `frontend/src/pages/SettingsPage.tsx` -- Add SegmentedControl for elevation
   - **File**: `frontend/src/utils/weather.ts` -- Add `formatElevation(meters: number, preferences): string` function
   - **Files**: `LocationPage.tsx`, `WeatherCard.tsx` -- Use `formatElevation` instead of hardcoded `${elevation_m}m`

**P1 Items**:

4. **Pressure unit**: Add to units type, add conversion function, add SegmentedControl
5. **Precipitation display**: Add to units type (`mm` | `inches`), update `formatPrecipitation`
6. **Auto-refresh interval**: Add to preferences, implement `useEffect` timer in `App.tsx` or a dedicated hook that triggers `queryClient.invalidateQueries` at the configured interval
7. **Notifications "Coming Soon"**: Wrap the Notifications `SettingsSection` children in a disabled overlay with a "Coming Soon" badge; disable all toggles

**Files to modify (all priorities)**:
| File | Change |
|------|--------|
| `frontend/src/types/index.ts` | Extend `UserPreferences.units` with elevation, pressure, precipitation |
| `frontend/src/stores/useAppStore.ts` | Add new defaults |
| `frontend/src/pages/SettingsPage.tsx` | Add new SegmentedControls and sections |
| `frontend/src/utils/weather.ts` | Risk tolerance scoring, formatElevation, unit conversions |
| `frontend/src/pages/LocationPage.tsx` | Use risk-adjusted scores, formatElevation |
| `frontend/src/components/weather/WeatherTrend.tsx` | Use risk-adjusted scores |
| `frontend/src/components/WeatherCharts.tsx` | Use risk-adjusted scores |
| `frontend/src/components/WeatherCard.tsx` | Use risk-adjusted scores, formatElevation |
| `frontend/src/pages/HomePage.tsx` | Default area pre-filtering |

**New files**: None

---

## Summary Table

| Item | Severity | Effort | Key Files | Dependencies |
|------|----------|--------|-----------|--------------|
| 7 (Backend Refresh) | High -- stale data is a safety risk | Medium (2 endpoints + frontend polling) | simple_api.py, DataStalenessWarning.tsx, client.ts | weather_scraper.py must be runnable from backend |
| 11 (Trend UX) | Medium -- confusing but functional | Medium (significant WeatherTrend.tsx rewrite) | WeatherTrend.tsx | None |
| 12 (Chart Granularity) | Medium -- limited but functional | Low-Medium (add aggregation toggle + fix labels) | WeatherCharts.tsx | Constrained by scraper's 3-period/day data |
| 13 (Settings) | High for P0 items (risk tolerance is non-functional) | Medium-High (touches many files for risk tolerance) | SettingsPage.tsx, weather.ts, types, multiple consuming components | None |

## Recommended Implementation Order

1. **Item 13 P0** (Risk Tolerance functional) -- highest impact, it's a broken promise in the current UI
2. **Item 7** (Backend Refresh) -- directly addresses stale data safety concern
3. **Item 12** (Chart Granularity) -- relatively contained, fixes fake time labels
4. **Item 11** (Trend UX) -- most design-intensive, can be iterated on
5. **Item 13 P1** (Additional settings) -- incremental improvements
