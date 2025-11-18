# Weather API Quick Reference Comparison

## TOP RECOMMENDATIONS FOR SCOTTISH MOUNTAINS

| Rank | Source | Cost | Elevation | API | Ease | Rating | Use Case |
|------|--------|------|-----------|-----|------|--------|----------|
| 1 | Open-Meteo | FREE | Excellent (90m DEM) | Yes | Very Easy | A+ | PRIMARY |
| 2 | Norway Met | FREE | Good | Yes | Easy | A | BACKUP |
| 3 | SAIS RSS | FREE | Excellent | RSS | Medium | A | VALIDATION |
| 4 | WOW | FREE | Varies | Yes | Medium | B+ | VALIDATION |
| 5 | METAR/TAF | FREE | Airport | Yes | Easy | B+ | VALIDATION |

## COMPLETE SOURCE COMPARISON

### Primary Forecast Sources

| Source | Cost/Month | API | Elevation | Scotland | Reliability | Notes |
|--------|-----------|-----|-----------|----------|-------------|-------|
| **Open-Meteo** | $0 | Yes | Excellent (90m DEM) | Good | Very High | TOP CHOICE - automatic elevation adjustment |
| **Norway Met** | $0 | Yes | Good | Good | Very High | Excellent free backup |
| **Met Office DataHub** | Custom | Yes | Poor | Excellent | High | Mountain API retired Dec 2025 |
| **Windy Professional** | €82.50 | Yes | Good | Good | High | Expensive, ECMWF unavailable |
| **Visual Crossing** | $0-10 | Yes | Good | Good | Good | 1000 free/day, elevation-adjusted |
| **Tomorrow.io** | Custom | Yes | Good | Good | High | Custom pricing, comprehensive data |
| **AccuWeather** | $2-Custom | Yes | Good | Good | High | Limited free tier (500/day) |
| **Weather Unlocked** | Unknown | Yes | Excellent | Good | High | Mountain-specific, need pricing |
| **Pirate Weather** | $0-2 | Yes | Good | Good | Medium | Dark Sky clone, NOAA data |
| **mountain-forecast.com** | $0 | NO | Excellent | Excellent | LOW | Current scraping - fragile |
| **OpenWeatherMap** | $0-40+ | Yes | Poor | Good | Medium | Current secondary - keep |

### Observation/Validation Sources

| Source | Cost | API | Data Type | Coverage | Update Freq | Value |
|--------|------|-----|-----------|----------|-------------|-------|
| **SAIS RSS** | FREE | RSS | Obs + Avalanche | 6 Scottish areas | Daily + RT | Very High |
| **MWIS** | FREE | NO | Expert forecasts | 4 Scottish regions | Daily 4:30pm | High (no API) |
| **WOW** | FREE | Yes | Citizen stations | UK-wide | Real-time | High |
| **METAR/TAF** | FREE | Yes | Airport weather | Scottish airports | Hourly | Medium-High |
| **Webcams** | FREE | NO | Visual | Ski resorts | Real-time | Low (no API) |

## DETAILED API FEATURES

### Open-Meteo (RECOMMENDED PRIMARY)
- **Elevation:** 90m Copernicus DEM, automatic adjustment (~0.7°C/100m)
- **Models:** 20+ national weather services (ECMWF, UK Met, NOAA, etc.)
- **Resolution:** 1-11 km spatial, 15-min to daily temporal
- **Forecast Horizon:** 2.5-16 days (model dependent)
- **Rate Limits:** None specified (fair use)
- **Parameters:** Temperature, wind, precipitation, clouds, visibility, solar, soil
- **License:** CC BY 4.0 (free non-commercial, paid commercial)
- **Docs:** https://open-meteo.com/en/docs
- **Integration:** Very easy, no API key needed

### Norway Met Yr.no (RECOMMENDED BACKUP)
- **Elevation:** Grid-based, no explicit DEM adjustment
- **Models:** ECMWF, MEPS, Arome Arctic
- **Resolution:** Model-dependent
- **Forecast Horizon:** 9-10 days
- **Rate Limits:** Fair use (403 if excessive)
- **Parameters:** Comprehensive weather data
- **License:** Creative Commons (commercial OK)
- **Docs:** https://api.met.no/
- **Integration:** Easy, User-Agent required

### SAIS RSS (RECOMMENDED VALIDATION)
- **Type:** Real-time observations + daily avalanche reports
- **Areas:** Torridon, Glencoe, Lochaber, Creag Meagaidh, N/S Cairngorms
- **Data:** Temperature, wind, snow conditions, avalanche risk
- **Format:** RSS feeds per area
- **Frequency:** Daily reports + real-time station data
- **Feeds:**
  - Torridon: https://torridonblog.sais.gov.uk/feed
  - Glencoe: https://glencoeblog.sais.gov.uk/feed
  - Lochaber: https://lochaberblog.sais.gov.uk/feed
  - Others: See sais.gov.uk
