# Scottish Mountain Weather Data Sources - Executive Summary

**Research Date:** 2025-11-18
**Objective:** Evaluate alternative weather data sources to reduce dependency on mountain-forecast.com scraping

## Critical Findings

### Current Situation
- **Primary Source:** mountain-forecast.com (web scraping - FRAGILE)
- **Risk:** Single point of failure, no API, could break at any time
- **Secondary:** OpenWeatherMap (limited mountain capability)

### Best Alternative Discovered: Open-Meteo

**Open-Meteo** is the clear winner for Scottish mountain weather:

- **Cost:** FREE for non-commercial use
- **Elevation Handling:** Excellent - 90m resolution Digital Elevation Model with automatic temperature adjustment
- **Coverage:** Global, integrates 20+ national weather services including UK Met Office
- **Data Quality:** Combines best weather models for each location
- **API:** Simple REST API, no key required, well-documented
- **Reliability:** Very high, self-hosting option available

**Example:** Temperature automatically adjusted ~0.7°C per 100m elevation gain

## Recommended Architecture: Multi-Source Strategy

### Tier 1: Primary Forecasts (FREE)
1. **Open-Meteo** - Primary source with elevation adjustment
2. **Norway Met (Yr.no)** - Automatic backup/validation
   - Also free, Creative Commons license
   - Global coverage, 9-10 day forecasts

### Tier 2: Real-Time Validation (FREE)
3. **SAIS RSS Feeds** - Scottish Avalanche Information Service
   - 6 Scottish mountain areas including Torridon, Glencoe
   - Real-time observations from mountain weather stations
   - RSS feeds available per area
4. **Met Office WOW** - Weather Observations Website
   - Citizen weather station network
   - Real-time ground truth data
   - Free API available
5. **METAR/TAF** - Aviation weather
   - Nearby Scottish airports (Inverness, Glasgow, etc.)
   - High-quality official observations
   - Excellent for wind/visibility validation

### Tier 3: Optional Commercial Enhancement
6. **Weather Unlocked** - Specialized mountain forecasts
   - Base/Mid/Upper elevation forecasts
   - Updated 4x daily
   - Pricing unknown - requires quote
7. **Visual Crossing** - Low-cost backup
   - 1000 free records/day
   - Then $0.0001/record (~$3-10/month typical)

## Key Discoveries

### Met Office Changes
- **DataPoint API retiring December 2025**
- **Mountain Weather API discontinued** - no replacement in new DataHub
- Met Office no longer providing mountain-specific API forecasts
- This validates our need to find alternatives NOW

### MWIS Limitations
- **No Public API available**
- Only web pages and PDF downloads
- Would require scraping (same fragility as current approach)
- RSS feeds not available

### SAIS Availability
- **RSS feeds available** for each Scottish area
- Real-time weather station data
- Excellent for validation and observations
- No forecast API but observational data very valuable

## Cost Comparison

| Setup | Monthly Cost | Reliability | Sources |
|-------|--------------|-------------|---------|
| **Current** | $0 | Low (scraping) | 2 |
| **Recommended Free** | $0 | High | 5+ |
| **Budget Commercial** | $3-10 | Very High | 7+ |
| **Professional** | $80-200 | Highest | 10+ |

**Recommendation:** Start with FREE multi-source setup - dramatically better reliability at $0 cost

## Implementation Roadmap

### Phase 1: Core Free Sources (1-2 weeks)
- Integrate Open-Meteo API with elevation parameters
- Add Norway Met as automatic failover
- Test accuracy vs current mountain-forecast.com
- **Outcome:** Dual redundant primary sources, both free

### Phase 2: Validation Layer (1 week)
- Parse SAIS RSS feeds for real-time observations
- Integrate WOW API for citizen stations
- Add METAR/TAF for nearby airports
- **Outcome:** Real-time validation and confidence scoring

### Phase 3: Multi-Source Blending (1-2 weeks)
- Implement forecast comparison and conflict detection
- Build reliability calibration algorithm
- Create confidence scoring system
- **Outcome:** Intelligent blended forecast with quality metrics

### Phase 4: Optional Enhancement (as needed)
- Evaluate Weather Unlocked pricing/accuracy
- Add commercial sources if justified by accuracy gains
- **Outcome:** Enhanced accuracy if budget allows

## Code Example: Open-Meteo Integration

