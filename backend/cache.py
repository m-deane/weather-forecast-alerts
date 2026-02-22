"""
Caching layer for Scottish Mountain Weather API
Redis-based caching with intelligent cache management
"""

import redis
import json
import pickle
from datetime import datetime, timedelta
from typing import Any, Optional, Dict, List, Union
from functools import wraps
import hashlib
import logging
from contextlib import asynccontextmanager

from pydantic import BaseModel

logger = logging.getLogger(__name__)

class CacheConfig(BaseModel):
    """Cache configuration settings"""
    redis_url: str = "redis://localhost:6379"
    default_ttl: int = 3600  # 1 hour; safe default for most data
    weather_data_ttl: int = 14400  # 4 hours; matches scraper update interval
    location_data_ttl: int = 86400  # 24 hours; mountain metadata rarely changes
    search_results_ttl: int = 3600  # 1 hour; same searches return same results within update cycle
    user_preferences_ttl: int = 86400  # 24 hours; preferences change infrequently
    max_connections: int = 10  # sized for expected ~100 concurrent users
    health_check_interval: int = 30  # seconds; frequent enough to detect outages quickly

# Global cache configuration
cache_config = CacheConfig()

# Redis connection pool
_redis_pool = None

def get_redis() -> redis.Redis:
    """Get Redis connection from pool"""
    global _redis_pool
    
    if _redis_pool is None:
        try:
            _redis_pool = redis.ConnectionPool.from_url(
                cache_config.redis_url,
                max_connections=cache_config.max_connections,
                retry_on_timeout=True,
                socket_keepalive=True,
                socket_keepalive_options={}
            )
            logger.info("Redis connection pool created")
        except Exception as e:
            logger.error(f"Failed to create Redis connection pool: {e}")
            raise
    
    return redis.Redis(connection_pool=_redis_pool)

def cache_key(*args, **kwargs) -> str:
    """Generate cache key from arguments"""
    # Create a deterministic key from arguments
    key_parts = []
    
    # Add positional arguments
    for arg in args:
        if isinstance(arg, (str, int, float, bool)):
            key_parts.append(str(arg))
        else:
            key_parts.append(str(hash(str(arg))))
    
    # Add keyword arguments (sorted for consistency)
    for k, v in sorted(kwargs.items()):
        if isinstance(v, (str, int, float, bool)):
            key_parts.append(f"{k}:{v}")
        else:
            key_parts.append(f"{k}:{hash(str(v))}")
    
    # Create hash of the key for consistent length
    key_string = ":".join(key_parts)
    key_hash = hashlib.md5(key_string.encode()).hexdigest()
    
    return f"mountain_weather:{key_hash}"

