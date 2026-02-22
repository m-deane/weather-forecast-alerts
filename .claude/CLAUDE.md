# PROJECT CONTEXT & DIRECTIVES
Scottish Mountain Weather Application

**Last Updated**: 2026-02-06

## Project Overview

A full-stack application that scrapes Scottish mountain weather forecasts, calculates hiking suitability scores, and presents safety-focused forecasts through a web interface.

**Architecture**: 3-tier system
1. **Data Collection**: `weather_scraper.py` → scrapes mountain-forecast.com + OpenWeatherMap
2. **Backend API**: FastAPI with PostgreSQL/TimescaleDB + Redis caching
3. **Frontend**: React/TypeScript with TailwindCSS

**Primary Use Case**: Help hikers and mountaineers make safety-informed decisions about Scottish mountain conditions.

## ⚠️ CRITICAL WARNINGS & KNOWN ISSUES

### 🔴 MUST KNOW BEFORE STARTING

1. **Scraper is Fragile**
   - Dependent on mountain-forecast.com HTML structure
   - **ALWAYS** run `python check_urls.py` before adding/modifying URLs
   - **ALWAYS** check `failed_munros_*.csv` after scraper runs
   - Site may change selectors - requires maintenance

2. **Two Backend Modes**
   - **Simple API** (`simple_api.py`): Mock data, no database required - USE THIS for frontend testing
   - **Full API** (`main.py`): Requires PostgreSQL + Redis via Docker Compose - use only for database work
   - Don't confuse the two - they serve different purposes

3. **OpenWeatherMap API Key Required**
   - Scraper works without it but with reduced data
   - Set via `OWM_API_KEY` environment variable or `config.yaml`
   - Free tier available at openweathermap.org

## Workflow Standards

### Standard Workflow (From Root CLAUDE.md/projectplan.md)
1. **Think through the problem** - Read relevant files, understand context
2. **Write plan to projectplan.md** - List todo items with clear checkboxes
3. **Check in with user** - Get plan approval before implementation
4. **Work on todos** - Mark complete as you go, explain changes at high level
5. **Keep changes simple** - Minimal, focused changes impacting least code possible
6. **Add review section** - Summary of changes in projectplan.md

**Key Principle**: Everything is about simplicity. Avoid massive or complex changes.

### Scraper Development Workflow

**When to use**: Adding locations, fixing scraping issues, modifying scoring algorithms

**Workflow**:
```bash
# 1. Validate URLs first (if adding/changing locations)
python check_urls.py

# 2. Update config.yaml with new locations or settings
# Edit: config.yaml

# 3. Test scraper with small subset first
# Temporarily reduce locations in config.yaml for testing

# 4. Run scraper
python weather_scraper.py

# 5. Check outputs
ls forecasts/                    # Verify JSON/HTML/MD files created
cat failed_munros_*.csv          # Check for failures

# 6. Review scoring in output
# Open forecasts/[area]/summary.html in browser
# Verify hiking scores are reasonable

# 7. If failures occur:
# - Check failed_munros_*.csv for specific URLs
# - Verify mountain-forecast.com hasn't changed HTML structure
# - Run with DEBUG logging: change logging.basicConfig(level=logging.DEBUG)
```

**Common Issues**:
- **All requests fail**: Check internet connection, mountain-forecast.com may be blocking
- **Some URLs fail**: URLs may have changed, run `check_urls.py`
- **Parsing errors**: HTML structure changed, update BeautifulSoup selectors in `weather_scraper.py`
- **Scores seem wrong**: Review constants in `weather_scraper.py` (SCORE_WEIGHT_* variables)

### Backend Development Workflow

**Decision Tree: Which Backend Mode?**
```
Testing frontend changes? → Use simple_api.py
Testing API endpoints? → Use simple_api.py
Working on database schema? → Use full stack (Docker Compose)
Testing data ingestion? → Use full stack (Docker Compose)
Testing Redis caching? → Use full stack (Docker Compose)
Everything else → Use simple_api.py (it's faster)
```

**Quick Testing Mode (Recommended)**:
```bash
cd backend
python simple_api.py
# API runs at http://localhost:8000
# No database required - returns realistic mock data
# Perfect for frontend development
```

**Full Stack Mode**:
```bash
# Start dependencies
docker-compose up -d db redis

# Initialize database (first time only)
docker-compose exec api python -c "from database import startup_database; startup_database()"

# Run API with database
cd backend
python main.py

# OR run everything via Docker
docker-compose up -d
```

**Testing Backend Changes**:
```bash
# Health check
curl http://localhost:8000/health

# Test specific endpoint
curl http://localhost:8000/api/v1/locations | jq

# Interactive docs
open http://localhost:8000/docs
```