- **Integration:** Medium (RSS parsing)

### Weather Unlocked Mountain API (OPTIONAL COMMERCIAL)
- **Elevation:** Base/Mid/Upper levels (mountain-specific)
- **Coverage:** 3000+ ski resorts worldwide
- **Frequency:** 4 times daily
- **Features:** Snowfall predictions, mountain conditions
- **Pricing:** Unknown - contact required
- **Docs:** https://developer.weatherunlocked.com/skiresort
- **Integration:** Medium, REST API
- **Note:** Closest API alternative to mountain-forecast.com

### Visual Crossing (OPTIONAL LOW-COST)
- **Elevation:** Included in interpolation
- **Free Tier:** 1000 records/day
- **Paid:** $0.0001/record (~$3-30/month typical)
- **Features:** Historical + forecast, solar radiation, wind at height
- **Forecast:** 15 days
- **Commercial:** Yes (even free tier)
- **Docs:** https://www.visualcrossing.com/resources/documentation/
- **Integration:** Easy, good docs

## COST SUMMARY

### FREE Setup (Recommended)
- **Primary:** Open-Meteo + Norway Met
- **Validation:** SAIS RSS + WOW + METAR
- **Total Cost:** $0/month
- **Sources:** 5+
- **Reliability:** High (multiple redundant sources)

### Budget Commercial Setup
- **Primary:** Open-Meteo (upgrade to commercial if needed)
- **Backup:** Visual Crossing (1000/day free + overage)
- **Validation:** Free sources
- **Total Cost:** $3-10/month
- **Sources:** 6+
- **Reliability:** Very High

### Professional Setup
- **Primary:** Weather Unlocked + Open-Meteo commercial
- **Backup:** Visual Crossing or Tomorrow.io
- **Validation:** Free sources
- **Total Cost:** $80-200/month
- **Sources:** 7+
- **Reliability:** Highest (SLA support)

## INTEGRATION EFFORT ESTIMATE

| Source | Setup Time | Complexity | Dependencies |
|--------|-----------|------------|--------------|
| Open-Meteo | 2-3 hours | Low | requests |
| Norway Met | 1-2 hours | Low | requests |
| SAIS RSS | 3-4 hours | Medium | feedparser |
| WOW API | 2-3 hours | Medium | requests |
| METAR/TAF | 1-2 hours | Low | requests |
| Weather Unlocked | 2-3 hours | Medium | requests (+ signup) |
| Visual Crossing | 1-2 hours | Low | requests (+ API key) |
| Multi-source blending | 8-16 hours | High | statistics, validation logic |

**Total for Recommended Free Setup:** ~1-2 weeks part-time

## RATE LIMITS

| Source | Free Tier Limit | Paid Tier Limit | Blocking Behavior |
|--------|----------------|-----------------|-------------------|
| Open-Meteo | No limit (fair use) | Custom | Unknown |
| Norway Met | Fair use | N/A | 403 Forbidden |
| SAIS RSS | No limit | N/A | None |
| WOW | Reasonable use | N/A | Unknown |
| METAR/TAF | 100/minute | N/A | Temporary block |
| Windy | 500/day (test), 10k/day (pro) | Negotiable | Hard limit |
| Visual Crossing | 1000 records/day | Custom | Hard limit |
| AccuWeather | 500/day (core), 50/day (minutecast) | Custom | Hard limit |

## DATA UPDATE FREQUENCIES

| Source | Update Frequency | Forecast Horizon | Historical Data |
|--------|-----------------|------------------|-----------------|
| Open-Meteo | Hourly to 6-hourly | 2.5-16 days | Yes |
| Norway Met | Multiple daily | 9-10 days | Limited |
| SAIS | Daily 4:30pm + RT | Today + context | Archive |
| WOW | Real-time | Observations only | Yes |
| METAR | Hourly | Obs + 24hr TAF | Limited |
| Weather Unlocked | 4x daily | ~7 days | Unknown |
| Visual Crossing | Regular | 15 days | Extensive |

## ELEVATION CAPABILITIES RANKING

1. **Open-Meteo** - Excellent (90m DEM, automatic adjustment)
2. **Weather Unlocked** - Excellent (Base/Mid/Upper specific forecasts)
3. **SAIS Observations** - Excellent (actual mountain stations)
4. **Visual Crossing** - Good (elevation in interpolation)
5. **Norway Met** - Good (coordinate-based)
6. **Tomorrow.io** - Good (elevation-aware)
7. **METAR/TAF** - Limited (airport elevations only)
8. **WOW** - Varies (depends on station locations)
9. **OpenWeatherMap** - Poor (general point forecasts)
10. **Met Office DataHub** - Poor (mountain API discontinued)

## SCOTTISH MOUNTAINS SUITABILITY

