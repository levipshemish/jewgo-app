# JWT Key Rotation Runbook

This runbook provides procedures for JWT key management, including routine rotation and emergency key revocation.

## Overview

The JewGo platform uses asymmetric JWT signing with RS256/ES256 algorithms. Keys are rotated regularly for security and can be revoked in emergency situations.

### Key Components

- **JWKS Manager**: Manages key generation, storage, and rotation
- **JWKS Endpoint**: `/.well-known/jwks.json` - Publishes public keys
- **Key Storage**: Redis with encryption (production uses KMS/HSM)
- **Rotation Script**: `scripts/rotate_jwt_keys.py`

## Routine Key Rotation

### Schedule
- **Frequency**: Every 90 days (configurable via `KEY_ROTATION_DAYS`)
- **Grace Period**: Old keys remain valid for 30 days after rotation
- **Cleanup**: Keys older than 180 days are automatically removed

### Procedure

1. **Pre-rotation Check**
   ```bash
   cd backend
   python scripts/rotate_jwt_keys.py status
   ```

2. **Perform Rotation**
   ```bash
   python scripts/rotate_jwt_keys.py rotate
   ```

3. **Verify Rotation**
   ```bash
   # Check that new key is active
   python scripts/rotate_jwt_keys.py status
   
   # Verify JWKS endpoint
   curl -s https://api.jewgo.app/.well-known/jwks.json | jq .
   ```

4. **Monitor Applications**
   - Check application logs for JWT verification errors
   - Monitor authentication metrics for anomalies
   - Verify frontend middleware can fetch new JWKS

### Automation

Set up a cron job for automatic rotation:

```bash
# Rotate JWT keys every 90 days at 2 AM UTC
0 2 1 */3 * /path/to/backend/scripts/rotate_jwt_keys.py rotate >> /var/log/jwt-rotation.log 2>&1
```

## Emergency Key Revocation

### When to Revoke

- **Key Compromise**: Private key exposed or suspected compromise
- **Security Incident**: Unauthorized access to key storage
- **Algorithm Vulnerability**: Weakness discovered in signing algorithm
- **Compliance Requirement**: Regulatory or audit requirement

### Emergency Procedure

1. **Immediate Revocation**
   ```bash
   # Revoke compromised key
   python scripts/rotate_jwt_keys.py revoke <kid> "key_compromise"
   ```

2. **Verify New Key Generated**
   ```bash
   python scripts/rotate_jwt_keys.py status
   ```

3. **Force JWKS Cache Refresh**
   ```bash
   # Clear Redis cache to force immediate JWKS refresh
   redis-cli -h <redis-host> DEL auth:jwks:public
   ```

4. **Notify Stakeholders**
   - Security team
   - DevOps team
   - Application owners

5. **Monitor Impact**
   - Check authentication failure rates
   - Monitor user complaints
   - Verify all services can authenticate

### Communication Template

```
SECURITY ALERT: JWT Key Emergency Revocation

Time: [TIMESTAMP]
Affected Key: [KID]
Reason: [REASON]
New Key: [NEW_KID]

Actions Taken:
- Revoked compromised key [KID]
- Generated new signing key [NEW_KID]
- Updated JWKS endpoint
- Cleared caches

Expected Impact:
- Brief authentication disruption (< 5 minutes)
- Automatic recovery as clients refresh JWKS

Next Steps:
- Monitor authentication metrics
- Investigate root cause
- Update security procedures if needed
```

## Troubleshooting

### Common Issues

#### No Current Key Available
```bash
# Symptoms: Authentication failures, "No current signing key" errors
# Solution: Initialize or rotate keys
python scripts/rotate_jwt_keys.py init
```

#### JWKS Endpoint Returns Empty Keys
```bash
# Check key status
python scripts/rotate_jwt_keys.py status

# Check Redis connectivity
redis-cli -h <redis-host> ping

# Regenerate JWKS cache
redis-cli -h <redis-host> DEL auth:jwks:public
```

#### Frontend Cannot Verify Tokens
```bash
# Check JWKS endpoint accessibility
curl -s https://api.jewgo.app/.well-known/jwks.json

# Verify CORS headers
curl -H "Origin: https://jewgo.app" -I https://api.jewgo.app/.well-known/jwks.json

# Check frontend JWKS cache TTL (should be 5 minutes)
```

#### High Authentication Failure Rate
```bash
# Check for clock skew issues
python scripts/rotate_jwt_keys.py status

# Verify token leeway configuration
grep JWT_LEEWAY /path/to/.env

# Check for revoked keys still in use
grep "revoked key" /var/log/auth.log
```

