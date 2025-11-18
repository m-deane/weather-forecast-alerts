# Weather Scraper Robustness Analysis
## Comprehensive Error Pattern & Reliability Assessment

**Analysis Date:** 2025-11-18
**Scraper Version:** weather_scraper.py (current)
**Data Source:** mountain-forecast.com
**Analysis Scope:** 367 successful forecasts, 4 failed runs documented

---

## EXECUTIVE SUMMARY

### Current Reliability Metrics
- **Overall Success Rate:** ~85-90% (estimated from 367 successful forecasts vs recurring failures)
- **Persistent Failures:** 7-8 unique Munros consistently failing across multiple runs
- **Primary Failure Mode:** HTML fetch failures (network/rate limiting)
- **Secondary Failure Mode:** URL naming inconsistencies (mountain-forecast.com URL structure)
- **Data Quality:** Good when scraping succeeds; validation catches malformed data

### Critical Findings
1. **URL Naming Issues:** Multiple mountains have incorrect URLs in config.yaml that don't match mountain-forecast.com's actual URL structure
2. **Rate Limiting Risk:** No evidence of 429 errors, but the site may have silent rate limiting causing intermittent failures
3. **Fragile HTML Selectors:** Heavy reliance on specific CSS classes with limited fallback options
4. **Limited Monitoring:** No proactive detection of HTML structure changes
5. **Good Error Recovery:** Retry logic works well; failures are logged appropriately

---

## 1. ERROR PATTERN ANALYSIS

### 1.1 Failed Munros Timeline Analysis

**Failed Munros Across 4 Documented Runs:**

| Run Date | Failed Count | Common Failures |
|----------|--------------|-----------------|
| 2025-05-31 | 8 munros | Liathach, Maol Chean Dearg, Beinn A Chearcaill, Sgurr An Fhidhleir, A Mhaighdean, An Teallach, Beinn a Chrulaiste, Ben More Coigach |
| 2025-06-06 | 8 munros | Same as above |
| 2025-06-07 | 7 munros | Same as above (Liathach succeeded) |
| 2025-09-14 | 7 munros | Same as above (Liathach succeeded) |

**Pattern Identified:** The same 7-8 munros fail repeatedly across different dates, suggesting **systematic URL issues** rather than transient network problems.

### 1.2 Failure Status Breakdown

All failures show status: **"HTML fetch failed"**

This maps to two code paths in weather_scraper.py:
- Line 186: `logger.error(f"Failed to fetch HTML after {max_retries} attempts for {url}")`
- Line 1761: `logger.error(f"Failed to retrieve HTML for {munro_name}")`

**Root Cause Analysis:**

Examining the failed URLs vs config.yaml:

| Munro | Config URL | Issue | Corrected In Later Runs |
|-------|-----------|-------|------------------------|
| Liathach | `/peaks/Liathach/` | Should be `/peaks/Liathac/` | YES (line 16 config.yaml) |
| Maol Chean Dearg | `/peaks/Maol-Chean-dearg/` | Case sensitivity issue | NO |
| Beinn A Chearcaill | `/peaks/Beinn-a-Chearcaill/` | Should be `/peaks/Beinn-a-Chearcall/` | NO |
| Sgurr An Fhidhleir | `/peaks/Sgurr-an-Fhidhleir/` | Combined page: `/peaks/Sgurr-an-Fhidhleir-and-Ben-Mor-Coigach/` | YES (fix_known_url_issues) |
| A Mhaighdean | `/peaks/A-Mhaighdean/` | Combined page: `/peaks/A-Mhaighdean-and-Ruadh-Stac-Mor/` | YES (fix_known_url_issues) |
| An Teallach | Multiple variations | Complex naming: `Bidean` vs `Bidein`, Sgurr Fiona addition | PARTIAL |
| Beinn a Chrulaiste | `/peaks/Beinn-a-Chrulaiste/` | Different mountain: `/peaks/Creise-and-Meall-a-Bhuiridh/` | YES (fix_known_url_issues) |
| Ben More Coigach | `/peaks/Ben-Mor-Coigach/` | Combined page with Sgurr an Fhidhleir | YES (fix_known_url_issues) |

### 1.3 Error Recovery Timeline

**Evidence of URL Fix Implementation:**
- Lines 1589-1631: `fix_known_url_issues()` function added
- Several known URL issues are now handled (Sgurr an Fhidhleir, A Mhaighdean, Ben Mor Coigach, Beinn a Chrulaiste)
- However, config.yaml still contains wrong base URLs

**Current State:**
- Runtime fixes partially compensate for config errors
- Some URLs still unhandled (Maol Chean Dearg case variations, Beinn A Chearcaill spelling)

---

## 2. ROBUSTNESS ASSESSMENT

### 2.1 Retry Logic & Exponential Backoff

