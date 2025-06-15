# API Requirements & Data Models

This document defines the API architecture and data models for the Scottish Mountain Weather App, building on the existing weather_scraper.py foundation.

## API Architecture Overview

### High-Level Architecture
```
Frontend App
├── REST API Gateway
├── Weather Data Service
│   ├── Data Aggregator (existing weather_scraper.py)
│   ├── MWIS Integration
│   ├── Met Office Integration
│   └── OpenWeatherMap Integration
├── Location Service
│   ├── Mountain Database
│   ├── Search Engine
│   └── GPS/Proximity Service
├── User Preferences Service
├── Notification Service
└── Caching Layer (Redis)
```

### Data Sources Integration
**Existing System Enhancement:**
- Extend current weather_scraper.py to provide API endpoints
- Maintain existing YAML configuration system
- Add real-time data processing capabilities
- Implement caching and data validation

## Core API Endpoints

### 1. Location Endpoints

#### GET /api/v1/locations
**Purpose:** Search and discover mountain locations
**Query Parameters:**
- `q` (string): Search query for mountain name
- `area` (string): Filter by area (torridon, glencoe, coigach, skye, knoydart)
- `lat` (float): Latitude for proximity search
- `lng` (float): Longitude for proximity search
- `radius` (int): Search radius in kilometers (default: 50)
- `limit` (int): Maximum results (default: 20)

**Response Example:**
```json
{
  "locations": [
    {
      "id": "ben-nevis",
      "name": "Ben Nevis",
      "area": "lochaber",
      "elevation_m": 1345,
      "latitude": 56.7969,
      "longitude": -5.0036,
      "classification": "munro",
      "difficulty": "challenging",
      "distance_km": 12.5,
      "description": "Highest mountain in Scotland",
      "has_weather_data": true,
      "last_updated": "2025-06-14T10:00:00Z"
    }
  ],
  "total": 1,
  "query_time_ms": 45
}
```

#### GET /api/v1/locations/{location_id}
**Purpose:** Get detailed location information
**Response Example:**
```json
{
  "id": "ben-nevis",
  "name": "Ben Nevis",
  "area": "lochaber",
  "elevation_m": 1345,
  "latitude": 56.7969,
  "longitude": -5.0036,
  "classification": "munro",
  "difficulty": "challenging",
  "route_info": {
    "standard_route_km": 17,
    "elevation_gain_m": 1300,
    "estimated_time_hours": 8,
    "difficulty_grade": "moderate"
  },
  "safety_info": {
    "emergency_contacts": [
      {
        "service": "Lochaber Mountain Rescue",
        "phone": "999",
        "description": "Primary rescue service"
      }
    ],
    "hazards": ["exposure", "navigation", "weather_changes"],
    "season_notes": "Snow possible October-May"
  },
  "weather_sources": [
    {
      "source": "mwis",
      "url": "https://www.mwis.org.uk/forecasts/scottish/wh",
      "elevation_m": 1000
    },
    {
      "source": "mountain_forecast",
      "url": "https://www.mountain-forecast.com/peaks/Ben-Nevis/forecasts/1345",
      "elevation_m": 1345
    }
  ]
}
```

### 2. Weather Endpoints

#### GET /api/v1/weather/{location_id}
**Purpose:** Get current and forecast weather for a location
**Query Parameters:**
- `hours` (int): Forecast hours ahead (default: 72, max: 168)
- `include` (string): Data to include (current,hourly,daily,alerts)

**Response Example:**
```json
{
  "location": {
    "id": "ben-nevis",
    "name": "Ben Nevis",
    "elevation_m": 1345
  },
  "current": {
    "timestamp": "2025-06-14T10:00:00Z",
    "source": "mwis",
    "conditions": {
      "temperature_c": 2.0,
      "feels_like_c": -4.0,
      "wind_speed_kph": 35,
      "wind_direction": "W",
      "wind_gust_kph": 45,
      "precipitation_mm": 0.2,
      "precipitation_type": "rain",
      "cloud_base_m": 800,
      "visibility_km": 2.0,
      "freezing_level_m": 1200,
      "humidity_percent": 85,
      "pressure_hpa": 1013
    },
    "safety": {
      "overall_score": 4,
      "hiking_suitability": "caution",
      "risk_factors": ["high_wind", "poor_visibility"],
      "recommendations": [
        "Consider postponing due to high winds",
        "Carry full waterproofs",
        "Navigation equipment essential"
      ]
    }
  },
  "periods": [
    {
      "period": "2025-06-14_AM",
      "start_time": "2025-06-14T06:00:00Z",
      "end_time": "2025-06-14T12:00:00Z",
      "summary": "rain showers",
      "icon": "rain_showers",
      "conditions": {
        "temperature_max_c": 3.0,
        "temperature_min_c": 1.0,
        "feels_like_c": -3.0,
        "wind_speed_kph": 30,
        "wind_direction": "W",
        "precipitation_mm": 2.5,
        "precipitation_type": "rain",
        "cloud_base_m": 600,
        "visibility": "poor"
      },
      "hiking_score": 3,
      "recommendations": ["waterproofs_essential", "avoid_exposed_ridges"]
    }
  ],
  "alerts": [
    {
      "level": "warning",
      "type": "high_wind",
      "message": "Wind speeds above 40kph expected",
      "start_time": "2025-06-14T08:00:00Z",
      "end_time": "2025-06-14T18:00:00Z"
    }
  ],
  "metadata": {
    "last_updated": "2025-06-14T09:30:00Z",
    "sources": ["mwis", "met_office"],
    "confidence": "medium",
    "next_update": "2025-06-14T13:30:00Z"
  }
}
```

#### GET /api/v1/weather/compare
**Purpose:** Compare weather between multiple locations
**Query Parameters:**
- `locations` (array): Location IDs to compare (max 3)
- `date` (string): Date for comparison (YYYY-MM-DD)

**Response Example:**
```json
{
  "comparison": [
    {
      "location": {
        "id": "ben-nevis",
        "name": "Ben Nevis",
        "distance_km": 0
      },
      "conditions": {
        "hiking_score": 4,
        "wind_speed_kph": 35,
        "temperature_c": 2,
        "precipitation_mm": 2.5
      },
      "ranking": 2
    },
    {
      "location": {
        "id": "ben-macdui",
        "name": "Ben Macdui",
        "distance_km": 125
      },
      "conditions": {
        "hiking_score": 7,
        "wind_speed_kph": 20,
        "temperature_c": 5,
        "precipitation_mm": 0.1
      },
      "ranking": 1
    }
  ],
  "recommendation": {
    "best_location": "ben-macdui",
    "reason": "Lower wind speeds and minimal precipitation",
    "driving_time_minutes": 180
  }
}
```

### 3. User Preferences Endpoints

#### GET/POST /api/v1/preferences
**Purpose:** Manage user preferences and settings
**POST Body Example:**
```json
{
  "units": {
    "temperature": "celsius",
    "wind_speed": "kph", 
    "precipitation": "mm",
    "distance": "km"
  },
  "notifications": {
    "weather_alerts": true,
    "severe_weather": true,
    "favorites_updates": false
  },
  "safety": {
    "risk_tolerance": "conservative",
    "experience_level": "intermediate"
  },
  "favorites": [
    {
      "location_id": "ben-nevis",
      "added_date": "2025-06-01T10:00:00Z",
      "nickname": "My local Munro"
    }
  ]
}
```

### 4. Alerts & Notifications Endpoints

#### GET /api/v1/alerts
**Purpose:** Get active weather alerts
**Query Parameters:**
- `location_ids` (array): Specific locations to check
- `severity` (string): Minimum alert level (info, warning, severe)

#### POST /api/v1/notifications/register
**Purpose:** Register device for push notifications
**Body:**
```json
{
  "device_token": "abc123...",
  "platform": "ios",
  "location_ids": ["ben-nevis", "ben-macdui"],
  "alert_types": ["severe_weather", "conditions_improved"]
}
```

## Data Models

### Location Model
```python
from dataclasses import dataclass
from typing import List, Optional
from datetime import datetime

@dataclass
class Location:
    id: str
    name: str
    area: str
    elevation_m: int
    latitude: float
    longitude: float
    classification: str  # munro, corbett, graham, hill
    difficulty: str      # easy, moderate, challenging, extreme
    description: Optional[str] = None
    route_distance_km: Optional[float] = None
    elevation_gain_m: Optional[int] = None
    estimated_time_hours: Optional[float] = None
    weather_sources: List[dict] = None
    emergency_contacts: List[dict] = None
    created_at: datetime = None
    updated_at: datetime = None

@dataclass
class Area:
    id: str
    name: str
    region: str
    latitude_center: float
    longitude_center: float
    locations: List[Location]
    description: str
    access_info: dict
```

### Weather Model
```python
@dataclass
class WeatherConditions:
    temperature_c: float
    feels_like_c: float
    wind_speed_kph: int
    wind_direction: str
    wind_gust_kph: Optional[int]
    precipitation_mm: float
    precipitation_type: str  # none, rain, snow, sleet
    cloud_base_m: Optional[int]
    visibility_km: Optional[float]
    freezing_level_m: Optional[int]
    humidity_percent: Optional[int]
    pressure_hpa: Optional[float]

@dataclass
class WeatherPeriod:
    period_id: str
    start_time: datetime
    end_time: datetime
    summary: str
    icon: str
    conditions: WeatherConditions
    hiking_score: int  # 1-10 scale
    recommendations: List[str]
    source: str
    confidence: str  # high, medium, low

@dataclass
class WeatherForecast:
    location: Location
    current: Optional[WeatherPeriod]
    periods: List[WeatherPeriod]
    alerts: List[dict]
    metadata: dict
    generated_at: datetime
    expires_at: datetime
```

### Alert Model
```python
@dataclass
class WeatherAlert:
    id: str
    location_ids: List[str]
    alert_type: str  # high_wind, heavy_rain, poor_visibility, etc.
    severity: str    # info, warning, severe
    title: str
    message: str
    start_time: datetime
    end_time: Optional[datetime]
    source: str
    recommendations: List[str]
    created_at: datetime
```

### User Preferences Model
```python
@dataclass
class UserPreferences:
    user_id: str
    units: dict
    notifications: dict
    safety_settings: dict
    favorites: List[dict]
    recent_locations: List[str]
    created_at: datetime
    updated_at: datetime
```

## Database Schema

### PostgreSQL Tables

```sql
-- Locations table
CREATE TABLE locations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    area VARCHAR(100) NOT NULL,
    elevation_m INTEGER NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    classification VARCHAR(50),
    difficulty VARCHAR(50),
    description TEXT,
    route_distance_km DECIMAL(6,2),
    elevation_gain_m INTEGER,
    estimated_time_hours DECIMAL(4,2),
    metadata JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Weather data table (TimescaleDB hypertable)
CREATE TABLE weather_data (
    id SERIAL,
    location_id VARCHAR(100) REFERENCES locations(id),
    timestamp TIMESTAMPTZ NOT NULL,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL,
    raw_data JSONB NOT NULL,
    processed_data JSONB NOT NULL,
    hiking_score INTEGER,
    confidence VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('weather_data', 'timestamp');

-- User preferences table
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY,
    preferences JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Alerts table
CREATE TABLE weather_alerts (
    id SERIAL PRIMARY KEY,
    location_ids VARCHAR(100)[] NOT NULL,
    alert_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    source VARCHAR(50) NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_locations_area ON locations(area);
CREATE INDEX idx_locations_classification ON locations(classification);
CREATE INDEX idx_weather_data_location_timestamp ON weather_data(location_id, timestamp DESC);
CREATE INDEX idx_alerts_location_time ON weather_alerts USING GIN(location_ids);
```

## Integration with Existing System

### Enhanced weather_scraper.py
The existing Python script will be enhanced to provide API functionality:

```python
# New API layer additions to weather_scraper.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
from typing import List, Optional

app = FastAPI(title="Scottish Mountain Weather API")

# Enhance existing functions
async def get_location_weather(location_id: str) -> dict:
    """
    Enhanced version of existing scraping functionality
    Now returns structured API response
    """
    # Use existing weather scraping logic
    # Add caching and error handling
    # Return structured JSON response
    pass

@app.get("/api/v1/weather/{location_id}")
async def weather_endpoint(location_id: str):
    """
    API endpoint wrapping existing weather functionality
    """
    try:
        weather_data = await get_location_weather(location_id)
        return weather_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Data Pipeline Architecture
```
Existing YAML Config → Enhanced Data Models → API Responses
weather_scraper.py → Background Processing → Real-time API
MWIS/Met Office → Data Validation → Cached Responses
```

## API Performance Requirements

### Response Time Targets
- Location search: <200ms
- Weather data: <500ms  
- Comparison queries: <800ms
- Alert checks: <100ms

### Caching Strategy
- Weather data: 4-hour cache (aligned with update frequency)
- Location data: 24-hour cache (static data)
- Search results: 1-hour cache
- User preferences: No cache (always fresh)

### Rate Limiting
- Public endpoints: 1000 requests/hour per IP
- Weather endpoints: 100 requests/hour per IP
- Comparison endpoint: 20 requests/hour per IP

## Security & Privacy

### API Security
- API key required for all endpoints
- HTTPS only (TLS 1.3+)
- CORS properly configured
- Input validation on all parameters
- SQL injection prevention
- Rate limiting implemented

### Data Privacy
- No personal data collection required
- Optional location data with clear consent
- Minimal logging (no personal identifiers)
- GDPR compliance for EU users
- User preference data encrypted at rest

This API architecture provides a solid foundation for the mobile app while leveraging and enhancing the existing weather_scraper.py functionality.