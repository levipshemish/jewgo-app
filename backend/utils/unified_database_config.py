# !/usr/bin/env python3
"""
Unified Database Configuration Module
====================================
Centralized database configuration functionality to eliminate code duplication.
This module consolidates all database configuration logic that was previously duplicated.
Author: JewGo Development Team
Version: 1.0
"""
import os
from typing import Optional
from .logging_config import get_logger

logger = get_logger(__name__)


class UnifiedDatabaseConfig:
    """Unified database configuration functionality."""

    @staticmethod
    def get_database_url() -> Optional[str]:
        """Get database URL from environment variables."""
        return os.getenv("DATABASE_URL")

    @staticmethod
    def get_pg_keepalives_idle() -> int:
        """Get PostgreSQL keepalives idle setting."""
        return int(os.getenv("PG_KEEPALIVES_IDLE", "60"))

    @staticmethod
    def get_pg_keepalives_interval() -> int:
        """Get PostgreSQL keepalives interval setting."""
        return int(os.getenv("PG_KEEPALIVES_INTERVAL", "20"))

    @staticmethod
    def get_pg_keepalives_count() -> int:
        """Get PostgreSQL keepalives count setting."""
        return int(os.getenv("PG_KEEPALIVES_COUNT", "5"))

    @staticmethod
    def get_pg_statement_timeout() -> str:
        """Get PostgreSQL statement timeout setting."""
        return os.getenv("PG_STATEMENT_TIMEOUT", "60000")

    @staticmethod
    def get_pg_idle_tx_timeout() -> str:
        """Get PostgreSQL idle transaction timeout setting."""
        return os.getenv("PG_IDLE_TX_TIMEOUT", "120000")

    @staticmethod
    def get_pg_sslmode() -> str:
        """Get PostgreSQL SSL mode setting."""
        return os.getenv("PG_SSLMODE", "prefer")

    @staticmethod
    def get_pg_sslrootcert() -> Optional[str]:
        """Get PostgreSQL SSL root certificate path."""
        return os.getenv("PG_SSLROOTCERT")

    @staticmethod
    def get_db_pool_size() -> int:
        """Get database pool size setting."""
        # Optimized for Oracle Cloud PostgreSQL with 2-4 Gunicorn workers
        # Each worker uses DB connections, so keep pool size reasonable
        return int(os.getenv("DB_POOL_SIZE", "5"))

    @staticmethod
    def get_db_max_overflow() -> int:
        """Get database max overflow setting."""
        return int(os.getenv("DB_MAX_OVERFLOW", "10"))

    @staticmethod
    def get_db_pool_timeout() -> int:
        """Get database pool timeout setting."""
        return int(os.getenv("DB_POOL_TIMEOUT", "30"))

    @staticmethod
    def get_db_pool_recycle() -> int:
        """Get database pool recycle setting."""
        return int(os.getenv("DB_POOL_RECYCLE", "180"))

    @classmethod
    def validate_database_url(cls) -> bool:
        """Validate that DATABASE_URL is provided and accessible."""
        database_url = cls.get_database_url()
        if not database_url:
            logger.error("DATABASE_URL environment variable is required")
            return False
        return True

    @classmethod
    def get_connection_params(cls) -> dict:
        """Get all database connection parameters as a dictionary."""
        return {
            "database_url": cls.get_database_url(),
            "keepalives_idle": cls.get_pg_keepalives_idle(),
            "keepalives_interval": cls.get_pg_keepalives_interval(),
            "keepalives_count": cls.get_pg_keepalives_count(),
            "statement_timeout": cls.get_pg_statement_timeout(),
            "idle_tx_timeout": cls.get_pg_idle_tx_timeout(),
            "sslmode": cls.get_pg_sslmode(),
            "sslrootcert": cls.get_pg_sslrootcert(),
            "pool_size": cls.get_db_pool_size(),
            "max_overflow": cls.get_db_max_overflow(),
            "pool_timeout": cls.get_db_pool_timeout(),
            "pool_recycle": cls.get_db_pool_recycle(),
        }


# Convenience functions for backward compatibility
def get_database_url() -> Optional[str]:
    """Convenience function for getting database URL."""
    return UnifiedDatabaseConfig.get_database_url()


def get_pg_keepalives_idle() -> int:
    """Convenience function for getting keepalives idle setting."""
    return UnifiedDatabaseConfig.get_pg_keepalives_idle()


def get_pg_keepalives_interval() -> int:
    """Convenience function for getting keepalives interval setting."""
    return UnifiedDatabaseConfig.get_pg_keepalives_interval()


def get_pg_keepalives_count() -> int:
    """Convenience function for getting keepalives count setting."""
    return UnifiedDatabaseConfig.get_pg_keepalives_count()


def get_pg_statement_timeout() -> str:
    """Convenience function for getting statement timeout setting."""
    return UnifiedDatabaseConfig.get_pg_statement_timeout()


def get_pg_idle_tx_timeout() -> str:
    """Convenience function for getting idle transaction timeout setting."""
    return UnifiedDatabaseConfig.get_pg_idle_tx_timeout()


# Legacy ConfigManager class for backward compatibility
class ConfigManager:
    """Legacy ConfigManager class for backward compatibility."""

    @staticmethod
    def get_database_url() -> Optional[str]:
        """Get database URL from environment variables."""
        return UnifiedDatabaseConfig.get_database_url()

    @staticmethod
    def get_pg_keepalives_idle() -> int:
        """Get PostgreSQL keepalives idle setting."""
        return UnifiedDatabaseConfig.get_pg_keepalives_idle()

    @staticmethod
    def get_pg_keepalives_interval() -> int:
        """Get PostgreSQL keepalives interval setting."""
        return UnifiedDatabaseConfig.get_pg_keepalives_interval()

    @staticmethod
    def get_pg_keepalives_count() -> int:
        """Get PostgreSQL keepalives count setting."""
        return UnifiedDatabaseConfig.get_pg_keepalives_count()

    @staticmethod
    def get_pg_statement_timeout() -> str:
        """Get PostgreSQL statement timeout setting."""
        return UnifiedDatabaseConfig.get_pg_statement_timeout()

    @staticmethod
    def get_pg_idle_tx_timeout() -> str:
        """Get PostgreSQL idle transaction timeout setting."""
        return UnifiedDatabaseConfig.get_pg_idle_tx_timeout()

    @staticmethod
    def get_pg_sslmode() -> str:
        """Get PostgreSQL SSL mode setting."""
        return UnifiedDatabaseConfig.get_pg_sslmode()

    @staticmethod
    def get_pg_sslrootcert() -> Optional[str]:
        """Get PostgreSQL SSL root certificate path."""
        return UnifiedDatabaseConfig.get_pg_sslrootcert()

    @staticmethod
    def get_db_pool_size() -> int:
        """Get database pool size setting."""
        return UnifiedDatabaseConfig.get_db_pool_size()

    @staticmethod
    def get_db_max_overflow() -> int:
        """Get database max overflow setting."""
        return UnifiedDatabaseConfig.get_db_max_overflow()

    @staticmethod
    def get_db_pool_timeout() -> int:
        """Get database pool timeout setting."""
        return UnifiedDatabaseConfig.get_db_pool_timeout()

    @staticmethod
    def get_db_pool_recycle() -> int:
        """Get database pool recycle setting."""
        return UnifiedDatabaseConfig.get_db_pool_recycle()
