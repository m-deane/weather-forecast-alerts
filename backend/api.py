"""
FastAPI backend for Scottish Mountain Weather App
Building on existing weather_scraper.py functionality
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
import logging
from decimal import Decimal

from fastapi import FastAPI, HTTPException, Depends, Query, Path, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, desc
from geoalchemy2.functions import ST_DWithin, ST_GeogFromText
import redis
import json

from .models import (
    # Database models
    Location, Area, WeatherData, WeatherSource, UserPreferences,
    # Pydantic models
    WeatherForecast, LocationSearchResult, WeatherComparisonResponse,
    LocationInfo, LocationDetail, WeatherPeriod, WeatherConditions,
    SafetyInfo, WeatherAlert, WeatherMetadata, LocationComparison,
    # Request models
    LocationSearchRequest, WeatherRequest, UserPreferencesRequest,
    # Utility functions
    calculate_hiking_score, determine_hiking_suitability, 
    generate_risk_factors, generate_recommendations,
    # Enums
    PeriodType, HikingSuitability, AlertSeverity
)
from .database import get_db, engine
from .cache import get_redis, cache_key
from .weather_service import WeatherService

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Scottish Mountain Weather API",
    description="Weather forecasting API for Scottish mountains and hills",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure middleware
# SECURITY: Import security_config for proper CORS configuration
from .security import security_config

app.add_middleware(
    CORSMiddleware,
    allow_origins=security_config.allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],  # Explicit methods
    allow_headers=["Content-Type", "Authorization", "X-API-Key"],  # Explicit headers
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1"]  # Add production domain when deployed
)

# Initialize services
weather_service = WeatherService()

# =============================================
# HEALTH CHECK ENDPOINTS
# =============================================

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check with database and cache status"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    # Check database
    try:
        db.execute("SELECT 1")
        health_status["services"]["database"] = "healthy"
    except Exception as e:
        health_status["services"]["database"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    # Check Redis cache
    try:
        redis_client = get_redis()
        redis_client.ping()
        health_status["services"]["cache"] = "healthy"
    except Exception as e:
        health_status["services"]["cache"] = f"unhealthy: {str(e)}"
        health_status["status"] = "degraded"
    
    return health_status

# =============================================
# LOCATION ENDPOINTS
# =============================================

@app.get("/api/v1/locations", response_model=LocationSearchResult)
async def search_locations(
    q: Optional[str] = Query(None, description="Search query for mountain name"),
    area: Optional[str] = Query(None, description="Filter by area"),
    classification: Optional[str] = Query(None, description="Filter by classification"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    lat: Optional[float] = Query(None, description="Latitude for proximity search"),
    lng: Optional[float] = Query(None, description="Longitude for proximity search"),
    radius_km: int = Query(50, description="Search radius in kilometers"),
    limit: int = Query(20, description="Maximum results to return"),
    db: Session = Depends(get_db)
):
    """Search for mountain locations"""
    start_time = datetime.utcnow()
    
    # Build query
    query = db.query(Location)
    
    # Text search
    if q:
        query = query.filter(
            func.to_tsvector('english', Location.name + ' ' + 
                           func.coalesce(Location.description, '')).match(q)
        )
    
    # Area filter
    if area:
        query = query.filter(Location.area_id == area)
    
    # Classification filter
    if classification:
        query = query.filter(Location.classification == classification)
    
    # Difficulty filter
    if difficulty:
        query = query.filter(Location.difficulty == difficulty)
    
    # Proximity search
    if lat and lng:
        point = f"POINT({lng} {lat})"
        query = query.filter(
            ST_DWithin(
                Location.geom,
                ST_GeogFromText(point),
                radius_km * 1000  # Convert to meters
            )
        )
        # Order by distance
        query = query.order_by(
            func.ST_Distance(Location.geom, ST_GeogFromText(point))
        )
    else:
        # Order by popularity
        query = query.order_by(desc(Location.popularity_score))
    
    # Apply limit
    query = query.limit(limit)
    
    # Execute query
    locations = query.all()
    total = len(locations)
    
    # Convert to response format
    location_infos = []
    for loc in locations:
        location_infos.append(LocationInfo(
            id=loc.id,
            name=loc.name,
            area=loc.area.name if loc.area else None,
            elevation_m=loc.elevation_m,
            latitude=float(loc.latitude),
            longitude=float(loc.longitude),
            classification=loc.classification,
            difficulty=loc.difficulty
        ))
    
    query_time = (datetime.utcnow() - start_time).total_seconds() * 1000
    
    return LocationSearchResult(
        locations=location_infos,
        total=total,
        query_time_ms=int(query_time)
    )

@app.get("/api/v1/locations/{location_id}", response_model=LocationDetail)
async def get_location_detail(
    location_id: str = Path(..., description="Location ID"),
    db: Session = Depends(get_db)
):
    """Get detailed information for a specific location"""
    location = db.query(Location).filter(Location.id == location_id).first()
    
    if not location:
        raise HTTPException(
            status_code=404,
            detail=f"Location '{location_id}' not found"
        )
    
    # Get emergency contacts from area
    emergency_contacts = []
    if location.area and location.area.emergency_contacts:
        emergency_contacts = location.area.emergency_contacts
    
    return LocationDetail(
        id=location.id,
        name=location.name,
        area=location.area.name if location.area else None,
        elevation_m=location.elevation_m,
        latitude=float(location.latitude),
        longitude=float(location.longitude),
        classification=location.classification,
        difficulty=location.difficulty,
        description=location.description,
        route_distance_km=float(location.route_distance_km) if location.route_distance_km else None,
        elevation_gain_m=location.elevation_gain_m,
        estimated_time_hours=float(location.estimated_time_hours) if location.estimated_time_hours else None,
        difficulty_grade=location.difficulty_grade,
        weather_sources=location.weather_sources,
        safety_info=location.safety_info,
        emergency_contacts=emergency_contacts
    )

@app.get("/api/v1/areas")
async def get_areas(db: Session = Depends(get_db)):
    """Get list of all mountain areas"""
    areas = db.query(Area).all()
    
    return [
        {
            "id": area.id,
            "name": area.name,
            "region": area.region,
            "description": area.description,
            "latitude_center": float(area.latitude_center),
            "longitude_center": float(area.longitude_center),
            "location_count": len(area.locations) if area.locations else 0
        }
        for area in areas
    ]

# =============================================
# WEATHER ENDPOINTS
# =============================================

@app.get("/api/v1/weather/{location_id}", response_model=WeatherForecast)
async def get_weather_forecast(
    location_id: str = Path(..., description="Location ID"),
    hours: int = Query(72, description="Forecast hours ahead"),
    include: str = Query("current,periods,alerts", description="Data to include"),
    source: Optional[str] = Query(None, description="Preferred weather source"),
    db: Session = Depends(get_db),
    redis_client = Depends(get_redis)
):
    """Get weather forecast for a location"""
    
    # Check cache first
    cache_key_str = f"weather:{location_id}:{hours}:{include}:{source or 'all'}"
    cached_data = redis_client.get(cache_key_str)
    
    if cached_data:
        try:
            return WeatherForecast.parse_raw(cached_data)
        except Exception as e:
            logger.warning(f"Failed to parse cached weather data: {e}")
    
    # Get location
    location = db.query(Location).filter(Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    
    # Get weather data
    end_time = datetime.utcnow() + timedelta(hours=hours)
    query = db.query(WeatherData).filter(
        and_(
            WeatherData.location_id == location_id,
            WeatherData.timestamp >= datetime.utcnow() - timedelta(hours=6),
            WeatherData.period_start <= end_time
        )
    )
    
    if source:
        query = query.filter(WeatherData.source_id == source)
    
    weather_data = query.order_by(WeatherData.timestamp.desc()).all()
    
    # Process weather data into periods
    current_conditions = None
    periods = []
    alerts = []
    
    include_parts = include.split(',')
    
    # Process current conditions
    if 'current' in include_parts:
        current_data = next((wd for wd in weather_data if wd.period_type == 'current'), None)
        if current_data:
            current_conditions = create_weather_period(current_data)
    
    # Process forecast periods
    if 'periods' in include_parts:
        period_data = [wd for wd in weather_data if wd.period_type != 'current']
        periods = [create_weather_period(wd) for wd in period_data[:24]]  # Limit to 24 periods
    
    # Get alerts
    if 'alerts' in include_parts:
        # This would be implemented to fetch from weather_alerts table
        alerts = []  # Placeholder
    
    # Create metadata
    latest_update = max((wd.timestamp for wd in weather_data), default=datetime.utcnow())
    sources_used = list(set(wd.source_id for wd in weather_data))
    
    metadata = WeatherMetadata(
        last_updated=latest_update,
        sources=sources_used,
        confidence="medium",  # Would be calculated based on data quality
        next_update=latest_update + timedelta(hours=4)
    )
    
    # Create response
    forecast = WeatherForecast(
        location=LocationInfo(
            id=location.id,
            name=location.name,
            area=location.area.name if location.area else None,
            elevation_m=location.elevation_m,
            latitude=float(location.latitude),
            longitude=float(location.longitude),
            classification=location.classification,
            difficulty=location.difficulty
        ),
        current=current_conditions,
        periods=periods,
        alerts=alerts,
        metadata=metadata
    )
    
    # Cache the response
    try:
        redis_client.setex(
            cache_key_str,
            3600,  # 1 hour cache
            forecast.json()
        )
    except Exception as e:
        logger.warning(f"Failed to cache weather data: {e}")
    
    return forecast

@app.get("/api/v1/weather/compare", response_model=WeatherComparisonResponse)
async def compare_weather(
    locations: str = Query(..., description="Comma-separated location IDs (max 3)"),
    date: Optional[str] = Query(None, description="Date for comparison (YYYY-MM-DD)"),
    db: Session = Depends(get_db)
):
    """Compare weather between multiple locations"""
    
    location_ids = [loc.strip() for loc in locations.split(',')]
    
    if len(location_ids) > 3:
        raise HTTPException(
            status_code=400,
            detail="Maximum 3 locations can be compared"
        )
    
    if len(location_ids) < 2:
        raise HTTPException(
            status_code=400,
            detail="At least 2 locations required for comparison"
        )
    
    # Parse date if provided
    target_date = None
    if date:
        try:
            target_date = datetime.strptime(date, '%Y-%m-%d').date()
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Get locations and their weather data
    comparisons = []
    for i, location_id in enumerate(location_ids):
        location = db.query(Location).filter(Location.id == location_id).first()
        if not location:
            raise HTTPException(
                status_code=404,
                detail=f"Location '{location_id}' not found"
            )
        
        # Get latest weather data
        weather_query = db.query(WeatherData).filter(
            WeatherData.location_id == location_id
        )
        
        if target_date:
            weather_query = weather_query.filter(
                WeatherData.forecast_date == target_date
            )
        
        latest_weather = weather_query.order_by(
            WeatherData.timestamp.desc()
        ).first()
        
        # Create comparison entry
        conditions = None
        safety_score = None
        
        if latest_weather:
            conditions = WeatherConditions(
                temperature_c=float(latest_weather.temperature_c) if latest_weather.temperature_c else None,
                feels_like_c=float(latest_weather.feels_like_c) if latest_weather.feels_like_c else None,
                wind_speed_kph=latest_weather.wind_speed_kph,
                wind_direction=latest_weather.wind_direction,
                precipitation_mm=float(latest_weather.precipitation_mm) if latest_weather.precipitation_mm else None,
                precipitation_type=latest_weather.precipitation_type,
                visibility_km=float(latest_weather.visibility_km) if latest_weather.visibility_km else None
            )
            safety_score = latest_weather.hiking_score
        
        comparisons.append(LocationComparison(
            location=LocationInfo(
                id=location.id,
                name=location.name,
                area=location.area.name if location.area else None,
                elevation_m=location.elevation_m,
                latitude=float(location.latitude),
                longitude=float(location.longitude),
                classification=location.classification,
                difficulty=location.difficulty
            ),
            conditions=conditions,
            safety_score=safety_score,
            ranking=i + 1  # Will be updated after sorting
        ))
    
    # Sort by safety score (highest first)
    comparisons.sort(key=lambda x: x.safety_score or 0, reverse=True)
    
    # Update rankings
    for i, comparison in enumerate(comparisons):
        comparison.ranking = i + 1
    
    # Generate recommendation
    recommendation = None
    if comparisons:
        best = comparisons[0]
        if best.safety_score and best.safety_score >= 6:
            recommendation = {
                "best_location": best.location.id,
                "reason": f"Highest safety score ({best.safety_score}/10) with good conditions",
                "safety_score": best.safety_score
            }
    
    return WeatherComparisonResponse(
        comparison=comparisons,
        recommendation=recommendation
    )

# =============================================
# UTILITY FUNCTIONS
# =============================================

def create_weather_period(weather_data: WeatherData) -> WeatherPeriod:
    """Convert database weather data to API response format"""
    
    conditions = WeatherConditions(
        temperature_c=float(weather_data.temperature_c) if weather_data.temperature_c else None,
        feels_like_c=float(weather_data.feels_like_c) if weather_data.feels_like_c else None,
        wind_speed_kph=weather_data.wind_speed_kph,
        wind_direction=weather_data.wind_direction,
        wind_gust_kph=weather_data.wind_gust_kph,
        precipitation_mm=float(weather_data.precipitation_mm) if weather_data.precipitation_mm else None,
        precipitation_type=weather_data.precipitation_type,
        cloud_base_m=weather_data.cloud_base_m,
        visibility_km=float(weather_data.visibility_km) if weather_data.visibility_km else None,
        freezing_level_m=weather_data.freezing_level_m,
        humidity_percent=weather_data.humidity_percent,
        pressure_hpa=float(weather_data.pressure_hpa) if weather_data.pressure_hpa else None
    )
    
    # Calculate or use existing safety info
    hiking_score = weather_data.hiking_score
    if not hiking_score:
        hiking_score = calculate_hiking_score(conditions)
    
    hiking_suitability = weather_data.hiking_suitability
    if not hiking_suitability:
        hiking_suitability = determine_hiking_suitability(hiking_score)
    
    risk_factors = weather_data.risk_factors or generate_risk_factors(conditions)
    recommendations = generate_recommendations(conditions, hiking_score)
    
    safety = SafetyInfo(
        overall_score=hiking_score,
        hiking_suitability=hiking_suitability,
        risk_factors=risk_factors,
        recommendations=recommendations
    )
    
    period_id = f"{weather_data.forecast_date}_{weather_data.period_type}" if weather_data.forecast_date else str(weather_data.timestamp)
    
    return WeatherPeriod(
        period=period_id,
        start_time=weather_data.period_start or weather_data.timestamp,
        end_time=weather_data.period_end or weather_data.timestamp,
        period_type=weather_data.period_type or PeriodType.current,
        summary=weather_data.summary,
        icon=weather_data.icon,
        conditions=conditions,
        safety=safety
    )

# =============================================
# ERROR HANDLERS
# =============================================

@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "detail": "The requested resource was not found",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "detail": "An unexpected error occurred",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# =============================================
# STARTUP EVENTS
# =============================================

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting Scottish Mountain Weather API")
    
    # Initialize database connection
    try:
        # Test database connection
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        logger.info("Database connection established")
    except Exception as e:
        logger.error(f"Failed to connect to database: {e}")
        raise
    
    # Initialize Redis connection
    try:
        redis_client = get_redis()
        redis_client.ping()
        logger.info("Redis connection established")
    except Exception as e:
        logger.warning(f"Redis connection failed: {e}")
    
    # Initialize weather service
    try:
        await weather_service.initialize()
        logger.info("Weather service initialized")
    except Exception as e:
        logger.error(f"Failed to initialize weather service: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on shutdown"""
    logger.info("Shutting down Scottish Mountain Weather API")
    
    # Close weather service
    try:
        await weather_service.cleanup()
        logger.info("Weather service cleaned up")
    except Exception as e:
        logger.warning(f"Weather service cleanup failed: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)