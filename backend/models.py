"""
Data models for the Scottish Mountain Weather API
Building on the existing weather_scraper.py functionality
"""

from datetime import datetime, date
from decimal import Decimal
from typing import List, Optional, Dict, Any, Union
from enum import Enum

from pydantic import BaseModel, Field, validator, root_validator
from sqlalchemy import (
    Column, String, Integer, DECIMAL as SQLDecimal, DateTime, Boolean, 
    JSON, ARRAY, Text, BigInteger, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import TIMESTAMP
from sqlalchemy.orm import relationship
# from geoalchemy2 import Geometry  # Commented out - PostGIS not available
import uuid

Base = declarative_base()

# =============================================
# ENUMS
# =============================================

class ClassificationType(str, Enum):
    munro = "munro"
    corbett = "corbett"
    graham = "graham"
    hill = "hill"

class DifficultyLevel(str, Enum):
    easy = "easy"
    moderate = "moderate"
    challenging = "challenging"
    extreme = "extreme"

class PeriodType(str, Enum):
    current = "current"
    am = "am"
    pm = "pm"
    night = "night"
    daily = "daily"

class PrecipitationType(str, Enum):
    none = "none"
    rain = "rain"
    snow = "snow"
    sleet = "sleet"
    hail = "hail"

class HikingSuitability(str, Enum):
    excellent = "excellent"
    good = "good"
    moderate = "moderate"
    poor = "poor"
    dangerous = "dangerous"

class AlertSeverity(str, Enum):
    info = "info"
    warning = "warning"
    severe = "severe"
    extreme = "extreme"

class RiskTolerance(str, Enum):
    conservative = "conservative"
    moderate = "moderate"
    aggressive = "aggressive"

class ExperienceLevel(str, Enum):
    beginner = "beginner"
    intermediate = "intermediate"
    advanced = "advanced"
    expert = "expert"

# =============================================
# SQLALCHEMY ORM MODELS
# =============================================

class Area(Base):
    __tablename__ = "areas"
    __table_args__ = {"schema": "mountain_weather"}

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    region = Column(String(100), nullable=False)
    description = Column(Text)
    latitude_center = Column(SQLDecimal(10, 8), nullable=False)
    longitude_center = Column(SQLDecimal(11, 8), nullable=False)
    bounding_box = Column(JSON)
    access_info = Column(JSON)
    emergency_contacts = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    # Relationships
    locations = relationship("Location", back_populates="area")

class Location(Base):
    __tablename__ = "locations"
    __table_args__ = {"schema": "mountain_weather"}

    id = Column(String(100), primary_key=True)
    name = Column(String(200), nullable=False)
    area_id = Column(String(100), ForeignKey("mountain_weather.areas.id"))
    elevation_m = Column(Integer, nullable=False)
    latitude = Column(SQLDecimal(10, 8), nullable=False)
    longitude = Column(SQLDecimal(11, 8), nullable=False)
    # geom = Column(Geometry("POINT", srid=4326))  # Commented out - PostGIS not available
    classification = Column(String(50))
    difficulty = Column(String(50))
    description = Column(Text)
    
    # Route information
    route_distance_km = Column(SQLDecimal(6, 2))
    elevation_gain_m = Column(Integer)
    estimated_time_hours = Column(SQLDecimal(4, 2))
    difficulty_grade = Column(String(20))
    
    # Weather and safety
    weather_sources = Column(JSON)
    safety_info = Column(JSON)
    
    # Search and popularity
    popularity_score = Column(Integer, default=0)
    
    # Metadata
    location_metadata = Column(JSON)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    # Relationships
    area = relationship("Area", back_populates="locations")
    weather_data = relationship("WeatherData", back_populates="location")

class WeatherSource(Base):
    __tablename__ = "weather_sources"
    __table_args__ = {"schema": "mountain_weather"}

    id = Column(String(50), primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    base_url = Column(String(500))
    api_key_required = Column(Boolean, default=False)
    rate_limit_per_hour = Column(Integer)
    reliability_score = Column(SQLDecimal(3, 2))
    update_frequency_hours = Column(Integer, default=4)
    data_format = Column(String(20))
    is_active = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

class WeatherData(Base):
    __tablename__ = "weather_data"
    __table_args__ = {"schema": "mountain_weather"}

    id = Column(BigInteger, primary_key=True)
    location_id = Column(String(100), ForeignKey("mountain_weather.locations.id"), nullable=False)
    source_id = Column(String(50), ForeignKey("mountain_weather.weather_sources.id"), nullable=False)
    timestamp = Column(TIMESTAMP(timezone=True), nullable=False)
    
    # Forecast period
    period_start = Column(TIMESTAMP(timezone=True))
    period_end = Column(TIMESTAMP(timezone=True))
    period_type = Column(String(20))
    forecast_date = Column(Date)
    
    # Core weather data
    temperature_c = Column(SQLDecimal(4, 1))
    feels_like_c = Column(SQLDecimal(4, 1))
    wind_speed_kph = Column(Integer)
    wind_direction = Column(String(3))
    wind_gust_kph = Column(Integer)
    precipitation_mm = Column(SQLDecimal(5, 2))
    precipitation_type = Column(String(20))
    cloud_base_m = Column(Integer)
    visibility_km = Column(SQLDecimal(4, 1))
    freezing_level_m = Column(Integer)
    humidity_percent = Column(Integer)
    pressure_hpa = Column(SQLDecimal(6, 1))
    
    # Derived fields
    hiking_score = Column(Integer)
    hiking_suitability = Column(String(20))
    risk_factors = Column(ARRAY(Text))
    
    # Summary
    summary = Column(String(200))
    icon = Column(String(50))
    
    # Data quality
    confidence = Column(String(20))
    raw_data = Column(JSON)
    processing_notes = Column(Text)
    
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

    # Relationships
    location = relationship("Location", back_populates="weather_data")

class UserPreferences(Base):
    __tablename__ = "user_preferences"
    __table_args__ = {"schema": "mountain_weather"}

    user_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    units = Column(JSON, default={"temperature": "celsius", "wind_speed": "kph", "precipitation": "mm", "distance": "km"})
    risk_tolerance = Column(String(20), default="moderate")
    experience_level = Column(String(20), default="intermediate")
    notifications = Column(JSON, default={"weather_alerts": True, "severe_weather": True, "favorites_updates": False})
    theme = Column(String(20), default="auto")
    default_view = Column(String(20), default="forecast")
    location_sharing = Column(Boolean, default=False)
    analytics_opt_in = Column(Boolean, default=True)
    created_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    updated_at = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)
    last_seen = Column(TIMESTAMP(timezone=True), default=datetime.utcnow)

# =============================================
# PYDANTIC RESPONSE MODELS
# =============================================

class WeatherConditions(BaseModel):
    """Core weather conditions data"""
    temperature_c: Optional[float] = Field(None, description="Temperature in Celsius")
    feels_like_c: Optional[float] = Field(None, description="Feels like temperature with wind chill")
    wind_speed_kph: Optional[int] = Field(None, description="Wind speed in km/h")
    wind_direction: Optional[str] = Field(None, description="Wind direction (N, NE, E, etc.)")
    wind_gust_kph: Optional[int] = Field(None, description="Wind gust speed in km/h")
    precipitation_mm: Optional[float] = Field(None, description="Precipitation amount in mm")
    precipitation_type: Optional[PrecipitationType] = Field(None, description="Type of precipitation")
    cloud_base_m: Optional[int] = Field(None, description="Cloud base height in meters")
    visibility_km: Optional[float] = Field(None, description="Visibility in kilometers")
    freezing_level_m: Optional[int] = Field(None, description="Freezing level in meters")
    humidity_percent: Optional[int] = Field(None, description="Relative humidity percentage")
    pressure_hpa: Optional[float] = Field(None, description="Atmospheric pressure in hPa")

    @validator('wind_speed_kph')
    def validate_wind_speed(cls, v):
        if v is not None and (v < 0 or v > 300):
            raise ValueError('Wind speed must be between 0 and 300 km/h')
        return v

    @validator('temperature_c')
    def validate_temperature(cls, v):
        if v is not None and (v < -50 or v > 50):
            raise ValueError('Temperature must be between -50 and 50 Celsius')
        return v

class SafetyInfo(BaseModel):
    """Safety assessment and recommendations"""
    overall_score: Optional[int] = Field(None, ge=1, le=10, description="Overall safety score 1-10")
    hiking_suitability: Optional[HikingSuitability] = Field(None, description="Hiking suitability level")
    risk_factors: List[str] = Field(default=[], description="List of risk factors")
    recommendations: List[str] = Field(default=[], description="Safety recommendations")

class WeatherPeriod(BaseModel):
    """Weather data for a specific time period"""
    period: str = Field(..., description="Period identifier (e.g., '2025-06-14_AM')")
    start_time: datetime = Field(..., description="Period start time")
    end_time: datetime = Field(..., description="Period end time")
    period_type: PeriodType = Field(..., description="Type of period")
    summary: Optional[str] = Field(None, description="Weather summary")
    icon: Optional[str] = Field(None, description="Weather icon identifier")
    conditions: WeatherConditions
    safety: Optional[SafetyInfo] = None

class LocationInfo(BaseModel):
    """Basic location information"""
    id: str = Field(..., description="Location identifier")
    name: str = Field(..., description="Location name")
    area: Optional[str] = Field(None, description="Area name")
    elevation_m: int = Field(..., description="Elevation in meters")
    latitude: float = Field(..., description="Latitude")
    longitude: float = Field(..., description="Longitude")
    classification: Optional[ClassificationType] = Field(None, description="Mountain classification")
    difficulty: Optional[DifficultyLevel] = Field(None, description="Difficulty level")

class LocationDetail(LocationInfo):
    """Detailed location information"""
    description: Optional[str] = None
    route_distance_km: Optional[float] = None
    elevation_gain_m: Optional[int] = None
    estimated_time_hours: Optional[float] = None
    difficulty_grade: Optional[str] = None
    weather_sources: Optional[List[Dict[str, Any]]] = None
    safety_info: Optional[Dict[str, Any]] = None
    emergency_contacts: Optional[List[Dict[str, Any]]] = None

class WeatherAlert(BaseModel):
    """Weather alert information"""
    id: str = Field(..., description="Alert identifier")
    alert_type: str = Field(..., description="Type of alert")
    severity: AlertSeverity = Field(..., description="Alert severity level")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    start_time: datetime = Field(..., description="Alert start time")
    end_time: Optional[datetime] = Field(None, description="Alert end time")
    recommendations: List[str] = Field(default=[], description="Recommended actions")
    affected_activities: List[str] = Field(default=[], description="Affected activities")

class WeatherMetadata(BaseModel):
    """Weather forecast metadata"""
    last_updated: datetime = Field(..., description="When forecast was last updated")
    sources: List[str] = Field(..., description="Data sources used")
    confidence: Optional[str] = Field(None, description="Forecast confidence level")
    next_update: Optional[datetime] = Field(None, description="Next scheduled update")

class WeatherForecast(BaseModel):
    """Complete weather forecast response"""
    location: LocationInfo
    current: Optional[WeatherPeriod] = Field(None, description="Current conditions")
    periods: List[WeatherPeriod] = Field(default=[], description="Forecast periods")
    alerts: List[WeatherAlert] = Field(default=[], description="Active weather alerts")
    metadata: WeatherMetadata

class LocationSearchResult(BaseModel):
    """Location search result"""
    locations: List[LocationInfo]
    total: int = Field(..., description="Total number of results")
    query_time_ms: Optional[int] = Field(None, description="Query execution time")

class LocationComparison(BaseModel):
    """Weather comparison between locations"""
    location: LocationInfo
    conditions: Optional[WeatherConditions] = None
    safety_score: Optional[int] = None
    ranking: Optional[int] = Field(None, description="Ranking among compared locations")
    distance_km: Optional[float] = Field(None, description="Distance from reference point")
    driving_time_minutes: Optional[int] = Field(None, description="Estimated driving time")

class WeatherComparisonResponse(BaseModel):
    """Response for weather comparison"""
    comparison: List[LocationComparison]
    recommendation: Optional[Dict[str, Any]] = Field(None, description="Best location recommendation")
    generated_at: datetime = Field(default_factory=datetime.utcnow)

# =============================================
# REQUEST MODELS
# =============================================

class LocationSearchRequest(BaseModel):
    """Location search parameters"""
    q: Optional[str] = Field(None, description="Search query")
    area: Optional[str] = Field(None, description="Filter by area")
    classification: Optional[ClassificationType] = Field(None, description="Filter by classification")
    difficulty: Optional[DifficultyLevel] = Field(None, description="Filter by difficulty")
    lat: Optional[float] = Field(None, description="Latitude for proximity search")
    lng: Optional[float] = Field(None, description="Longitude for proximity search")
    radius_km: Optional[int] = Field(50, description="Search radius in kilometers")
    limit: Optional[int] = Field(20, description="Maximum results to return")

class WeatherRequest(BaseModel):
    """Weather data request parameters"""
    hours: Optional[int] = Field(72, description="Forecast hours ahead")
    include: Optional[str] = Field("current,periods,alerts", description="Data to include")
    source: Optional[str] = Field(None, description="Preferred weather source")

class UserPreferencesRequest(BaseModel):
    """User preferences update request"""
    units: Optional[Dict[str, str]] = None
    risk_tolerance: Optional[RiskTolerance] = None
    experience_level: Optional[ExperienceLevel] = None
    notifications: Optional[Dict[str, bool]] = None
    theme: Optional[str] = None
    default_view: Optional[str] = None

class FavoriteLocationRequest(BaseModel):
    """Add favorite location request"""
    location_id: str = Field(..., description="Location ID to add to favorites")
    nickname: Optional[str] = Field(None, description="Custom nickname for location")
    notes: Optional[str] = Field(None, description="Personal notes about location")

# =============================================
# UTILITY FUNCTIONS
# =============================================

def calculate_hiking_score(conditions: WeatherConditions) -> int:
    """
    Calculate hiking suitability score based on weather conditions
    Enhanced version of existing algorithm from weather_scraper.py
    """
    if not conditions:
        return 5  # Default neutral score
    
    score = 10  # Start with perfect score
    
    # Wind penalty (major factor)
    if conditions.wind_speed_kph:
        if conditions.wind_speed_kph > 50:
            score -= 5  # Dangerous winds
        elif conditions.wind_speed_kph > 35:
            score -= 3  # High winds
        elif conditions.wind_speed_kph > 25:
            score -= 1  # Moderate winds
    
    # Temperature penalty
    if conditions.feels_like_c:
        if conditions.feels_like_c < -10:
            score -= 3  # Very cold
        elif conditions.feels_like_c < 0:
            score -= 1  # Cold
        elif conditions.feels_like_c > 30:
            score -= 1  # Very hot
    
    # Precipitation penalty
    if conditions.precipitation_mm:
        if conditions.precipitation_mm > 10:
            score -= 4  # Heavy precipitation
        elif conditions.precipitation_mm > 5:
            score -= 2  # Moderate precipitation
        elif conditions.precipitation_mm > 1:
            score -= 1  # Light precipitation
    
    # Visibility penalty
    if conditions.visibility_km:
        if conditions.visibility_km < 1:
            score -= 3  # Very poor visibility
        elif conditions.visibility_km < 2:
            score -= 2  # Poor visibility
        elif conditions.visibility_km < 5:
            score -= 1  # Moderate visibility
    
    # Ensure score stays within bounds
    return max(1, min(10, score))

def determine_hiking_suitability(score: int) -> HikingSuitability:
    """Convert hiking score to suitability level"""
    if score >= 8:
        return HikingSuitability.excellent
    elif score >= 6:
        return HikingSuitability.good
    elif score >= 4:
        return HikingSuitability.moderate
    elif score >= 2:
        return HikingSuitability.poor
    else:
        return HikingSuitability.dangerous

def generate_risk_factors(conditions: WeatherConditions) -> List[str]:
    """Generate list of risk factors based on conditions"""
    factors = []
    
    if conditions.wind_speed_kph and conditions.wind_speed_kph > 35:
        factors.append("high_wind")
    
    if conditions.precipitation_mm and conditions.precipitation_mm > 5:
        factors.append("heavy_precipitation")
    
    if conditions.visibility_km and conditions.visibility_km < 2:
        factors.append("poor_visibility")
    
    if conditions.feels_like_c and conditions.feels_like_c < -5:
        factors.append("extreme_cold")
    
    if conditions.precipitation_type == PrecipitationType.snow:
        factors.append("snow_conditions")
    
    return factors

def generate_recommendations(conditions: WeatherConditions, score: int) -> List[str]:
    """Generate safety recommendations based on conditions"""
    recommendations = []
    
    if score <= 3:
        recommendations.append("Consider postponing trip due to dangerous conditions")
    
    if conditions.wind_speed_kph and conditions.wind_speed_kph > 40:
        recommendations.append("Avoid exposed ridges and summits")
    
    if conditions.precipitation_mm and conditions.precipitation_mm > 2:
        recommendations.append("Carry full waterproof gear")
    
    if conditions.visibility_km and conditions.visibility_km < 3:
        recommendations.append("Navigation equipment essential")
    
    if conditions.feels_like_c and conditions.feels_like_c < 0:
        recommendations.append("Warm layers and emergency shelter required")
    
    if not recommendations and score >= 7:
        recommendations.append("Good conditions for mountain activities")
    
    return recommendations

# =============================================
# CONFIGURATION
# =============================================

class Settings(BaseModel):
    """Application settings"""
    database_url: str = "postgresql://user:password@localhost/mountain_weather"
    redis_url: str = "redis://localhost:6379"
    api_title: str = "Scottish Mountain Weather API"
    api_version: str = "1.0.0"
    api_description: str = "Weather forecasting API for Scottish mountains"
    
    # Weather update settings
    weather_update_interval_hours: int = 4
    weather_data_retention_days: int = 730  # 2 years
    
    # API rate limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    
    # Cache settings
    cache_weather_data_minutes: int = 240  # 4 hours
    cache_location_data_minutes: int = 1440  # 24 hours
    
    class Config:
        env_file = ".env"