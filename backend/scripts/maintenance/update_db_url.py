#!/usr/bin/env python3
"""Update Database URL to use psycopg driver."""

import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '..', '.env'))

# Get current database URL
current_url = os.getenv('DATABASE_URL')
if current_url and current_url.startswith('postgresql://'):
    # Update to use psycopg driver
    new_url = current_url.replace('postgresql://', 'postgresql+psycopg://')
    print(f"Updated database URL to use psycopg driver:")
    print(f"Old: {current_url}")
    print(f"New: {new_url}")
    
    # Update the .env file
    env_file = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
    with open(env_file, 'r') as f:
        content = f.read()
    
    updated_content = content.replace(f'DATABASE_URL={current_url}', f'DATABASE_URL={new_url}')
    
    with open(env_file, 'w') as f:
        f.write(updated_content)
    
    print("Database URL updated successfully!")
else:
    print("Database URL not found or already using psycopg driver")
