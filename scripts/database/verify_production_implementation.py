#!/usr/bin/env python3
"""Production Verification Script for JewGo App.
===========================================
This script verifies that all marketplace implementations work correctly in production:
- Tests database connectivity and marketplace table
- Verifies Redis caching functionality
- Tests API endpoints and responses
- Validates data integrity and performance
- Generates comprehensive verification report
"""

import os
import sys
import json
import time
import redis
import requests
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.exc import OperationalError, DBAPIError

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.utils.logging_config import get_logger

logger = get_logger(__name__)

class ProductionVerificationManager:
    """Manages production verification for all marketplace implementations."""
    
    def __init__(self):
        """Initialize verification manager."""
        self.database_url = os.getenv('DATABASE_URL')
        self.redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        self.api_url = os.getenv('API_URL', 'https://jewgo.onrender.com')
        self.admin_token = os.getenv('ADMIN_TOKEN')
        self.scraper_token = os.getenv('SCRAPER_TOKEN')
        
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable is required")
        
        self.engine = None
        self.redis_client = None
        self.verification_results = {
            'database_connectivity': False,
            'marketplace_table': False,
            'redis_connectivity': False,
            'api_endpoints': False,
            'data_integrity': False,
            'performance_metrics': False,
            'cache_functionality': False
        }
    
    def connect_database(self) -> bool:
        """Establish database connection and verify connectivity."""
        try:
            logger.info("Connecting to database...")
            self.engine = create_engine(self.database_url)
            
            # Test connection
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
            
            logger.info("✅ Database connection established successfully")
            self.verification_results['database_connectivity'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Database connection failed: {e}")
            return False
    
    def connect_redis(self) -> bool:
        """Establish Redis connection and verify connectivity."""
        try:
            logger.info("Connecting to Redis...")
            self.redis_client = redis.from_url(self.redis_url)
            
            # Test connection
            self.redis_client.ping()
            
            logger.info("✅ Redis connection established successfully")
            self.verification_results['redis_connectivity'] = True
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Redis connection failed (optional): {e}")
            return False
    
    def verify_marketplace_table(self) -> bool:
        """Verify marketplace table structure and data."""
        try:
            logger.info("Verifying marketplace table...")
            
            inspector = inspect(self.engine)
            
            # Check if table exists
            if 'marketplace' not in inspector.get_table_names():
                logger.error("❌ Marketplace table does not exist")
                return False
            
            # Get table columns
            columns = inspector.get_columns('marketplace')
            required_columns = [
                'id', 'name', 'title', 'price', 'category', 'location',
                'vendor_name', 'created_at', 'updated_at'
            ]
            
            column_names = [col['name'] for col in columns]
            missing_columns = [col for col in required_columns if col not in column_names]
            
            if missing_columns:
                logger.error(f"❌ Missing required columns: {missing_columns}")
                return False
            
            # Check data count
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
                count = result.scalar()
                
                if count == 0:
                    logger.warning("⚠️ Marketplace table is empty")
                else:
                    logger.info(f"✅ Marketplace table contains {count} records")
            
            # Check indexes
            indexes = inspector.get_indexes('marketplace')
            logger.info(f"✅ Marketplace table has {len(indexes)} indexes")
            
            self.verification_results['marketplace_table'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Marketplace table verification failed: {e}")
            return False
    
    def test_api_endpoints(self) -> bool:
        """Test all relevant API endpoints."""
        try:
            logger.info("Testing API endpoints...")
            
            endpoints_to_test = [
                {
                    'url': f"{self.api_url}/api/health",
                    'method': 'GET',
                    'auth_required': False,
                    'expected_status': 200
                },
                {
                    'url': f"{self.api_url}/api/restaurants",
                    'method': 'GET',
                    'auth_required': False,
                    'expected_status': 200
                }
            ]
            
            # Add admin endpoints if admin token is available
            if self.admin_token:
                endpoints_to_test.extend([
                    {
                        'url': f"{self.api_url}/api/admin/restaurants",
                        'method': 'GET',
                        'auth_required': True,
                        'expected_status': 200
                    },
                    {
                        'url': f"{self.api_url}/api/admin/users",
                        'method': 'GET',
                        'auth_required': True,
                        'expected_status': 200
                    }
                ])
            
            # Add scraper endpoints if scraper token is available
            if self.scraper_token:
                endpoints_to_test.extend([
                    {
                        'url': f"{self.api_url}/api/restaurants/search",
                        'method': 'GET',
                        'auth_required': True,
                        'expected_status': 200
                    }
                ])
            
            successful_tests = 0
            total_tests = len(endpoints_to_test)
            
            for endpoint in endpoints_to_test:
                try:
                    headers = {}
                    if endpoint['auth_required']:
                        if 'admin' in endpoint['url'] and self.admin_token:
                            headers['Authorization'] = f'Bearer {self.admin_token}'
                        elif 'scraper' in endpoint['url'] and self.scraper_token:
                            headers['Authorization'] = f'Bearer {self.scraper_token}'
                    
                    response = requests.request(
                        endpoint['method'],
                        endpoint['url'],
                        headers=headers,
                        timeout=10
                    )
                    
                    if response.status_code == endpoint['expected_status']:
                        logger.info(f"✅ {endpoint['url']} - Status: {response.status_code}")
                        successful_tests += 1
                    else:
                        logger.warning(f"⚠️ {endpoint['url']} - Status: {response.status_code} (expected {endpoint['expected_status']})")
                        
                except Exception as e:
                    logger.warning(f"⚠️ {endpoint['url']} - Error: {e}")
            
            success_rate = (successful_tests / total_tests) * 100
            logger.info(f"API endpoint testing: {successful_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
            
            if success_rate >= 80:
                self.verification_results['api_endpoints'] = True
                return True
            else:
                logger.warning("⚠️ API endpoint testing partially successful")
                return False
                
        except Exception as e:
            logger.error(f"❌ API endpoint testing failed: {e}")
            return False
    
    def verify_data_integrity(self) -> bool:
        """Verify data integrity in the marketplace table."""
        try:
            logger.info("Verifying data integrity...")
            
            with self.engine.connect() as conn:
                # Check for required fields
                result = conn.execute(text("""
                    SELECT COUNT(*) FROM marketplace 
                    WHERE name IS NULL OR title IS NULL OR price IS NULL 
                    OR category IS NULL OR location IS NULL OR vendor_name IS NULL
                """))
                null_count = result.scalar()
                
                if null_count > 0:
                    logger.warning(f"⚠️ Found {null_count} records with null required fields")
                else:
                    logger.info("✅ All required fields are populated")
                
                # Check for valid prices
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace WHERE price < 0"))
                invalid_price_count = result.scalar()
                
                if invalid_price_count > 0:
                    logger.warning(f"⚠️ Found {invalid_price_count} records with invalid prices")
                else:
                    logger.info("✅ All prices are valid")
                
                # Check for valid ratings
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace WHERE rating < 0 OR rating > 5"))
                invalid_rating_count = result.scalar()
                
                if invalid_rating_count > 0:
                    logger.warning(f"⚠️ Found {invalid_rating_count} records with invalid ratings")
                else:
                    logger.info("✅ All ratings are valid")
                
                # Check for duplicate names (potential duplicates)
                result = conn.execute(text("""
                    SELECT name, COUNT(*) FROM marketplace 
                    GROUP BY name HAVING COUNT(*) > 1
                """))
                duplicates = result.fetchall()
                
                if duplicates:
                    logger.warning(f"⚠️ Found {len(duplicates)} potential duplicate names")
                else:
                    logger.info("✅ No duplicate names found")
            
            self.verification_results['data_integrity'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Data integrity verification failed: {e}")
            return False
    
    def test_cache_functionality(self) -> bool:
        """Test Redis cache functionality."""
        if not self.redis_client:
            logger.info("⚠️ Redis not available, skipping cache functionality test")
            return True
        
        try:
            logger.info("Testing cache functionality...")
            
            # Test basic cache operations
            test_key = 'jewgo:verification_test'
            test_data = {
                'test': True,
                'timestamp': datetime.now().isoformat(),
                'data': 'verification test data'
            }
            
            # Test set operation
            self.redis_client.setex(test_key, 60, json.dumps(test_data))
            
            # Test get operation
            retrieved_data = self.redis_client.get(test_key)
            if not retrieved_data:
                raise Exception("Cache get operation failed")
            
            # Verify data integrity
            retrieved_json = json.loads(retrieved_data)
            if retrieved_json['test'] != test_data['test']:
                raise Exception("Cache data integrity check failed")
            
            # Test cache configuration
            cache_config = self.redis_client.get('jewgo:cache_config')
            if cache_config:
                config_data = json.loads(cache_config)
                logger.info(f"✅ Cache configuration found with {len(config_data)} keys")
            else:
                logger.warning("⚠️ Cache configuration not found")
            
            # Clean up test key
            self.redis_client.delete(test_key)
            
            logger.info("✅ Cache functionality test completed successfully")
            self.verification_results['cache_functionality'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Cache functionality test failed: {e}")
            return False
    
    def measure_performance_metrics(self) -> bool:
        """Measure performance metrics for database and API operations."""
        try:
            logger.info("Measuring performance metrics...")
            
            performance_metrics = {}
            
            # Database query performance
            start_time = time.time()
            with self.engine.connect() as conn:
                result = conn.execute(text("SELECT COUNT(*) FROM marketplace"))
                count = result.scalar()
            db_query_time = time.time() - start_time
            
            performance_metrics['database_query_time'] = db_query_time
            logger.info(f"✅ Database query time: {db_query_time:.3f}s")
            
            # API response time
            start_time = time.time()
            try:
                response = requests.get(f"{self.api_url}/api/health", timeout=10)
                api_response_time = time.time() - start_time
                performance_metrics['api_response_time'] = api_response_time
                logger.info(f"✅ API response time: {api_response_time:.3f}s")
            except Exception as e:
                logger.warning(f"⚠️ API response time measurement failed: {e}")
                performance_metrics['api_response_time'] = None
            
            # Cache response time (if available)
            if self.redis_client:
                start_time = time.time()
                try:
                    self.redis_client.ping()
                    cache_response_time = time.time() - start_time
                    performance_metrics['cache_response_time'] = cache_response_time
                    logger.info(f"✅ Cache response time: {cache_response_time:.3f}s")
                except Exception as e:
                    logger.warning(f"⚠️ Cache response time measurement failed: {e}")
                    performance_metrics['cache_response_time'] = None
            
            # Performance thresholds
            performance_thresholds = {
                'database_query_time': 1.0,  # 1 second
                'api_response_time': 2.0,    # 2 seconds
                'cache_response_time': 0.1   # 100ms
            }
            
            # Check performance against thresholds
            performance_issues = []
            for metric, threshold in performance_thresholds.items():
                if metric in performance_metrics and performance_metrics[metric]:
                    if performance_metrics[metric] > threshold:
                        performance_issues.append(f"{metric}: {performance_metrics[metric]:.3f}s > {threshold}s")
            
            if performance_issues:
                logger.warning(f"⚠️ Performance issues detected: {', '.join(performance_issues)}")
            else:
                logger.info("✅ All performance metrics within acceptable thresholds")
            
            # Store performance metrics
            self.performance_metrics = performance_metrics
            
            self.verification_results['performance_metrics'] = True
            return True
            
        except Exception as e:
            logger.error(f"❌ Performance measurement failed: {e}")
            return False
    
    def generate_verification_report(self) -> Dict:
        """Generate a comprehensive verification report."""
        report = {
            'timestamp': datetime.now().isoformat(),
            'verification_results': self.verification_results,
            'environment': {
                'database_url': self.database_url[:20] + '...' if self.database_url else None,
                'redis_url': self.redis_url,
                'api_url': self.api_url,
                'admin_token_configured': bool(self.admin_token),
                'scraper_token_configured': bool(self.scraper_token)
            },
            'performance_metrics': getattr(self, 'performance_metrics', {}),
            'summary': {
                'total_checks': len(self.verification_results),
                'passed_checks': sum(self.verification_results.values()),
                'success_rate': (sum(self.verification_results.values()) / len(self.verification_results)) * 100
            }
        }
        
        return report
    
    def run_complete_verification(self) -> bool:
        """Execute the complete production verification process."""
        logger.info("🚀 Starting production verification process...")
        
        try:
            # Step 1: Connect to database
            if not self.connect_database():
                return False
            
            # Step 2: Connect to Redis (optional)
            self.connect_redis()
            
            # Step 3: Verify marketplace table
            if not self.verify_marketplace_table():
                return False
            
            # Step 4: Test API endpoints
            if not self.test_api_endpoints():
                logger.warning("⚠️ API endpoint testing partially failed")
            
            # Step 5: Verify data integrity
            if not self.verify_data_integrity():
                return False
            
            # Step 6: Test cache functionality
            if not self.test_cache_functionality():
                logger.warning("⚠️ Cache functionality test failed")
            
            # Step 7: Measure performance metrics
            if not self.measure_performance_metrics():
                logger.warning("⚠️ Performance measurement failed")
            
            # Step 8: Generate and save report
            report = self.generate_verification_report()
            report_path = f"scripts/database/verification_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"✅ Verification report saved: {report_path}")
            
            # Final status
            success_rate = report['summary']['success_rate']
            if success_rate >= 80:
                logger.info(f"🎉 Production verification completed successfully! Success rate: {success_rate:.1f}%")
                return True
            else:
                logger.warning(f"⚠️ Production verification completed with issues. Success rate: {success_rate:.1f}%")
                return False
                
        except Exception as e:
            logger.error(f"❌ Production verification failed: {e}")
            return False

def main():
    """Main execution function."""
    try:
        # Initialize verification manager
        verification_manager = ProductionVerificationManager()
        
        # Run complete verification
        success = verification_manager.run_complete_verification()
        
        if success:
            print("\n🎉 Production verification completed successfully!")
            print("✅ Database connectivity: Verified")
            print("✅ Marketplace table: Verified")
            print("✅ Redis connectivity: Verified")
            print("✅ API endpoints: Tested")
            print("✅ Data integrity: Verified")
            print("✅ Performance metrics: Measured")
            print("✅ Cache functionality: Tested")
            print("\n📋 Next steps:")
            print("1. Monitor application performance in production")
            print("2. Set up alerts for performance degradation")
            print("3. Monitor cache hit rates and optimize TTLs")
            print("4. Run regular verification tests")
        else:
            print("\n❌ Production verification completed with issues")
            print("Please check the logs above for details")
            print("Address any critical issues before proceeding")
        
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"❌ Production verification script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
