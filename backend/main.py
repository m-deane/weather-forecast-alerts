"""
Main application entry point for Scottish Mountain Weather API
"""

import asyncio
import logging
import sys
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.staticfiles import StaticFiles
import uvicorn

from .api import app as api_app
from .database import startup_database, db_health_monitor
from .cache import cache_manager, get_redis
from .security import SecurityMiddleware, security_config, get_security_info
from .weather_service import WeatherService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('weather_api.log')
    ]
)

logger = logging.getLogger(__name__)

# Global weather service instance
weather_service = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    logger.info("Starting Scottish Mountain Weather API...")
    
    try:
        # Initialize database
        startup_database()
        logger.info("✓ Database initialized")
        
        # Test Redis connection
        try:
            redis_client = get_redis()
            redis_client.ping()
            logger.info("✓ Redis connection established")
        except Exception as e:
            logger.warning(f"Redis connection failed: {e}")
        
        # Initialize weather service
        global weather_service
        weather_service = WeatherService()
        await weather_service.initialize()
        logger.info("✓ Weather service initialized")
        
        # Start scheduled weather updates (every 4 hours)
        if not hasattr(weather_service, '_update_task_started'):
            await weather_service.start_scheduled_updates(interval_hours=4)
            weather_service._update_task_started = True
            logger.info("✓ Scheduled weather updates started")
        
        logger.info("🚀 Scottish Mountain Weather API started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise
    
    finally:
        # Cleanup on shutdown
        logger.info("Shutting down Scottish Mountain Weather API...")
        
        if weather_service:
            await weather_service.cleanup()
            logger.info("✓ Weather service cleaned up")
        
        logger.info("👋 Scottish Mountain Weather API shutdown complete")

# Create main FastAPI application
app = FastAPI(
    title="Scottish Mountain Weather API",
    description="""
    **Weather forecasting API for Scottish mountains and hills**
    
    This API provides accurate, up-to-date weather forecasts specifically designed for 
    Scottish mountain activities including hiking, climbing, and photography.
    
    ## Features
    
    * **Specialized Mountain Forecasts**: Weather data from multiple sources including MWIS and Met Office
    * **Safety-First Design**: Hiking suitability scores and risk assessments
    * **Scottish Expertise**: Local knowledge and micro-climate awareness
    * **Mobile Optimized**: Fast, efficient API designed for mobile applications
    * **Real-time Updates**: Weather data updated every 4 hours
    
    ## Getting Started
    
    1. Search for locations using `/api/v1/locations`
    2. Get weather forecasts using `/api/v1/weather/{location_id}`
    3. Compare conditions using `/api/v1/weather/compare`
    
    ## Rate Limits
    
    * **Per minute**: 60 requests
    * **Per hour**: 1,000 requests  
    * **Per day**: 10,000 requests
    
    ## Support
    
    For issues or questions, please contact the development team.
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json"
)

# Add security middleware
app.add_middleware(SecurityMiddleware)

# Configure CORS
if security_config.enable_cors:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=security_config.allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )

# Mount the API routes
app.mount("/api", api_app)

# =============================================
# HEALTH AND STATUS ENDPOINTS
# =============================================

@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "message": "Scottish Mountain Weather API",
        "version": "1.0.0",
        "status": "operational",
        "documentation": "/docs",
        "health": "/health"
    }

@app.get("/health")
async def health_check():
    """Simple health check"""
    return {
        "status": "healthy",
        "service": "Scottish Mountain Weather API",
        "version": "1.0.0"
    }

@app.get("/health/detailed")
async def detailed_health_check():
    """Detailed health check with all services"""
    health_status = {
        "status": "healthy",
        "services": {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    # Check database
    try:
        db_health = db_health_monitor.get_health_status()
        health_status["services"]["database"] = db_health
        if db_health["status"] != "healthy":
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["database"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check cache
    try:
        cache_health = cache_manager.health_check()
        health_status["services"]["cache"] = cache_health
        if cache_health["status"] != "healthy":
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["cache"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "degraded"
    
    # Check weather service
    try:
        if weather_service and weather_service.is_running:
            health_status["services"]["weather_service"] = {"status": "healthy", "updates_running": True}
        else:
            health_status["services"]["weather_service"] = {"status": "degraded", "updates_running": False}
            health_status["status"] = "degraded"
    except Exception as e:
        health_status["services"]["weather_service"] = {"status": "unhealthy", "error": str(e)}
        health_status["status"] = "unhealthy"
    
    return health_status

@app.get("/status")
async def api_status():
    """API status and configuration information"""
    return {
        "api": {
            "name": "Scottish Mountain Weather API",
            "version": "1.0.0",
            "environment": "development",  # This would come from config
        },
        "security": get_security_info(),
        "cache": cache_manager.get_stats(),
        "weather": {
            "update_interval_hours": 4,
            "sources": ["mwis", "met_office", "mountain_forecast", "openweathermap"],
            "last_update": "TBD"  # Would get from weather service
        }
    }

# =============================================
# ERROR HANDLERS
# =============================================

@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    """Handle 404 errors"""
    return JSONResponse(
        status_code=404,
        content={
            "error": "Not Found",
            "message": "The requested resource was not found",
            "path": str(request.url.path),
            "method": request.method
        }
    )

@app.exception_handler(500)
async def internal_error_handler(request: Request, exc):
    """Handle 500 errors"""
    logger.error(f"Internal server error: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal Server Error",
            "message": "An unexpected error occurred",
            "path": str(request.url.path)
        }
    )

@app.exception_handler(429)
async def rate_limit_handler(request: Request, exc):
    """Handle rate limit errors"""
    return JSONResponse(
        status_code=429,
        content={
            "error": "Rate Limit Exceeded",
            "message": "Too many requests. Please try again later.",
            "path": str(request.url.path)
        }
    )

# =============================================
# MANUAL WEATHER UPDATE ENDPOINT
# =============================================

@app.post("/admin/update-weather")
async def manual_weather_update():
    """Manually trigger weather data update (admin only)"""
    if not weather_service:
        return JSONResponse(
            status_code=503,
            content={"error": "Weather service not available"}
        )
    
    try:
        await weather_service.update_weather_data()
        return {"message": "Weather data update completed successfully"}
    except Exception as e:
        logger.error(f"Manual weather update failed: {e}")
        return JSONResponse(
            status_code=500,
            content={"error": f"Weather update failed: {str(e)}"}
        )

# =============================================
# DEVELOPMENT ENDPOINTS
# =============================================

@app.get("/dev/cache-stats")
async def cache_stats():
    """Get cache statistics (development only)"""
    return {
        "cache_stats": cache_manager.get_stats(),
        "cache_health": cache_manager.health_check()
    }

@app.post("/dev/clear-cache")
async def clear_cache():
    """Clear all cache (development only)"""
    try:
        from .cache import clear_all_cache
        result = clear_all_cache()
        return {"success": result, "message": "Cache cleared" if result else "Failed to clear cache"}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to clear cache: {str(e)}"}
        )

# =============================================
# APPLICATION RUNNER
# =============================================

def create_app() -> FastAPI:
    """Create and configure the FastAPI application"""
    return app

if __name__ == "__main__":
    # Run the application
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,  # Enable auto-reload for development
        log_level="info",
        access_log=True
    )