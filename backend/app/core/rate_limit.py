"""Rate limiting configuration using slowapi."""
from slowapi import Limiter
from slowapi.util import get_remote_address

# Use client IP for rate limiting (standard approach)
limiter = Limiter(key_func=get_remote_address)

# Rate limit configurations
RATE_LIMITS = {
    "auth_login": "30/minute",  # Brute force protection
    "auth_register": "20/minute",  # Registration spam
    "auth_refresh": "60/minute",  # Token refresh
    "default": "200/minute",  # General API
}
