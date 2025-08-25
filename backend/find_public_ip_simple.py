#!/usr/bin/env python3
"""
Find Public IP Address (Simple Version)
=====================================

This script helps find your public IP address for Oracle Cloud security list configuration.
"""

import urllib.request
import socket
import sys

def get_public_ip():
    """Get your public IP address."""
    try:
        # Try to get public IP
        with urllib.request.urlopen('https://api.ipify.org', timeout=5) as response:
            ip = response.read().decode('utf-8').strip()
            return ip
    except Exception as e:
        print(f"Error getting public IP: {e}")
        return None

def get_local_ip():
    """Get your local IP address."""
    try:
        # Get local IP
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        local_ip = s.getsockname()[0]
        s.close()
        return local_ip
    except Exception as e:
        print(f"Error getting local IP: {e}")
        return None

def main():
    """Main function."""
    print("🌐 IP Address Finder for Oracle Cloud Security Lists")
    print("=" * 50)
    
    # Get public IP
    public_ip = get_public_ip()
    if public_ip:
        print(f"✅ Your Public IP: {public_ip}")
        print(f"   Use this in Oracle Cloud: {public_ip}/32")
    else:
        print("❌ Could not determine public IP")
        print("   Try manually finding your IP at: https://whatismyipaddress.com/")
    
    # Get local IP
    local_ip = get_local_ip()
    if local_ip:
        print(f"📱 Your Local IP: {local_ip}")
    
    print()
    print("🔧 Oracle Cloud Security List Configuration:")
    print("=" * 50)
    
    if public_ip:
        print(f"Option 1: Allow only your IP (Recommended)")
        print(f"   Source CIDR: {public_ip}/32")
        print()
        print("Option 2: Try these alternative CIDR formats:")
        print("   Source CIDR: 0.0.0.0/0 (if Oracle Cloud accepts it)")
        print("   Source CIDR: 10.0.0.0/8")
        print("   Source CIDR: 172.16.0.0/12")
        print("   Source CIDR: 192.168.0.0/16")
    else:
        print("❌ Could not determine IP addresses")
        print("   Try manually finding your IP at: https://whatismyipaddress.com/")
    
    print()
    print("📝 Next Steps:")
    print("1. Use your specific IP with /32 suffix in Oracle Cloud")
    print("2. If that doesn't work, try the alternative CIDR ranges")
    print("3. Test connectivity after adding the rule")

if __name__ == "__main__":
    main()