**Implementation (Lines 122-187):**
```python
- MAX_RETRIES = 3
- RETRY_DELAY_BASE = 5 seconds
- Exponential backoff: delay = 5 * (2 ** attempt) + random(0, 1)
- Attempts: 0s → 5-6s → 10-11s → 20-21s
```

**Assessment:** ✓ GOOD
- Proper exponential backoff implemented
- Random jitter prevents thundering herd
- Total retry window: ~35-40 seconds (appropriate for external API)
- Respects HTTP status codes (404 = no retry)

**Recommendation:** Consider increasing MAX_RETRIES to 5 for more resilience against transient network issues.

### 2.2 User-Agent Rotation

**Implementation (Lines 23-29, 151-159):**
```python
- Pool of 5 diverse User-Agents (Chrome, Firefox, Safari, Linux)
- Random selection on each request
- Additional browser-like headers (Accept, Accept-Language, etc.)
```

**Assessment:** ✓ EXCELLENT
- Good variety of legitimate browser signatures
- Headers mimic real browser behavior
- Reduces fingerprinting risk

**No changes recommended.**

### 2.3 URL Validation

**Implementation (Lines 106-119):**
```python
def validate_url(url):
    result = urlparse(url)
    return all([result.scheme, result.netloc])
```

**Assessment:** ⚠️ BASIC
- Only validates URL format (scheme + netloc present)
- Does NOT validate URL correctness against mountain-forecast.com structure
- Does NOT catch spelling/naming errors

**Recommendations:**
1. Add domain whitelist check: `result.netloc == 'www.mountain-forecast.com'`
2. Add path pattern validation: `/peaks/[mountain-name]/forecasts/[elevation]`
3. Optional: HEAD request validation during config load (check_urls.py integration)

### 2.4 BeautifulSoup Selector Robustness

**Primary Selectors (Lines 375-389):**
```python
table_selectors = [
    'table.forecast-table__table',
    'table.forecast-table',
    'table[class*="forecast"]',
    'div.forecast-table table',
    'div[class*="forecast"] table'
]
```

**Assessment:** ✓ GOOD with LIMITATIONS
- Multiple fallback selectors (5 levels)
- Graceful degradation from specific to generic
- Good error handling with try/except blocks

**Fragility Points:**
- Heavy reliance on specific class names (`forecast-table__table`, `forecast-table-days__cell`)
- Data extraction uses hardcoded `data-row` attributes (lines 533-550)
- No schema validation - if table structure changes subtly, data may be misaligned

**Recommendations:**
1. Add HTML structure fingerprinting (detect major layout changes)
2. Implement CSS selector versioning (detect when selectors fail)
3. Add data sanity checks (e.g., temperature ranges, wind speed limits)

### 2.5 Graceful Failure Handling

**Implementation Assessment:**

| Failure Scenario | Handling | Location |
|------------------|----------|----------|
| Network timeout | ✓ Retry with backoff | Lines 174-184 |
| 404 Not Found | ✓ No retry, log error | Lines 169-171 |
| 429 Rate Limit | ✓ Retry (status_forcelist) | Line 144 |
| Parse failure | ✓ Continue, log warning | Lines 629-637 |
| Missing forecast table | ✓ Return None, log error | Lines 390-392 |
| Invalid data | ✓ Validate, reject if bad | Lines 238-282 |
| Failed munros | ✓ Track in CSV | Lines 1789-1798 |

**Assessment:** ✓ EXCELLENT
- Comprehensive error handling throughout
- Failures don't crash the entire run
- Failed munros logged to CSV for review
- Appropriate use of logging levels (error vs warning)

**Minor Enhancement:** Add error categorization (network vs parse vs validation) in failed_munros CSV.

---

## 3. DEPENDENCY FRAGILITY ANALYSIS

### 3.1 HTML Structure Dependencies

**Critical Dependencies:**

1. **Forecast Table Structure**
   - Line 375: `table.forecast-table__table` (most specific)
   - Fallbacks exist, but all depend on table-based layout
   - **Risk:** If mountain-forecast.com switches to div-based layout, all selectors fail

2. **Header Row Structure**
   - Lines 420-432: Expects `data-row="days"` and `data-row="time"` attributes
   - Fallback: First two `<tr>` elements in `<thead>`
   - **Risk:** Moderate - fallback works if attribute naming changes

3. **Data Row Attributes**
   - Lines 533-550: Hardcoded `data-row` types:
     - `phrases`, `weather`, `rain`, `snow`, `temperature-max`, `temperature-min`, `temperature-chill`, `wind`, `freezing-level`, `cloud-base`
   - **Risk:** HIGH - no fallback if attribute names change
   - **Impact:** Complete data loss if any attribute renamed

4. **Cell Class Names**
   - `forecast-table-days__cell`, `forecast-table__cell`, `forecast-table-days__name`, etc.
   - Multiple specific class dependencies
   - **Risk:** Moderate - generic fallbacks exist but less reliable

