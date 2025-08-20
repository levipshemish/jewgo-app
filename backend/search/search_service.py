from utils.logging_config import get_logger

try:
    from utils.cache_manager_v4 import CacheManagerV4

    CACHE_AVAILABLE = True
except ImportError:
    CacheManagerV4 = None
    CACHE_AVAILABLE = False

import time
from datetime import datetime
from typing import Any, Dict, List, Optional

from sqlalchemy.orm import Session

from .core.base_search import SearchError
from .core.search_config import SearchConfig, get_search_config
from .core.search_types import (
    SearchFilters,
    SearchMetadata,
    SearchResponse,
    SearchResult,
    SearchType,
)
from .providers.postgresql_search import PostgreSQLSearchProvider

logger = get_logger(__name__)

#!/usr/bin/env python3
"""Unified Search Service for JewGo App.
====================================

This module provides a unified interface for all search capabilities in the JewGo app.

Features:
- Single entry point for all search operations
- Provider management and health monitoring
- Search analytics and metrics
- Caching and performance optimization
- Error handling and fallback mechanisms

Author: JewGo Development Team
Version: 1.0
Last Updated: 2024
"""


class SearchService:
    """Unified search service managing all search providers."""

    def __init__(self, db_session: Session, config: Optional[SearchConfig] = None):
        """Initialize the search service.

        Args:
            db_session: Database session
            config: Search configuration
        """
        self.db_session = db_session
        self.config = config or get_search_config()

        # Initialize providers
        self.providers = {}
        self._initialize_providers()

        # Initialize cache manager
        if CACHE_AVAILABLE:
            self.cache_manager = CacheManagerV4(
                redis_url=self.config.redis_url
                if hasattr(self.config, "redis_url")
                else None,
                default_ttl=1800,  # 30 minutes for search results
                enable_cache=True,
                cache_prefix="jewgo:search:",
            )
        else:
            self.cache_manager = None
            logger.warning("Cache manager not available, caching disabled")

        # Search statistics
        self.stats = {
            "total_searches": 0,
            "successful_searches": 0,
            "failed_searches": 0,
            "average_response_time_ms": 0.0,
            "search_type_distribution": {},
            "last_updated": datetime.utcnow(),
        }

        logger.info(
            "Search service initialized",
            providers=list(self.providers.keys()),
            config=self.config.to_dict(),
        )

    def _initialize_providers(self):
        """Initialize search providers based on configuration."""
        try:
            # PostgreSQL provider (always available)
            if self.config.postgresql.enabled:
                self.providers["postgresql"] = PostgreSQLSearchProvider(
                    self.db_session, config=self.config.postgresql.__dict__
                )

            # Only PostgreSQL provider is available
            # Vector, semantic, and hybrid providers have been removed

        except Exception as e:
            logger.error("Failed to initialize search providers", error=str(e))
            raise

    async def search(
        self,
        query: str,
        search_type: Optional[str] = None,
        filters: Optional[SearchFilters] = None,
        limit: int = 20,
        offset: int = 0,
        **kwargs,
    ) -> SearchResponse:
        """Execute search using the specified or default provider.

        Args:
            query: Search query string
            search_type: Type of search to use (postgresql)
            filters: Optional search filters
            limit: Maximum number of results to return
            offset: Number of results to skip
            **kwargs: Additional search parameters

        Returns:
            SearchResponse with results and metadata

        Raises:
            SearchError: If search fails
        """
        start_time = time.time()

        try:
            # Determine search type
            if not search_type:
                search_type = self.config.default_search_type

            # Generate cache key and try to get from cache first
            if self.cache_manager:
                cache_key = self._generate_search_cache_key(
                    query, search_type, filters, limit, offset, **kwargs
                )
                cached_result = self.cache_manager.get(cache_key)
                if cached_result:
                    logger.info(
                        "Search cache hit", query=query, search_type=search_type
                    )
                    # Update cache hit metadata
                    if (
                        hasattr(cached_result, "search_metadata")
                        and cached_result.search_metadata
                    ):
                        cached_result.search_metadata.cache_hit = True
                        cached_result.search_metadata.timestamp = datetime.utcnow()
                    # Update statistics for cache hit
                    self._update_stats(search_type, 0, True, cache_hit=True)
                    return cached_result

            # Get provider
            provider = self.providers.get(search_type)
            if not provider:
                raise SearchError(
                    f"Search provider '{search_type}' not available", search_type, query
                )

            # Check provider health
            if not await provider.is_healthy():
                raise SearchError(
                    f"Search provider '{search_type}' is unhealthy", search_type, query
                )

            # Execute search
            results = await provider.search(query, filters, limit, offset, **kwargs)

            # Calculate execution time
            execution_time_ms = int((time.time() - start_time) * 1000)

            # Get suggestions
            suggestions = await provider.get_suggestions(query, limit=10)

            # Create search metadata (this is a fresh search, not from cache)
            search_metadata = SearchMetadata(
                query=query,
                search_type=SearchType(search_type),
                filters_applied=filters.to_dict() if filters else {},
                execution_time_ms=execution_time_ms,
                results_count=len(results),
                cache_hit=False,  # This is a fresh search result
                timestamp=datetime.utcnow(),
            )

            # Create response
            response = SearchResponse(
                results=results,
                total_count=len(results),
                search_metadata=search_metadata,
                suggestions=suggestions,
                filters_applied=filters or SearchFilters(),
            )

            # Cache the result
            if self.cache_manager:
                self.cache_manager.set(cache_key, response, ttl=1800)  # 30 minutes

            # Update statistics
            self._update_stats(search_type, execution_time_ms, True)

            logger.info(
                "Search completed successfully",
                query=query,
                search_type=search_type,
                results_count=len(results),
                execution_time_ms=execution_time_ms,
            )

            return response

        except Exception as e:
            execution_time_ms = int((time.time() - start_time) * 1000)
            self._update_stats(search_type or "unknown", execution_time_ms, False)

            logger.error(
                "Search failed",
                query=query,
                search_type=search_type,
                error=str(e),
                execution_time_ms=execution_time_ms,
            )

            raise

    async def get_suggestions(
        self, query: str, search_type: Optional[str] = None, limit: int = 10
    ) -> List[str]:
        """Get search suggestions.

        Args:
            query: Partial query string
            search_type: Type of search to use
            limit: Maximum number of suggestions

        Returns:
            List of suggestion strings
        """
        try:
            # Determine search type
            if not search_type:
                search_type = self.config.default_search_type

            # Get provider
            provider = self.providers.get(search_type)
            if not provider:
                return []

            # Get suggestions
            suggestions = await provider.get_suggestions(query, limit)
            return suggestions

        except Exception as e:
            logger.error("Failed to get suggestions", error=str(e), query=query)
            return []

    async def get_available_providers(self) -> Dict[str, Dict[str, Any]]:
        """Get information about available search providers.

        Returns:
            Dictionary of provider information
        """
        provider_info = {}

        for provider_name, provider in self.providers.items():
            try:
                is_healthy = await provider.is_healthy()
                provider_info[provider_name] = {
                    "type": provider.get_search_type(),
                    "name": provider.name,
                    "healthy": is_healthy,
                    "config": provider.config,
                }
            except Exception as e:
                logger.warning(
                    f"Failed to get info for provider {provider_name}", error=str(e)
                )
                provider_info[provider_name] = {
                    "type": "unknown",
                    "name": provider_name,
                    "healthy": False,
                    "error": str(e),
                }

        return provider_info

    async def get_search_stats(self) -> Dict[str, Any]:
        """Get search service statistics.

        Returns:
            Dictionary of search statistics
        """
        return {
            **self.stats,
            "available_providers": await self.get_available_providers(),
            "configuration": self.config.to_dict(),
        }

    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on all providers.

        Returns:
            Dictionary with health status
        """
        health_status = {
            "overall_status": "healthy",
            "providers": {},
            "timestamp": datetime.utcnow(),
        }

        all_healthy = True

        for provider_name, provider in self.providers.items():
            try:
                is_healthy = await provider.is_healthy()
                health_status["providers"][provider_name] = {
                    "healthy": is_healthy,
                    "type": provider.get_search_type(),
                }

                if not is_healthy:
                    all_healthy = False

            except Exception as e:
                health_status["providers"][provider_name] = {
                    "healthy": False,
                    "error": str(e),
                    "type": "unknown",
                }
                all_healthy = False

        health_status["overall_status"] = "healthy" if all_healthy else "unhealthy"

        return health_status

    def _update_stats(
        self,
        search_type: str,
        execution_time_ms: int,
        success: bool,
        cache_hit: bool = False,
    ):
        """Update search statistics."""
        self.stats["total_searches"] += 1

        if success:
            self.stats["successful_searches"] += 1
        else:
            self.stats["failed_searches"] += 1

        # Update average response time (only for non-cache hits)
        if not cache_hit:
            current_avg = self.stats["average_response_time_ms"]
            total_searches = self.stats["total_searches"]
            self.stats["average_response_time_ms"] = (
                current_avg * (total_searches - 1) + execution_time_ms
            ) / total_searches

        # Update search type distribution
        self.stats["search_type_distribution"][search_type] = (
            self.stats["search_type_distribution"].get(search_type, 0) + 1
        )

        self.stats["last_updated"] = datetime.utcnow()

    def _generate_search_cache_key(
        self,
        query: str,
        search_type: str,
        filters: Optional[SearchFilters],
        limit: int,
        offset: int,
        **kwargs,
    ) -> str:
        """Generate a unique cache key for search results.

        Args:
            query: Search query
            search_type: Type of search
            filters: Search filters
            limit: Result limit
            offset: Result offset
            **kwargs: Additional parameters

        Returns:
            Unique cache key string
        """
        import hashlib
        import json

        # Create a dictionary of all parameters
        key_data = {
            "query": query.lower().strip(),
            "search_type": search_type,
            "filters": filters.to_dict() if filters else {},
            "limit": limit,
            "offset": offset,
            **kwargs,
        }

        # Convert to JSON string and hash
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()

        return f"search:{key_hash}"

    # Embedding generation methods removed - vector search is no longer supported
