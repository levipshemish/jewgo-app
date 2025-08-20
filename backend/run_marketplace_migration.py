#!/usr/bin/env python3
"""Script to run the marketplace table migration."""

import os
import sys

sys.path.append(os.path.dirname(__file__))

from database.migrations.create_marketplace_table import upgrade


def run_marketplace_migration():
    """Run the marketplace table migration."""
    try:
        print("🔄 Running marketplace table migration...")
        upgrade()
        print("✅ Marketplace table migration completed successfully!")
        return True
    except Exception as e:
        print(f"❌ Error running marketplace table migration: {e}")
        import traceback

        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_marketplace_migration()
    sys.exit(0 if success else 1)