### 3.2 Selector Breakage Probability

**Estimate based on web scraping best practices:**

| Selector Type | Change Frequency | Current Robustness | Failure Impact |
|---------------|------------------|-------------------|----------------|
| Table classes | Low (6-12 months) | Good (5 fallbacks) | Medium (no forecasts) |
| data-row attributes | Medium (3-6 months) | Poor (no fallbacks) | High (no data) |
| Cell classes | Medium (3-6 months) | Good (fallbacks exist) | Medium (partial data) |
| HTML structure | Very Low (12+ months) | Moderate (layout assumed) | Critical (complete failure) |

**Overall Assessment:** The scraper has a **6-12 month expected lifespan** without maintenance if mountain-forecast.com updates their site.

### 3.3 Structure Validation

**Current Implementation (Lines 285-330):**
```python
def check_page_has_forecast(html_content):
    # Checks for forecast table existence
    # Checks for redirect indicators
```

**Assessment:** ⚠️ LIMITED
- Only validates presence of forecast table
- Does NOT validate table structure (row count, column count, data types)
- Does NOT fingerprint the HTML schema for change detection

**Recommendations:**
1. Add table structure fingerprinting:
   - Count expected rows (should have ~10-12 data rows)
   - Count columns (should have 9-12 time periods)
   - Validate data-row attributes present
2. Store schema fingerprint and alert on changes
3. Add data type validation (temps are floats, dates are valid, etc.)

### 3.4 Change Detection

**Current Capability:** ❌ NONE

The scraper has NO proactive detection of HTML structure changes. Changes are only discovered when:
1. Scraper fails completely (alerts via failed_munros CSV)
2. Data validation fails (logs warning, returns None)
3. Manual inspection of results

**Impact:** Failures are reactive rather than proactive. Could go days/weeks scraping bad data before discovery.

---

## 4. DATA QUALITY ISSUES

### 4.1 Data Validation Before Saving

**Implementation (Lines 238-282):**
```python
def validate_forecast_data(forecast_data, location_name):
    - Checks for required fields (location, source, forecast_periods)
    - Checks for non-empty periods
    - Validates at least some weather data exists (temp/wind/precip)
    - Counts valid periods
```

**Assessment:** ✓ GOOD
- Rejects completely empty forecasts
- Ensures minimum data quality standards
- Logs specific validation failures

**Enhancement Opportunities:**
1. Add range validation:
   - Temperature: -50°C to 50°C
   - Wind: 0-200 kph
   - Precipitation: 0-500mm
   - Dates: Within next 10 days
2. Add cross-field validation:
   - temp_min <= temp_max
   - temp_chill <= temp_min (wind chill should be colder)
3. Add historical comparison:
   - Flag if current forecast radically different from previous run
   - Detect stuck/stale data

### 4.2 Data Corruption & Parsing Errors

**Error Handling (Lines 556-641):**

Parsing errors are caught and handled with:
- Try/except blocks around all data extraction
- Type conversion with error handling (ValueError, TypeError)
- Default values (None, 0.0, 'N/A') when parsing fails
- Detailed logging with `exc_info=True` for debugging

**Assessment:** ✓ EXCELLENT
- Robust against malformed HTML
- Partial failures don't corrupt entire dataset
- Errors are logged with full context

**Observed Issues from Logs:**
- Lines 584-589: Occasional issues converting rain/snow amounts (data-value vs text extraction)
- Lines 597-599: Temperature parsing from text (regex fallback)
- Lines 568-574: Wind direction missing handling

**Recommendation:** Add data quality metrics to saved JSON:
```json
{
  "data_quality": {
    "parsing_errors": 3,
    "missing_fields": ["temp_chill_c"],
    "validation_warnings": [],
    "confidence_score": 0.92
  }
}
```

### 4.3 Date/Time Handling

**Implementation (Lines 459-471):**
```python
- Uses data-date attribute (YYYY-MM-DD format)
- Falls back to text parsing if attribute missing
- Handles timezone offset for OWM data (lines 738-747)
```

**Assessment:** ✓ GOOD with DST RISK
- Date parsing is robust
- Timezone handling for OWM sunrise/sunset
- **Potential Issue:** No explicit DST handling for UK time
- **Potential Issue:** Scrape time is local machine time (line 370), could be inconsistent if run from different timezones

**Recommendations:**
1. Explicitly use UK timezone (pytz.timezone('Europe/London'))
2. Store all timestamps in UTC with timezone info
3. Add DST transition detection (late March, late October)

### 4.4 Unit Conversions

**Conversions Performed:**
- Line 761: OWM wind: m/s → kph (multiply by 3.6)
- Line 765: OWM snow: mm → cm (multiply by 0.1)

**Assessment:** ✓ CORRECT
- Conversions are mathematically correct
- Units are clearly labeled in data

**No issues found.**

---

