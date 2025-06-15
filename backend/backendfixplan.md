# Backend Fix Plan - Scottish Mountain Weather App

## Executive Summary

This plan outlines the steps needed to fix the backend infrastructure and enable the full PostgreSQL database with all historical weather data. The goal is to transition from the mock API (21 mountains) to a production-ready API backed by PostgreSQL with proper data migration from 342 historical forecast files.

## Current State

### What's Working
- PostgreSQL 16 installed and running
- Database `mountain_weather` created with user `mountain_weather_user`
- Basic schema deployed (without TimescaleDB/PostGIS)
- Mock API running with 21 mountains
- Frontend fully functional with all Phase 4 features

### Issues to Fix
1. **Schema Mismatch**: models.py has more fields than the deployed schema
2. **Missing Extensions**: TimescaleDB and PostGIS not properly configured
3. **Python Dependencies**: Several packages need proper installation
4. **Import Path Issues**: Backend modules using incorrect import paths
5. **Data Migration**: Script fails due to schema mismatches

## Phase 1: Dependency Resolution (2-3 hours)

### 1.1 Create Virtual Environment
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
```

### 1.2 Fix requirements.txt
Create a working requirements.txt with version pins:
```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
sqlalchemy==2.0.23
psycopg2-binary==2.9.9
alembic==1.13.1
redis==5.0.1
httpx==0.25.2
python-multipart==0.0.6
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
pytest==7.4.3
pytest-asyncio==0.21.1
python-dotenv==1.0.0
schedule==1.2.0
```

### 1.3 Install Dependencies
```bash
pip install -r requirements.txt
```

## Phase 2: Schema Alignment (3-4 hours)

### 2.1 Create Alembic Migration System
```bash
alembic init alembic
```

### 2.2 Create Comprehensive Schema
Create `backend/database/schema_full.sql`:
```sql
-- Scottish Mountain Weather App Database Schema
-- PostgreSQL 16+ with optional extensions

-- Enable extensions (skip if not available)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS postgis;  -- Optional
-- CREATE EXTENSION IF NOT EXISTS timescaledb;  -- Optional

-- Use default schema to avoid conflicts
-- CREATE SCHEMA IF NOT EXISTS mountain_weather;
-- SET search_path TO mountain_weather, public;

-- Weather sources table
CREATE TABLE IF NOT EXISTS weather_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_url TEXT,
    api_type VARCHAR(50) NOT NULL DEFAULT 'scraper',
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Areas table
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    bounds JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table with all fields from models.py
CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    elevation_m INTEGER NOT NULL,
    classification VARCHAR(50),
    difficulty VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    
    -- Additional fields from models.py
    description TEXT,
    route_distance_km DECIMAL(6,2),
    elevation_gain_m INTEGER,
    estimated_time_hours DECIMAL(4,2),
    difficulty_grade VARCHAR(20),
    weather_sources JSONB,
    safety_info JSONB,
    popularity_score INTEGER DEFAULT 0,
    location_metadata JSONB,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(name, area_id)
);

