"""
Legacy Admin Authentication Module - REMOVED

This module has been removed in favor of PostgreSQL RBAC.
Use utils.security.require_admin() for admin authentication.

Migration Guide:
- Replace require_legacy_admin_auth() with utils.security.require_admin()
- Remove ENABLE_LEGACY_ADMIN_AUTH environment variables

For more information, see:
- backend/utils/security.py for current admin authentication
"""

from utils.logging_config import get_logger

logger = get_logger(__name__)
logger.info("Legacy admin authentication module has been removed. Use utils.security.require_admin() instead.")


# All legacy functions have been removed and will raise errors
def require_legacy_admin_auth(permission: str = "read"):
    """REMOVED: Legacy admin authentication decorator
    
    This function has been completely removed.
    Use utils.security.require_admin() instead.
    """
    logger.error("require_legacy_admin_auth has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


def require_admin_migrate():
    """REMOVED: Use utils.security.require_admin() instead."""
    logger.error("require_admin_migrate has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


def require_admin_write():
    """REMOVED: Use utils.security.require_admin() instead."""
    logger.error("require_admin_write has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


def require_admin_delete():
    """REMOVED: Use utils.security.require_admin() instead."""
    logger.error("require_admin_delete has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


def require_simple_admin_token():
    """REMOVED: Use utils.security.require_admin() instead."""
    logger.error("require_simple_admin_token has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


def require_legacy_admin_auth_compat(permission: str = "read"):
    """REMOVED: Use utils.security.require_admin() instead."""
    logger.error("require_legacy_admin_auth_compat has been removed. Use utils.security.require_admin() instead.")
    raise RuntimeError("Legacy admin authentication has been removed. Use utils.security.require_admin() instead.")


# Import the current admin authentication function for reference
try:
    from utils.security import require_admin
    logger.info("Modern admin authentication available via utils.security.require_admin()")
except ImportError:
    logger.error("Cannot import modern admin authentication - check utils.security module")


# Legacy classes and global instances have been removed
class AdminAuthError(Exception):
    """Legacy exception - use AuthenticationError from utils.error_handler instead."""
    pass


class DeprecationError(Exception):
    """Legacy exception - no longer needed."""
    pass
