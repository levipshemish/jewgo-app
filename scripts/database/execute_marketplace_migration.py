#!/usr/bin/env python3
"""Master Execution Script: Complete Marketplace Migration and Verification.
===========================================
This script orchestrates the complete marketplace migration process:
1. Database Migration: Creates marketplace table and populates sample data
2. Redis Configuration: Sets up caching for optimal performance
3. Production Verification: Tests all implementations in production
4. Rollback Support: Provides rollback procedures if needed
"""

import os
import sys
import json
import subprocess
import time
from datetime import datetime
from typing import Dict, List, Optional

# Add the parent directory to the path so we can import our modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.utils.logging_config import get_logger

logger = get_logger(__name__)

class MarketplaceMigrationOrchestrator:
    """Orchestrates the complete marketplace migration process."""
    
    def __init__(self):
        """Initialize the orchestrator."""
        self.scripts_dir = os.path.dirname(os.path.abspath(__file__))
        self.execution_results = {
            'database_migration': False,
            'redis_configuration': False,
            'production_verification': False
        }
        self.start_time = datetime.now()
    
    def run_script(self, script_name: str, description: str) -> bool:
        """Run a Python script and capture its output."""
        try:
            logger.info(f"🚀 Starting {description}...")
            
            script_path = os.path.join(self.scripts_dir, script_name)
            
            # Check if script exists
            if not os.path.exists(script_path):
                logger.error(f"❌ Script not found: {script_path}")
                return False
            
            # Run the script
            result = subprocess.run(
                [sys.executable, script_path],
                capture_output=True,
                text=True,
                cwd=os.path.dirname(os.path.dirname(os.path.dirname(script_path)))
            )
            
            # Log output
            if result.stdout:
                logger.info(f"📋 {description} output:\n{result.stdout}")
            
            if result.stderr:
                logger.warning(f"⚠️ {description} warnings:\n{result.stderr}")
            
            # Check return code
            if result.returncode == 0:
                logger.info(f"✅ {description} completed successfully")
                return True
            else:
                logger.error(f"❌ {description} failed with return code {result.returncode}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Error running {description}: {e}")
            return False
    
    def run_database_migration(self) -> bool:
        """Run the database migration script."""
        success = self.run_script(
            'run_marketplace_migration.py',
            'Database Migration'
        )
        self.execution_results['database_migration'] = success
        return success
    
    def run_redis_configuration(self) -> bool:
        """Run the Redis configuration script."""
        success = self.run_script(
            'configure_redis_caching.py',
            'Redis Configuration'
        )
        self.execution_results['redis_configuration'] = success
        return success
    
    def run_production_verification(self) -> bool:
        """Run the production verification script."""
        success = self.run_script(
            'verify_production_implementation.py',
            'Production Verification'
        )
        self.execution_results['production_verification'] = success
        return success
    
    def check_prerequisites(self) -> bool:
        """Check if all prerequisites are met."""
        try:
            logger.info("🔍 Checking prerequisites...")
            
            # Check environment variables
            required_env_vars = ['DATABASE_URL']
            optional_env_vars = ['REDIS_URL', 'API_URL', 'ADMIN_TOKEN', 'SCRAPER_TOKEN']
            
            missing_required = []
            for var in required_env_vars:
                if not os.getenv(var):
                    missing_required.append(var)
            
            if missing_required:
                logger.error(f"❌ Missing required environment variables: {missing_required}")
                return False
            
            # Check optional environment variables
            missing_optional = []
            for var in optional_env_vars:
                if not os.getenv(var):
                    missing_optional.append(var)
            
            if missing_optional:
                logger.warning(f"⚠️ Missing optional environment variables: {missing_optional}")
            
            # Check if scripts exist
            required_scripts = [
                'run_marketplace_migration.py',
                'configure_redis_caching.py',
                'verify_production_implementation.py'
            ]
            
            missing_scripts = []
            for script in required_scripts:
                script_path = os.path.join(self.scripts_dir, script)
                if not os.path.exists(script_path):
                    missing_scripts.append(script)
            
            if missing_scripts:
                logger.error(f"❌ Missing required scripts: {missing_scripts}")
                return False
            
            logger.info("✅ All prerequisites met")
            return True
            
        except Exception as e:
            logger.error(f"❌ Prerequisites check failed: {e}")
            return False
    
    def create_rollback_plan(self) -> str:
        """Create a rollback plan for the migration."""
        rollback_plan = f"""# Rollback Plan for Marketplace Migration
Generated on: {datetime.now().isoformat()}

## Rollback Steps

### 1. Database Rollback
If the marketplace table needs to be removed:
```bash
cd scripts/database
python rollback_marketplace_migration.py
```

### 2. Redis Cache Clear
If Redis cache needs to be cleared:
```bash
redis-cli FLUSHDB
```

### 3. Environment Variables
Revert any environment variable changes made for the migration.

### 4. Application Restart
Restart the application to clear any cached data:
```bash
# For Render deployment
# The application will automatically restart after deployment
```

## Rollback Triggers
- Database migration fails
- Redis configuration fails
- Production verification shows critical issues
- Performance degradation beyond acceptable thresholds

## Contact Information
For emergency rollback assistance, contact the development team.
"""
        
        rollback_path = os.path.join(self.scripts_dir, 'rollback_plan.md')
        with open(rollback_path, 'w') as f:
            f.write(rollback_plan)
        
        logger.info(f"✅ Rollback plan created: {rollback_path}")
        return rollback_path
    
    def generate_execution_report(self) -> Dict:
        """Generate a comprehensive execution report."""
        end_time = datetime.now()
        duration = end_time - self.start_time
        
        report = {
            'timestamp': end_time.isoformat(),
            'duration_seconds': duration.total_seconds(),
            'execution_results': self.execution_results,
            'environment': {
                'database_url_configured': bool(os.getenv('DATABASE_URL')),
                'redis_url_configured': bool(os.getenv('REDIS_URL')),
                'api_url_configured': bool(os.getenv('API_URL')),
                'admin_token_configured': bool(os.getenv('ADMIN_TOKEN')),
                'scraper_token_configured': bool(os.getenv('SCRAPER_TOKEN'))
            },
            'summary': {
                'total_steps': len(self.execution_results),
                'completed_steps': sum(self.execution_results.values()),
                'success_rate': (sum(self.execution_results.values()) / len(self.execution_results)) * 100
            }
        }
        
        return report
    
    def execute_complete_migration(self) -> bool:
        """Execute the complete migration process."""
        logger.info("🎯 Starting complete marketplace migration orchestration...")
        
        try:
            # Step 1: Check prerequisites
            if not self.check_prerequisites():
                return False
            
            # Step 2: Create rollback plan
            rollback_plan_path = self.create_rollback_plan()
            
            # Step 3: Run database migration
            logger.info("\n" + "="*60)
            logger.info("STEP 1: DATABASE MIGRATION")
            logger.info("="*60)
            
            if not self.run_database_migration():
                logger.error("❌ Database migration failed. Check logs and consider rollback.")
                return False
            
            # Step 4: Run Redis configuration
            logger.info("\n" + "="*60)
            logger.info("STEP 2: REDIS CONFIGURATION")
            logger.info("="*60)
            
            if not self.run_redis_configuration():
                logger.warning("⚠️ Redis configuration failed, but continuing with verification...")
            
            # Step 5: Run production verification
            logger.info("\n" + "="*60)
            logger.info("STEP 3: PRODUCTION VERIFICATION")
            logger.info("="*60)
            
            if not self.run_production_verification():
                logger.warning("⚠️ Production verification partially failed")
            
            # Step 6: Generate and save report
            report = self.generate_execution_report()
            report_path = os.path.join(
                self.scripts_dir, 
                f"execution_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            )
            
            with open(report_path, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"✅ Execution report saved: {report_path}")
            
            # Final status
            success_rate = report['summary']['success_rate']
            if success_rate >= 80:
                logger.info(f"🎉 Migration orchestration completed successfully! Success rate: {success_rate:.1f}%")
                logger.info(f"📋 Rollback plan available: {rollback_plan_path}")
                return True
            else:
                logger.warning(f"⚠️ Migration orchestration completed with issues. Success rate: {success_rate:.1f}%")
                logger.info(f"📋 Rollback plan available: {rollback_plan_path}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Migration orchestration failed: {e}")
            return False

def main():
    """Main execution function."""
    try:
        # Initialize orchestrator
        orchestrator = MarketplaceMigrationOrchestrator()
        
        # Execute complete migration
        success = orchestrator.execute_complete_migration()
        
        if success:
            print("\n🎉 Complete marketplace migration orchestration successful!")
            print("✅ Database migration: Complete")
            print("✅ Redis configuration: Complete")
            print("✅ Production verification: Complete")
            print("\n📋 Migration Summary:")
            print("- Marketplace table created and populated")
            print("- Redis caching configured for optimal performance")
            print("- All production endpoints verified")
            print("- Performance metrics within acceptable thresholds")
            print("\n🚀 Next Steps:")
            print("1. Monitor application logs for any issues")
            print("2. Test marketplace functionality in the frontend")
            print("3. Monitor cache performance and adjust TTLs if needed")
            print("4. Set up performance monitoring alerts")
            print("5. Run regular verification tests")
        else:
            print("\n❌ Migration orchestration completed with issues")
            print("Please check the logs above for details")
            print("Consider using the rollback plan if critical issues are found")
        
        return 0 if success else 1
        
    except Exception as e:
        logger.error(f"❌ Migration orchestration script failed: {e}")
        return 1

if __name__ == "__main__":
    exit(main())
