"""
Enhanced JWT + RBAC authentication middleware for v5 API.

Provides comprehensive authentication with enhanced JWT validation, automatic refresh
detection, RBAC permission checking, PII masking for logs, and request context
population. Built upon existing auth patterns but with v5 enhancements.
"""

from __future__ import annotations

import time
import re
from typing import Optional, Dict, Any, List
from functools import wraps

from flask import g, request, jsonify

from utils.logging_config import get_logger
from utils.postgres_auth import get_postgres_auth
from services.auth.token_manager_v5 import TokenManagerV5
from utils.rbac import RoleBasedAccessControl

logger = get_logger(__name__)


class AuthV5Middleware:
    """Enhanced authentication middleware for v5 API with PII masking and improved security."""
    
    # Patterns for PII masking in logs
    PII_PATTERNS = {
        'email': re.compile(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'),
        'phone': re.compile(r'(\+?1?[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})'),
        'address': re.compile(r'\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Circle|Cir|Way|Plaza|Pl)'),
    }
    
    def __init__(self, app=None):
        self.app = app
        self.rbac = RoleBasedAccessControl()
        self.token_manager_v5 = TokenManagerV5()
        if app is not None:
            self.init_app(app)
    
    def init_app(self, app):
        """Initialize the middleware with Flask app."""
        self.app = app
        self._register_middleware()
    
    def _register_middleware(self):
        """Register before/after request hooks for v5 authentication."""
        
        @self.app.before_request
        def _v5_auth_context_loader():
            """Enhanced authentication context loader for v5 API."""
            # Skip non-v5 endpoints unless specifically enabled
            if not self._should_apply_v5_auth():
                return
            
            try:
                token = self._extract_token_from_request(request)
                if not token:
                    self._set_unauthenticated_context()
                    return
                
                # Verify using TokenManagerV5 for consistent claims
                payload = self.token_manager_v5.verify_token(token)
                if not payload or payload.get('type') != 'access':
                    self._set_unauthenticated_context()
                    self._log_auth_event("Invalid token provided", level='warning')
                    return

                uid = payload.get('uid')
                if not uid:
                    self._set_unauthenticated_context()
                    self._log_auth_event("Token missing uid", level='warning')
                    return

                # Load user info (email + roles) from DB
                user_info = self._load_user_info(uid, payload)
                if not user_info:
                    self._set_unauthenticated_context()
                    self._log_auth_event("User not found for token", level='warning')
                    return

                # Enhanced context population with v5 features
                self._populate_auth_context(user_info)
                
                # Enhanced automatic refresh with improved detection
                try:
                    self._attempt_enhanced_refresh(auth_manager, user_info)
                except Exception as e:
                    logger.debug(f"Enhanced auto-refresh check failed: {self._mask_pii(str(e))}")
                
            except Exception as e:
                logger.error(f"V5 auth middleware error: {self._mask_pii(str(e))}")
                self._set_unauthenticated_context()
        
        @self.app.after_request
        def _v5_attach_enhanced_cookies(resp):
            """Enhanced cookie attachment with security improvements."""
            try:
                if getattr(g, '_auth_v5_set_cookie', None):
                    from services.auth.cookies import set_auth
                    at, rt, ttl = g._auth_v5_set_cookie
                    set_auth(resp, at, rt, int(ttl))
                    
                    # Enhanced security headers
                    resp.headers['X-Frame-Options'] = 'DENY'
                    resp.headers['X-Content-Type-Options'] = 'nosniff'
                    resp.headers['X-XSS-Protection'] = '1; mode=block'
                    
                    logger.debug("V5 auth middleware attached enhanced cookies with security headers")
                    del g._auth_v5_set_cookie
                    
                # Add request correlation ID for tracing
                if hasattr(g, 'correlation_id'):
                    resp.headers['X-Correlation-ID'] = g.correlation_id
                    
            except Exception as e:
                logger.debug(f"V5 cookie attach error: {self._mask_pii(str(e))}")
            
            return resp

    def _load_user_info(self, uid: str, payload: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Load user info (email, roles) from DB for context population."""
        try:
            auth_manager = get_postgres_auth()
            with auth_manager.db.connection_manager.session_scope() as session:
                from sqlalchemy import text
                row = session.execute(
                    text(
                        """
                        SELECT u.id, u.email, u.name, u.email_verified,
                               COALESCE(
                                   JSON_AGG(
                                       JSON_BUILD_OBJECT(
                                           'role', ur.role,
                                           'level', ur.level,
                                           'granted_at', ur.created_at,
                                           'expires_at', ur.expires_at
                                       )
                                   ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                                   '[]'
                               ) AS roles
                        FROM users u 
                        LEFT JOIN user_roles ur ON u.id = ur.user_id
                        WHERE u.id = :uid AND u.is_active = TRUE
                        GROUP BY u.id, u.email, u.name, u.email_verified
                        """
                    ),
                    {"uid": uid},
                ).fetchone()
            if not row:
                return None
            import json as _json
            roles = _json.loads(row.roles) if row.roles else []
            return {
                'user_id': row.id,
                'email': row.email,
                'name': row.name,
                'email_verified': row.email_verified,
                'roles': roles,
                'token_payload': payload,
            }
        except Exception as e:
            logger.debug(f"Failed to load user info: {e}")
            return None
    
    def _should_apply_v5_auth(self) -> bool:
        """Determine if v5 authentication should be applied to current request."""
        # Apply to v5 endpoints
        if request.path.startswith('/api/v5/'):
            return True
        
        # Apply to endpoints with v5 feature flag enabled
        try:
            from utils.feature_flags_v5 import FeatureFlagsV5
            feature_flags = FeatureFlagsV5()
            return feature_flags.is_enabled('auth_v5_for_legacy', default=False)
        except ImportError:
            return False
    
    def _extract_token_from_request(self, request) -> Optional[str]:
        """Enhanced token extraction with improved validation."""
        # Try Authorization header first
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            if self._validate_token_format(token):
                return token
        
        # Fallback to cookies
        token = request.cookies.get('access_token')
        if token and self._validate_token_format(token):
            return token
        
        return None
    
    def _validate_token_format(self, token: str) -> bool:
        """Validate JWT token format without full verification."""
        if not token or len(token) < 10:
            return False
        
        # Basic JWT structure check (header.payload.signature)
        parts = token.split('.')
        return len(parts) == 3 and all(len(part) > 0 for part in parts)
    
    def _populate_auth_context(self, user_info: Dict[str, Any]):
        """Enhanced context population with v5 features."""
        # Standard context
        g.user = user_info
        g.user_id = user_info.get('user_id')
        g.user_roles = user_info.get('roles', [])
        g.user_email = user_info.get('email')
        
        # Enhanced v5 context
        g.user_permissions = self.rbac.get_user_permissions(g.user_roles)
        g.max_role_level = self.rbac.get_max_role_level(g.user_roles)
        g.is_admin = self.rbac.is_admin(g.user_roles)
        g.is_moderator = self.rbac.is_moderator(g.user_roles)
        
        # Request correlation ID for tracing
        g.correlation_id = self._generate_correlation_id()
        
        # Rate limiting context
        g.rate_limit_key = f"user:{g.user_id}"
        g.rate_limit_tier = self._get_rate_limit_tier(g.user_roles)
        
        self._log_auth_event(f"User authenticated: {self._mask_pii(g.user_email)}")
    
    def _set_unauthenticated_context(self):
        """Set context for unauthenticated requests."""
        g.user = None
        g.user_id = None
        g.user_roles = []
        g.user_permissions = set()
        g.max_role_level = 0
        g.is_admin = False
        g.is_moderator = False
        g.correlation_id = self._generate_correlation_id()
        g.rate_limit_key = f"ip:{self._get_client_ip()}"
        g.rate_limit_tier = 'anonymous'
    
    def _attempt_enhanced_refresh(self, auth_manager, user_info) -> None:
        """Enhanced token refresh with improved security and validation."""
        from services.auth.sessions import rotate_or_reject
        
        # Configurable refresh window (default 2 minutes)
        refresh_window = int(__import__('os').getenv('ACCESS_REFRESH_WINDOW_SECONDS', '120'))
        
        payload = user_info.get('token_payload') or {}
        exp: Optional[int] = payload.get('exp')
        uid: Optional[str] = payload.get('user_id') or payload.get('uid')
        
        if not exp or not uid:
            return
        
        now = int(time.time())
        if (exp - now) > refresh_window:
            return  # Not near expiry
        
        # Enhanced refresh token validation
        rt = request.cookies.get('refresh_token')
        if not rt or not self._validate_token_format(rt):
            return
        
        rt_payload = self.token_manager_v5.verify_token(rt)
        if not rt_payload or rt_payload.get('type') != 'refresh':
            return
        
        sid = rt_payload.get('sid')
        fid = rt_payload.get('fid')
        if not sid or not fid:
            return
        
        # Enhanced session validation
        user_agent = self._get_masked_user_agent()
        client_ip = self._get_client_ip()
        
        rotate_res = rotate_or_reject(
            auth_manager.db,
            user_id=uid,
            provided_refresh=rt,
            sid=sid,
            fid=fid,
            user_agent=user_agent,
            ip=client_ip,
            ttl_seconds=int(__import__('os').getenv('REFRESH_TTL_SECONDS', str(45 * 24 * 3600))),
        )
        
        if not rotate_res:
            logger.warning(f"Refresh token reuse detected - family revoked for user {self._mask_pii(uid)}")
            return
        
        new_sid, new_rt, new_rt_ttl = rotate_res
        
        # Enhanced access token minting with role consistency
        new_access, access_ttl = self._mint_enhanced_access_token(auth_manager, uid)
        
        # Store for cookie attachment
        g._auth_v5_set_cookie = (new_access, new_rt, access_ttl)
        
        logger.info(f"Enhanced token refresh completed for user {self._mask_pii(uid)}")
    
    def _mint_enhanced_access_token(self, auth_manager, uid: str):
        """Mint enhanced access token with improved role consistency using TokenManagerV5."""
        
        # Enhanced role and permission query
        with auth_manager.db.connection_manager.session_scope() as session:
            from sqlalchemy import text
            row = session.execute(
                text("""
                    SELECT u.email, u.is_guest,
                           COALESCE(
                               JSON_AGG(
                                   JSON_BUILD_OBJECT(
                                       'role', ur.role,
                                       'level', ur.level,
                                       'granted_at', ur.created_at,
                                       'expires_at', ur.expires_at
                                   )
                               ) FILTER (WHERE ur.is_active = TRUE AND (ur.expires_at IS NULL OR ur.expires_at > NOW())),
                               '[]'
                           ) AS roles
                    FROM users u 
                    LEFT JOIN user_roles ur ON u.id = ur.user_id
                    WHERE u.id = :uid AND u.is_active = TRUE
                    GROUP BY u.email, u.is_guest
                """),
                {"uid": uid},
            ).fetchone()
        
        if not row:
            raise ValueError(f"User not found or inactive: {uid}")
        
        email = row.email
        is_guest = row.is_guest or False
        
        import json as _json
        roles = _json.loads(row.roles) if row and row.roles else []
        
        return self.token_manager_v5.mint_access_token(uid, email, roles)
    
    def _get_rate_limit_tier(self, user_roles: List[Dict[str, Any]]) -> str:
        """Determine rate limit tier based on user roles."""
        max_level = self.rbac.get_max_role_level(user_roles)
        
        if max_level >= 99:  # super_admin
            return 'unlimited'
        elif max_level >= 10:  # admin
            return 'admin'
        elif max_level >= 5:  # moderator
            return 'moderator'
        elif max_level >= 2:  # premium_user
            return 'premium'
        elif max_level >= 1:  # user
            return 'standard'
        else:
            return 'guest'
    
    def _generate_correlation_id(self) -> str:
        """Generate correlation ID for request tracing."""
        import uuid
        return str(uuid.uuid4())[:8]
    
    def _get_client_ip(self) -> str:
        """Enhanced client IP detection with proxy support."""
        # Check X-Forwarded-For header
        xff = request.headers.get('X-Forwarded-For')
        if xff:
            # Get first IP from comma-separated list
            ip = xff.split(',')[0].strip()
            if self._validate_ip(ip):
                return ip
        
        # Check X-Real-IP header
        real_ip = request.headers.get('X-Real-IP')
        if real_ip and self._validate_ip(real_ip):
            return real_ip
        
        # Fallback to remote_addr
        return request.remote_addr or 'unknown'
    
    def _get_masked_user_agent(self) -> str:
        """Get masked user agent for privacy."""
        ua = request.headers.get('User-Agent', 'unknown')
        # Mask version numbers for privacy
        import re
        return re.sub(r'\d+\.\d+\.\d+', 'x.x.x', ua)
    
    def _validate_ip(self, ip: str) -> bool:
        """Validate IP address format."""
        import ipaddress
        try:
            ipaddress.ip_address(ip)
            return True
        except ValueError:
            return False
    
    def _mask_pii(self, text: str) -> str:
        """Mask personally identifiable information in log messages."""
        if not text:
            return text
        
        masked = text
        
        # Mask email addresses
        masked = self.PII_PATTERNS['email'].sub(lambda m: m.group().split('@')[0][:2] + '***@' + m.group().split('@')[1], masked)
        
        # Mask phone numbers
        masked = self.PII_PATTERNS['phone'].sub('***-***-****', masked)
        
        # Mask addresses
        masked = self.PII_PATTERNS['address'].sub('[ADDRESS]', masked)
        
        return masked
    
    def _log_auth_event(self, message: str, level: str = 'debug', **kwargs):
        """Log authentication event with structured logging."""
        log_data = {
            'event_type': 'auth_v5',
            'correlation_id': getattr(g, 'correlation_id', None),
            'user_id': self._mask_pii(str(getattr(g, 'user_id', None))),
            'endpoint': request.path,
            'method': request.method,
            'ip': self._get_client_ip(),
            **kwargs
        }
        
        getattr(logger, level)(f"{message} | {log_data}")


def register_auth_v5_middleware(app) -> None:
    """Register v5 authentication middleware with Flask app."""
    auth_middleware = AuthV5Middleware(app)
    logger.info("V5 authentication middleware registered successfully")


# Enhanced RBAC decorators for v5
def require_auth_v5(f):
    """Enhanced authentication decorator for v5 API."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED',
                'correlation_id': getattr(g, 'correlation_id', None)
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


def require_permission_v5(permission: str):
    """Enhanced permission decorator for v5 API."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user') or g.user is None:
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'AUTH_REQUIRED',
                    'correlation_id': getattr(g, 'correlation_id', None)
                }), 401
            
            user_permissions = getattr(g, 'user_permissions', set())
            if permission not in user_permissions and 'all' not in user_permissions:
                return jsonify({
                    'error': 'Insufficient permissions',
                    'code': 'PERMISSION_DENIED',
                    'required_permission': permission,
                    'correlation_id': getattr(g, 'correlation_id', None)
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_role_level_v5(level: int):
    """Enhanced role level decorator for v5 API."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'user') or g.user is None:
                return jsonify({
                    'error': 'Authentication required',
                    'code': 'AUTH_REQUIRED',
                    'correlation_id': getattr(g, 'correlation_id', None)
                }), 401
            
            max_role_level = getattr(g, 'max_role_level', 0)
            if max_role_level < level:
                return jsonify({
                    'error': 'Insufficient role level',
                    'code': 'ROLE_LEVEL_DENIED',
                    'required_level': level,
                    'user_level': max_role_level,
                    'correlation_id': getattr(g, 'correlation_id', None)
                }), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def require_admin_v5(f):
    """Enhanced admin decorator for v5 API."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'user') or g.user is None:
            return jsonify({
                'error': 'Authentication required',
                'code': 'AUTH_REQUIRED',
                'correlation_id': getattr(g, 'correlation_id', None)
            }), 401
        
        if not getattr(g, 'is_admin', False):
            return jsonify({
                'error': 'Admin access required',
                'code': 'ADMIN_REQUIRED',
                'correlation_id': getattr(g, 'correlation_id', None)
            }), 403
        
        return f(*args, **kwargs)
    
    return decorated_function


def optional_auth_v5(f):
    """Enhanced optional authentication decorator for v5 API."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Authentication is handled by middleware, just proceed
        return f(*args, **kwargs)
    
    return decorated_function