```python
import requests

# Ben Nevis example
lat = 56.7969
lon = -5.0036
elevation = 1345  # meters

url = 'https://api.open-meteo.com/v1/forecast'
params = {
    'latitude': lat,
    'longitude': lon,
    'elevation': elevation,  # Key: explicit summit elevation
    'hourly': ['temperature_2m', 'windspeed_10m', 'precipitation'],
    'daily': ['temperature_2m_max', 'temperature_2m_min', 'windspeed_10m_max'],
    'timezone': 'Europe/London',
    'forecast_days': 7
}

response = requests.get(url, params=params)
data = response.json()

# Forecast automatically adjusted for 1345m elevation
print(f"Summit forecast (elevation {data['elevation']}m):")
print(f"Max temp today: {data['daily']['temperature_2m_max'][0]}°C")
```

## Multi-Source Conflict Resolution Strategy

When sources disagree:

- **Temperature:** Average with outlier detection (flag if >3°C difference)
- **Wind:** Use MAXIMUM (safety-first approach for mountain conditions)
- **Precipitation:** Use MAXIMUM (conservative approach)
- **Confidence:** Higher when sources agree, lower when conflicting

Example: If Open-Meteo says 45 kph and Norway Met says 60 kph wind, use 60 kph.

## Legal/Licensing Summary

All recommended free sources permit commercial use with attribution:

- **Open-Meteo:** CC BY 4.0 (commercial requires paid upgrade)
- **Norway Met:** Creative Commons (commercial use OK)
- **SAIS:** Public information (RSS feeds)
- **WOW:** Open data
- **METAR/TAF:** US Government public domain

**Scraping Considerations:**
- mountain-forecast.com: No API, scraping legally unclear - recommend phasing out
- MWIS: No API, but publicly funded - contact for partnership

## Risk Analysis

### Current Approach Risks
- Single point of failure (mountain-forecast.com)
- Web scraping fragility (HTML changes break code)
- No terms of service for scraping
- Met Office DataPoint retiring soon

### Recommended Approach Benefits
- Multiple redundant sources (5+ free sources)
- All legitimate APIs with terms of service
- Free primary sources reduce commercial risk
- Elevation-specific adjustment for accuracy
- Real-time validation improves confidence

## Success Metrics

Track after implementation:

1. **Reliability:** Uptime % (target: 99%+ with multi-source)
2. **Accuracy:** Compare forecasts vs actual conditions
3. **Forecast Agreement:** % of time sources agree within tolerance
4. **API Costs:** Should remain $0 for non-commercial use
5. **Confidence Scores:** Track forecast confidence over time

## Top Priority Action Items

1. **IMMEDIATE:** Implement Open-Meteo integration (2-3 days effort)
2. **WEEK 1:** Add Norway Met backup (1 day effort)
3. **WEEK 2:** Integrate SAIS RSS feeds (2 days effort)
4. **WEEK 3-4:** Test accuracy and build comparison metrics
5. **MONTH 2:** Add multi-source blending and confidence scoring

## Conclusion

**STRONG RECOMMENDATION:** Implement multi-source free architecture

- **Primary:** Open-Meteo (excellent elevation handling, free, reliable)
- **Backup:** Norway Met (free, different models for validation)
- **Validation:** SAIS + WOW + METAR (real-time observations)

**Benefits:**
- Dramatically improved reliability (5+ sources vs 1)
- Same $0 cost as current approach
- Superior elevation handling (90m DEM vs general forecasts)
- Legal API access (vs questionable scraping)
- Real-time validation capability
- Future-proof (multiple redundant sources)

**ROI:** INFINITE - vastly better system at same cost

---

## Additional Resources

**Full Research Report:** `weather_data_sources_research_report.json`
- 15 APIs evaluated in detail
- Code examples for each source
- Complete pricing analysis
- Multi-source architecture design
- Legal/licensing review

**API Documentation Links:**
- Open-Meteo: https://open-meteo.com/en/docs
- Norway Met: https://api.met.no/
- SAIS RSS Feeds: https://www.sais.gov.uk/
- Met Office WOW: https://wow.metoffice.gov.uk/support/dataformats
- Aviation Weather: https://aviationweather.gov/data/api/

**Next Steps:**
1. Review this summary and full research report
2. Approve recommended multi-source architecture
3. Begin Phase 1 implementation (Open-Meteo + Norway Met)
4. Establish 2-4 week testing period comparing new sources to current data
5. Gradually phase out mountain-forecast.com scraping dependency
