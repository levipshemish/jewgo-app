#!/usr/bin/env python3
"""Complete Marketplace Migration and Verification Script.
===========================================
This script runs the complete marketplace migration process:
1. Database Migration: Creates marketplace table and populates sample data
2. Redis Configuration: Sets up caching for optimal performance
3. Production Verification: Tests all implementations in production
"""

import os
import sys
import subprocess
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

def run_script(script_name, description):
    """Run a Python script and return success status."""
    try:
        print(f"\n{'='*60}")
        print(f"RUNNING: {description}")
        print(f"{'='*60}")
        
        script_path = project_root / "scripts" / "database" / script_name
        
        if not script_path.exists():
            print(f"❌ Script not found: {script_path}")
            return False
        
        # Run the script
        result = subprocess.run(
            [sys.executable, str(script_path)],
            capture_output=True,
            text=True,
            cwd=str(project_root / "backend")
        )
        
        # Print output
        if result.stdout:
            print(result.stdout)
        
        if result.stderr:
            print(f"Warnings/Errors: {result.stderr}")
        
        if result.returncode == 0:
            print(f"✅ {description} completed successfully")
            return True
        else:
            print(f"❌ {description} failed with return code {result.returncode}")
            return False
            
    except Exception as e:
        print(f"❌ Error running {description}: {e}")
        return False

def main():
    """Main execution function."""
    print("🚀 Starting Complete Marketplace Migration and Verification")
    print(f"Timestamp: {datetime.now().isoformat()}")
    
    start_time = time.time()
    
    # Track results
    results = {
        'database_migration': False,
        'redis_configuration': False,
        'production_verification': False
    }
    
    try:
        # Step 1: Database Migration
        results['database_migration'] = run_script(
            'simple_marketplace_migration.py',
            'Database Migration'
        )
        
        # Step 2: Redis Configuration
        results['redis_configuration'] = run_script(
            'simple_redis_config.py',
            'Redis Configuration'
        )
        
        # Step 3: Production Verification
        results['production_verification'] = run_script(
            'simple_production_verification.py',
            'Production Verification'
        )
        
        # Calculate final results
        end_time = time.time()
        duration = end_time - start_time
        
        total_steps = len(results)
        successful_steps = sum(results.values())
        success_rate = (successful_steps / total_steps) * 100
        
        # Final summary
        print(f"\n{'='*60}")
        print("FINAL SUMMARY")
        print(f"{'='*60}")
        print(f"⏱️ Total execution time: {duration:.2f} seconds")
        print(f"📊 Success rate: {success_rate:.1f}% ({successful_steps}/{total_steps} steps)")
        print()
        print("📋 Step Results:")
        print(f"  ✅ Database Migration: {'PASS' if results['database_migration'] else 'FAIL'}")
        print(f"  ✅ Redis Configuration: {'PASS' if results['redis_configuration'] else 'FAIL'}")
        print(f"  ✅ Production Verification: {'PASS' if results['production_verification'] else 'FAIL'}")
        print()
        
        if success_rate >= 80:
            print("🎉 COMPLETE SUCCESS!")
            print("✅ All critical components are operational")
            print("✅ Marketplace implementation is ready for production")
            print()
            print("📋 What was accomplished:")
            print("  • Marketplace table created with comprehensive schema")
            print("  • Sample data populated with kosher products")
            print("  • Redis caching configured for optimal performance")
            print("  • Database connectivity verified")
            print("  • API endpoints tested and functional")
            print("  • Performance metrics measured")
            print()
            print("🚀 Next Steps:")
            print("  1. Test marketplace functionality in the frontend")
            print("  2. Monitor application logs for any issues")
            print("  3. Set up performance monitoring alerts")
            print("  4. Configure additional marketplace features")
            print("  5. Run regular verification tests")
            return 0
        else:
            print("⚠️ PARTIAL SUCCESS")
            print("Some components completed successfully, but there are issues to address")
            print()
            print("📋 Issues to address:")
            if not results['database_migration']:
                print("  • Database migration failed - check database connectivity")
            if not results['redis_configuration']:
                print("  • Redis configuration failed - check Redis connectivity")
            if not results['production_verification']:
                print("  • Production verification failed - check API endpoints and performance")
            print()
            print("🔧 Recommended actions:")
            print("  1. Review the logs above for specific error messages")
            print("  2. Check environment variables and connectivity")
            print("  3. Verify all dependencies are installed")
            print("  4. Run individual scripts to isolate issues")
            return 1
        
    except Exception as e:
        print(f"❌ Complete migration failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
