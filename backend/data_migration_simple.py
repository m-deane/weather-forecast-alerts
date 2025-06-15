"""Simple data migration script that handles schema properly"""
import os
import sys
import json
import logging
from datetime import datetime, date
from pathlib import Path
from decimal import Decimal
from typing import Optional

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
            "Beinn Alligin - Sgurr Mor": {"area": "Torridon", "elevation": 986, "lat": 57.5961, "lon": -5.5711},
            "Beinn Dearg": {"area": "Torridon", "elevation": 914, "lat": 57.6975, "lon": -5.4542},
            "Beinn Dearg Mor": {"area": "Torridon", "elevation": 914, "lat": 57.6975, "lon": -5.4542},
            "Beinn Damh": {"area": "Torridon", "elevation": 902, "lat": 57.5283, "lon": -5.5550},
            "Slioch": {"area": "Torridon", "elevation": 981, "lat": 57.6667, "lon": -5.3500},
            "An Ruadh Stac": {"area": "Torridon", "elevation": 896, "lat": 57.6333, "lon": -5.4833},
            "Baosbheinn": {"area": "Torridon", "elevation": 875, "lat": 57.7167, "lon": -5.6167},
            "Beinn Tarsuinn Corbett": {"area": "Torridon", "elevation": 863, "lat": 57.7000, "lon": -5.3667},
            
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
            "Beinn na Caillich (Knoydart)": {"area": "Knoydart", "elevation": 785, "lat": 57.0500, "lon": -5.6333},
            
            # Cairngorms
            "Ben Macdui": {"area": "Cairngorms", "elevation": 1309, "lat": 57.0704, "lon": -3.6689},
            "Cairn Gorm": {"area": "Cairngorms", "elevation": 1245, "lat": 57.1167, "lon": -3.6450},
            "Braeriach": {"area": "Cairngorms", "elevation": 1296, "lat": 57.0783, "lon": -3.7283},
            
            # Additional mountains from more areas
            "Aonach Beag": {"area": "Fort William", "elevation": 1234, "lat": 56.8017, "lon": -4.9717},
            "Ben Nevis": {"area": "Fort William", "elevation": 1344, "lat": 56.7969, "lon": -5.0036},
            "Carn Mor Dearg": {"area": "Fort William", "elevation": 1220, "lat": 56.8033, "lon": -4.9942},
            
            "Ben Cruachan": {"area": "Argyll", "elevation": 1126, "lat": 56.4267, "lon": -5.1317},
            "Ben Lui": {"area": "Argyll", "elevation": 1130, "lat": 56.3969, "lon": -4.8111},
            
            "Ben Lawers": {"area": "Perthshire", "elevation": 1214, "lat": 56.5456, "lon": -4.2211},
            "Ben Vane": {"area": "Perthshire", "elevation": 915, "lat": 56.2483, "lon": -4.7833},
            
            "Schiehallion": {"area": "Rannoch", "elevation": 1083, "lat": 56.6669, "lon": -4.0983},
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
        
        # Process forecast data - handle different formats
        if 'forecast_periods' in data:
            # New format with forecast_periods list
            for period_data in data['forecast_periods']:
                forecast_date = self.parse_date(period_data.get('full_date'))
                if not forecast_date:
                    continue
                    
                period = period_data.get('time', '').lower()
                if period not in ['am', 'pm', 'night']:
                    continue
                    
                self.create_weather_data_from_period(
                    db, location, source, 
                    forecast_date, period, period_data
                )
        else:
            # Old format with forecast dict
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
        name = name.strip()
        
        # Map area names to specific mountains
        area_to_mountain = {
            "Coigach": "Stac Pollaidh",  # Default mountain for Coigach area
            "Glencoe": "Bidean nam Bian",  # Default mountain for Glencoe area
            "Torridon": "Beinn Eighe",  # Default mountain for Torridon area
            "Skye": "Sgurr Alasdair",  # Default mountain for Skye area
            "Knoydart": "Ladhar Bheinn",  # Default mountain for Knoydart area
        }
        
        # If the name is just an area name, map it to a specific mountain
        if name in area_to_mountain:
            return area_to_mountain[name]
            
        return name
        
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
        
    def create_weather_data_from_period(self, db: Session, location: Location, 
                                      source: WeatherSource, forecast_date: date,
                                      period: str, data: dict):
        """Create weather data entry from forecast_periods format"""
        # Map period names
        period_map = {
            'am': 'morning',
            'pm': 'afternoon', 
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
            
        # Extract weather data from new format
        weather_data = WeatherData(
            location_id=location.id,
            source_id=source.id,
            forecast_date=forecast_date,
            period_type=period_type,
            period_index=0,
            
            # Temperature - using average of min/max
            temperature_c=self.extract_number((data.get('temp_max_c', 0) + data.get('temp_min_c', 0)) / 2 if data.get('temp_max_c') else None),
            feels_like_c=self.extract_number(data.get('temp_chill_c')),
            
            # Wind
            wind_speed_kmh=self.extract_number(data.get('wind_kph')),
            wind_direction=data.get('wind_dir'),
            
            # Precipitation
            precipitation_mm=self.extract_number(data.get('rain_mm', 0)) + self.extract_number(data.get('snow_cm', 0)) * 10,  # Convert snow cm to mm
            precipitation_type='snow' if data.get('snow_cm', 0) > 0 else 'rain' if data.get('rain_mm', 0) > 0 else None,
            
            # Other conditions
            cloud_base_m=self.extract_number(data.get('cloud_base_m')),
            freezing_level_m=self.extract_number(data.get('freezing_level_m')),
            
            # Conditions
            summit_conditions=data.get('summary', ''),
            
            # Calculate hiking score (simple version)
            hiking_score=self.calculate_simple_hiking_score({
                'wind': {'value': data.get('wind_kph')},
                'temp': {'value': (data.get('temp_max_c', 0) + data.get('temp_min_c', 0)) / 2 if data.get('temp_max_c') else None},
                'rain': {'value': data.get('rain_mm', 0)},
                'snow': {'value': data.get('snow_cm', 0)}
            }),
            
            # Store raw data
            raw_data=data
        )
        
        db.add(weather_data)

if __name__ == "__main__":
    migration = SimpleDataMigration()
    migration.run_migration()