**Common Issues**:
- **Port 8000 in use**: Kill existing process with `lsof -ti:8000 | xargs kill -9`
- **Database connection failed**: Ensure Docker Compose services running
- **Redis connection failed**: Check Docker Compose, port 6379 available

### Frontend Development Workflow

**Workflow**:
```bash
# 1. Ensure backend is running (simple_api.py recommended)
cd backend
python simple_api.py

# 2. Start frontend dev server (in new terminal)
cd frontend
npm run dev

# 3. Open app
open http://localhost:3000

# 4. Make changes to components
# Edit files in frontend/src/components/ or frontend/src/pages/

# 5. Test in browser
# Changes hot-reload automatically
# Check browser console (F12) for errors

# 6. Build for production (if needed)
npm run build
npm run preview
```

**Development Files**:
- `frontend/src/main.tsx` - Application entry point
- `frontend/src/App.tsx` - Main app with routing
- `frontend/src/components/` - React components
- `frontend/src/pages/` - Page components (HomePage, LocationPage, SearchPage, etc.)
- `frontend/src/api/` - API client

**Common Issues**:
- **Blank page**: Check browser console for errors, verify backend is running
- **API errors**: Backend not running or CORS issue
- **Port 3000 in use**: Kill with `lsof -ti:3000 | xargs kill -9`

### Cross-Component Testing

**Testing Complete Flow**:
```bash
# 1. Run scraper to get fresh data
python weather_scraper.py

# 2. Start backend
cd backend
python simple_api.py

# 3. Start frontend
cd frontend
npm run dev

# 4. Test in browser
open http://localhost:3000

# 5. Verify data flows through
# - Check forecasts/ directory has JSON files
# - Check API returns data: curl http://localhost:8000/api/v1/locations
# - Check frontend displays locations
```

**Integration Testing Pattern**:
1. Scraper outputs → `forecasts/*.json`
2. Backend ingests (if using full stack) or mocks data
3. Frontend fetches via API
4. Verify end-to-end in browser

## Configuration Files Reference

**Critical Config Files**:

| File | Purpose | Key Settings |
|------|---------|--------------|
| `config.yaml` | Scraper locations & URLs | Mountain URLs, areas, coordinates, API key |
| `backend/.env` | Backend environment | Database URL, Redis URL, debug mode |
| `frontend/.env` | Frontend environment | API endpoint URL |
| `docker-compose.yml` | Service orchestration | PostgreSQL, Redis, API containers |

**Editing config.yaml**:
```yaml
locations:
  - area: Torridon              # Geographic area
    latitude: 57.546            # For OpenWeatherMap
    longitude: -5.547
    area_proxy_url: https://... # Lower elevation forecast
    munros:                     # Individual mountains
      - name: Beinn Eighe
        url: https://www.mountain-forecast.com/peaks/...
```

**Important**: Always validate new URLs with `python check_urls.py`

## Project-Specific Coding Standards

### Python (Scraper & Backend)

**Naming**:
- Functions: `snake_case` (e.g., `fetch_weather_data()`)
- Variables: `snake_case` (e.g., `hiking_score`)
- Constants: `SCREAMING_SNAKE_CASE` (e.g., `SCORE_WEIGHT_WIND`)
- Classes: `PascalCase` (e.g., `WeatherForecast`)

**Patterns**:
- Use `logging` module, not `print()` statements
- Add retry logic for all external HTTP requests
- Validate data before saving to files/database
- Use type hints for function signatures

**Scraper-Specific**:
- Always include User-Agent in requests
- Use random delays between requests (avoid rate limiting)
- Validate URLs before processing
- Save failed URLs to CSV for debugging

### TypeScript/React (Frontend)

**Naming**:
- Components: `PascalCase` (e.g., `WeatherCard.tsx`)
- Functions: `camelCase` (e.g., `fetchLocations()`)
- Hooks: `use` prefix (e.g., `useWeatherData()`)

**Patterns**:
- Use React Query for API state management
- Use Zustand for client state
- Prefer functional components with hooks
- TailwindCSS for styling (no CSS modules)

**Architecture**: Uses React.lazy for code-splitting heavy components (LocationMap, CustomizableDashboard)

## Testing Patterns

### Scraper Testing
```bash
# Test URL validation
python check_urls.py

# Test single location (edit config.yaml to limit locations)
python weather_scraper.py

# Verify outputs
ls forecasts/[area]/
# Should have: summary.json, summary.md, summary.html, [munro_name].json

# Check for failures
cat failed_munros_*.csv
```

### Backend Testing
```bash
# Simple API mode
cd backend
python simple_api.py
curl http://localhost:8000/health
curl http://localhost:8000/api/v1/locations | jq

# Full stack mode
docker-compose up -d
curl http://localhost:8000/health
```

