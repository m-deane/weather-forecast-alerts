"""
Simple API for testing the Scottish Mountain Weather App
This provides mock data to test the frontend without requiring database setup
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import json
from datetime import datetime, timedelta
import uvicorn
import glob
import os
import random
import hashlib
import subprocess
import threading
from pathlib import Path
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)


def stable_mock_value(location_id: str, field: str, lo: int, hi: int) -> int:
    """Generate a deterministic mock value based on location+field so repeated calls return stable data"""
    seed = int(hashlib.md5(f"{location_id}:{field}".encode()).hexdigest(), 16) % (hi - lo + 1)
    return lo + seed

app = FastAPI(
    title="Scottish Mountain Weather API (Mock)",
    description="Mock API for testing the frontend",
    version="1.0.0-mock"
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://127.0.0.1:3000", "http://127.0.0.1:3001"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Path to forecast directory
FORECAST_DIR = Path(__file__).parent.parent / "forecasts"

# Scoring algorithm constants (synced with weather_scraper.py - recalibrated for realistic Scottish conditions)
SCORE_WEIGHT_WIND = 3.0    # Penalty per 10kph over 15kph — wind is the #1 hazard on Scottish summits
SCORE_WEIGHT_RAIN = 2.0    # Penalty per mm rain — wet conditions rapidly increase hypothermia risk
SCORE_WEIGHT_SNOW = 4.0    # Penalty per cm snow — avalanche/slip risk
SCORE_WEIGHT_COLD = 1.2    # Penalty per degree below 0°C — cold is the primary killer
SCORE_WEIGHT_HOT = 0.5     # Penalty per degree above 25°C (rare in Scotland)
SCORE_WEIGHT_CLOUD = 0.6   # Penalty per 100m cloud base is below summit — navigation risk in cloud

def calculate_hiking_score(temp_min, temp_max, temp_chill, wind_kph, rain_mm=0, snow_cm=0,
                            cloud_base_m=None, elevation_m=None):
    """Calculate hiking suitability score (1-10, 10=perfect).

    10.0 requires genuinely exceptional conditions: wind <20kph, no precipitation,
    above-freezing temps, and cloud base above the summit.
    """
    penalty_score = 0

    # Use wind chill if more severe
    effective_min_temp = temp_min
    if temp_chill is not None and temp_min is not None:
        effective_min_temp = min(temp_min, temp_chill)
    elif temp_chill is not None:
        effective_min_temp = temp_chill

    # Cold penalty
    if effective_min_temp is not None and effective_min_temp < 0:
        penalty_score += abs(effective_min_temp) * SCORE_WEIGHT_COLD

    # Heat penalty
    if temp_max is not None and temp_max > 25:
        penalty_score += (temp_max - 25) * SCORE_WEIGHT_HOT

    # Wind penalty — threshold 15kph; 20kph on a summit is noticeable, 30kph is hazardous
    if wind_kph is not None and wind_kph > 15:
        penalty_score += ((wind_kph - 15) / 10) * SCORE_WEIGHT_WIND

    # Precipitation penalties
    if rain_mm: penalty_score += rain_mm * SCORE_WEIGHT_RAIN
    if snow_cm: penalty_score += snow_cm * SCORE_WEIGHT_SNOW

    # Cloud base penalty — being in cloud means poor visibility and navigation risk
    # Penalty scales with how far below the summit the cloud base sits, capped at 3.0
    if cloud_base_m is not None and elevation_m is not None and cloud_base_m < elevation_m:
        cloud_deficit_m = elevation_m - cloud_base_m
        penalty_score += min(4.0, (cloud_deficit_m / 100) * SCORE_WEIGHT_CLOUD)

    return round(max(1.0, 10.0 - penalty_score), 1)

def get_risk_level(score):
    """Convert score to risk level"""
    if score >= 8: return "low"
    elif score >= 6: return "moderate"
    elif score >= 4: return "high"
    else: return "extreme"

def find_latest_forecast(location_name: str) -> Optional[Dict]:
    """Find the most recent forecast JSON file for a location"""
    if not FORECAST_DIR.exists():
        return None

    # Strip special chars and normalize: "A'Mhaighdean" -> "AMhaighdean", "Beinn na Caillich (Knoydart)" -> "Beinn_na_Caillich_Knoydart"
    clean_name = location_name.replace("'", '').replace("'", '').replace('(', '').replace(')', '').replace('  ', ' ').strip()

    # Search all subdirectories for forecast files matching location name
    pattern = f"**/*{clean_name.replace(' ', '_')}*mountain-forecast.com.json"
    files = list(FORECAST_DIR.glob(pattern))

    if not files:
        # Try without spaces
        pattern = f"**/*{clean_name.replace(' ', '')}*mountain-forecast.com.json"
        files = list(FORECAST_DIR.glob(pattern))

    if not files:
        return None

    # Get the most recent file
    latest_file = max(files, key=lambda p: p.stat().st_mtime)

    try:
        with open(latest_file, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error("Error loading forecast for %s: %s", location_name, e)
        return None

def convert_forecast_to_api_format(forecast_data: Dict, location: Dict) -> Optional[Dict]:
    """Convert scraped forecast JSON to API response format"""
    if not forecast_data or "forecast_periods" not in forecast_data:
        return None

    # Group periods by day
    daily_forecasts = defaultdict(list)
    for period in forecast_data["forecast_periods"]:
        date = period.get("full_date", "")
        if date:
            daily_forecasts[date].append(period)

    # Convert to API format
    forecasts = []
    for date_str in sorted(daily_forecasts.keys())[:6]:  # Max 6 days
        periods_data = daily_forecasts[date_str]

        # Convert each period
        api_periods = []
        for p in periods_data:
            score = calculate_hiking_score(
                temp_min=p.get("temp_min_c"),
                temp_max=p.get("temp_max_c"),
                temp_chill=p.get("temp_chill_c"),
                wind_kph=p.get("wind_kph"),
                rain_mm=p.get("rain_mm", 0),
                snow_cm=p.get("snow_cm", 0),
                cloud_base_m=p.get("cloud_base_m"),
                elevation_m=location.get("elevation_m")
            )

            rain_mm = p.get("rain_mm", 0)
            snow_cm = p.get("snow_cm", 0)
            total_precip = rain_mm + (snow_cm * 10)  # Convert snow to water equivalent
            temp_c = p.get("temp_max_c", 0)
            # Derive precipitation type from available data
            if total_precip == 0:
                precip_type = "none"
            elif snow_cm > 0 and rain_mm == 0:
                precip_type = "snow"
            elif snow_cm > 0 and rain_mm > 0:
                precip_type = "sleet"
            else:
                precip_type = "rain"

            api_periods.append({
                "period_type": p.get("time", "").lower(),
                "temperature_c": temp_c,
                "feels_like_c": p.get("temp_chill_c"),
                "wind_speed_kph": p.get("wind_kph", 0),
                "wind_direction": p.get("wind_dir", ""),
                "precipitation_mm": total_precip,
                "precipitation_type": precip_type,
                "weather_description": p.get("summary", ""),
                # MOCK FALLBACK: Scraper does not collect visibility data;
                # deterministic per location+date to avoid non-deterministic UI changes
                "visibility_m": stable_mock_value(location.get("id", "") + date_str, "visibility", 2000, 15000),
                "cloud_base_m": p.get("cloud_base_m", 1000),
                # MOCK FALLBACK: Scraper does not collect humidity data;
                # deterministic per location+date to avoid non-deterministic UI changes
                "humidity_percent": stable_mock_value(location.get("id", "") + date_str, "humidity", 50, 95),
                "hiking_score": score,
                "risk_level": get_risk_level(score),
                "snow_cm": p.get("snow_cm", 0),
                "freezing_level_m": p.get("freezing_level_m")
            })

        # Calculate daily summary
        if api_periods:
            # Use is-not-None check so 0°C and 0kph readings are included correctly
            temps = [p["temperature_c"] for p in api_periods if p["temperature_c"] is not None]
            winds = [p["wind_speed_kph"] for p in api_periods if p["wind_speed_kph"] is not None]
            precip = sum(p["precipitation_mm"] for p in api_periods)
            scores = [p["hiking_score"] for p in api_periods]

            forecasts.append({
                "date": date_str,
                "summary": {
                    "max_temp_c": max(temps) if temps else 0,
                    "min_temp_c": min(temps) if temps else 0,
                    "max_wind_speed_kph": max(winds) if winds else 0,
                    "total_precipitation_mm": round(precip, 1),
                    # Use minimum period score (most conservative/safe): project principle is
                    # "conservative scoring preferred" — worst period sets the day's rating
                    "overall_hiking_score": min(scores) if scores else 5.0,
                    "dominant_conditions": api_periods[0]["weather_description"] if api_periods else "Unknown",
                    "best_period": max(api_periods, key=lambda p: p["hiking_score"])["period_type"] if api_periods else "am"
                },
                "periods": api_periods
            })

    return {
        "location": location,
        "forecasts": forecasts,
        "last_updated": forecast_data.get("scrape_time", datetime.now().isoformat()),
        "data_source": "mountain-forecast.com (scraped)",
        "alerts": []
    }

# Mock data - All Scottish mountains from config.yaml (auto-generated)
MOCK_LOCATIONS = [

    # Torridon area
    {
        "id": "torridon-beinn-eighe",
        "name": "Beinn Eighe",
        "area": "Torridon",
        "latitude": 57.546,
        "longitude": -5.547,
        "elevation_m": 1010,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-liathach",
        "name": "Liathach",
        "area": "Torridon",
        "latitude": 57.551,
        "longitude": -5.544,
        "elevation_m": 1053,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-maol-cheann-dearg",
        "name": "Maol Cheann-dearg",
        "area": "Torridon",
        "latitude": 57.556,
        "longitude": -5.541,
        "elevation_m": 933,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-beinn-alligin-sgurr-mor",
        "name": "Beinn Alligin - Sgurr Mor",
        "area": "Torridon",
        "latitude": 57.561,
        "longitude": -5.538,
        "elevation_m": 986,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-baosbheinn",
        "name": "Baosbheinn",
        "area": "Torridon",
        "latitude": 57.566,
        "longitude": -5.535,
        "elevation_m": 875,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-an-ruadh-stac",
        "name": "An Ruadh Stac",
        "area": "Torridon",
        "latitude": 57.571,
        "longitude": -5.532,
        "elevation_m": 892,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-beinn-damh",
        "name": "Beinn Damh",
        "area": "Torridon",
        "latitude": 57.576,
        "longitude": -5.529,
        "elevation_m": 903,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-a-mhaighdean",
        "name": "A'Mhaighdean",
        "area": "Torridon",
        "latitude": 57.581,
        "longitude": -5.526,
        "elevation_m": 967,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-slioch",
        "name": "Slioch",
        "area": "Torridon",
        "latitude": 57.586,
        "longitude": -5.523,
        "elevation_m": 981,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-an-teallach",
        "name": "An Teallach",
        "area": "Torridon",
        "latitude": 57.591,
        "longitude": -5.52,
        "elevation_m": 1062,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-cul-beag",
        "name": "Cul Beag",
        "area": "Torridon",
        "latitude": 57.596,
        "longitude": -5.517,
        "elevation_m": 769,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-beinn-dearg-mor",
        "name": "Beinn Dearg Mor",
        "area": "Torridon",
        "latitude": 57.601,
        "longitude": -5.514,
        "elevation_m": 910,
        "classification": "corbett",
        "difficulty": "moderate"
    },
    {
        "id": "torridon-beinn-tarsuinn-corbett",
        "name": "Beinn Tarsuinn Corbett",
        "area": "Torridon",
        "latitude": 57.606,
        "longitude": -5.511,
        "elevation_m": 826,
        "classification": "corbett",
        "difficulty": "moderate"
    },

    # Glencoe area
    {
        "id": "glencoe-bidean-nam-bian",
        "name": "Bidean nam Bian",
        "area": "Glencoe",
        "latitude": 56.67,
        "longitude": -5.03,
        "elevation_m": 1150,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glencoe-ben-starav",
        "name": "Ben Starav",
        "area": "Glencoe",
        "latitude": 56.675,
        "longitude": -5.027,
        "elevation_m": 1078,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glencoe-buachaille-etive-mor",
        "name": "Buachaille Etive Mor",
        "area": "Glencoe",
        "latitude": 56.68,
        "longitude": -5.024,
        "elevation_m": 1020,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Coigach area
    {
        "id": "coigach-ben-more-coigach",
        "name": "Ben More Coigach",
        "area": "Coigach",
        "latitude": 58.0,
        "longitude": -5.3,
        "elevation_m": 743,
        "classification": "graham",
        "difficulty": "moderate"
    },
    {
        "id": "coigach-suilven",
        "name": "Suilven",
        "area": "Coigach",
        "latitude": 58.005,
        "longitude": -5.297,
        "elevation_m": 731,
        "classification": "graham",
        "difficulty": "moderate"
    },
    {
        "id": "coigach-stac-pollaidh",
        "name": "Stac Pollaidh",
        "area": "Coigach",
        "latitude": 58.01,
        "longitude": -5.294,
        "elevation_m": 613,
        "classification": "graham",
        "difficulty": "moderate"
    },

    # Skye (Cuillin) area
    {
        "id": "skye-cuillin-bla-bheinn",
        "name": "Bla Bheinn",
        "area": "Skye (Cuillin)",
        "latitude": 57.217,
        "longitude": -6.27,
        "elevation_m": 928,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "skye-cuillin-sgurr-alasdair",
        "name": "Sgurr Alasdair",
        "area": "Skye (Cuillin)",
        "latitude": 57.222,
        "longitude": -6.267,
        "elevation_m": 992,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "skye-cuillin-sgurr-na-banachdich",
        "name": "Sgurr na Banachdich",
        "area": "Skye (Cuillin)",
        "latitude": 57.227,
        "longitude": -6.264,
        "elevation_m": 965,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "skye-cuillin-bruach-na-frithe",
        "name": "Bruach na Frithe",
        "area": "Skye (Cuillin)",
        "latitude": 57.232,
        "longitude": -6.261,
        "elevation_m": 958,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "skye-cuillin-sgurr-nan-gillean",
        "name": "Sgurr nan Gillean",
        "area": "Skye (Cuillin)",
        "latitude": 57.237,
        "longitude": -6.258,
        "elevation_m": 964,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Knoydart (Inverie) area
    {
        "id": "knoydart-inverie-beinn-na-caillich-knoydart",
        "name": "Beinn na Caillich (Knoydart)",
        "area": "Knoydart (Inverie)",
        "latitude": 57.038,
        "longitude": -5.693,
        "elevation_m": 785,
        "classification": "corbett",
        "difficulty": "moderate"
    },

    # Cairngorms area
    {
        "id": "cairngorms-ben-macdui",
        "name": "Ben Macdui",
        "area": "Cairngorms",
        "latitude": 57.083,
        "longitude": -3.666,
        "elevation_m": 1309,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "cairngorms-cairngorm",
        "name": "Cairngorm",
        "area": "Cairngorms",
        "latitude": 57.088,
        "longitude": -3.663,
        "elevation_m": 1234,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "cairngorms-braeriach",
        "name": "Braeriach",
        "area": "Cairngorms",
        "latitude": 57.093,
        "longitude": -3.66,
        "elevation_m": 1296,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "cairngorms-cairn-toul",
        "name": "Cairn Toul",
        "area": "Cairngorms",
        "latitude": 57.098,
        "longitude": -3.657,
        "elevation_m": 1291,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "cairngorms-ben-avon",
        "name": "Ben Avon",
        "area": "Cairngorms",
        "latitude": 57.103,
        "longitude": -3.654,
        "elevation_m": 1171,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Ben Nevis area
    {
        "id": "ben-nevis-ben-nevis",
        "name": "Ben Nevis",
        "area": "Ben Nevis",
        "latitude": 56.797,
        "longitude": -5.003,
        "elevation_m": 1344,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-aonach-beag",
        "name": "Aonach Beag",
        "area": "Ben Nevis",
        "latitude": 56.802,
        "longitude": -5.0,
        "elevation_m": 1234,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-aonach-mor",
        "name": "Aonach Mor",
        "area": "Ben Nevis",
        "latitude": 56.807,
        "longitude": -4.997,
        "elevation_m": 1221,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-carn-mor-dearg",
        "name": "Carn Mor Dearg",
        "area": "Ben Nevis",
        "latitude": 56.812,
        "longitude": -4.994,
        "elevation_m": 1223,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-nevis-stob-ban-grey-corries",
        "name": "Stob Ban (Grey Corries)",
        "area": "Ben Nevis",
        "latitude": 56.817,
        "longitude": -4.991,
        "elevation_m": 977,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Glen Shiel area
    {
        "id": "glen-shiel-sgurr-fhuaran",
        "name": "Sgurr Fhuaran",
        "area": "Glen Shiel",
        "latitude": 57.16,
        "longitude": -5.41,
        "elevation_m": 1067,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glen-shiel-the-saddle",
        "name": "The Saddle",
        "area": "Glen Shiel",
        "latitude": 57.165,
        "longitude": -5.407,
        "elevation_m": 1010,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glen-shiel-sgurr-na-ciste-duibhe",
        "name": "Sgurr na Ciste Duibhe",
        "area": "Glen Shiel",
        "latitude": 57.17,
        "longitude": -5.404,
        "elevation_m": 1027,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glen-shiel-sgurr-na-sgine",
        "name": "Sgurr na Sgine",
        "area": "Glen Shiel",
        "latitude": 57.175,
        "longitude": -5.401,
        "elevation_m": 946,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glen-shiel-sgurr-a-bhealaich-dheirg",
        "name": "Sgurr a' Bhealaich Dheirg",
        "area": "Glen Shiel",
        "latitude": 57.18,
        "longitude": -5.398,
        "elevation_m": 1036,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "glen-shiel-ciste-dhubh",
        "name": "Ciste Dhubh",
        "area": "Glen Shiel",
        "latitude": 57.185,
        "longitude": -5.395,
        "elevation_m": 979,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Mamores area
    {
        "id": "mamores-sgurr-a-mhaim",
        "name": "Sgurr a' Mhaim",
        "area": "Mamores",
        "latitude": 56.75,
        "longitude": -5.07,
        "elevation_m": 1099,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "mamores-binnein-mor",
        "name": "Binnein Mor",
        "area": "Mamores",
        "latitude": 56.755,
        "longitude": -5.067,
        "elevation_m": 1130,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "mamores-stob-ban-mamores",
        "name": "Stob Ban (Mamores)",
        "area": "Mamores",
        "latitude": 56.76,
        "longitude": -5.064,
        "elevation_m": 999,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "mamores-na-gruagaichean",
        "name": "Na Gruagaichean",
        "area": "Mamores",
        "latitude": 56.765,
        "longitude": -5.061,
        "elevation_m": 1056,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "mamores-am-bodach",
        "name": "Am Bodach",
        "area": "Mamores",
        "latitude": 56.77,
        "longitude": -5.058,
        "elevation_m": 1032,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "mamores-binnein-beag",
        "name": "Binnein Beag",
        "area": "Mamores",
        "latitude": 56.775,
        "longitude": -5.055,
        "elevation_m": 943,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Ben Lawers area
    {
        "id": "ben-lawers-ben-lawers",
        "name": "Ben Lawers",
        "area": "Ben Lawers",
        "latitude": 56.546,
        "longitude": -4.221,
        "elevation_m": 1204,
        "classification": "munro",
        "difficulty": "challenging"
    },
    {
        "id": "ben-lawers-meall-nan-tarmachan",
        "name": "Meall nan Tarmachan",
        "area": "Ben Lawers",
        "latitude": 56.551,
        "longitude": -4.218,
        "elevation_m": 1043,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "ben-lawers-an-stuc",
        "name": "An Stuc",
        "area": "Ben Lawers",
        "latitude": 56.556,
        "longitude": -4.215,
        "elevation_m": 1118,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Arrochar Alps area
    {
        "id": "arrochar-alps-beinn-ime",
        "name": "Beinn Ime",
        "area": "Arrochar Alps",
        "latitude": 56.25,
        "longitude": -4.8,
        "elevation_m": 1011,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "arrochar-alps-ben-vorlich-loch-lomond",
        "name": "Ben Vorlich (Loch Lomond)",
        "area": "Arrochar Alps",
        "latitude": 56.255,
        "longitude": -4.797,
        "elevation_m": 943,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "arrochar-alps-beinn-narnain",
        "name": "Beinn Narnain",
        "area": "Arrochar Alps",
        "latitude": 56.26,
        "longitude": -4.794,
        "elevation_m": 926,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "arrochar-alps-ben-vane",
        "name": "Ben Vane",
        "area": "Arrochar Alps",
        "latitude": 56.265,
        "longitude": -4.791,
        "elevation_m": 915,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Crianlarich area
    {
        "id": "crianlarich-ben-more-crianlarich",
        "name": "Ben More (Crianlarich)",
        "area": "Crianlarich",
        "latitude": 56.39,
        "longitude": -4.62,
        "elevation_m": 1174,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "crianlarich-stob-binnein",
        "name": "Stob Binnein",
        "area": "Crianlarich",
        "latitude": 56.395,
        "longitude": -4.617,
        "elevation_m": 1165,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "crianlarich-ben-lui",
        "name": "Ben Lui",
        "area": "Crianlarich",
        "latitude": 56.4,
        "longitude": -4.614,
        "elevation_m": 1130,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "crianlarich-ben-oss",
        "name": "Ben Oss",
        "area": "Crianlarich",
        "latitude": 56.405,
        "longitude": -4.611,
        "elevation_m": 1029,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "crianlarich-beinn-dorain",
        "name": "Beinn Dorain",
        "area": "Crianlarich",
        "latitude": 56.41,
        "longitude": -4.608,
        "elevation_m": 1076,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Affric area
    {
        "id": "affric-mam-sodhail",
        "name": "Mam Sodhail",
        "area": "Affric",
        "latitude": 57.25,
        "longitude": -5.15,
        "elevation_m": 1181,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "affric-carn-eige",
        "name": "Carn Eige",
        "area": "Affric",
        "latitude": 57.255,
        "longitude": -5.147,
        "elevation_m": 1183,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "affric-sgurr-nan-ceathreamhnan",
        "name": "Sgurr nan Ceathreamhnan",
        "area": "Affric",
        "latitude": 57.26,
        "longitude": -5.144,
        "elevation_m": 1151,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Creag Meagaidh area
    {
        "id": "creag-meagaidh-creag-meagaidh",
        "name": "Creag Meagaidh",
        "area": "Creag Meagaidh",
        "latitude": 56.95,
        "longitude": -4.6,
        "elevation_m": 1128,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Loch Lomond area
    {
        "id": "loch-lomond-ben-lomond",
        "name": "Ben Lomond",
        "area": "Loch Lomond",
        "latitude": 56.16,
        "longitude": -4.64,
        "elevation_m": 974,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Eastern Highlands area
    {
        "id": "eastern-highlands-lochnagar",
        "name": "Lochnagar",
        "area": "Eastern Highlands",
        "latitude": 56.95,
        "longitude": -3.25,
        "elevation_m": 1155,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "eastern-highlands-beinn-a-ghlo",
        "name": "Beinn a' Ghlo",
        "area": "Eastern Highlands",
        "latitude": 56.955,
        "longitude": -3.247,
        "elevation_m": 1129,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "eastern-highlands-mount-keen",
        "name": "Mount Keen",
        "area": "Eastern Highlands",
        "latitude": 56.96,
        "longitude": -3.244,
        "elevation_m": 939,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "eastern-highlands-schiehallion",
        "name": "Schiehallion",
        "area": "Eastern Highlands",
        "latitude": 56.965,
        "longitude": -3.241,
        "elevation_m": 1083,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "eastern-highlands-ben-chonzie",
        "name": "Ben Chonzie",
        "area": "Eastern Highlands",
        "latitude": 56.97,
        "longitude": -3.238,
        "elevation_m": 931,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Far North area
    {
        "id": "far-north-ben-hope",
        "name": "Ben Hope",
        "area": "Far North",
        "latitude": 58.388,
        "longitude": -4.6,
        "elevation_m": 927,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "far-north-ben-klibreck",
        "name": "Ben Klibreck",
        "area": "Far North",
        "latitude": 58.393,
        "longitude": -4.597,
        "elevation_m": 962,
        "classification": "munro",
        "difficulty": "moderate"
    },

    # Drumochter area
    {
        "id": "drumochter-a-bhuidheanach-bheag",
        "name": "A' Bhuidheanach Bheag",
        "area": "Drumochter",
        "latitude": 56.87,
        "longitude": -4.3,
        "elevation_m": 936,
        "classification": "munro",
        "difficulty": "moderate"
    },
    {
        "id": "drumochter-carn-dearg-loch-ossian",
        "name": "Carn Dearg (Loch Ossian)",
        "area": "Drumochter",
        "latitude": 56.875,
        "longitude": -4.297,
        "elevation_m": 941,
        "classification": "munro",
        "difficulty": "moderate"
    },
]

def get_seasonal_base_temp() -> int:
    """Return a realistic base temperature for Scottish mountains based on current month.
    Scottish mountain summit temps (approx): Jan=-5, Feb=-4, Mar=-2, Apr=1, May=4, Jun=7,
    Jul=9, Aug=9, Sep=6, Oct=3, Nov=0, Dec=-3"""
    monthly_temps = {1: -5, 2: -4, 3: -2, 4: 1, 5: 4, 6: 7,
                     7: 9, 8: 9, 9: 6, 10: 3, 11: 0, 12: -3}
    return monthly_temps.get(datetime.now().month, 3)


def generate_mock_weather_period(period_type: str, base_temp: int = None, days_offset: int = 0):
    """Generate mock weather data for a specific period.
    base_temp defaults to seasonal Scottish mountain temperatures if not provided."""
    import random

    if base_temp is None:
        base_temp = get_seasonal_base_temp()

    temp_variance = random.randint(-5, 8)
    wind_variance = random.randint(-10, 15)

    if period_type == "am":
        temp_adj = -2
    elif period_type == "pm":
        temp_adj = 3
    else:  # night
        temp_adj = -5

    temperature = base_temp + temp_adj + temp_variance
    wind_speed = max(5, 25 + wind_variance)
    precipitation = random.choice([0, 0, 0.5, 2, 5, 10]) if days_offset < 3 else random.choice([0, 1, 3, 8])

    # Derive snow vs rain based on temperature (realistic for Scottish mountains)
    snow_cm = 0
    rain_mm = precipitation
    if temperature <= 0 and precipitation > 0:
        snow_cm = round(precipitation * 0.8, 1)  # Approximate snow equivalent
        rain_mm = 0
    elif temperature <= 2 and precipitation > 0:
        snow_cm = round(precipitation * 0.3, 1)  # Mixed sleet/snow
        rain_mm = round(precipitation * 0.5, 1)

    # Calculate hiking score using the same algorithm as real data
    # Start at 10 (perfect conditions) and apply penalties
    score = calculate_hiking_score(
        temp_min=temperature - 3,
        temp_max=temperature,
        temp_chill=temperature - 5 if wind_speed > 20 else temperature,
        wind_kph=wind_speed,
        rain_mm=rain_mm,
        snow_cm=snow_cm,
        cloud_base_m=None,   # Mock data: no cloud base available
        elevation_m=None
    )
    
    risk_levels = ["low", "moderate", "high", "extreme"]
    if score >= 8: risk_level = "low"
    elif score >= 6: risk_level = "moderate" 
    elif score >= 4: risk_level = "high"
    else: risk_level = "extreme"
    
    weather_descriptions = [
        "Clear skies", "Partly cloudy", "Overcast", "Light rain", 
        "Heavy rain", "Snow showers", "Sunny spells", "Misty"
    ]
    
    # Derive precipitation type from snow/rain split
    if rain_mm == 0 and snow_cm == 0:
        precip_type = "none"
    elif snow_cm > 0 and rain_mm == 0:
        precip_type = "snow"
    elif snow_cm > 0 and rain_mm > 0:
        precip_type = "sleet"
    else:
        precip_type = "rain"

    return {
        "period_type": period_type,
        "temperature_c": temperature,
        "feels_like_c": temperature - 2,
        "wind_speed_kph": wind_speed,
        "wind_direction": random.choice(["N", "NE", "E", "SE", "S", "SW", "W", "NW"]),
        "precipitation_mm": rain_mm + (snow_cm * 10),
        "precipitation_type": precip_type,
        "weather_description": random.choice(weather_descriptions),
        "visibility_m": random.randint(2000, 25000),
        "cloud_base_m": random.randint(300, 2000),
        "humidity_percent": random.randint(60, 95),
        "hiking_score": score,
        "risk_level": risk_level,
        "snow_cm": snow_cm
    }

def generate_mock_forecast(location: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a complete mock forecast for a location"""
    forecasts = []
    base_date = datetime.now().date()
    
    for day_offset in range(6):
        date = base_date + timedelta(days=day_offset)
        
        periods = [
            generate_mock_weather_period("am", days_offset=day_offset),
            generate_mock_weather_period("pm", days_offset=day_offset), 
            generate_mock_weather_period("night", days_offset=day_offset)
        ]
        
        # Calculate daily summary
        temps = [p["temperature_c"] for p in periods if p["temperature_c"] is not None]
        winds = [p["wind_speed_kph"] for p in periods if p["wind_speed_kph"] is not None]
        precip = sum(p["precipitation_mm"] for p in periods)
        scores = [p["hiking_score"] for p in periods]

        daily_forecast = {
            "date": date.isoformat(),
            "summary": {
                "max_temp_c": max(temps) if temps else 0,
                "min_temp_c": min(temps) if temps else 0,
                "max_wind_speed_kph": max(winds) if winds else 0,
                "total_precipitation_mm": precip,
                # Use minimum period score (most conservative/safe) — worst period sets the day's rating
                "overall_hiking_score": min(scores) if scores else 5.0,
                "dominant_conditions": "Mixed conditions",
                "best_period": max(periods, key=lambda p: p["hiking_score"])["period_type"]
            },
            "periods": periods
        }
        forecasts.append(daily_forecast)
    
    return {
        "location": location,
        "forecasts": forecasts,
        "last_updated": datetime.now().isoformat(),
        "data_source": "estimated (no forecast data available)",
        "alerts": [{
            "severity": "info",
            "message": "This location is showing estimated data. Real forecast data is not yet available."
        }]
    }

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Scottish Mountain Weather API (Mock)",
        "version": "1.0.0-mock",
        "status": "operational",
        "documentation": "/docs"
    }

