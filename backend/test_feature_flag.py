#!/usr/bin/env python3
"""Test script to check feature flag status."""

import sys
import os
sys.path.append(os.path.dirname(__file__))

from utils.feature_flags_v4 import api_v4_flags

def test_feature_flags():
    """Test feature flag status."""
    print("Testing feature flags...")
    
    # Check if marketplace flag exists
    if "api_v4_marketplace" in api_v4_flags.flags:
        marketplace_flag = api_v4_flags.flags["api_v4_marketplace"]
        print(f"Marketplace flag found: {marketplace_flag}")
        print(f"Default: {marketplace_flag['default']}")
        print(f"Stage: {marketplace_flag['stage']}")
    else:
        print("Marketplace flag not found!")
    
    # Check if it's enabled
    is_enabled = api_v4_flags.is_enabled("api_v4_marketplace")
    print(f"Is marketplace enabled: {is_enabled}")
    
    # List all flags
    print("\nAll flags:")
    for name, flag in api_v4_flags.get_all_flags().items():
        print(f"  {name}: {flag['enabled']} (stage: {flag['stage']})")

if __name__ == "__main__":
    test_feature_flags()
