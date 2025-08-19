#!/usr/bin/env python3
"""Redis Configuration Script for JewGo App.
===========================================
This script configures Redis caching for optimal performance:
- Sets up cache keys and TTLs
- Configures connection pooling
- Implements cache warming strategies
- Provides cache monitoring and health checks
"""

import os
import sys
import json
import time
import redis
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.utils.logging_config import get_logger

logger = get_logger(__name__)

class RedisCacheManager:
    """Manages Redis cache configuration and optimization."""
    
    def __init__(self):
        """Initialize Redis cache manager."""
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.redis_client = None
        
        # Cache configuration
        self.cache_config = {
            # Restaurant data
            'restaurants:list': 300,  # 5 minutes
            'restaurants:details': 600,  # 10 minutes
            'restaurants:search': 180,  # 3 minutes
            'restaurants:hours': 3600,  # 1 hour
            'restaurants:specials': 900,  # 15 minutes
            
            # Marketplace data
            'marketplace:list': 300,  # 5 minutes
            'marketplace:details': 600,  # 10 minutes
            'marketplace:search': 180,  # 3 minutes
            'marketplace:categories': 3600,  # 1 hour
            'marketplace:featured': 900,  # 15 minutes
            
            # User data
            'user:profile': 600,  # 10 minutes
            'user:favorites': 300,  # 5 minutes
            'user:preferences': 1800,  # 30 minutes
            
            # Search and analytics
            'search:results': 180,  # 3 minutes
            'search:suggestions': 3600,  # 1 hour
            'analytics:stats': 900,  # 15 minutes
            
            # System data
            'system:health': 60,  # 1 minute
            'system:config': 3600,  # 1 hour
            'system:feature_flags': 1800,  # 30 minutes
        }
    
    def connect_redis(self) -> bool:
        """Establish Redis connection with connection pooling."""
        try:
            logger.info("Connecting to Redis...")
            
            # Configure connection pool
            pool = redis.ConnectionPool.from_url(
                self.redis_url,
                max_connections=20,
                retry_on_timeout=True,
                socket_connect_timeout=5,
                socket_timeout=5,
                decode_responses=True
            )
            
            self.redis_client = redis.Redis(connection_pool=pool)
            
            # Test connection
            self.redis_client.ping()
            
            logger.info("✅ Redis connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}")
            return False
    
    def configure_cache_keys(self) -> bool:
        """Configure cache keys and TTLs."""
        try:
            logger.info("Configuring cache keys and TTLs...")
            
            # Store cache configuration
            self.redis_client.setex(
                'jewgo:cache_config', 
                86400,  # 24 hours
                json.dumps(self.cache_config)
            )
            
            # Set up cache prefixes
            cache_prefixes = {
                'restaurants': 'restaurants:',
                'marketplace': 'marketplace:',
                'user': 'user:',
                'search': 'search:',
                'analytics': 'analytics:',
                'system': 'system:'
            }
            
            self.redis_client.setex(
                'jewgo:cache_prefixes',
                86400,
                json.dumps(cache_prefixes)
            )
            
            logger.info("✅ Cache keys and TTLs configured successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache configuration failed: {e}")
            return False
    
    def clear_existing_cache(self) -> bool:
        """Clear existing cache to ensure fresh start."""
        try:
            logger.info("Clearing existing cache...")
            
            # Get all keys with JewGo prefix
            keys_to_delete = self.redis_client.keys('jewgo:*')
            keys_to_delete.extend(self.redis_client.keys('restaurants:*'))
            keys_to_delete.extend(self.redis_client.keys('marketplace:*'))
            keys_to_delete.extend(self.redis_client.keys('user:*'))
            keys_to_delete.extend(self.redis_client.keys('search:*'))
            keys_to_delete.extend(self.redis_client.keys('analytics:*'))
            keys_to_delete.extend(self.redis_client.keys('system:*'))
            
            if keys_to_delete:
                # Remove duplicates
                keys_to_delete = list(set(keys_to_delete))
                self.redis_client.delete(*keys_to_delete)
                logger.info(f"✅ Cleared {len(keys_to_delete)} existing cache keys")
            else:
                logger.info("✅ No existing cache keys found")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache clearing failed: {e}")
            return False
    
    def setup_cache_monitoring(self) -> bool:
        """Set up cache monitoring and health checks."""
        try:
            logger.info("Setting up cache monitoring...")
            
            # Create monitoring keys
            monitoring_data = {
                'cache_start_time': datetime.now().isoformat(),
                'cache_version': '1.0.0',
                'cache_config_hash': hash(json.dumps(self.cache_config)),
                'last_health_check': datetime.now().isoformat(),
                'total_keys': 0,
                'memory_usage': 0,
                'hit_rate': 0.0
            }
            
            self.redis_client.setex(
                'jewgo:monitoring',
                86400,
                json.dumps(monitoring_data)
            )
            
            # Set up health check key
            self.redis_client.setex(
                'jewgo:health_check',
                300,  # 5 minutes
                datetime.now().isoformat()
            )
            
            logger.info("✅ Cache monitoring configured successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache monitoring setup failed: {e}")
            return False
    
    def implement_cache_warming(self) -> bool:
        """Implement cache warming strategies."""
        try:
            logger.info("Implementing cache warming strategies...")
            
            # Warm up frequently accessed data
            warming_data = {
                'system:health': {
                    'status': 'healthy',
                    'timestamp': datetime.now().isoformat(),
                    'version': '1.0.0'
                },
                'system:config': {
                    'cache_enabled': True,
                    'cache_ttl_default': 300,
                    'cache_max_keys': 1000
                },
                'search:suggestions': {
                    'popular_terms': ['kosher', 'restaurant', 'miami', 'delivery', 'takeout'],
                    'categories': ['restaurants', 'marketplace', 'shuls', 'events']
                }
            }
            
            for key, data in warming_data.items():
                ttl = self.cache_config.get(key, 300)
                self.redis_client.setex(
                    f'jewgo:{key}',
                    ttl,
                    json.dumps(data)
                )
            
            logger.info("✅ Cache warming implemented successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache warming failed: {e}")
            return False
    
    def verify_cache_health(self) -> bool:
        """Verify cache health and performance."""
        try:
            logger.info("Verifying cache health...")
            
            # Test basic operations
            test_key = 'jewgo:health_test'
            test_data = {'test': True, 'timestamp': datetime.now().isoformat()}
            
            # Test set operation
            self.redis_client.setex(test_key, 60, json.dumps(test_data))
            
            # Test get operation
            retrieved_data = self.redis_client.get(test_key)
            if not retrieved_data:
                raise Exception("Cache get operation failed")
            
            # Test delete operation
            self.redis_client.delete(test_key)
            
            # Check Redis info
            info = self.redis_client.info()
            logger.info(f"✅ Redis info - Version: {info.get('redis_version', 'unknown')}")
            logger.info(f"✅ Redis info - Connected clients: {info.get('connected_clients', 0)}")
            logger.info(f"✅ Redis info - Used memory: {info.get('used_memory_human', 'unknown')}")
            
            logger.info("✅ Cache health verification completed successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache health verification failed: {e}")
            return False
    
    def generate_cache_report(self) -> Dict:
        """Generate a comprehensive cache configuration report."""
        try:
            info = self.redis_client.info()
            
            report = {
                'timestamp': datetime.now().isoformat(),
                'redis_info': {
                    'version': info.get('redis_version'),
                    'connected_clients': info.get('connected_clients'),
                    'used_memory': info.get('used_memory_human'),
                    'total_commands_processed': info.get('total_commands_processed'),
                    'keyspace_hits': info.get('keyspace_hits'),
                    'keyspace_misses': info.get('keyspace_misses')
                },
                'cache_config': self.cache_config,
                'cache_keys_count': len(self.redis_client.keys('jewgo:*')),
                'health_status': 'healthy'
            }
            
            # Calculate hit rate
            hits = info.get('keyspace_hits', 0)
            misses = info.get('keyspace_misses', 0)
            total = hits + misses
            if total > 0:
                report['hit_rate'] = (hits / total) * 100
            else:
                report['hit_rate'] = 0.0
            
            return report
            
        except Exception as e:
            logger.error(f"Error generating cache report: {e}")
            return {'error': str(e)}
    
    def run_complete_configuration(self) -> bool:
        """Execute the complete Redis configuration process."""
        logger.info("🚀 Starting Redis cache configuration...")
        
        try:
            # Step 1: Connect to Redis
            if not self.connect_redis():
                return False
            
            # Step 2: Clear existing cache
            if not self.clear_existing_cache():
                return False
            
            # Step 3: Configure cache keys
            if not self.configure_cache_keys():
                return False
            
            # Step 4: Set up monitoring
            if not self.setup_cache_monitoring():
                return False
            
            # Step 5: Implement cache warming
            if not self.implement_cache_warming():
                return False
            
            # Step 6: Verify cache health
            if not self.verify_cache_health():
                return False
            
            # Step 7: Generate and save report
            report = self.generate_cache_report()
            report_path = f"scripts/database/redis_config_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"✅ Redis configuration report saved: {report_path}")
            logger.info("🎉 Redis cache configuration completed successfully!")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Redis configuration failed: {e}")
            return False

def main():
    """Main execution function."""
    try:
        # Initialize cache manager
        cache_manager = RedisCacheManager()
        
        # Run complete configuration
        success = cache_manager.run_complete_configuration()
        
        if success:
            print("\n🎉 Redis cache configuration completed successfully!")
            print("✅ Redis connection: Established")
            print("✅ Cache keys: Configured")
            print("✅ Cache monitoring: Set up")
            print("✅ Cache warming: Implemented")
            print("✅ Health verification: Passed")
            print("\n📋 Next steps:")
            print("1. Monitor cache performance in Redis")
            print("2. Adjust TTLs based on usage patterns")
            print("3. Set up cache monitoring alerts")
            print("4. Test cache hit rates in production")
        else:
            print("\n❌ Redis configuration completed with errors")
            print("Please check the logs above for details")
        
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"❌ Redis configuration script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