### Frontend Testing
```bash
cd frontend

# Type checking
npm run type-check

# Linting
npm run lint

# Manual testing
npm run dev
open http://localhost:3000
```

## Hiking Suitability Scoring Algorithm

**Critical Domain Logic** - understand before modifying:

**Score Calculation** (in `weather_scraper.py`):
- Start at 10 (perfect conditions)
- Apply penalties:
  - Wind: -2.0 per 10kph over 30kph
  - Rain: -1.5 per mm (recalibrated for Scottish conditions where rain is common)
  - Snow: -3.0 per cm
  - Cold: -0.8 per degree below 0°C
  - Hot: -0.5 per degree above 25°C

**Score Interpretation**:
- 8-10: Excellent (green)
- 6-7: Good (yellow)
- 4-5: Challenging (orange)
- 1-3: Dangerous (red)

**Constants Location**: `weather_scraper.py` lines 52-57
```python
SCORE_WEIGHT_WIND = 2.0
SCORE_WEIGHT_RAIN = 1.5
SCORE_WEIGHT_SNOW = 3.0
SCORE_WEIGHT_COLD = 0.8
SCORE_WEIGHT_HOT = 0.5
```

**If modifying**: Ensure scores remain meaningful for safety decisions. Conservative scoring preferred.

## Common Development Tasks

### Add New Mountain Location
1. Find mountain-forecast.com URL for the mountain
2. Add to `config.yaml` under appropriate area
3. Run `python check_urls.py` to validate
4. Run `python weather_scraper.py`
5. Check `forecasts/[area]/` for new data

### Fix Scraping Issue
1. Check `failed_munros_*.csv` for specific failures
2. Visit failed URL in browser - verify it loads
3. Inspect HTML structure with DevTools
4. Update BeautifulSoup selectors in `weather_scraper.py`
5. Test with single location first
6. Run full scrape

### Add New API Endpoint
1. Work in `backend/simple_api.py` for mock version
2. Add route with `@app.get()` or `@app.post()`
3. Test with curl or http://localhost:8000/docs
4. If needed, implement in `backend/api.py` for production

### Modify Hiking Score Logic
1. Understand current algorithm (see section above)
2. Adjust constants in `weather_scraper.py`
3. Run scraper with test data
4. Review outputs in `forecasts/[area]/summary.html`
5. Verify scores make safety sense

## All-in-One Startup

**Quick Start Everything**:
```bash
./run_all.sh
# Runs scraper, backend (simple_api.py), and frontend
# Access at http://localhost:3000

# Stop all
kill $(cat .running_pids)
```

**Manual Startup**:
```bash
# Terminal 1: Backend
cd backend && python simple_api.py

# Terminal 2: Frontend
cd frontend && npm run dev

# Browser
open http://localhost:3000
```

## Known Limitations & Workarounds

1. **Scraper Fragility**: Dependent on external HTML structure
   - **Workaround**: Regular maintenance, URL validation, error tracking
   - **Future**: Consider official API if mountain-forecast.com offers one

2. **No Automated Tests**: Limited test coverage
   - **Current**: Manual testing with curl and browser
   - **Future**: Add pytest for backend, vitest for frontend

3. **Mock Data in Simple API**: Not real-time data
   - **Workaround**: Run scraper + full stack for real data
   - **Use Case**: Simple API perfect for frontend development

## Reference Documentation

- **Complete Technical Reference**: See root `CLAUDE.md`
- **Quick Start Guide**: `QUICK_START_GUIDE.md`
- **How to Run**: `HOW_TO_RUN.md`
- **API Documentation**: http://localhost:8000/docs (when running)
- **Backend README**: `backend/README.md`
- **Frontend README**: `frontend/README.md`

## Project-Specific Development Principles

1. **Safety First**: Hiking scores must be conservative - err on side of caution
2. **Simplicity**: Every change should impact minimal code (from root CLAUDE.md workflow)
3. **Robustness**: Scraper must handle failures gracefully (retry, log, continue)
4. **No Secrets**: Never commit API keys - use environment variables
5. **Test Incrementally**: Test each component before integration

## Quick Decision Matrix

| Scenario | Action |
|----------|--------|
| Adding new mountain | Edit config.yaml, run check_urls.py, run scraper |
| Frontend development | Use simple_api.py backend, test at http://localhost:3000 |
| Database changes | Use full Docker Compose stack |
| API endpoint testing | Use simple_api.py + curl or /docs |
| Scraper broken | Check failed_munros CSV, verify HTML structure |
| Scores seem off | Review SCORE_WEIGHT constants, test with known conditions |
| Port conflicts | Kill processes: lsof -ti:[port] \| xargs kill -9 |

---

**Remember**:
- ✅ Simple API for most development
- 🔍 Always validate URLs before scraping
- 📊 Conservative scoring for safety
- 🎯 Keep changes simple and focused
