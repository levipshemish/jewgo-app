"""
Minimal log redaction filter to avoid leaking sensitive values in logs.

Redacts common secret-bearing keys and Authorization headers in plain messages.
This operates at the stdlib logging layer and is intentionally lightweight.
"""
from __future__ import annotations

import logging
import re
from typing import Iterable


# Keys or header names that commonly carry secrets
SENSITIVE_KEYS: Iterable[str] = (
    "authorization",
    "api_key",
    "api-key",
    "x-api-key",
    "secret",
    "token",
    "access_token",
    "refresh_token",
    "password",
    "jwt",
)


class RedactingFilter(logging.Filter):
    """Logging filter that masks sensitive values in log messages."""

    # Match patterns like:
    #   Authorization: Bearer abc...
    #   key=value, key: value, "key": "value"
    _pair_patterns = [
        # key=value
        lambda k: re.compile(rf"({re.escape(k)})=([^\s,]+)", re.IGNORECASE),
        # key: value
        lambda k: re.compile(rf"({re.escape(k)})\s*:\s*([^\s,]+)", re.IGNORECASE),
        # "key": "value"
        lambda k: re.compile(rf"(\"{re.escape(k)}\")\s*:\s*\"([^\"]+)\"", re.IGNORECASE),
    ]

    # Special-case Authorization header with Bearer tokens
    _auth_pattern = re.compile(r"(authorization\s*:\s*bearer\s+)([^\s,]+)", re.IGNORECASE)

    def filter(self, record: logging.LogRecord) -> bool:
        try:
            msg = str(record.getMessage())

            # Mask Authorization: Bearer <token>
            msg = self._auth_pattern.sub(r"\1***REDACTED***", msg)

            # Mask generic key/value patterns for sensitive keys
            for key in SENSITIVE_KEYS:
                for patt_maker in self._pair_patterns:
                    patt = patt_maker(key)
                    msg = patt.sub(r"\1=***REDACTED***", msg)

            # Overwrite the record message and clear args to avoid re-formatting
            record.msg, record.args = msg, ()
        except Exception:
            # In case of any error, do not block logging
            pass
        return True


__all__ = ["RedactingFilter", "SENSITIVE_KEYS"]

