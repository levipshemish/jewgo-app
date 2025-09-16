#!/usr/bin/env python3
"""
Simple JWT Key Rotation Service for JewGo
This is a standalone script that doesn't depend on the full application.
"""

import os
import sys
import time
import logging
import argparse
import signal
from datetime import datetime
from typing import Tuple
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.backends import default_backend
import redis
import psycopg2
from psycopg2.extras import RealDictCursor
import hashlib

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SimpleKeyRotationService:
    """Simple JWT Key Rotation Service"""
    
    def __init__(self):
        self.running = True
        self.redis_client = None
        self.db_connection = None
        self.rotation_interval = 7 * 24 * 3600  # 7 days in seconds
        
        # Load configuration from environment
        self.load_config()
        
        # Setup signal handlers
        signal.signal(signal.SIGTERM, self.signal_handler)
        signal.signal(signal.SIGINT, self.signal_handler)
    
    def load_config(self):
        """Load configuration from environment variables"""
        self.redis_host = os.getenv('REDIS_HOST', 'localhost')
        self.redis_port = int(os.getenv('REDIS_PORT', 6380))
        self.redis_password = os.getenv('REDIS_PASSWORD')
        
        self.db_host = os.getenv('DB_HOST', 'localhost')
        self.db_port = int(os.getenv('DB_PORT', 5432))
        self.db_name = os.getenv('DB_NAME', 'jewgo_db')
        self.db_user = os.getenv('DB_USER', 'postgres')
        self.db_password = os.getenv('DB_PASSWORD')
        
        logger.info(f"Configuration loaded - Redis: {self.redis_host}:{self.redis_port}, DB: {self.db_host}:{self.db_port}")
    
    def signal_handler(self, signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False
    
    def connect_redis(self) -> bool:
        """Connect to Redis"""
        try:
            self.redis_client = redis.Redis(
                host=self.redis_host,
                port=self.redis_port,
                password=self.redis_password,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_timeout=5
            )
            # Test connection
            self.redis_client.ping()
            logger.info("Redis connection established")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
            return False
    
    def connect_db(self) -> bool:
        """Connect to PostgreSQL"""
        try:
            self.db_connection = psycopg2.connect(
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password,
                cursor_factory=RealDictCursor
            )
            logger.info("Database connection established")
            return True
        except Exception as e:
            logger.error(f"Failed to connect to database: {e}")
            return False
    
    def generate_rsa_key_pair(self) -> Tuple[str, str]:
        """Generate RSA key pair"""
        private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        
        # Serialize private key
        private_pem = private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        ).decode('utf-8')
        
        # Serialize public key
        public_key = private_key.public_key()
        public_pem = public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode('utf-8')
        
        return private_pem, public_pem
    
    def generate_key_id(self, public_key: str) -> str:
        """Generate a unique key ID from public key"""
        key_hash = hashlib.sha256(public_key.encode()).hexdigest()[:16]
        timestamp = int(time.time())
        return f"rs256_{timestamp}_{key_hash}"
    
    def store_key_in_redis(self, key_id: str, private_key: str, public_key: str) -> bool:
        """Store key in Redis"""
        try:
            key_data = {
                'private_key': private_key,
                'public_key': public_key,
                'created_at': datetime.utcnow().isoformat(),
                'algorithm': 'RS256',
                'status': 'active'
            }
            
            # Store the key
            self.redis_client.hset(f"jwt_key:{key_id}", mapping=key_data)
            
            # Add to active keys set
            self.redis_client.sadd("jwt_keys:active", key_id)
            
            # Set as current key
            self.redis_client.set("jwt_keys:current", key_id)
            
            logger.info(f"Key {key_id} stored in Redis")
            return True
        except Exception as e:
            logger.error(f"Failed to store key in Redis: {e}")
            return False
    
    def store_key_in_db(self, key_id: str, private_key: str, public_key: str) -> bool:
        """Store key in PostgreSQL"""
        try:
            with self.db_connection.cursor() as cursor:
                cursor.execute("""
                    INSERT INTO jwt_keys (key_id, private_key, public_key, algorithm, status, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (key_id) DO UPDATE SET
                        private_key = EXCLUDED.private_key,
                        public_key = EXCLUDED.public_key,
                        updated_at = CURRENT_TIMESTAMP
                """, (key_id, private_key, public_key, 'RS256', 'active', datetime.utcnow()))
                
                self.db_connection.commit()
                logger.info(f"Key {key_id} stored in database")
                return True
        except Exception as e:
            logger.error(f"Failed to store key in database: {e}")
            if self.db_connection:
                self.db_connection.rollback()
            return False
    
    def rotate_keys(self) -> bool:
        """Rotate JWT keys"""
        logger.info("Starting key rotation...")
        
        try:
            # Generate new key pair
            private_key, public_key = self.generate_rsa_key_pair()
            key_id = self.generate_key_id(public_key)
            
            logger.info(f"Generated new key: {key_id}")
            
            # Store in Redis
            if not self.store_key_in_redis(key_id, private_key, public_key):
                return False
            
            # Store in database
            if not self.store_key_in_db(key_id, private_key, public_key):
                return False
            
            # Clean up old keys (keep last 3)
            self.cleanup_old_keys()
            
            logger.info(f"Key rotation completed successfully: {key_id}")
            return True
            
        except Exception as e:
            logger.error(f"Key rotation failed: {e}")
            return False
    
    def cleanup_old_keys(self):
        """Clean up old keys, keeping the last 3"""
        try:
            # Get all active keys
            active_keys = self.redis_client.smembers("jwt_keys:active")
            if len(active_keys) <= 3:
                return
            
            # Get key creation times
            key_times = []
            for key_id in active_keys:
                key_data = self.redis_client.hgetall(f"jwt_key:{key_id}")
                if key_data and 'created_at' in key_data:
                    created_at = datetime.fromisoformat(key_data['created_at'])
                    key_times.append((key_id, created_at))
            
            # Sort by creation time (newest first)
            key_times.sort(key=lambda x: x[1], reverse=True)
            
            # Remove old keys (keep newest 3)
            for key_id, _ in key_times[3:]:
                logger.info(f"Removing old key: {key_id}")
                self.redis_client.delete(f"jwt_key:{key_id}")
                self.redis_client.srem("jwt_keys:active", key_id)
                
                # Mark as retired in database
                with self.db_connection.cursor() as cursor:
                    cursor.execute(
                        "UPDATE jwt_keys SET status = 'retired', updated_at = CURRENT_TIMESTAMP WHERE key_id = %s",
                        (key_id,)
                    )
                    self.db_connection.commit()
            
        except Exception as e:
            logger.error(f"Failed to cleanup old keys: {e}")
    
    def health_check(self) -> bool:
        """Perform health check"""
        logger.info("Performing health check...")
        
        # Check Redis connection
        if not self.connect_redis():
            return False
        
        # Check database connection
        if not self.connect_db():
            return False
        
        # Check if current key exists
        try:
            current_key = self.redis_client.get("jwt_keys:current")
            if not current_key:
                logger.warning("No current key found")
                return False
            
            key_data = self.redis_client.hgetall(f"jwt_key:{current_key}")
            if not key_data:
                logger.warning(f"Current key data not found: {current_key}")
                return False
            
            logger.info(f"Health check passed - Current key: {current_key}")
            return True
            
        except Exception as e:
            logger.error(f"Health check failed: {e}")
            return False
    
    def run_daemon(self):
        """Run as daemon"""
        logger.info("Starting JWT Key Rotation Service daemon...")
        
        # Initial health check
        if not self.health_check():
            logger.error("Initial health check failed, exiting...")
            return 1
        
        # Initial key rotation if no current key
        current_key = self.redis_client.get("jwt_keys:current")
        if not current_key:
            logger.info("No current key found, performing initial rotation...")
            if not self.rotate_keys():
                logger.error("Initial key rotation failed, exiting...")
                return 1
        
        last_rotation = time.time()
        
        while self.running:
            try:
                # Check if it's time to rotate
                if time.time() - last_rotation >= self.rotation_interval:
                    if self.rotate_keys():
                        last_rotation = time.time()
                    else:
                        logger.error("Key rotation failed, will retry in 1 hour")
                        time.sleep(3600)  # Wait 1 hour before retry
                        continue
                
                # Sleep for 1 hour between checks
                time.sleep(3600)
                
            except Exception as e:
                logger.error(f"Daemon error: {e}")
                time.sleep(60)  # Wait 1 minute before retry
        
        logger.info("JWT Key Rotation Service daemon stopped")
        return 0

def main():
    parser = argparse.ArgumentParser(description='JWT Key Rotation Service')
    parser.add_argument('--daemon', action='store_true', help='Run as daemon')
    parser.add_argument('--health-check', action='store_true', help='Perform health check')
    parser.add_argument('--rotate-now', action='store_true', help='Rotate keys immediately')
    
    args = parser.parse_args()
    
    service = SimpleKeyRotationService()
    
    if args.health_check:
        if service.health_check():
            print("Health check passed")
            return 0
        else:
            print("Health check failed")
            return 1
    
    elif args.rotate_now:
        if not service.connect_redis() or not service.connect_db():
            return 1
        
        if service.rotate_keys():
            print("Key rotation completed successfully")
            return 0
        else:
            print("Key rotation failed")
            return 1
    
    elif args.daemon:
        return service.run_daemon()
    
    else:
        parser.print_help()
        return 1

if __name__ == '__main__':
    sys.exit(main())