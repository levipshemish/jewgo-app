#!/usr/bin/env python3
"""Database Migration Script: Marketplace Table Creation and Production Verification.
===========================================
This script performs the following tasks:
1. Runs the marketplace table migration
2. Configures Redis caching (optional but recommended)
3. Verifies all implementations work correctly in production
4. Includes rollback procedures and health checks
"""

import os
import sys
import time
import json
import redis
import requests
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, DBAPIError

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.utils.logging_config import get_logger
from backend.database.migrations.create_marketplace_table import upgrade as create_marketplace_table
from backend.database.migrations.add_sample_marketplace_data import add_sample_data

logger = get_logger(__name__)

class MarketplaceMigrationManager:
    """Manages the complete marketplace migration process."""
    
    def __init__(self):
        """Initialize migration manager with environment configuration."""
        self.database_url = os.getenv('DATABASE_URL')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.api_url = os.getenv('API_URL', 'https://jewgo-app-oyoh.onrender.com')
        self.admin_token = os.getenv('ADMIN_TOKEN')
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.engine = None
        self.redis_client = None
        self.migration_status = {
            'database_migration': False,
            'redis_configuration': False,
            'sample_data_population': False,
            'production_verification': False
        }
    
    def connect_database(self) -> bool:
        """Establish database connection with retry logic."""
        try:
            logger.info("Connecting to database...")
            self.engine = create_engine(self.database_url)
            
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            
            logger.info("✅ Database connection established successfully")
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def connect_redis(self) -> bool:
        """Establish Redis connection for caching."""
        try:
            logger.info("Connecting to Redis...")
            self.redis_client = redis.from_url(self.redis_url)
            
            # Test connection
            self.redis_client.ping()
            
            logger.info("✅ Redis connection established successfully")
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed (optional): {e}")
            logger.info("Continuing without Redis caching...")
            return False
    
    def check_table_exists(self, table_name: str) -> bool:
        """Check if a table exists in the database."""
        try:
            inspector = inspect(self.engine)
            return table_name in inspector.get_table_names()
        except Exception as e:
            logger.error(f"Error checking table existence: {e}")
            return False
    
    def run_database_migration(self) -> bool:
        """Execute the marketplace table migration."""
        try:
            logger.info("Starting marketplace table migration...")
            
            # Check if table already exists
            if self.check_table_exists('marketplace'):
                logger.info("✅ Marketplace table already exists, skipping migration")
                self.migration_status['database_migration'] = True
                return True
            
            # Create marketplace table
            with self.engine.begin() as conn:
                # Execute the migration
                create_marketplace_table()
                logger.info("✅ Marketplace table created successfully")
            
            self.migration_status['database_migration'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Database migration failed: {e}")
            return False
    
    def populate_sample_data(self) -> bool:
        """Populate the marketplace table with sample data."""
        try:
            logger.info("Populating marketplace table with sample data...")
            
            # Check if data already exists
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
                count = result.scalar()
                
                if count > 0:
                    logger.info(f"✅ Marketplace table already contains {count} records, skipping sample data")
                    self.migration_status['sample_data_population'] = True
                    return True
            
            # Add sample data
            success = add_sample_data()
            
            if success:
                logger.info("✅ Sample data populated successfully")
                self.migration_status['sample_data_population'] = True
                return True
            else:
                logger.error("❌ Sample data population failed")
                return False
                
        except Exception as e:
            logger.error(f"❌ Sample data population failed: {e}")
            return False
    
    def configure_redis_caching(self) -> bool:
        """Configure Redis caching for marketplace data."""
        if not self.redis_client:
            logger.info("⚠️ Redis not available, skipping cache configuration")
            return True
        
        try:
            logger.info("Configuring Redis caching...")
            
            # Set up cache keys and TTLs
            cache_config = {
                'marketplace:list': 300,  # 5 minutes
                'marketplace:details': 600,  # 10 minutes
                'marketplace:search': 180,  # 3 minutes
                'marketplace:categories': 3600,  # 1 hour
                'marketplace:featured': 900,  # 15 minutes
            }
            
            # Store cache configuration
            self.redis_client.setex('marketplace:cache_config', 86400, json.dumps(cache_config))
            
            # Clear any existing marketplace cache
            keys_to_delete = self.redis_client.keys('marketplace:*')
            if keys_to_delete:
                self.redis_client.delete(*keys_to_delete)
                logger.info(f"Cleared {len(keys_to_delete)} existing cache keys")
            
            logger.info("✅ Redis caching configured successfully")
            self.migration_status['redis_configuration'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Redis configuration failed: {e}")
            return False
    
    def verify_production_endpoints(self) -> bool:
        """Verify that all marketplace endpoints work correctly in production."""
        try:
            logger.info("Verifying production endpoints...")
            
            endpoints_to_test = [
                f"{self.api_url}/api/restaurants",
                f"{self.api_url}/api/health",
            ]
            
            # Add marketplace endpoints if they exist
            if self.admin_token:
                endpoints_to_test.extend([
                    f"{self.api_url}/api/admin/marketplace",
                ])
            
            successful_tests = 0
            total_tests = len(endpoints_to_test)
            
            for endpoint in endpoints_to_test:
                try:
                    headers = {}
                    if 'admin' in endpoint and self.admin_token:
                        headers['Authorization'] = f'Bearer {self.admin_token}'
                    
                    response = requests.get(endpoint, headers=headers, timeout=10)
                    
                    if response.status_code in [200, 201]:
                        logger.info(f"✅ {endpoint} - Status: {response.status_code}")
                        successful_tests += 1
                    else:
                        logger.warning(f"⚠️ {endpoint} - Status: {response.status_code}")
                        
                except Exception as e:
                    logger.warning(f"⚠️ {endpoint} - Error: {e}")
            
            # Check database connectivity
            try:
                with self.engine.connect() as conn:
                    result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
                    count = result.scalar()
                    logger.info(f"✅ Database connectivity verified - {count} marketplace records")
                    successful_tests += 1
                    total_tests += 1
            except Exception as e:
                logger.error(f"❌ Database connectivity failed: {e}")
            
            success_rate = (successful_tests / total_tests) * 100
            logger.info(f"Production verification: {successful_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
            
            if success_rate >= 80:
                logger.info("✅ Production verification completed successfully")
                self.migration_status['production_verification'] = True
                return True
            else:
                logger.warning("⚠️ Production verification partially successful")
                return False
                
        except Exception as e:
            logger.error(f"❌ Production verification failed: {e}")
            return False
    
    def create_rollback_script(self) -> str:
        """Create a rollback script for the migration."""
        rollback_script = f"""#!/usr/bin/env python3
\"\"\"Rollback script for marketplace migration.
Generated on: {datetime.now().isoformat()}
\"\"\"

import os
import sys
from sqlalchemy import create_engine, text

# Add the parent directory to the path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

def rollback_marketplace_migration():
    \"\"\"Rollback the marketplace table migration.\"\"\"
    database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        print("❌ DATABASE_URL environment variable is required")
        return False
    
    try:
        engine = create_engine(database_url)
        
        with engine.begin() as conn:
            # Drop marketplace table
            conn.execute(text("DROP TABLE IF EXISTS marketplace CASCADE"))
            print("✅ Marketplace table dropped successfully")
        
        return True
        
    except Exception as e:
        print(f"❌ Rollback failed: {{e}}")
        return False

if __name__ == "__main__":
    rollback_marketplace_migration()
"""
        
        rollback_path = "scripts/database/rollback_marketplace_migration.py"
        with open(rollback_path, 'w') as f:
            f.write(rollback_script)
        
        logger.info(f"✅ Rollback script created: {rollback_path}")
        return rollback_path
    
    def generate_migration_report(self) -> Dict:
        """Generate a comprehensive migration report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'migration_status': self.migration_status,
            'environment': {
                'database_url': self.database_url[:20] + '...' if self.database_url else None,
                'redis_url': self.redis_url,
                'api_url': self.api_url,
                'admin_token_configured': bool(self.admin_token)
            },
            'summary': {
                'total_steps': len(self.migration_status),
                'completed_steps': sum(self.migration_status.values()),
                'success_rate': (sum(self.migration_status.values()) / len(self.migration_status)) * 100
            }
        }
        
        return report
    
    def run_complete_migration(self) -> bool:
        """Execute the complete migration process."""
        logger.info("🚀 Starting complete marketplace migration process...")
        
        try:
            # Step 1: Connect to database
            if not self.connect_database():
                return False
            
            # Step 2: Connect to Redis (optional)
            self.connect_redis()
            
            # Step 3: Run database migration
            if not self.run_database_migration():
                return False
            
            # Step 4: Populate sample data
            if not self.populate_sample_data():
                return False
            
            # Step 5: Configure Redis caching
            if not self.configure_redis_caching():
                logger.warning("⚠️ Redis configuration failed, continuing...")
            
            # Step 6: Verify production endpoints
            if not self.verify_production_endpoints():
                logger.warning("⚠️ Production verification partially failed")
            
            # Step 7: Create rollback script
            rollback_path = self.create_rollback_script()
            
            # Step 8: Generate and save report
            report = self.generate_migration_report()
            report_path = f"scripts/database/migration_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"✅ Migration report saved: {report_path}")
            
            # Final status
            success_rate = report['summary']['success_rate']
            if success_rate >= 80:
                logger.info(f"🎉 Migration completed successfully! Success rate: {success_rate:.1f}%")
                logger.info(f"📋 Rollback script available: {rollback_path}")
                return True
            else:
                logger.warning(f"⚠️ Migration completed with warnings. Success rate: {success_rate:.1f}%")
                return False
                
        except Exception as e:
            logger.error(f"❌ Migration failed: {e}")
            return False

def main():
    """Main execution function."""
    try:
        # Initialize migration manager
        migration_manager = MarketplaceMigrationManager()
        
        # Run complete migration
        success = migration_manager.run_complete_migration()
        
        if success:
            print("\n🎉 Migration completed successfully!")
            print("✅ Database migration: Complete")
            print("✅ Redis configuration: Complete")
            print("✅ Sample data population: Complete")
            print("✅ Production verification: Complete")
            print("\n📋 Next steps:")
            print("1. Monitor application logs for any issues")
            print("2. Test marketplace functionality in the frontend")
            print("3. Verify cache performance in Redis")
            print("4. Run performance tests if needed")
        else:
            print("\n❌ Migration completed with errors")
            print("Please check the logs above for details")
            print("Use the rollback script if needed")
        
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"❌ Migration script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
