#!/usr/bin/env python3
"""
JWT Key Rotation Script

This script rotates JWT signing keys and provides emergency key revocation.
Use this script for scheduled key rotation or emergency key management.

Usage:
    python rotate_jwt_keys.py rotate                    # Normal key rotation
    python rotate_jwt_keys.py revoke <kid> <reason>     # Emergency revocation
    python rotate_jwt_keys.py status                    # Check key status
    python rotate_jwt_keys.py init                      # Initialize first key
"""

import sys
import os
import argparse
from datetime import datetime, timezone

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.auth.jwks_manager import JWKSManager
from utils.logging_config import get_logger

logger = get_logger(__name__)


def rotate_keys():
    """Perform key rotation."""
    print("Starting JWT key rotation...")
    
    try:
        jwks_manager = JWKSManager()
        success, message = jwks_manager.rotate_keys()
        
        if success:
            print(f"✅ Key rotation successful: {message}")
            
            # Show current status
            show_status(jwks_manager)
            return 0
        else:
            print(f"❌ Key rotation failed: {message}")
            return 1
            
    except Exception as e:
        print(f"❌ Key rotation error: {e}")
        logger.error(f"Key rotation script error: {e}")
        return 1


def revoke_key(kid: str, reason: str):
    """Revoke a specific key."""
    print(f"Revoking key {kid} with reason: {reason}")
    
    try:
        jwks_manager = JWKSManager()
        success = jwks_manager.emergency_revoke_key(kid, reason)
        
        if success:
            print(f"✅ Key {kid} revoked successfully")
            
            # Show current status
            show_status(jwks_manager)
            return 0
        else:
            print(f"❌ Failed to revoke key {kid}")
            return 1
            
    except Exception as e:
        print(f"❌ Key revocation error: {e}")
        logger.error(f"Key revocation script error: {e}")
        return 1


def show_status(jwks_manager=None):
    """Show current key status."""
    try:
        if not jwks_manager:
            jwks_manager = JWKSManager()
        
        print("\n📊 JWT Key Status:")
        print("=" * 50)
        
        # Current key
        current_key = jwks_manager.get_current_key()
        if current_key:
            print(f"Current Key: {current_key['kid']}")
            print(f"Algorithm: {current_key['algorithm']}")
            print(f"Created: {current_key['created_at']}")
            print(f"Status: {current_key['status']}")
        else:
            print("❌ No current key found!")
        
        # All keys
        jwks = jwks_manager.get_public_jwks()
        print(f"\nTotal Public Keys: {len(jwks.get('keys', []))}")
        
        key_list = jwks_manager._get_key_list()
        print(f"Total Stored Keys: {len(key_list)}")
        
        if key_list:
            print("\nAll Keys:")
            for kid in key_list:
                key_data = jwks_manager.get_key_by_kid(kid)
                if key_data:
                    status_icon = "🟢" if key_data['status'] == 'active' else \
                                 "🟡" if key_data['status'] == 'retired' else "🔴"
                    current_marker = " (CURRENT)" if key_data.get('is_current') else ""
                    print(f"  {status_icon} {kid} - {key_data['status']}{current_marker}")
        
        # Health check
        health = jwks_manager.health_check()
        health_icon = "🟢" if health['status'] == 'healthy' else "🔴"
        print(f"\nHealth Status: {health_icon} {health['status']}")
        
        if health['status'] != 'healthy':
            print("Health Issues:")
            for key, value in health.items():
                if key not in ['status', 'timestamp'] and not value:
                    print(f"  ❌ {key}")
        
        return 0
        
    except Exception as e:
        print(f"❌ Status check error: {e}")
        logger.error(f"Status check script error: {e}")
        return 1


def initialize_keys():
    """Initialize JWKS with first key pair."""
    print("Initializing JWT keys...")
    
    try:
        jwks_manager = JWKSManager()
        success = jwks_manager.initialize_keys()
        
        if success:
            print("✅ JWT keys initialized successfully")
            
            # Show current status
            show_status(jwks_manager)
            return 0
        else:
            print("❌ Failed to initialize JWT keys")
            return 1
            
    except Exception as e:
        print(f"❌ Key initialization error: {e}")
        logger.error(f"Key initialization script error: {e}")
        return 1


def main():
    """Main script entry point."""
    parser = argparse.ArgumentParser(
        description='JWT Key Management Script',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python rotate_jwt_keys.py rotate
  python rotate_jwt_keys.py revoke rs256_1234567890_abcdef12 "key_compromise"
  python rotate_jwt_keys.py status
  python rotate_jwt_keys.py init
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Rotate command
    rotate_parser = subparsers.add_parser('rotate', help='Rotate JWT keys')
    
    # Revoke command
    revoke_parser = subparsers.add_parser('revoke', help='Revoke a specific key')
    revoke_parser.add_argument('kid', help='Key ID to revoke')
    revoke_parser.add_argument('reason', help='Reason for revocation')
    
    # Status command
    status_parser = subparsers.add_parser('status', help='Show key status')
    
    # Init command
    init_parser = subparsers.add_parser('init', help='Initialize first key pair')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return 1
    
    print(f"JWT Key Management - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print("=" * 60)
    
    if args.command == 'rotate':
        return rotate_keys()
    elif args.command == 'revoke':
        return revoke_key(args.kid, args.reason)
    elif args.command == 'status':
        return show_status()
    elif args.command == 'init':
        return initialize_keys()
    else:
        parser.print_help()
        return 1


if __name__ == '__main__':
    sys.exit(main())