class CacheManager:
    """Redis cache manager with weather-specific optimizations"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client or get_redis()
        self.stats = {
            'hits': 0,
            'misses': 0,
            'sets': 0,
            'deletes': 0,
            'errors': 0
        }
    
    def get(self, key: str, default: Any = None) -> Any:
        """Get value from cache"""
        try:
            value = self.redis.get(key)
            if value is not None:
                self.stats['hits'] += 1
                return json.loads(value)
            else:
                self.stats['misses'] += 1
                return default
        except json.JSONDecodeError:
            # Try pickle if JSON fails (for complex objects)
            try:
                value = self.redis.get(key)
                if value is not None:
                    self.stats['hits'] += 1
                    return pickle.loads(value)
            except Exception as e:
                logger.warning(f"Failed to deserialize cached value: {e}")
        except Exception as e:
            logger.error(f"Cache get error: {e}")
            self.stats['errors'] += 1
        
        self.stats['misses'] += 1
        return default
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> bool:
        """Set value in cache"""
        try:
            ttl = ttl or cache_config.default_ttl
            
            # Try JSON serialization first
            try:
                serialized_value = json.dumps(value, default=str)
            except (TypeError, ValueError):
                # Fall back to pickle for complex objects
                serialized_value = pickle.dumps(value)
            
            result = self.redis.setex(key, ttl, serialized_value)
            if result:
                self.stats['sets'] += 1
            return result
        except Exception as e:
            logger.error(f"Cache set error: {e}")
            self.stats['errors'] += 1
            return False
    
    def delete(self, key: str) -> bool:
        """Delete value from cache"""
        try:
            result = self.redis.delete(key)
            if result:
                self.stats['deletes'] += 1
            return bool(result)
        except Exception as e:
            logger.error(f"Cache delete error: {e}")
            self.stats['errors'] += 1
            return False
    
    def delete_pattern(self, pattern: str) -> int:
        """Delete keys matching pattern"""
        try:
            keys = self.redis.keys(pattern)
            if keys:
                result = self.redis.delete(*keys)
                self.stats['deletes'] += len(keys)
                return result
            return 0
        except Exception as e:
            logger.error(f"Cache delete pattern error: {e}")
            self.stats['errors'] += 1
            return 0
    
    def exists(self, key: str) -> bool:
        """Check if key exists in cache"""
        try:
            return bool(self.redis.exists(key))
        except Exception as e:
            logger.error(f"Cache exists error: {e}")
            self.stats['errors'] += 1
            return False
    
    def ttl(self, key: str) -> int:
        """Get time to live for key"""
        try:
            return self.redis.ttl(key)
        except Exception as e:
            logger.error(f"Cache TTL error: {e}")
            return -1
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        total_operations = sum(self.stats.values())
        hit_rate = (self.stats['hits'] / max(self.stats['hits'] + self.stats['misses'], 1)) * 100
        
        return {
            **self.stats,
            'total_operations': total_operations,
            'hit_rate_percent': round(hit_rate, 2)
        }
    
    def health_check(self) -> Dict[str, Any]:
        """Perform cache health check"""
        try:
            # Test basic operations
            test_key = "health_check_test"
            test_value = {"timestamp": datetime.utcnow().isoformat()}
            
            # Test set
            set_result = self.set(test_key, test_value, 60)
            
            # Test get
            get_result = self.get(test_key)
            
            # Test delete
            delete_result = self.delete(test_key)
            
            # Get Redis info
            redis_info = self.redis.info()
            
            return {
                "status": "healthy" if all([set_result, get_result, delete_result]) else "degraded",
                "operations": {
                    "set": set_result,
                    "get": bool(get_result),
                    "delete": delete_result
                },
                "redis_info": {
                    "connected_clients": redis_info.get("connected_clients", 0),
                    "used_memory_human": redis_info.get("used_memory_human", "N/A"),
                    "keyspace_hits": redis_info.get("keyspace_hits", 0),
                    "keyspace_misses": redis_info.get("keyspace_misses", 0)
                },
                "stats": self.get_stats()
            }
        except Exception as e:
            logger.error(f"Cache health check failed: {e}")
            return {
                "status": "unhealthy",
                "error": str(e),
                "stats": self.get_stats()
            }

# Global cache manager instance
cache_manager = CacheManager()

# =============================================
# CACHE DECORATORS
# =============================================

def cached(ttl: Optional[int] = None, key_prefix: str = ""):
    """Decorator for caching function results"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key
            key_parts = [key_prefix or func.__name__]
            key_parts.extend([str(arg) for arg in args])
            key_parts.extend([f"{k}:{v}" for k, v in sorted(kwargs.items())])
            
            cache_key_str = cache_key(*key_parts)
            
            # Try to get from cache
            cached_result = cache_manager.get(cache_key_str)
            if cached_result is not None:
                logger.debug(f"Cache hit for {func.__name__}")
                return cached_result
            
            # Execute function and cache result
            result = func(*args, **kwargs)
            cache_manager.set(cache_key_str, result, ttl)
            logger.debug(f"Cache miss for {func.__name__}, result cached")
            
            return result
        return wrapper
    return decorator

def cached_weather_data(ttl: Optional[int] = None):
    """Decorator specifically for weather data caching"""
    return cached(ttl or cache_config.weather_data_ttl, "weather")

def cached_location_data(ttl: Optional[int] = None):
    """Decorator specifically for location data caching"""
    return cached(ttl or cache_config.location_data_ttl, "location")

def cached_search_results(ttl: Optional[int] = None):
    """Decorator specifically for search results caching"""
    return cached(ttl or cache_config.search_results_ttl, "search")

# =============================================
# WEATHER-SPECIFIC CACHE FUNCTIONS
# =============================================

def cache_weather_forecast(location_id: str, forecast_data: Dict[str, Any], ttl: Optional[int] = None):
    """Cache weather forecast data"""
    key = cache_key("weather_forecast", location_id)
    cache_manager.set(key, forecast_data, ttl or cache_config.weather_data_ttl)

def get_cached_weather_forecast(location_id: str) -> Optional[Dict[str, Any]]:
    """Get cached weather forecast data"""
    key = cache_key("weather_forecast", location_id)
    return cache_manager.get(key)

def cache_location_search(query: str, filters: Dict[str, Any], results: List[Dict[str, Any]], ttl: Optional[int] = None):
    """Cache location search results"""
    key = cache_key("location_search", query, **filters)
    cache_manager.set(key, results, ttl or cache_config.search_results_ttl)

def get_cached_location_search(query: str, filters: Dict[str, Any]) -> Optional[List[Dict[str, Any]]]:
    """Get cached location search results"""
    key = cache_key("location_search", query, **filters)
    return cache_manager.get(key)

def cache_weather_comparison(location_ids: List[str], comparison_data: Dict[str, Any], ttl: Optional[int] = None):
    """Cache weather comparison data"""
    # Sort location IDs for consistent caching
    sorted_ids = sorted(location_ids)
    key = cache_key("weather_comparison", *sorted_ids)
    cache_manager.set(key, comparison_data, ttl or cache_config.weather_data_ttl)