## 5. PRIORITIZED IMPROVEMENT RECOMMENDATIONS

### 5.1 CRITICAL (Fix Immediately)

**Priority 1: Fix Config URL Issues**
- **File:** `/Users/matthewdeane/Documents/Data Science/python/_projects/__utils-weather-forecast-alerts/config.yaml`
- **Impact:** 7-8 munros consistently failing
- **Changes Required:**
  - Line 20: `Maol-Chean-dearg` → `Maol-Chean-Dearg` (case sensitivity)
  - Line 35: `Beinn-a-Chearcaill` → `Beinn-a-Chearcall` (spelling: ill → all)
  - Line 38: `Sgurr-an-Fhidhleir` → verify correct URL or rely on fix_known_url_issues
  - Line 41: `A-Mhaighdean` → verify correct URL or rely on fix_known_url_issues
  - Line 47: Verify An Teallach URL structure
  - Line 67: `Beinn-a-Chrulaiste` → verify correct URL or rely on fix_known_url_issues

**Priority 2: Add HTML Structure Change Detection**
- **Location:** New function after line 330
- **Implementation:**
```python
def fingerprint_forecast_table(soup, location_name):
    """Generate a fingerprint of the forecast table structure."""
    table = soup.select_one('table.forecast-table__table')
    if not table:
        return None

    fingerprint = {
        'row_count': len(table.find_all('tr')),
        'data_row_types': [row.get('data-row') for row in table.find_all('tr', attrs={'data-row': True})],
        'column_count': len(table.find('thead').find_all('td')),
        'has_elevation': bool(soup.find(attrs={'data-elevation': True})),
        'timestamp': datetime.datetime.now().isoformat()
    }

    # Store fingerprint and compare with previous
    # Alert if fingerprint changes
    return fingerprint
```

**Priority 3: Enhance URL Validation**
- **Location:** Lines 106-119
- **Implementation:**
```python
def validate_url(url):
    """Enhanced URL validation with domain and path checks."""
    try:
        result = urlparse(url)

        # Check format
        if not all([result.scheme, result.netloc]):
            return False

        # Check domain whitelist
        if result.netloc != 'www.mountain-forecast.com':
            logger.warning(f"URL not from mountain-forecast.com: {url}")
            return False

        # Check path pattern
        path_pattern = r'^/peaks/[\w-]+/forecasts/\d+$'
        if not re.match(path_pattern, result.path):
            logger.warning(f"URL path doesn't match expected pattern: {url}")
            return False

        return True
    except:
        return False
```

### 5.2 HIGH (Fix Soon)

**Priority 4: Add Data Range Validation**
- **Location:** Lines 238-282 (enhance validate_forecast_data)
- **Implementation:** Add range checks for all numeric fields
- **Impact:** Catch corrupted/malformed data before saving

**Priority 5: Implement Proactive URL Health Checks**
- **Location:** Integrate check_urls.py into main workflow
- **Implementation:**
  - Run check_urls.py before main scraping
  - Cache results for 24 hours
  - Alert on new failures
  - Store URL health history

**Priority 6: Add Data Quality Metrics**
- **Location:** Lines 1553-1557 (when saving JSON)
- **Implementation:** Add `data_quality` object to saved JSON
- **Impact:** Track scraper reliability over time

### 5.3 MEDIUM (Enhancement)

**Priority 7: Improve Error Categorization**
- **Location:** Lines 1789-1798 (failed_munros CSV)
- **Implementation:** Add error_category column:
  - `network_timeout`
  - `url_not_found`
  - `parse_failure`
  - `validation_failure`
  - `rate_limited`

**Priority 8: Add Timezone Awareness**
- **Location:** Lines 6, 370, 1135-1139
- **Implementation:**
  - Use `pytz.timezone('Europe/London')` for all UK times
  - Store UTC timestamps with timezone info
  - Handle DST transitions explicitly

**Priority 9: Increase Retry Attempts**
- **Location:** Line 31
- **Change:** `MAX_RETRIES = 3` → `MAX_RETRIES = 5`
- **Impact:** More resilient against transient failures

### 5.4 LOW (Nice to Have)

**Priority 10: Add Request Rate Limiting**
- **Location:** After line 1739
- **Implementation:**
  - Track requests per minute
  - Add adaptive delays if approaching limits
  - Current: 3-6 second random delay (good, but not adaptive)

**Priority 11: Implement Caching Layer**
- **Location:** New module
- **Implementation:**
  - Cache successful HTML fetches for 1 hour
  - Retry from cache on failures
  - Reduce load on mountain-forecast.com

**Priority 12: Add Historical Data Comparison**
- **Location:** After validation
- **Implementation:**
  - Compare current forecast with previous run
  - Flag significant deviations
  - Detect stale/stuck data

---

## 6. ALTERNATIVE DATA SOURCE RECOMMENDATIONS

