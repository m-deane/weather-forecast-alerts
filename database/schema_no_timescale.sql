-- Scottish Mountain Weather App Database Schema
-- PostgreSQL 13+ (without TimescaleDB for now)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database schema
CREATE SCHEMA IF NOT EXISTS mountain_weather;
SET search_path TO mountain_weather, public;

-- =============================================
-- CORE TABLES FROM MODELS.PY
-- =============================================

-- Weather sources table
CREATE TABLE weather_sources (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    base_url TEXT,
    api_type VARCHAR(50) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Areas table
CREATE TABLE areas (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    bounds JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locations table
CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    area_id INTEGER REFERENCES areas(id),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    elevation_m INTEGER NOT NULL,
    classification VARCHAR(50),
    difficulty VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(name, area_id)
);

-- Weather data table (main forecast storage)
CREATE TABLE weather_data (
    id SERIAL PRIMARY KEY,
    location_id INTEGER NOT NULL REFERENCES locations(id),
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

-- Create indexes for performance
CREATE INDEX idx_weather_data_location_date ON weather_data(location_id, forecast_date);
CREATE INDEX idx_weather_data_forecast_date ON weather_data(forecast_date);
CREATE INDEX idx_weather_data_created_at ON weather_data(created_at);
CREATE INDEX idx_locations_area ON locations(area_id);
CREATE INDEX idx_locations_active ON locations(is_active) WHERE is_active = true;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_weather_sources_updated_at BEFORE UPDATE ON weather_sources
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_areas_updated_at BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weather_data_updated_at BEFORE UPDATE ON weather_data
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();