@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "mock-api"}

@app.post("/api/metrics")
async def post_metrics(data: Dict[str, Any] = None):
    """Accept metrics data from frontend (no-op for mock API)"""
    # In a real implementation, this would store metrics
    # For mock API, we just acknowledge receipt
    return {"status": "received", "timestamp": datetime.now().isoformat()}

# --- Scrape trigger endpoints ---

scrape_status: Dict[str, Any] = {"state": "idle", "last_run": None, "last_error": None}

@app.post("/api/v1/scrape/trigger")
async def trigger_scrape():
    """Trigger a weather scrape run in the background"""
    if scrape_status["state"] == "running":
        return {"status": "already_running", "message": "Scrape already in progress"}

    def run_scrape():
        scrape_status["state"] = "running"
        try:
            result = subprocess.run(
                ["python", "weather_scraper.py"],
                cwd=str(Path(__file__).parent.parent),
                capture_output=True, text=True, timeout=600
            )
            scrape_status["last_run"] = datetime.now().isoformat()
            if result.returncode != 0:
                scrape_status["last_error"] = result.stderr[:500]
            else:
                scrape_status["last_error"] = None
        except Exception as e:
            scrape_status["last_error"] = str(e)
        finally:
            scrape_status["state"] = "idle"

    thread = threading.Thread(target=run_scrape, daemon=True)
    thread.start()
    return {"status": "started", "message": "Scrape triggered"}

