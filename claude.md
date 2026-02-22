# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A full-stack Scottish Mountain Weather application that scrapes weather forecasts from mountain-forecast.com and OpenWeatherMap, calculates hiking suitability scores, and presents data through a React-based web interface.

**Architecture**: Full-stack web application with Python backend (FastAPI) and React/TypeScript frontend
**Primary Language**: Python (scraper/backend), TypeScript/React (frontend)

## Quick Development Commands

### Weather Scraper (Core functionality)
```bash
# Run the main weather scraper
python weather_scraper.py

# Check URL validity for mountain-forecast.com
python check_urls.py
```

### Backend API

**Simple Mock API** (for quick testing):
```bash
cd backend
python simple_api.py
# Runs on http://localhost:8000
```

**Full Production API** (requires database):
```bash
cd backend

# First-time setup
pip install -r requirements.txt

# Initialize database (requires Docker Compose services)
python -c "from database import startup_database; startup_database()"

# Run API
python main.py
```

### Frontend

```bash
cd frontend

# Development server
npm run dev          # Runs on http://localhost:3000

# Production build
npm run build
npm run preview

# Code quality
npm run lint
npm run format
npm run type-check

# Testing
npm run test
npm run test:ui
```

### Docker Compose (Full Stack)

```bash
# Start all services (database, Redis, API, weather updater)
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f api
docker-compose logs -f weather_updater

# Initialize database (first time only)
docker-compose exec api python -c "from database import startup_database; startup_database()"
```

### All-in-One Script

```bash
# Runs scraper, backend, and frontend together
./run_all.sh

# Stop processes (PIDs stored in .running_pids)
kill $(cat .running_pids)
```

## Architecture Overview

### Three-Tier System

1. **Data Collection Layer** (`weather_scraper.py`)
   - Scrapes mountain-forecast.com with robust retry logic and URL validation
   - Fetches OpenWeatherMap API data (optional, requires API key)
   - Calculates hiking suitability scores based on wind, rain, temperature
   - Identifies cloud inversion and photography opportunities
   - Outputs to `forecasts/` directory as JSON, Markdown, and HTML

2. **Backend API Layer** (`backend/`)
   - **Simple API** (`simple_api.py`): Mock data for frontend testing without database
   - **Full API** (`main.py`, `api.py`): Production FastAPI with PostgreSQL/TimescaleDB and Redis
   - Weather data ingestion (`data_ingestion.py`) from scraper outputs
   - Caching layer (`cache.py`) for performance
   - Security and rate limiting (`security.py`)

3. **Frontend Layer** (`frontend/`)
   - React 18 + TypeScript
   - Vite for build tooling
   - TailwindCSS for styling
   - React Query for server state, Zustand for client state
   - React Router for navigation
   - PWA support with service worker

### Data Flow

```
config.yaml → weather_scraper.py → forecasts/*.json
                                         ↓
                      backend/data_ingestion.py → PostgreSQL/TimescaleDB
                                         ↓
                              backend/api.py (FastAPI) ← Redis (cache)
                                         ↓
                                  frontend/src/api/
                                         ↓
                              React Components (UI)
```

## Key File Locations

### Configuration
- `config.yaml` - Mountain locations, URLs, API keys for weather scraper
- `backend/.env` - Backend environment variables (database, Redis URLs)
- `frontend/.env` - Frontend environment variables (API endpoints)

### Core Scripts
- `weather_scraper.py` - Main scraper with retry logic, User-Agent rotation
- `check_urls.py` - Validates mountain-forecast.com URLs
- `run_all.sh` - One-command startup for all services

### Backend Structure
```
backend/
├── main.py              # Production API entry point
├── simple_api.py        # Mock API for testing
├── api.py               # API routes and endpoints
├── models.py            # SQLAlchemy models + Pydantic schemas
├── database.py          # Database connection and initialization
├── cache.py             # Redis caching layer
├── security.py          # Authentication, rate limiting, CORS
├── weather_service.py   # Weather data integration
├── data_ingestion.py    # Import scraper data to database
└── requirements.txt     # Python dependencies
```

