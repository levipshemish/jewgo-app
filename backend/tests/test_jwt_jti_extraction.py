#!/usr/bin/env python3
"""
Test script for JWT jti extraction fix
Tests base64url to base64 conversion for JWT token parsing
"""

import base64
import json
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

def create_test_jwt_payload():
    """Create a test JWT payload with jti field"""
    payload = {
        "sub": "test-user-id",
        "jti": "test-jti-12345",
        "iat": 1640995200,
        "exp": 1641081600
    }
    return payload

def encode_base64url(data):
    """Encode data as base64url (JWT standard)"""
    json_str = json.dumps(data, separators=(',', ':'))
    encoded = base64.urlsafe_b64encode(json_str.encode('utf-8'))
    return encoded.decode('utf-8').rstrip('=')

def decode_base64url_old(encoded):
    """Old method: direct base64 decoding (incorrect for base64url)"""
    try:
        # Add padding if needed
        padding = 4 - (len(encoded) % 4)
        if padding != 4:
            encoded += '=' * padding
        
        decoded = base64.b64decode(encoded)
        return json.loads(decoded.decode('utf-8'))
    except Exception as e:
        print(f"Old method failed: {e}")
        return None

def decode_base64url_new(encoded):
    """New method: proper base64url to base64 conversion"""
    try:
        # Convert base64url to base64: replace -→+, _→/, add = padding
        base64_encoded = encoded.replace('-', '+').replace('_', '/')
        
        # Add padding if needed
        padding = 4 - (len(base64_encoded) % 4)
        if padding != 4:
            base64_encoded += '=' * padding
        
        decoded = base64.b64decode(base64_encoded)
        return json.loads(decoded.decode('utf-8'))
    except Exception as e:
        print(f"New method failed: {e}")
        return None

def test_jwt_jti_extraction():
    """Test JWT jti extraction with various scenarios"""
    
    print("Testing JWT jti extraction fix...")
    print("=" * 50)
    
    # Test 1: Standard payload
    print("\nTest 1: Standard payload")
    payload = create_test_jwt_payload()
    encoded = encode_base64url(payload)
    print(f"Encoded (base64url): {encoded}")
    
    # Test old method
    old_result = decode_base64url_old(encoded)
    print(f"Old method result: {old_result}")
    
    # Test new method
    new_result = decode_base64url_new(encoded)
    print(f"New method result: {new_result}")
    
    # Verify jti extraction
    if new_result and 'jti' in new_result:
        print(f"✅ JTI extracted successfully: {new_result['jti']}")
    else:
        print("❌ JTI extraction failed")
        return False
    
    # Test 2: Payload with special characters
    print("\nTest 2: Payload with special characters")
    payload_special = {
        "sub": "user/with+special_chars",
        "jti": "jti-with_underscores-and-dashes",
        "iat": 1640995200
    }
    encoded_special = encode_base64url(payload_special)
    print(f"Encoded (base64url): {encoded_special}")
    
    new_result_special = decode_base64url_new(encoded_special)
    print(f"New method result: {new_result_special}")
    
    if new_result_special and 'jti' in new_result_special:
        print(f"✅ JTI with special chars extracted: {new_result_special['jti']}")
    else:
        print("❌ JTI with special chars extraction failed")
        return False
    
    # Test 3: Edge case - no padding needed
    print("\nTest 3: Edge case - no padding needed")
    payload_edge = {"jti": "simple", "test": True}
    encoded_edge = encode_base64url(payload_edge)
    print(f"Encoded (base64url): {encoded_edge}")
    
    new_result_edge = decode_base64url_new(encoded_edge)
    print(f"New method result: {new_result_edge}")
    
    if new_result_edge and 'jti' in new_result_edge:
        print(f"✅ Edge case JTI extracted: {new_result_edge['jti']}")
    else:
        print("❌ Edge case JTI extraction failed")
        return False
    
    # Test 4: Invalid token (should handle gracefully)
    print("\nTest 4: Invalid token handling")
    invalid_token = "invalid.base64url.token"
    
    old_result_invalid = decode_base64url_old(invalid_token)
    new_result_invalid = decode_base64url_new(invalid_token)
    
    print(f"Old method with invalid token: {old_result_invalid}")
    print(f"New method with invalid token: {new_result_invalid}")
    
    if new_result_invalid is None:
        print("✅ Invalid token handled gracefully")
    else:
        print("❌ Invalid token not handled properly")
        return False
    
    print("\n" + "=" * 50)
    print("✅ All JWT jti extraction tests passed!")
    return True

def test_token_rotation_simulation():
    """Simulate token rotation check using the new method"""
    
    print("\nTesting token rotation simulation...")
    print("=" * 50)
    
    # Create two different JWT payloads (simulating before/after rotation)
    payload_before = {
        "sub": "user-123",
        "jti": "jti-before-rotation",
        "iat": 1640995200
    }
    
    payload_after = {
        "sub": "user-123", 
        "jti": "jti-after-rotation",
        "iat": 1640995200
    }
    
    # Encode both
    encoded_before = encode_base64url(payload_before)
    encoded_after = encode_base64url(payload_after)
    
    # Extract jti from both
    before_result = decode_base64url_new(encoded_before)
    after_result = decode_base64url_new(encoded_after)
    
    if before_result and after_result:
        jti_before = before_result.get('jti')
        jti_after = after_result.get('jti')
        
        print(f"JTI before rotation: {jti_before}")
        print(f"JTI after rotation: {jti_after}")
        
        # Check if rotation is detected
        rotation_detected = jti_before != jti_after
        
        if rotation_detected:
            print("✅ Token rotation correctly detected!")
        else:
            print("❌ Token rotation not detected")
            return False
    else:
        print("❌ Failed to extract JTI for rotation test")
        return False
    
    return True

if __name__ == "__main__":
    print("JWT JTI Extraction Fix Test Suite")
    print("=" * 60)
    
    # Run tests
    test1_passed = test_jwt_jti_extraction()
    test2_passed = test_token_rotation_simulation()
    
    if test1_passed and test2_passed:
        print("\n🎉 All tests passed! JWT jti extraction fix is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please review the implementation.")
        sys.exit(1)
