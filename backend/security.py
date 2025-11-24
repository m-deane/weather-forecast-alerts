"""
Security and rate limiting for Scottish Mountain Weather API
"""

import time
import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, Optional, List, Tuple
from functools import wraps
import logging
from ipaddress import ip_address, ip_network

from fastapi import HTTPException, Request, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
import redis
from pydantic import BaseModel

from .cache import get_redis, cache_key

logger = logging.getLogger(__name__)

# =============================================
# CONFIGURATION
# =============================================

class SecurityConfig(BaseModel):
    """Security configuration"""
    # Rate limiting
    rate_limit_per_minute: int = 60
    rate_limit_per_hour: int = 1000
    rate_limit_per_day: int = 10000
    
    # API Keys
    require_api_key: bool = True  # SECURITY: Enabled by default
    api_key_header: str = "X-API-Key"

    # Request size limits
    max_request_size: int = 1024 * 1024  # 1MB
    max_query_params: int = 50

    # Security headers
    enable_cors: bool = True
    allowed_origins: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        # Add production domain when deployed:
        # "https://yourdomain.com"
    ]
    
    # IP filtering
    blocked_ips: List[str] = []
    allowed_ips: List[str] = []  # Empty means all allowed
    
    # Request monitoring
    log_all_requests: bool = False
    log_blocked_requests: bool = True
    
    # Suspicious activity detection
    max_requests_per_second: int = 10
    suspicious_user_agent_patterns: List[str] = [
        "bot", "crawler", "spider", "scraper"
    ]

security_config = SecurityConfig()

# =============================================
# API KEY MANAGEMENT
# =============================================

class APIKeyManager:
    """Manage API keys and authentication"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client or get_redis()
        self.key_prefix = "api_key:"
    
    def generate_api_key(self) -> str:
        """Generate a new API key"""
        return secrets.token_urlsafe(32)
    
    def create_api_key(self, key_id: str, permissions: List[str] = None, expires_at: Optional[datetime] = None) -> str:
        """Create and store API key"""
        api_key = self.generate_api_key()
        key_hash = self._hash_key(api_key)
        
        key_data = {
            "key_id": key_id,
            "permissions": permissions or ["read"],
            "created_at": datetime.utcnow().isoformat(),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "is_active": True,
            "usage_count": 0,
            "last_used": None
        }
        
        # Store in Redis
        self.redis.hset(f"{self.key_prefix}{key_hash}", mapping=key_data)
        
        # Set expiration if specified
        if expires_at:
            ttl = int((expires_at - datetime.utcnow()).total_seconds())
            self.redis.expire(f"{self.key_prefix}{key_hash}", ttl)
        
        logger.info(f"Created API key for {key_id}")
        return api_key
    
    def validate_api_key(self, api_key: str) -> Optional[Dict]:
        """Validate API key and return key data"""
        key_hash = self._hash_key(api_key)
        key_data = self.redis.hgetall(f"{self.key_prefix}{key_hash}")
        
        if not key_data:
            return None
        
        # Convert bytes to strings
        key_data = {k.decode(): v.decode() for k, v in key_data.items()}
        
        # Check if key is active
        if not key_data.get("is_active", "true").lower() == "true":
            return None
        
        # Check expiration
        expires_at = key_data.get("expires_at")
        if expires_at and datetime.fromisoformat(expires_at) < datetime.utcnow():
            return None
        
        # Update usage
        self.redis.hincrby(f"{self.key_prefix}{key_hash}", "usage_count", 1)
        self.redis.hset(f"{self.key_prefix}{key_hash}", "last_used", datetime.utcnow().isoformat())
        
        return key_data
    
    def revoke_api_key(self, api_key: str) -> bool:
        """Revoke an API key"""
        key_hash = self._hash_key(api_key)
        result = self.redis.delete(f"{self.key_prefix}{key_hash}")
        return bool(result)
    
    def _hash_key(self, api_key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(api_key.encode()).hexdigest()

# Global API key manager
api_key_manager = APIKeyManager()

# =============================================
# RATE LIMITING
# =============================================

class RateLimiter:
    """Redis-based rate limiting"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client or get_redis()
        self.window_sizes = {
            "minute": 60,
            "hour": 3600,
            "day": 86400
        }
        self.limits = {
            "minute": security_config.rate_limit_per_minute,
            "hour": security_config.rate_limit_per_hour,
            "day": security_config.rate_limit_per_day
        }
    
    def is_allowed(self, identifier: str, endpoint: str = "default") -> Tuple[bool, Dict[str, int]]:
        """Check if request is allowed and return rate limit info"""
        current_time = int(time.time())
        rate_info = {}
        
        for window, window_size in self.window_sizes.items():
            limit = self.limits[window]
            window_start = current_time - (current_time % window_size)
            key = f"rate_limit:{identifier}:{endpoint}:{window}:{window_start}"
            
            # Get current count
            current_count = self.redis.get(key)
            current_count = int(current_count) if current_count else 0
            
            rate_info[f"{window}_count"] = current_count
            rate_info[f"{window}_limit"] = limit
            rate_info[f"{window}_remaining"] = max(0, limit - current_count)
            rate_info[f"{window}_reset"] = window_start + window_size
            
            # Check if limit exceeded
            if current_count >= limit:
                return False, rate_info
        
        # Increment counters
        for window, window_size in self.window_sizes.items():
            window_start = current_time - (current_time % window_size)
            key = f"rate_limit:{identifier}:{endpoint}:{window}:{window_start}"
            
            pipe = self.redis.pipeline()
            pipe.incr(key)
            pipe.expire(key, window_size)
            pipe.execute()
        
        return True, rate_info
    
    def get_rate_limit_info(self, identifier: str, endpoint: str = "default") -> Dict[str, int]:
        """Get current rate limit info without incrementing"""
        current_time = int(time.time())
        rate_info = {}
        
        for window, window_size in self.window_sizes.items():
            limit = self.limits[window]
            window_start = current_time - (current_time % window_size)
            key = f"rate_limit:{identifier}:{endpoint}:{window}:{window_start}"
            
            current_count = self.redis.get(key)
            current_count = int(current_count) if current_count else 0
            
            rate_info[f"{window}_count"] = current_count
            rate_info[f"{window}_limit"] = limit
            rate_info[f"{window}_remaining"] = max(0, limit - current_count)
            rate_info[f"{window}_reset"] = window_start + window_size
        
        return rate_info

