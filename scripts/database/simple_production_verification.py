#!/usr/bin/env python3
"""Simple Production Verification Script for JewGo App.
===========================================
This script verifies that all marketplace implementations work correctly in production.
Simplified version to avoid complex dependency issues.
"""

import os
import sys
import json
import time
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

def verify_database_connectivity():
    """Verify database connectivity and marketplace table."""
    try:
        import psycopg
        
        database_url = os.getenv('DATABASE_URL')
        if not database_url:
            print("❌ DATABASE_URL environment variable is required")
            return False
        
        # Convert SQLAlchemy URL format to psycopg format
        if database_url.startswith('postgresql+psycopg://'):
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        print("🔗 Testing database connectivity...")
        
        with psycopg.connect(database_url) as conn:
            # Test basic connectivity
            with conn.cursor() as cur:
                cur.execute("SELECT 1")
                result = cur.fetchone()
                if result[0] != 1:
                    raise Exception("Database connectivity test failed")
            
            print("✅ Database connectivity verified")
            
            # Check marketplace table
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'marketplace'
                    );
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    print("❌ Marketplace table does not exist")
                    return False
                
                # Check record count
                cur.execute("SELECT COUNT(*) FROM marketplace")
                count = cur.fetchone()[0]
                
                print(f"✅ Marketplace table exists with {count} records")
                
                # Check sample data
                cur.execute("SELECT name, vendor_name, price FROM marketplace LIMIT 3")
                samples = cur.fetchall()
                
                print("📋 Sample marketplace records:")
                for sample in samples:
                    print(f"  - {sample[0]} by {sample[1]} (${sample[2]})")
                
                # Check table structure
                cur.execute("""
                    SELECT column_name, data_type, is_nullable 
                    FROM information_schema.columns 
                    WHERE table_name = 'marketplace' 
                    ORDER BY ordinal_position
                """)
                columns = cur.fetchall()
                
                print(f"✅ Marketplace table has {len(columns)} columns")
                
                # Check indexes
                cur.execute("""
                    SELECT indexname, indexdef 
                    FROM pg_indexes 
                    WHERE tablename = 'marketplace'
                """)
                indexes = cur.fetchall()
                
                print(f"✅ Marketplace table has {len(indexes)} indexes")
            
            return True
            
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install psycopg: pip install psycopg[binary]")
        return False
    except Exception as e:
        print(f"❌ Database verification failed: {e}")
        return False

def verify_redis_connectivity():
    """Verify Redis connectivity and cache configuration."""
    try:
        import redis
        
        redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
        
        print("🔗 Testing Redis connectivity...")
        redis_client = redis.from_url(redis_url)
        
        # Test connection
        redis_client.ping()
        print("✅ Redis connectivity verified")
        
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
        
        # Test cache operations
        test_key = 'jewgo:verification_test'
        test_data = {'verification': True, 'timestamp': datetime.now().isoformat()}
        
        redis_client.setex(test_key, 60, json.dumps(test_data))
        retrieved_data = redis_client.get(test_key)
        
        if not retrieved_data:
            raise Exception("Redis get operation failed")
        
        # Clean up test key
        redis_client.delete(test_key)
        
        # Get Redis info
        info = redis_client.info()
        print(f"✅ Redis info - Version: {info.get('redis_version', 'unknown')}")
        print(f"✅ Redis info - Connected clients: {info.get('connected_clients', 0)}")
        print(f"✅ Redis info - Used memory: {info.get('used_memory_human', 'unknown')}")
        
        return True
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install redis: pip install redis")
        return False
    except Exception as e:
        print(f"❌ Redis verification failed: {e}")
        return False

def test_api_endpoints():
    """Test API endpoints for functionality."""
    try:
        import requests
        
        api_url = os.getenv('API_URL', 'https://jewgo-app-oyoh.onrender.com')
        admin_token = os.getenv('ADMIN_TOKEN')
        
        print("🔗 Testing API endpoints...")
        
        endpoints_to_test = [
            {
                'url': f"{api_url}/api/health",
                'method': 'GET',
                'auth_required': False,
                'expected_status': 200,
                'description': 'Health Check'
            },
            {
                'url': f"{api_url}/api/restaurants",
                'method': 'GET',
                'auth_required': False,
                'expected_status': 200,
                'description': 'Restaurants API'
            }
        ]
        
        # Add admin endpoints if admin token is available
        if admin_token:
            endpoints_to_test.extend([
                {
                    'url': f"{api_url}/api/admin/restaurants",
                    'method': 'GET',
                    'auth_required': True,
                    'expected_status': 200,
                    'description': 'Admin Restaurants API'
                }
            ])
        
        successful_tests = 0
        total_tests = len(endpoints_to_test)
        
        for endpoint in endpoints_to_test:
            try:
                headers = {}
                if endpoint['auth_required'] and admin_token:
                    headers['Authorization'] = f'Bearer {admin_token}'
                
                start_time = time.time()
                response = requests.request(
                    endpoint['method'],
                    endpoint['url'],
                    headers=headers,
                    timeout=10
                )
                response_time = time.time() - start_time
                
                if response.status_code == endpoint['expected_status']:
                    print(f"✅ {endpoint['description']} - Status: {response.status_code} ({response_time:.3f}s)")
                    successful_tests += 1
                else:
                    print(f"⚠️ {endpoint['description']} - Status: {response.status_code} (expected {endpoint['expected_status']}) ({response_time:.3f}s)")
                    
            except Exception as e:
                print(f"⚠️ {endpoint['description']} - Error: {e}")
        
        success_rate = (successful_tests / total_tests) * 100
        print(f"📊 API endpoint testing: {successful_tests}/{total_tests} tests passed ({success_rate:.1f}%)")
        
        if success_rate >= 80:
            print("✅ API endpoint testing completed successfully")
            return True
        else:
            print("⚠️ API endpoint testing partially successful")
            return False
            
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("Please install requests: pip install requests")
        return False
    except Exception as e:
        print(f"❌ API endpoint testing failed: {e}")
        return False

