#!/usr/bin/env python3
"""
Simple script to test password verification directly.
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from utils.postgres_auth import PasswordSecurity

def test_password_verification():
    """Test password verification with known values."""
    
    # Test password
    password = "LoginTest123!"
    
    print(f"Testing password: {password}")
    
    # Hash the password
    try:
        password_hash = PasswordSecurity.hash_password(password)
        print(f"Password hashed successfully: {password_hash[:50]}...")
    except Exception as e:
        print(f"Password hashing failed: {e}")
        return
    
    # Verify the password
    try:
        verification_result = PasswordSecurity.verify_password(password, password_hash)
        print(f"Password verification result: {verification_result}")
        
        if verification_result:
            print("✅ Password verification successful!")
        else:
            print("❌ Password verification failed!")
            
    except Exception as e:
        print(f"Password verification failed: {e}")

if __name__ == "__main__":
    test_password_verification()
