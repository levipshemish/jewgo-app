import redis
import os

class RateLimiter:
    def __init__(self):
        self.redis_client = redis.from_url(os.environ["REDIS_URL"])
        self.rate_limit_prefix = "jewgo:rate_limit:"
        
        # Rate limit tiers
        self.tiers = {
            "free": {
                "requests_per_minute": 60,
                "requests_per_hour": 1000,
                "requests_per_day": 10000
            },
            "premium": {
                "requests_per_minute": 300,
                "requests_per_hour": 10000,
                "requests_per_day": 100000
            }
        }
        
        # Default rate limits for unauthenticated users
        self.default_limits = {
            "requests_per_minute": 30,
            "requests_per_hour": 500,
            "requests_per_day": 5000
        }
    
    def _get_user_tier(self, user_id=None):
        """Get user tier"""
        if not user_id:
            return "free"
        
        tier_key = f"{self.rate_limit_prefix}user_tier:{user_id}"
        tier = self.redis_client.get(tier_key)
        
        if tier:
            return tier.decode()
        else:
            self.redis_client.set(tier_key, "free", ex=86400)
            return "free"
    
    def _get_rate_limit_key(self, identifier, window):
        """Generate rate limit key"""
        return f"{self.rate_limit_prefix}{identifier}:{window}"
    
    def _check_rate_limit(self, identifier, window, limit):
        """Check if rate limit is exceeded"""
        key = self._get_rate_limit_key(identifier, window)
        
        current_count = self.redis_client.get(key)
        if current_count is None:
            current_count = 0
        else:
            current_count = int(current_count)
        
        if current_count >= limit:
            return False, current_count, limit
        
        self.redis_client.incr(key)
        
        if window == "minute":
            self.redis_client.expire(key, 60)
        elif window == "hour":
            self.redis_client.expire(key, 3600)
        elif window == "day":
            self.redis_client.expire(key, 86400)
        
        return True, current_count + 1, limit
    
    def check_rate_limit(self, identifier, user_id=None):
        """Check rate limit for identifier"""
        tier = self._get_user_tier(user_id)
        limits = self.tiers.get(tier, self.default_limits)
        
        windows = [
            ("minute", limits["requests_per_minute"]),
            ("hour", limits["requests_per_hour"]),
            ("day", limits["requests_per_day"])
        ]
        
        results = {}
        for window, limit in windows:
            allowed, current, limit_val = self._check_rate_limit(identifier, window, limit)
            results[window] = {
                "allowed": allowed,
                "current": current,
                "limit": limit_val,
                "remaining": max(0, limit_val - current)
            }
            
            if not allowed:
                return False, results
        
        return True, results
    
    def set_user_tier(self, user_id, tier):
        """Set user tier"""
        if tier not in self.tiers:
            raise ValueError(f"Invalid tier: {tier}")
        
        tier_key = f"{self.rate_limit_prefix}user_tier:{user_id}"
        self.redis_client.set(tier_key, tier, ex=86400)

# Global rate limiter instance
rate_limiter = RateLimiter()
