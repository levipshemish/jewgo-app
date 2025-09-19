# IMP: Comprehensive Authentication System Verification

## Implementation Strategy
Execute comprehensive authentication verification through systematic testing of all auth flows, security policies, and monitoring systems.

## Files to Create/Modify

### New Test Files
- `backend/tests/test_auth_verification_comprehensive.py` - New comprehensive test suite
- `frontend/__tests__/auth-flows.test.tsx` - Frontend auth flow tests
- `scripts/auth-verification-suite.sh` - Automated verification script
- `scripts/auth-security-scan.py` - Security verification script

### Monitoring Scripts
- `scripts/auth-monitoring.sh` - Real-time auth monitoring
- `scripts/cookie-header-inspector.py` - Cookie/header verification
- `scripts/token-rotation-tester.py` - Token rotation verification

## Step-by-Step Implementation

### Phase 1: Environment Setup and Health Checks
1. **Server Connection Verification**
   ```bash
   ssh -i .secrets/ssh-key-2025-09-11.key ubuntu@157.151.254.18
   ```

2. **Service Health Verification**
   ```bash
   # Backend health
   curl https://api.jewgo.app/healthz
   curl https://api.jewgo.app/api/v5/auth/health
   
   # Database connectivity
   docker exec jewgo_backend python -c "from database.connection_manager import get_connection_manager; print(get_connection_manager().health_check())"
   
   # Redis connectivity
   docker exec jewgo_redis redis-cli ping
   ```

3. **Log Monitoring Setup**
   ```bash
   # Start log monitoring in separate terminals
   docker logs -f jewgo_backend > auth_backend.log &
   tail -f /var/log/nginx/access.log > auth_nginx.log &
   redis-cli monitor > auth_redis.log &
   ```

### Phase 2: Core Authentication Flow Testing

#### Login/Logout Testing
```python
# Test script structure
def test_login_logout_flow():
    # 1. Get CSRF token
    csrf_response = requests.get('https://api.jewgo.app/api/v5/auth/csrf')
    csrf_token = csrf_response.json()['data']['csrf_token']
    
    # 2. Login with valid credentials
    login_response = requests.post('https://api.jewgo.app/api/v5/auth/login', 
        json={'email': 'test@example.com', 'password': 'ValidPassword123!'},
        headers={'X-CSRF-Token': csrf_token},
        cookies=csrf_response.cookies
    )
    
    # 3. Verify access token in cookies
    assert 'access_token' in login_response.cookies
    assert login_response.cookies['access_token']['httponly'] == True
    
    # 4. Test authenticated request
    profile_response = requests.get('https://api.jewgo.app/api/v5/auth/profile',
        cookies=login_response.cookies
    )
    assert profile_response.status_code == 200
    
    # 5. Logout
    logout_response = requests.post('https://api.jewgo.app/api/v5/auth/logout',
        cookies=login_response.cookies,
        headers={'X-CSRF-Token': csrf_token}
    )
    
    # 6. Verify tokens cleared
    assert 'access_token' not in logout_response.cookies
    assert 'refresh_token' not in logout_response.cookies
```

#### Remember-Me Cookie Persistence
```python
def test_remember_me_persistence():
    # 1. Login with remember-me
    login_response = login_with_remember_me()
    
    # 2. Close browser session (simulate)
    # 3. Restart browser session (simulate)
    # 4. Verify refresh token still valid
    # 5. Verify automatic token refresh works
```

### Phase 3: Token Management Verification

#### Token Rotation Testing
```python
def test_token_rotation():
    # 1. Login and get initial tokens
    initial_tokens = login_user()
    
    # 2. Use refresh token to get new access token
    refresh_response = requests.post('https://api.jewgo.app/api/v5/auth/refresh',
        cookies=initial_tokens.cookies
    )
    
    # 3. Verify new tokens are different
    new_access_token = refresh_response.cookies.get('access_token')
    new_refresh_token = refresh_response.cookies.get('refresh_token')
    
    assert new_access_token != initial_tokens.cookies.get('access_token')
    assert new_refresh_token != initial_tokens.cookies.get('refresh_token')
    
    # 4. Verify old refresh token is invalidated
    old_refresh_response = requests.post('https://api.jewgo.app/api/v5/auth/refresh',
        cookies=initial_tokens.cookies
    )
    assert old_refresh_response.status_code == 401
```

#### CSRF Token Rotation
```python
def test_csrf_rotation():
    # 1. Get initial CSRF token
    csrf1 = get_csrf_token()
    
    # 2. Make state-changing request
    response = requests.post('https://api.jewgo.app/api/v5/auth/profile',
        json={'name': 'Updated Name'},
        headers={'X-CSRF-Token': csrf1['token']},
        cookies=csrf1['cookies']
    )
    
    # 3. Get new CSRF token
    csrf2 = get_csrf_token()
    
    # 4. Verify tokens are different
    assert csrf1['token'] != csrf2['token']
```

### Phase 4: Session Management Testing

