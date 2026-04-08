"""
Hugging Face Spaces entry point.

Serves the FastAPI backend (simple_api.py) and the built React frontend
from a single process on port 7860.

Uses ASGI middleware to route requests: /api/* and /docs go to FastAPI,
everything else serves the React SPA from frontend/dist/.

Runs the weather scraper on startup and every 6 hours to keep data fresh.
"""

import sys
import os
import subprocess
import threading
import time
import logging

logger = logging.getLogger("hf_app")
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")

# Add backend directory to Python path so simple_api can be imported
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

from simple_api import app  # noqa: E402
from starlette.responses import FileResponse  # noqa: E402
from starlette.types import ASGIApp, Receive, Scope, Send  # noqa: E402

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
APP_DIR = os.path.dirname(os.path.abspath(__file__))
SCRAPE_INTERVAL_HOURS = 6

# API path prefixes that should be handled by FastAPI
API_PREFIXES = ("/api/", "/docs", "/openapi.json", "/redoc", "/health")


class SPAMiddleware:
    """
    ASGI middleware that serves the React SPA for non-API routes.
    API requests pass through to FastAPI; everything else serves
    static files from frontend/dist/ with index.html as fallback.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = scope["path"]

        # Let API routes pass through to FastAPI
        if any(path.startswith(prefix) for prefix in API_PREFIXES):
            await self.app(scope, receive, send)
            return

        # Serve static files from frontend/dist
        if path.startswith("/assets/"):
            file_path = os.path.join(FRONTEND_DIR, path.lstrip("/"))
            if os.path.isfile(file_path):
                response = FileResponse(file_path)
                await response(scope, receive, send)
                return

        # Try serving exact file match (e.g., /favicon.ico, /manifest.json)
        if path != "/":
            file_path = os.path.join(FRONTEND_DIR, path.lstrip("/"))
            if os.path.isfile(file_path):
                response = FileResponse(file_path)
                await response(scope, receive, send)
                return

        # SPA fallback: serve index.html for all other routes
        index_path = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.isfile(index_path):
            response = FileResponse(index_path)
            await response(scope, receive, send)
            return

        # Frontend not built yet - fall through to FastAPI
        await self.app(scope, receive, send)


def run_scraper():
    """Run the weather scraper subprocess."""
    scraper_path = os.path.join(APP_DIR, "weather_scraper.py")
    if not os.path.isfile(scraper_path):
        logger.warning("weather_scraper.py not found at %s — skipping scrape", scraper_path)
        return False

    logger.info("Starting weather scrape...")
    try:
        result = subprocess.run(
            ["python", scraper_path],
            cwd=APP_DIR,
            capture_output=True,
            text=True,
            timeout=600,
        )
        if result.returncode == 0:
            logger.info("Weather scrape completed successfully")
            return True
        else:
            logger.error("Weather scrape failed (exit %d): %s", result.returncode, result.stderr[:500])
            return False
    except subprocess.TimeoutExpired:
        logger.error("Weather scrape timed out after 600s")
        return False
    except Exception as e:
        logger.error("Weather scrape error: %s", e)
        return False


def scraper_scheduler():
    """Background thread that runs the scraper on startup then every SCRAPE_INTERVAL_HOURS."""
    # Run immediately on startup
    run_scraper()

    # Then run every N hours
    while True:
        time.sleep(SCRAPE_INTERVAL_HOURS * 3600)
        run_scraper()


# Start the scraper scheduler in a background daemon thread
scraper_thread = threading.Thread(target=scraper_scheduler, daemon=True, name="scraper-scheduler")
scraper_thread.start()
logger.info("Scraper scheduler started (runs every %d hours)", SCRAPE_INTERVAL_HOURS)

# Wrap the FastAPI app with SPA middleware
app = SPAMiddleware(app)  # type: ignore[assignment]

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=7860)
