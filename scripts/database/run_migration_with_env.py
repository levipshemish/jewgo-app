#!/usr/bin/env python3
"""Wrapper script to run marketplace migration with environment variables loaded."""

import os
import sys
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

# Now run the migration script
if __name__ == "__main__":
    # Import and run the migration script
    from scripts.database.execute_marketplace_migration import main
    exit(main())