@app.get("/api/v1/scrape/status")
async def get_scrape_status():
    """Get current scrape status"""
    return scrape_status

# --- End scrape trigger endpoints ---

@app.get("/api/v1/locations")
async def get_locations(
    search: str = None,
    area: str = None,
    classification: str = None,
    limit: int = 100
):
    """Get list of locations with optional filtering"""
    locations = MOCK_LOCATIONS.copy()
    
    if search:
        search_lower = search.lower()
        locations = [loc for loc in locations if search_lower in loc["name"].lower() or search_lower in loc["area"].lower()]
    
    if area:
        locations = [loc for loc in locations if loc["area"].lower() == area.lower()]
        
    if classification:
        locations = [loc for loc in locations if loc["classification"] == classification]
    
    return {
        "locations": locations[:limit],
        "total": len(locations),
        "limit": limit
    }

@app.get("/api/v1/weather/compare")
async def compare_weather(location_ids: str):
    """Compare weather across multiple locations"""
    ids = location_ids.split(",")
    comparisons = []

    for location_id in ids:
        location = next((loc for loc in MOCK_LOCATIONS if loc["id"] == location_id.strip()), None)
        if location:
            # Try real data first, same as single weather endpoint
            forecast_data = find_latest_forecast(location["name"])
            if forecast_data:
                real_forecast = convert_forecast_to_api_format(forecast_data, location)
                if real_forecast:
                    comparisons.append(real_forecast)
                    continue
            comparisons.append(generate_mock_forecast(location))

    return {"comparisons": comparisons}

