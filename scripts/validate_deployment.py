#!/usr/bin/env python3
"""
Deployment Validation Script

This script validates that all environments follow the new security requirements
implemented in the security improvements.
"""

import os
import sys
import json
from typing import Dict, List, Tuple

# Add backend to path for imports
sys.path.append(os.path.join(os.path.dirname(__file__), '..', 'backend'))

from utils.monitoring_v2 import get_metrics, clear_old_data


def validate_environment_variables() -> Tuple[bool, List[str]]:
    """Validate required environment variables are set."""
    errors = []
    warnings = []
    
    # Required for production
    required_vars = {
        "NEXT_PUBLIC_BACKEND_URL": "Frontend backend URL",
        "CORS_ORIGINS": "CORS origins configuration",
    }
    
    # Optional but recommended
    recommended_vars = {
        "GOOGLE_PLACES_API_KEY": "Google Places API key",
        "GOOGLE_MAPS_API_KEY": "Google Maps API key",
        "DATABASE_URL": "Database connection string",
        "SECRET_KEY": "Application secret key",
    }
    
    for var, description in required_vars.items():
        if not os.getenv(var):
            errors.append(f"Missing required environment variable: {var} ({description})")
    
    for var, description in recommended_vars.items():
        if not os.getenv(var):
            warnings.append(f"Missing recommended environment variable: {var} ({description})")
    
    return len(errors) == 0, errors + warnings


def validate_cors_configuration() -> Tuple[bool, List[str]]:
    """Validate CORS configuration is secure."""
    errors = []
    
    cors_origins = os.getenv("CORS_ORIGINS", "")
    
    if not cors_origins:
        errors.append("CORS_ORIGINS is not set - explicit origins required")
        return False, errors
    
    origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
    
    if not origins:
        errors.append("CORS_ORIGINS is empty - explicit origins required")
        return False, errors
    
    # Check for wildcard origins
    for origin in origins:
        if origin == "*":
            errors.append("Wildcard origin '*' not allowed in CORS_ORIGINS")
        elif origin.startswith("*."):
            errors.append(f"Wildcard subdomain origin '{origin}' not allowed")
    
    # Validate origin format
    for origin in origins:
        if not (origin.startswith("http://") or origin.startswith("https://")):
            errors.append(f"Invalid origin format: {origin} (must start with http:// or https://)")
    
    return len(errors) == 0, errors


def validate_backend_url() -> Tuple[bool, List[str]]:
    """Validate backend URL configuration."""
    errors = []
    
    backend_url = os.getenv("NEXT_PUBLIC_BACKEND_URL", "")
    
    if not backend_url:
        errors.append("NEXT_PUBLIC_BACKEND_URL is not set")
        return False, errors
    
    # Validate URL format
    if not (backend_url.startswith("http://") or backend_url.startswith("https://")):
        errors.append(f"Invalid backend URL format: {backend_url}")
    
    # Check for hardcoded production URLs
    hardcoded_urls = [
        "jewgo-app-oyoh.onrender.com",
        "https://jewgo-app-oyoh.onrender.com",
    ]
    
    for hardcoded in hardcoded_urls:
        if hardcoded in backend_url:
            errors.append(f"Hardcoded production URL detected: {hardcoded}")
    
    return len(errors) == 0, errors


def validate_security_configuration() -> Tuple[bool, List[str]]:
    """Validate security-related configuration."""
    errors = []
    warnings = []
    
    # Check for weak secret keys
    secret_key = os.getenv("SECRET_KEY", "")
    if secret_key:
        if secret_key == "your-secret-key-change-in-production":
            errors.append("Default secret key detected - change SECRET_KEY in production")
        elif len(secret_key) < 32:
            warnings.append("Secret key is shorter than recommended (32+ characters)")
    
    # Check for development defaults in production
    is_production = os.getenv("NODE_ENV") == "production" or os.getenv("ENVIRONMENT") == "production"
    
    if is_production:
        if os.getenv("DEBUG", "").lower() in ["true", "1", "yes"]:
            errors.append("DEBUG mode enabled in production")
        
        if os.getenv("NEXT_PUBLIC_BACKEND_URL", "").startswith("http://"):
            warnings.append("Using HTTP backend URL in production (HTTPS recommended)")
    
    return len(errors) == 0, errors + warnings


def validate_monitoring_setup() -> Tuple[bool, List[str]]:
    """Validate monitoring configuration."""
    warnings = []
    
    # Check if monitoring is properly configured
    try:
        metrics = get_metrics()
        if not metrics:
            warnings.append("No monitoring data available - monitoring may not be active")
    except Exception as e:
        warnings.append(f"Monitoring validation failed: {e}")
    
    return True, warnings


def generate_validation_report() -> Dict:
    """Generate a comprehensive validation report."""
    report = {
        "timestamp": os.popen("date -u").read().strip(),
        "environment": os.getenv("NODE_ENV", "unknown"),
        "checks": {},
        "summary": {
            "passed": 0,
            "failed": 0,
            "warnings": 0,
        }
    }
    
    # Run all validation checks
    checks = [
        ("environment_variables", validate_environment_variables),
        ("cors_configuration", validate_cors_configuration),
        ("backend_url", validate_backend_url),
        ("security_configuration", validate_security_configuration),
        ("monitoring_setup", validate_monitoring_setup),
    ]
    
    for check_name, check_func in checks:
        try:
            passed, messages = check_func()
            report["checks"][check_name] = {
                "passed": passed,
                "messages": messages,
            }
            
            if passed:
                report["summary"]["passed"] += 1
            else:
                report["summary"]["failed"] += 1
            
            # Count warnings
            warnings = [msg for msg in messages if "warning" in msg.lower()]
            report["summary"]["warnings"] += len(warnings)
            
        except Exception as e:
            report["checks"][check_name] = {
                "passed": False,
                "messages": [f"Validation check failed: {e}"],
            }
            report["summary"]["failed"] += 1
    
    return report


def print_report(report: Dict):
    """Print validation report in a readable format."""
    print("=" * 60)
    print("DEPLOYMENT VALIDATION REPORT")
    print("=" * 60)
    print(f"Timestamp: {report['timestamp']}")
    print(f"Environment: {report['environment']}")
    print()
    
    # Summary
    summary = report["summary"]
    print("SUMMARY:")
    print(f"  ✅ Passed: {summary['passed']}")
    print(f"  ❌ Failed: {summary['failed']}")
    print(f"  ⚠️  Warnings: {summary['warnings']}")
    print()
    
    # Detailed results
    for check_name, result in report["checks"].items():
        status = "✅ PASS" if result["passed"] else "❌ FAIL"
        print(f"{status} {check_name.replace('_', ' ').title()}")
        
        for message in result["messages"]:
            if "warning" in message.lower():
                print(f"    ⚠️  {message}")
            else:
                print(f"    • {message}")
        print()
    
    # Overall result
    if summary["failed"] == 0:
        print("🎉 All validation checks passed!")
        if summary["warnings"] > 0:
            print(f"⚠️  {summary['warnings']} warnings found - review recommended")
    else:
        print(f"❌ {summary['failed']} validation checks failed")
        print("Please fix the issues above before deployment")
    
    print("=" * 60)


def main():
    """Main validation function."""
    print("Running deployment validation...")
    print()
    
    # Generate and print report
    report = generate_validation_report()
    print_report(report)
    
    # Exit with appropriate code
    if report["summary"]["failed"] > 0:
        sys.exit(1)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()