# Global rate limiter
rate_limiter = RateLimiter()

# =============================================
# SECURITY MIDDLEWARE
# =============================================

class SecurityMiddleware(BaseHTTPMiddleware):
    """Security middleware for request validation and monitoring"""
    
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Security checks
        security_result = await self._perform_security_checks(request)
        if security_result:
            return security_result
        
        # Rate limiting
        rate_limit_result = await self._check_rate_limits(request)
        if rate_limit_result:
            return rate_limit_result
        
        # Process request
        response = await call_next(request)
        
        # Add security headers
        self._add_security_headers(response)
        
        # Log request if enabled
        if security_config.log_all_requests:
            self._log_request(request, response, time.time() - start_time)
        
        return response
    
    async def _perform_security_checks(self, request: Request) -> Optional[Response]:
        """Perform basic security checks"""
        
        # Check IP filtering
        client_ip = self._get_client_ip(request)
        if not self._is_ip_allowed(client_ip):
            if security_config.log_blocked_requests:
                logger.warning(f"Blocked request from IP: {client_ip}")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied"
            )
        
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > security_config.max_request_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Request too large"
            )
        
        # Check query parameters
        if len(request.query_params) > security_config.max_query_params:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many query parameters"
            )
        
        # Check user agent for suspicious patterns
        user_agent = request.headers.get("user-agent", "").lower()
        for pattern in security_config.suspicious_user_agent_patterns:
            if pattern in user_agent:
                if security_config.log_blocked_requests:
                    logger.warning(f"Suspicious user agent detected: {user_agent}")
                # Don't block immediately, but could add to monitoring
        
        return None
    
    async def _check_rate_limits(self, request: Request) -> Optional[Response]:
        """Check rate limits"""
        client_ip = self._get_client_ip(request)
        endpoint = str(request.url.path)
        
        # Check if request is allowed
        is_allowed, rate_info = rate_limiter.is_allowed(client_ip, endpoint)
        
        if not is_allowed:
            # Add rate limit headers
            headers = {
                "X-RateLimit-Limit-Minute": str(rate_info["minute_limit"]),
                "X-RateLimit-Remaining-Minute": str(rate_info["minute_remaining"]),
                "X-RateLimit-Reset-Minute": str(rate_info["minute_reset"]),
                "X-RateLimit-Limit-Hour": str(rate_info["hour_limit"]),
                "X-RateLimit-Remaining-Hour": str(rate_info["hour_remaining"]),
                "X-RateLimit-Reset-Hour": str(rate_info["hour_reset"]),
            }
            
            if security_config.log_blocked_requests:
                logger.warning(f"Rate limit exceeded for IP: {client_ip}, endpoint: {endpoint}")
            
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Rate limit exceeded",
                headers=headers
            )
        
        return None
    
    def _get_client_ip(self, request: Request) -> str:
        """Get client IP address considering proxies"""
        # Check for forwarded headers (be cautious in production)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _is_ip_allowed(self, ip_str: str) -> bool:
        """Check if IP is allowed"""
        if ip_str == "unknown":
            return True  # Allow unknown IPs for now
        
        try:
            ip = ip_address(ip_str)
            
            # Check blocked IPs
            for blocked_ip in security_config.blocked_ips:
                if ip == ip_address(blocked_ip) or ip in ip_network(blocked_ip, strict=False):
                    return False
            
            # Check allowed IPs (if specified)
            if security_config.allowed_ips:
                for allowed_ip in security_config.allowed_ips:
                    if ip == ip_address(allowed_ip) or ip in ip_network(allowed_ip, strict=False):
                        return True
                return False
            
            return True
            
        except ValueError:
            logger.warning(f"Invalid IP address: {ip_str}")
            return False
    
    def _add_security_headers(self, response: Response):
        """Add security headers to response"""
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
    
    def _log_request(self, request: Request, response: Response, duration: float):
        """Log request details"""
        client_ip = self._get_client_ip(request)
        logger.info(
            f"{request.method} {request.url.path} - "
            f"IP: {client_ip} - "
            f"Status: {response.status_code} - "
            f"Duration: {duration:.3f}s"
        )

