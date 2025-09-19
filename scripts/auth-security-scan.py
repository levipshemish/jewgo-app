#!/usr/bin/env python3
"""
Authentication Security Scanner
Comprehensive security verification for authentication system
"""

import requests
import json
import time
import sys
import re
from datetime import datetime
from urllib.parse import urlparse, parse_qs
from typing import Dict, List, Optional, Tuple

class AuthSecurityScanner:
    def __init__(self, api_base: str = "https://api.jewgo.app"):
        self.api_base = api_base
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'AuthSecurityScanner/1.0'
        })
        self.results = []
        self.cookies_jar = {}
        
    def log_result(self, test_name: str, passed: bool, details: str = "", severity: str = "info"):
        """Log test result"""
        result = {
            'timestamp': datetime.now().isoformat(),
            'test': test_name,
            'passed': passed,
            'details': details,
            'severity': severity
        }
        self.results.append(result)
        
        status = "PASS" if passed else "FAIL"
        severity_symbol = {
            'critical': '🔴',
            'high': '🟠', 
            'medium': '🟡',
            'low': '🔵',
            'info': 'ℹ️'
        }.get(severity, 'ℹ️')
        
        print(f"{severity_symbol} [{status}] {test_name}")
        if details:
            print(f"    {details}")
    
    def get_csrf_token(self) -> Tuple[Optional[str], Optional[requests.Response]]:
        """Get CSRF token and cookies"""
        try:
            response = self.session.get(f"{self.api_base}/api/v5/auth/csrf")
            if response.status_code == 200:
                data = response.json()
                csrf_token = data.get('data', {}).get('csrf_token')
                return csrf_token, response
            return None, response
        except Exception as e:
            return None, None
    
    def test_csrf_token_security(self):
        """Test CSRF token generation and security"""
        csrf_token, response = self.get_csrf_token()
        
        if not csrf_token:
            self.log_result("CSRF Token Generation", False, 
                          "Failed to generate CSRF token", "high")
            return
        
        # Test 1: Token should be sufficiently long and random
        if len(csrf_token) < 20:
            self.log_result("CSRF Token Length", False,
                          f"Token too short: {len(csrf_token)} chars", "medium")
        else:
            self.log_result("CSRF Token Length", True,
                          f"Token length: {len(csrf_token)} chars")
        
        # Test 2: Token should change on each request
        csrf_token2, _ = self.get_csrf_token()
        if csrf_token == csrf_token2:
            self.log_result("CSRF Token Uniqueness", False,
                          "CSRF tokens are not unique across requests", "medium")
        else:
            self.log_result("CSRF Token Uniqueness", True,
                          "CSRF tokens are unique")
        
        # Test 3: Response headers should include security headers
        headers = response.headers
        if 'Cache-Control' in headers and 'no-store' in headers['Cache-Control']:
            self.log_result("CSRF Cache Control", True,
                          "CSRF response properly prevents caching")
        else:
            self.log_result("CSRF Cache Control", False,
                          "CSRF response may be cached", "low")
    
    def test_cookie_security(self):
        """Test cookie security attributes"""
        csrf_token, response = self.get_csrf_token()
        
        if not response:
            self.log_result("Cookie Security Test", False,
                          "Could not get response to test cookies", "medium")
            return
        
        # Check Set-Cookie headers
        set_cookies = response.headers.get_all('Set-Cookie') or []
        
        for cookie_header in set_cookies:
            cookie_name = cookie_header.split('=')[0]
            
            # Test HttpOnly flag
            if 'HttpOnly' in cookie_header:
                self.log_result(f"Cookie {cookie_name} HttpOnly", True,
                              "Cookie has HttpOnly flag")
            else:
                self.log_result(f"Cookie {cookie_name} HttpOnly", False,
                              "Cookie missing HttpOnly flag", "medium")
            
            # Test Secure flag (should be present in production)
            if 'Secure' in cookie_header:
                self.log_result(f"Cookie {cookie_name} Secure", True,
                              "Cookie has Secure flag")
            elif 'localhost' not in self.api_base:
                self.log_result(f"Cookie {cookie_name} Secure", False,
                              "Production cookie missing Secure flag", "high")
            
            # Test SameSite attribute
            if 'SameSite=' in cookie_header:
                samesite_match = re.search(r'SameSite=(\w+)', cookie_header)
                if samesite_match:
                    samesite_value = samesite_match.group(1)
                    if samesite_value in ['Lax', 'Strict']:
                        self.log_result(f"Cookie {cookie_name} SameSite", True,
                                      f"SameSite={samesite_value}")
                    else:
                        self.log_result(f"Cookie {cookie_name} SameSite", False,
                                      f"Weak SameSite value: {samesite_value}", "medium")
                else:
                    self.log_result(f"Cookie {cookie_name} SameSite", False,
                                  "SameSite attribute malformed", "medium")
            else:
                self.log_result(f"Cookie {cookie_name} SameSite", False,
                              "Missing SameSite attribute", "medium")
    
    def test_security_headers(self):
        """Test HTTP security headers"""
        try:
            response = self.session.get(f"{self.api_base}/api/v5/auth/health")
            headers = response.headers
            
            # Test X-Content-Type-Options
            if headers.get('X-Content-Type-Options') == 'nosniff':
                self.log_result("X-Content-Type-Options", True, "Header set to nosniff")
            else:
                self.log_result("X-Content-Type-Options", False,
                              "Missing or incorrect X-Content-Type-Options", "medium")
            
            # Test X-Frame-Options
            if headers.get('X-Frame-Options') in ['DENY', 'SAMEORIGIN']:
                self.log_result("X-Frame-Options", True, 
                              f"Header set to {headers.get('X-Frame-Options')}")
            else:
                self.log_result("X-Frame-Options", False,
                              "Missing or weak X-Frame-Options", "medium")
            
            # Test Strict-Transport-Security (HSTS)
            if 'Strict-Transport-Security' in headers:
                hsts = headers['Strict-Transport-Security']
                if 'max-age=' in hsts and int(re.search(r'max-age=(\d+)', hsts).group(1)) > 0:
                    self.log_result("Strict-Transport-Security", True,
                                  f"HSTS enabled: {hsts}")
                else:
                    self.log_result("Strict-Transport-Security", False,
                                  "HSTS header malformed", "medium")
            else:
                self.log_result("Strict-Transport-Security", False,
                              "Missing HSTS header", "low")
            
            # Test Content-Security-Policy
            if 'Content-Security-Policy' in headers:
                self.log_result("Content-Security-Policy", True,
                              "CSP header present")
            else:
                self.log_result("Content-Security-Policy", False,
                              "Missing Content-Security-Policy", "medium")
        
        except Exception as e:
            self.log_result("Security Headers Test", False,
                          f"Error testing headers: {str(e)}", "medium")
    
    def test_rate_limiting(self):
        """Test rate limiting implementation"""
        endpoint = f"{self.api_base}/api/v5/auth/csrf"
        
        # Make rapid requests
        response_codes = []
        start_time = time.time()
        
        for i in range(20):
            try:
                response = self.session.get(endpoint, timeout=5)
                response_codes.append(response.status_code)
                
                # Check for rate limit headers
                if i == 0:  # Check headers on first request
                    if 'X-RateLimit-Limit' in response.headers:
                        self.log_result("Rate Limit Headers", True,
                                      f"Limit: {response.headers['X-RateLimit-Limit']}")
                    else:
                        self.log_result("Rate Limit Headers", False,
                                      "Missing rate limit headers", "low")
                
                time.sleep(0.1)  # Small delay between requests
                
            except Exception as e:
                response_codes.append(0)
        
        end_time = time.time()
        duration = end_time - start_time
        
        # Analyze results
        success_count = sum(1 for code in response_codes if code == 200)
        rate_limited_count = sum(1 for code in response_codes if code == 429)
        
        if rate_limited_count > 0:
            self.log_result("Rate Limiting Active", True,
                          f"{rate_limited_count}/20 requests rate limited")
        else:
            # This might be OK if the rate limit is high
            self.log_result("Rate Limiting Detection", False,
                          "No rate limiting detected in 20 requests", "low")
        
        # Calculate requests per second
        rps = len(response_codes) / duration
        self.log_result("Request Rate", True,
                      f"Processed {rps:.1f} requests/second")
    
    def test_input_validation(self):
        """Test input validation on authentication endpoints"""
        csrf_token, _ = self.get_csrf_token()
        
        if not csrf_token:
            self.log_result("Input Validation Test", False,
                          "Could not get CSRF token for testing", "medium")
            return
        
        # Test SQL injection attempts
        sql_payloads = [
            "' OR '1'='1",
            "'; DROP TABLE users; --",
            "admin'--",
            "' UNION SELECT * FROM users --"
        ]
        
        for payload in sql_payloads:
            try:
                response = self.session.post(
                    f"{self.api_base}/api/v5/auth/login",
                    json={
                        "email": payload,
                        "password": "test"
                    },
                    headers={"X-CSRF-Token": csrf_token}
                )
                
                # Should get validation error, not 500 error
                if response.status_code == 500:
                    self.log_result("SQL Injection Protection", False,
                                  f"Potential SQL injection vulnerability with payload: {payload[:20]}...", 
                                  "critical")
                    return
                    
            except Exception as e:
                pass  # Network errors are OK
        
        self.log_result("SQL Injection Protection", True,
                      "No SQL injection vulnerabilities detected")
        
        # Test XSS attempts
        xss_payloads = [
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
        ]
        
        for payload in xss_payloads:
            try:
                response = self.session.post(
                    f"{self.api_base}/api/v5/auth/register",
                    json={
                        "email": "test@example.com",
                        "password": "ValidPassword123!",
                        "name": payload
                    },
                    headers={"X-CSRF-Token": csrf_token}
                )
                
                # Check if payload is reflected unescaped
                if payload in response.text:
                    self.log_result("XSS Protection", False,
                                  f"Potential XSS vulnerability with payload: {payload[:30]}...",
                                  "high")
                    return
                    
            except Exception as e:
                pass
        
        self.log_result("XSS Protection", True,
                      "No XSS vulnerabilities detected")
    
    def test_oauth_security(self):
        """Test OAuth implementation security"""
        try:
            # Test Google OAuth start
            response = self.session.get(
                f"{self.api_base}/api/v5/auth/google/start",
                params={"returnTo": "/dashboard"},
                allow_redirects=False
            )
            
            if response.status_code == 302:
                redirect_url = response.headers.get('Location', '')
                
                # Test 1: Should redirect to Google
                if 'accounts.google.com' in redirect_url:
                    self.log_result("OAuth Provider Redirect", True,
                                  "Redirects to Google OAuth")
                else:
                    self.log_result("OAuth Provider Redirect", False,
                                  "Does not redirect to Google", "medium")
                
                # Test 2: Should include state parameter
                parsed_url = urlparse(redirect_url)
                query_params = parse_qs(parsed_url.query)
                
                if 'state' in query_params:
                    state = query_params['state'][0]
                    if len(state) > 10:
                        self.log_result("OAuth State Parameter", True,
                                      f"State parameter present: {len(state)} chars")
                    else:
                        self.log_result("OAuth State Parameter", False,
                                      "State parameter too short", "high")
                else:
                    self.log_result("OAuth State Parameter", False,
                                  "Missing state parameter", "critical")
                
                # Test 3: Should include proper scopes
                if 'scope' in query_params:
                    scopes = query_params['scope'][0]
                    if 'email' in scopes and 'profile' in scopes:
                        self.log_result("OAuth Scopes", True,
                                      f"Appropriate scopes: {scopes}")
                    else:
                        self.log_result("OAuth Scopes", False,
                                      f"Insufficient scopes: {scopes}", "medium")
                else:
                    self.log_result("OAuth Scopes", False,
                                  "Missing scope parameter", "medium")
                
            elif response.status_code == 501:
                self.log_result("OAuth Configuration", False,
                              "OAuth not configured (501 response)", "info")
            else:
                self.log_result("OAuth Endpoint", False,
                              f"Unexpected status code: {response.status_code}", "medium")
                
        except Exception as e:
            self.log_result("OAuth Security Test", False,
                          f"Error testing OAuth: {str(e)}", "medium")
    
    def test_session_security(self):
        """Test session management security"""
        # Test that sessions endpoint requires authentication
        try:
            response = self.session.get(f"{self.api_base}/api/v5/auth/sessions")
            
            if response.status_code == 401:
                self.log_result("Session Endpoint Auth", True,
                              "Sessions endpoint requires authentication")
            else:
                self.log_result("Session Endpoint Auth", False,
                              f"Sessions endpoint returned {response.status_code}", "high")
        
        except Exception as e:
            self.log_result("Session Security Test", False,
                          f"Error testing sessions: {str(e)}", "medium")
    
    def test_cors_configuration(self):
        """Test CORS configuration"""
        try:
            # Test preflight request
            response = self.session.options(
                f"{self.api_base}/api/v5/auth/login",
                headers={
                    'Origin': 'https://malicious-site.com',
                    'Access-Control-Request-Method': 'POST',
                    'Access-Control-Request-Headers': 'Content-Type'
                }
            )
            
            cors_origin = response.headers.get('Access-Control-Allow-Origin')
            
            if cors_origin == '*':
                self.log_result("CORS Configuration", False,
                              "CORS allows all origins (*)", "high")
            elif cors_origin:
                self.log_result("CORS Configuration", True,
                              f"CORS restricted to: {cors_origin}")
            else:
                # No CORS headers might be intentional
                self.log_result("CORS Configuration", True,
                              "No CORS headers (restrictive)")
        
        except Exception as e:
            self.log_result("CORS Test", False,
                          f"Error testing CORS: {str(e)}", "low")
    
    def run_all_tests(self):
        """Run all security tests"""
        print("🔍 Starting Authentication Security Scan...")
        print(f"Target: {self.api_base}")
        print("=" * 60)
        
        # Run all test methods
        test_methods = [
            self.test_csrf_token_security,
            self.test_cookie_security,
            self.test_security_headers,
            self.test_rate_limiting,
            self.test_input_validation,
            self.test_oauth_security,
            self.test_session_security,
            self.test_cors_configuration,
        ]
        
        for test_method in test_methods:
            try:
                test_method()
            except Exception as e:
                self.log_result(f"Test {test_method.__name__}", False,
                              f"Test failed with error: {str(e)}", "medium")
        
        self.generate_report()
    
    def generate_report(self):
        """Generate final security report"""
        print("\n" + "=" * 60)
        print("🔍 SECURITY SCAN REPORT")
        print("=" * 60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if r['passed'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {passed_tests/total_tests*100:.1f}%")
        
        # Count by severity
        severity_counts = {}
        for result in self.results:
            if not result['passed']:
                severity = result['severity']
                severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        if severity_counts:
            print("\nFailed Tests by Severity:")
            for severity in ['critical', 'high', 'medium', 'low', 'info']:
                if severity in severity_counts:
                    print(f"  {severity.capitalize()}: {severity_counts[severity]}")
        
        # Save detailed report
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = f"auth_security_report_{timestamp}.json"
        
        with open(report_file, 'w') as f:
            json.dump({
                'timestamp': datetime.now().isoformat(),
                'target': self.api_base,
                'summary': {
                    'total_tests': total_tests,
                    'passed_tests': passed_tests,
                    'failed_tests': failed_tests,
                    'success_rate': passed_tests/total_tests*100
                },
                'results': self.results
            }, f, indent=2)
        
        print(f"\nDetailed report saved to: {report_file}")
        
        # Return exit code based on critical/high severity failures
        critical_high_failures = sum(1 for r in self.results 
                                   if not r['passed'] and r['severity'] in ['critical', 'high'])
        
        if critical_high_failures > 0:
            print(f"\n⚠️  {critical_high_failures} critical/high severity issues found!")
            return 1
        elif failed_tests > 0:
            print(f"\n⚠️  {failed_tests} issues found (medium/low severity)")
            return 0
        else:
            print("\n✅ All security tests passed!")
            return 0

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Authentication Security Scanner")
    parser.add_argument("--api-base", default="https://api.jewgo.app",
                       help="Base URL for API (default: https://api.jewgo.app)")
    
    args = parser.parse_args()
    
    scanner = AuthSecurityScanner(args.api_base)
    exit_code = scanner.run_all_tests()
    sys.exit(exit_code)

if __name__ == "__main__":
    main()