| Source | Scotland Accuracy | Mountain Capability | Overall Suitability |
|--------|------------------|---------------------|---------------------|
| Open-Meteo | Good (UK Met included) | Excellent | A+ |
| SAIS | Excellent (Scottish-specific) | Excellent | A+ |
| Norway Met | Good (global models) | Good | A |
| Weather Unlocked | Good (if covered) | Excellent | A |
| Visual Crossing | Good | Good | B+ |
| WOW | Good (UK network) | Varies | B+ |
| METAR/TAF | Good (official) | Limited | B |
| MWIS | Excellent (specialist) | Excellent | A+ (no API) |
| OpenWeatherMap | Good | Poor | C+ |
| Met Office | Excellent (UK official) | Poor (retired) | C |

## RELIABILITY & UPTIME

| Source | Uptime | SLA | Commercial Support | Government/Official |
|--------|--------|-----|-------------------|---------------------|
| Norway Met | 99%+ | No | No | Yes (Norwegian) |
| METAR/TAF | 99%+ | No | No | Yes (US/UK) |
| SAIS | High | No | No | Yes (Scottish) |
| Open-Meteo | High | No | Community | No (aggregator) |
| Met Office | High | Yes (paid) | Yes | Yes (UK) |
| Weather Unlocked | High | Yes | Yes | No |
| Visual Crossing | High | Yes | Yes | No |
| Windy | High | Yes | Yes | No |
| WOW | Medium | No | No | Yes (Met Office) |

## RECOMMENDED IMPLEMENTATION ORDER

### Week 1: Core Sources
1. Open-Meteo integration (PRIMARY)
2. Norway Met integration (BACKUP)
3. Basic fallback logic

### Week 2: Validation
4. SAIS RSS parsing
5. METAR/TAF for nearby airports
6. WOW API exploration

### Week 3: Intelligence
7. Multi-source comparison logic
8. Conflict detection
9. Confidence scoring

### Week 4: Testing
10. Accuracy validation vs current sources
11. Performance optimization
12. Documentation

### Month 2+: Enhancement
13. Commercial source evaluation (if needed)
14. Machine learning source weighting
15. Historical accuracy tracking

## QUICK START CODE SNIPPETS

### Open-Meteo (Copy-Paste Ready)
```python
import requests

def get_open_meteo_forecast(lat, lon, elevation):
    url = 'https://api.open-meteo.com/v1/forecast'
    params = {
        'latitude': lat,
        'longitude': lon,
        'elevation': elevation,
        'hourly': 'temperature_2m,windspeed_10m,precipitation',
        'daily': 'temperature_2m_max,temperature_2m_min,windspeed_10m_max',
        'timezone': 'Europe/London',
        'forecast_days': 7
    }
    return requests.get(url, params=params).json()

# Example: Liathach
forecast = get_open_meteo_forecast(57.6041, -5.4686, 1053)
print(f"Summit temp: {forecast['daily']['temperature_2m_max'][0]}°C")
```

### Norway Met (Copy-Paste Ready)
```python
import requests

def get_norway_met_forecast(lat, lon):
    url = 'https://api.met.no/weatherapi/locationforecast/2.0/compact'
    headers = {'User-Agent': 'ScottishMountainWeather/1.0 (your@email.com)'}
    params = {'lat': lat, 'lon': lon}
    return requests.get(url, headers=headers, params=params).json()

# Example: Liathach
forecast = get_norway_met_forecast(57.6041, -5.4686)
```

### SAIS RSS (Copy-Paste Ready)
```python
import feedparser

def get_sais_observations(area='torridon'):
    feed_url = f'https://{area}blog.sais.gov.uk/feed'
    feed = feedparser.parse(feed_url)
    return feed.entries[0] if feed.entries else None

# Example: Torridon
latest = get_sais_observations('torridon')
print(f"Latest report: {latest.title}")
```

## DECISION TREE

```
START: Need weather data for Scottish mountain

Q: What's your budget?
├─ $0 → Use Open-Meteo + Norway Met + SAIS
├─ $3-10/month → Add Visual Crossing
└─ $80+/month → Add Weather Unlocked + commercial tier

Q: What's your use case?
├─ Personal/Hobby → FREE setup is perfect
├─ Non-commercial app → FREE setup with Open-Meteo
├─ Commercial app → Upgrade Open-Meteo to commercial
└─ Professional/SLA → Weather Unlocked + commercial tiers

Q: What's most important?
├─ Accuracy → Open-Meteo + Weather Unlocked + validation
├─ Reliability → Multi-source (Open-Meteo + Norway + SAIS + WOW)
├─ Cost → FREE setup (Open-Meteo + Norway + SAIS)
└─ Ease → Open-Meteo only (simplest, still excellent)

RECOMMENDED FOR MOST USERS:
→ Open-Meteo (primary) + Norway Met (backup) + SAIS (validation)
→ Cost: $0/month
→ Reliability: High
→ Integration: 1-2 weeks
```

---

**Key Takeaway:** Open-Meteo + Norway Met + SAIS provides excellent free multi-source coverage for Scottish mountains with superior elevation handling compared to current scraping approach.
