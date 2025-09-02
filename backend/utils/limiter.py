"""
Shared Flask-Limiter bridge to allow using `@limiter.limit(...)` in route modules
without tightly coupling to app factory construction order.
"""
from __future__ import annotations

from typing import Any


class _NoopLimiter:
    def limit(self, *args: Any, **kwargs: Any):  # type: ignore[no-untyped-def]
        def _decorator(f):
            return f
        return _decorator


# This variable will be replaced at runtime by app factory via set_limiter()
limiter: Any = _NoopLimiter()


def set_limiter(instance: Any) -> None:
    global limiter
    limiter = instance


__all__ = ["limiter", "set_limiter"]