### 6.1 Current Risk Profile

**Single Point of Failure:** mountain-forecast.com
- If site goes down: 100% data loss
- If site changes structure: High probability of complete failure
- If site implements stricter rate limiting: Reduced data availability

### 6.2 Recommended Alternative Sources

**Primary Backup: Met Office DataPoint API**
- **URL:** https://www.metoffice.gov.uk/services/data/datapoint
- **Coverage:** Comprehensive UK weather data
- **Format:** JSON API (more reliable than web scraping)
- **Cost:** Free tier available (5,000 requests/day)
- **Elevation Data:** Site-specific forecasts available
- **Implementation Effort:** Medium (new parser, similar to OWM)

**Secondary Backup: Norway Met (Yr.no) API**
- **URL:** https://api.met.no/weatherapi/locationforecast/2.0/
- **Coverage:** Global (including UK mountains)
- **Format:** JSON API
- **Cost:** Free (attribution required)
- **Elevation Data:** Requires manual elevation specification
- **Implementation Effort:** Medium

**Tertiary Option: NOAA/GFS Data**
- **Coverage:** Global gridded data
- **Format:** GRIB2 (complex)
- **Cost:** Free
- **Elevation Data:** Model levels (requires interpolation)
- **Implementation Effort:** High (requires specialized libraries)

### 6.3 Hybrid Strategy Recommendation

**Proposed Architecture:**
1. **Primary:** mountain-forecast.com (current implementation)
   - Mountain-specific forecasts
   - Best UI/UX for outdoor activities
   - Continue scraping with improvements

2. **Secondary:** Met Office DataPoint
   - Fallback for failed mountain-forecast.com fetches
   - Cross-validation of forecasts
   - More reliable data source

3. **Tertiary:** OpenWeatherMap (already implemented)
   - Geographic area forecasts
   - Sunrise/sunset data
   - Keep current implementation

**Implementation Plan:**
- Add Met Office parser (similar structure to OWM parser)
- Implement source priority logic:
  ```python
  def get_forecast_with_fallback(location):
      # Try mountain-forecast.com
      forecast = get_mountain_forecast(location)
      if validate_forecast_data(forecast):
          return forecast

      # Fallback to Met Office
      forecast = get_metoffice_forecast(location)
      if validate_forecast_data(forecast):
          return forecast

      # Last resort: OWM
      return get_owm_forecast(location)
  ```

---

## 7. MONITORING & ALERTING RECOMMENDATIONS

### 7.1 Metrics to Track

**Scraper Health Metrics:**
1. Success rate per run (track in database/log)
2. Average response time per source
3. Retry rate (% of requests requiring retry)
4. Parse failure rate
5. Validation failure rate
6. Data quality score (per forecast)

**Data Quality Metrics:**
1. Completeness (% of expected fields populated)
2. Freshness (time since last successful scrape)
3. Consistency (deviation from previous forecast)
4. Cross-source agreement (mountain-forecast.com vs Met Office vs OWM)

### 7.2 Alerting Strategy

**Critical Alerts (Immediate Notification):**
- Success rate drops below 50% for any source
- All sources failing for a location
- HTML structure change detected (fingerprint mismatch)
- Data validation failures increase >20%

**Warning Alerts (Daily Digest):**
- Individual munro failing repeatedly (3+ consecutive runs)
- Parse errors increasing
- Response times increasing
- Data quality score declining

**Info Alerts (Weekly Summary):**
- Overall success rate trends
- Most reliable sources
- Data quality trends
- Failed munros summary

### 7.3 Implementation Options

**Option 1: Email Alerts**
- Use Python smtplib
- Send to configured email address
- Attach failed_munros CSV
- Include summary statistics

**Option 2: Logging to External Service**
- Sentry for error tracking
- Datadog/Prometheus for metrics
- Grafana for visualization
- Requires additional infrastructure

**Option 3: Local Dashboard**
- SQLite database for metrics storage
- Flask web dashboard
- Lightweight, no external dependencies
- Good for local development

**Recommended:** Start with Option 1 (email alerts) + enhanced logging, migrate to Option 3 for long-term monitoring.

### 7.4 Proactive Monitoring Script

**New File:** `monitor_scraper_health.py`

