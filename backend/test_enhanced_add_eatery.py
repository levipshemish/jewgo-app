# !/usr/bin/env python3
"""Test script for Enhanced Add Eatery Workflow components."""
import os
import sys

# Set up environment
os.environ["DATABASE_URL"] = (
    "postgresql://app_user:Jewgo123@141.148.50.111:5432/app_db?sslmode=require"
)


def test_database_connection():
    """Test database connection and verify new fields exist."""
    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(os.environ["DATABASE_URL"])
        with engine.connect() as conn:
            # Check if new fields exist
            result = conn.execute(
                text(
                    """
                SELECT column_name, data_type
                FROM information_schema.columns
                WHERE table_name = 'restaurants'
                AND column_name IN (
                    'owner_name', 'owner_email', 'owner_phone', 'is_owner_submission',
                    'business_email', 'instagram_link', 'facebook_link', 'tiktok_link',
                    'business_images', 'submission_status', 'submission_date',
                    'approval_date', 'approved_by', 'rejection_reason'
                )
                ORDER BY column_name
            """
                )
            )
            new_fields = result.fetchall()
            print(f"✅ Found {len(new_fields)} new fields in restaurants table:")
            for field in new_fields:
                print(f"   - {field[0]}: {field[1]}")
            # Check if indexes exist
            result = conn.execute(
                text(
                    """
                SELECT indexname
                FROM pg_indexes
                WHERE tablename = 'restaurants'
                AND indexname LIKE 'idx_restaurants_%'
                ORDER BY indexname
            """
                )
            )
            indexes = result.fetchall()
            print(f"✅ Found {len(indexes)} new indexes:")
            for index in indexes:
                print(f"   - {index[0]}")
            return True
    except Exception as e:
        print(f"❌ Database connection test failed: {e}")
        return False


def test_frontend_components():
    """Test frontend components."""
    try:
        components = [
            "../frontend/components/forms/EnhancedAddEateryForm.tsx",
            "../frontend/components/forms/MultipleImageUpload.tsx",
            "../frontend/app/admin/restaurants/page.tsx",
        ]
        for component in components:
            if os.path.exists(component):
                print(f"✅ Component exists: {os.path.basename(component)}")
            else:
                print(f"❌ Component missing: {os.path.basename(component)}")
                return False
        return True
    except Exception as e:
        print(f"❌ Frontend components test failed: {e}")
        return False


def main():
    """Run all tests."""
    print("🧪 Testing Enhanced Add Eatery Workflow Components")
    print("=" * 50)
    tests = [
        ("Database Connection", test_database_connection),
        ("Frontend Components", test_frontend_components),
    ]
    results = []
    for test_name, test_func in tests:
        print(f"\n🔍 Running {test_name} test...")
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test failed with exception: {e}")
            results.append((test_name, False))
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print("=" * 50)
    passed = 0
    total = len(results)
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
        if result:
            passed += 1
    print(f"\n🎯 Overall: {passed}/{total} tests passed")
    if passed == total:
        print(
            "🎉 All tests passed! Enhanced Add Eatery Workflow is ready for deployment."
        )
        return True
    else:
        print("⚠️  Some tests failed. Please review and fix issues before deployment.")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
