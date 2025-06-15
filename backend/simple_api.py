"""
Simple API for testing the Scottish Mountain Weather App
This provides mock data to test the frontend without requiring database setup
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import json
from datetime import datetime, timedelta
import uvicorn

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
        "id": "fort-william-ben-nevis",
        "name": "Ben Nevis",
        "area": "Fort William",
        "latitude": 56.7969,
        "longitude": -5.0036,
        "elevation_m": 1345,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "fort-william-carn-mor-dearg",
        "name": "Carn Mor Dearg",
        "area": "Fort William",
        "latitude": 56.8036,
        "longitude": -4.9942,
        "elevation_m": 1220,
        "classification": "munro",
        "difficulty": "challenging"
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
    
    # Calculate hiking score based on conditions
    score = 8
    if temperature < 0: score -= 2
    if temperature < -10: score -= 2  
    if wind_speed > 40: score -= 2
    if wind_speed > 60: score -= 3
    if precipitation > 5: score -= 2
    if precipitation > 15: score -= 2
    
    score = max(1, min(10, score))
    
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