```python
#!/usr/bin/env python3
"""Monitor scraper health and alert on issues."""

import glob
import json
import datetime
from collections import defaultdict

def analyze_recent_runs(hours=24):
    """Analyze scraper runs in the last N hours."""
    cutoff = datetime.datetime.now() - datetime.timedelta(hours=hours)

    # Load recent forecasts
    forecasts = []
    for f in glob.glob('forecasts/**/*.json', recursive=True):
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(f))
        if mtime > cutoff:
            with open(f) as fh:
                forecasts.append(json.load(fh))

    # Load recent failures
    failures = []
    for f in glob.glob('forecasts/failed_munros_*.csv'):
        mtime = datetime.datetime.fromtimestamp(os.path.getmtime(f))
        if mtime > cutoff:
            failures.append(f)

    # Calculate metrics
    total_attempts = len(forecasts) + sum(count_csv_rows(f) for f in failures)
    success_rate = len(forecasts) / total_attempts if total_attempts > 0 else 0

    # Check for critical issues
    if success_rate < 0.5:
        send_alert(f"CRITICAL: Success rate dropped to {success_rate:.1%}")

    # Check for structural changes
    fingerprints = [get_fingerprint(f) for f in forecasts]
    if fingerprints_diverging(fingerprints):
        send_alert("WARNING: HTML structure may have changed")

    return {
        'success_rate': success_rate,
        'total_forecasts': len(forecasts),
        'total_failures': sum(count_csv_rows(f) for f in failures),
        'alert_triggered': success_rate < 0.5
    }

if __name__ == '__main__':
    results = analyze_recent_runs(hours=24)
    print(json.dumps(results, indent=2))
```

---

## 8. SPECIFIC CODE CHANGES REQUIRED

### 8.1 config.yaml URL Corrections

**File:** `/Users/matthewdeane/Documents/Data Science/python/_projects/__utils-weather-forecast-alerts/config.yaml`

**Line 20:** (CRITICAL)
```yaml
# CURRENT:
      - name: Maol Chean Dearg
        url: https://www.mountain-forecast.com/peaks/Maol-Chean-dearg/forecasts/933

# CORRECTED:
      - name: Maol Chean Dearg
        url: https://www.mountain-forecast.com/peaks/Maol-Chean-Dearg/forecasts/933
```

**Line 35:** (CRITICAL)
```yaml
# CURRENT:
      - name: Beinn A Chearcaill
        url: https://www.mountain-forecast.com/peaks/Beinn-a-Chearcaill/forecasts/724

# CORRECTED:
      - name: Beinn A Chearcaill
        url: https://www.mountain-forecast.com/peaks/Beinn-a-Chearcall/forecasts/724
```

**Lines 38, 41, 67:** (VERIFY)
```yaml
# These are handled by fix_known_url_issues(), but config should be corrected anyway:

# Line 38:
      - name: Sgurr An Fhidhleir
        url: https://www.mountain-forecast.com/peaks/Sgurr-an-Fhidhleir-and-Ben-Mor-Coigach/forecasts/705

# Line 41:
      - name: A Mhaighdean
        url: https://www.mountain-forecast.com/peaks/A-Mhaighdean-and-Ruadh-Stac-Mor/forecasts/967

# Line 67:
      - name: Beinn a Chrulaiste
        url: https://www.mountain-forecast.com/peaks/Creise-and-Meall-a-Bhuiridh/forecasts/857
```

### 8.2 weather_scraper.py Enhancements

**Line 31:** (MEDIUM PRIORITY)
```python
# CURRENT:
MAX_RETRIES = 3

# RECOMMENDED:
MAX_RETRIES = 5  # Increased resilience against transient failures
```

**After Line 119:** (CRITICAL - Enhanced URL Validation)
```python
def validate_url_strict(url):
    """Enhanced URL validation with domain and path pattern checks."""
    import re
    try:
        result = urlparse(url)

        # Basic format check
        if not all([result.scheme, result.netloc]):
            logger.warning(f"Invalid URL format (missing scheme/netloc): {url}")
            return False

        # Domain whitelist check
        if result.netloc != 'www.mountain-forecast.com':
            logger.warning(f"URL not from mountain-forecast.com: {url}")
            return False

        # Path pattern validation
        path_pattern = r'^/peaks/[\w-]+/forecasts/\d+$'
        if not re.match(path_pattern, result.path):
            logger.warning(f"URL path doesn't match expected pattern: {url}")
            logger.info(f"Expected: /peaks/[mountain-name]/forecasts/[elevation]")
            logger.info(f"Got: {result.path}")
            return False

        return True
    except Exception as e:
        logger.error(f"URL validation error for {url}: {e}")
        return False
```