@app.get("/api/v1/weather/{location_id}")
async def get_weather(location_id: str):
    """Get weather forecast for a specific location"""
    location = next((loc for loc in MOCK_LOCATIONS if loc["id"] == location_id), None)

    if not location:
        raise HTTPException(status_code=404, detail="Location not found")

    # Try to load real scraped forecast data
    forecast_data = find_latest_forecast(location["name"])
    if forecast_data:
        real_forecast = convert_forecast_to_api_format(forecast_data, location)
        if real_forecast:
            logger.info("Serving REAL forecast for %s", location['name'])
            return real_forecast

    # Fall back to mock data if no real forecast available
    logger.info("No real forecast found for %s, using mock data", location['name'])
    return generate_mock_forecast(location)

@app.get("/api/v1/areas")
async def get_areas():
    """Get list of mountain areas"""
    area_names = list(set(loc["area"] for loc in MOCK_LOCATIONS))
    areas_with_counts = []
    
    for area_name in area_names:
        location_count = len([loc for loc in MOCK_LOCATIONS if loc["area"] == area_name])
        areas_with_counts.append({
            "id": area_name.lower().replace(" ", "-"),
            "name": area_name,
            "locationCount": location_count
        })
    
    return areas_with_counts

# ---- Integration endpoints: Photos, Routes, Photography Viewpoints ----

