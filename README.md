# Weather Forecast Alerts

A Python script to scrape weather forecasts from mountain-forecast.com and OpenWeatherMap for multiple Scottish mountain locations. The script generates daily summaries and recommendations for hiking, camping, and photography conditions.

## Features

- Scrapes detailed weather forecasts from mountain-forecast.com for specific Munros and area proxy locations
- Fetches additional forecasts from OpenWeatherMap API (optional)
- Calculates averaged forecasts when multiple Munros are in the same area
- Generates hiking/camping suitability scores
- Identifies photography and cloud inversion opportunities
- Saves forecasts in JSON, Markdown, and HTML formats
- Produces a comprehensive summary report with weekend analysis

## Recent Improvements (2025)

- **Enhanced Robustness**: Added retry logic with exponential backoff for failed requests
- **URL Validation**: Automatic detection and correction of common URL spelling mistakes
- **User-Agent Rotation**: Multiple User-Agent strings to avoid blocking
- **Better Error Handling**: Improved parsing with fallback selectors for HTML changes
- **Page Validation**: Detects info/redirect pages that don't contain forecast data
- **Request Delays**: Random delays between requests to avoid rate limiting
- **Data Validation**: Validates scraped data before saving

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Configure locations in `config.yaml`:
   - Add your OpenWeatherMap API key (optional)
   - Define locations with their latitude/longitude
   - Add mountain-forecast.com URLs for specific Munros

3. Run the scraper:
```bash
python weather_scraper.py
```

## Configuration

The `config.yaml` file contains:
- OpenWeatherMap API key (optional - can use environment variable `OWM_API_KEY`)
- Location definitions with coordinates and mountain URLs
- Each location can have multiple Munro forecasts

## Output

Forecasts are saved in the `forecasts/` directory:
- Individual location folders containing JSON, HTML, and Markdown files
- Summary report with hiking scores and recommendations
- Failed URL tracking for troubleshooting

## Troubleshooting

If URLs fail to fetch:
1. Check `failed_munros_*.csv` for specific failures
2. Run `python check_urls.py` to validate all configured URLs
3. Update URLs in `config.yaml` if mountain-forecast.com has changed them

## Scheduling

To run automatically, use cron (Linux/macOS) or Task Scheduler (Windows):
```bash
# Example cron job (runs at 7 AM daily)
0 7 * * * /usr/bin/python3 /path/to/weather_scraper.py >> /path/to/weather.log 2>&1
```

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