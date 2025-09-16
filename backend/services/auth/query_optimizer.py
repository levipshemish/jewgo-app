"""
Advanced Query Optimizer for Authentication System.

This module provides query plan analysis, optimization recommendations,
and automated query performance monitoring.
"""

import time
import json
from typing import Dict, Any, List, Optional
from collections import defaultdict, deque
from sqlalchemy import text, event
from sqlalchemy.engine import Engine
from utils.logging_config import get_logger

logger = get_logger(__name__)


class QueryOptimizer:
    """Advanced query optimizer with plan analysis and recommendations."""
    
    def __init__(self, db_manager):
        self.db_manager = db_manager
        self.query_stats = defaultdict(lambda: {
            'count': 0,
            'total_time': 0.0,
            'min_time': float('inf'),
            'max_time': 0.0,
            'avg_time': 0.0,
            'slow_queries': 0,
            'query_plans': deque(maxlen=10),
            'recent_times': deque(maxlen=100)
        })
        
        # Performance thresholds
        self.thresholds = {
            'slow_query': 0.1,      # 100ms
            'very_slow_query': 0.5, # 500ms
            'critical_query': 1.0   # 1 second
        }
        
        # Query patterns and optimizations
        self.query_patterns = {
            'user_lookup': {
                'pattern': r'SELECT.*FROM users.*WHERE.*email',
                'optimization': 'Ensure email index exists',
                'index_suggestion': 'CREATE INDEX idx_users_email ON users(email)'
            },
            'role_query': {
                'pattern': r'SELECT.*FROM user_roles.*WHERE.*user_id',
                'optimization': 'Use composite index for user_id + is_active',
                'index_suggestion': 'CREATE INDEX idx_user_roles_composite ON user_roles(user_id, is_active, expires_at)'
            },
            'session_cleanup': {
                'pattern': r'SELECT.*FROM auth_sessions.*WHERE.*expires_at',
                'optimization': 'Use partial index for expired sessions',
                'index_suggestion': 'CREATE INDEX idx_auth_sessions_expired ON auth_sessions(expires_at) WHERE expires_at < NOW()'
            }
        }
        
        # Setup query monitoring
        self._setup_query_monitoring()
        
        logger.info("QueryOptimizer initialized")
    
    def _setup_query_monitoring(self):
        """Setup SQLAlchemy event listeners for query monitoring."""
        try:
            @event.listens_for(Engine, "before_cursor_execute")
            def receive_before_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                context._query_start_time = time.perf_counter()
                context._query_statement = statement
                context._query_parameters = parameters
            
            @event.listens_for(Engine, "after_cursor_execute")
            def receive_after_cursor_execute(conn, cursor, statement, parameters, context, executemany):
                if hasattr(context, '_query_start_time'):
                    duration = time.perf_counter() - context._query_start_time
                    self._analyze_query(statement, parameters, duration)
                    
        except Exception as e:
            logger.error(f"Failed to setup query monitoring: {e}")
    
    def _analyze_query(self, statement: str, parameters: Dict, duration: float):
        """Analyze executed query for performance issues."""
        try:
            # Normalize query for pattern matching
            normalized_query = self._normalize_query(statement)
            
            # Record query statistics
            stats = self.query_stats[normalized_query]
            stats['count'] += 1
            stats['total_time'] += duration
            stats['min_time'] = min(stats['min_time'], duration)
            stats['max_time'] = max(stats['max_time'], duration)
            stats['avg_time'] = stats['total_time'] / stats['count']
            stats['recent_times'].append(duration)
            
            # Check for slow queries
            if duration > self.thresholds['slow_query']:
                stats['slow_queries'] += 1
                
                if duration > self.thresholds['critical_query']:
                    logger.warning(f"Critical slow query detected: {duration:.3f}s - {statement[:100]}...")
                elif duration > self.thresholds['very_slow_query']:
                    logger.warning(f"Very slow query detected: {duration:.3f}s - {statement[:100]}...")
                else:
                    logger.info(f"Slow query detected: {duration:.3f}s - {statement[:100]}...")
                
                # Get query plan for slow queries
                if len(stats['query_plans']) < 10:
                    plan = self._get_query_plan(statement, parameters)
                    if plan:
                        stats['query_plans'].append({
                            'plan': plan,
                            'duration': duration,
                            'timestamp': time.time()
                        })
            
        except Exception as e:
            logger.error(f"Failed to analyze query: {e}")
    
    def _normalize_query(self, statement: str) -> str:
        """Normalize query for pattern matching."""
        try:
            # Remove extra whitespace and normalize
            normalized = ' '.join(statement.split())
            
            # Replace parameter placeholders with generic values
            import re
            normalized = re.sub(r':\w+', ':param', normalized)
            normalized = re.sub(r'\$\d+', '$param', normalized)
            normalized = re.sub(r'\?', '?', normalized)
            
            # Limit length for storage
            return normalized[:200] if len(normalized) > 200 else normalized
            
        except Exception as e:
            logger.error(f"Failed to normalize query: {e}")
            return statement[:200]
    
    def _get_query_plan(self, statement: str, parameters: Dict) -> Optional[Dict[str, Any]]:
        """Get query execution plan."""
        try:
            with self.db_manager.session_scope() as session:
                # Use EXPLAIN ANALYZE for detailed plan
                explain_query = f"EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) {statement}"
                result = session.execute(text(explain_query), parameters).fetchone()
                
                if result and result[0]:
                    return result[0]
                    
        except Exception as e:
            logger.debug(f"Failed to get query plan: {e}")
        
        return None
    
    def analyze_query_performance(self) -> Dict[str, Any]:
        """Analyze overall query performance and provide recommendations."""
        try:
            analysis = {
                'summary': self._get_performance_summary(),
                'slow_queries': self._identify_slow_queries(),
                'optimization_recommendations': self._generate_recommendations(),
                'index_suggestions': self._suggest_indexes(),
                'query_patterns': self._analyze_query_patterns()
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze query performance: {e}")
            return {'error': str(e)}
    
    def _get_performance_summary(self) -> Dict[str, Any]:
        """Get overall performance summary."""
        try:
            total_queries = sum(stats['count'] for stats in self.query_stats.values())
            total_time = sum(stats['total_time'] for stats in self.query_stats.values())
            total_slow = sum(stats['slow_queries'] for stats in self.query_stats.values())
            
            return {
                'total_queries': total_queries,
                'total_execution_time': round(total_time, 3),
                'average_query_time': round(total_time / total_queries, 3) if total_queries > 0 else 0,
                'slow_queries': total_slow,
                'slow_query_percentage': round((total_slow / total_queries * 100), 2) if total_queries > 0 else 0,
                'unique_query_patterns': len(self.query_stats)
            }
            
        except Exception as e:
            logger.error(f"Failed to get performance summary: {e}")
            return {}
    
    def _identify_slow_queries(self) -> List[Dict[str, Any]]:
        """Identify slow queries that need optimization."""
        try:
            slow_queries = []
            
            for query, stats in self.query_stats.items():
                if stats['slow_queries'] > 0:
                    slow_queries.append({
                        'query': query,
                        'count': stats['count'],
                        'avg_time': round(stats['avg_time'], 3),
                        'max_time': round(stats['max_time'], 3),
                        'slow_queries': stats['slow_queries'],
                        'slow_percentage': round((stats['slow_queries'] / stats['count'] * 100), 2)
                    })
            
            # Sort by average time descending
            slow_queries.sort(key=lambda x: x['avg_time'], reverse=True)
            
            return slow_queries[:10]  # Top 10 slowest queries
            
        except Exception as e:
            logger.error(f"Failed to identify slow queries: {e}")
            return []
    
    def _generate_recommendations(self) -> List[Dict[str, Any]]:
        """Generate optimization recommendations."""
        try:
            recommendations = []
            
            for query, stats in self.query_stats.items():
                if stats['avg_time'] > self.thresholds['slow_query']:
                    # Analyze query pattern
                    pattern_match = self._match_query_pattern(query)
                    
                    if pattern_match:
                        recommendations.append({
                            'query': query,
                            'issue': f"Slow {pattern_match['type']} query",
                            'current_avg_time': round(stats['avg_time'], 3),
                            'recommendation': pattern_match['optimization'],
                            'priority': 'high' if stats['avg_time'] > self.thresholds['very_slow_query'] else 'medium'
                        })
                    else:
                        recommendations.append({
                            'query': query,
                            'issue': 'Slow query without known pattern',
                            'current_avg_time': round(stats['avg_time'], 3),
                            'recommendation': 'Review query structure and add appropriate indexes',
                            'priority': 'medium'
                        })
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return []
    
    def _match_query_pattern(self, query: str) -> Optional[Dict[str, Any]]:
        """Match query against known patterns."""
        try:
            import re
            
            for pattern_name, pattern_info in self.query_patterns.items():
                if re.search(pattern_info['pattern'], query, re.IGNORECASE):
                    return {
                        'type': pattern_name,
                        'optimization': pattern_info['optimization'],
                        'index_suggestion': pattern_info['index_suggestion']
                    }
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to match query pattern: {e}")
            return None
    
    def _suggest_indexes(self) -> List[Dict[str, Any]]:
        """Suggest database indexes based on query analysis."""
        try:
            index_suggestions = []
            query_patterns = defaultdict(int)
            
            # Analyze query patterns
            for query, stats in self.query_stats.items():
                pattern_match = self._match_query_pattern(query)
                if pattern_match and stats['avg_time'] > self.thresholds['slow_query']:
                    query_patterns[pattern_match['type']] += stats['count']
            
            # Generate index suggestions
            for pattern_type, count in query_patterns.items():
                pattern_info = self.query_patterns.get(pattern_type, {})
                if pattern_info.get('index_suggestion'):
                    index_suggestions.append({
                        'pattern': pattern_type,
                        'query_count': count,
                        'suggestion': pattern_info['index_suggestion'],
                        'expected_improvement': '50-80% faster queries'
                    })
            
            return index_suggestions
            
        except Exception as e:
            logger.error(f"Failed to suggest indexes: {e}")
            return []
    
    def _analyze_query_patterns(self) -> Dict[str, Any]:
        """Analyze query execution patterns."""
        try:
            patterns = {
                'most_frequent': [],
                'slowest_average': [],
                'most_slow_queries': []
            }
            
            # Most frequent queries
            frequent = sorted(
                [(query, stats['count']) for query, stats in self.query_stats.items()],
                key=lambda x: x[1], reverse=True
            )[:5]
            patterns['most_frequent'] = [{'query': q, 'count': c} for q, c in frequent]
            
            # Slowest average queries
            slowest = sorted(
                [(query, stats['avg_time']) for query, stats in self.query_stats.items() if stats['count'] > 5],
                key=lambda x: x[1], reverse=True
            )[:5]
            patterns['slowest_average'] = [{'query': q, 'avg_time': round(t, 3)} for q, t in slowest]
            
            # Queries with most slow executions
            most_slow = sorted(
                [(query, stats['slow_queries']) for query, stats in self.query_stats.items()],
                key=lambda x: x[1], reverse=True
            )[:5]
            patterns['most_slow_queries'] = [{'query': q, 'slow_count': s} for q, s in most_slow]
            
            return patterns
            
        except Exception as e:
            logger.error(f"Failed to analyze query patterns: {e}")
            return {}
    
    def optimize_specific_query(self, query: str) -> Dict[str, Any]:
        """Optimize a specific query."""
        try:
            optimization = {
                'original_query': query,
                'suggestions': [],
                'index_recommendations': [],
                'estimated_improvement': 0
            }
            
            # Analyze query structure
            analysis = self._analyze_query_structure(query)
            optimization.update(analysis)
            
            # Check for common optimization opportunities
            if 'SELECT *' in query.upper():
                optimization['suggestions'].append({
                    'type': 'select_columns',
                    'issue': 'Using SELECT *',
                    'recommendation': 'Specify only required columns',
                    'impact': 'medium'
                })
            
            if 'ORDER BY' in query.upper() and 'LIMIT' not in query.upper():
                optimization['suggestions'].append({
                    'type': 'unnecessary_sorting',
                    'issue': 'ORDER BY without LIMIT',
                    'recommendation': 'Add LIMIT or remove ORDER BY if not needed',
                    'impact': 'high'
                })
            
            # Check for missing indexes
            pattern_match = self._match_query_pattern(query)
            if pattern_match:
                optimization['index_recommendations'].append({
                    'pattern': pattern_match['type'],
                    'suggestion': pattern_match['index_suggestion'],
                    'expected_improvement': '50-80%'
                })
            
            return optimization
            
        except Exception as e:
            logger.error(f"Failed to optimize specific query: {e}")
            return {'error': str(e)}
    
    def _analyze_query_structure(self, query: str) -> Dict[str, Any]:
        """Analyze query structure for optimization opportunities."""
        try:
            analysis = {
                'has_joins': 'JOIN' in query.upper(),
                'has_subqueries': '(' in query and 'SELECT' in query.upper(),
                'has_aggregations': any(func in query.upper() for func in ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN']),
                'has_group_by': 'GROUP BY' in query.upper(),
                'has_order_by': 'ORDER BY' in query.upper(),
                'has_limit': 'LIMIT' in query.upper(),
                'table_count': len([word for word in query.upper().split() if word in ['FROM', 'JOIN']])
            }
            
            return analysis
            
        except Exception as e:
            logger.error(f"Failed to analyze query structure: {e}")
            return {}
    
    def get_query_statistics(self) -> Dict[str, Any]:
        """Get detailed query statistics."""
        try:
            stats = {}
            
            for query, data in self.query_stats.items():
                if data['count'] > 0:
                    stats[query] = {
                        'count': data['count'],
                        'avg_time_ms': round(data['avg_time'] * 1000, 2),
                        'min_time_ms': round(data['min_time'] * 1000, 2),
                        'max_time_ms': round(data['max_time'] * 1000, 2),
                        'slow_queries': data['slow_queries'],
                        'slow_percentage': round((data['slow_queries'] / data['count'] * 100), 2),
                        'recent_avg_ms': round(sum(data['recent_times']) / len(data['recent_times']) * 1000, 2) if data['recent_times'] else 0
                    }
            
            return stats
            
        except Exception as e:
            logger.error(f"Failed to get query statistics: {e}")
            return {'error': str(e)}
    
    def reset_statistics(self):
        """Reset query statistics."""
        try:
            self.query_stats.clear()
            logger.info("Query statistics reset")
        except Exception as e:
            logger.error(f"Failed to reset statistics: {e}")
    
    def export_analysis_to_redis(self, redis_client, key_prefix: str = "query_analysis"):
        """Export query analysis to Redis for external monitoring."""
        try:
            analysis = self.analyze_query_performance()
            stats = self.get_query_statistics()
            
            timestamp = int(time.time())
            
            # Store analysis
            redis_client.hset(f"{key_prefix}:analysis", mapping={
                'timestamp': timestamp,
                'data': json.dumps(analysis)
            })
            
            # Store statistics
            redis_client.hset(f"{key_prefix}:stats", mapping={
                'timestamp': timestamp,
                'data': json.dumps(stats)
            })
            
            # Set expiration (1 hour)
            redis_client.expire(f"{key_prefix}:analysis", 3600)
            redis_client.expire(f"{key_prefix}:stats", 3600)
            
            logger.debug("Query analysis exported to Redis")
            
        except Exception as e:
            logger.error(f"Failed to export analysis to Redis: {e}")


# Global query optimizer instance
_query_optimizer = None


def get_query_optimizer(db_manager=None) -> QueryOptimizer:
    """Get global query optimizer instance."""
    global _query_optimizer
    
    if _query_optimizer is None and db_manager:
        _query_optimizer = QueryOptimizer(db_manager)
    
    return _query_optimizer
