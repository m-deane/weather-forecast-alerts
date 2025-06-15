"""Simplified models that match our database schema exactly"""
from datetime import datetime
from decimal import Decimal
from typing import Optional, Dict, Any
from sqlalchemy import (
    Column, Integer, String, DECIMAL, DateTime, Boolean,
    JSON, Text, Date, ForeignKey, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

Base = declarative_base()

class WeatherSource(Base):
    __tablename__ = 'weather_sources'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    base_url = Column(Text)
    api_type = Column(String(50), nullable=False, default='scraper')
    is_active = Column(Boolean, default=True)
    priority = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Area(Base):
    __tablename__ = 'areas'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False, unique=True)
    description = Column(Text)
    bounds = Column(JSON)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    locations = relationship("Location", back_populates="area")

class Location(Base):
    __tablename__ = 'locations'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(200), nullable=False)
    area_id = Column(Integer, ForeignKey('areas.id'))
    latitude = Column(DECIMAL(10, 8), nullable=False)
    longitude = Column(DECIMAL(11, 8), nullable=False)
    elevation_m = Column(Integer, nullable=False)
    classification = Column(String(50))
    difficulty = Column(String(50))
    is_active = Column(Boolean, default=True)
    
    # Additional fields
    description = Column(Text)
    route_distance_km = Column(DECIMAL(6, 2))
    elevation_gain_m = Column(Integer)
    estimated_time_hours = Column(DECIMAL(4, 2))
    difficulty_grade = Column(String(20))
    weather_sources = Column(JSON)
    safety_info = Column(JSON)
    popularity_score = Column(Integer, default=0)
    location_metadata = Column(JSON)
    
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    area = relationship("Area", back_populates="locations")
    weather_data = relationship("WeatherData", back_populates="location")
    
    __table_args__ = (
        UniqueConstraint('name', 'area_id', name='_location_area_uc'),
    )

class WeatherData(Base):
    __tablename__ = 'weather_data'
    
    id = Column(Integer, primary_key=True)
    location_id = Column(Integer, ForeignKey('locations.id'), nullable=False)
    source_id = Column(Integer, ForeignKey('weather_sources.id'), nullable=False)
    forecast_date = Column(Date, nullable=False)
    period_type = Column(String(20), nullable=False)
    period_index = Column(Integer, nullable=False, default=0)
    
    # Weather conditions
    temperature_c = Column(DECIMAL(5, 2))
    feels_like_c = Column(DECIMAL(5, 2))
    wind_speed_kmh = Column(DECIMAL(6, 2))
    wind_direction = Column(String(10))
    wind_gust_kmh = Column(DECIMAL(6, 2))
    precipitation_mm = Column(DECIMAL(6, 2))
    precipitation_type = Column(String(20))
    humidity_percent = Column(Integer)
    pressure_mb = Column(DECIMAL(6, 1))
    visibility_km = Column(DECIMAL(5, 1))
    cloud_cover_percent = Column(Integer)
    cloud_base_m = Column(Integer)
    freezing_level_m = Column(Integer)
    
    # Mountain-specific
    summit_conditions = Column(Text)
    valley_conditions = Column(Text)
    snow_level_m = Column(Integer)
    avalanche_risk = Column(Integer)
    
    # Calculated scores
    hiking_score = Column(DECIMAL(3, 1))
    photography_score = Column(DECIMAL(3, 1))
    
    # Raw data
    raw_data = Column(JSON)
    
    # Timestamps
    forecast_created_at = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    
    # Relationships
    location = relationship("Location", back_populates="weather_data")
    source = relationship("WeatherSource")
    
    __table_args__ = (
        UniqueConstraint(
            'location_id', 'source_id', 'forecast_date', 
            'period_type', 'period_index',
            name='_weather_data_unique'
        ),
    )