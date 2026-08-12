"""Tests for security modules: startup validation, rate limiting, cookies."""
import pytest
from unittest.mock import MagicMock, patch


class TestStartupValidation:
    """Test environment validation for production security."""

    def test_validate_environment_dev_mode_skips_validation(self):
        """In development mode with DEBUG=True, validation should pass."""
        with patch("app.core.startup.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                DEBUG=True,
                ENVIRONMENT="development",
            )
            from app.core.startup import validate_environment
            errors = validate_environment()
            assert errors == []

    def test_validate_environment_prod_insecure_defaults(self):
        """Production mode should fail with insecure defaults."""
        with patch("app.core.startup.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                DEBUG=False,
                ENVIRONMENT="production",
                JWT_SECRET="dev-secret-key-minimum-32-characters-long",
                MINIO_ACCESS_KEY="minioadmin",
                MINIO_SECRET_KEY="minioadmin",
            )
            from app.core.startup import validate_environment
            errors = validate_environment()
            assert len(errors) == 3
            assert any("JWT_SECRET" in e for e in errors)
            assert any("MINIO_ACCESS_KEY" in e for e in errors)
            assert any("MINIO_SECRET_KEY" in e for e in errors)

    def test_validate_environment_prod_secure_values(self):
        """Production mode should pass with secure values."""
        with patch("app.core.startup.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                DEBUG=False,
                ENVIRONMENT="production",
                JWT_SECRET="secure-production-key-that-is-long-enough-for-production",
                MINIO_ACCESS_KEY="prod-access-key",
                MINIO_SECRET_KEY="prod-secret-key-long-enough",
            )
            from app.core.startup import validate_environment
            errors = validate_environment()
            assert errors == []


# Check if slowapi is available (installed in Docker)
try:
    import slowapi
    SLOWAPI_AVAILABLE = True
except ImportError:
    SLOWAPI_AVAILABLE = False


@pytest.mark.skipif(not SLOWAPI_AVAILABLE, reason="slowapi not installed locally")
class TestRateLimiting:
    """Test rate limiting configuration."""

    def test_rate_limits_defined(self):
        """Verify rate limits are defined for auth endpoints."""
        from app.core.rate_limit import RATE_LIMITS
        assert "auth_login" in RATE_LIMITS
        assert "auth_register" in RATE_LIMITS
        assert "auth_refresh" in RATE_LIMITS
        assert "default" in RATE_LIMITS

    def test_limiter_uses_ip(self):
        """Verify limiter uses get_remote_address for IP-based limiting."""
        from app.core.rate_limit import limiter
        from slowapi.util import get_remote_address
        assert limiter._key_func == get_remote_address


class TestCookieManagement:
    """Test JWT cookie utilities."""

    def test_cookie_constants_defined(self):
        """Verify cookie names are defined."""
        from app.core.cookies import ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE
        assert ACCESS_TOKEN_COOKIE == "access_token"
        assert REFRESH_TOKEN_COOKIE == "refresh_token"

    def test_set_auth_cookies(self):
        """Test that set_auth_cookies sets both cookies."""
        with patch("app.core.cookies.get_settings") as mock_settings:
            mock_settings.return_value = MagicMock(
                COOKIE_HTTPONLY=True,
                COOKIE_SECURE=True,
                COOKIE_SAMESITE="lax",
                JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30,
                JWT_REFRESH_TOKEN_EXPIRE_DAYS=7,
            )
            from app.core.cookies import set_auth_cookies
            mock_response = MagicMock()

            set_auth_cookies(mock_response, "access_token_value", "refresh_token_value")

            # Verify set_cookie was called twice
            assert mock_response.set_cookie.call_count == 2

            # Verify access token cookie
            calls = mock_response.set_cookie.call_args_list
            access_call = calls[0]
            assert access_call.kwargs["key"] == "access_token"
            assert access_call.kwargs["httponly"] is True
            assert access_call.kwargs["secure"] is True

    def test_clear_auth_cookies(self):
        """Test that clear_auth_cookies deletes both cookies."""
        from app.core.cookies import clear_auth_cookies
        mock_response = MagicMock()

        clear_auth_cookies(mock_response)

        # Verify delete_cookie was called twice
        assert mock_response.delete_cookie.call_count == 2


class TestCORSConfiguration:
    """Test CORS is properly hardened."""

    def test_cors_methods_whitelist(self):
        """Verify CORS methods are explicitly whitelisted, not wildcarded."""
        # Read main.py to verify CORS configuration
        import os
        main_path = os.path.join(os.path.dirname(__file__), "..", "app", "main.py")
        with open(main_path) as f:
            content = f.read()

        # Verify explicit methods list
        assert 'allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]' in content
        # Verify no wildcard
        assert 'allow_methods=["*"]' not in content


class TestConfigDefaults:
    """Test configuration defaults are secure."""

    def test_debug_defaults_false(self):
        """DEBUG should default to False for production safety."""
        import os
        config_path = os.path.join(os.path.dirname(__file__), "..", "app", "config.py")
        with open(config_path) as f:
            content = f.read()

        assert "DEBUG: bool = False" in content

    def test_cookie_settings_exist(self):
        """Cookie security settings should be defined."""
        import os
        config_path = os.path.join(os.path.dirname(__file__), "..", "app", "config.py")
        with open(config_path) as f:
            content = f.read()

        assert "COOKIE_SECURE" in content
        assert "COOKIE_SAMESITE" in content
        assert "COOKIE_HTTPONLY" in content
