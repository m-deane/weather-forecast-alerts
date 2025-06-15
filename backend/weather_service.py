"""
Weather Service for integrating with existing weather_scraper.py
Handles data ingestion, processing, and storage
"""

import asyncio
import logging
import json
import yaml
from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional, Any
from pathlib import Path
import tempfile
import os

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import aiohttp
import aiofiles

from .models import (
    Location, Area, WeatherData, WeatherSource, 
    calculate_hiking_score, determine_hiking_suitability,
    generate_risk_factors, generate_recommendations,
    PeriodType, PrecipitationType
)
from .database import get_db_session

logger = logging.getLogger(__name__)

class WeatherDataProcessor:
    """Process weather data from existing scraper format to database format"""
    
    @staticmethod
    def process_forecast_period(period_data: Dict[str, Any], location_id: str, source_id: str) -> Dict[str, Any]:
        """Convert scraped period data to database format"""
        
        # Extract period information
        day_period = period_data.get('day_period', '')
        period_parts = day_period.split('_') if day_period else []
        
        if len(period_parts) >= 2:
            date_str = period_parts[0]
            period_type = period_parts[1].lower()
        else:
            date_str = period_data.get('full_date', '')
            period_type = period_data.get('time', '').lower()
        
        # Parse date
        forecast_date = None
        period_start = None
        period_end = None
        
        try:
            if date_str:
                forecast_date = datetime.strptime(date_str, '%Y-%m-%d').date()
                
                # Calculate period start and end times
                if period_type == 'am':
                    period_start = datetime.combine(forecast_date, datetime.min.time().replace(hour=6))
                    period_end = datetime.combine(forecast_date, datetime.min.time().replace(hour=12))
                elif period_type == 'pm':
                    period_start = datetime.combine(forecast_date, datetime.min.time().replace(hour=12))
                    period_end = datetime.combine(forecast_date, datetime.min.time().replace(hour=18))
                elif period_type == 'night':
                    period_start = datetime.combine(forecast_date, datetime.min.time().replace(hour=18))
                    period_end = datetime.combine(forecast_date + timedelta(days=1), datetime.min.time().replace(hour=6))
                else:
                    # Daily or unknown period
                    period_start = datetime.combine(forecast_date, datetime.min.time())
                    period_end = datetime.combine(forecast_date + timedelta(days=1), datetime.min.time())
        except ValueError:
            logger.warning(f"Failed to parse date: {date_str}")
        
        # Extract weather conditions
        temperature_c = period_data.get('temp_max_c', period_data.get('temp_min_c'))
        feels_like_c = period_data.get('temp_chill_c')
        wind_speed_kph = period_data.get('wind_kph')
        wind_direction = period_data.get('wind_dir')
        precipitation_mm = period_data.get('rain_mm', 0) or 0
        snow_cm = period_data.get('snow_cm', 0) or 0
        
        # Convert snow to precipitation equivalent (rough conversion)
        if snow_cm > 0:
            precipitation_mm += snow_cm * 0.1  # Snow water equivalent approximation
            precipitation_type = PrecipitationType.snow
        elif precipitation_mm > 0:
            precipitation_type = PrecipitationType.rain
        else:
            precipitation_type = PrecipitationType.none
        
        # Other conditions
        cloud_base_m = period_data.get('cloud_base_m')
        freezing_level_m = period_data.get('freezing_level_m')
        visibility_km = None  # Not in current data format
        
        # Summary and icon
        summary = period_data.get('summary', '')
        icon = period_data.get('weather_icon_alt', '')
        
        # Calculate hiking metrics
        from .models import WeatherConditions
        conditions = WeatherConditions(
            temperature_c=temperature_c,
            feels_like_c=feels_like_c,
            wind_speed_kph=wind_speed_kph,
            wind_direction=wind_direction,
            precipitation_mm=precipitation_mm,
            precipitation_type=precipitation_type.value if precipitation_type else None,
            cloud_base_m=cloud_base_m,
            visibility_km=visibility_km,
            freezing_level_m=freezing_level_m
        )
        
        hiking_score = calculate_hiking_score(conditions)
        hiking_suitability = determine_hiking_suitability(hiking_score)
        risk_factors = generate_risk_factors(conditions)
        
        return {
            'location_id': location_id,
            'source_id': source_id,
            'timestamp': datetime.utcnow().replace(tzinfo=timezone.utc),
            'period_start': period_start.replace(tzinfo=timezone.utc) if period_start else None,
            'period_end': period_end.replace(tzinfo=timezone.utc) if period_end else None,
            'period_type': period_type,
            'forecast_date': forecast_date,
            'temperature_c': temperature_c,
            'feels_like_c': feels_like_c,
            'wind_speed_kph': wind_speed_kph,
            'wind_direction': wind_direction,
            'precipitation_mm': precipitation_mm,
            'precipitation_type': precipitation_type.value if precipitation_type else None,
            'cloud_base_m': cloud_base_m,
            'visibility_km': visibility_km,
            'freezing_level_m': freezing_level_m,
            'hiking_score': hiking_score,
            'hiking_suitability': hiking_suitability.value if hiking_suitability else None,
            'risk_factors': risk_factors,
            'summary': summary,
            'icon': icon,
            'confidence': 'medium',  # Default confidence
            'raw_data': period_data
        }

