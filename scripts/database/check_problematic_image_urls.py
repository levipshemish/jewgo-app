#!/usr/bin/env python3
"""
Check Problematic Image URLs Script
==================================

This script identifies problematic image URLs that are causing 404 errors
without requiring database access. It focuses on known problematic patterns.

Author: JewGo Development Team
Version: 1.0
"""

import requests
from datetime import datetime
from typing import List, Dict, Any
import json

# Problematic URL patterns that are known to cause 404 errors
PROBLEMATIC_PATTERNS = [
    'jewgo/restaurants/pita_xpress/image_1',
    'jewgo/restaurants/sobol_boca_raton/image_1',
    'jewgo/restaurants/jons_place/image_1',
    'jewgo/restaurants/kosher_bagel_cove/image_1',
    'jewgo/restaurants/mizrachis_pizza_in_hollywood/image_1',
    'jewgo/restaurants/cafe_noir/image_1',
    'jewgo/restaurants/lox_n_bagel_bagel_factory_cafe/image_1',
    # Add more patterns as discovered
]

# Sample problematic URLs to test
SAMPLE_PROBLEMATIC_URLS = [
    'https://res.cloudinary.com/dcpuqbnrm/image/upload/f_auto,q_auto/6/jewgo/restaurants/pita_xpress/image_1',
    'https://res.cloudinary.com/dcpuqbnrm/image/upload/f_auto,q_auto/6/jewgo/restaurants/sobol_boca_raton/image_1',
    'https://res.cloudinary.com/dcpuqbnrm/image/upload/f_auto,q_auto/6/jewgo/restaurants/jons_place/image_1',
]

def check_image_url_exists(url: str) -> Dict[str, Any]:
    """Check if an image URL returns a successful response."""
    try:
        response = requests.head(url, timeout=10, allow_redirects=True)
        return {
            'url': url,
            'status_code': response.status_code,
            'exists': response.status_code == 200,
            'content_type': response.headers.get('content-type', ''),
            'content_length': response.headers.get('content-length', ''),
        }
    except Exception as e:
        return {
            'url': url,
            'status_code': None,
            'exists': False,
            'error': str(e),
            'content_type': '',
            'content_length': '',
        }

def is_problematic_url(url: str) -> bool:
    """Check if a URL matches known problematic patterns."""
    if not url or not isinstance(url, str):
        return True
    
    # Check for problematic patterns
    for pattern in PROBLEMATIC_PATTERNS:
        if pattern in url:
            return True
    
    # Check for other problematic patterns
    problematic_indicators = [
        'undefined',
        'null',
        'image/upload//',
        'image/upload/v1//',
    ]
    
    for indicator in problematic_indicators:
        if indicator in url:
            return True
    
    return False

def test_problematic_urls() -> Dict[str, Any]:
    """Test known problematic URLs to verify they return 404 errors."""
    print("🔍 Testing Problematic Image URLs")
    print("=" * 50)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    problematic_count = 0
    
    for url in SAMPLE_PROBLEMATIC_URLS:
        print(f"\n🔍 Testing: {url}")
        result = check_image_url_exists(url)
        results.append(result)
        
        if result['exists']:
            print(f"✅ URL exists (Status: {result['status_code']})")
        else:
            problematic_count += 1
            print(f"❌ URL does not exist (Status: {result['status_code']})")
            if 'error' in result:
                print(f"   Error: {result['error']}")
    
    # Summary
    print("\n" + "=" * 50)
    print("📋 SUMMARY")
    print("=" * 50)
    print(f"Total URLs tested: {len(results)}")
    print(f"Problematic URLs found: {problematic_count}")
    print(f"Working URLs: {len(results) - problematic_count}")
    
    return {
        'total_tested': len(results),
        'problematic_count': problematic_count,
        'working_count': len(results) - problematic_count,
        'results': results
    }

def generate_fix_recommendations() -> List[str]:
    """Generate recommendations for fixing the problematic URLs."""
    recommendations = [
        "1. **Frontend Validation**: The enhanced imageValidation.ts utility now detects and filters out problematic URLs",
        "2. **Error Handling**: The OptimizedImage component provides better fallback behavior for 404 errors",
        "3. **Database Cleanup**: Run the fix_problematic_image_urls.py script when database access is available",
        "4. **Cloudinary Management**: Consider re-uploading missing images to Cloudinary or removing database references",
        "5. **Monitoring**: Set up alerts for 404 errors on Cloudinary URLs",
    ]
    return recommendations

def main():
    """Main function."""
    print("🔍 JewGo Problematic Image URL Checker")
    print("=" * 50)
    
    # Test problematic URLs
    result = test_problematic_urls()
    
    # Generate recommendations
    print("\n" + "=" * 50)
    print("💡 RECOMMENDATIONS")
    print("=" * 50)
    recommendations = generate_fix_recommendations()
    for rec in recommendations:
        print(rec)
    
    # Save results to file
    output_file = f"problematic_urls_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    with open(output_file, 'w') as f:
        json.dump(result, f, indent=2)
    
    print(f"\n📄 Results saved to: {output_file}")
    
    if result['problematic_count'] > 0:
        print(f"\n⚠️  Found {result['problematic_count']} problematic URLs that need attention!")
    else:
        print("\n✅ No problematic URLs found!")

if __name__ == "__main__":
    main()
