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