#!/usr/bin/env python3
"""
Script to run OAuth migration on the server.
"""

import os
import sys
from sqlalchemy import create_engine, text

def run_migration():
    """Run the OAuth migration."""
    # Get database URL from environment
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("ERROR: DATABASE_URL environment variable not found")
        return False
    
    try:
        # Create database engine
        engine = create_engine(database_url)
        
        # Migration SQL
        migration_sql = """
        -- 3. Create OAuth state tracking table
        CREATE TABLE IF NOT EXISTS oauth_states_v5 (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            state_token VARCHAR(255) NOT NULL UNIQUE,
            provider VARCHAR(32) NOT NULL,
            return_to VARCHAR(500),
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            consumed_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- 4. Performance indexes
        CREATE INDEX IF NOT EXISTS idx_oauth_states_token ON oauth_states_v5(state_token);
        CREATE INDEX IF NOT EXISTS idx_oauth_states_expires ON oauth_states_v5(expires_at);
        """
        
        # Execute migration
        with engine.connect() as conn:
            conn.execute(text(migration_sql))
            conn.commit()
            
        print("✅ OAuth migration completed successfully")
        return True
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        return False

if __name__ == "__main__":
    success = run_migration()
    sys.exit(0 if success else 1)