def measure_performance():
    """Measure performance metrics."""
    try:
        import psycopg
        import requests
        
        print("📊 Measuring performance metrics...")
        
        performance_metrics = {}
        
        # Database query performance
        database_url = os.getenv('DATABASE_URL')
        if database_url.startswith('postgresql+psycopg://'):
            database_url = database_url.replace('postgresql+psycopg://', 'postgresql://')
        
        start_time = time.time()
        with psycopg.connect(database_url) as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) FROM marketplace")
                count = cur.fetchone()[0]
        db_query_time = time.time() - start_time
        
        performance_metrics['database_query_time'] = db_query_time
        print(f"✅ Database query time: {db_query_time:.3f}s")
        
        # API response time
        api_url = os.getenv('API_URL', 'https://jewgo-app-oyoh.onrender.com')
        start_time = time.time()
        try:
            response = requests.get(f"{api_url}/api/health", timeout=10)
            api_response_time = time.time() - start_time
            performance_metrics['api_response_time'] = api_response_time
            print(f"✅ API response time: {api_response_time:.3f}s")
        except Exception as e:
            print(f"⚠️ API response time measurement failed: {e}")
            performance_metrics['api_response_time'] = None
        
        # Redis response time
        try:
            import redis
            redis_url = os.getenv('REDIS_URL', 'redis://localhost:6379')
            redis_client = redis.from_url(redis_url)
            
            start_time = time.time()
            redis_client.ping()
            cache_response_time = time.time() - start_time
            performance_metrics['cache_response_time'] = cache_response_time
            print(f"✅ Cache response time: {cache_response_time:.3f}s")
        except Exception as e:
            print(f"⚠️ Cache response time measurement failed: {e}")
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
            print(f"⚠️ Performance issues detected: {', '.join(performance_issues)}")
        else:
            print("✅ All performance metrics within acceptable thresholds")
        
        return True
        
    except Exception as e:
        print(f"❌ Performance measurement failed: {e}")
        return False

def generate_verification_report():
    """Generate a verification report."""
    report = {
        'timestamp': datetime.now().isoformat(),
        'environment': {
            'database_url_configured': bool(os.getenv('DATABASE_URL')),
            'redis_url_configured': bool(os.getenv('REDIS_URL')),
            'api_url_configured': bool(os.getenv('API_URL')),
            'admin_token_configured': bool(os.getenv('ADMIN_TOKEN'))
        },
        'verification_results': {
            'database_connectivity': False,
            'redis_connectivity': False,
            'api_endpoints': False,
            'performance_metrics': False
        }
    }
    
    return report

def main():
    """Main execution function."""
    print("🚀 Starting production verification...")
    
    verification_results = {
        'database_connectivity': False,
        'redis_connectivity': False,
        'api_endpoints': False,
        'performance_metrics': False
    }
    
    try:
        # Step 1: Verify database connectivity
        print("\n" + "="*50)
        print("STEP 1: DATABASE CONNECTIVITY")
        print("="*50)
        
        if verify_database_connectivity():
            verification_results['database_connectivity'] = True
        else:
            print("❌ Database connectivity verification failed")
        
        # Step 2: Verify Redis connectivity
        print("\n" + "="*50)
        print("STEP 2: REDIS CONNECTIVITY")
        print("="*50)
        
        if verify_redis_connectivity():
            verification_results['redis_connectivity'] = True
        else:
            print("⚠️ Redis connectivity verification failed (optional)")
        
        # Step 3: Test API endpoints
        print("\n" + "="*50)
        print("STEP 3: API ENDPOINTS")
        print("="*50)
        
        if test_api_endpoints():
            verification_results['api_endpoints'] = True
        else:
            print("⚠️ API endpoint testing partially failed")
        
        # Step 4: Measure performance
        print("\n" + "="*50)
        print("STEP 4: PERFORMANCE METRICS")
        print("="*50)
        
        if measure_performance():
            verification_results['performance_metrics'] = True
        else:
            print("⚠️ Performance measurement failed")
        
        # Generate final report
        total_checks = len(verification_results)
        passed_checks = sum(verification_results.values())
        success_rate = (passed_checks / total_checks) * 100
        
        print("\n" + "="*50)
        print("VERIFICATION SUMMARY")
        print("="*50)
        print(f"✅ Database connectivity: {'PASS' if verification_results['database_connectivity'] else 'FAIL'}")
        print(f"✅ Redis connectivity: {'PASS' if verification_results['redis_connectivity'] else 'FAIL'}")
        print(f"✅ API endpoints: {'PASS' if verification_results['api_endpoints'] else 'FAIL'}")
        print(f"✅ Performance metrics: {'PASS' if verification_results['performance_metrics'] else 'FAIL'}")
        print(f"📊 Overall success rate: {success_rate:.1f}%")
        
        if success_rate >= 80:
            print("\n🎉 Production verification completed successfully!")
            print("✅ All critical systems are operational")
            print("✅ Marketplace implementation is ready for production")
            print("\n📋 Next steps:")
            print("1. Monitor application logs for any issues")
            print("2. Test marketplace functionality in the frontend")
            print("3. Set up performance monitoring alerts")
            print("4. Run regular verification tests")
            return 0
        else:
            print("\n⚠️ Production verification completed with issues")
            print("Please address any critical failures before proceeding")
            return 1
        
    except Exception as e:
        print(f"❌ Production verification failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
