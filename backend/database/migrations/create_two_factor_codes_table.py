"""
Migration to create two_factor_codes table for email-based 2FA.
"""

import os
from sqlalchemy import text
from utils.logging_config import get_logger
from database.unified_connection_manager import get_db_connection

logger = get_logger(__name__)


def create_two_factor_codes_table():
    """Create the two_factor_codes table for 2FA code management."""
    try:
        db_connection = get_db_connection()
        
        with db_connection.session_scope() as session:
            logger.info("Creating two_factor_codes table...")
            
            # Create two_factor_codes table
            create_table_sql = """
            CREATE TABLE IF NOT EXISTS two_factor_codes (
                id VARCHAR(255) PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                code_hash TEXT NOT NULL,
                expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
                attempts INTEGER DEFAULT 0,
                ip_address VARCHAR(45),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                CONSTRAINT fk_two_factor_codes_user_id 
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                CONSTRAINT unique_user_active_code UNIQUE (user_id)
            );
            
            -- Create indexes for performance
            CREATE INDEX IF NOT EXISTS idx_two_factor_codes_user_id ON two_factor_codes(user_id);
            CREATE INDEX IF NOT EXISTS idx_two_factor_codes_expires_at ON two_factor_codes(expires_at);
            CREATE INDEX IF NOT EXISTS idx_two_factor_codes_created_at ON two_factor_codes(created_at);
            CREATE INDEX IF NOT EXISTS idx_two_factor_codes_ip_address ON two_factor_codes(ip_address);
            
            -- Add comments for documentation
            COMMENT ON TABLE two_factor_codes IS 'Stores temporary 2FA verification codes sent via email';
            COMMENT ON COLUMN two_factor_codes.code_hash IS 'HMAC hash of the 6-digit verification code';
            COMMENT ON COLUMN two_factor_codes.attempts IS 'Number of failed verification attempts';
            COMMENT ON COLUMN two_factor_codes.expires_at IS 'When the code expires (typically 10 minutes)';
            """
            
            session.execute(text(create_table_sql))
            logger.info("two_factor_codes table created successfully")
            
            # Add TWO_FACTOR_SIGNING_KEY to environment if not exists
            env_file_path = '.env'
            if os.path.exists(env_file_path):
                with open(env_file_path, 'r') as f:
                    env_content = f.read()
                
                if 'TWO_FACTOR_SIGNING_KEY' not in env_content:
                    import secrets
                    signing_key = secrets.token_hex(32)
                    
                    with open(env_file_path, 'a') as f:
                        f.write(f'\n# Two-Factor Authentication\n')
                        f.write(f'TWO_FACTOR_SIGNING_KEY={signing_key}\n')
                        f.write(f'TWO_FACTOR_CODE_LENGTH=6\n')
                        f.write(f'TWO_FACTOR_CODE_TTL_MINUTES=10\n')
                        f.write(f'TWO_FACTOR_MAX_ATTEMPTS=3\n')
                        f.write(f'TWO_FACTOR_LOCKOUT_MINUTES=15\n')
                    
                    logger.info("Added 2FA environment variables to .env")
                    
        logger.info("Two-factor codes table migration completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error creating two_factor_codes table: {e}")
        return False


def rollback_two_factor_codes_table():
    """Rollback the two_factor_codes table creation."""
    try:
        db_connection = get_db_connection()
        
        with db_connection.session_scope() as session:
            logger.info("Rolling back two_factor_codes table...")
            
            rollback_sql = """
            DROP TABLE IF EXISTS two_factor_codes CASCADE;
            """
            
            session.execute(text(rollback_sql))
            logger.info("two_factor_codes table dropped successfully")
            
        logger.info("Two-factor codes table rollback completed successfully")
        return True
        
    except Exception as e:
        logger.error(f"Error rolling back two_factor_codes table: {e}")
        return False


if __name__ == "__main__":
    create_two_factor_codes_table()
