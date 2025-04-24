#!/usr/bin/env python3

import requests
import yaml
from bs4 import BeautifulSoup, Tag
import datetime
import logging
import re
import statistics # For averaging
import os # For environment variables (optional API key)
import json # For saving forecasts
from collections import defaultdict # For grouping periods
import glob # For finding forecast files

# --- Configuration ---
CONFIG_FILE = "config.yaml"
USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
REQUEST_TIMEOUT = 25 # Slightly increased timeout

# Configure logging
# Set level to DEBUG to see more detailed parsing info/errors
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s:%(name)s - %(message)s')
logger = logging.getLogger(__name__) # Use specific logger

# --- Constants ---
# Using OWM One Call API 3.0 (requires subscription, free tier available)
# If using older 2.5, endpoint and response structure might differ slightly
OWM_API_ENDPOINT = "https://api.openweathermap.org/data/3.0/onecall"
OWM_EXCLUDE = "current,minutely,hourly,alerts" # Exclude parts we don't need for daily forecast

# Thresholds for condition summaries (adjust as needed)
HIKING_WIND_THRESHOLD_KPH = 50
HIKING_RAIN_THRESHOLD_MM_3HR = 5 # Approx threshold for a 3hr period
HIKING_TEMP_COLD_THRESHOLD_C = 0
HIKING_TEMP_HOT_THRESHOLD_C = 25

# Scoring weights for hiking summary (lower is better) - Adjust as desired
# Increased weights for more conservative scoring
SCORE_WEIGHT_WIND = 1.5  # Penalty per 10 kph over 30 (Increased)
SCORE_WEIGHT_RAIN = 7.0  # Penalty per mm of rain (Increased)
SCORE_WEIGHT_SNOW = 12.0 # Penalty per cm of snow (Increased)
SCORE_WEIGHT_COLD = 3.0  # Penalty per degree below 0°C (including chill) (Increased)
SCORE_WEIGHT_HOT = 1.5   # Penalty per degree above 25°C (Increased)

# Inversion Check Thresholds
INVERSION_CLOUD_BASE_THRESHOLD_M = 300 # Cloud base below this might indicate inversion fog
INVERSION_WIND_THRESHOLD_KPH = 15    # Wind speed below this

# --- Helper Functions ---

def load_config(config_path):
    """Loads the YAML configuration file."""
    try:
        with open(config_path, 'r') as f:
            config = yaml.safe_load(f)
        logger.info(f"Configuration loaded from {config_path}")
        # Attempt to load OWM API key from environment variable if not in file or placeholder present
        if 'openweathermap' not in config or not config.get('openweathermap', {}).get('api_key') or 'YOUR_OWM_API_KEY_HERE' in config.get('openweathermap', {}).get('api_key', ''):
            env_api_key = os.environ.get('OWM_API_KEY')
            if env_api_key:
                 logger.info("Loaded OpenWeatherMap API key from OWM_API_KEY environment variable.")
                 if 'openweathermap' not in config:
                     config['openweathermap'] = {}
                 config['openweathermap']['api_key'] = env_api_key
            else:
                 if 'openweathermap' not in config or not config.get('openweathermap', {}).get('api_key') or 'YOUR_OWM_API_KEY_HERE' in config.get('openweathermap', {}).get('api_key', ''):
                      logger.warning("OpenWeatherMap API key not found in config or environment variable 'OWM_API_KEY'. OWM forecast will be skipped.")
                      if 'openweathermap' in config:
                           config['openweathermap']['api_key'] = None # Ensure it's None if unusable
        return config
    except FileNotFoundError:
        logger.error(f"Configuration file not found at {config_path}")
        return None
    except yaml.YAMLError as e:
        logger.error(f"Error parsing configuration file {config_path}: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred loading config: {e}", exc_info=True)
        return None


