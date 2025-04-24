# Weather Forecast Scraper & Analyzer

This Python script fetches detailed weather forecasts for specified locations (primarily mountainous areas in Scotland, but adaptable) from Mountain-Forecast.com and OpenWeatherMap (OWM), analyzes the data, generates summaries, and saves the forecasts in multiple formats (JSON, Markdown, HTML). It also produces a summary report ranking locations based on hiking/camping suitability, photography potential, and cloud inversion chances.

## Features

*   **Multi-Source Fetching:** Retrieves detailed hourly forecasts from Mountain-Forecast.com (via direct scraping or a proxy) and daily forecasts from OpenWeatherMap One Call API.
*   **Configuration Driven:** Uses a `config.yaml` file to define locations, forecast sources, API keys (partially), and thresholds.
*   **Data Parsing:** Robustly parses HTML from Mountain-Forecast.com and JSON from OWM.
*   **Averaging:** Calculates an average forecast for an area based on multiple individual Munro forecasts (e.g., averaging forecasts for several peaks within the Cairngorms).
*   **Summarization:**
    *   Generates daily text summaries highlighting potential hazards for hiking/camping (high wind, heavy precipitation, extreme temperatures/wind chill).
    *   Provides photography-focused summaries based on sunrise/sunset times and cloud cover (from OWM data).
*   **Analysis & Reporting:**
    *   Analyzes saved forecasts across all locations.
    *   Generates a Markdown `summary_report_YYYYMMDD_HHMMSS.md` that:
        *   Ranks locations by hiking/camping suitability for the next few days.
        *   Highlights good photography opportunities (sunrise/sunset).
        *   Identifies potential cloud inversion periods (based on low cloud base, low wind, and high humidity > 95%).
        *   Provides an overall weekend summary.
*   **Multiple Output Formats:** Saves individual forecasts as:
    *   `.json`: Raw parsed data.
    *   `.md`: Formatted Markdown tables, suitable for easy viewing or integration.
    *   `.html`: Basic HTML page with embedded CSS for browser viewing.
*   **Logging:** Comprehensive logging to track script execution, fetches, parsing errors, and analysis steps.
*   **Environment Variable Support:** Securely handles the OWM API key via the `OWM_API_KEY` environment variable.

## Setup

1.  **Clone the Repository:**
    ```bash
    git clone <your-repository-url>
    cd weather-forecast-alerts
    ```
2.  **Create a Virtual Environment (Recommended):**
    ```bash
    python3 -m venv venv
    source venv/bin/activate  # On Windows use `venv\Scripts\activate`
    ```
3.  **Install Dependencies:**
    ```bash
    pip install -r requirements.txt
    ```
    *(Note: A `requirements.txt` file should be created containing necessary libraries like `requests`, `beautifulsoup4`, `PyYAML`, `python-dotenv` etc.)*

4.  **Configure:**
    *   **Copy Example Config:** `cp config.yaml.example config.yaml`
    *   **Edit `config.yaml`:** Modify the `locations` section to define the areas and specific mountains/coordinates you want forecasts for. Adjust thresholds (`wind_threshold_kph`, `rain_threshold_mm`, etc.) if needed. See the configuration section below for details.
    *   **Set API Key:** Create a `.env` file in the project root directory and add your OpenWeatherMap API key:
        ```dotenv
        # .env
        OWM_API_KEY=your_actual_owm_api_key_here
        ```
        Alternatively, set the `OWM_API_KEY` environment variable directly in your system or shell profile. The script prioritizes the environment variable over the placeholder in `config.yaml`.

## Configuration (`config.yaml`)

The `config.yaml` file controls the script's behavior:

*   **`api_keys`:**
    *   `openweathermap`: **Placeholder only.** The actual key *must* be provided via the `OWM_API_KEY` environment variable or `.env` file.
*   **`forecast_settings`:**
    *   `cache_duration_hours`: (Optional) How long to cache HTML responses (not currently implemented in the provided script version but planned).
    *   `user_agent`: The User-Agent string used for HTTP requests.
    *   `request_timeout_seconds`: Timeout for fetching URLs.
*   **`thresholds`:** Defines values used in summaries and analysis:
    *   `wind_threshold_kph`: Wind speed considered "High Wind".
    *   `gust_threshold_kph`: Gust speed considered significant.
    *   `rain_threshold_mm`: Precipitation amount considered "Heavy Rain" (per 3-hour period for MF).
    *   `snow_threshold_cm`: Snowfall amount considered "Heavy Snow".
    *   `freezing_level_low_m`, `freezing_level_high_m`: Used for context.
    *   `temp_cold_c`, `temp_hot_c`: Temperature thresholds.
    *   `wind_chill_severe_c`: Severe wind chill threshold.
    *   `inversion_min_strength_c`: Minimum temperature difference between elevations for potential inversion.
    *   `inversion_min_freeze_diff_c`: Minimum temperature difference *relative to freezing* for inversion potential.
*   **`locations`:** A dictionary where each key is an `area_name` (e.g., `cairngorms`, `loch_lomond`).
    *   **`owm_fallback`:** (Optional) Coordinates (`latitude`, `longitude`) for an OWM forecast for the general area.
    *   **`mf_proxy_url`:** (Optional) URL to a Mountain-Forecast proxy/aggregator page for the area.
    *   **`munros`:** (Optional) A list of specific mountains within the area. Each item is a dictionary:
        *   `name`: Name of the Munro (e.g., "Ben Nevis").
        *   `url`: Full URL to the Mountain-Forecast.com page for that specific peak/elevation.

The script will attempt to fetch data based on the configuration for each location:
1.  OWM forecast using `owm_fallback` coordinates.
2.  Mountain-Forecast using `mf_proxy_url`.
3.  Mountain-Forecast for each individual Munro listed under `munros`.
4.  If multiple Munro forecasts are fetched for an area, an `Average` forecast is calculated.

## Usage

Run the script from the project's root directory:

```bash
python weather_scraper.py
```

The script will:
1.  Load the configuration.
2.  Fetch data for each configured location.
3.  Parse the fetched data.
4.  Calculate averages where applicable.
5.  Generate summaries for each forecast.
6.  Display forecasts to the console (controlled by `logging` level).
7.  Save forecasts (.json, .md, .html) into the `forecasts/<area_name>/` directories.
8.  Analyze all saved JSON forecasts.
9.  Generate and save the `summary_report_YYYYMMDD_HHMMSS.md` in the `forecasts/` directory.
10. Print the summary report to the console.

## Output Files

*   **`forecasts/`**: Base directory for all output.
    *   **`<area_name>/`**: Subdirectory for each location defined in `config.yaml`.
        *   `YYYYMMDD_HHMMSS_<location_name>_<source>.json`: Raw parsed JSON data.
        *   `YYYYMMDD_HHMMSS_<location_name>_<source>.md`: Forecast formatted as Markdown.
        *   `YYYYMMDD_HHMMSS_<location_name>_<source>.html`: Forecast formatted as HTML.
        *   *(Note: `<location_name>` will be the Munro name, 'OWM', 'MF_Proxy', or 'Average')*
    *   **`summary_report_YYYYMMDD_HHMMSS.md`**: The analysis report comparing all fetched locations.
*   **`weather_scraper.log`**: Log file containing detailed execution information (if logging to file is configured).

## Scheduling

To run the script automatically (e.g., daily), use a task scheduler:

*   **Linux/macOS (cron):**
    Edit your crontab (`crontab -e`) and add a line similar to this (adjust paths and timing):
    ```crontab
    # Run weather scraper daily at 7:00 AM
    0 7 * * * /path/to/your/venv/bin/python /path/to/weather-forecast-alerts/weather_scraper.py >> /path/to/weather-forecast-alerts/cron.log 2>&1
    ```
    *Ensure the Python executable path points to the one inside your virtual environment.*
*   **Windows (Task Scheduler):**
    Use the Task Scheduler GUI to create a new task that runs the Python script using the virtual environment's Python executable at your desired frequency.

## Dependencies

*   requests
*   beautifulsoup4
*   PyYAML
*   python-dotenv (optional, for loading `.env` file)
*   colorama (optional, for colored terminal output)

*(Ensure these are listed in `requirements.txt`)*

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bugs, feature requests, or improvements.

## License

*(Optional: Add license information here, e.g., MIT License)* 