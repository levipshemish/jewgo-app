#!/usr/bin/env python3
"""Enable v4 API endpoints.

This script enables the v4 API endpoints by setting the required environment variables.
"""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Environment variables to enable v4 API
env_vars = {
    'API_V4_RESTAURANTS': 'true',
    'API_V4_REVIEWS': 'true',
    'API_V4_USERS': 'true',
    'API_V4_STATISTICS': 'true',
    'API_V4_ENABLED': 'true'
}

print("Enabling v4 API endpoints...")
print("Environment variables to set:")
for key, value in env_vars.items():
    print(f"  {key}={value}")

print("\nTo enable these in production, add these to your environment variables:")
for key, value in env_vars.items():
    print(f"export {key}={value}")

print("\nOr add them to your .env file:")
for key, value in env_vars.items():
    print(f"{key}={value}")
