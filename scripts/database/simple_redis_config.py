#!/usr/bin/env python3
"""Simple Redis Configuration Script for JewGo App.
===========================================
This script configures Redis caching for optimal performance.
Simplified version to avoid complex dependency issues.
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

# Load environment variables from backend/.env
env_file = project_root / "backend" / ".env"
if env_file.exists():
    with open(env_file, 'r') as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key] = value

def configure_redis_caching():
    """Configure Redis caching for marketplace data."""
    try:
        import redis
        
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        
        print("🔗 Connecting to Redis...")
        redis_client = redis.from_url(redis_url)
        
        # Test connection
        redis_client.ping()
        print("✅ Redis connection established")
        
        # Cache configuration
        cache_config = {
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
        
        print("⚙️ Configuring cache keys and TTLs...")
        
        # Store cache configuration
        redis_client.setex(
            'jewgo:cache_config', 
            86400,  # 24 hours
            json.dumps(cache_config)
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
        
        redis_client.setex(
            'jewgo:cache_prefixes',
            86400,
            json.dumps(cache_prefixes)
        )
        
        # Clear any existing marketplace cache
        keys_to_delete = redis_client.keys('marketplace:*')
        keys_to_delete.extend(redis_client.keys('jewgo:*'))
        
        if keys_to_delete:
            # Remove duplicates
            keys_to_delete = list(set(keys_to_delete))
            redis_client.delete(*keys_to_delete)
            print(f"✅ Cleared {len(keys_to_delete)} existing cache keys")
        else:
            print("✅ No existing cache keys found")
        
        # Set up monitoring
        monitoring_data = {
            'cache_start_time': datetime.now().isoformat(),
            'cache_version': '1.0.0',
            'cache_config_hash': hash(json.dumps(cache_config)),
            'last_health_check': datetime.now().isoformat(),
            'total_keys': 0,
            'memory_usage': 0,
            'hit_rate': 0.0
        }
        
        redis_client.setex(
            'jewgo:monitoring',
            86400,
            json.dumps(monitoring_data)
        )
        
        # Set up health check key
        redis_client.setex(
            'jewgo:health_check',
            300,  # 5 minutes
            datetime.now().isoformat()
        )
        
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
            ttl = cache_config.get(key, 300)
            redis_client.setex(
                f'jewgo:{key}',
                ttl,
                json.dumps(data)
            )
        
        # Test cache functionality
        test_key = 'jewgo:health_test'
        test_data = {'test': True, 'timestamp': datetime.now().isoformat()}
        
        redis_client.setex(test_key, 60, json.dumps(test_data))
        retrieved_data = redis_client.get(test_key)
        
        if not retrieved_data:
            raise Exception("Cache get operation failed")
        
        # Verify data integrity
        retrieved_json = json.loads(retrieved_data)
        if retrieved_json['test'] != test_data['test']:
            raise Exception("Cache data integrity check failed")
        
        # Clean up test key
        redis_client.delete(test_key)
        
        # Get Redis info
        info = redis_client.info()
        print(f"✅ Redis info - Version: {info.get('redis_version', 'unknown')}")
        print(f"✅ Redis info - Connected clients: {info.get('connected_clients', 0)}")
        print(f"✅ Redis info - Used memory: {info.get('used_memory_human', 'unknown')}")
        
        print("✅ Redis caching configured successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install redis: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Redis configuration failed: {e}")
        return False

def verify_redis_health():
    """Verify Redis health and performance."""
    try:
        import redis
        
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        redis_client = redis.from_url(redis_url)
        
        print("🔍 Verifying Redis health...")
        
        # Test basic operations
        test_key = 'jewgo:health_verification'
        test_data = {'verification': True, 'timestamp': datetime.now().isoformat()}
        
        # Test set operation
        redis_client.setex(test_key, 60, json.dumps(test_data))
        
        # Test get operation
        retrieved_data = redis_client.get(test_key)
        if not retrieved_data:
            raise Exception("Redis get operation failed")
        
        # Test delete operation
        redis_client.delete(test_key)
        
        # Check cache configuration
        cache_config = redis_client.get('jewgo:cache_config')
        if cache_config:
            config_data = json.loads(cache_config)
            print(f"✅ Cache configuration found with {len(config_data)} keys")
        else:
            print("⚠️ Cache configuration not found")
        
        # Check monitoring data
        monitoring_data = redis_client.get('jewgo:monitoring')
        if monitoring_data:
            print("✅ Monitoring data configured")
        else:
            print("⚠️ Monitoring data not found")
        
        print("✅ Redis health verification completed successfully")
        return True
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        return False
    except Exception as e:
        print(f"❌ Redis health verification failed: {e}")
        return False

def main():
    """Main execution function."""
    print("🚀 Starting Redis cache configuration...")
    
    try:
        # Step 1: Configure Redis caching
        if not configure_redis_caching():
            print("❌ Failed to configure Redis caching")
            return 1
        
        # Step 2: Verify Redis health
        if not verify_redis_health():
            print("❌ Redis health verification failed")
            return 1
        
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
        
        return 0
        
    except Exception as e:
        print(f"❌ Redis configuration failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
