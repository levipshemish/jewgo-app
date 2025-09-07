#!/usr/bin/env python3
"""
Environment validation script for JWT authentication system.

This script checks that all required environment variables are properly
configured for the PostgreSQL-based JWT authentication system.
"""

import os
import sys
from typing import Dict, List, Optional

def check_required_vars() -> Dict[str, List[str]]:
    """Check required environment variables and return status."""
    
    # Critical variables that must be set
    required_vars = {
        'JWT Configuration': [
            'JWT_SECRET_KEY',
            'ACCESS_TTL_SECONDS', 
            'REFRESH_TTL_SECONDS',
            'REFRESH_PEPPER'
        ],
        'Database': [
            'DATABASE_URL'
        ],
        'Security': [
            'ENVIRONMENT',
            'CSRF_TTL_SECONDS'
        ]
    }
    
    # Optional but recommended for production
    recommended_vars = {
        'OAuth (Production)': [
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET'
        ],
        'reCAPTCHA (Production)': [
            'RECAPTCHA_SECRET_KEY'
        ],
        'Monitoring': [
            'METRICS_ENABLED'
        ],
        'URLs': [
            'PUBLIC_BACKEND_URL',
            'BACKEND_URL'
        ]
    }
    
    results = {
        'missing_required': [],
        'missing_recommended': [],
        'warnings': [],
        'info': []
    }
    
    # Check required variables
    for category, vars_list in required_vars.items():
        for var in vars_list:
            value = os.getenv(var)
            if not value:
                results['missing_required'].append(f"{category}: {var}")
            elif var == 'JWT_SECRET_KEY' and len(value) < 32:
                results['warnings'].append(f"JWT_SECRET_KEY is too short (< 32 chars)")
            elif var == 'REFRESH_PEPPER' and len(value) < 16:
                results['warnings'].append(f"REFRESH_PEPPER is too short (< 16 chars)")
    
    # Check recommended variables
    for category, vars_list in recommended_vars.items():
        for var in vars_list:
            value = os.getenv(var)
            if not value:
                results['missing_recommended'].append(f"{category}: {var}")
    
    # Environment-specific checks
    env = os.getenv('ENVIRONMENT', 'development').lower()
    
    if env == 'production':
        prod_required = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'RECAPTCHA_SECRET_KEY']
        for var in prod_required:
            if not os.getenv(var):
                results['missing_required'].append(f"Production: {var}")
        
        if os.getenv('CSRF_ENABLED', 'false').lower() != 'true':
            results['warnings'].append("CSRF_ENABLED should be 'true' in production")
        
        if os.getenv('METRICS_ENABLED', 'false').lower() != 'true':
            results['warnings'].append("Consider enabling METRICS_ENABLED in production")
    
    # Check TTL configurations
    access_ttl = os.getenv('ACCESS_TTL_SECONDS', '900')
    refresh_ttl = os.getenv('REFRESH_TTL_SECONDS', '3888000')
    
    try:
        access_seconds = int(access_ttl)
        refresh_seconds = int(refresh_ttl)
        
        if access_seconds > 3600:  # 1 hour
            results['warnings'].append("ACCESS_TTL_SECONDS > 1 hour may reduce security")
        
        if refresh_seconds < 86400:  # 1 day
            results['warnings'].append("REFRESH_TTL_SECONDS < 1 day may cause frequent re-auth")
            
    except ValueError:
        results['warnings'].append("TTL values must be valid integers")
    
    # Database URL validation
    db_url = os.getenv('DATABASE_URL')
    if db_url and not db_url.startswith('postgresql://'):
        results['warnings'].append("DATABASE_URL should use PostgreSQL")
    
    return results

def print_results(results: Dict[str, List[str]]) -> bool:
    """Print validation results. Returns True if all critical checks pass."""
    
    all_good = True
    
    print("🔐 JWT Authentication Environment Validation")
    print("=" * 50)
    
    if results['missing_required']:
        print("\n❌ MISSING REQUIRED VARIABLES:")
        for var in results['missing_required']:
            print(f"   • {var}")
        all_good = False
    else:
        print("\n✅ All required variables are set")
    
    if results['missing_recommended']:
        print("\n⚠️  MISSING RECOMMENDED VARIABLES:")
        for var in results['missing_recommended']:
            print(f"   • {var}")
    
    if results['warnings']:
        print("\n⚠️  WARNINGS:")
        for warning in results['warnings']:
            print(f"   • {warning}")
    
    if results['info']:
        print("\nℹ️  INFO:")
        for info in results['info']:
            print(f"   • {info}")
    
    # Environment summary
    env = os.getenv('ENVIRONMENT', 'development')
    print(f"\n📊 Current Environment: {env}")
    print(f"🔑 JWT Secret Length: {len(os.getenv('JWT_SECRET_KEY', ''))}")
    print(f"🍪 Access TTL: {os.getenv('ACCESS_TTL_SECONDS', '900')}s ({int(os.getenv('ACCESS_TTL_SECONDS', '900'))//60}min)")
    print(f"🔄 Refresh TTL: {os.getenv('REFRESH_TTL_SECONDS', '3888000')}s ({int(os.getenv('REFRESH_TTL_SECONDS', '3888000'))//86400}d)")
    print(f"🛡️  CSRF Enabled: {os.getenv('CSRF_ENABLED', 'false')}")
    print(f"📊 Metrics Enabled: {os.getenv('METRICS_ENABLED', 'false')}")
    
    if all_good:
        print("\n🎉 Environment validation passed!")
    else:
        print("\n❌ Environment validation failed - please fix required variables")
    
    return all_good

if __name__ == '__main__':
    # Load .env file if present
    try:
        from dotenv import load_dotenv
        load_dotenv()
        print("📁 Loaded .env file")
    except ImportError:
        print("📁 No python-dotenv installed, using system environment")
    
    results = check_required_vars()
    success = print_results(results)
    
    sys.exit(0 if success else 1)