### Frontend Structure
```
frontend/src/
├── main.tsx            # Application entry point
├── App.tsx             # Main app component
├── components/         # Reusable UI components (WeatherCard, Layout, etc.)
├── pages/              # Route components (HomePage, SearchPage, LocationPage)
├── api/                # API client and data fetching
├── hooks/              # Custom React hooks
├── stores/             # Zustand state management
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Output Directories
- `forecasts/` - Generated weather data (JSON, HTML, MD) organized by location
- `backend/database/` - Database schema files
- `frontend/dist/` - Production build output (generated, not in version control)

## Configuration Details

### Weather Scraper Configuration (`config.yaml`)

Define mountain locations with:
- `area`: Geographic area name (e.g., "Torridon", "Glencoe")
- `latitude`/`longitude`: Coordinates for OpenWeatherMap API
- `area_proxy_url`: Lower elevation forecast URL for area-level data
- `munros`: List of individual mountain forecasts with `name` and `url`

The scraper:
- Averages multiple Munro forecasts within an area
- Uses exponential backoff retry (max 3 attempts)
- Rotates User-Agent headers to avoid blocking
- Validates URLs and detects redirect/info pages
- Random delays between requests (1-3 seconds)

### Hiking Suitability Scoring

Calculated in `weather_scraper.py` based on:
- Wind speed (penalty: 2.0 per 10kph over 30kph)
- Precipitation (penalty: 1.5 per mm rain, 3.0 per cm snow)
- Temperature extremes (penalty: 0.8 per degree below 0°C, 0.5 per degree above 25°C)

Score interpretation:
- 8-10: Excellent conditions
- 6-7: Good conditions, caution needed
- 4-5: Challenging, experience required
- 1-3: Dangerous, avoid

## Development Workflow

### Working with the Scraper

1. Update `config.yaml` with new mountain URLs
2. Run `python check_urls.py` to validate URLs
3. Execute `python weather_scraper.py`
4. Check `forecasts/` directory for outputs
5. Review `failed_munros_*.csv` for any failures

### Working with the Backend

For quick testing:
```bash
cd backend
python simple_api.py
```

For full development:
```bash
docker-compose up -d db redis  # Start dependencies
cd backend
python main.py                 # Start API with database
```

### Working with the Frontend

The frontend expects backend running on `http://localhost:8000`:
```bash
cd frontend
npm run dev
# Access at http://localhost:3000
```

## Testing and Debugging

### API Testing
```bash
# Health check
curl http://localhost:8000/health

# Get all locations
curl http://localhost:8000/api/v1/locations | jq

# Get weather for specific location
curl http://localhost:8000/api/v1/weather/glencoe-bidean-nam-bian | jq

# Interactive API docs
open http://localhost:8000/docs
```

### Frontend Debugging
- Use browser DevTools console (F12)
- Check Network tab for API calls
- Access at `http://localhost:3000`

### Common Issues

**Scraper failures**:
- Check `failed_munros_*.csv` for specific URLs
- Verify mountain-forecast.com hasn't changed HTML structure
- Run with `logging.basicConfig(level=logging.DEBUG)` for detailed parsing logs

**Backend connection errors**:
- Ensure PostgreSQL and Redis are running (via Docker Compose)
- Check `.env` file has correct database URLs
- Verify ports 5432 (PostgreSQL) and 6379 (Redis) are available

**Frontend blank page**:
- Check browser console for errors
- Verify backend is responding at `http://localhost:8000/health`
- Ensure `npm run dev` is running in `frontend/` directory

## Database Schema

Uses PostgreSQL with TimescaleDB extension for time-series weather data:

- `locations` - Mountain location metadata (name, coordinates, elevation, classification)
- `weather_forecasts` - Time-series forecast data with TimescaleDB hypertable
- `user_preferences` - User settings and favorites (future feature)
- `areas` - Geographic area groupings

See `backend/database/schema_full.sql` for complete schema.

## API Endpoints

### Core Endpoints
- `GET /api/v1/locations` - Search/list locations
- `GET /api/v1/locations/{id}` - Location details
- `GET /api/v1/weather/{id}` - Weather forecast for location
- `GET /api/v1/weather/compare?locations=id1,id2` - Compare weather
- `GET /api/v1/areas` - List geographic areas
- `GET /health` - Health check
- `GET /docs` - Swagger UI documentation

## Known Issues and Limitations

1. **Weather Scraper**: Dependent on mountain-forecast.com HTML structure; may break if site changes
3. **OpenWeatherMap**: Requires API key; scraper continues without it but with reduced data
4. **Rate Limiting**: mountain-forecast.com may block excessive requests; scraper includes delays and retries

## Dependencies Management

### Python (Backend/Scraper)
```bash
# Core scraper dependencies
pip install requests beautifulsoup4 PyYAML weasyprint

# Backend dependencies (see backend/requirements.txt)
pip install -r backend/requirements.txt
```

### Node.js (Frontend)
```bash
cd frontend
npm install  # Installs from package.json
```

### Docker
All dependencies managed via Docker Compose for production deployment.

## Deployment Considerations

- **Environment Variables**: Never commit `.env` files; use `.env.example` as template
- **API Keys**: Store OpenWeatherMap API key in environment variable `OWM_API_KEY`
- **Database**: Use managed PostgreSQL with TimescaleDB in production
- **Caching**: Redis required for production performance
- **CORS**: Configure `ALLOWED_ORIGINS` in backend for production domain
- **Scheduling**: Set up cron job or systemd timer to run `weather_scraper.py` every 4-6 hours
