# Scraper Endpoint Security Implementation

## Overview

This document outlines the comprehensive security implementation for scraper and admin endpoints in the JewGo app, addressing the need for IP restriction and token-based authentication.

## 🎯 **Problem Statement**

### **Security Concerns**
- ❌ **Unprotected Endpoints**: Scraper endpoints accessible without authentication
- ❌ **No IP Restrictions**: Anyone could access sensitive data operations
- ❌ **Rate Limiting Only**: Basic rate limiting insufficient for sensitive operations
- ❌ **No Audit Trail**: No logging of access attempts or security events
- ❌ **Token Management**: No centralized token management system

### **Vulnerable Endpoints**
- `/api/restaurants/fetch-missing-websites` - Fetches website data from Google Places
- `/api/admin/update-certifying-agencies` - Updates database records
- `/api/scraper/fetch-restaurant-images` - Fetches images from external APIs
- `/api/admin/generate-token` - Generates authentication tokens

## 🚀 **Solution: Multi-Layer Security System**

### **Security Layers**

#### **1. IP Restriction**
- **Whitelist Approach**: Only allow specific IP addresses
- **CIDR Support**: Support for IP ranges (e.g., `192.168.1.0/24`)
- **Environment-Based**: Different rules for development vs production
- **Proxy Support**: Handle forwarded headers from load balancers

#### **2. Token-Based Authentication**
- **Bearer Token**: Standard Authorization header format
- **Role-Based**: Different permissions for admin vs scraper tokens
- **Secure Generation**: Cryptographically secure token generation
- **Environment Variables**: Tokens stored in environment variables

#### **3. Request Validation**
- **Input Validation**: Validate request data structure
- **Type Checking**: Ensure correct data types
- **Required Fields**: Enforce required parameters
- **Sanitization**: Clean and validate input data

#### **4. Comprehensive Logging**
- **Security Events**: Log all security-related events
- **Access Attempts**: Track successful and failed access
- **Audit Trail**: Complete audit trail for compliance
- **Performance Monitoring**: Track endpoint performance

## 🔧 **Implementation Details**

### **Core Security Components**

#### **1. SecurityManager Class**
```python
# backend/utils/security.py
class SecurityManager:
    def __init__(self):
        self.allowed_ips = self._load_allowed_ips()
        self.admin_tokens = self._load_admin_tokens()
        self.scraper_tokens = self._load_scraper_tokens()
        self.rate_limit_config = self._load_rate_limit_config()
```

#### **2. Security Decorators**
```python
# IP Restriction
@require_ip_restriction
def protected_endpoint():
    pass

# Token Authentication
@require_scraper_auth
def scraper_endpoint():
    pass

@require_admin_auth
def admin_endpoint():
    pass

# Request Validation
@validate_request_data(required_fields=['field1'], optional_fields=['field2'])
def validated_endpoint():
    pass

# Request Logging
@log_request
def logged_endpoint():
    pass
```

### **Environment Configuration**

#### **Required Environment Variables**
```bash
# Authentication Tokens
ADMIN_TOKEN=your_admin_token_here
SCRAPER_TOKEN=your_scraper_token_here

# Allowed IP Addresses (comma-separated)
ALLOWED_IPS=127.0.0.1,192.168.1.0/24,10.0.0.0/8

# Rate Limiting Configuration
SCRAPER_RATE_LIMIT_HOUR=100
ADMIN_RATE_LIMIT_HOUR=50
IP_RATE_LIMIT_HOUR=1000
TOKEN_RATE_LIMIT_HOUR=500

# Environment
ENVIRONMENT=production
```

### **Protected Endpoints**

#### **1. Scraper Endpoints**
```python
@app.route('/api/restaurants/fetch-missing-websites', methods=['POST'])
@limiter.limit("10 per hour")
@require_ip_restriction
@require_scraper_auth
@validate_request_data(optional_fields=['limit', 'dry_run'])
@log_request
def fetch_missing_websites():
    """Fetch website links for restaurants that don't have them."""
```

