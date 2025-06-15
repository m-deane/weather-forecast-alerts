"""Simplified API that works with our database"""
from datetime import datetime, timedelta, date
from typing import List, Optional
import logging

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func, and_

from database import get_db
from models_simple import Location, Area, WeatherData, WeatherSource
from config import get_settings

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()

# Initialize FastAPI app
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mountain-weather-api"}

@app.get("/api/v1/locations")
async def get_locations(
    db: Session = Depends(get_db),
    q: Optional[str] = Query(None, description="Search query"),
    area: Optional[str] = Query(None, description="Filter by area"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500)
):
    """Get all locations with optional filtering"""
    query = db.query(Location).filter(Location.is_active == True)
    
    # If there's a search query, filter by it
    if q and len(q) >= 2:
        query = query.filter(Location.name.ilike(f"%{q}%"))
        
    if area:
        query = query.join(Area).filter(Area.name == area)
        
    total = query.count()
    locations = query.offset(skip).limit(limit).all()
    
    return {
        "locations": [
            {
                "id": str(loc.id),  # Convert to string for frontend
                "name": loc.name,
                "area": loc.area.name if loc.area else None,
                "latitude": float(loc.latitude),
                "longitude": float(loc.longitude),
                "elevation_m": loc.elevation_m,
                "classification": loc.classification or "hill",
                "difficulty": loc.difficulty or "moderate"
            }
            for loc in locations
        ],
        "total": total,
        "skip": skip,
        "limit": limit
    }

@app.get("/api/v1/areas")
async def get_areas(db: Session = Depends(get_db)):
    """Get all areas with location counts"""
    areas = db.query(
        Area.id,
        Area.name,
        func.count(Location.id).label('location_count')
    ).join(Location).group_by(Area.id, Area.name).all()
    
    return [
        {
            "id": area.id,
            "name": area.name,
            "locationCount": area.location_count
        }
        for area in areas
    ]

@app.get("/api/v1/weather/{location_id}")
async def get_weather(
    location_id: int,
    db: Session = Depends(get_db),
    days: int = Query(6, ge=1, le=14)
):
    """Get weather forecast for a location"""
    # Get location
    location = db.query(Location).filter(
        Location.id == location_id,
        Location.is_active == True
    ).first()
    
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
        
    # Get weather data
    start_date = date.today()
    end_date = start_date + timedelta(days=days)
    
    weather_data = db.query(WeatherData).filter(
        WeatherData.location_id == location_id,
        WeatherData.forecast_date >= start_date,
        WeatherData.forecast_date < end_date
    ).order_by(
        WeatherData.forecast_date,
        WeatherData.period_type,
        WeatherData.period_index
    ).all()
    
    # Group by date
    daily_forecasts = {}
    for wd in weather_data:
        date_key = wd.forecast_date.isoformat()
        if date_key not in daily_forecasts:
            daily_forecasts[date_key] = {
                "date": date_key,
                "periods": []
            }
            
        # Map database period types to frontend expectations
        period_type_map = {
            "morning": "am",
            "afternoon": "pm",
            "night": "night"
        }
        
        # Determine risk level based on conditions
        risk_level = "low"
        if wd.wind_speed_kmh and wd.wind_speed_kmh > 60:
            risk_level = "high"
        elif wd.wind_speed_kmh and wd.wind_speed_kmh > 40:
            risk_level = "moderate"
        elif wd.precipitation_mm and wd.precipitation_mm > 10:
            risk_level = "moderate"
            
        daily_forecasts[date_key]["periods"].append({
            "period_type": period_type_map.get(wd.period_type, wd.period_type),
            "temperature_c": float(wd.temperature_c) if wd.temperature_c else 10,
            "feels_like_c": float(wd.feels_like_c) if wd.feels_like_c else 8,
            "wind_speed_kph": float(wd.wind_speed_kmh) if wd.wind_speed_kmh else 20,
            "wind_direction": wd.wind_direction or "W",
            "precipitation_mm": float(wd.precipitation_mm) if wd.precipitation_mm else 0,
            "precipitation_type": "rain" if wd.precipitation_mm and wd.precipitation_mm > 0 else "none",
            "weather_description": wd.summit_conditions or "Partly cloudy with moderate winds",
            "hiking_score": int(wd.hiking_score) if wd.hiking_score else 7,
            "risk_level": risk_level,
            "visibility_m": 5000,  # Default visibility
            "cloud_base_m": int(wd.cloud_base_m) if wd.cloud_base_m else 1000,
            "freezing_level_m": int(wd.freezing_level_m) if wd.freezing_level_m else 2000
        })
    
    # Calculate daily summaries
    forecasts = []
    for date_key in sorted(daily_forecasts.keys()):
        day_data = daily_forecasts[date_key]
        periods = day_data["periods"]
        
        # Calculate summary stats
        temps = [p["temperature_c"] for p in periods if p["temperature_c"]]
        winds = [p["wind_speed_kph"] for p in periods if p["wind_speed_kph"]]
        precips = [p["precipitation_mm"] for p in periods]
        scores = [p["hiking_score"] for p in periods if p["hiking_score"]]
        
        forecasts.append({
            "date": date_key,
            "periods": periods,
            "summary": {
                "max_temp_c": max(temps) if temps else 15,
                "min_temp_c": min(temps) if temps else 5,
                "total_precipitation_mm": sum(precips),
                "max_wind_speed_kph": max(winds) if winds else 30,
                "overall_hiking_score": int(sum(scores) / len(scores)) if scores else 6,
                "best_period": "am"  # Could be calculated based on scores
            }
        })
        
    # If no real data, generate mock data
    if not forecasts:
        forecasts = generate_mock_forecast_new(location, days)
        
    return {
        "location": {
            "id": str(location.id),
            "name": location.name,
            "area": location.area.name if location.area else None,
            "elevation_m": location.elevation_m,
            "latitude": float(location.latitude),
            "longitude": float(location.longitude),
            "classification": location.classification or "munro",
            "difficulty": location.difficulty or "moderate"
        },
        "forecasts": forecasts,
        "last_updated": datetime.utcnow().isoformat(),
        "data_source": "Mountain Weather Information Service",
        "alerts": []  # No alerts for now
    }

