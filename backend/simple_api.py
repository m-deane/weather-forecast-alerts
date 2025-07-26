"""
Simple API server for development without database dependencies
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import json
import os

app = FastAPI(title="Scottish Mountain Weather API - Dev Mode")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load sample data from forecast files
def load_sample_data():
    """Load the most recent forecast data"""
    forecasts_dir = "../forecasts"
    try:
        # Get the most recent forecast file
        files = [f for f in os.listdir(forecasts_dir) if f.endswith('.json')]
        if not files:
            return None
        
        latest_file = sorted(files)[-1]
        with open(os.path.join(forecasts_dir, latest_file), 'r') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading sample data: {e}")
        return None

# Cache sample data
SAMPLE_DATA = load_sample_data()

@app.get("/")
async def root():
    return {"message": "Scottish Mountain Weather API - Development Mode", "status": "running"}

@app.get("/health")
async def health():
    return {"status": "healthy", "timestamp": datetime.now().isoformat()}

@app.get("/api/v1/locations")
async def get_locations():
    """Get all available locations"""
    if not SAMPLE_DATA:
        return {"locations": []}
    
    locations = []
    location_id = 1
    
    for area_name, area_data in SAMPLE_DATA.items():
        if isinstance(area_data, dict) and "locations" in area_data:
            for loc_name, loc_data in area_data["locations"].items():
                locations.append({
                    "id": location_id,
                    "name": loc_name,
                    "area": area_name,
                    "latitude": 57.0,  # Default coordinates
                    "longitude": -5.0,
                    "elevation": 900,
                    "classification": "Munro" if "Ben" in loc_name else "Corbett"
                })
                location_id += 1
    
    return {"locations": locations}

@app.get("/api/v1/weather/{location_id}")
async def get_weather(location_id: int):
    """Get weather for a specific location"""
    if not SAMPLE_DATA:
        return {"error": "No weather data available"}
    
    # Find the location
    current_id = 1
    for area_name, area_data in SAMPLE_DATA.items():
        if isinstance(area_data, dict) and "locations" in area_data:
            for loc_name, loc_data in area_data["locations"].items():
                if current_id == location_id:
                    # Return weather data
                    weather_data = {
                        "location": {
                            "id": location_id,
                            "name": loc_name,
                            "area": area_name
                        },
                        "current_conditions": {
                            "temperature": 5,
                            "wind_speed": 20,
                            "wind_direction": "NW",
                            "weather": "Partly cloudy",
                            "visibility": "Good"
                        },
                        "forecasts": [],
                        "hiking_score": 75,
                        "safety_level": "moderate"
                    }
                    
                    # Add forecast data if available
                    if "forecast" in loc_data:
                        for day_data in loc_data["forecast"]:
                            weather_data["forecasts"].append({
                                "date": day_data.get("date", "2024-01-01"),
                                "periods": {
                                    "morning": {
                                        "temperature": day_data.get("temp", {}).get("am", 5),
                                        "wind_speed": day_data.get("wind", {}).get("am", {}).get("speed", 20),
                                        "weather": day_data.get("weather", {}).get("am", "Cloudy")
                                    },
                                    "afternoon": {
                                        "temperature": day_data.get("temp", {}).get("pm", 7),
                                        "wind_speed": day_data.get("wind", {}).get("pm", {}).get("speed", 25),
                                        "weather": day_data.get("weather", {}).get("pm", "Rain")
                                    }
                                }
                            })
                    
                    return weather_data
                current_id += 1
    
    return {"error": "Location not found"}

@app.get("/api/v1/areas")
async def get_areas():
    """Get all areas"""
    if not SAMPLE_DATA:
        return {"areas": []}
    
    areas = []
    for area_name in SAMPLE_DATA.keys():
        if isinstance(SAMPLE_DATA[area_name], dict):
            areas.append({
                "name": area_name,
                "location_count": len(SAMPLE_DATA[area_name].get("locations", {}))
            })
    
    return {"areas": areas}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8015)