def get_html(url):
    """Fetches HTML content from a URL."""
    logger.debug(f"Fetching HTML from {url}")
    try:
        headers = {'User-Agent': USER_AGENT}
        response = requests.get(url, headers=headers, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        logger.info(f"Successfully fetched HTML from {url} (Status: {response.status_code})")
        return response.text
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching URL {url}: {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during HTML fetch for {url}: {e}", exc_info=True)
        return None


def extract_text(element):
    """Extracts text content cleanly from a BeautifulSoup element."""
    return element.get_text(strip=True) if element else '' # Return empty string instead of 'N/A'


def clean_filename(name):
    """Removes potentially problematic characters for filenames."""
    # Remove parentheses and replace spaces/slashes with underscores
    name = re.sub(r'[()]+', '', name)
    name = re.sub(r'[\s/\\:]+', '_', name).strip('_')
    # Remove any other characters not suitable for filenames (adjust regex as needed)
    name = re.sub(r'[^a-zA-Z0-9_\-.]', '', name)
    return name


# --- Mountain-Forecast.com Parsing (Method 1 Proxy + Munros) ---

def parse_detailed_forecast(html_content, location_name, url):
    """Parses Mountain-Forecast.com HTML based on the confirmed structure (April 2025)."""
    if not html_content:
        logger.warning(f"No HTML content provided for {location_name}")
        return None

    logger.debug(f"Starting detailed parse for {location_name}")
    soup = BeautifulSoup(html_content, 'html.parser')
    forecast_data = {
        "location": location_name,
        "source": "mountain-forecast.com",
        "source_url": url,
        "elevation": None,
        "scrape_time": datetime.datetime.now().isoformat(),
        "forecast_periods": []
    }

    # Find the main forecast table
    forecast_table = soup.find('table', class_='forecast-table__table')
    if not forecast_table:
        logger.error(f"Could not find forecast table class 'forecast-table__table' for {location_name} at {url}")
        return None # Cannot proceed without the table

    # --- Try to Extract Elevation (if available) ---
    try:
        if 'data-elevation' in forecast_table.attrs:
            forecast_data['elevation'] = forecast_table.attrs['data-elevation'] + 'm'
        else:
            table_wrapper = forecast_table.find_parent('div', class_='forecast-table-data')
            if table_wrapper and 'data-elevation' in table_wrapper.attrs:
                forecast_data['elevation'] = table_wrapper['data-elevation'] + 'm'
            else:
                table_wrapper_alt = forecast_table.find_parent('div', class_='forecast-table')
                if table_wrapper_alt and 'data-elevation' in table_wrapper_alt.attrs:
                    forecast_data['elevation'] = table_wrapper_alt['data-elevation'] + 'm'
                else:
                    logger.warning(f"Could not find elevation data for {location_name}")
    except Exception as e:
         logger.warning(f"Error extracting elevation for {location_name}: {e}")


    # --- Header Rows Processing (Day and Time) ---
    thead = forecast_table.find('thead')
    if not thead:
        logger.error(f"Could not find <thead> in forecast table for {location_name}")
        return forecast_data # Return partial data, header needed

    day_row = thead.find('tr', attrs={'data-row': 'days'})
    time_row = thead.find('tr', attrs={'data-row': 'time'})

    if not day_row or not time_row:
        logger.error(f"Could not find header rows with data-row 'days' or 'time' for {location_name}")
        return forecast_data

    day_cells = day_row.find_all('td', class_='forecast-table-days__cell')
    time_cells = time_row.find_all('td', class_='forecast-table__cell')

    if not day_cells or not time_cells:
        logger.error(f"Could not find day or time cells within header rows for {location_name}")
        return forecast_data

    col_headers = []
    time_index = 0
    try:
        for day_cell in day_cells:
            day_name_div = day_cell.find('div', class_='forecast-table-days__name')
            day_date_div = day_cell.find('div', class_='forecast-table-days__date')
            # --- Get full date from data-date attribute --- START
            full_date_str = day_cell.get('data-date') # Expected format YYYY-MM-DD
            # logger.debug(f"Extracted data-date: {full_date_str} for {location_name}") # REMOVED DEBUG LOG
            day_name_str = extract_text(day_name_div)
            day_num_str = extract_text(day_date_div)
            # Construct display day string, handling potential missing date attribute
            try:
                if full_date_str:
                    dt_obj = datetime.datetime.strptime(full_date_str, '%Y-%m-%d')
                    display_day_str = dt_obj.strftime(f'%A {dt_obj.day}/%m/%Y') # Format: Weekday DD/MM/YYYY
                else:
                    display_day_str = f"{day_name_str} {day_num_str}" # Fallback
                    full_date_str = None # Ensure it's None if not parsed
            except ValueError:
                logger.warning(f"Could not parse data-date '{full_date_str}' for {location_name}. Using fallback day format.")
                display_day_str = f"{day_name_str} {day_num_str}"
                full_date_str = None
            # --- Get full date from data-date attribute --- END

            colspan = int(day_cell.get('colspan', 1))
            if colspan != 3:
                logger.warning(f"Unexpected colspan '{colspan}' on day cell for {display_day_str} in {location_name}. Assuming 3.")
                colspan = 3

            for _ in range(colspan):
                if time_index < len(time_cells):
                    time_period_span = time_cells[time_index].find('span', class_='en')
                    time_str = extract_text(time_period_span)
                    # Store both display day and full date for sorting/keying
                    col_headers.append({
                        "display_day": display_day_str,
                        "full_date": full_date_str, # Store YYYY-MM-DD
                        "time": time_str
                    })
                    time_index += 1
                else:
                    logger.error(f"Ran out of time cells while processing day {display_day_str} for {location_name}")
                    break # Avoid index error

    except Exception as e:
        logger.error(f"Error processing header rows for {location_name}: {e}", exc_info=True)
        return forecast_data # Cannot proceed without headers

    num_periods = len(col_headers)
    if num_periods == 0:
        logger.error(f"Failed to extract any forecast period headers for {location_name}")
        return forecast_data

    logger.info(f"Identified {num_periods} forecast periods for {location_name}")

    # Initialize data structure for periods
    periods_data = [{} for _ in range(num_periods)]
    for i, header in enumerate(col_headers):
        # Use full_date + time for a more robust unique key if date is available
        period_key = f"{header['full_date']} {header['time']}" if header['full_date'] else f"{header['display_day']} {header['time']}"
        periods_data[i]['day_period'] = period_key
        periods_data[i]['day'] = header['display_day'] # Store pre-formatted day
        periods_data[i]['full_date'] = header['full_date'] # Store YYYY-MM-DD if available
        periods_data[i]['time'] = header['time']

    # --- Data Rows Processing (using data-row attribute) ---
    tbody = forecast_table.find('tbody')
    if not tbody:
        logger.error(f"Could not find <tbody> in forecast table for {location_name}")
        return forecast_data # Return partial data, body needed

    data_rows = tbody.find_all('tr', class_='forecast-table__row', recursive=False)

    param_map = {
        'phrases': 'summary', # Text summary
        'weather': 'weather_icon_alt', # Image alt text
        'rain': 'rain_mm',
        'snow': 'snow_cm',
        'temperature-max': 'temp_max_c',
        'temperature-min': 'temp_min_c',
        'temperature-chill': 'temp_chill_c', # Wind chill
        'wind': ('wind_kph', 'wind_dir'), # Special handling
        # Gust speed doesn't appear to have its own row or easily identifiable attribute in the provided HTML.
        # Add 'gust': 'gust_kph' here if a row 'data-row="gust"' is found later.
        'freezing-level': 'freezing_level_m',
        'cloud-base': 'cloud_base_m'
    }

    for row in data_rows:
        data_row_type = row.get('data-row')
        if not data_row_type or data_row_type not in param_map:
            logger.debug(f"Skipping row with data-row type: {data_row_type}")
            continue # Skip rows we don't recognize

        data_key_info = param_map[data_row_type]
        value_cells = row.find_all('td', class_='forecast-table__cell')

        for i, cell in enumerate(value_cells):
            if i < num_periods:
                try:
                    if data_row_type == 'wind':
                        wind_icon_div = cell.find('div', class_='wind-icon')
                        if wind_icon_div:
                            speed_kph_str = wind_icon_div.get('data-speed')
                            dir_div = wind_icon_div.find('div', class_='wind-icon__tooltip')
                            direction = extract_text(dir_div)
                            speed_key, dir_key = data_key_info
                            try:
                                periods_data[i][speed_key] = float(speed_kph_str) if speed_kph_str is not None else None
                            except (ValueError, TypeError):
                                logger.warning(f"Could not convert wind speed '{speed_kph_str}' to float for {location_name} period {i}")
                                periods_data[i][speed_key] = None
                            periods_data[i][dir_key] = direction if direction else 'N/A'
                        else: # Handle case where wind_icon_div is missing
                            speed_key, dir_key = data_key_info
                            periods_data[i][speed_key] = None
                            periods_data[i][dir_key] = 'N/A'

                    elif data_row_type in ['rain', 'snow']:
                        value = 0.0 # Default to 0
                        amount_div = cell.find('div', class_=lambda x: x and x.endswith('-amount'))
                        if amount_div:
                            data_val = amount_div.get('data-value')
                            text_val = extract_text(amount_div)
                            if data_val is not None:
                                try: value = float(data_val)
                                except (ValueError, TypeError): logger.warning(f"Could not convert amount data-value '{data_val}' to float for {data_row_type}, {location_name} period {i}")
                            elif text_val != '—': # Try extracting text if no data-value and not '—'
                                match = re.search(r'(\d+(\.\d+)?)', text_val)
                                if match:
                                     try: value = float(match.group(1))
                                     except (ValueError, TypeError): logger.warning(f"Could not convert amount text '{text_val}' to float for {data_row_type}, {location_name} period {i}")
                        periods_data[i][data_key_info] = value

                    elif data_row_type in ['temperature-max', 'temperature-min', 'temperature-chill']:
                         value = None
                         temp_div = cell.find('div', class_='temp-value')
                         text_val = extract_text(temp_div if temp_div else cell)
                         match = re.search(r'(-?\d+(\.\d+)?)', text_val)
                         if match:
                             try: value = float(match.group(1))
                             except (ValueError, TypeError): logger.warning(f"Could not convert temp text '{text_val}' to float for {data_row_type}, {location_name} period {i}")
                         periods_data[i][data_key_info] = value

                    elif data_row_type in ['freezing-level', 'cloud-base']:
                         value = None
                         level_div = cell.find('div', class_='level-value')
                         text_val = extract_text(level_div if level_div else cell)
                         if text_val != '—':
                             match = re.search(r'(\d+)', text_val)
                             if match:
                                 try: value = int(match.group(1))
                                 except (ValueError, TypeError): logger.warning(f"Could not convert level text '{text_val}' to int for {data_row_type}, {location_name} period {i}")
                         periods_data[i][data_key_info] = value

                    elif data_row_type == 'phrases':
                        phrase_span = cell.find('span', class_='forecast-table__phrase')
                        value = extract_text(phrase_span)
                        periods_data[i][data_key_info] = value if value else 'N/A'

                    elif data_row_type == 'weather':
                        value = 'N/A'
                        img_tag = cell.find('img', class_='weather-icon')
                        if img_tag:
                            value = img_tag.get('alt', 'N/A').strip()
                        periods_data[i][data_key_info] = value if value else 'N/A'

                    else: # Default text extraction for other mapped rows
                        value = extract_text(cell)
                        periods_data[i][data_key_info] = value if value else 'N/A'

                except Exception as e:
                    logger.error(f"Error parsing cell {i} for {data_row_type} in {location_name}: {e}", exc_info=True)
                    # Set keys to None or Error on exception
                    if data_row_type != 'wind':
                        periods_data[i][data_key_info] = None
                    elif isinstance(data_key_info, tuple):
                        speed_key, dir_key = data_key_info
                        periods_data[i][speed_key] = None
                        periods_data[i][dir_key] = 'Error'

            else:
                logger.warning(f"Found more value cells ({len(value_cells)}) than headers ({num_periods}) for data-row '{data_row_type}' in {location_name}")
                break # Stop processing cells for this row

    forecast_data['forecast_periods'] = periods_data
    logger.info(f"Successfully finished parsing {num_periods} periods for {location_name}")
    return forecast_data


# --- OpenWeatherMap Fetching and Parsing (Method 2) ---

def get_owm_forecast(lat, lon, api_key, area_name):
    """Fetches daily forecast data from OpenWeatherMap One Call API."""
    if not api_key:
        logger.warning(f"OWM API key missing. Skipping OWM forecast for {area_name}.")
        return None
    if lat is None or lon is None:
        logger.warning(f"Latitude or Longitude missing for {area_name}. Skipping OWM forecast.")
        return None

    params = {
        'lat': lat,
        'lon': lon,
        'appid': api_key,
        'units': 'metric', # Use metric units
        'exclude': OWM_EXCLUDE
    }
    logger.debug(f"Fetching OWM forecast for {area_name} (Lat: {lat}, Lon: {lon})")
    try:
        response = requests.get(OWM_API_ENDPOINT, params=params, timeout=REQUEST_TIMEOUT)
        response.raise_for_status()
        logger.info(f"Successfully fetched OWM forecast for {area_name} (Status: {response.status_code})")
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching OWM forecast for {area_name}: {e}")
        # Check for specific API key error
        if e.response is not None and e.response.status_code == 401:
             logger.error("OWM API key seems invalid or expired.")
        return None
    except Exception as e:
         logger.error(f"An unexpected error occurred during OWM fetch for {area_name}: {e}", exc_info=True)
         return None


def parse_owm_forecast(owm_data, area_name):
    """Parses the daily forecast data from the OWM JSON response."""
    if not owm_data or 'daily' not in owm_data:
        logger.warning(f"OWM data is missing or incomplete for {area_name}. Cannot parse.")
        return None

    logger.debug(f"Starting OWM parse for {area_name}")
    forecast_data = {
        "location": f"{area_name} (OpenWeatherMap)",
        "source": "openweathermap.org",
        "source_url": f"https://openweathermap.org/city/{owm_data.get('timezone', '')}", # Approximate link
        "elevation": None, # OWM doesn't typically provide elevation in daily forecast
        "scrape_time": datetime.datetime.now().isoformat(),
        "forecast_periods": []
    }

    periods_data = []
    if 'daily' in owm_data:
        for day_data in owm_data['daily']:
            try:
                dt_object = datetime.datetime.fromtimestamp(day_data.get('dt', 0))
                # --- Add Sunrise/Sunset Parsing --- START
                sunrise_ts = day_data.get('sunrise')
                sunset_ts = day_data.get('sunset')
                # Attempt conversion respecting potential timezone offset from OWM if available
                tz_offset = owm_data.get('timezone_offset', 0)
                try:
                    sunrise_local = datetime.datetime.fromtimestamp(sunrise_ts + tz_offset, tz=datetime.timezone.utc) if sunrise_ts else None
                    sunset_local = datetime.datetime.fromtimestamp(sunset_ts + tz_offset, tz=datetime.timezone.utc) if sunset_ts else None
                    sunrise_str = sunrise_local.strftime('%H:%M') if sunrise_local else 'N/A'
                    sunset_str = sunset_local.strftime('%H:%M') if sunset_local else 'N/A'
                except Exception as tz_e:
                     logger.warning(f"Could not apply timezone offset ({tz_offset}) for sunrise/sunset in {area_name}: {tz_e}. Using raw timestamp.")
                     sunrise_str = datetime.datetime.fromtimestamp(sunrise_ts).strftime('%H:%M UTC') if sunrise_ts else 'N/A'
                     sunset_str = datetime.datetime.fromtimestamp(sunset_ts).strftime('%H:%M UTC') if sunset_ts else 'N/A'
                # --- Add Sunrise/Sunset Parsing --- END
                full_date_str = dt_object.strftime('%Y-%m-%d')
                display_day_str = dt_object.strftime('%A %d/%m/%Y')
                period = {
                    'day_period': full_date_str, # Use YYYY-MM-DD as the key for daily
                    'day': display_day_str, # Store formatted day
                    'full_date': full_date_str, # Store YYYY-MM-DD
                    'time': 'Daily',
                    'summary': day_data.get('summary', 'N/A'),
                    'weather_icon_alt': day_data.get('weather', [{}])[0].get('description', 'N/A'),
                    'temp_min_c': day_data.get('temp', {}).get('min'),
                    'temp_max_c': day_data.get('temp', {}).get('max'),
                    'temp_chill_c': None, # Omit daily chill
                    'wind_kph': round(day_data.get('wind_speed', 0) * 3.6, 1),
                    'wind_dir': day_data.get('wind_deg'),
                    'gust_kph': round(day_data.get('wind_gust', 0) * 3.6, 1) if 'wind_gust' in day_data else None,
                    'rain_mm': day_data.get('rain', 0),
                    'snow_cm': round(day_data.get('snow', 0) * 0.1, 1), # Convert mm to cm
                    'cloud_base_m': None,
                    'freezing_level_m': None,
                    'sunrise': sunrise_str, # Add sunrise
                    'sunset': sunset_str    # Add sunset
                }
                periods_data.append(period)
            except Exception as e:
                 logger.error(f"Error parsing OWM daily period for {area_name}: {e}", exc_info=True)
                 continue # Skip this period if parsing fails

    forecast_data['forecast_periods'] = periods_data
    logger.info(f"Successfully parsed {len(periods_data)} daily periods from OWM for {area_name}")
    return forecast_data


# --- Averaging Logic (Method 3) ---

def calculate_average_forecast(munro_forecasts_data, area_name):
    """Calculates an average forecast from multiple Munro forecasts for the same area."""
    if not munro_forecasts_data or len(munro_forecasts_data) < 2:
        logger.info(f"Need at least two Munro forecasts to calculate average for {area_name}. Skipping.")
        return None

    logger.debug(f"Calculating average forecast for {area_name} from {len(munro_forecasts_data)} sources.")

    # Aggregate periods by their unique key (e.g., "2025-04-19 AM")
    aggregated_periods = {}
    for forecast in munro_forecasts_data:
        if not forecast or 'forecast_periods' not in forecast:
            continue
        for period in forecast['forecast_periods']:
            period_key = period.get('day_period') # Should now be based on full_date
            if not period_key:
                continue
            if period_key not in aggregated_periods:
                aggregated_periods[period_key] = []
            aggregated_periods[period_key].append(period)

    if not aggregated_periods:
        logger.warning(f"No common forecast periods found to average for {area_name}")
        return None

    averaged_periods_data = []
    # Define fields to average and how (mean, mode for direction)
    numeric_fields = ['temp_max_c', 'temp_min_c', 'temp_chill_c', 'wind_kph', 'gust_kph', 'rain_mm', 'snow_cm', 'freezing_level_m', 'cloud_base_m']
    direction_field = 'wind_dir'
    summary_field = 'summary' # Take first summary?

    # Sort periods chronologically using full_date if available
    sorted_period_keys = sorted(aggregated_periods.keys(), key=lambda k:
        (
            datetime.datetime.strptime(k.split(' ')[0], '%Y-%m-%d') if '- ' not in k and len(k.split(' ')) > 1 else datetime.datetime.min(),
            ['AM', 'PM', 'night', 'Daily'].index(k.split(' ')[-1]) if k.split(' ')[-1] in ['AM', 'PM', 'night', 'Daily'] else 99
        )
    )

    for period_key in sorted_period_keys:
        periods = aggregated_periods[period_key]
        if not periods: continue
        # Ensure we grab the formatted day and time from the first contributing period
        avg_period = {
            'day_period': period_key,
            'day': periods[0].get('day', 'N/A'),
            'full_date': periods[0].get('full_date'),
            'time': periods[0].get('time', 'N/A')
        }

        # Average numeric fields
        for field in numeric_fields:
            values = [p.get(field) for p in periods if p.get(field) is not None]
            if values:
                try:
                    avg_period[field] = round(statistics.mean(values), 1)
                except statistics.StatisticsError:
                     avg_period[field] = None # Handle case where no valid data exists
            else:
                avg_period[field] = None

        # Find most common wind direction (mode)
        directions = [p.get(direction_field) for p in periods if p.get(direction_field) and p.get(direction_field) != 'N/A' and p.get(direction_field) != 'Error']
        if directions:
            try:
                avg_period[direction_field] = statistics.mode(directions)
            except statistics.StatisticsError: # More than one mode
                avg_period[direction_field] = '/'.join(sorted(list(set(directions)))) # Join unique directions
        else:
            avg_period[direction_field] = 'N/A'

        # Take first summary
        summaries = [p.get(summary_field) for p in periods if p.get(summary_field) and p.get(summary_field) != 'N/A']
        avg_period[summary_field] = summaries[0] if summaries else 'N/A'

        averaged_periods_data.append(avg_period)

    average_forecast = {
        "location": f"{area_name} (Averaged)",
        "source": f"Average of {len(munro_forecasts_data)} Munros",
        "source_url": None, # Not applicable
        "elevation": "Avg", # Not applicable
        "scrape_time": datetime.datetime.now().isoformat(),
        "forecast_periods": averaged_periods_data
    }
    logger.info(f"Successfully calculated average forecast for {len(averaged_periods_data)} periods for {area_name}")
    return average_forecast


# --- Summary Generation Functions ---

def summarize_day_conditions(periods, source="MF"):
    """Generates a brief summary of hiking/camping conditions for a given day's periods."""
    if not periods:
        return "No period data available for summary."

    summary_points = [] 
    warnings = []
    max_wind = -1
    total_rain = 0
    total_snow = 0
    all_min_temps = []
    all_max_temps = []
    has_chill = False

    for p in periods:
        # Wind
        wind = p.get('wind_kph')
        if wind is not None:
            max_wind = max(max_wind, wind)
        gust = p.get('gust_kph') # Check OWM gusts too
        if gust is not None:
            max_wind = max(max_wind, gust) # Consider gust for max wind impact
        
        # Precipitation (scale threshold for daily vs 3-hourly)
        rain = p.get('rain_mm', 0)
        snow = p.get('snow_cm', 0)
        rain_thresh = HIKING_RAIN_THRESHOLD_MM_3HR * (1 if source=="MF" else 8) # Scale daily OWM rain
        if rain is not None:
            total_rain += rain
            if rain > rain_thresh:
                 warnings.append(f"heavy rain ({rain}mm in period)")
        if snow is not None:
            total_snow += snow
            if snow > 1: # Any significant snow is noteworthy
                 warnings.append(f"snowfall ({snow}cm in period)")
        
        # Temperature
        min_t = p.get('temp_min_c')
        max_t = p.get('temp_max_c')
        chill_t = p.get('temp_chill_c')
        if min_t is not None: all_min_temps.append(min_t)
        if max_t is not None: all_max_temps.append(max_t)
        if chill_t is not None:
            has_chill = True
            all_min_temps.append(chill_t) # Include chill in lowest temp check
            if chill_t < HIKING_TEMP_COLD_THRESHOLD_C:
                warnings.append(f"significant wind chill ({chill_t}°C)")

    # Overall Temp Range
    day_min_temp = min(all_min_temps) if all_min_temps else None
    day_max_temp = max(all_max_temps) if all_max_temps else None
    temp_range_str = ""
    if day_min_temp is not None and day_max_temp is not None:
        temp_range_str = f"Temps {day_min_temp:.1f} to {day_max_temp:.1f}°C"
        if has_chill: temp_range_str += " (inc. chill)"
        summary_points.append(temp_range_str)
        if day_min_temp < HIKING_TEMP_COLD_THRESHOLD_C and not has_chill: # Warning if cold and chill wasn't cause
             warnings.append(f"cold temps ({day_min_temp}°C)")
        if day_max_temp > HIKING_TEMP_HOT_THRESHOLD_C:
             warnings.append("potentially hot conditions")
    elif day_min_temp is not None:
         summary_points.append(f"Min temp ~{day_min_temp:.1f}°C")
    elif day_max_temp is not None:
         summary_points.append(f"Max temp ~{day_max_temp:.1f}°C")

    # Wind Summary
    if max_wind >= 0:
        wind_summary = f"Max wind {max_wind:.1f} kph"
        summary_points.append(wind_summary)
        if max_wind > HIKING_WIND_THRESHOLD_KPH:
            warnings.append(f"high winds ({max_wind:.1f} kph)")

    # Precipitation Summary
    precip_summary = []
    if total_rain > 0:
        precip_summary.append(f"Rain total {total_rain:.1f}mm")
    if total_snow > 0:
        precip_summary.append(f"Snow total {total_snow:.1f}cm")
    if precip_summary:
        summary_points.append(", ".join(precip_summary))

    # Final Verdict
    if warnings:
        return f"Potentially challenging conditions: { ', '.join(sorted(list(set(warnings)))) }. ({ '; '.join(summary_points) })"
    elif not summary_points:
        return "Conditions data incomplete for summary."
    else:
        return f"Generally favorable conditions indicated. ({ '; '.join(summary_points) })"

def summarize_photography_conditions(daily_period):
    """Generates a photography summary focusing on sunrise/sunset and cloud cover."""
    if not daily_period or not isinstance(daily_period, dict):
        return "No daily data for photography summary."

    sunrise = daily_period.get('sunrise')
    sunset = daily_period.get('sunset')
    weather_desc = daily_period.get('weather_icon_alt', '').lower()

    summary = []
    if sunrise and sunrise != 'N/A':
        summary.append(f"Sunrise: {sunrise}")
    if sunset and sunset != 'N/A':
        summary.append(f"Sunset: {sunset}")

    if not weather_desc or weather_desc == 'n/a':
        summary.append("Cloud cover forecast unavailable.")
    elif 'clear' in weather_desc:
        summary.append("Predominantly clear skies expected, potential for direct light.")
    elif 'clouds' in weather_desc:
        if 'few' in weather_desc or 'scattered' in weather_desc or 'part' in weather_desc:
             summary.append("Partly cloudy, potential for dramatic light near sunrise/sunset.")
        else: # broken, overcast
             summary.append("Mainly cloudy/overcast, light may be diffused.")
    elif 'rain' in weather_desc or 'snow' in weather_desc or 'storm' in weather_desc:
         summary.append("Precipitation likely, conditions may be challenging but potentially dramatic.")
    else:
        summary.append(f"General condition: {weather_desc}.")
    
    return " ".join(summary)


# --- Printing Functions ---

def print_forecast_period(period):
    """Prints a single forecast period with icons."""
    # Icons: Choose emojis or other Unicode symbols
    # https://unicode.org/emoji/charts/full-emoji-list.html
    icons = {
        'summary': '📝', # Memo/Note
        'weather_icon_alt': '🖼️', # Frame Picture (for icon description)
        'temp_max_c': '🌡️', # Thermometer
        'temp_min_c': '🥶', # Freezing face
        'temp_chill_c': '🌬️', # Wind face
        'wind_kph': '💨', # Dash symbol
        'wind_dir': '🧭', # Compass
        'gust_kph': '💥', # Collision
        'rain_mm': '💧', # Droplet
        'snow_cm': '❄️', # Snowflake
        'cloud_base_m': '☁️', # Cloud
        'freezing_level_m': '🧊'  # Ice cube
    }
    print_map = [
        ('summary', 'Summary', ''),
        ('weather_icon_alt', 'Icon Desc', ''),
        ('temp_max_c', 'Max Temp', '°C'),
        ('temp_min_c', 'Min Temp', '°C'),
        ('temp_chill_c', 'Chill', '°C'),
        ('wind_kph', 'Wind', 'kph'),
        ('wind_dir', 'Dir', ''),
        ('gust_kph', 'Gust', 'kph'),
        ('rain_mm', 'Rain', 'mm'),
        ('snow_cm', 'Snow', 'cm'),
        ('cloud_base_m', 'Cloud Base', 'm'),
        ('freezing_level_m', 'Freezing Lvl', 'm')
    ]

    print(f"    Time: {period.get('time', 'N/A')}")
    details = []
    summary_val = period.get('summary')
    icon_val = period.get('weather_icon_alt')

    # Print Summary/Icon first if they exist
    summary_text = f"{icons.get('summary', '')} {summary_val if summary_val else 'N/A'}"
    if icon_val and icon_val != 'N/A':
        summary_text += f" ({icons.get('weather_icon_alt', '')} {icon_val})"
    print(f"      {summary_text}")

    # Print other details
    for key, label, unit in print_map:
        if key in ['summary', 'weather_icon_alt']: continue # Already printed
        value = period.get(key)
        icon = icons.get(key, '') # Get icon
        if value is not None and value != 'N/A':
             # Special handling for Wind Dir/Gust to append to Wind Speed
             if key == 'wind_dir' and 'wind_kph' in period and period.get('wind_kph') is not None:
                 # Find the wind speed detail and append direction
                 for idx, item in enumerate(details):
                      if item.startswith(f"{icons.get('wind_kph')} Wind"): # Match based on key item
                           details[idx] = f"{item} ({icon}{value})"
                           break
             elif key == 'gust_kph' and 'wind_kph' in period and period.get('wind_kph') is not None:
                 # Find the wind speed detail and append gust
                 for idx, item in enumerate(details):
                      if item.startswith(f"{icons.get('wind_kph')} Wind"): # Match based on key item
                          details[idx] = f"{item} ({icon}{value}{unit})"
                          break
             elif key not in ['wind_dir', 'gust_kph']:
                 details.append(f"{icon} {label}: {value}{unit}")

    if details:
        print(f"      {' | '.join(details)}")


def display_forecast(forecast_data, title_prefix=""):
    """Prints any parsed forecast data (MF, OWM, Average) in a readable format."""
    if not forecast_data:
        logger.warning(f"No forecast data provided for display (Prefix: {title_prefix}).")
        return

    location = forecast_data.get('location', 'N/A')
    elevation = forecast_data.get('elevation', 'N/A')
    source = forecast_data.get('source', 'N/A')
    url = forecast_data.get('source_url')
    scrape_time = forecast_data.get('scrape_time', 'N/A')
    try:
        scrape_dt = datetime.datetime.fromisoformat(scrape_time).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        scrape_dt = scrape_time

    print(f"\n--- {title_prefix}{location} ({elevation if elevation else 'Elevation N/A'}) ---")
    print(f"Source: {source}{f' ({url})' if url else ''}")
    print(f"Scraped at: {scrape_dt}")

    # --- Display Summaries if available --- START
    conditions_summary = forecast_data.get('conditions_summary')
    photo_summary = forecast_data.get('photography_summary')
    if conditions_summary:
        print(f"\n  **Conditions Summary:** {conditions_summary}")
    if photo_summary:
         print(f"  **Photography Summary:** {photo_summary}")
    if conditions_summary or photo_summary:
         print("  " + "-"*20) # Separator
    # --- Display Summaries if available --- END

    periods = forecast_data.get('forecast_periods', [])
    if not periods:
        print("  No forecast periods found in the data.")
        return

    current_day_display = None
    for period in periods:
        day_display = period.get('day', 'N/A') # Use the pre-formatted day string
        if day_display != current_day_display:
            print(f"\n  --- {day_display} ---") # Display the formatted day
            current_day_display = day_display
        print_forecast_period(period)


# --- Formatting Functions ---

def format_forecast_markdown(forecast_data):
    """Formats forecast data into a Markdown string with tables for each day."""
    if not forecast_data or not isinstance(forecast_data, dict):
        return "" # Return empty string if no data

    lines = []

    # --- Main Header --- (Same as before)
    location = forecast_data.get('location', 'N/A')
    elevation = forecast_data.get('elevation', 'N/A')
    source = forecast_data.get('source', 'N/A')
    url = forecast_data.get('source_url')
    scrape_time = forecast_data.get('scrape_time', 'N/A')
    try:
        scrape_dt = datetime.datetime.fromisoformat(scrape_time).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        scrape_dt = scrape_time

    lines.append(f"# Forecast: {location} ({elevation if elevation else 'Elevation N/A'})")
    lines.append(f"**Source:** {source}{f' ([link]({url}))' if url else ''}")
    lines.append(f"**Scraped at:** {scrape_dt}")
    lines.append("---")

    # --- Add Summaries --- START
    conditions_summary = forecast_data.get('conditions_summary')
    photo_summary = forecast_data.get('photography_summary')
    if conditions_summary:
        lines.append(f"\n**Conditions Summary:** {conditions_summary}")
    if photo_summary:
         lines.append(f"\n**Photography Summary:** {photo_summary}")
    # --- Add Summaries --- END

    # --- Data Periods --- 
    periods = forecast_data.get('forecast_periods', [])
    if not periods:
        lines.append("_No forecast periods found._")
        return "\n".join(lines)

    # --- Group periods by day --- 
    periods_by_day = {}
    for p in periods:
        day_key = p.get('day', 'Unknown Day') # Use the display day as key
        if day_key not in periods_by_day:
            periods_by_day[day_key] = []
        periods_by_day[day_key].append(p)

    # --- Define Table Columns and Headers --- 
    icons = {
        'summary': '📝', 'weather_icon_alt': '🖼️', 'temp_max_c': '🌡️',
        'temp_min_c': '🥶', 'temp_chill_c': '🌬️', 'wind_kph': '💨',
        'wind_dir': '🧭', 'gust_kph': '💥', 'rain_mm': '💧',
        'snow_cm': '❄️', 'cloud_base_m': '☁️', 'freezing_level_m': '🧊'
    }
    # Define the order and formatting of columns
    # (key_in_data, Header Name, Unit)
    columns = [
        ('summary', 'Summary', ''),
        ('weather_icon_alt', 'Icon', ''),
        ('temp_max_c', 'Max Temp', '°C'),
        ('temp_min_c', 'Min Temp', '°C'),
        ('temp_chill_c', 'Chill', '°C'),
        ('wind_kph', 'Wind', 'kph'), # Combined Wind/Dir/Gust later
        ('rain_mm', 'Rain', 'mm'),
        ('snow_cm', 'Snow', 'cm'),
        ('cloud_base_m', 'Cloud Base', 'm'),
        ('freezing_level_m', 'Freezing Lvl', 'm')
    ]

    # --- Generate Markdown for each day's table --- 
    for day_display, day_periods in periods_by_day.items():
        lines.append(f"\n## {day_display}")

        # Build Header Row with Bold text and Alignment Hints
        header_row = ["| **Time** "]
        separator_row = ["|:------- "] # Left align Time
        
        # Determine alignment for each column key
        alignment = {
             'summary': ':---', # Left
             'weather_icon_alt': ':---', # Left (though included in summary cell now)
             'temp_max_c': '---:', # Right
             'temp_min_c': '---:', # Right
             'temp_chill_c': '---:', # Right
             'wind_kph': '---:', # Right (for the number part)
             'rain_mm': '---:', # Right
             'snow_cm': '---:', # Right
             'cloud_base_m': '---:', # Right
             'freezing_level_m': '---:' # Right
        }
        default_align = ':---:' # Center as default if not specified

        for key, label, unit in columns:
            icon = icons.get(key, '')
            unit_str = f" ({unit})" if unit else ""
            header_text = f"{icon} {label}{unit_str}"
            if key == 'wind_kph':
                 header_text = f"{icon} Wind{unit_str} (Dir/Gust)"
            # Use alignment hints in separator
            align_marker = alignment.get(key, default_align)
            # Ensure separator length matches header visual width (approximate)
            separator_len = max(len(header_text), 3) # Minimum length 3
            separator_row.append(f"|{align_marker[0]}{ '-' * (separator_len - len(align_marker) + 1) }{align_marker[-1]} ")
            header_row.append(f"| **{header_text}** ")

        lines.append("".join(header_row) + "|")
        lines.append("".join(separator_row) + "|")

        # Build Data Rows
        for period in day_periods:
            time_str = period.get('time', 'N/A')
            data_row = [f"| {time_str:<7} "] # Pad time column
            for key, _, _ in columns:
                value = period.get(key)
                cell_content = str(value) if value is not None else "-" # Use '-' for None

                # Special handling for combined Wind/Dir/Gust cell
                if key == 'wind_kph':
                    wind_kph_val = period.get('wind_kph')
                    wind_dir_val = period.get('wind_dir')
                    gust_kph_val = period.get('gust_kph')
                    wind_cell = str(wind_kph_val) if wind_kph_val is not None else "-"
                    extras = []
                    if wind_dir_val and wind_dir_val != 'N/A':
                        extras.append(f"{icons.get('wind_dir')}{wind_dir_val}")
                    if gust_kph_val is not None:
                        extras.append(f"{icons.get('gust_kph')}{gust_kph_val}kph")
                    if extras:
                        wind_cell += f"<br>({ ' / '.join(extras) })" # Use <br> for line break
                    data_row.append(f"| {wind_cell} ")
                # Handling for summary/icon description
                elif key == 'summary':
                     summary_val = period.get('summary')
                     icon_desc_val = period.get('weather_icon_alt')
                     summary_cell = str(summary_val) if summary_val else '-'
                     if icon_desc_val and icon_desc_val != 'N/A':
                          summary_cell += f'<br><span class="icon-desc">({icon_desc_val})</span>'
                     data_row.append(f"| {summary_cell} ")
                elif key == 'weather_icon_alt': # Skip as it's included with summary
                    pass 
                else:
                    data_row.append(f"| {cell_content} ")

            lines.append("".join(data_row) + "|")

    return "\n".join(lines)

def format_forecast_html(forecast_data):
    """Formats forecast data into an HTML string with embedded CSS."""
    if not forecast_data or not isinstance(forecast_data, dict):
        return ""

    html_lines = []

    # --- Basic CSS Styling --- 
    css = """
    <style>
        body { font-family: sans-serif; line-height: 1.4; margin: 20px; }
        h1, h2, h3 { color: #333; }
        hr { border: 0; border-top: 1px solid #ccc; margin: 20px 0; }
        table { border-collapse: collapse; width: 100%; margin-bottom: 20px; font-size: 0.9em; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: center; vertical-align: middle; }
        th { background-color: #f2f2f2; font-weight: bold; white-space: nowrap; }
        tr:nth-child(even) { background-color: #f9f9f9; }
        td { font-size: 0.95em; }
        .source-link { color: #0066cc; text-decoration: none; }
        .source-link:hover { text-decoration: underline; }
        .icon-desc { font-style: italic; color: #555; font-size: 0.9em; }
        .summary-section { margin: 15px 0; padding: 10px; background-color: #eee; border-radius: 4px; }
    </style>
    """
    # Note: Not adding css to html_lines directly, will wrap at the end.

    # --- HTML Header --- 
    location = forecast_data.get('location', 'N/A')
    elevation = forecast_data.get('elevation', 'N/A')
    source = forecast_data.get('source', 'N/A')
    url = forecast_data.get('source_url')
    scrape_time = forecast_data.get('scrape_time', 'N/A')
    try:
        scrape_dt = datetime.datetime.fromisoformat(scrape_time).strftime('%Y-%m-%d %H:%M:%S')
    except (ValueError, TypeError):
        scrape_dt = scrape_time

    html_lines.append(f"<h1>Forecast: {location} ({elevation if elevation else 'Elevation N/A'})</h1>")
    source_link = f'<a href="{url}" class="source-link" target="_blank">link</a>' if url else ''
    html_lines.append(f"<p><strong>Source:</strong> {source} {source_link}</p>")
    html_lines.append(f"<p><strong>Scraped at:</strong> {scrape_dt}</p>")

    # --- Add Summaries --- 
    conditions_summary = forecast_data.get('conditions_summary')
    photo_summary = forecast_data.get('photography_summary')
    if conditions_summary or photo_summary:
         html_lines.append('<div class="summary-section">')
         if conditions_summary:
             html_lines.append(f'<p><strong>Conditions Summary:</strong> {conditions_summary}</p>')
         if photo_summary:
              html_lines.append(f'<p><strong>Photography Summary:</strong> {photo_summary}</p>')
         html_lines.append('</div>')
    else:
         html_lines.append("<hr>") # Use HR if no summaries

    # --- Data Periods --- 
    periods = forecast_data.get('forecast_periods', [])
    if not periods:
        html_lines.append("<p><em>No forecast periods found.</em></p>")
    else:
        # --- Group periods by day --- 
        periods_by_day = defaultdict(list) # Use defaultdict
        for p in periods:
            day_key = p.get('day', 'Unknown Day') # Use the display day as key
            periods_by_day[day_key].append(p)

        # --- Define Table Columns and Headers --- 
        icons = {
            'summary': '📝', 'weather_icon_alt': '🖼️', 'temp_max_c': '🌡️',
            'temp_min_c': '🥶', 'temp_chill_c': '🌬️', 'wind_kph': '💨',
            'wind_dir': '🧭', 'gust_kph': '💥', 'rain_mm': '💧',
            'snow_cm': '❄️', 'cloud_base_m': '☁️', 'freezing_level_m': '🧊'
        }
        columns = [
            ('summary', 'Summary / Icon', ''),
            ('temp_max_c', 'Max Temp', '°C'),
            ('temp_min_c', 'Min Temp', '°C'),
            ('temp_chill_c', 'Chill', '°C'),
            ('wind_kph', 'Wind', 'kph'),
            ('rain_mm', 'Rain', 'mm'),
            ('snow_cm', 'Snow', 'cm'),
            ('cloud_base_m', 'Cloud Base', 'm'),
            ('freezing_level_m', 'Freezing Lvl', 'm')
        ]

        # --- Generate HTML for each day's table --- 
        for day_display, day_periods in periods_by_day.items():
            html_lines.append(f"\n<h2>{day_display}</h2>")
            html_lines.append("<table>")
            html_lines.append("  <thead>")
            html_lines.append("    <tr>")
            html_lines.append("      <th>Time</th>")
            for key, label, unit in columns:
                icon = icons.get(key, '')
                unit_str = f" ({unit})" if unit else ""
                header_text = f"{icon} {label}{unit_str}"
                if key == 'wind_kph':
                     header_text = f"{icon} Wind{unit_str} (Dir/Gust)"
                elif key == 'summary':
                     header_text = f"{icons.get('summary')}/{icons.get('weather_icon_alt')} {label}"
                html_lines.append(f"      <th>{header_text}</th>")
            html_lines.append("    </tr>")
            html_lines.append("  </thead>")
            html_lines.append("  <tbody>")

            # Build Data Rows
            for period in day_periods:
                time_str = period.get('time', 'N/A')
                html_lines.append("    <tr>")
                html_lines.append(f"      <td>{time_str}</td>")
                for key, _, _ in columns:
                    value = period.get(key)
                    cell_content = str(value) if value is not None else "&mdash;"

                    if key == 'wind_kph':
                        wind_kph_val = period.get('wind_kph')
                        wind_dir_val = period.get('wind_dir')
                        gust_kph_val = period.get('gust_kph')
                        wind_cell = str(wind_kph_val) if wind_kph_val is not None else "&mdash;"
                        extras = []
                        if wind_dir_val and wind_dir_val != 'N/A':
                            extras.append(f"{icons.get('wind_dir')}{wind_dir_val}")
                        if gust_kph_val is not None:
                            extras.append(f"{icons.get('gust_kph')}{gust_kph_val}kph")
                        if extras:
                            wind_cell += f"<br>({ ' / '.join(extras) })"
                        html_lines.append(f"      <td>{wind_cell}</td>")
                    elif key == 'summary':
                         summary_val = period.get('summary')
                         icon_desc_val = period.get('weather_icon_alt')
                         summary_cell = str(summary_val) if summary_val else '&mdash;'
                         if icon_desc_val and icon_desc_val != 'N/A':
                              summary_cell += f'<br><span class="icon-desc">({icon_desc_val})</span>'
                         html_lines.append(f"      <td>{summary_cell}</td>")
                    else:
                        html_lines.append(f"      <td>{cell_content}</td>")
                html_lines.append("    </tr>")
            
            html_lines.append("  </tbody>")
            html_lines.append("</table>")

    # Wrap in basic HTML structure
    full_html = f"<!DOCTYPE html>\n<html>\n<head><meta charset=\"UTF-8\"><title>Weather Forecast - {location}</title>{css}</head>\n<body>\n" \
                + "\n".join(html_lines) \
                + "\n</body>\n</html>"
    return full_html


# --- Saving Function ---

def save_area_forecasts(forecast_list, area_name):
    """Saves a list of forecast data dictionaries to JSON, Markdown, and HTML files."""
    if not forecast_list:
        logger.info(f"No forecasts to save for area {area_name}.")
        return

    base_dir = "forecasts"
    area_subdir_name = clean_filename(area_name)
    area_dir = os.path.join(base_dir, area_subdir_name)

    try:
        os.makedirs(area_dir, exist_ok=True)
        logger.debug(f"Ensured forecast directory exists: {area_dir}")
    except OSError as e:
        logger.error(f"Could not create directory {area_dir}: {e}")
        return # Cannot save if directory creation fails

    saved_count_json = 0
    saved_count_md = 0
    saved_count_html = 0

    for forecast_data in forecast_list:
        if not forecast_data or not isinstance(forecast_data, dict):
            logger.warning("Skipping invalid forecast data item during save.")
            continue

        try:
            # Extract details for filename
            location_name = forecast_data.get('location', 'UnknownLocation')
            source = forecast_data.get('source', 'UnknownSource')
            scrape_time_str = forecast_data.get('scrape_time', datetime.datetime.now().isoformat())

            # Use scrape time for timestamp in filename
            try:
                scrape_dt = datetime.datetime.fromisoformat(scrape_time_str)
                ts_str = scrape_dt.strftime("%Y%m%d_%H%M%S") # Format: YYYYMMDD_HHMMSS
            except ValueError:
                ts_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S") # Fallback

            clean_loc_name = clean_filename(location_name)
            clean_source_name = clean_filename(source)

            # --- Generate Filenames (JSON, MD, HTML) --- 
            base_filename = f"{ts_str}_{clean_loc_name}_{clean_source_name}"
            json_filename = f"{base_filename}.json"
            md_filename = f"{base_filename}.md"
            html_filename = f"{base_filename}.html" # HTML filename

            json_filepath = os.path.join(area_dir, json_filename)
            md_filepath = os.path.join(area_dir, md_filename)
            html_filepath = os.path.join(area_dir, html_filename) # HTML filepath

            # --- Write JSON file --- 
            with open(json_filepath, 'w') as f:
                json.dump(forecast_data, f, indent=4)
            logger.info(f"Successfully saved forecast to: {json_filepath}")
            saved_count_json += 1

            # --- Generate and Write Markdown file --- 
            markdown_content = format_forecast_markdown(forecast_data)
            if markdown_content:
                 with open(md_filepath, 'w', encoding='utf-8') as f:
                     f.write(markdown_content)
                 logger.info(f"Successfully saved Markdown forecast to: {md_filepath}")
                 saved_count_md += 1
            else:
                 logger.warning(f"Markdown content was empty for {location_name}, skipping MD save.")

            # --- Generate and Write HTML file --- 
            html_content = format_forecast_html(forecast_data)
            if html_content:
                with open(html_filepath, 'w', encoding='utf-8') as f:
                    f.write(html_content)
                logger.info(f"Successfully saved HTML forecast to: {html_filepath}")
                saved_count_html += 1
            else:
                 logger.warning(f"HTML content was empty for {location_name}, skipping HTML save.")

            # Display forecast to console (as before)
            display_forecast(forecast_data)

        except Exception as e:
            logger.error(f"Failed to process/save forecast file for {location_name} from {source}: {e}", exc_info=True)

    logger.info(f"Finished processing area {area_name}. Saved: {saved_count_json} JSON, {saved_count_md} MD, {saved_count_html} HTML.")


# --- Main Processing Logic --- 
def process_locations(config):
    """Processes each location defined in the config, fetching and parsing forecasts."""
    if not config or 'locations' not in config:
        logger.error("Invalid or missing 'locations' section in configuration.")
        return 0

    owm_api_key = config.get('openweathermap', {}).get('api_key')
    processed_areas = 0

    for location_index, location in enumerate(config['locations']):
        area = location.get('area', f'Unknown Area {location_index+1}')
        lat = location.get('latitude')
        lon = location.get('longitude')
        area_proxy_url = location.get('area_proxy_url')
        munros = location.get('munros', [])

        print(f"\n{'='*40}\nProcessing Area: {area}\n{'='*40}")

        area_forecasts_to_save = [] # List to hold all forecasts for this area

        # --- Method 2: OpenWeatherMap Area Forecast ---
        owm_forecast_data = None
        if lat is not None and lon is not None and owm_api_key:
            logger.info(f"Attempting OpenWeatherMap forecast fetch for {area}")
            owm_raw_data = get_owm_forecast(lat, lon, owm_api_key, area)
            if owm_raw_data:
                owm_forecast_data = parse_owm_forecast(owm_raw_data, area)
                if owm_forecast_data:
                    # --- Generate OWM Summaries --- START
                    if owm_forecast_data.get('forecast_periods'):
                         first_day_periods = [owm_forecast_data['forecast_periods'][0]]
                         owm_forecast_data['conditions_summary'] = summarize_day_conditions(first_day_periods, source="OWM")
                         owm_forecast_data['photography_summary'] = summarize_photography_conditions(first_day_periods[0])
                    # --- Generate OWM Summaries --- END
                    area_forecasts_to_save.append(owm_forecast_data)
                else:
                    logger.error(f"Failed to parse OWM forecast for {area}")
            else:
                 logger.error(f"Failed to retrieve OWM forecast data for {area}")
        else:
            logger.info(f"Skipping OpenWeatherMap forecast for {area} due to missing lat/lon or API key.")

        # --- Method 1: Mountain-Forecast Proxy Area Forecast ---
        mf_proxy_forecast_data = None
        if area_proxy_url:
            logger.info(f"Attempting Mountain-Forecast proxy fetch for {area} from {area_proxy_url}")
            html = get_html(area_proxy_url)
            if html:
                mf_proxy_forecast_data = parse_detailed_forecast(html, f"{area} (Proxy)", area_proxy_url)
                if mf_proxy_forecast_data:
                    # --- Generate MF Proxy Summary --- START
                    proxy_periods_by_day = defaultdict(list)
                    if mf_proxy_forecast_data.get('forecast_periods'):
                        for p in mf_proxy_forecast_data['forecast_periods']:
                             proxy_periods_by_day[p.get('day')].append(p)
                        first_day_key = next(iter(proxy_periods_by_day), None)
                        if first_day_key:
                            mf_proxy_forecast_data['conditions_summary'] = summarize_day_conditions(proxy_periods_by_day[first_day_key], source="MF")
                    # --- Generate MF Proxy Summary --- END
                    area_forecasts_to_save.append(mf_proxy_forecast_data)
                else:
                    logger.error(f"Failed to parse Mountain-Forecast proxy for {area}")
            else:
                logger.error(f"Failed to retrieve HTML for Mountain-Forecast proxy {area}")
        else:
            logger.info(f"No area_proxy_url configured for {area}. Skipping MF proxy forecast.")

        # --- Specific Munro Forecasts ---
        if not munros:
            logger.warning(f"No specific munros listed for area {area}")
            save_area_forecasts(area_forecasts_to_save, area)
            processed_areas += 1 
            continue 

        print(f"\n--- Fetching Specific Munro Forecasts for {area} ---") 
        munro_forecasts_data = [] 
        for munro in munros:
            munro_name = munro.get('name')
            munro_url = munro.get('url')

            if not munro_name or not munro_url:
                logger.warning(f"Skipping munro with missing name or URL in area {area}")
                continue

            logger.info(f"Fetching forecast for {munro_name} ({munro_url})")
            html = get_html(munro_url)
            if html:
                parsed_data = parse_detailed_forecast(html, munro_name, munro_url)
                if parsed_data:
                    # --- Generate Munro Summary --- START
                    munro_periods_by_day = defaultdict(list)
                    if parsed_data.get('forecast_periods'):
                         for p in parsed_data['forecast_periods']:
                             munro_periods_by_day[p.get('day')].append(p)
                         first_day_key = next(iter(munro_periods_by_day), None)
                         if first_day_key:
                             parsed_data['conditions_summary'] = summarize_day_conditions(munro_periods_by_day[first_day_key], source="MF")
                    # --- Generate Munro Summary --- END
                    area_forecasts_to_save.append(parsed_data) 
                    munro_forecasts_data.append(parsed_data) 
                else:
                    logger.error(f"Failed to parse forecast for {munro_name}")
            else:
                logger.error(f"Failed to retrieve HTML for {munro_name}")

        # --- Method 3: Averaged Munro Forecast ---
        if len(munro_forecasts_data) >= 2:
             logger.info(f"Attempting to calculate average forecast for {area}")
             averaged_forecast = calculate_average_forecast(munro_forecasts_data, area)
             if averaged_forecast:
                 # --- Generate Average Summary --- START
                 avg_periods_by_day = defaultdict(list)
                 if averaged_forecast.get('forecast_periods'):
                     for p in averaged_forecast['forecast_periods']:
                         avg_periods_by_day[p.get('day')].append(p)
                     first_day_key = next(iter(avg_periods_by_day), None)
                     if first_day_key:
                         averaged_forecast['conditions_summary'] = summarize_day_conditions(avg_periods_by_day[first_day_key], source="MF") 
                 # --- Generate Average Summary --- END
                 area_forecasts_to_save.append(averaged_forecast)
             else:
                 logger.warning(f"Could not calculate average forecast for {area}")
        elif munros:
             logger.info(f"Skipping average forecast for {area} (requires at least 2 successful Munro forecasts).")

        # --- Save all collected forecasts for this area --- 
        save_area_forecasts(area_forecasts_to_save, area) 

        processed_areas += 1

    return processed_areas


# --- Analysis Function ---

def analyze_saved_forecasts(forecast_dir="forecasts"):
    """Analyzes saved JSON forecasts and prints/saves a summary report."""
    logger.info(f"Starting analysis of saved forecasts in '{forecast_dir}'")
    # --- Load all forecast data and extract overall summaries --- 
    all_forecasts_raw = [] # Store raw loaded dicts for period analysis
    overall_summaries = defaultdict(dict) # {full_date: {location: conditions_summary}}
    first_full_date_by_location = {} # Track first date to get summary for multi-period sources
    json_files = glob.glob(os.path.join(forecast_dir, "**", "*.json"), recursive=True)

    if not json_files:
        logger.warning(f"No JSON forecast files found in '{forecast_dir}' or subdirectories. Cannot generate summary.")
        return

    for f_path in json_files:
        try:
            with open(f_path, 'r') as f:
                data = json.load(f)
                all_forecasts_raw.append(data)
                # Store the overall summary if present
                location = data.get('location')
                cond_summary = data.get('conditions_summary') # Get the pre-calculated summary
                photo_summary = data.get('photography_summary') # Get photo summary too
                
                if location and cond_summary:
                    # Find the first valid full_date in the periods for grouping
                    file_date = None
                    for p in data.get('forecast_periods', []):
                         if p.get('full_date'):
                              file_date = p['full_date']
                              break 
                    if file_date:
                        # Store summary, overwriting older entries for the same location/date if found
                        summary_data = { 'conditions': cond_summary }
                        if photo_summary: # Add photo summary if it exists (likely for OWM)
                             summary_data['photo'] = photo_summary
                        overall_summaries[file_date][location] = summary_data
                            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to decode JSON from {f_path}: {e}")
        except FileNotFoundError:
            logger.error(f"File not found during analysis: {f_path}")
        except Exception as e:
            logger.error(f"Error reading forecast file {f_path}: {e}", exc_info=True)

    if not all_forecasts_raw:
        logger.warning("No valid forecast data loaded. Cannot generate summary.")
        return

    # --- Process and Score Forecasts by Day (using all_forecasts_raw) --- 
    analysis_by_day = defaultdict(list)
    for forecast in all_forecasts_raw: # Use the raw loaded data
        location = forecast.get('location', 'Unknown')
        source = forecast.get('source', 'Unknown')
        periods = forecast.get('forecast_periods', [])

        for period in periods:
            full_date = period.get('full_date')
            if not full_date:
                continue # Skip periods without a full date

            # --- Calculate Hike Score (as before) --- 
            hike_score = 0
            temp_min = period.get('temp_min_c')
            temp_max = period.get('temp_max_c')
            temp_chill = period.get('temp_chill_c')
            wind = period.get('wind_kph')
            gust = period.get('gust_kph')
            rain = period.get('rain_mm', 0)
            snow = period.get('snow_cm', 0)
            
            effective_min_temp = temp_min if temp_chill is None else min(temp_min or 999, temp_chill or 999)
            if effective_min_temp is not None and effective_min_temp < HIKING_TEMP_COLD_THRESHOLD_C:
                hike_score += abs(effective_min_temp - HIKING_TEMP_COLD_THRESHOLD_C) * SCORE_WEIGHT_COLD
            if temp_max is not None and temp_max > HIKING_TEMP_HOT_THRESHOLD_C:
                 hike_score += (temp_max - HIKING_TEMP_HOT_THRESHOLD_C) * SCORE_WEIGHT_HOT
            
            max_wind = -1
            if wind is not None: max_wind = max(max_wind, wind)
            if gust is not None: max_wind = max(max_wind, gust)
            if max_wind > 30: # Penalize wind over 30 kph
                 hike_score += ((max_wind - 30) / 10) * SCORE_WEIGHT_WIND 
            
            if rain is not None and rain > 0:
                 hike_score += rain * SCORE_WEIGHT_RAIN
            if snow is not None and snow > 0:
                 hike_score += snow * SCORE_WEIGHT_SNOW

            # --- Photography Potential (as before) --- 
            photo_potential = "Poor"
            weather_desc = period.get('weather_icon_alt', '').lower()
            has_sunrise_sunset = period.get('sunrise') not in [None, 'N/A'] or period.get('sunset') not in [None, 'N/A']

            if 'clear' in weather_desc:
                photo_potential = "Good (Clear)"
            elif 'few' in weather_desc or 'scattered' in weather_desc or 'part' in weather_desc:
                photo_potential = "Excellent (Partly Cloudy)"
            elif 'clouds' in weather_desc: # Broken/Overcast
                 photo_potential = "Fair (Cloudy/Overcast)"
            elif 'rain' in weather_desc or 'snow' in weather_desc or 'storm' in weather_desc:
                 photo_potential = "Poor (Precipitation)"
            
            # --- Cloud Inversion Potential (as before) --- 
            inversion_potential = False
            cloud_base = period.get('cloud_base_m')
            wind = period.get('wind_kph')
            # Check if cloud base and wind are available and meet thresholds
            if cloud_base is not None and wind is not None: 
                if cloud_base < INVERSION_CLOUD_BASE_THRESHOLD_M and wind < INVERSION_WIND_THRESHOLD_KPH:
                    inversion_potential = True
            
            analysis_by_day[full_date].append({
                'location': location,
                'source': source,
                'time': period.get('time', 'N/A'),
                'hike_score': round(hike_score, 1),
                'conditions_summary': period.get('summary', '-'), # Period summary for context
                'photography_potential': photo_potential,
                'has_sunrise_sunset': has_sunrise_sunset,
                'inversion_potential': inversion_potential
            })

    # --- Format and Print Report --- 
    report_lines = [] 
    report_lines.append(f"{'-'*50}")
    report_lines.append("GENERATED FORECAST SUMMARY REPORT")
    report_lines.append(f"{'-'*50}")
    # Sort days chronologically
    sorted_days = sorted(analysis_by_day.keys())
    for day in sorted_days:
        try:
            day_display = datetime.datetime.strptime(day, '%Y-%m-%d').strftime('%A %d/%m/%Y')
        except ValueError:
            day_display = day # Fallback if date format is unexpected
        report_lines.append(f"\n--- Forecasts for: {day_display} ---")
        day_results = analysis_by_day[day]

        # --- De-duplicate results for the day based on (location, time) --- START
        unique_day_results = []
        seen_location_times = set()
        for res in day_results:
            loc_time_key = (res.get('location'), res.get('time'))
            if loc_time_key not in seen_location_times:
                unique_day_results.append(res)
                seen_location_times.add(loc_time_key)
        # --- De-duplicate results for the day --- END

        results_by_location = defaultdict(list)
        for res in unique_day_results:
            results_by_location[res['location']].append(res)
        # --- Hiking/Camping Recommendations --- 
        report_lines.append("\n  **Hiking/Camping Prospects for Munros (Lower score is better):**") # Changed title slightly
        
        # --- Filter unique results to only include specific Munros --- START
        munro_only_results = [
            res for res in unique_day_results 
            if not any(excl in res.get('location', '') for excl in ['(Proxy)', '(Averaged)', '(OpenWeatherMap)'])
        ]
        # --- Filter unique results --- END

        def sort_key_hike(item):
            # Sort key remains the same (score ascending)
            prio = 0 # Priority doesn't matter as much now we filter first
            return (item['hike_score'], prio)
            
        # Sort the filtered Munro list
        sorted_hike = sorted(munro_only_results, key=sort_key_hike)
        
        if not sorted_hike:
             report_lines.append("    No specific Munro forecast data found for this day.")
        else:
             # REMOVED limit - Show all Munro periods
             for i, res in enumerate(sorted_hike): # Iterate through all sorted munros
                 # Corrected f-string: ensure no escaped quotes are needed if using double quotes externally
                 report_lines.append(f"    {i+1}. {res['location']} ({res['time']}): Score {res['hike_score']} ({res['conditions_summary']})")
             # REMOVED check for limit > 5
             # if len(sorted_hike) > limit:
             #     report_lines.append(\"    (... and more)\")
        # --- Photography Recommendations --- 
        report_lines.append("\n  **Best Photography Prospects (Sunrise/Sunset & Clouds):**")
        # Prioritize OWM data for sunrise/sunset times
        # Sort by potential (Excellent > Good > Fair > Poor), then prioritize OWM source
        def sort_key_photo(item):
            # Simplified logic to avoid syntax errors
            potential_str = item.get('photography_potential', '')
            potential_base_str = potential_str.split(' (', 1)[0]
            rank_map = {"Excellent": 0, "Good": 1, "Fair": 2, "Poor": 3}
            potential_rank = rank_map.get(potential_base_str, 4) # Default to 4 (worse than Poor)
            
            source_prio = 0 if 'OpenWeatherMap' in item.get('source', '') else 1
            has_sun_times = 0 if item.get('has_sunrise_sunset', False) else 1
            
            return (potential_rank, has_sun_times, source_prio)

        # Focus on Daily OWM data if available from the original day_results
        sorted_photo = sorted([p for p in day_results if p.get('time') == 'Daily'], key=sort_key_photo) 
        if not sorted_photo:
            # Fallback: If no OWM/Daily, show best potential from any source for AM/PM from original day_results
            sorted_photo = sorted([p for p in day_results if p.get('time') in ['AM', 'PM']], key=sort_key_photo)
        
        # Display unique locations for photography
        if not sorted_photo:
            report_lines.append("    No comparable data found.")
        else:
             limit = 3
             displayed_locs = set()
             count = 0
             for res in sorted_photo:
                 if count >= limit: break
                 loc_key = res['location'].split(' (', 1)[0]
                 if loc_key not in displayed_locs:
                     report_lines.append(f"    - {res['location']}: {res['photography_potential']} {'(Sunrise/Sunset available)' if res['has_sunrise_sunset'] else ''}")
                     displayed_locs.add(loc_key)
                     count += 1 
             if len(sorted_photo) > count and count >= limit:
                  report_lines.append("    (...)")
                  
        # --- Cloud Inversion Potential --- START
        report_lines.append("\n  **Potential Cloud Inversions (Low Cloud & Low Wind):**")
        inversion_periods = [res for res in unique_day_results if res.get('inversion_potential')] 
        if not inversion_periods:
             # Corrected f-string syntax
             report_lines.append(f"    None indicated based on criteria (Cloud Base < {INVERSION_CLOUD_BASE_THRESHOLD_M}m & Wind < {INVERSION_WIND_THRESHOLD_KPH}kph).")
        else:
             # Sort by time for readability
             def sort_key_time(item):
                  time_order = {"AM": 0, "PM": 1, "night": 2}.get(item.get('time'), 99)
                  return time_order
             inversion_periods.sort(key=sort_key_time)
             for res in inversion_periods:
                 # Corrected f-string syntax
                 report_lines.append(f"    - {res['location']} ({res['time']})")
        # --- Cloud Inversion Potential --- END
                 
        # --- Astrophotography Prospects (Clear Nights) --- START
        report_lines.append("\n  **Astrophotography Prospects (Clear Nights):**")
        # Find clear night periods from the unique results for the day
        clear_night_periods = [
            res for res in unique_day_results 
            if res.get('time') == 'night' and 'clear' in res.get('photography_potential', '').lower()
        ]
        
        if not clear_night_periods:
             report_lines.append("    No clear night periods indicated.") # Removed f-string as it wasn't needed
        else:
             # Sort by location name for consistency
             clear_night_periods.sort(key=lambda x: x.get('location', ''))
             for res in clear_night_periods:
                 report_lines.append(f"    - {res['location']} (Night)") # This f-string is fine
        report_lines.append("    (Note: Aurora activity is not assessed by this tool.)")
        # --- Astrophotography Prospects (Clear Nights) --- END
                 
        # --- Individual Forecast Summaries (from loaded overall_summaries) --- START
        report_lines.append("\\n  **Individual Forecast Summaries (First Day):**")
        munro_summaries_list = []
        if day in overall_summaries:
            for location, summary_dict in sorted(overall_summaries[day].items()): # Sort by location name
                # Filter out non-munro reports
                if not any(excl in location for excl in ['(Proxy)', '(Averaged)', '(OpenWeatherMap)']):
                    summary_str = summary_dict.get('conditions', 'Summary not found.')
                    # Optionally add photo summary if available
                    # photo_str = summary_dict.get('photo') 
                    # if photo_str: summary_str += f" (Photo: {photo_str})"
                    munro_summaries_list.append(f"    - **{location}:** {summary_str}")
        
        if not munro_summaries_list:
             report_lines.append("    No individual Munro summaries available for this day.")
        else:
             report_lines.extend(munro_summaries_list)
        # --- Individual Munro Summaries --- END
                 
    report_lines.append(f"{'-'*50}")
    
    # --- Save Report to File --- 
    report_content = "\n".join(report_lines)
    report_ts = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    report_filename = f"summary_report_{report_ts}.md"
    report_filepath = os.path.join(forecast_dir, report_filename) # Save in base forecast dir
    
    try:
        with open(report_filepath, 'w', encoding='utf-8') as f:
            f.write(report_content)
        logger.info(f"Forecast analysis summary saved to: {report_filepath}")
    except Exception as e:
        logger.error(f"Failed to save summary report to {report_filepath}: {e}", exc_info=True)

    # --- Print Report to Console (Optional) ---
    print("\n\n" + report_content) # Print the collected report
    # logger.info("Forecast analysis summary generated.") # Already logged save success/failure


# --- Main Execution Block ---

if __name__ == "__main__":
    logger.info("Starting weather scraper script.")
    # Note on scheduling:
    # To run this daily, use cron (Linux/macOS) or Task Scheduler (Windows).
    # Example cron job (runs at 7 AM daily):
    # 0 7 * * * /usr/bin/python3 /path/to/weather_scraper.py >> /path/to/weather.log 2>&1
    # Make sure paths are correct and python environment is accessible.

    config_data = load_config(CONFIG_FILE)
    if not config_data:
        logger.critical("Script exiting due to configuration load failure.")
        exit(1) # Exit with error code

    # Note on API Keys:
    # Avoid committing keys directly to config files in Git.
    # Use environment variables (as implemented) or a dedicated secrets management tool.

    # --- Create base forecasts directory --- ADDED
    try:
        os.makedirs("forecasts", exist_ok=True)
        logger.info("Base forecast directory 'forecasts' ensured.")
    except OSError as e:
        logger.critical(f"Could not create base forecast directory 'forecasts': {e}. Exiting.")
        exit(1)
    # --- END Add ---

    try:
        num_processed = process_locations(config_data)
        if num_processed > 0:
            logger.info(f"Successfully processed {num_processed} area(s).")
            # --- Call analysis function AFTER processing --- 
            analyze_saved_forecasts()
        else:
            logger.info("No areas were successfully processed or defined.")
    except Exception as e:
        logger.critical(f"An unexpected error occurred during main processing: {e}", exc_info=True)
        exit(1)

    logger.info("Weather scraper script finished.")
    exit(0) # Exit cleanly 