"""
Simple API for testing the Scottish Mountain Weather App
This provides mock data to test the frontend without requiring database setup
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta
import uvicorn
import glob
import os
from pathlib import Path
from collections import defaultdict

app = FastAPI(
    title="Scottish Mountain Weather API (Mock)",
    description="Mock API for testing the frontend",
    version="1.0.0-mock"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Path to forecast directory
FORECAST_DIR = Path(__file__).parent.parent / "forecasts"

# Scoring algorithm constants (from weather_scraper.py - conservative for safety)
SCORE_WEIGHT_WIND = 2.5  # Penalty per 10kph over 30kph
SCORE_WEIGHT_RAIN = 7.0  # Penalty per mm rain
SCORE_WEIGHT_SNOW = 12.0  # Penalty per cm snow
SCORE_WEIGHT_COLD = 3.0  # Penalty per degree below 0°C
SCORE_WEIGHT_HOT = 0.5   # Penalty per degree above 25°C

def calculate_hiking_score(temp_min, temp_max, temp_chill, wind_kph, rain_mm=0, snow_cm=0):
    """Calculate hiking suitability score (1-10, 10=perfect)"""
    penalty_score = 0

    # Use wind chill if more severe
    effective_min_temp = temp_min
    if temp_chill is not None and temp_min is not None:
        effective_min_temp = min(temp_min, temp_chill)
    elif temp_chill is not None:
        effective_min_temp = temp_chill

    # Cold penalty
    if effective_min_temp is not None and effective_min_temp < 0:
        penalty_score += abs(effective_min_temp) * SCORE_WEIGHT_COLD

    # Heat penalty
    if temp_max is not None and temp_max > 25:
        penalty_score += (temp_max - 25) * SCORE_WEIGHT_HOT

    # Wind penalty
    if wind_kph is not None and wind_kph > 30:
        penalty_score += ((wind_kph - 30) / 10) * SCORE_WEIGHT_WIND

    # Precipitation penalties
    if rain_mm: penalty_score += rain_mm * SCORE_WEIGHT_RAIN
    if snow_cm: penalty_score += snow_cm * SCORE_WEIGHT_SNOW

    return round(max(1.0, 10.0 - penalty_score), 1)

def get_risk_level(score):
    """Convert score to risk level"""
    if score >= 8: return "low"
    elif score >= 6: return "moderate"
    elif score >= 4: return "high"
    else: return "extreme"

def find_latest_forecast(location_name: str) -> Optional[Dict]:
    """Find the most recent forecast JSON file for a location"""
    if not FORECAST_DIR.exists():
        return None

    # Search all subdirectories for forecast files matching location name
    pattern = f"**/*{location_name.replace(' ', '_')}*mountain-forecast.com.json"
    files = list(FORECAST_DIR.glob(pattern))

    if not files:
        # Try without spaces
        pattern = f"**/*{location_name.replace(' ', '')}*mountain-forecast.com.json"
        files = list(FORECAST_DIR.glob(pattern))

    if not files:
        return None

    # Get the most recent file
    latest_file = max(files, key=lambda p: p.stat().st_mtime)

    try:
        with open(latest_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading forecast for {location_name}: {e}")
        return None

def convert_forecast_to_api_format(forecast_data: Dict, location: Dict) -> Dict:
    """Convert scraped forecast JSON to API response format"""
    if not forecast_data or "forecast_periods" not in forecast_data:
        return None

    # Group periods by day
    daily_forecasts = defaultdict(list)
    for period in forecast_data["forecast_periods"]:
        date = period.get("full_date", "")
        if date:
            daily_forecasts[date].append(period)

    # Convert to API format
    forecasts = []
    for date_str in sorted(daily_forecasts.keys())[:6]:  # Max 6 days
        periods_data = daily_forecasts[date_str]

        # Convert each period
        api_periods = []
        for p in periods_data:
            score = calculate_hiking_score(
                temp_min=p.get("temp_min_c"),
                temp_max=p.get("temp_max_c"),
                temp_chill=p.get("temp_chill_c"),
                wind_kph=p.get("wind_kph"),
                rain_mm=p.get("rain_mm", 0),
                snow_cm=p.get("snow_cm", 0)
            )

            api_periods.append({
                "period_type": p.get("time", "").lower(),
                "temperature_c": p.get("temp_max_c", 0),
                "feels_like_c": p.get("temp_chill_c"),
                "wind_speed_kph": p.get("wind_kph", 0),
                "wind_direction": p.get("wind_dir", ""),
                "precipitation_mm": (p.get("rain_mm", 0) + (p.get("snow_cm", 0) * 10)),  # Convert snow to water equivalent
                "weather_description": p.get("summary", ""),
                "visibility_m": 10000,  # Not in scraped data
                "cloud_base_m": p.get("cloud_base_m", 1000),
                "humidity_percent": 80,  # Not in scraped data
                "hiking_score": score,
                "risk_level": get_risk_level(score),
                "snow_cm": p.get("snow_cm", 0),
                "freezing_level_m": p.get("freezing_level_m")
            })

        # Calculate daily summary
        if api_periods:
            temps = [p["temperature_c"] for p in api_periods if p["temperature_c"]]
            winds = [p["wind_speed_kph"] for p in api_periods if p["wind_speed_kph"]]
            precip = sum(p["precipitation_mm"] for p in api_periods)
            scores = [p["hiking_score"] for p in api_periods]

            forecasts.append({
                "date": date_str,
                "summary": {
                    "max_temp_c": max(temps) if temps else 0,
                    "min_temp_c": min(temps) if temps else 0,
                    "max_wind_speed_kph": max(winds) if winds else 0,
                    "total_precipitation_mm": round(precip, 1),
                    "overall_hiking_score": round(sum(scores) / len(scores), 1) if scores else 5.0,
                    "dominant_conditions": api_periods[0]["weather_description"] if api_periods else "Unknown"
                },
                "periods": api_periods
            })

    return {
        "location": location,
        "forecasts": forecasts,
        "last_updated": forecast_data.get("scrape_time", datetime.now().isoformat()),
        "data_source": "mountain-forecast.com (scraped)",
        "alerts": []
    }

# Mock data - Extended list of Scottish mountains
MOCK_LOCATIONS = [
    # Glencoe area
    {
        "id": "glencoe-bidean-nam-bian",
        "name": "Bidean nam Bian",
        "area": "Glencoe",
        "latitude": 56.6647,
        "longitude": -5.0623,
        "elevation_m": 1150,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "glencoe-buachaille-etive-mor",
        "name": "Buachaille Etive Mor",
        "area": "Glencoe",
        "latitude": 56.6483,
        "longitude": -4.8950,
        "elevation_m": 1022,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "glencoe-aonach-eagach",
        "name": "Aonach Eagach",
        "area": "Glencoe",
        "latitude": 56.6839,
        "longitude": -5.0339,
        "elevation_m": 967,
        "classification": "munro",
        "difficulty": "challenging"
    },
    
    # Torridon area
    {
        "id": "torridon-beinn-eighe",
        "name": "Beinn Eighe", 
        "area": "Torridon",
        "latitude": 57.6089,
        "longitude": -5.3097,
        "elevation_m": 1010,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-liathach",
        "name": "Liathach",
        "area": "Torridon",
        "latitude": 57.5639,
        "longitude": -5.4639,
        "elevation_m": 1055,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "torridon-beinn-alligin",
        "name": "Beinn Alligin",
        "area": "Torridon",
        "latitude": 57.5961,
        "longitude": -5.5711,
        "elevation_m": 986,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-beinn-damh",
        "name": "Beinn Damh",
        "area": "Torridon",
        "latitude": 57.5283,
        "longitude": -5.5550,
        "elevation_m": 902,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-slioch",
        "name": "Slioch",
        "area": "Torridon",
        "latitude": 57.6667,
        "longitude": -5.3500,
        "elevation_m": 981,
        "classification": "munro",
        "difficulty": "moderate"
    },
    # Skye area
    {
        "id": "skye-bla-bheinn",
        "name": "Bla Bheinn",
        "area": "Skye",
        "latitude": 57.2069,
        "longitude": -6.0890,
        "elevation_m": 928,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "skye-sgurr-alasdair",
        "name": "Sgurr Alasdair",
        "area": "Skye",
        "latitude": 57.2075,
        "longitude": -6.2239,
        "elevation_m": 992,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "skye-sgurr-dearg",
        "name": "Sgurr Dearg - Inaccessible Pinnacle",
        "area": "Skye",
        "latitude": 57.2119,
        "longitude": -6.2350,
        "elevation_m": 986,
        "classification": "munro",
        "difficulty": "challenging"
    },
    
    # Cairngorms area
    {
        "id": "cairngorms-ben-macdui",
        "name": "Ben Macdui",
        "area": "Cairngorms",
        "latitude": 57.0704,
        "longitude": -3.6689,
        "elevation_m": 1309,
        "classification": "munro", 
        "difficulty": "moderate"
    },
    {
        "id": "cairngorms-cairn-gorm",
        "name": "Cairn Gorm",
        "area": "Cairngorms",
        "latitude": 57.1167,
        "longitude": -3.6450,
        "elevation_m": 1245,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "cairngorms-braeriach",
        "name": "Braeriach",
        "area": "Cairngorms",
        "latitude": 57.0783,
        "longitude": -3.7283,
        "elevation_m": 1296,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "cairngorms-cairn-toul",
        "name": "Cairn Toul",
        "area": "Cairngorms",
        "latitude": 57.0614,
        "longitude": -3.7117,
        "elevation_m": 1291,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "cairngorms-ben-avon",
        "name": "Ben Avon",
        "area": "Cairngorms",
        "latitude": 57.0967,
        "longitude": -3.4331,
        "elevation_m": 1171,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Coigach area
    {
        "id": "coigach-suilven",
        "name": "Suilven",
        "area": "Coigach",
        "latitude": 58.1431,
        "longitude": -5.1572,
        "elevation_m": 731,
        "classification": "corbett",
        "difficulty": "challenging"
    },
    {
        "id": "coigach-stac-pollaidh",
        "name": "Stac Pollaidh",
        "area": "Coigach",
        "latitude": 58.0433,
        "longitude": -5.3517,
        "elevation_m": 612,
        "classification": "graham",
        "difficulty": "moderate"
    },
    {
        "id": "coigach-cul-beag",
        "name": "Cul Beag",
        "area": "Coigach",
        "latitude": 58.0942,
        "longitude": -5.0942,
        "elevation_m": 769,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    
    # Knoydart area
    {
        "id": "knoydart-ladhar-bheinn",
        "name": "Ladhar Bheinn",
        "area": "Knoydart",
        "latitude": 57.0672,
        "longitude": -5.5989,
        "elevation_m": 1020,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "knoydart-beinn-na-caillich",
        "name": "Beinn na Caillich",
        "area": "Knoydart",
        "latitude": 57.0500,
        "longitude": -5.6333,
        "elevation_m": 785,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    
    # Ben Nevis area
    {
        "id": "ben-nevis-ben-nevis",
        "name": "Ben Nevis",
        "area": "Ben Nevis",
        "latitude": 56.7969,
        "longitude": -5.0036,
        "elevation_m": 1344,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "ben-nevis-aonach-mor",
        "name": "Aonach Mor",
        "area": "Ben Nevis",
        "latitude": 56.8167,
        "longitude": -4.9167,
        "elevation_m": 1221,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "ben-nevis-carn-mor-dearg",
        "name": "Carn Mor Dearg",
        "area": "Ben Nevis",
        "latitude": 56.8036,
        "longitude": -4.9942,
        "elevation_m": 1220,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-aonach-beag",
        "name": "Aonach Beag",
        "area": "Ben Nevis",
        "latitude": 56.8167,
        "longitude": -4.9000,
        "elevation_m": 1234,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-stob-ban",
        "name": "Stob Ban",
        "area": "Ben Nevis",
        "latitude": 56.8167,
        "longitude": -4.8667,
        "elevation_m": 999,
        "classification": "munro",
        "difficulty": "moderate"
    }
]

def generate_mock_weather_period(period_type: str, base_temp: int = 10, days_offset: int = 0):
    """Generate mock weather data for a specific period"""
    import random

    temp_variance = random.randint(-5, 8)
    wind_variance = random.randint(-10, 15)

    if period_type == "am":
        temp_adj = -2
    elif period_type == "pm":
        temp_adj = 3
    else:  # night
        temp_adj = -5

    temperature = base_temp + temp_adj + temp_variance
    wind_speed = max(5, 25 + wind_variance)
    precipitation = random.choice([0, 0, 0.5, 2, 5, 10]) if days_offset < 3 else random.choice([0, 1, 3, 8])

    # Calculate hiking score using the same algorithm as real data
    # Start at 10 (perfect conditions) and apply penalties
    score = calculate_hiking_score(
        temp_min=temperature - 3,
        temp_max=temperature,
        temp_chill=temperature - 5 if wind_speed > 20 else temperature,
        wind_kph=wind_speed,
        rain_mm=precipitation,
        snow_cm=0
    )
    
    risk_levels = ["low", "moderate", "high", "extreme"]
    if score >= 8: risk_level = "low"
    elif score >= 6: risk_level = "moderate" 
    elif score >= 4: risk_level = "high"
    else: risk_level = "extreme"
    
    weather_descriptions = [
        "Clear skies", "Partly cloudy", "Overcast", "Light rain", 
        "Heavy rain", "Snow showers", "Sunny spells", "Misty"
    ]
    
    return {
        "period_type": period_type,
        "temperature_c": temperature,
        "feels_like_c": temperature - 2,
        "wind_speed_kph": wind_speed,
        "wind_direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
        "precipitation_mm": precipitation,
        "weather_description": random.choice(weather_descriptions),
        "visibility_m": random.randint(2000, 25000),
        "cloud_base_m": random.randint(300, 2000),
        "humidity_percent": random.randint(60, 95),
        "hiking_score": score,
        "risk_level": risk_level
    }

def generate_mock_forecast(location: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a complete mock forecast for a location"""
    forecasts = []
    base_date = datetime.now().date()
    
    for day_offset in range(6):
        date = base_date + timedelta(days=day_offset)
        
        periods = [
            generate_mock_weather_period("am", days_offset=day_offset),
            generate_mock_weather_period("pm", days_offset=day_offset), 
            generate_mock_weather_period("night", days_offset=day_offset)
        ]
        
        # Calculate daily summary
        temps = [p["temperature_c"] for p in periods]
        winds = [p["wind_speed_kph"] for p in periods]
        precip = sum(p["precipitation_mm"] for p in periods)
        scores = [p["hiking_score"] for p in periods]
        
        daily_forecast = {
            "date": date.isoformat(),
            "summary": {
                "max_temp_c": max(temps),
                "min_temp_c": min(temps),
                "max_wind_speed_kph": max(winds),
                "total_precipitation_mm": precip,
                "overall_hiking_score": round(sum(scores) / len(scores), 1),
                "dominant_conditions": "Mixed conditions"
            },
            "periods": periods
        }
        forecasts.append(daily_forecast)
    
    return {
        "location": location,
        "forecasts": forecasts,
        "last_updated": datetime.now().isoformat(),
        "data_source": "mock-api",
        "alerts": []
    }

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Scottish Mountain Weather API (Mock)",
        "version": "1.0.0-mock",
        "status": "operational",
        "documentation": "/docs"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mock-api"}

@app.post("/api/metrics")
async def post_metrics(data: Dict[str, Any] = None):
    """Accept metrics data from frontend (no-op for mock API)"""
    # In a real implementation, this would store metrics
    # For mock API, we just acknowledge receipt
    return {"status": "received", "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/locations")
async def get_locations(
    search: str = None,
    area: str = None,
    classification: str = None,
    limit: int = 20
):
    """Get list of locations with optional filtering"""
    locations = MOCK_LOCATIONS.copy()
    
    if search:
        search_lower = search.lower()
        locations = [loc for loc in locations if search_lower in loc["name"].lower() or search_lower in loc["area"].lower()]
    
    if area:
        locations = [loc for loc in locations if loc["area"].lower() == area.lower()]
        
    if classification:
        locations = [loc for loc in locations if loc["classification"] == classification]
    
    return {
        "locations": locations[:limit],
        "total": len(locations),
        "limit": limit
    }

@app.get("/api/v1/weather/{location_id}")
async def get_weather(location_id: str):
    """Get weather forecast for a specific location"""
    location = next((loc for loc in MOCK_LOCATIONS if loc["id"] == location_id), None)

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Try to load real scraped forecast data
    forecast_data = find_latest_forecast(location["name"])
    if forecast_data:
        real_forecast = convert_forecast_to_api_format(forecast_data, location)
        if real_forecast:
            print(f"✅ Serving REAL forecast for {location['name']}")
            return real_forecast

    # Fall back to mock data if no real forecast available
    print(f"⚠️  No real forecast found for {location['name']}, using mock data")
    return generate_mock_forecast(location)

@app.get("/api/v1/weather/compare")
async def compare_weather(location_ids: str):
    """Compare weather across multiple locations"""
    ids = location_ids.split(",")
    comparisons = []
    
    for location_id in ids:
        location = next((loc for loc in MOCK_LOCATIONS if loc["id"] == location_id.strip()), None)
        if location:
            comparisons.append(generate_mock_forecast(location))
    
    return {"comparisons": comparisons}

@app.get("/api/v1/areas")
async def get_areas():
    """Get list of mountain areas"""
    area_names = list(set(loc["area"] for loc in MOCK_LOCATIONS))
    areas_with_counts = []
    
    for area_name in area_names:
        location_count = len([loc for loc in MOCK_LOCATIONS if loc["area"] == area_name])
        areas_with_counts.append({
            "id": area_name.lower().replace(" ", "-"),
            "name": area_name,
            "locationCount": location_count
        })
    
    return areas_with_counts

if __name__ == "__main__":
    print("🏔️  Starting Scottish Mountain Weather API (Mock)")
    print("📍 API will be available at: http://localhost:8000")
    print("📊 API documentation at: http://localhost:8000/docs")
    print("🔄 Frontend should connect automatically")
    
    uvicorn.run(
        "simple_api:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )