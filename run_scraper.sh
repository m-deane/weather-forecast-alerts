#!/bin/bash
#
# Weather Scraper Cron Script
# Runs the Scottish Mountain Weather scraper and logs output
#
# Usage: ./run_scraper.sh
# Recommended: Run via cron every 4 hours
#

# Project directory
PROJECT_DIR="/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts"

# Log directory and file
LOG_DIR="${PROJECT_DIR}/logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
LOG_FILE="${LOG_DIR}/scraper_${TIMESTAMP}.log"

# Python path (using Anaconda)
PYTHON_PATH="/Users/matthewdeane/anaconda3/bin/python3"

# Create logs directory if it doesn't exist
mkdir -p "${LOG_DIR}"

# Start logging
echo "========================================" >> "${LOG_FILE}"
echo "Weather Scraper Run - ${TIMESTAMP}" >> "${LOG_FILE}"
echo "========================================" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# Change to project directory
cd "${PROJECT_DIR}" || {
    echo "ERROR: Failed to change to project directory" >> "${LOG_FILE}"
    exit 1
}

echo "Working directory: $(pwd)" >> "${LOG_FILE}"
echo "Python: ${PYTHON_PATH}" >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

# Run the weather scraper
echo "Starting weather scraper..." >> "${LOG_FILE}"
echo "" >> "${LOG_FILE}"

"${PYTHON_PATH}" weather_scraper.py >> "${LOG_FILE}" 2>&1
EXIT_CODE=$?

echo "" >> "${LOG_FILE}"
echo "========================================" >> "${LOG_FILE}"
echo "Scraper finished with exit code: ${EXIT_CODE}" >> "${LOG_FILE}"
echo "Completed at: $(date +"%Y-%m-%d %H:%M:%S")" >> "${LOG_FILE}"
echo "========================================" >> "${LOG_FILE}"

# Clean up old logs (keep last 30 days)
find "${LOG_DIR}" -name "scraper_*.log" -mtime +30 -delete 2>/dev/null

# Exit with scraper's exit code
exit ${EXIT_CODE}
