"""
Data migration script to import historical forecast data into the database
Processes all existing JSON files and enriches with calculated metrics
"""

import os
import sys
import json
import logging
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import pandas as pd
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session
import glob
import re

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import get_db, engine
from models import (
    Location, WeatherData, WeatherSource, Area,
    PeriodType, PrecipitationType, HikingSuitability,
    calculate_hiking_score
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class DataMigration:
    """Handles migration of historical weather data"""
    
    def __init__(self):
        self.forecasts_dir = Path("../forecasts")
        self.processed_count = 0
        self.failed_count = 0
        self.location_cache = {}
        self.area_cache = {}
        self.source_cache = {}
        
        # Mapping of location names to proper metadata
        self.location_metadata = {
            # Torridon area
            "Beinn Eighe": {"area": "Torridon", "elevation": 1010, "lat": 57.5908, "lon": -5.4266},
            "An Ruadh Stac": {"area": "Torridon", "elevation": 892, "lat": 57.5683, "lon": -5.5033},
            "Baosbheinn": {"area": "Torridon", "elevation": 875, "lat": 57.6350, "lon": -5.5317},
            "Beinn Damh": {"area": "Torridon", "elevation": 902, "lat": 57.5283, "lon": -5.5550},
            "Slioch": {"area": "Torridon", "elevation": 981, "lat": 57.6667, "lon": -5.3500},
            
            # Glencoe area
            "Bidean nam Bian": {"area": "Glencoe", "elevation": 1150, "lat": 56.6433, "lon": -5.0283},
            "Ben Starav": {"area": "Glencoe", "elevation": 1078, "lat": 56.5608, "lon": -4.9783},
            "Buachaille Etive Mor": {"area": "Glencoe", "elevation": 1022, "lat": 56.6483, "lon": -4.8950},
            
            # Coigach area
            "Stac Pollaidh": {"area": "Coigach", "elevation": 612, "lat": 58.0433, "lon": -5.3517},
            "Suilven": {"area": "Coigach", "elevation": 731, "lat": 58.1192, "lon": -5.1433},
            "Cul Beag": {"area": "Coigach", "elevation": 769, "lat": 58.0942, "lon": -5.0942},
            
            # Skye area
            "Bla Bheinn": {"area": "Skye", "elevation": 928, "lat": 57.2194, "lon": -6.0917},
            
            # Knoydart area
            "Beinn na Caillich (Knoydart)": {"area": "Knoydart", "elevation": 785, "lat": 57.0500, "lon": -5.6333},
        }
    
    def get_or_create_area(self, db: Session, area_name: str) -> Area:
        """Get or create an area"""
        if area_name in self.area_cache:
            return self.area_cache[area_name]
            
        area = db.query(Area).filter_by(name=area_name).first()
        if not area:
            area = Area(
                name=area_name,
                description=f"{area_name} mountain region",
                bounds=None  # Could be enhanced with GeoJSON
            )
            db.add(area)
            db.commit()
            
        self.area_cache[area_name] = area
        return area
    
    def get_or_create_source(self, db: Session, source_info: Dict) -> WeatherSource:
        """Get or create a weather source"""
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
            db.commit()
            
        self.source_cache[source_name] = source
        return source
    
    def extract_location_name(self, location_str: str) -> str:
        """Extract clean location name from various formats"""
        # Remove (Averaged), (Proxy) suffixes
        name = re.sub(r'\s*\(.*?\)\s*$', '', location_str)
        # Clean up whitespace
        name = name.strip()
        return name
    
    def get_or_create_location(self, db: Session, location_name: str, area_name: str) -> Optional[Location]:
        """Get or create a location"""
        clean_name = self.extract_location_name(location_name)
        
        if clean_name in self.location_cache:
            return self.location_cache[clean_name]
            
        location = db.query(Location).filter_by(name=clean_name).first()
        if not location:
            # Look up metadata
            metadata = self.location_metadata.get(clean_name, {})
            if not metadata:
                logger.warning(f"No metadata found for location: {clean_name}")
                return None
                
            area = self.get_or_create_area(db, metadata.get('area', area_name))
            
            location = Location(
                name=clean_name,
                area_id=area.id,
                latitude=metadata.get('lat', 0),
                longitude=metadata.get('lon', 0),
                elevation_m=metadata.get('elevation', 0),
                classification='munro' if metadata.get('elevation', 0) > 914 else 'hill',
                difficulty='moderate',
                is_active=True
            )
            db.add(location)
            db.commit()
            
        self.location_cache[clean_name] = location
        return location
    
    def parse_weather_period(self, period_data: Dict) -> Dict:
        """Parse weather period data from various formats"""
        # Handle different temperature formats
        temp = period_data.get('temp_max_c') or period_data.get('temperature')
        feels_like = period_data.get('temp_chill_c') or period_data.get('feels_like')
        
        # Parse precipitation
        rain_mm = period_data.get('rain_mm', 0) or 0
        snow_cm = period_data.get('snow_cm', 0) or 0
        
        # Determine precipitation type
        precip_type = PrecipitationType.none
        if snow_cm > 0:
            precip_type = PrecipitationType.snow
        elif rain_mm > 0:
            precip_type = PrecipitationType.rain
        elif 'sleet' in period_data.get('summary', '').lower():
            precip_type = PrecipitationType.mixed
            
        # Parse period type
        time_str = period_data.get('time', '').lower()
        if time_str == 'am':
            period_type = PeriodType.am
        elif time_str == 'pm':
            period_type = PeriodType.pm
        elif 'night' in time_str:
            period_type = PeriodType.night
        else:
            period_type = PeriodType.daily
            
        return {
            'temperature_c': temp,
            'feels_like_c': feels_like,
            'wind_speed_kph': period_data.get('wind_kph', 0),
            'wind_direction': period_data.get('wind_dir'),
            'gust_speed_kph': period_data.get('gust_kph'),
            'precipitation_mm': rain_mm + (snow_cm * 10),  # Convert snow to mm
            'precipitation_type': precip_type,
            'cloud_base_m': period_data.get('cloud_base_m'),
            'freezing_level_m': period_data.get('freezing_level_m'),
            'weather_description': period_data.get('summary', ''),
            'period_type': period_type,
        }
    
    def process_json_file(self, db: Session, json_path: Path) -> bool:
        """Process a single JSON forecast file"""
        try:
            with open(json_path, 'r') as f:
                data = json.load(f)
                
            # Extract metadata from filename
            filename_parts = json_path.stem.split('_')
            if len(filename_parts) < 3:
                logger.warning(f"Invalid filename format: {json_path}")
                return False
                
            area_name = json_path.parent.name.replace('_', ' ')
            
            # Get location
            location_name = data.get('location') or data.get('munro')
            if not location_name:
                logger.warning(f"No location name in file: {json_path}")
                return False
                
            location = self.get_or_create_location(db, location_name, area_name)
            if not location:
                return False
                
            # Get source
            source_url = data.get('source_url', '') or data.get('url', '')
            source_name = 'mountain-forecast.com'
            if source_url:
                source_name = source_url.split('/')[2] if '://' in source_url else source_name
                
            source = self.get_or_create_source(db, {'name': source_name, 'url': source_url})
            
            # Process forecast periods
            periods = data.get('forecast_periods', []) or data.get('forecast', {})
            
            if isinstance(periods, list):
                # New format with forecast_periods list
                for period in periods:
                    self._save_weather_period(db, location, source, period)
            elif isinstance(periods, dict):
                # Old format with forecast dict
                for date_str, date_periods in periods.items():
                    if isinstance(date_periods, dict):
                        for period_name, period_data in date_periods.items():
                            if isinstance(period_data, dict):
                                period_data['full_date'] = date_str
                                period_data['time'] = period_name
                                self._save_weather_period(db, location, source, period_data)
                                
            db.commit()
            return True
            
        except Exception as e:
            logger.error(f"Error processing {json_path}: {str(e)}")
            db.rollback()
            return False
    
    def _save_weather_period(self, db: Session, location: Location, source: WeatherSource, 
                           period_data: Dict) -> None:
        """Save a single weather period to database"""
        try:
            # Parse date
            date_str = period_data.get('full_date', '')
            if not date_str:
                return
                
            forecast_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            
            # Parse weather data
            weather_info = self.parse_weather_period(period_data)
            
            # Calculate hiking score
            hiking_score = calculate_hiking_score(
                wind_speed=weather_info['wind_speed_kph'],
                precipitation=weather_info['precipitation_mm'],
                temperature=weather_info['temperature_c'],
                visibility=weather_info.get('visibility_m'),
                cloud_base=weather_info.get('cloud_base_m')
            )
            
            # Check for existing data
            existing = db.query(WeatherData).filter_by(
                location_id=location.id,
                source_id=source.id,
                forecast_date=forecast_date,
                period_type=weather_info['period_type']
            ).first()
            
            if existing:
                # Update existing record
                for key, value in weather_info.items():
                    setattr(existing, key, value)
                existing.hiking_score = hiking_score
                existing.updated_at = datetime.utcnow()
            else:
                # Create new record
                weather_data = WeatherData(
                    location_id=location.id,
                    source_id=source.id,
                    forecast_date=forecast_date,
                    hiking_score=hiking_score,
                    raw_data=period_data,
                    created_at=datetime.utcnow(),
                    **weather_info
                )
                db.add(weather_data)
                
        except Exception as e:
            logger.error(f"Error saving weather period: {str(e)}")
    
    def migrate_all_data(self) -> Dict[str, int]:
        """Migrate all historical forecast data"""
        logger.info("Starting data migration...")
        
        db = next(get_db())
        stats = {
            'total_files': 0,
            'processed': 0,
            'failed': 0,
            'locations_created': 0,
            'weather_records': 0
        }
        
        try:
            # Find all JSON files
            json_files = list(self.forecasts_dir.rglob("*.json"))
            stats['total_files'] = len(json_files)
            
            logger.info(f"Found {len(json_files)} JSON files to process")
            
            # Process each file
            for i, json_file in enumerate(json_files):
                if i % 50 == 0:
                    logger.info(f"Progress: {i}/{len(json_files)} files processed")
                    
                if self.process_json_file(db, json_file):
                    stats['processed'] += 1
                else:
                    stats['failed'] += 1
                    
            # Get final counts
            stats['locations_created'] = len(self.location_cache)
            stats['weather_records'] = db.query(WeatherData).count()
            
            logger.info("Migration completed successfully!")
            logger.info(f"Stats: {stats}")
            
            # Process CSV files for additional metrics
            self._process_csv_files(db)
            
        except Exception as e:
            logger.error(f"Migration failed: {str(e)}")
            db.rollback()
            
        finally:
            db.close()
            
        return stats
    
    def _process_csv_files(self, db: Session) -> None:
        """Process CSV files with daily scores"""
        try:
            csv_files = list(self.forecasts_dir.glob("munro_daily_scores_*.csv"))
            logger.info(f"Processing {len(csv_files)} CSV files for additional metrics")
            
            for csv_file in csv_files:
                try:
                    df = pd.read_csv(csv_file)
                    # Process daily scores if needed
                    # This could enhance existing weather data with aggregated scores
                except Exception as e:
                    logger.error(f"Error processing CSV {csv_file}: {str(e)}")
                    
        except Exception as e:
            logger.error(f"Error processing CSV files: {str(e)}")
    
    def generate_migration_report(self, stats: Dict[str, int]) -> None:
        """Generate a migration report"""
        report_path = Path("migration_report.md")
        
        with open(report_path, 'w') as f:
            f.write("# Data Migration Report\n\n")
            f.write(f"**Migration Date:** {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
            f.write("## Summary\n\n")
            f.write(f"- Total files found: {stats['total_files']}\n")
            f.write(f"- Successfully processed: {stats['processed']}\n")
            f.write(f"- Failed: {stats['failed']}\n")
            f.write(f"- Locations created: {stats['locations_created']}\n")
            f.write(f"- Weather records created: {stats['weather_records']}\n\n")
            
            if stats['failed'] > 0:
                f.write("## Failed Files\n\n")
                f.write("Check logs for details on failed file processing.\n")
                
        logger.info(f"Migration report saved to {report_path}")


def main():
    """Run the data migration"""
    migration = DataMigration()
    stats = migration.migrate_all_data()
    migration.generate_migration_report(stats)
    

if __name__ == "__main__":
    main()