class WeatherScraperIntegration:
    """Integration with existing weather_scraper.py"""
    
    def __init__(self, config_path: str = "config.yaml"):
        self.config_path = config_path
        self.config = None
        self.processor = WeatherDataProcessor()
        
    async def load_config(self):
        """Load configuration from YAML file"""
        try:
            with open(self.config_path, 'r') as f:
                self.config = yaml.safe_load(f)
            logger.info(f"Loaded configuration from {self.config_path}")
        except Exception as e:
            logger.error(f"Failed to load config: {e}")
            raise
    
    async def run_scraper(self) -> Dict[str, Any]:
        """Run the existing weather scraper and return results"""
        try:
            # Import and run the existing weather scraper
            import sys
            import subprocess
            
            # Run the scraper as a subprocess to avoid import conflicts
            result = subprocess.run(
                [sys.executable, "weather_scraper.py"],
                capture_output=True,
                text=True,
                timeout=300  # 5 minute timeout
            )
            
            if result.returncode != 0:
                logger.error(f"Scraper failed: {result.stderr}")
                raise Exception(f"Weather scraper failed: {result.stderr}")
            
            logger.info("Weather scraper completed successfully")
            return {"status": "success", "output": result.stdout}
            
        except subprocess.TimeoutExpired:
            logger.error("Weather scraper timed out")
            raise Exception("Weather scraper timed out")
        except Exception as e:
            logger.error(f"Failed to run weather scraper: {e}")
            raise
    
    async def load_forecast_files(self) -> List[Dict[str, Any]]:
        """Load forecast data from JSON files created by scraper"""
        forecast_data = []
        
        if not self.config:
            await self.load_config()
        
        # Look for forecast files in the forecasts directory
        forecasts_dir = Path("forecasts")
        
        if not forecasts_dir.exists():
            logger.warning("Forecasts directory not found")
            return []
        
        # Find all JSON forecast files
        for area_dir in forecasts_dir.iterdir():
            if not area_dir.is_dir():
                continue
                
            for file_path in area_dir.glob("*.json"):
                try:
                    async with aiofiles.open(file_path, 'r') as f:
                        content = await f.read()
                        data = json.loads(content)
                        
                        # Add file metadata
                        data['file_path'] = str(file_path)
                        data['area'] = area_dir.name
                        
                        forecast_data.append(data)
                        
                except Exception as e:
                    logger.warning(f"Failed to load forecast file {file_path}: {e}")
        
        logger.info(f"Loaded {len(forecast_data)} forecast files")
        return forecast_data
    
    async def map_location_id(self, forecast_data: Dict[str, Any]) -> Optional[str]:
        """Map forecast data to location ID"""
        location_name = forecast_data.get('location', '')
        area_name = forecast_data.get('area', '')
        
        # Create a standardized location ID
        # This should match the IDs in your locations database
        if location_name:
            # Convert to lowercase and replace spaces/special chars
            location_id = location_name.lower().replace(' ', '-').replace('_', '-')
            location_id = ''.join(c for c in location_id if c.isalnum() or c == '-')
            return location_id
        
        return None
    
    async def determine_source_id(self, forecast_data: Dict[str, Any]) -> str:
        """Determine weather source from forecast data"""
        source_url = forecast_data.get('source_url', '')
        
        if 'mountain-forecast.com' in source_url:
            return 'mountain_forecast'
        elif 'mwis.org.uk' in source_url:
            return 'mwis'
        elif 'metoffice.gov.uk' in source_url:
            return 'met_office'
        else:
            return 'unknown'

class WeatherService:
    """Main weather service orchestrating data collection and processing"""
    
    def __init__(self):
        self.scraper_integration = WeatherScraperIntegration()
        self.is_running = False
        self.update_task = None
        
    async def initialize(self):
        """Initialize the weather service"""
        logger.info("Initializing weather service")
        
        # Load configuration
        await self.scraper_integration.load_config()
        
        # Initialize database with location data if needed
        await self.initialize_locations()
        
        logger.info("Weather service initialized")
    
    async def initialize_locations(self):
        """Initialize location data from config if database is empty"""
        db = get_db_session()
        
        try:
            # Check if locations already exist
            location_count = db.query(Location).count()
            
            if location_count > 0:
                logger.info(f"Database already contains {location_count} locations")
                return
            
            logger.info("Initializing location data from config")
            
            config = self.scraper_integration.config
            if not config or 'locations' not in config:
                logger.warning("No location configuration found")
                return
            
            # Create areas first
            areas_created = set()
            
            for location_config in config['locations']:
                area_id = location_config.get('area', '').lower().replace(' ', '_')
                
                if area_id and area_id not in areas_created:
                    # Create area if it doesn't exist
                    existing_area = db.query(Area).filter(Area.id == area_id).first()
                    
                    if not existing_area:
                        area = Area(
                            id=area_id,
                            name=location_config.get('area', ''),
                            region='Scotland',
                            description=f"Mountain area in Scotland: {location_config.get('area', '')}",
                            latitude_center=location_config.get('latitude', 0),
                            longitude_center=location_config.get('longitude', 0)
                        )
                        db.add(area)
                        areas_created.add(area_id)
                        logger.info(f"Created area: {area_id}")
            
            # Create locations
            for location_config in config['locations']:
                area_id = location_config.get('area', '').lower().replace(' ', '_')
                
                # Create locations for each munro in the area
                munros = location_config.get('munros', [])
                
                for munro in munros:
                    location_id = munro['name'].lower().replace(' ', '-').replace('_', '-')
                    location_id = ''.join(c for c in location_id if c.isalnum() or c == '-')
                    
                    # Check if location already exists
                    existing_location = db.query(Location).filter(Location.id == location_id).first()
                    
                    if not existing_location:
                        # Extract elevation from URL (rough approximation)
                        elevation = 1000  # Default elevation
                        url = munro.get('url', '')
                        if '/forecasts/' in url:
                            try:
                                elevation = int(url.split('/forecasts/')[-1])
                            except:
                                pass
                        
                        location = Location(
                            id=location_id,
                            name=munro['name'],
                            area_id=area_id,
                            elevation_m=elevation,
                            latitude=location_config.get('latitude', 0),
                            longitude=location_config.get('longitude', 0),
                            classification='munro',  # Assume munro for now
                            difficulty='moderate',  # Default difficulty
                            weather_sources=[{
                                'source': 'mountain_forecast',
                                'url': munro.get('url', ''),
                                'elevation_m': elevation
                            }]
                        )
                        db.add(location)
                        logger.info(f"Created location: {location_id}")
            
            db.commit()
            logger.info("Location initialization completed")
            
        except Exception as e:
            logger.error(f"Failed to initialize locations: {e}")
            db.rollback()
            raise
        finally:
            db.close()
    
    async def update_weather_data(self):
        """Update weather data from scraper"""
        logger.info("Starting weather data update")
        
        try:
            # Run the weather scraper
            await self.scraper_integration.run_scraper()
            
            # Load forecast data
            forecast_data_list = await self.scraper_integration.load_forecast_files()
            
            if not forecast_data_list:
                logger.warning("No forecast data found")
                return
            
            # Process and store data
            db = get_db_session()
            records_processed = 0
            
            try:
                for forecast_data in forecast_data_list:
                    location_id = await self.scraper_integration.map_location_id(forecast_data)
                    source_id = await self.scraper_integration.determine_source_id(forecast_data)
                    
                    if not location_id:
                        logger.warning(f"Could not map location for: {forecast_data.get('location', 'unknown')}")
                        continue
                    
                    # Check if location exists in database
                    location = db.query(Location).filter(Location.id == location_id).first()
                    if not location:
                        logger.warning(f"Location {location_id} not found in database")
                        continue
                    
                    # Process forecast periods
                    forecast_periods = forecast_data.get('forecast_periods', [])
                    
                    for period in forecast_periods:
                        try:
                            # Process period data
                            processed_data = self.scraper_integration.processor.process_forecast_period(
                                period, location_id, source_id
                            )
                            
                            # Create weather data record
                            weather_record = WeatherData(**processed_data)
                            db.add(weather_record)
                            records_processed += 1
                            
                        except Exception as e:
                            logger.warning(f"Failed to process period data: {e}")
                            continue
                
                # Commit all changes
                db.commit()
                logger.info(f"Weather data update completed: {records_processed} records processed")
                
            except Exception as e:
                logger.error(f"Failed to process weather data: {e}")
                db.rollback()
                raise
            finally:
                db.close()
                
        except Exception as e:
            logger.error(f"Weather data update failed: {e}")
            raise
    
    async def start_scheduled_updates(self, interval_hours: int = 4):
        """Start scheduled weather updates"""
        if self.is_running:
            logger.warning("Weather updates already running")
            return
        
        self.is_running = True
        logger.info(f"Starting scheduled weather updates every {interval_hours} hours")
        
        async def update_loop():
            while self.is_running:
                try:
                    await self.update_weather_data()
                    logger.info(f"Next update in {interval_hours} hours")
                    await asyncio.sleep(interval_hours * 3600)  # Convert to seconds
                except asyncio.CancelledError:
                    logger.info("Weather update loop cancelled")
                    break
                except Exception as e:
                    logger.error(f"Weather update failed: {e}")
                    # Wait 30 minutes before retrying on error
                    await asyncio.sleep(1800)
        
        self.update_task = asyncio.create_task(update_loop())
    
    async def stop_scheduled_updates(self):
        """Stop scheduled weather updates"""
        if not self.is_running:
            return
        
        self.is_running = False
        
        if self.update_task:
            self.update_task.cancel()
            try:
                await self.update_task
            except asyncio.CancelledError:
                pass
        
        logger.info("Scheduled weather updates stopped")
    
    async def cleanup(self):
        """Clean up resources"""
        await self.stop_scheduled_updates()
        logger.info("Weather service cleanup completed")

# =============================================
# STANDALONE FUNCTIONS
# =============================================

async def run_weather_update():
    """Standalone function to run weather update"""
    service = WeatherService()
    await service.initialize()
    await service.update_weather_data()
    await service.cleanup()

if __name__ == "__main__":
    # Run standalone weather update
    asyncio.run(run_weather_update())