-- Weather data table
CREATE TABLE IF NOT EXISTS weather_data (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    source_id INTEGER NOT NULL REFERENCES weather_sources(id),
    forecast_date DATE NOT NULL,
    period_type VARCHAR(20) NOT NULL,
    period_index INTEGER NOT NULL DEFAULT 0,
    
    -- Weather conditions
    temperature_c DECIMAL(5,2),
    feels_like_c DECIMAL(5,2),
    wind_speed_kmh DECIMAL(6,2),
    wind_direction VARCHAR(10),
    wind_gust_kmh DECIMAL(6,2),
    precipitation_mm DECIMAL(6,2),
    precipitation_type VARCHAR(20),
    humidity_percent INTEGER,
    pressure_mb DECIMAL(6,1),
    visibility_km DECIMAL(5,1),
    cloud_cover_percent INTEGER,
    cloud_base_m INTEGER,
    freezing_level_m INTEGER,
    
    -- Mountain-specific
    summit_conditions TEXT,
    valley_conditions TEXT,
    snow_level_m INTEGER,
    avalanche_risk INTEGER,
    
    -- Calculated scores
    hiking_score DECIMAL(3,1),
    photography_score DECIMAL(3,1),
    
    -- Raw data storage
    raw_data JSONB,
    
    -- Timestamps
    forecast_created_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique forecasts
    UNIQUE(location_id, source_id, forecast_date, period_type, period_index)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_weather_data_location_date 
    ON weather_data(location_id, forecast_date);
CREATE INDEX IF NOT EXISTS idx_weather_data_forecast_date 
    ON weather_data(forecast_date);
CREATE INDEX IF NOT EXISTS idx_weather_data_created_at 
    ON weather_data(created_at);
CREATE INDEX IF NOT EXISTS idx_locations_area 
    ON locations(area_id);
CREATE INDEX IF NOT EXISTS idx_locations_active 
    ON locations(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_locations_name 
    ON locations(name);
CREATE INDEX IF NOT EXISTS idx_weather_data_period 
    ON weather_data(period_type, period_index);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
DROP TRIGGER IF EXISTS update_weather_sources_updated_at ON weather_sources;
CREATE TRIGGER update_weather_sources_updated_at 
    BEFORE UPDATE ON weather_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_areas_updated_at ON areas;
CREATE TRIGGER update_areas_updated_at 
    BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at 
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_weather_data_updated_at ON weather_data;
CREATE TRIGGER update_weather_data_updated_at 
    BEFORE UPDATE ON weather_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 2.3 Update Database Configuration
Create `backend/config.py`:
```python
from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    # Database
    database_url: str = "postgresql://mountain_weather_user@localhost:5432/mountain_weather"
    database_pool_size: int = 20
    database_max_overflow: int = 40
    
    # Redis (optional)
    redis_url: str = "redis://localhost:6379"
    use_redis_cache: bool = False  # Disable if Redis not available
    
    # API Settings
    api_title: str = "Scottish Mountain Weather API"
    api_version: str = "1.0.0"
    cors_origins: list = ["http://localhost:3000", "http://localhost:3001"]
    
    # Features
    enable_timescaledb: bool = False  # Set to True if TimescaleDB installed
    enable_postgis: bool = False      # Set to True if PostGIS installed
    
    class Config:
        env_file = ".env"

@lru_cache()
def get_settings():
    return Settings()
```

## Phase 3: Fix Models and Database Layer (4-5 hours)

### 3.1 Create Simplified Models
Create `backend/models_simple.py`:
```python
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
```

### 3.2 Fix Database Connection
Update `backend/database.py`:
```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
from config import get_settings

settings = get_settings()

# Create engine with proper configuration
engine = create_engine(
    settings.database_url,
    poolclass=NullPool,  # Use NullPool for development
    echo=False,  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Phase 4: Create Working Data Migration (3-4 hours)

### 4.1 Create Simple Migration Script
Create `backend/data_migration_simple.py`:
```python
"""Simple data migration script that handles schema properly"""
import os
import sys
import json
import logging
from datetime import datetime, date
from pathlib import Path
from decimal import Decimal

# Setup path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy.orm import Session
from database import engine, get_db
from models_simple import Base, Location, Area, WeatherSource, WeatherData

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SimpleDataMigration:
    def __init__(self):
        self.location_metadata = {
            # Torridon
            "Beinn Eighe": {"area": "Torridon", "elevation": 1010, "lat": 57.5883, "lon": -5.3533},
            "Liathach": {"area": "Torridon", "elevation": 1055, "lat": 57.5639, "lon": -5.4639},
            "Beinn Alligin": {"area": "Torridon", "elevation": 986, "lat": 57.5961, "lon": -5.5711},
            "Beinn Dearg": {"area": "Torridon", "elevation": 914, "lat": 57.6975, "lon": -5.4542},
            "Beinn Damh": {"area": "Torridon", "elevation": 902, "lat": 57.5283, "lon": -5.5550},
            "Slioch": {"area": "Torridon", "elevation": 981, "lat": 57.6667, "lon": -5.3500},
            
            # Glencoe
            "Bidean nam Bian": {"area": "Glencoe", "elevation": 1150, "lat": 56.6433, "lon": -5.0283},
            "Ben Starav": {"area": "Glencoe", "elevation": 1078, "lat": 56.5608, "lon": -4.9783},
            "Buachaille Etive Mor": {"area": "Glencoe", "elevation": 1022, "lat": 56.6483, "lon": -4.8950},
            "Aonach Eagach": {"area": "Glencoe", "elevation": 967, "lat": 56.6839, "lon": -5.0339},
            
            # Coigach
            "Stac Pollaidh": {"area": "Coigach", "elevation": 612, "lat": 58.0433, "lon": -5.3517},
            "Suilven": {"area": "Coigach", "elevation": 731, "lat": 58.1192, "lon": -5.1433},
            "Cul Beag": {"area": "Coigach", "elevation": 769, "lat": 58.0942, "lon": -5.0942},
            
            # Skye
            "Bla Bheinn": {"area": "Skye", "elevation": 928, "lat": 57.2194, "lon": -6.0917},
            "Sgurr Alasdair": {"area": "Skye", "elevation": 992, "lat": 57.2075, "lon": -6.2239},
            
            # Knoydart
            "Ladhar Bheinn": {"area": "Knoydart", "elevation": 1020, "lat": 57.0672, "lon": -5.5989},
            "Beinn na Caillich": {"area": "Knoydart", "elevation": 785, "lat": 57.0500, "lon": -5.6333},
            
            # Cairngorms
            "Ben Macdui": {"area": "Cairngorms", "elevation": 1309, "lat": 57.0704, "lon": -3.6689},
            "Cairn Gorm": {"area": "Cairngorms", "elevation": 1245, "lat": 57.1167, "lon": -3.6450},
            "Braeriach": {"area": "Cairngorms", "elevation": 1296, "lat": 57.0783, "lon": -3.7283},
        }
        
        self.area_cache = {}
        self.source_cache = {}
        self.location_cache = {}
        
    def run_migration(self):
        """Run the migration process"""
        # Create all tables
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        
        # Process forecast files
        forecast_dir = Path("../forecasts")
        if not forecast_dir.exists():
            logger.error(f"Forecast directory not found: {forecast_dir}")
            return
            
        json_files = list(forecast_dir.rglob("*.json"))
        logger.info(f"Found {len(json_files)} JSON files to process")
        
        processed = 0
        errors = 0
        
        with Session(engine) as db:
            for i, json_file in enumerate(json_files):
                if i % 10 == 0:
                    logger.info(f"Progress: {i}/{len(json_files)} files processed")
                    
                try:
                    self.process_forecast_file(db, json_file)
                    processed += 1
                    
                    # Commit every 50 files
                    if processed % 50 == 0:
                        db.commit()
                        
                except Exception as e:
                    errors += 1
                    logger.error(f"Error processing {json_file}: {str(e)}")
                    db.rollback()
                    
            # Final commit
            db.commit()
            
        logger.info(f"Migration completed: {processed} files processed, {errors} errors")
        
    def process_forecast_file(self, db: Session, json_file: Path):
        """Process a single forecast file"""
        with open(json_file, 'r') as f:
            data = json.load(f)
            
        # Extract location info
        location_name = self.extract_location_name(data.get('location', ''))
        if not location_name:
            return
            
        # Get or create location
        location = self.get_or_create_location(db, location_name)
        if not location:
            return
            
        # Get or create source
        source = self.get_or_create_source(db, {
            'name': 'mountain-forecast.com',
            'url': 'https://mountain-forecast.com'
        })
        
        # Process forecast data
        forecast_data = data.get('forecast', {})
        for day_key, day_data in forecast_data.items():
            if not day_key.startswith('day'):
                continue
                
            forecast_date = self.parse_date(day_data.get('date'))
            if not forecast_date:
                continue
                
            # Process each period (AM, PM, Night)
            for period, period_data in day_data.items():
                if period not in ['AM', 'PM', 'night']:
                    continue
                    
                self.create_weather_data(
                    db, location, source, 
                    forecast_date, period, period_data
                )
                
    def extract_location_name(self, location_str: str) -> str:
        """Extract clean location name"""
        import re
        # Remove (Averaged), (Proxy) suffixes
        name = re.sub(r'\s*\(.*?\)\s*$', '', location_str)
        return name.strip()
        
    def get_or_create_area(self, db: Session, area_name: str) -> Area:
        """Get or create area"""
        if area_name in self.area_cache:
            return self.area_cache[area_name]
            
        area = db.query(Area).filter_by(name=area_name).first()
        if not area:
            area = Area(name=area_name, description=f"{area_name} mountain region")
            db.add(area)
            db.flush()
            
        self.area_cache[area_name] = area
        return area
        
    def get_or_create_source(self, db: Session, source_info: dict) -> WeatherSource:
        """Get or create weather source"""
        source_name = source_info.get('name', 'mountain-forecast.com')
        
        if source_name in self.source_cache:
            return self.source_cache[source_name]
            
        source = db.query(WeatherSource).filter_by(name=source_name).first()
        if not source:
            source = WeatherSource(
                name=source_name,
                base_url=source_info.get('url', f"https://{source_name}"),
                api_type="scraper",
                is_active=True,
                priority=1
            )
            db.add(source)
            db.flush()
            
        self.source_cache[source_name] = source
        return source
        
    def get_or_create_location(self, db: Session, location_name: str) -> Optional[Location]:
        """Get or create location"""
        if location_name in self.location_cache:
            return self.location_cache[location_name]
            
        location = db.query(Location).filter_by(name=location_name).first()
        if not location:
            # Get metadata
            metadata = self.location_metadata.get(location_name)
            if not metadata:
                logger.warning(f"No metadata for location: {location_name}")
                return None
                
            area = self.get_or_create_area(db, metadata['area'])
            
            location = Location(
                name=location_name,
                area_id=area.id,
                latitude=Decimal(str(metadata['lat'])),
                longitude=Decimal(str(metadata['lon'])),
                elevation_m=metadata['elevation'],
                classification='munro' if metadata['elevation'] > 914 else 'corbett',
                difficulty='moderate',
                is_active=True
            )
            db.add(location)
            db.flush()
            
        self.location_cache[location_name] = location
        return location
        
    def parse_date(self, date_str: str) -> Optional[date]:
        """Parse date string"""
        if not date_str:
            return None
            
        try:
            # Handle different date formats
            for fmt in ['%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y']:
                try:
                    return datetime.strptime(date_str, fmt).date()
                except ValueError:
                    continue
            return None
        except Exception:
            return None
            
    def create_weather_data(self, db: Session, location: Location, 
                           source: WeatherSource, forecast_date: date,
                           period: str, data: dict):
        """Create weather data entry"""
        # Map period names
        period_map = {
            'AM': 'morning',
            'PM': 'afternoon', 
            'night': 'night'
        }
        period_type = period_map.get(period, period.lower())
        
        # Check if already exists
        existing = db.query(WeatherData).filter_by(
            location_id=location.id,
            source_id=source.id,
            forecast_date=forecast_date,
            period_type=period_type,
            period_index=0
        ).first()
        
        if existing:
            return
            
        # Extract weather data
        weather_data = WeatherData(
            location_id=location.id,
            source_id=source.id,
            forecast_date=forecast_date,
            period_type=period_type,
            period_index=0,
            
            # Temperature
            temperature_c=self.extract_number(data.get('temp', {}).get('value')),
            feels_like_c=self.extract_number(data.get('chill', {}).get('value')),
            
            # Wind
            wind_speed_kmh=self.extract_number(data.get('wind', {}).get('value')),
            wind_direction=data.get('wind', {}).get('direction'),
            
            # Precipitation
            precipitation_mm=self.extract_number(data.get('rain', {}).get('value', 0)) +
                           self.extract_number(data.get('snow', {}).get('value', 0)),
            precipitation_type='snow' if data.get('snow', {}).get('value') else 'rain',
            
            # Other conditions
            humidity_percent=self.extract_number(data.get('humidity', {}).get('value')),
            cloud_base_m=self.extract_number(data.get('cloud_base', {}).get('value')),
            freezing_level_m=self.extract_number(data.get('freezing_level', {}).get('value')),
            
            # Conditions
            summit_conditions=data.get('weather', {}).get('value', ''),
            
            # Calculate hiking score (simple version)
            hiking_score=self.calculate_simple_hiking_score(data),
            
            # Store raw data
            raw_data=data
        )
        
        db.add(weather_data)
        
    def extract_number(self, value) -> Optional[Decimal]:
        """Extract number from various formats"""
        if value is None:
            return None
            
        if isinstance(value, (int, float)):
            return Decimal(str(value))
            
        if isinstance(value, str):
            # Remove units and extract number
            import re
            match = re.search(r'[-+]?\d*\.?\d+', value)
            if match:
                return Decimal(match.group())
                
        return None
        
    def calculate_simple_hiking_score(self, data: dict) -> Decimal:
        """Calculate simple hiking score"""
        score = 10.0
        
        # Wind penalty
        wind = self.extract_number(data.get('wind', {}).get('value'))
        if wind:
            if wind > 80:
                score -= 4
            elif wind > 60:
                score -= 3
            elif wind > 40:
                score -= 2
            elif wind > 20:
                score -= 1
                
        # Rain/snow penalty
        rain = self.extract_number(data.get('rain', {}).get('value', 0))
        snow = self.extract_number(data.get('snow', {}).get('value', 0))
        precip = (rain or 0) + (snow or 0)
        
        if precip > 10:
            score -= 3
        elif precip > 5:
            score -= 2
        elif precip > 0:
            score -= 1
            
        # Temperature penalty
        temp = self.extract_number(data.get('temp', {}).get('value'))
        if temp:
            if temp < -5 or temp > 25:
                score -= 2
            elif temp < 0 or temp > 20:
                score -= 1
                
        return Decimal(str(max(1, min(10, score))))

if __name__ == "__main__":
    migration = SimpleDataMigration()
    migration.run_migration()
```

## Phase 5: Create Simplified API (2-3 hours)

### 5.1 Create Simple API
Create `backend/api_simple.py`:
```python
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
    
    if q:
        query = query.filter(Location.name.ilike(f"%{q}%"))
        
    if area:
        query = query.join(Area).filter(Area.name == area)
        
    total = query.count()
    locations = query.offset(skip).limit(limit).all()
    
    return {
        "locations": [
            {
                "id": loc.id,
                "name": loc.name,
                "area": loc.area.name if loc.area else None,
                "latitude": float(loc.latitude),
                "longitude": float(loc.longitude),
                "elevation_m": loc.elevation_m,
                "classification": loc.classification,
                "difficulty": loc.difficulty
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
            
        daily_forecasts[date_key]["periods"].append({
            "period": wd.period_type,
            "temperature_c": float(wd.temperature_c) if wd.temperature_c else None,
            "feels_like_c": float(wd.feels_like_c) if wd.feels_like_c else None,
            "wind_speed_kmh": float(wd.wind_speed_kmh) if wd.wind_speed_kmh else None,
            "wind_direction": wd.wind_direction,
            "precipitation_mm": float(wd.precipitation_mm) if wd.precipitation_mm else 0,
            "conditions": wd.summit_conditions,
            "hiking_score": float(wd.hiking_score) if wd.hiking_score else None
        })
        
    # If no real data, generate mock data
    if not daily_forecasts:
        daily_forecasts = generate_mock_forecast(location, days)
        
    return {
        "location": {
            "id": location.id,
            "name": location.name,
            "area": location.area.name if location.area else None,
            "elevation_m": location.elevation_m
        },
        "daily_forecasts": list(daily_forecasts.values()),
        "generated_at": datetime.utcnow().isoformat()
    }

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
```

## Phase 6: Testing and Deployment (2 hours)

### 6.1 Test Database Connection
Create `backend/test_db.py`:
```python
"""Test database connection and data"""
from sqlalchemy import text
from database import engine
from models_simple import Location, Area, WeatherData
from sqlalchemy.orm import Session

def test_connection():
    """Test basic database connection"""
    with engine.connect() as conn:
        result = conn.execute(text("SELECT 1"))
        print("Database connection: OK")
        
def test_data():
    """Test data access"""
    with Session(engine) as db:
        # Count areas
        area_count = db.query(Area).count()
        print(f"Areas: {area_count}")
        
        # Count locations
        location_count = db.query(Location).count()
        print(f"Locations: {location_count}")
        
        # Count weather data
        weather_count = db.query(WeatherData).count()
        print(f"Weather records: {weather_count}")
        
        # Sample location
        location = db.query(Location).first()
        if location:
            print(f"\nSample location: {location.name} ({location.area.name})")
            print(f"  Elevation: {location.elevation_m}m")
            print(f"  Coordinates: {location.latitude}, {location.longitude}")

if __name__ == "__main__":
    test_connection()
    test_data()
```

### 6.2 Deployment Steps
```bash
# 1. Stop current services
pkill -f "simple_api.py"

# 2. Apply database schema
cd backend
psql -U mountain_weather_user -d mountain_weather -f database/schema_full.sql

# 3. Run migration
python data_migration_simple.py

# 4. Test database
python test_db.py

# 5. Start new API
python api_simple.py

# 6. Update frontend to use new endpoints
# The frontend should work without changes if API responses match
```

## Phase 7: Future Enhancements

### 7.1 Add TimescaleDB Support
- Install TimescaleDB for PostgreSQL 16
- Create hypertables for time-series optimization
- Add data retention policies

### 7.2 Add PostGIS Support
- Install PostGIS extension
- Add spatial queries for nearby locations
- Implement route planning features

### 7.3 Add Caching Layer
- Set up Redis for caching
- Implement cache warming
- Add cache invalidation

### 7.4 Add Real-time Data
- Integrate with weather APIs
- Set up scheduled data updates
- Implement webhook notifications

## Estimated Timeline

- **Phase 1-2**: 5-7 hours (Dependencies & Schema)
- **Phase 3-4**: 7-9 hours (Models & Migration)
- **Phase 5-6**: 4-5 hours (API & Testing)
- **Total**: 16-21 hours of focused work

## Success Criteria

1. PostgreSQL database fully operational
2. All 342 historical forecast files imported
3. API serving real data from database
4. Frontend seamlessly using new API
5. Performance acceptable (< 200ms response times)
6. All existing features working properly

## Risk Mitigation

1. **Backup current setup** before making changes
2. **Test each phase** independently
3. **Keep mock API** as fallback option
4. **Document all changes** for rollback
5. **Monitor performance** after deployment