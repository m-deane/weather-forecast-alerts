"""
Initialize the database schema and create tables
Run this before data migration
"""

import logging
import sys
import os
from sqlalchemy import create_engine, text

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.database import engine, Base
from backend.models import (
    Location, Area, WeatherSource, WeatherData, 
    UserPreferences, WeatherAlert, SavedSearch
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def init_database():
    """Initialize database with tables and extensions"""
    logger.info("Initializing database...")
    
    try:
        # Create TimescaleDB extension if not exists
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"))
            conn.commit()
            
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
        
        # Create hypertables for time-series data
        with engine.connect() as conn:
            # Make weather_data a hypertable
            try:
                conn.execute(text("""
                    SELECT create_hypertable('weather_data', 'created_at', 
                        chunk_time_interval => INTERVAL '1 week',
                        if_not_exists => TRUE);
                """))
                conn.commit()
                logger.info("Created hypertable for weather_data")
            except Exception as e:
                logger.warning(f"Hypertable might already exist: {e}")
                
        # Create indexes for better performance
        with engine.connect() as conn:
            indexes = [
                "CREATE INDEX IF NOT EXISTS idx_weather_location_date ON weather_data(location_id, forecast_date);",
                "CREATE INDEX IF NOT EXISTS idx_weather_source ON weather_data(source_id);",
                "CREATE INDEX IF NOT EXISTS idx_weather_period ON weather_data(period_type);",
                "CREATE INDEX IF NOT EXISTS idx_location_area ON locations(area_id);",
                "CREATE INDEX IF NOT EXISTS idx_location_active ON locations(is_active);",
            ]
            
            for idx in indexes:
                try:
                    conn.execute(text(idx))
                except Exception as e:
                    logger.warning(f"Index might already exist: {e}")
                    
            conn.commit()
            
        logger.info("Database initialization completed successfully")
        
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        raise


if __name__ == "__main__":
    init_database()