#### **2. Admin Endpoints**
```python
@app.route('/api/admin/update-certifying-agencies', methods=['POST'])
@limiter.limit("5 per hour")
@require_ip_restriction
@require_admin_auth
@validate_request_data(optional_fields=['dry_run'])
@log_request
def update_certifying_agencies():
    """Update all restaurants with 'Kosher Miami' certifying agency to 'KM'."""
```

#### **3. Token Management**
```python
@app.route('/api/admin/generate-token', methods=['POST'])
@limiter.limit("5 per hour")
@require_ip_restriction
@require_admin_auth
@validate_request_data(required_fields=['token_type'], optional_fields=['permissions'])
@log_request
def generate_token():
    """Generate a new authentication token."""
```

## 🔐 **Security Features**

### **1. IP Restriction**
- **Whitelist Management**: Centralized IP whitelist management
- **CIDR Support**: Support for IP ranges and subnets
- **Proxy Handling**: Proper handling of forwarded headers
- **Environment Awareness**: Different rules for different environments

### **2. Token Authentication**
- **Bearer Token Format**: Standard `Authorization: Bearer <token>` format
- **Role-Based Permissions**: Different permissions for different token types
- **Secure Storage**: Tokens stored in environment variables
- **Token Generation**: Secure token generation with proper entropy

### **3. Request Validation**
- **Schema Validation**: Validate request data structure
- **Type Checking**: Ensure correct data types
- **Required Fields**: Enforce required parameters
- **Input Sanitization**: Clean and validate input data

### **4. Comprehensive Logging**
- **Security Events**: Log all security-related events
- **Access Tracking**: Track successful and failed access attempts
- **Audit Trail**: Complete audit trail for compliance
- **Performance Monitoring**: Track endpoint performance

## 📊 **Usage Examples**

### **1. Setting Up Security**

#### **Generate Security Environment**
```bash
# Generate security environment file
python scripts/setup_security.py --generate-env

# This will create a .env.security file with:
# - Admin and scraper tokens
# - Allowed IP addresses
# - Rate limiting configuration
```

#### **Validate Configuration**
```bash
# Validate current security configuration
python scripts/setup_security.py --validate
```

#### **Test Endpoint Security**
```bash
# Test endpoint security configuration
python scripts/setup_security.py --test-endpoints
```

### **2. Using Protected Endpoints**

#### **Scraper Endpoint Example**
```bash
# Fetch missing websites
curl -X POST https://jewgo-app-oyoh.onrender.com/api/restaurants/fetch-missing-websites \
  -H 'Authorization: Bearer your_scraper_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"limit": 5, "dry_run": true}'
```

#### **Admin Endpoint Example**
```bash
# Update certifying agencies
curl -X POST https://jewgo-app-oyoh.onrender.com/api/admin/update-certifying-agencies \
  -H 'Authorization: Bearer your_admin_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"dry_run": true}'
```

#### **Python Examples**
```python
import requests

# Scraper request
headers = {
    'Authorization': f'Bearer {scraper_token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://jewgo-app-oyoh.onrender.com/api/restaurants/fetch-missing-websites',
    headers=headers,
    json={'limit': 5, 'dry_run': True}
)

# Admin request
admin_headers = {
    'Authorization': f'Bearer {admin_token}',
    'Content-Type': 'application/json'
}

response = requests.post(
    'https://jewgo-app-oyoh.onrender.com/api/admin/update-certifying-agencies',
    headers=admin_headers,
    json={'dry_run': True}
)
```

### **3. Token Management**

#### **Generate Additional Tokens**
```bash
# Generate additional admin tokens
python scripts/setup_security.py --generate-tokens admin --token-count 3

# Generate additional scraper tokens
python scripts/setup_security.py --generate-tokens scraper --token-count 2
```

#### **Generate Token via API**
```bash
# Generate new scraper token via API
curl -X POST https://jewgo-app-oyoh.onrender.com/api/admin/generate-token \
  -H 'Authorization: Bearer your_admin_token_here' \
  -H 'Content-Type: application/json' \
  -d '{"token_type": "scraper"}'
```

## 🛡️ **Security Best Practices**

