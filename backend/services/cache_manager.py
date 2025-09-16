import redis
import json
import hashlib
import os

class CacheManager:
    def __init__(self):
        self.redis_client = redis.from_url(os.environ["REDIS_URL"])
        self.default_ttl = 3600  # 1 hour default
        self.cache_prefix = "jewgo:"
    
    def _generate_cache_key(self, prefix, *args, **kwargs):
        """Generate a unique cache key"""
        key_data = f"{prefix}:{str(args)}:{str(sorted(kwargs.items()))}"
        return f"{self.cache_prefix}{hashlib.md5(key_data.encode()).hexdigest()}"
    
    def get(self, key):
        """Get value from cache"""
        try:
            value = self.redis_client.get(key)
            if value:
                return json.loads(value.decode())
            return None
        except Exception as e:
            print(f"Cache get error: {e}")
            return None
    
    def set(self, key, value, ttl=None):
        """Set value in cache"""
        try:
            ttl = ttl or self.default_ttl
            self.redis_client.set(key, json.dumps(value), ex=ttl)
            return True
        except Exception as e:
            print(f"Cache set error: {e}")
            return False
    
    def cache_restaurant_data(self, restaurant_id, data, ttl=1800):
        """Cache restaurant data"""
        key = f"{self.cache_prefix}restaurant:{restaurant_id}"
        return self.set(key, data, ttl)
    
    def get_restaurant_data(self, restaurant_id):
        """Get cached restaurant data"""
        key = f"{self.cache_prefix}restaurant:{restaurant_id}"
        return self.get(key)
    
    def cache_restaurants_list(self, city, filters, data, ttl=900):
        """Cache restaurants list"""
        key = self._generate_cache_key("restaurants_list", city, **filters)
        return self.set(key, data, ttl)
    
    def get_restaurants_list(self, city, filters):
        """Get cached restaurants list"""
        key = self._generate_cache_key("restaurants_list", city, **filters)
        return self.get(key)
    
    def invalidate_restaurant_cache(self, restaurant_id):
        """Invalidate all cache related to a restaurant"""
        patterns = [
            f"{self.cache_prefix}restaurant:{restaurant_id}",
            f"{self.cache_prefix}reviews:{restaurant_id}",
            f"{self.cache_prefix}restaurants_list:*"
        ]
        
        for pattern in patterns:
            if "*" in pattern:
                keys = self.redis_client.keys(pattern)
                if keys:
                    self.redis_client.delete(*keys)
            else:
                self.redis_client.delete(pattern)
    
    def get_cache_stats(self):
        """Get cache statistics"""
        try:
            info = self.redis_client.info()
            return {
                "total_keys": info.get("db0", {}).get("keys", 0),
                "memory_used": info.get("used_memory_human", "0B"),
                "connected_clients": info.get("connected_clients", 0)
            }
        except Exception as e:
            return {"error": str(e)}

# Global cache instance
cache_manager = CacheManager()