**After Line 330:** (CRITICAL - HTML Structure Change Detection)
```python
def fingerprint_forecast_table(soup, location_name):
    """Generate a fingerprint of the forecast table structure.

    This allows detection of HTML structure changes that might break parsing.
    """
    try:
        table = soup.select_one('table.forecast-table__table')
        if not table:
            logger.warning(f"No forecast table found for fingerprinting: {location_name}")
            return None

        thead = table.find('thead')
        tbody = table.find('tbody')

        fingerprint = {
            'location': location_name,
            'timestamp': datetime.datetime.now().isoformat(),
            'row_count_total': len(table.find_all('tr')),
            'row_count_thead': len(thead.find_all('tr')) if thead else 0,
            'row_count_tbody': len(tbody.find_all('tr')) if tbody else 0,
            'data_row_types': sorted([row.get('data-row') for row in table.find_all('tr', attrs={'data-row': True})]),
            'column_count': len(thead.find_all('td')) if thead else 0,
            'has_elevation_attr': bool(soup.find(attrs={'data-elevation': True})),
            'has_data_date_attrs': bool(thead.find_all('td', attrs={'data-date': True})) if thead else False
        }

        # Expected fingerprint for mountain-forecast.com (as of 2025-11)
        expected = {
            'row_count_thead': 2,
            'row_count_tbody': 10,  # Approx (phrases, weather, rain, snow, temp-max, temp-min, temp-chill, wind, freezing-level, cloud-base)
            'data_row_types': ['cloud-base', 'freezing-level', 'phrases', 'rain', 'snow',
                              'temperature-chill', 'temperature-max', 'temperature-min',
                              'weather', 'wind'],
            'column_count': 9,  # 3 periods/day × 3 days (approx)
        }

        # Compare with expected
        mismatches = []
        for key in ['row_count_thead', 'row_count_tbody', 'data_row_types']:
            if key in expected and fingerprint.get(key) != expected[key]:
                mismatches.append(f"{key}: expected {expected[key]}, got {fingerprint.get(key)}")

        if mismatches:
            logger.warning(f"HTML structure deviation detected for {location_name}:")
            for mismatch in mismatches:
                logger.warning(f"  - {mismatch}")

        return fingerprint
    except Exception as e:
        logger.error(f"Error fingerprinting forecast table for {location_name}: {e}", exc_info=True)
        return None
```

**Line 364 (enhance parse_detailed_forecast):** (CRITICAL)
```python
# After line 364, add fingerprinting:
    # Fingerprint the HTML structure for change detection
    fingerprint = fingerprint_forecast_table(soup, location_name)
    if fingerprint:
        forecast_data['html_fingerprint'] = fingerprint
```

**Lines 238-282 (enhance validate_forecast_data):** (HIGH PRIORITY)
```python
def validate_forecast_data(forecast_data, location_name):
    """Enhanced validation with range checks and data quality scoring."""
    if not forecast_data:
        logger.warning(f"No forecast data to validate for {location_name}")
        return False

    # Existing validation...
    required_fields = ['location', 'source', 'forecast_periods']
    for field in required_fields:
        if field not in forecast_data:
            logger.warning(f"Missing required field '{field}' in forecast data for {location_name}")
            return False

    periods = forecast_data.get('forecast_periods', [])
    if not periods:
        logger.warning(f"No forecast periods found for {location_name}")
        return False

    # NEW: Range validation and quality scoring
    quality_issues = []
    valid_periods = 0

    for idx, period in enumerate(periods):
        if not (period.get('day_period') and period.get('time')):
            continue

        # Validate temperature ranges
        for temp_key in ['temp_max_c', 'temp_min_c', 'temp_chill_c']:
            temp = period.get(temp_key)
            if temp is not None:
                if not (-50 <= temp <= 50):
                    quality_issues.append(f"Period {idx} {temp_key} out of range: {temp}°C")

        # Validate temp_min <= temp_max
        temp_min = period.get('temp_min_c')
        temp_max = period.get('temp_max_c')
        if temp_min is not None and temp_max is not None:
            if temp_min > temp_max:
                quality_issues.append(f"Period {idx} temp_min ({temp_min}) > temp_max ({temp_max})")

        # Validate wind ranges
        wind = period.get('wind_kph')
        if wind is not None:
            if not (0 <= wind <= 200):
                quality_issues.append(f"Period {idx} wind out of range: {wind} kph")

        # Validate precipitation ranges
        rain = period.get('rain_mm')
        if rain is not None:
            if not (0 <= rain <= 500):
                quality_issues.append(f"Period {idx} rain out of range: {rain} mm")

        snow = period.get('snow_cm')
        if snow is not None:
            if not (0 <= snow <= 200):
                quality_issues.append(f"Period {idx} snow out of range: {snow} cm")

        # Count as valid if has any weather data
        has_data = any(period.get(k) is not None for k in
                      ['temp_max_c', 'temp_min_c', 'wind_kph', 'rain_mm', 'snow_cm'])
        if has_data:
            valid_periods += 1

    if valid_periods == 0:
        logger.warning(f"No valid forecast periods with data found for {location_name}")
        return False

    # Log quality issues but don't reject unless severe
    if quality_issues:
        logger.warning(f"Data quality issues for {location_name}:")
        for issue in quality_issues[:5]:  # Log first 5 issues
            logger.warning(f"  - {issue}")
        if len(quality_issues) > 5:
            logger.warning(f"  ... and {len(quality_issues) - 5} more issues")

        # Reject if >50% of data is problematic
        if len(quality_issues) > valid_periods * 0.5:
            logger.error(f"Too many quality issues ({len(quality_issues)}) for {location_name}, rejecting data")
            return False

    logger.info(f"Validated {valid_periods} forecast periods for {location_name}")
    return True
```

