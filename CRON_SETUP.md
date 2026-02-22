# Cron Job Setup for Weather Scraper

This document explains how to set up automated weather scraping using cron on macOS.

## Overview

The weather scraper runs every 4 hours to fetch updated forecasts from mountain-forecast.com and OpenWeatherMap. This ensures the application always has recent weather data for Scottish mountains.

## Files

- `run_scraper.sh` - Shell script that runs the scraper with logging
- `logs/` - Directory where log files are stored (created automatically)

## Installing the Cron Job

### Step 1: Open the crontab editor

```bash
crontab -e
```

This opens your user's crontab file in the default editor (usually vim or nano).

### Step 2: Add the cron entry

Add the following line to run the scraper every 4 hours:

```
0 */4 * * * /Users/matthewdeane/Documents/Data\ Science/python/_projects/_p-weather-forecast-alerts/run_scraper.sh
```

**Cron schedule breakdown:**
- `0` - At minute 0 (top of the hour)
- `*/4` - Every 4 hours (00:00, 04:00, 08:00, 12:00, 16:00, 20:00)
- `* * *` - Every day of month, every month, every day of week

### Step 3: Save and exit

- **vim**: Press `Esc`, type `:wq`, press `Enter`
- **nano**: Press `Ctrl+O` to save, `Ctrl+X` to exit

### Alternative: Single command to add cron job

If you prefer not to manually edit, run this command:

```bash
(crontab -l 2>/dev/null; echo '0 */4 * * * /Users/matthewdeane/Documents/Data\ Science/python/_projects/_p-weather-forecast-alerts/run_scraper.sh') | crontab -
```

## Verifying the Cron Job

### Check if the cron job is installed

```bash
crontab -l
```

You should see your cron entry in the output.

### Test the script manually

Before relying on cron, test the script works:

```bash
/Users/matthewdeane/Documents/Data\ Science/python/_projects/_p-weather-forecast-alerts/run_scraper.sh
```

Then check the logs directory:

```bash
ls -la "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"
```

## Checking the Logs

### View all log files

```bash
ls -lt "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"
```

### View the most recent log

```bash
cat "$(ls -t "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"*.log | head -1)"
```

### View last 50 lines of most recent log

```bash
tail -50 "$(ls -t "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"*.log | head -1)"
```

### Monitor logs in real-time (during a run)

```bash
tail -f "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"*.log
```

### Check for errors in recent logs

```bash
grep -i "error\|fail\|exception" "/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/"*.log
```

## Log Management

The `run_scraper.sh` script automatically:
- Creates timestamped log files (e.g., `scraper_2025-02-04_08-00-00.log`)
- Deletes logs older than 30 days

Log files are stored in:
```
/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/
```

## macOS Specific Notes

### Grant Full Disk Access (if needed)

macOS may require you to grant Full Disk Access to cron:

1. Open **System Preferences** > **Security & Privacy** > **Privacy**
2. Select **Full Disk Access** in the left sidebar
3. Click the lock icon and authenticate
4. Click **+** and add `/usr/sbin/cron`

### Enable cron on newer macOS versions

If cron doesn't run, you may need to allow it:

```bash
sudo launchctl list | grep cron
```

If cron is not listed, load it:

```bash
sudo launchctl load -w /System/Library/LaunchDaemons/com.vix.cron.plist
```

## Alternative: Using launchd (macOS native)

macOS's native scheduler is launchd. If you prefer using launchd instead of cron:

### Create a plist file

Save this as `~/Library/LaunchAgents/com.weather.scraper.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.weather.scraper</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/run_scraper.sh</string>
    </array>
    <key>StartInterval</key>
    <integer>14400</integer>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/launchd_stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/Users/matthewdeane/Documents/Data Science/python/_projects/_p-weather-forecast-alerts/logs/launchd_stderr.log</string>
</dict>
</plist>
```

### Load the launchd job

```bash
launchctl load ~/Library/LaunchAgents/com.weather.scraper.plist
```

### Unload the launchd job

```bash
launchctl unload ~/Library/LaunchAgents/com.weather.scraper.plist
```

## Troubleshooting

### Cron job not running

1. Check cron is running: `ps aux | grep cron`
2. Check system log: `log show --predicate 'process == "cron"' --last 1h`
3. Verify script is executable: `ls -la run_scraper.sh`
4. Test script manually first

### Script runs but no output

1. Check the logs directory exists: `ls logs/`
2. Verify Python path is correct in `run_scraper.sh`
3. Run script manually to see errors

### Permission denied errors

1. Ensure script is executable: `chmod +x run_scraper.sh`
2. Check Full Disk Access settings on macOS
3. Verify Python has network access

### Mountain-forecast.com blocking requests

The scraper includes delays and User-Agent rotation. If blocked:
1. Check `failed_munros_*.csv` in the project directory
2. Increase delays in `weather_scraper.py`
3. Check if your IP is temporarily blocked

## Removing the Cron Job

To remove the cron job:

```bash
crontab -e
```

Delete the line containing `run_scraper.sh`, then save and exit.

Or remove all cron jobs (be careful!):

```bash
crontab -r
```