### **1. Token Management**
- **Secure Storage**: Store tokens in environment variables, not in code
- **Regular Rotation**: Rotate tokens regularly
- **Limited Scope**: Use tokens with minimal required permissions
- **Secure Transmission**: Always use HTTPS for token transmission

### **2. IP Restriction**
- **Whitelist Only**: Use whitelist approach, not blacklist
- **Regular Review**: Regularly review and update allowed IPs
- **Environment Separation**: Different IP rules for different environments
- **Documentation**: Document all allowed IPs and their purposes

### **3. Monitoring and Logging**
- **Security Events**: Monitor all security-related events
- **Access Patterns**: Monitor access patterns for anomalies
- **Failed Attempts**: Track and investigate failed access attempts
- **Performance Impact**: Monitor performance impact of security measures

### **4. Error Handling**
- **Generic Errors**: Don't leak sensitive information in error messages
- **Proper Status Codes**: Use appropriate HTTP status codes
- **Logging**: Log all security events for audit purposes
- **Rate Limiting**: Implement proper rate limiting to prevent abuse

## 📈 **Security Metrics**

### **1. Access Metrics**
- **Successful Requests**: Track successful authenticated requests
- **Failed Attempts**: Track failed authentication attempts
- **IP Violations**: Track IP restriction violations
- **Token Usage**: Track token usage patterns

### **2. Performance Metrics**
- **Response Times**: Monitor impact on response times
- **Error Rates**: Track error rates for protected endpoints
- **Rate Limit Hits**: Monitor rate limit violations
- **Resource Usage**: Track resource usage for security operations

### **3. Security Metrics**
- **Token Rotation**: Track token rotation frequency
- **IP Changes**: Track IP whitelist changes
- **Security Events**: Track security event frequency
- **Compliance**: Track compliance with security policies

## 🔄 **Deployment Checklist**

### **1. Pre-Deployment**
- [ ] Generate secure tokens
- [ ] Configure allowed IP addresses
- [ ] Set up environment variables
- [ ] Test security configuration
- [ ] Review rate limiting settings

### **2. Deployment**
- [ ] Deploy security utilities
- [ ] Update endpoint decorators
- [ ] Configure logging
- [ ] Test protected endpoints
- [ ] Monitor initial access

### **3. Post-Deployment**
- [ ] Monitor security events
- [ ] Review access logs
- [ ] Adjust rate limits if needed
- [ ] Update IP whitelist if needed
- [ ] Document security procedures

## 🚨 **Security Incident Response**

### **1. Detection**
- **Automated Monitoring**: Automated detection of security events
- **Manual Review**: Regular manual review of security logs
- **Alert System**: Alert system for suspicious activity
- **Escalation Procedures**: Clear escalation procedures

### **2. Response**
- **Immediate Actions**: Immediate actions to contain threats
- **Investigation**: Thorough investigation of security incidents
- **Communication**: Clear communication with stakeholders
- **Documentation**: Complete documentation of incidents

### **3. Recovery**
- **Token Rotation**: Rotate compromised tokens
- **IP Updates**: Update IP whitelist if needed
- **System Hardening**: Additional security measures if needed
- **Lessons Learned**: Document lessons learned

## 📚 **Additional Resources**

### **1. Security Documentation**
- **API Security**: Best practices for API security
- **Token Management**: Secure token management practices
- **IP Restriction**: IP restriction implementation guide
- **Monitoring**: Security monitoring and alerting

### **2. Tools and Utilities**
- **Security Setup Script**: `scripts/setup_security.py`
- **Token Generator**: Built-in token generation utilities
- **Validation Tools**: Request validation utilities
- **Monitoring Tools**: Security monitoring utilities

### **3. Compliance**
- **Audit Trail**: Complete audit trail for compliance
- **Access Logs**: Comprehensive access logging
- **Security Policies**: Documented security policies
- **Incident Response**: Documented incident response procedures

---

This comprehensive security implementation ensures that all scraper and admin endpoints are properly protected with IP restriction, token-based authentication, request validation, and comprehensive logging. The multi-layer approach provides robust security while maintaining usability and performance. 