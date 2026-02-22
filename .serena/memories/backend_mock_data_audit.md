# Backend Mock Data Audit (2026-02-20)

## AUDIT CONCLUSION: PASSED ✅

Backend mock data usage is intentional, well-documented, and properly isolated.

## KEY FINDINGS

### Production API (main.py, api.py)
- **Status**: CLEAN - No mock data, no hardcoded placeholders
- All data comes from real database queries
- No fallbacks to generated data

### Mock API (simple_api.py) - Intentional Testing Mode
- **stable_mock_value()** (lines 23-26, 170, 174)
  - Generates deterministic mock values for visibility (2000-15000m) and humidity (50-95%)
  - Used because scraper doesn't extract these fields from mountain-forecast.com
  - Documented with comments explaining the rationale
  - Prevents non-deterministic UI changes on repeated calls

- **generate_mock_weather_period()** (lines 980-1044)
  - Uses random.randint() and random.choice() for weather variations
  - Only called by mock forecast generator
  - Realistic ranges: temp -5 to +8°C variance, wind -10 to +15 kph variance
  - Precipitation: [0, 0, 0.5, 2, 5, 10] mm (first 3 days) or [0, 1, 3, 8] mm (later)

- **generate_mock_forecast()** (lines 1046-1087)
  - Called only when no real scraped forecast data available
  - Marked with data_source: "mock-api"
  - Generates 6-day forecast using mock weather periods

- **MOCK_LOCATIONS** (lines 211-978)
  - 60 real Scottish mountains from config.yaml
  - All data verified: names, elevations, coordinates, classifications are accurate
  - Used as location list when real data unavailable

### Fallback Hierarchy (Correct Implementation)
1. Try load forecasts/[location]/*.json (scraped real data)
2. If found, convert to API format (may use mock fallbacks for visibility/humidity)
3. If not found, generate complete mock forecast
4. All transitions logged at INFO level so users know which data source they're getting

### Test Files (Legitimate)
- test_db.py: Database connectivity testing (not in production)
- data_migration.py: Real data migration (no mock data)

### Weather Scraper (Legitimate Random Usage)
- Lines 386, 1914: random.uniform() for HTTP request delays (rate limiting)
- Purpose: Respectful scraping, avoid overwhelming target site

## IMPORTANT: What's NOT Mock

1. **Mountain locations**: All real (from config.yaml)
2. **Elevation data**: All real
3. **Coordinates**: All real
4. **Hiking score algorithm**: Uses real calculation logic
5. **Real scraped data**: When available, always preferred

## Missing Data (Documented Fallbacks)

The scraper doesn't extract:
- Visibility (filled with deterministic mock 2000-15000m range)
- Humidity (filled with deterministic mock 50-95% range)

These are the ONLY mock fallbacks in the data transform pipeline. Temperature, wind, precipitation, etc. all come from real scraper data when available.

## Production Readiness

✅ No mock data leaking to production API
✅ Clear separation: simple_api.py (testing) vs main.py/api.py (production)
✅ Proper fallback hierarchy with real data prioritized
✅ Clear logging and API version markers
✅ Real location data used throughout
