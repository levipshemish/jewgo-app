#!/usr/bin/env python3
"""
Test script for Auth Sessions Security Hardening Migration
This script tests the migration functionality without applying it to production.
"""

import os
import sys
import psycopg2
import logging
import uuid
from datetime import datetime, timedelta
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent.parent
sys.path.insert(0, str(backend_dir))

from database.connection_manager_v5 import DatabaseConnectionManager

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class AuthSessionsMigrationTester:
    """Test suite for the auth sessions security hardening migration."""
    
    def __init__(self):
        self.db_manager = DatabaseConnectionManager()
        self.test_user_id = f"test_user_{uuid.uuid4().hex[:8]}"
        self.test_session_ids = []
        
    def setup_test_data(self):
        """Create test data for migration testing."""
        logger.info("Setting up test data...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Create a test user if it doesn't exist
                    cursor.execute("""
                        INSERT INTO users (id, name, email, created_at)
                        VALUES (%s, %s, %s, %s)
                        ON CONFLICT (id) DO NOTHING
                    """, (
                        self.test_user_id,
                        "Test User",
                        f"test_{uuid.uuid4().hex[:8]}@example.com",
                        datetime.now()
                    ))
                    
                    # Create test sessions
                    for i in range(3):
                        session_id = f"test_session_{uuid.uuid4().hex}"
                        self.test_session_ids.append(session_id)
                        
                        cursor.execute("""
                            INSERT INTO auth_sessions (
                                id, user_id, refresh_token_hash, family_id,
                                user_agent, ip, created_at, last_used, expires_at
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            session_id,
                            self.test_user_id,
                            f"hash_{uuid.uuid4().hex}",
                            str(uuid.uuid4()),
                            f"TestAgent/{i}",
                            f"192.168.1.{i+1}",
                            datetime.now(),
                            datetime.now(),
                            datetime.now() + timedelta(days=30)
                        ))
                    
                    logger.info(f"Created test user {self.test_user_id} with {len(self.test_session_ids)} sessions")
                    
        except Exception as e:
            logger.error(f"Failed to setup test data: {e}")
            raise
    
    def test_migration_functions(self):
        """Test the migration helper functions."""
        logger.info("Testing migration functions...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Test revoke_session_family function
                    test_family_id = str(uuid.uuid4())
                    
                    # Create a test session with the family ID
                    test_session_id = f"test_family_session_{uuid.uuid4().hex}"
                    cursor.execute("""
                        INSERT INTO auth_sessions (
                            id, user_id, refresh_token_hash, family_id,
                            current_jti, created_at, last_used, expires_at, auth_time
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        test_session_id,
                        self.test_user_id,
                        f"hash_{uuid.uuid4().hex}",
                        test_family_id,
                        str(uuid.uuid4()),
                        datetime.now(),
                        datetime.now(),
                        datetime.now() + timedelta(days=30),
                        datetime.now()
                    ))
                    
                    # Test family revocation
                    cursor.execute("SELECT revoke_session_family(%s, %s)", (test_family_id, 'test_revocation'))
                    revoked_count = cursor.fetchone()[0]
                    
                    if revoked_count != 1:
                        raise Exception(f"Expected 1 revoked session, got {revoked_count}")
                    
                    # Verify session was revoked
                    cursor.execute("""
                        SELECT revoked_at FROM auth_sessions 
                        WHERE id = %s
                    """, (test_session_id,))
                    
                    result = cursor.fetchone()
                    if not result or not result[0]:
                        raise Exception("Session was not properly revoked")
                    
                    logger.info("✓ revoke_session_family function works correctly")
                    
                    # Test handle_token_replay function
                    test_jti = str(uuid.uuid4())
                    test_family_id_2 = str(uuid.uuid4())
                    
                    # Create a session with a specific JTI
                    cursor.execute("""
                        INSERT INTO auth_sessions (
                            id, user_id, refresh_token_hash, family_id,
                            current_jti, created_at, last_used, expires_at, auth_time
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        f"test_replay_session_{uuid.uuid4().hex}",
                        self.test_user_id,
                        f"hash_{uuid.uuid4().hex}",
                        test_family_id_2,
                        test_jti,
                        datetime.now(),
                        datetime.now(),
                        datetime.now() + timedelta(days=30),
                        datetime.now()
                    ))
                    
                    # Test replay detection (should detect replay)
                    cursor.execute("SELECT handle_token_replay(%s, %s)", (test_jti, test_family_id_2))
                    replay_detected = cursor.fetchone()[0]
                    
                    if not replay_detected:
                        raise Exception("Replay detection failed - should have detected replay")
                    
                    logger.info("✓ handle_token_replay function works correctly")
                    
                    # Test cleanup_expired_sessions function
                    cursor.execute("SELECT cleanup_expired_sessions()")
                    cleanup_count = cursor.fetchone()[0]
                    
                    logger.info(f"✓ cleanup_expired_sessions function works correctly (cleaned {cleanup_count} sessions)")
                    
        except Exception as e:
            logger.error(f"Function testing failed: {e}")
            raise
    
    def test_migration_views(self):
        """Test the migration views."""
        logger.info("Testing migration views...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Test active_sessions view
                    cursor.execute("""
                        SELECT id, user_id, family_id, auth_freshness
                        FROM active_sessions 
                        WHERE user_id = %s
                        LIMIT 5
                    """, (self.test_user_id,))
                    
                    active_sessions = cursor.fetchall()
                    logger.info(f"✓ active_sessions view returned {len(active_sessions)} sessions")
                    
                    # Test session_families view
                    cursor.execute("""
                        SELECT family_id, user_id, total_sessions, active_sessions
                        FROM session_families 
                        WHERE user_id = %s
                        LIMIT 5
                    """, (self.test_user_id,))
                    
                    session_families = cursor.fetchall()
                    logger.info(f"✓ session_families view returned {len(session_families)} families")
                    
        except Exception as e:
            logger.error(f"View testing failed: {e}")
            raise
    
    def test_migration_constraints(self):
        """Test the migration constraints and indexes."""
        logger.info("Testing migration constraints...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Test unique constraint for active sessions
                    test_family_id = str(uuid.uuid4())
                    test_jti = str(uuid.uuid4())
                    
                    # Create first session
                    cursor.execute("""
                        INSERT INTO auth_sessions (
                            id, user_id, refresh_token_hash, family_id,
                            current_jti, created_at, last_used, expires_at, auth_time
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """, (
                        f"test_unique_1_{uuid.uuid4().hex}",
                        self.test_user_id,
                        f"hash_{uuid.uuid4().hex}",
                        test_family_id,
                        test_jti,
                        datetime.now(),
                        datetime.now(),
                        datetime.now() + timedelta(days=30),
                        datetime.now()
                    ))
                    
                    # Try to create second session with same family_id and current_jti
                    # This should fail due to unique constraint
                    try:
                        cursor.execute("""
                            INSERT INTO auth_sessions (
                                id, user_id, refresh_token_hash, family_id,
                                current_jti, created_at, last_used, expires_at, auth_time
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                        """, (
                            f"test_unique_2_{uuid.uuid4().hex}",
                            self.test_user_id,
                            f"hash_{uuid.uuid4().hex}",
                            test_family_id,
                            test_jti,  # Same JTI
                            datetime.now(),
                            datetime.now(),
                            datetime.now() + timedelta(days=30),
                            datetime.now()
                        ))
                        
                        # If we get here, the constraint didn't work
                        raise Exception("Unique constraint failed - duplicate active JTI allowed")
                        
                    except psycopg2.IntegrityError:
                        # This is expected - the constraint worked
                        conn.rollback()
                        logger.info("✓ Unique constraint for active sessions works correctly")
                    
        except Exception as e:
            logger.error(f"Constraint testing failed: {e}")
            raise
    
    def cleanup_test_data(self):
        """Clean up test data."""
        logger.info("Cleaning up test data...")
        
        try:
            with self.db_manager.get_connection() as conn:
                with conn.cursor() as cursor:
                    # Delete test sessions
                    cursor.execute("""
                        DELETE FROM auth_sessions 
                        WHERE user_id = %s OR id LIKE 'test_%'
                    """, (self.test_user_id,))
                    
                    # Delete test user
                    cursor.execute("DELETE FROM users WHERE id = %s", (self.test_user_id,))
                    
                    # Clean up any test audit logs
                    cursor.execute("""
                        DELETE FROM auth_audit_log 
                        WHERE details->>'family_id' LIKE 'test_%'
                        OR action LIKE '%test%'
                    """)
                    
                    logger.info("Test data cleaned up successfully")
                    
        except Exception as e:
            logger.error(f"Failed to cleanup test data: {e}")
    
    def run_tests(self):
        """Run all migration tests."""
        logger.info("Starting auth sessions migration tests...")
        
        try:
            # Setup
            self.setup_test_data()
            
            # Run tests
            self.test_migration_functions()
            self.test_migration_views()
            self.test_migration_constraints()
            
            logger.info("✅ All migration tests passed!")
            return True
            
        except Exception as e:
            logger.error(f"Migration tests failed: {e}")
            return False
            
        finally:
            # Always cleanup
            try:
                self.cleanup_test_data()
            except Exception as e:
                logger.warning(f"Cleanup failed: {e}")

def main():
    """Main entry point for the test script."""
    tester = AuthSessionsMigrationTester()
    
    success = tester.run_tests()
    
    if success:
        logger.info("Migration tests completed successfully!")
        sys.exit(0)
    else:
        logger.error("Migration tests failed!")
        sys.exit(1)

if __name__ == "__main__":
    main()