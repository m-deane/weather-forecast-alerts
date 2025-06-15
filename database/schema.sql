-- Scottish Mountain Weather App Database Schema
-- PostgreSQL 13+ with TimescaleDB extension for time-series data

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database schema
CREATE SCHEMA IF NOT EXISTS mountain_weather;
SET search_path TO mountain_weather, public;

-- =============================================
-- LOCATION TABLES
-- =============================================

-- Areas table (Torridon, Glencoe, etc.)
CREATE TABLE areas (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    region VARCHAR(100) NOT NULL,
    description TEXT,
    latitude_center DECIMAL(10,8) NOT NULL,
    longitude_center DECIMAL(11,8) NOT NULL,
    bounding_box JSONB, -- {"north": lat, "south": lat, "east": lng, "west": lng}
    access_info JSONB, -- {"parking": "...", "transport": "...", "restrictions": "..."}
    emergency_contacts JSONB, -- [{"service": "...", "phone": "...", "description": "..."}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Mountain locations table
CREATE TABLE locations (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    area_id VARCHAR(100) REFERENCES areas(id),
    elevation_m INTEGER NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    geom GEOMETRY(POINT, 4326), -- PostGIS point for spatial queries
    classification VARCHAR(50), -- munro, corbett, graham, hill
    difficulty VARCHAR(50), -- easy, moderate, challenging, extreme
    description TEXT,
    
    -- Route information
    route_distance_km DECIMAL(6,2),
    elevation_gain_m INTEGER,
    estimated_time_hours DECIMAL(4,2),
    difficulty_grade VARCHAR(20), -- based on standard grading systems
    
    -- Weather source information
    weather_sources JSONB, -- [{"source": "mwis", "url": "...", "elevation_m": 1000}]
    
    -- Safety information
    safety_info JSONB, -- {"hazards": [...], "season_notes": "...", "escape_routes": [...]}
    
    -- Search optimization
    search_vector tsvector, -- Full-text search vector
    popularity_score INTEGER DEFAULT 0, -- For search ranking
    
    -- Metadata
    metadata JSONB, -- Additional flexible data
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- WEATHER DATA TABLES
-- =============================================

-- Weather sources configuration
CREATE TABLE weather_sources (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    base_url VARCHAR(500),
    api_key_required BOOLEAN DEFAULT FALSE,
    rate_limit_per_hour INTEGER,
    reliability_score DECIMAL(3,2), -- 0.00 to 1.00
    update_frequency_hours INTEGER DEFAULT 4,
    data_format VARCHAR(20), -- json, xml, html
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Main weather data table (TimescaleDB hypertable)
CREATE TABLE weather_data (
    id BIGSERIAL,
    location_id VARCHAR(100) NOT NULL REFERENCES locations(id),
    source_id VARCHAR(50) NOT NULL REFERENCES weather_sources(id),
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Forecast period information
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    period_type VARCHAR(20), -- current, am, pm, night, daily
    forecast_date DATE, -- The date this forecast is for
    
    -- Core weather data
    temperature_c DECIMAL(4,1),
    feels_like_c DECIMAL(4,1),
    wind_speed_kph INTEGER,
    wind_direction VARCHAR(3), -- N, NE, E, SE, S, SW, W, NW
    wind_gust_kph INTEGER,
    precipitation_mm DECIMAL(5,2),
    precipitation_type VARCHAR(20), -- none, rain, snow, sleet, hail
    cloud_base_m INTEGER,
    visibility_km DECIMAL(4,1),
    freezing_level_m INTEGER,
    humidity_percent INTEGER,
    pressure_hpa DECIMAL(6,1),
    
    -- Derived/calculated fields
    hiking_score INTEGER, -- 1-10 scale
    hiking_suitability VARCHAR(20), -- excellent, good, moderate, poor, dangerous
    risk_factors TEXT[], -- ["high_wind", "poor_visibility", "precipitation"]
    
    -- Weather summary
    summary VARCHAR(200),
    icon VARCHAR(50),
    
    -- Data quality
    confidence VARCHAR(20), -- high, medium, low
    raw_data JSONB, -- Original scraped/API data
    processing_notes TEXT,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT valid_hiking_score CHECK (hiking_score >= 1 AND hiking_score <= 10),
    CONSTRAINT valid_temperature CHECK (temperature_c >= -50 AND temperature_c <= 50),
    CONSTRAINT valid_wind_speed CHECK (wind_speed_kph >= 0 AND wind_speed_kph <= 300),
    CONSTRAINT valid_precipitation CHECK (precipitation_mm >= 0)
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('weather_data', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Weather alerts table
CREATE TABLE weather_alerts (
    id BIGSERIAL PRIMARY KEY,
    alert_id VARCHAR(100) UNIQUE NOT NULL, -- External alert ID if available
    location_ids VARCHAR(100)[] NOT NULL,
    area_ids VARCHAR(100)[], -- Can affect entire areas
    
    -- Alert details
    alert_type VARCHAR(100) NOT NULL, -- high_wind, heavy_rain, snow, visibility, etc.
    severity VARCHAR(20) NOT NULL, -- info, warning, severe, extreme
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    
    -- Timing
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    
    -- Source and metadata
    source_id VARCHAR(50) REFERENCES weather_sources(id),
    external_url VARCHAR(500),
    recommendations TEXT[],
    affected_activities TEXT[], -- ["hiking", "climbing", "photography"]
    
    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, expired, cancelled
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- USER DATA TABLES
-- =============================================

-- User preferences (minimal data collection)
CREATE TABLE user_preferences (
    user_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Display preferences
    units JSONB DEFAULT '{"temperature": "celsius", "wind_speed": "kph", "precipitation": "mm", "distance": "km"}',
    
    -- Safety preferences
    risk_tolerance VARCHAR(20) DEFAULT 'moderate', -- conservative, moderate, aggressive
    experience_level VARCHAR(20) DEFAULT 'intermediate', -- beginner, intermediate, advanced, expert
    
    -- Notification preferences
    notifications JSONB DEFAULT '{"weather_alerts": true, "severe_weather": true, "favorites_updates": false}',
    
    -- App preferences
    theme VARCHAR(20) DEFAULT 'auto', -- light, dark, auto
    default_view VARCHAR(20) DEFAULT 'forecast', -- forecast, map, favorites
    
    -- Privacy settings
    location_sharing BOOLEAN DEFAULT FALSE,
    analytics_opt_in BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User favorite locations
CREATE TABLE user_favorites (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES user_preferences(user_id) ON DELETE CASCADE,
    location_id VARCHAR(100) REFERENCES locations(id),
    
    -- Customization
    nickname VARCHAR(200), -- User's custom name for the location
    notes TEXT, -- Personal notes about the location
    
    -- Usage tracking
    visit_count INTEGER DEFAULT 0,
    last_viewed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    UNIQUE(user_id, location_id)
);

-- User sessions (for analytics and caching)
CREATE TABLE user_sessions (
    session_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES user_preferences(user_id),
    
    -- Session data
    device_type VARCHAR(50), -- ios, android, web
    app_version VARCHAR(20),
    platform_version VARCHAR(50),
    
    -- Location context (if permitted)
    approximate_location GEOMETRY(POINT, 4326), -- Rough location for nearby suggestions
    location_permission BOOLEAN DEFAULT FALSE,
    
    -- Session tracking
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Analytics data
    page_views INTEGER DEFAULT 0,
    weather_checks INTEGER DEFAULT 0,
    locations_viewed TEXT[], -- Track usage patterns
    
    -- Caching
    cached_data JSONB -- Store session-specific cached data
);

-- =============================================
-- ANALYTICS AND MONITORING
-- =============================================

-- API usage tracking
CREATE TABLE api_usage (
    id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    -- Request details
    endpoint VARCHAR(200) NOT NULL,
    method VARCHAR(10) NOT NULL,
    user_id UUID REFERENCES user_preferences(user_id),
    session_id UUID REFERENCES user_sessions(session_id),
    
    -- Performance metrics
    response_time_ms INTEGER,
    status_code INTEGER,
    
    -- Usage context
    location_id VARCHAR(100) REFERENCES locations(id),
    query_parameters JSONB,
    
    -- Client information
    user_agent TEXT,
    ip_address INET,
    
    -- Rate limiting
    requests_in_window INTEGER DEFAULT 1
);

-- Convert to hypertable for time-series optimization
SELECT create_hypertable('api_usage', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Weather forecast accuracy tracking
CREATE TABLE forecast_accuracy (
    id BIGSERIAL PRIMARY KEY,
    location_id VARCHAR(100) REFERENCES locations(id),
    source_id VARCHAR(50) REFERENCES weather_sources(id),
    
    -- Forecast details
    forecast_timestamp TIMESTAMPTZ NOT NULL, -- When forecast was made
    target_timestamp TIMESTAMPTZ NOT NULL, -- What time it was predicting
    
    -- Predicted vs actual
    predicted_data JSONB NOT NULL,
    actual_data JSONB, -- Filled in when actual conditions known
    
    -- Accuracy metrics (calculated when actual data available)
    temperature_error_c DECIMAL(4,1),
    wind_speed_error_kph INTEGER,
    precipitation_error_mm DECIMAL(5,2),
    overall_accuracy_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Metadata
    calculated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Location indexes
CREATE INDEX idx_locations_area ON locations(area_id);
CREATE INDEX idx_locations_classification ON locations(classification);
CREATE INDEX idx_locations_difficulty ON locations(difficulty);
CREATE INDEX idx_locations_elevation ON locations(elevation_m);
CREATE INDEX idx_locations_geom ON locations USING GIST (geom);
CREATE INDEX idx_locations_search ON locations USING GIN (search_vector);
CREATE INDEX idx_locations_popularity ON locations(popularity_score DESC);

-- Weather data indexes (optimized for time-series queries)
CREATE INDEX idx_weather_data_location_time ON weather_data(location_id, timestamp DESC);
CREATE INDEX idx_weather_data_source_time ON weather_data(source_id, timestamp DESC);
CREATE INDEX idx_weather_data_forecast_date ON weather_data(location_id, forecast_date, period_type);
CREATE INDEX idx_weather_data_hiking_score ON weather_data(location_id, hiking_score DESC) WHERE hiking_score IS NOT NULL;

-- Alert indexes
CREATE INDEX idx_alerts_locations ON weather_alerts USING GIN(location_ids);
CREATE INDEX idx_alerts_time_status ON weather_alerts(start_time, end_time, status);
CREATE INDEX idx_alerts_severity ON weather_alerts(severity, status);

-- User data indexes
CREATE INDEX idx_favorites_user ON user_favorites(user_id, last_viewed DESC);
CREATE INDEX idx_favorites_location ON user_favorites(location_id, visit_count DESC);
CREATE INDEX idx_sessions_user ON user_sessions(user_id, last_activity DESC);

-- Analytics indexes
CREATE INDEX idx_api_usage_endpoint ON api_usage(endpoint, timestamp DESC);
CREATE INDEX idx_api_usage_user ON api_usage(user_id, timestamp DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_accuracy_location_source ON forecast_accuracy(location_id, source_id, target_timestamp DESC);

-- =============================================
-- FUNCTIONS AND TRIGGERS
-- =============================================

-- Update search vector for locations
CREATE OR REPLACE FUNCTION update_location_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' || 
        COALESCE(NEW.description, '') || ' ' ||
        COALESCE((SELECT name FROM areas WHERE id = NEW.area_id), '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_search
    BEFORE INSERT OR UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_location_search_vector();

-- Update geom column from lat/lng
CREATE OR REPLACE FUNCTION update_location_geom()
RETURNS TRIGGER AS $$
BEGIN
    NEW.geom := ST_SetSRID(ST_MakePoint(NEW.longitude, NEW.latitude), 4326);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_geom
    BEFORE INSERT OR UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_location_geom();

-- Update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_areas_updated_at
    BEFORE UPDATE ON areas
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_locations_updated_at
    BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- INITIAL DATA SEEDING
-- =============================================

-- Insert Scottish mountain areas
INSERT INTO areas (id, name, region, description, latitude_center, longitude_center, bounding_box, access_info) VALUES
('torridon', 'Torridon', 'Northwest Highlands', 'Ancient sandstone peaks in the heart of the Scottish Highlands', 57.546, -5.547, 
 '{"north": 57.65, "south": 57.45, "east": -5.35, "west": -5.75}',
 '{"parking": "Multiple car parks including Coire Dubh and Glen Torridon", "transport": "Limited public transport", "restrictions": "Red deer stalking season Aug-Oct"}'),
 
('glencoe', 'Glencoe', 'Central Highlands', 'Dramatic peaks and ridges in the historic Glen of Weeping', 56.670, -5.030,
 '{"north": 56.75, "south": 56.59, "east": -4.90, "west": -5.15}',
 '{"parking": "Glencoe village, A82 lay-bys", "transport": "Regular bus service on A82", "restrictions": "Limited winter access to some areas"}'),
 
('coigach', 'Coigach', 'Northwest Highlands', 'Remote peaks and coastal mountains in northwest Scotland', 58.000, -5.300,
 '{"north": 58.15, "south": 57.85, "east": -5.15, "west": -5.45}',
 '{"parking": "Limited parking at Achiltibuie and Lochinver", "transport": "Very limited public transport", "restrictions": "Weather dependent access"}'),
 
('skye_glenbrittle', 'Skye (Glenbrittle)', 'Inner Hebrides', 'The dramatic Cuillin ridge and surrounding peaks', 57.217, -6.270,
 '{"north": 57.30, "south": 57.13, "east": -6.10, "west": -6.44}',
 '{"parking": "Glenbrittle campsite and beach", "transport": "Bus from Portree", "restrictions": "Technical climbing terrain, weather dependent"}'),
 
('knoydart_inverie', 'Knoydart (Inverie)', 'West Highlands', 'Remote peninsula accessible only by boat or long walk', 57.038, -5.693,
 '{"north": 57.15, "south": 56.93, "east": -5.55, "west": -5.83}',
 '{"parking": "Mallaig for ferry", "transport": "Ferry from Mallaig or long walk from Kinloch Hourn", "restrictions": "Weather dependent ferry service"}'
);

-- Insert weather sources
INSERT INTO weather_sources (id, name, description, update_frequency_hours, reliability_score, is_active) VALUES
('mwis', 'Mountain Weather Information Service', 'UK specialist mountain weather forecasting', 12, 0.95, true),
('met_office', 'Met Office', 'UK national weather service', 6, 0.90, true),
('mountain_forecast', 'Mountain-Forecast.com', 'Global mountain weather forecasting', 6, 0.85, true),
('openweathermap', 'OpenWeatherMap', 'Global weather API service', 3, 0.80, true);

-- =============================================
-- VIEWS FOR COMMON QUERIES
-- =============================================

-- Current weather conditions view
CREATE VIEW current_weather AS
SELECT DISTINCT ON (location_id, source_id)
    location_id,
    source_id,
    timestamp,
    temperature_c,
    feels_like_c,
    wind_speed_kph,
    wind_direction,
    precipitation_mm,
    precipitation_type,
    visibility_km,
    hiking_score,
    hiking_suitability,
    summary,
    confidence
FROM weather_data
WHERE timestamp >= NOW() - INTERVAL '6 hours'
ORDER BY location_id, source_id, timestamp DESC;

-- Location summary view with latest weather
CREATE VIEW location_summary AS
SELECT 
    l.id,
    l.name,
    l.area_id,
    a.name as area_name,
    l.elevation_m,
    l.latitude,
    l.longitude,
    l.classification,
    l.difficulty,
    l.popularity_score,
    cw.hiking_score,
    cw.hiking_suitability,
    cw.temperature_c,
    cw.wind_speed_kph,
    cw.summary as current_summary,
    cw.timestamp as weather_updated
FROM locations l
LEFT JOIN areas a ON l.area_id = a.id
LEFT JOIN current_weather cw ON l.id = cw.location_id AND cw.source_id = 'mwis';

-- =============================================
-- DATA RETENTION POLICIES
-- =============================================

-- Retention policy for weather data (keep 2 years)
SELECT add_retention_policy('weather_data', INTERVAL '2 years');

-- Retention policy for API usage (keep 1 year)
SELECT add_retention_policy('api_usage', INTERVAL '1 year');

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON SCHEMA mountain_weather IS 'Scottish Mountain Weather Application Database';
COMMENT ON TABLE locations IS 'Scottish mountain and hill locations with metadata';
COMMENT ON TABLE weather_data IS 'Time-series weather forecast and observation data';
COMMENT ON TABLE weather_alerts IS 'Weather warnings and alerts for mountain areas';
COMMENT ON TABLE user_preferences IS 'User settings and preferences with minimal data collection';
COMMENT ON TABLE forecast_accuracy IS 'Tracking forecast accuracy vs actual conditions';

-- Grant permissions for application user
-- CREATE USER mountain_weather_app WITH PASSWORD 'secure_password_here';
-- GRANT USAGE ON SCHEMA mountain_weather TO mountain_weather_app;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mountain_weather TO mountain_weather_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mountain_weather TO mountain_weather_app;