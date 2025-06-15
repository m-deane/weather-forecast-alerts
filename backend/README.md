# Scottish Mountain Weather API Backend

A FastAPI-based backend service for the Scottish Mountain Weather application, providing real-time weather forecasts specifically designed for mountain activities.

## Features

- **Multi-source Weather Data**: Integrates MWIS, Met Office, and Mountain-Forecast.com
- **Safety-focused**: Hiking suitability scores and risk assessments
- **High Performance**: Redis caching and optimized database queries
- **Scalable Architecture**: Built with FastAPI and PostgreSQL + TimescaleDB
- **Security**: Rate limiting, API key authentication, and security headers
- **Real-time Updates**: Automated weather data ingestion every 4 hours

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd weather-forecast-alerts
   ```

2. **Configure environment**:
   ```bash
   cp backend/.env.example backend/.env
   # Edit .env file with your settings
   ```

3. **Start services**:
   ```bash
   docker-compose up -d
   ```

4. **Initialize database** (first time only):
   ```bash
   docker-compose exec api python -c "from database import startup_database; startup_database()"
   ```

5. **Access the API**:
   - API Documentation: http://localhost:8000/docs
   - Health Check: http://localhost:8000/health
   - API Root: http://localhost:8000/

### Manual Setup

1. **Install dependencies**:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Setup PostgreSQL with TimescaleDB**:
   ```bash
   # Install PostgreSQL and TimescaleDB extension
   createdb mountain_weather
   psql mountain_weather < database/schema.sql
   ```

3. **Setup Redis**:
   ```bash
   # Install and start Redis
   redis-server
   ```

4. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database and Redis URLs
   ```

5. **Run the application**:
   ```bash
   python main.py
   ```

## API Documentation

### Core Endpoints

#### Locations
- `GET /api/v1/locations` - Search mountain locations
- `GET /api/v1/locations/{location_id}` - Get location details
- `GET /api/v1/areas` - List mountain areas

#### Weather
- `GET /api/v1/weather/{location_id}` - Get weather forecast
- `GET /api/v1/weather/compare` - Compare weather between locations

#### Health & Status
- `GET /health` - Simple health check
- `GET /health/detailed` - Detailed service health
- `GET /status` - API status and configuration

### Example Requests

**Search for locations**:
```bash
curl "http://localhost:8000/api/v1/locations?q=ben+nevis"
```

**Get weather forecast**:
```bash
curl "http://localhost:8000/api/v1/weather/ben-nevis"
```

**Compare weather**:
```bash
curl "http://localhost:8000/api/v1/weather/compare?locations=ben-nevis,ben-macdui"
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   FastAPI App   │    │   PostgreSQL     │    │     Redis       │
│                 │───▶│   + TimescaleDB  │    │    (Cache)      │
│  - API Routes   │    │                  │    │                 │
│  - Security     │    │  - Locations     │◀───┤  - Weather Data │
│  - Rate Limiting│    │  - Weather Data  │    │  - Sessions     │
└─────────────────┘    │  - User Prefs    │    │  - Rate Limits  │
         │              └──────────────────┘    └─────────────────┘
         │
         ▼
┌─────────────────┐    ┌──────────────────┐
│ Weather Service │    │   External APIs  │
│                 │───▶│                  │
│ - Data Scraping │    │  - MWIS          │
│ - Processing    │    │  - Met Office    │
│ - Scheduling    │    │  - Mountain-FC   │
└─────────────────┘    └──────────────────┘
```

## Development

### Project Structure

```
backend/
├── main.py              # Application entry point
├── api.py               # API routes and endpoints
├── models.py            # Data models (SQLAlchemy + Pydantic)
├── database.py          # Database connection and utilities
├── cache.py             # Redis caching layer
├── security.py          # Authentication and rate limiting
├── weather_service.py   # Weather data integration
├── requirements.txt     # Python dependencies
├── Dockerfile          # Container configuration
└── .env.example        # Environment configuration template
```

### Running Tests

```bash
cd backend
pytest tests/ -v
pytest tests/ --cov=. --cov-report=html
```

### Code Quality

```bash
# Format code
black .
isort .

# Lint code
flake8 .
mypy .
```

### Database Migrations

The application uses SQLAlchemy with Alembic for database migrations:

```bash
# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://localhost:6379` |
| `RATE_LIMIT_PER_MINUTE` | API rate limit per minute | `60` |
| `WEATHER_UPDATE_INTERVAL_HOURS` | Weather update frequency | `4` |
| `ENVIRONMENT` | Environment (dev/prod) | `development` |
| `DEBUG` | Enable debug mode | `true` |

See `.env.example` for complete configuration options.

### Weather Data Sources

The API integrates with multiple weather sources:

1. **MWIS** (Mountain Weather Information Service)
   - UK specialist mountain forecasting
   - High accuracy for Scottish conditions
   - Free service, no API key required

2. **Met Office**
   - UK national weather service
   - Professional meteorological data
   - API key required for some features

3. **Mountain-Forecast.com**
   - Global mountain weather platform
   - Multiple elevation forecasts
   - Web scraping (no official API)

4. **OpenWeatherMap**
   - Global weather API
   - Backup data source
   - API key required

## Deployment

### Production Deployment

1. **Environment Setup**:
   ```bash
   cp .env.example .env
   # Configure production settings in .env
   ```

2. **Security Configuration**:
   ```bash
   # In .env file:
   ENVIRONMENT=production
   DEBUG=false
   REQUIRE_API_KEY=true
   ALLOWED_ORIGINS=https://yourdomain.com
   ```

3. **Database Setup**:
   ```bash
   # Setup managed PostgreSQL with TimescaleDB
   # Run database/schema.sql
   ```

4. **Deploy with Docker**:
   ```bash
   docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
   ```

### Monitoring

The API includes comprehensive monitoring:

- **Health Checks**: `/health` and `/health/detailed`
- **Metrics**: Prometheus-compatible metrics
- **Logging**: Structured JSON logging
- **Performance**: Request timing and cache statistics

Access Grafana dashboard at http://localhost:3000 (with monitoring profile).

## API Integration

### Rate Limits

- **Per minute**: 60 requests
- **Per hour**: 1,000 requests
- **Per day**: 10,000 requests

Rate limit headers are included in responses:
```
X-RateLimit-Limit-Minute: 60
X-RateLimit-Remaining-Minute: 45
X-RateLimit-Reset-Minute: 1640995200
```

### Error Handling

The API returns consistent error responses:

```json
{
  "error": "Not Found",
  "message": "The requested resource was not found",
  "path": "/api/v1/locations/invalid-id",
  "timestamp": "2025-06-14T10:00:00Z"
}
```

### Authentication (Optional)

When `REQUIRE_API_KEY=true`, include API key in requests:

```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
     "http://localhost:8000/api/v1/weather/ben-nevis"
```

## Support

- **Documentation**: http://localhost:8000/docs
- **Health Status**: http://localhost:8000/health/detailed
- **Logs**: Check application logs for debugging
- **Issues**: Report issues in the project repository

## License

[Add your license information here]