### 8.3 New Monitoring Script

**File:** `/Users/matthewdeane/Documents/Data Science/python/_projects/__utils-weather-forecast-alerts/monitor_scraper_health.py`

Create new file with complete monitoring implementation (see Section 7.4 above for code).

---

## 9. TESTING RECOMMENDATIONS

### 9.1 Unit Tests Required

**File:** `tests/test_url_validation.py`
```python
def test_validate_url_strict():
    # Valid URLs
    assert validate_url_strict("https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/1345")

    # Invalid domain
    assert not validate_url_strict("https://evil-site.com/peaks/Ben-Nevis/forecasts/1345")

    # Invalid path pattern
    assert not validate_url_strict("https://www.mountain-forecast.com/peaks/Ben-Nevis")

    # Missing elevation
    assert not validate_url_strict("https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/")
```

**File:** `tests/test_data_validation.py`
```python
def test_validate_forecast_data_ranges():
    # Temperature out of range
    bad_data = {
        "location": "Test",
        "source": "test",
        "forecast_periods": [
            {"day_period": "2025-01-01 AM", "time": "AM", "temp_max_c": 100}  # Too hot
        ]
    }
    assert not validate_forecast_data(bad_data, "Test")

    # temp_min > temp_max
    bad_data["forecast_periods"][0] = {
        "day_period": "2025-01-01 AM",
        "time": "AM",
        "temp_min_c": 20,
        "temp_max_c": 10
    }
    assert not validate_forecast_data(bad_data, "Test")
```

### 9.2 Integration Tests

**File:** `tests/test_scraper_integration.py`
```python
def test_scrape_known_good_url():
    """Test scraping a known working URL."""
    url = "https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/1345"
    html = get_html(url)
    assert html is not None

    forecast = parse_detailed_forecast(html, "Ben Nevis", url)
    assert forecast is not None
    assert validate_forecast_data(forecast, "Ben Nevis")

def test_scrape_handles_404():
    """Test graceful handling of non-existent URLs."""
    url = "https://www.mountain-forecast.com/peaks/NonExistent/forecasts/9999"
    html = get_html(url)
    assert html is None  # Should return None, not crash

def test_url_fixes_applied():
    """Test that fix_known_url_issues() works correctly."""
    bad_url = "https://www.mountain-forecast.com/peaks/Liathach/forecasts/1053"
    fixed_url = fix_known_url_issues(bad_url)
    assert "Liathac" in fixed_url  # Should be corrected
```

### 9.3 Regression Tests

After each scraper update, run:
1. Test against all munros in config.yaml
2. Compare success rate with baseline
3. Verify data quality metrics unchanged
4. Check for new parsing errors in logs

---

## 10. DEPLOYMENT CHECKLIST

Before deploying scraper improvements:

### Phase 1: Configuration Fixes
- [ ] Update config.yaml with corrected URLs (Section 8.1)
- [ ] Run check_urls.py to verify all URLs accessible
- [ ] Document URL changes in git commit

### Phase 2: Code Enhancements
- [ ] Implement enhanced URL validation (Section 8.2)
- [ ] Add HTML fingerprinting (Section 8.2)
- [ ] Enhance data validation with ranges (Section 8.2)
- [ ] Increase MAX_RETRIES to 5
- [ ] Add unit tests (Section 9.1)

### Phase 3: Monitoring
- [ ] Create monitor_scraper_health.py (Section 7.4)
- [ ] Set up email alerts for critical failures
- [ ] Schedule health check to run after each scrape
- [ ] Create baseline fingerprint for all mountains

### Phase 4: Validation
- [ ] Run full scrape with enhanced validation
- [ ] Compare results with previous run
- [ ] Verify all previously failing munros now succeed
- [ ] Check failed_munros CSV for any new issues

### Phase 5: Documentation
- [ ] Update README with new features
- [ ] Document monitoring and alerting setup
- [ ] Create troubleshooting guide for common errors

---

## CONCLUSION

The weather scraper is **fundamentally sound** with good error handling and retry logic. The main issues are:

1. **URL Configuration Errors** (easily fixable)
2. **Lack of Proactive Change Detection** (requires new fingerprinting code)
3. **Single Source Dependency** (mitigated by existing OWM integration, enhanced with Met Office)

With the recommended fixes, expected reliability should increase from **85-90%** to **95-98%**, with failures being mostly transient network issues rather than systematic problems.

**Estimated Implementation Time:**
- Critical fixes (config + validation): 2-4 hours
- High priority (monitoring): 4-6 hours
- Medium priority (enhancements): 6-8 hours
- Total: 12-18 hours for complete implementation

**Expected Lifespan After Fixes:**
- With monitoring: 12+ months before requiring maintenance
- Without monitoring: 6-12 months until HTML changes break scraper
