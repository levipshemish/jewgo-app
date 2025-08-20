#!/usr/bin/env python3
"""Simple test of marketplace service import and initialization."""

import os

from dotenv import load_dotenv

# Load environment variables
load_dotenv()


def test_marketplace_service_import():
    """Test if marketplace service can be imported."""

    try:
        print("🧪 Testing marketplace service import...")

        # Test import
        from services.marketplace_service_v4 import MarketplaceServiceV4

        print("✅ MarketplaceServiceV4 imported successfully")

        # Test initialization
        service = MarketplaceServiceV4()
        print("✅ MarketplaceServiceV4 initialized successfully")

        # Test basic method call
        result = service.get_listings(limit=1)
        print(f"✅ get_listings() called successfully: {result['success']}")

        if result["success"]:
            print(f"📊 Total listings: {result['data']['total']}")
            print(f"📋 Listings returned: {len(result['data']['listings'])}")
        else:
            print(f"❌ Error: {result.get('error', 'Unknown error')}")
            if "details" in result:
                print(f"📋 Details: {result['details']}")

        return True

    except ImportError as e:
        print(f"❌ Import error: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    test_marketplace_service_import()