### Health Checks

#### Manual Health Check
```bash
python scripts/rotate_jwt_keys.py status
```

#### Automated Monitoring
```bash
# Add to monitoring system
curl -s https://api.jewgo.app/api/v5/auth/health | jq '.auth_service_status'
```

## Security Considerations

### Key Storage Security

- **Development**: Redis with basic encryption
- **Production**: AWS KMS, Azure Key Vault, or HSM
- **Backup**: Encrypted key backups in secure storage
- **Access Control**: Limit key access to authorized personnel only

### Algorithm Security

- **Current**: RS256 (RSA with SHA-256) or ES256 (ECDSA with P-256)
- **Key Size**: 2048-bit RSA minimum, 256-bit ECDSA
- **Prohibited**: HS256 (symmetric) in production environments

### Audit Trail

All key operations are logged with:
- Timestamp
- Operation type (generate, rotate, revoke)
- Key ID
- Reason (for revocations)
- Operator identity

## Configuration

### Environment Variables

```bash
# Algorithm selection
JWT_ALGORITHM=RS256              # RS256 or ES256

# Key management
KEY_ROTATION_DAYS=90            # Days between rotations
JWT_KEY_SIZE=2048               # RSA key size (2048 or 4096)

# JWKS caching
JWKS_CACHE_TTL=300              # 5 minutes cache TTL

# JWT claims
JWT_ISSUER=jewgo.app            # Token issuer
JWT_AUDIENCE=jewgo.app          # Token audience
```

### Redis Configuration

```bash
# Key storage
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=<secure_password>

# Enable persistence for key storage
# redis.conf:
save 900 1
save 300 10
save 60 10000
```

## Monitoring and Alerting

### Key Metrics

- Key rotation frequency
- Authentication success/failure rates
- JWKS endpoint response time
- Key age (alert when > 80 days old)

### Alerts

```yaml
# Prometheus alerting rules
groups:
  - name: jwt_keys
    rules:
      - alert: JWTKeyExpiringSoon
        expr: jwt_key_age_days > 80
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "JWT key expiring soon"
          
      - alert: JWTKeyRotationFailed
        expr: increase(jwt_rotation_failures_total[1h]) > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "JWT key rotation failed"
          
      - alert: JWKSEndpointDown
        expr: up{job="jwks"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "JWKS endpoint is down"
```

## Recovery Procedures

### Complete Key Loss

If all keys are lost:

1. **Generate New Keys**
   ```bash
   python scripts/rotate_jwt_keys.py init
   ```

2. **Force User Re-authentication**
   - Invalidate all existing sessions
   - Redirect users to login page
   - Communicate maintenance window

3. **Update Monitoring**
   - Reset key age metrics
   - Update rotation schedules

### Redis Failure

If Redis is unavailable:

1. **Restore from Backup**
   - Restore Redis from latest backup
   - Verify key integrity

2. **Regenerate if Needed**
   ```bash
   python scripts/rotate_jwt_keys.py init
   ```

3. **Update Applications**
   - Restart applications to refresh key cache
   - Monitor authentication recovery

## Testing

### Pre-deployment Testing

```bash
# Test key generation
python scripts/rotate_jwt_keys.py init

# Test rotation
python scripts/rotate_jwt_keys.py rotate

# Test revocation
python scripts/rotate_jwt_keys.py revoke <test_kid> "testing"

# Test JWKS endpoint
curl -s http://localhost:5000/.well-known/jwks.json | jq .
```

### Load Testing

```bash
# Test JWKS endpoint under load
ab -n 1000 -c 10 https://api.jewgo.app/.well-known/jwks.json

# Test token verification performance
# (Use application-specific load testing tools)
```

## Compliance

### SOC 2 Requirements

- Key rotation every 90 days maximum
- Audit trail for all key operations
- Secure key storage with encryption
- Access controls and monitoring

### PCI DSS (if applicable)

- Strong cryptographic keys (2048-bit minimum)
- Secure key management procedures
- Regular key rotation
- Restricted access to keys

## Contact Information

### Emergency Contacts

- **Security Team**: security@jewgo.app
- **DevOps Team**: devops@jewgo.app
- **On-call Engineer**: +1-XXX-XXX-XXXX

### Escalation Path

1. On-call Engineer
2. Security Team Lead
3. CTO
4. CEO (for major incidents)

---

**Document Version**: 1.0  
**Last Updated**: 2025-01-14  
**Next Review**: 2025-04-14