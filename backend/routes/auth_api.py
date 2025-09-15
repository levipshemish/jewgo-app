"""
Legacy import shim for authentication routes.

Keeps backward compatibility with modules/tests importing `routes.auth_api`
by re-exporting the v5 auth blueprint.
"""

from .v5.auth_api import auth_bp  # re-export for compatibility

__all__ = ["auth_bp"]

