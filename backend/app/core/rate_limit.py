"""Rate limiting configuration using slowapi."""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Use client IP for rate limiting (standard approach)
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "auth_login": "5/minute",  # Brute force protection
    "auth_register": "10/minute",  # Registration spam
    "auth_refresh": "30/minute",  # Token refresh
    "default": "100/minute",  # General API
}