#### Concurrent Sessions
```python
def test_concurrent_sessions():
    # 1. Login from multiple "devices" (different user agents)
    session1 = login_with_user_agent('Chrome/91.0')
    session2 = login_with_user_agent('Firefox/89.0')
    session3 = login_with_user_agent('Safari/14.1')
    
    # 2. List all sessions
    sessions_response = requests.get('https://api.jewgo.app/api/v5/auth/sessions',
        cookies=session1.cookies
    )
    sessions = sessions_response.json()['data']
    
    # 3. Verify all sessions are listed
    assert len(sessions) >= 3
    
    # 4. Revoke specific session
    revoke_response = requests.delete(f'https://api.jewgo.app/api/v5/auth/sessions/{sessions[0]["id"]}',
        cookies=session1.cookies
    )
    assert revoke_response.status_code == 200
    
    # 5. Verify session is revoked
    # 6. Test "revoke all sessions"
```

### Phase 5: OAuth/SAML Flow Testing

#### Google OAuth Testing
```python
def test_google_oauth_flow():
    # 1. Start OAuth flow
    start_response = requests.get('https://api.jewgo.app/api/v5/auth/google/start?returnTo=%2Fdashboard')
    
    # 2. Verify redirect to Google
    assert start_response.status_code == 302
    assert 'accounts.google.com' in start_response.headers['Location']
    
    # 3. Extract state parameter
    state = extract_state_from_url(start_response.headers['Location'])
    
    # 4. Test callback with mock authorization code
    callback_response = requests.get(f'https://api.jewgo.app/api/v5/auth/google/callback?code=mock_code&state={state}')
    
    # 5. Verify successful authentication or proper error handling
```

### Phase 6: Security Verification

#### Cookie Security Policies
```python
def test_cookie_security():
    login_response = login_user()
    
    # Verify access token cookie
    access_cookie = login_response.cookies.get('access_token')
    assert access_cookie.get('httponly') == True
    assert access_cookie.get('secure') == True  # In production
    assert access_cookie.get('samesite') == 'Lax'
    
    # Verify refresh token cookie
    refresh_cookie = login_response.cookies.get('refresh_token')
    assert refresh_cookie.get('httponly') == True
    assert refresh_cookie.get('secure') == True
    assert refresh_cookie.get('samesite') == 'Lax'
```

#### Security Headers Verification
```python
def test_security_headers():
    response = requests.get('https://api.jewgo.app/api/v5/auth/profile')
    
    # Verify security headers
    assert 'X-Content-Type-Options' in response.headers
    assert response.headers['X-Content-Type-Options'] == 'nosniff'
    assert 'X-Frame-Options' in response.headers
    assert 'Strict-Transport-Security' in response.headers
```

### Phase 7: Backend Monitoring and Logging

#### Log Analysis
```bash
# Monitor authentication events
grep -i "login\|logout\|token\|csrf" auth_backend.log | tail -50

# Check rate limiting events
grep -i "rate limit\|too many requests" auth_nginx.log | tail -20

# Monitor Redis operations
grep -i "auth\|session\|token" auth_redis.log | tail -30
```

#### Metrics Collection
```python
def collect_auth_metrics():
    # 1. Response time metrics
    # 2. Success/failure rates
    # 3. Token rotation frequency
    # 4. Session creation/destruction rates
    # 5. CSRF token usage patterns
```

### Phase 8: Automated Testing Execution

#### pytest Integration Tests
```bash
cd backend
python -m pytest tests/test_auth_comprehensive_v5.py -v --tb=short
python -m pytest tests/test_auth_verification_comprehensive.py -v
```

#### Cypress End-to-End Tests
```bash
cd frontend
npx cypress run --spec "cypress/e2e/auth-flows.cy.ts"
```

#### Performance Testing
```bash
cd ops
k6 run k6/auth-performance-test.js
```

## Rollback Plan

### If Authentication Issues Discovered
1. **Immediate Actions**
   - Document all issues found
   - Categorize by severity (critical, high, medium, low)
   - Create rollback commits for any changes made

2. **Critical Issues (Users cannot login)**
   - Immediately revert to previous working configuration
   - Restart backend services
   - Verify health checks pass
   - Notify stakeholders

3. **Non-Critical Issues**
   - Log issues for future resolution
   - Continue testing other flows
   - Prioritize fixes based on impact

### Rollback Commands
```bash
# Rollback backend code
cd /home/ubuntu/jewgo-app
git log --oneline -10  # Find last working commit
git reset --hard <commit_hash>
docker compose restart backend

# Clear Redis cache
docker exec jewgo_redis redis-cli FLUSHALL

# Restart Nginx
sudo systemctl restart nginx
```

## Success Verification
- [ ] All authentication flows tested successfully
- [ ] Security policies verified and enforced
- [ ] Token rotation works correctly
- [ ] Session management functions properly
- [ ] OAuth/SAML flows work as expected
- [ ] Backend logs show no errors or anomalies
- [ ] Performance meets baseline requirements
- [ ] All automated tests pass

## Follow-up Actions
- Document any issues found and their resolutions
- Update authentication documentation
- Schedule regular authentication verification
- Implement continuous monitoring alerts
- Plan security audit schedule