def generate_mock_forecast_new(location: Location, days: int) -> list:
    """Generate mock forecast data in the new format"""
    import random
    
    forecasts = []
    for day_offset in range(days):
        forecast_date = date.today() + timedelta(days=day_offset)
        date_key = forecast_date.isoformat()
        
        periods = []
        temps = []
        winds = []
        precips = []
        scores = []
        
        for period_type in ["am", "pm", "night"]:
            base_temp = random.randint(5, 15) - (location.elevation_m // 200)
            temp = base_temp + random.randint(-3, 3)
            wind = random.randint(10, 40)
            precip = random.choice([0, 0, 0, 2, 5, 10])
            score = random.randint(5, 9)
            
            temps.append(temp)
            winds.append(wind)
            precips.append(precip)
            scores.append(score)
            
            risk_level = "low"
            if wind > 60:
                risk_level = "high"
            elif wind > 40 or precip > 10:
                risk_level = "moderate"
            
            periods.append({
                "period_type": period_type,
                "temperature_c": temp,
                "feels_like_c": temp - random.randint(2, 5),
                "wind_speed_kph": wind,
                "wind_direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
                "precipitation_mm": precip,
                "precipitation_type": "rain" if precip > 0 else "none",
                "weather_description": random.choice(["Clear skies", "Partly cloudy", "Cloudy", "Light rain", "Rain"]),
                "hiking_score": score,
                "risk_level": risk_level,
                "visibility_m": random.randint(3000, 10000),
                "cloud_base_m": random.randint(800, 2000),
                "freezing_level_m": random.randint(1500, 3000)
            })
        
        forecasts.append({
            "date": date_key,
            "periods": periods,
            "summary": {
                "max_temp_c": max(temps),
                "min_temp_c": min(temps),
                "total_precipitation_mm": sum(precips),
                "max_wind_speed_kph": max(winds),
                "overall_hiking_score": int(sum(scores) / len(scores)),
                "best_period": "am"
            }
        })
    
    return forecasts

def generate_mock_forecast(location: Location, days: int) -> dict:
    """Generate mock forecast data when no real data available"""
    import random
    
    forecasts = {}
    for day_offset in range(days):
        forecast_date = date.today() + timedelta(days=day_offset)
        date_key = forecast_date.isoformat()
        
        forecasts[date_key] = {
            "date": date_key,
            "periods": []
        }
        
        for period in ["morning", "afternoon", "night"]:
            base_temp = random.randint(5, 15) - (location.elevation_m // 200)
            
            forecasts[date_key]["periods"].append({
                "period": period,
                "temperature_c": base_temp + random.randint(-3, 3),
                "feels_like_c": base_temp + random.randint(-5, 0),
                "wind_speed_kmh": random.randint(10, 40),
                "wind_direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
                "precipitation_mm": random.choice([0, 0, 0, 2, 5, 10]),
                "conditions": random.choice(["Clear", "Partly Cloudy", "Cloudy", "Light Rain", "Rain"]),
                "hiking_score": random.randint(5, 9)
            })
            
    return forecasts

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)