def get_cached_weather_comparison(location_ids: List[str]) -> Optional[Dict[str, Any]]:
    """Get cached weather comparison data"""
    sorted_ids = sorted(location_ids)
    key = cache_key("weather_comparison", *sorted_ids)
    return cache_manager.get(key)

def invalidate_weather_cache(location_id: Optional[str] = None):
    """Invalidate weather cache for a location or all locations"""
    if location_id:
        # Invalidate specific location
        patterns = [
            f"mountain_weather:*weather_forecast*{location_id}*",
            f"mountain_weather:*weather_comparison*{location_id}*"
        ]
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
        logger.info(f"Invalidated weather cache for location: {location_id}")
    else:
        # Invalidate all weather data
        cache_manager.delete_pattern("mountain_weather:*weather*")
        logger.info("Invalidated all weather cache")

def invalidate_location_cache():
    """Invalidate location and search cache"""
    cache_manager.delete_pattern("mountain_weather:*location*")
    cache_manager.delete_pattern("mountain_weather:*search*")
    logger.info("Invalidated location cache")

# =============================================
# CACHE WARMING
# =============================================

async def warm_cache():
    """Warm cache with popular locations and recent data"""
    logger.info("Starting cache warming")
    
    try:
        # This would be implemented to pre-load popular locations
        # and recent weather data into cache
        
        # Example implementation:
        # 1. Get list of popular locations
        # 2. Pre-load weather data for these locations
        # 3. Pre-load common search results
        
        logger.info("Cache warming completed")
    except Exception as e:
        logger.error(f"Cache warming failed: {e}")

# =============================================
# CACHE MONITORING
# =============================================

class CacheMonitor:
    """Monitor cache performance and health"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache_manager = cache_manager
        self.monitoring_enabled = True
    
    async def start_monitoring(self, interval: int = 300):  # 5 minutes
        """Start cache monitoring"""
        while self.monitoring_enabled:
            try:
                health = self.cache_manager.health_check()
                stats = self.cache_manager.get_stats()
                
                logger.info(f"Cache health: {health['status']}")
                logger.info(f"Cache hit rate: {stats['hit_rate_percent']}%")
                
                # Log warnings for poor performance
                if stats['hit_rate_percent'] < 50:
                    logger.warning(f"Low cache hit rate: {stats['hit_rate_percent']}%")
                
                if health['status'] != 'healthy':
                    logger.warning(f"Cache health degraded: {health}")
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Cache monitoring error: {e}")
                await asyncio.sleep(interval)
    
    def stop_monitoring(self):
        """Stop cache monitoring"""
        self.monitoring_enabled = False

# =============================================
# ASYNC CONTEXT MANAGER
# =============================================

@asynccontextmanager
async def cache_context():
    """Async context manager for cache operations"""
    redis_client = None
    try:
        redis_client = get_redis()
        yield CacheManager(redis_client)
    except Exception as e:
        logger.error(f"Cache context error: {e}")
        raise
    finally:
        if redis_client:
            # Redis connection cleanup handled by connection pool
            pass

# =============================================
# CACHE UTILITIES
# =============================================

def get_cache_info() -> Dict[str, Any]:
    """Get comprehensive cache information"""
    try:
        redis_client = get_redis()
        redis_info = redis_client.info()
        
        return {
            "redis_version": redis_info.get("redis_version", "N/A"),
            "connected_clients": redis_info.get("connected_clients", 0),
            "used_memory": redis_info.get("used_memory_human", "N/A"),
            "total_commands_processed": redis_info.get("total_commands_processed", 0),
            "keyspace_hits": redis_info.get("keyspace_hits", 0),
            "keyspace_misses": redis_info.get("keyspace_misses", 0),
            "expired_keys": redis_info.get("expired_keys", 0),
            "evicted_keys": redis_info.get("evicted_keys", 0),
            "cache_manager_stats": cache_manager.get_stats()
        }
    except Exception as e:
        logger.error(f"Failed to get cache info: {e}")
        return {"error": str(e)}

def clear_all_cache():
    """Clear all cache data (use with caution)"""
    try:
        cache_manager.delete_pattern("mountain_weather:*")
        logger.warning("All cache data cleared")
        return True
    except Exception as e:
        logger.error(f"Failed to clear cache: {e}")
        return False

if __name__ == "__main__":
    # Test cache functionality
    import asyncio
    
    async def test_cache():
        # Test basic operations
        test_key = "test_key"
        test_value = {"message": "Hello, Cache!", "timestamp": datetime.utcnow().isoformat()}
        
        # Set value
        result = cache_manager.set(test_key, test_value, 60)
        print(f"Set result: {result}")
        
        # Get value
        cached_value = cache_manager.get(test_key)
        print(f"Cached value: {cached_value}")
        
        # Check health
        health = cache_manager.health_check()
        print(f"Cache health: {health}")
        
        # Get stats
        stats = cache_manager.get_stats()
        print(f"Cache stats: {stats}")
    
    asyncio.run(test_cache())