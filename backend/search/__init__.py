from .core.base_search import BaseSearchProvider
from .core.search_config import SearchConfig
from .core.search_types import SearchFilters, SearchResult, SearchType
from .providers.postgresql_search import PostgreSQLSearchProvider

# !/usr/bin/env python3
"""Unified Search System for JewGo App.
====================================
This module provides a comprehensive search system with PostgreSQL full-text search:
- PostgreSQL full-text search with trigram similarity
- Advanced filtering and relevance scoring
- Search analytics and performance monitoring
Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""
# Embedding and index managers removed - vector search is no longer supported
__all__ = [
    # Core
    "BaseSearchProvider",
    "SearchType",
    "SearchResult",
    "SearchFilters",
    "SearchConfig",
    # Providers
    "PostgreSQLSearchProvider",
]
__version__ = "1.0.0"
