"""
Data ingestion service to integrate weather_scraper.py with the backend API
Handles automated scheduling and data processing
"""

import os
import sys
import json
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from pathlib import Path
import schedule
import time

# Add parent directory to path to import weather_scraper
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from weather_scraper import (
    load_config, get_all_munros_forecast, MunroGroup, 
    calculate_daily_scores, generate_summary_report
)
from sqlalchemy.orm import Session
from database import get_db, engine
from models import (
    Location, WeatherData, WeatherSource, Area,
    PeriodType, PrecipitationType, HikingSuitability
)
from weather_service import WeatherService

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class DataIngestionService:
    """Service to ingest weather data from scraper into database"""
    
    def __init__(self):
        self.config = load_config()
        self.weather_service = WeatherService()
        self.scraper_output_dir = Path("../forecasts")
        
    def _get_or_create_source(self, db: Session, source_name: str) -> WeatherSource:
        """Get or create a weather source"""
        source = db.query(WeatherSource).filter_by(name=source_name).first()
        if not source:
            source = WeatherSource(
                name=source_name,
                base_url=f"https://{source_name}",
                api_type="scraper",
                is_active=True,
                priority=1 if source_name == "mountain-forecast.com" else 2
            )
            db.add(source)
            db.commit()
        return source
        
    def _get_or_create_area(self, db: Session, area_name: str) -> Area:
        """Get or create an area"""
        area = db.query(Area).filter_by(name=area_name).first()
        if not area:
            area = Area(
                name=area_name,
                description=f"{area_name} mountain area",
                bounds=None  # Could be enhanced with actual boundary data
            )
            db.add(area)
            db.commit()
        return area
        
    def _get_or_create_location(self, db: Session, munro_data: Dict, area: Area) -> Location:
        """Get or create a location from munro data"""
        location = db.query(Location).filter_by(name=munro_data['name']).first()
        if not location:
            location = Location(
                name=munro_data['name'],
                area_id=area.id,
                latitude=munro_data.get('latitude', 0),
                longitude=munro_data.get('longitude', 0),
                elevation_m=munro_data.get('height', 0),
                classification='munro',
                difficulty='moderate',  # Default, could be enhanced
                is_active=True
            )
            db.add(location)
            db.commit()
        return location
        
    def _convert_period_type(self, period: str) -> PeriodType:
        """Convert scraper period to API period type"""
        period_map = {
            'AM': PeriodType.am,
            'PM': PeriodType.pm,
            'Night': PeriodType.night
        }
        return period_map.get(period, PeriodType.daily)
        
    def _convert_precipitation_type(self, weather_desc: str) -> PrecipitationType:
        """Determine precipitation type from weather description"""
        desc_lower = weather_desc.lower()
        if 'snow' in desc_lower:
            return PrecipitationType.snow
        elif 'rain' in desc_lower or 'drizzle' in desc_lower:
            return PrecipitationType.rain
        elif 'sleet' in desc_lower:
            return PrecipitationType.mixed
        else:
            return PrecipitationType.none
            
    def _parse_wind_data(self, wind_str: str) -> tuple:
        """Parse wind string to speed and direction"""
        # Example: "25 km/h SW"
        try:
            parts = wind_str.split()
            if len(parts) >= 2:
                speed = int(parts[0])
                direction = parts[-1] if len(parts) > 2 else None
                return speed, direction
        except:
            pass
        return 0, None
        
    def ingest_forecast_data(self, db: Session, forecast_json_path: str) -> bool:
        """Ingest a single forecast JSON file into the database"""
        try:
            with open(forecast_json_path, 'r') as f:
                data = json.load(f)
                
            # Extract metadata
            area_name = data.get('area', 'Unknown')
            munro_name = data.get('munro', 'Unknown')
            source_name = data.get('url', '').split('/')[2] if data.get('url') else 'unknown'
            
            # Get or create database entities
            area = self._get_or_create_area(db, area_name)
            source = self._get_or_create_source(db, source_name)
            
            # Create location data
            munro_data = {
                'name': munro_name,
                'height': data.get('height', 0)
            }
            location = self._get_or_create_location(db, munro_data, area)
            
            # Process forecast periods
            forecast = data.get('forecast', {})
            for date_str, periods in forecast.items():
                forecast_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                for period_name, period_data in periods.items():
                    if isinstance(period_data, dict):
                        # Parse weather data
                        wind_speed, wind_direction = self._parse_wind_data(
                            period_data.get('wind', '')
                        )
                        
                        weather_data = WeatherData(
                            location_id=location.id,
                            source_id=source.id,
                            forecast_date=forecast_date,
                            period_type=self._convert_period_type(period_name),
                            temperature_c=period_data.get('temperature'),
                            feels_like_c=period_data.get('feels_like'),
                            wind_speed_kph=wind_speed,
                            wind_direction=wind_direction,
                            gust_speed_kph=period_data.get('gust_speed'),
                            precipitation_mm=period_data.get('rain', 0),
                            precipitation_type=self._convert_precipitation_type(
                                period_data.get('weather', '')
                            ),
                            cloud_base_m=period_data.get('cloud_base'),
                            freezing_level_m=period_data.get('freezing_level'),
                            visibility_m=period_data.get('visibility'),
                            humidity_percent=period_data.get('humidity'),
                            pressure_mb=period_data.get('pressure'),
                            uv_index=period_data.get('uv_index'),
                            weather_description=period_data.get('weather'),
                            raw_data=period_data,
                            created_at=datetime.utcnow()
                        )
                        
                        # Check if data already exists
                        existing = db.query(WeatherData).filter_by(
                            location_id=location.id,
                            source_id=source.id,
                            forecast_date=forecast_date,
                            period_type=weather_data.period_type
                        ).first()
                        
                        if existing:
                            # Update existing record
                            for key, value in weather_data.__dict__.items():
                                if not key.startswith('_'):
                                    setattr(existing, key, value)
                        else:
                            db.add(weather_data)
                            
            db.commit()
            logger.info(f"Successfully ingested data for {munro_name} on {date_str}")
            return True
            
        except Exception as e:
            logger.error(f"Error ingesting forecast data: {str(e)}")
            db.rollback()
            return False
            
    def run_scraper_and_ingest(self):
        """Run the weather scraper and ingest all new data"""
        logger.info("Starting weather data scraping and ingestion...")
        
        try:
            # Run the scraper
            config = load_config()
            munro_groups = [MunroGroup.from_config(group) for group in config['munro_groups']]
            
            all_forecasts = []
            failed_munros = []
            
            for group in munro_groups:
                logger.info(f"Processing group: {group.name}")
                forecasts, failed = get_all_munros_forecast(group)
                all_forecasts.extend(forecasts)
                failed_munros.extend(failed)
                
            if all_forecasts:
                # Generate summary report
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                summary_path = f"forecasts/summary_report_{timestamp}.md"
                generate_summary_report(all_forecasts, summary_path)
                
                # Ingest all forecast data
                db = next(get_db())
                ingested_count = 0
                
                # Find all JSON files in forecast directories
                for area_dir in Path("forecasts").iterdir():
                    if area_dir.is_dir() and not area_dir.name.startswith('.'):
                        json_files = sorted(area_dir.glob("*.json"), 
                                          key=lambda x: x.stat().st_mtime, 
                                          reverse=True)
                        
                        # Process only the most recent files (last 24 hours)
                        cutoff_time = time.time() - (24 * 3600)
                        for json_file in json_files:
                            if json_file.stat().st_mtime > cutoff_time:
                                if self.ingest_forecast_data(db, str(json_file)):
                                    ingested_count += 1
                                    
                logger.info(f"Successfully ingested {ingested_count} forecast files")
                
            else:
                logger.warning("No forecasts were successfully scraped")
                
        except Exception as e:
            logger.error(f"Error in scraper/ingestion process: {str(e)}")
            
    def schedule_ingestion(self, interval_hours: int = 4):
        """Schedule periodic data ingestion"""
        logger.info(f"Scheduling data ingestion every {interval_hours} hours")
        
        # Run immediately on startup
        self.run_scraper_and_ingest()
        
        # Schedule periodic runs
        schedule.every(interval_hours).hours.do(self.run_scraper_and_ingest)
        
        while True:
            schedule.run_pending()
            time.sleep(60)  # Check every minute
            

def main():
    """Main entry point for data ingestion service"""
    service = DataIngestionService()
    
    # Check if running as one-time or scheduled
    import argparse
    parser = argparse.ArgumentParser(description='Weather data ingestion service')
    parser.add_argument('--once', action='store_true', 
                      help='Run once instead of scheduled')
    parser.add_argument('--interval', type=int, default=4,
                      help='Hours between ingestion runs (default: 4)')
    
    args = parser.parse_args()
    
    if args.once:
        service.run_scraper_and_ingest()
    else:
        service.schedule_ingestion(args.interval)
        

if __name__ == "__main__":
    main()