DATA_DIR = Path(__file__).parent.parent / "data"

def _load_json_data(filename: str) -> Dict:
    """Load a JSON data file from the data/ directory"""
    filepath = DATA_DIR / filename
    if not filepath.exists():
        return {}
    try:
        with open(filepath, 'r') as f:
            return json.load(f)
    except Exception as e:
        logger.error("Error loading %s: %s", filename, e)
        return {}

@app.get("/api/v1/locations/{location_id}/photos")
async def get_location_photos(location_id: str):
    """Get curated photos for a mountain location"""
    photos_data = _load_json_data("mountain_photos.json")
    entry = photos_data.get(location_id, {})
    return {"photos": entry.get("photos", [])}

@app.get("/api/v1/locations/{location_id}/routes")
async def get_location_routes(location_id: str):
    """Get Walk Highlands walking routes for a location"""
    routes_data = _load_json_data("walkhighlands_routes.json")
    entry = routes_data.get(location_id, {})
    return {"routes": entry.get("routes", [])}

@app.get("/api/v1/locations/{location_id}/photography")
async def get_location_photography(location_id: str):
    """Get photography viewpoint data for a location"""
    viewpoints_data = _load_json_data("photography_viewpoints.json")
    entry = viewpoints_data.get(location_id)
    if not entry:
        raise HTTPException(status_code=404, detail="No photography data for this location")
    return entry


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    logger.info("Starting Scottish Mountain Weather API (Mock)")
    logger.info("API will be available at: http://localhost:8001")
    logger.info("API documentation at: http://localhost:8001/docs")
    logger.info("Frontend should connect automatically")

    uvicorn.run(
        "simple_api:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )