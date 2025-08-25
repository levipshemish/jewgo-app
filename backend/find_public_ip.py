#!/usr/bin/env python3
"""
Find Public IP Address
=====================

This script helps find your public IP address for Oracle Cloud security list configuration.
"""

import requests
import socket
import sys

def get_public_ip():
    """Get your public IP address."""
    try:
        # Try multiple services in case one fails
        services = [
            'https://api.ipify.org',
            'https://ifconfig.me',
            'https://icanhazip.com',
            'https://ident.me'
        ]
        
        for service in services:
            try:
                response = requests.get(service, timeout=5)
                if response.status_code == 200:
                    ip = response.text.strip()
                    return ip
            except:
                continue
        
        return None
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
    
    # Get local IP
    local_ip = get_local_ip()
    if local_ip:
        print(f"📱 Your Local IP: {local_ip}")
    
    print()
    print("🔧 Oracle Cloud Security List Configuration:")
    print("=" * 50)
    
    if public_ip:
        print(f"Option 1: Allow only your IP")
        print(f"   Source CIDR: {public_ip}/32")
        print()
        print("Option 2: Allow all IPs (less secure)")
        print("   Source CIDR: 0.0.0.0/0")
        print()
        print("Option 3: Allow private networks")
        print("   Source CIDR: 10.0.0.0/8")
        print("   Source CIDR: 172.16.0.0/12")
        print("   Source CIDR: 192.168.0.0/16")
    else:
        print("❌ Could not determine IP addresses")
        print("   Try manually finding your IP at: https://whatismyipaddress.com/")
    
    print()
    print("📝 Next Steps:")
    print("1. Use one of the CIDR options above in Oracle Cloud")
    print("2. Test connectivity after adding the rule")
    print("3. If still not working, try different CIDR ranges")

if __name__ == "__main__":
    main()
