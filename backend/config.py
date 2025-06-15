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