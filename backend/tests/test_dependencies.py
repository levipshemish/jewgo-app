#!/usr/bin/env python3
"""Test script to check API v4 dependencies."""

import os
import sys

sys.path.append(os.path.dirname(__file__))

# Test imports
try:
    from services.marketplace_service_v4 import MarketplaceServiceV4

    print("✅ MarketplaceServiceV4 imported successfully")
except ImportError as e:
    print(f"❌ MarketplaceServiceV4 import failed: {e}")

try:
    from utils.error_handler import (
        APIError,
        DatabaseError,
        ExternalServiceError,
        NotFoundError,
        ValidationError,
    )

    print("✅ Error handler classes imported successfully")
except ImportError as e:
    print(f"❌ Error handler classes import failed: {e}")

try:
    from utils.cache_manager_v4 import CacheManagerV4

    print("✅ CacheManagerV4 imported successfully")
except ImportError as e:
    print(f"❌ CacheManagerV4 import failed: {e}")

try:
    from utils.config_manager import ConfigManager

    print("✅ ConfigManager imported successfully")
except ImportError as e:
    print(f"❌ ConfigManager import failed: {e}")

# Test blueprint creation
try:
    from routes.api_v4 import api_v4

    if api_v4 is not None:
        print("✅ API v4 blueprint created successfully")
    else:
        print("❌ API v4 blueprint is None")
except Exception as e:
    print(f"❌ API v4 blueprint creation failed: {e}")