# =============================================
# AUTHENTICATION DEPENDENCIES
# =============================================

security_scheme = HTTPBearer(auto_error=False)

async def get_api_key(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme)) -> Optional[str]:
    """Extract API key from request"""
    if credentials:
        return credentials.credentials
    return None

async def require_api_key(api_key: Optional[str] = Depends(get_api_key)) -> Dict:
    """Require valid API key"""
    if not security_config.require_api_key:
        return {"key_id": "anonymous", "permissions": ["read"]}
    
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="API key required",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    key_data = api_key_manager.validate_api_key(api_key)
    if not key_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
            headers={"WWW-Authenticate": "Bearer"}
        )
    
    return key_data

async def require_permission(permission: str):
    """Require specific permission"""
    async def permission_checker(key_data: Dict = Depends(require_api_key)) -> Dict:
        permissions = key_data.get("permissions", [])
        if permission not in permissions and "admin" not in permissions:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission '{permission}' required"
            )
        return key_data
    return permission_checker

# =============================================
# RATE LIMITING DEPENDENCIES
# =============================================

async def check_rate_limit(request: Request) -> Dict[str, int]:
    """Check rate limit and return info"""
    client_ip = request.client.host if request.client else "unknown"
    endpoint = str(request.url.path)
    
    is_allowed, rate_info = rate_limiter.is_allowed(client_ip, endpoint)
    
    if not is_allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded",
            headers={
                "X-RateLimit-Limit": str(rate_info["minute_limit"]),
                "X-RateLimit-Remaining": str(rate_info["minute_remaining"]),
                "X-RateLimit-Reset": str(rate_info["minute_reset"])
            }
        )
    
    return rate_info

# =============================================
# UTILITY FUNCTIONS
# =============================================

def get_security_info() -> Dict[str, Any]:
    """Get security configuration info (sanitized)"""
    return {
        "rate_limiting": {
            "per_minute": security_config.rate_limit_per_minute,
            "per_hour": security_config.rate_limit_per_hour,
            "per_day": security_config.rate_limit_per_day
        },
        "authentication": {
            "api_key_required": security_config.require_api_key,
            "api_key_header": security_config.api_key_header
        },
        "request_limits": {
            "max_request_size": security_config.max_request_size,
            "max_query_params": security_config.max_query_params
        }
    }

def create_admin_api_key() -> str:
    """Create an admin API key"""
    return api_key_manager.create_api_key(
        key_id="admin",
        permissions=["read", "write", "admin"],
        expires_at=datetime.utcnow() + timedelta(days=365)
    )

def get_rate_limit_status(identifier: str, endpoint: str = "default") -> Dict[str, int]:
    """Get rate limit status for identifier"""
    return rate_limiter.get_rate_limit_info(identifier, endpoint)

# =============================================
# SECURITY MONITORING
# =============================================

class SecurityMonitor:
    """Monitor security events and suspicious activity"""
    
    def __init__(self, redis_client: Optional[redis.Redis] = None):
        self.redis = redis_client or get_redis()
        self.monitoring_enabled = True
    
    def log_security_event(self, event_type: str, details: Dict[str, Any]):
        """Log security event"""
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "details": details
        }
        
        # Store in Redis with expiration
        key = f"security_event:{int(time.time())}"
        self.redis.setex(key, 86400, str(event))  # Keep for 24 hours
        
        logger.warning(f"Security event: {event_type} - {details}")
    
    def detect_suspicious_activity(self, ip: str, user_agent: str) -> bool:
        """Detect suspicious activity patterns"""
        # This could be enhanced with ML-based detection
        
        # Check request frequency
        current_time = int(time.time())
        window = 60  # 1 minute window
        key = f"activity:{ip}:{current_time // window}"
        
        request_count = self.redis.incr(key)
        self.redis.expire(key, window)
        
        if request_count > security_config.max_requests_per_second * window:
            self.log_security_event("high_frequency_requests", {
                "ip": ip,
                "requests_per_minute": request_count,
                "user_agent": user_agent
            })
            return True
        
        return False

# Global security monitor
security_monitor = SecurityMonitor()

if __name__ == "__main__":
    # Test security functionality
    
    # Test API key creation
    admin_key = create_admin_api_key()
    print(f"Admin API key created: {admin_key}")
    
    # Test API key validation
    key_data = api_key_manager.validate_api_key(admin_key)
    print(f"API key validation: {key_data}")
    
    # Test rate limiting
    is_allowed, rate_info = rate_limiter.is_allowed("test_ip", "test_endpoint")
    print(f"Rate limit check: {is_allowed}, info: {rate_info}")
    
    print("Security module test completed")