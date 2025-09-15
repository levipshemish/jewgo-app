"""
Centralized error handling middleware for the Flask application.
Provides consistent error responses and logging.
"""

import os
import traceback
from typing import Dict, Any, Tuple
from flask import Flask, jsonify, request, g
from werkzeug.exceptions import HTTPException
import jwt
from utils.logging_config import get_logger

logger = get_logger(__name__)

def register_error_handlers(app: Flask):
    """Register error handlers with the Flask application."""
    
    @app.errorhandler(400)
    def bad_request(error):
        """Handle 400 Bad Request errors."""
        logger.warning("Bad request", 
                      endpoint=request.endpoint,
                      method=request.method,
                      ip=request.remote_addr,
                      error=str(error))
        
        return jsonify({
            'error': 'Bad request',
            'code': 'BAD_REQUEST',
            'message': 'The request could not be understood by the server'
        }), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        """Handle 401 Unauthorized errors."""
        logger.warning("Unauthorized access attempt", 
                      endpoint=request.endpoint,
                      method=request.method,
                      ip=request.remote_addr,
                      user_agent=request.headers.get('User-Agent', 'Unknown'))
        
        return jsonify({
            'error': 'Unauthorized',
            'code': 'UNAUTHORIZED',
            'message': 'Authentication is required to access this resource'
        }), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        """Handle 403 Forbidden errors."""
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.warning("Forbidden access attempt", 
                      endpoint=request.endpoint,
                      method=request.method,
                      ip=request.remote_addr,
                      user_id=user_id)
        
        return jsonify({
            'error': 'Forbidden',
            'code': 'FORBIDDEN',
            'message': 'You do not have permission to access this resource'
        }), 403
    
    @app.errorhandler(404)
    def not_found(error):
        """Handle 404 Not Found errors."""
        logger.info("Resource not found", 
                   endpoint=request.endpoint,
                   method=request.method,
                   path=request.path,
                   ip=request.remote_addr)
        
        return jsonify({
            'error': 'Not found',
            'code': 'NOT_FOUND',
            'message': 'The requested resource was not found'
        }), 404
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Handle 405 Method Not Allowed errors."""
        logger.warning("Method not allowed", 
                      endpoint=request.endpoint,
                      method=request.method,
                      path=request.path,
                      ip=request.remote_addr)
        
        return jsonify({
            'error': 'Method not allowed',
            'code': 'METHOD_NOT_ALLOWED',
            'message': f'The {request.method} method is not allowed for this resource'
        }), 405
    
    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        """Handle 429 Too Many Requests errors."""
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.warning("Rate limit exceeded", 
                      endpoint=request.endpoint,
                      method=request.method,
                      ip=request.remote_addr,
                      user_id=user_id)
        
        return jsonify({
            'error': 'Rate limit exceeded',
            'code': 'RATE_LIMIT_EXCEEDED',
            'message': 'Too many requests. Please try again later.',
            'retry_after': 60
        }), 429
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Handle 500 Internal Server Error."""
        correlation_id = getattr(g, 'correlation_id', 'unknown')
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.error("Internal server error", 
                    endpoint=request.endpoint,
                    method=request.method,
                    ip=request.remote_addr,
                    user_id=user_id,
                    correlation_id=correlation_id,
                    error=str(error),
                    exc_info=True)
        
        # In production, don't expose internal error details
        if os.environ.get('FLASK_ENV') == 'production':
            return jsonify({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR',
                'message': 'An unexpected error occurred. Please try again later.',
                'correlation_id': correlation_id
            }), 500
        else:
            # In development, provide more details
            return jsonify({
                'error': 'Internal server error',
                'code': 'INTERNAL_ERROR',
                'message': str(error),
                'correlation_id': correlation_id,
                'traceback': traceback.format_exc().split('\n') if os.environ.get('DEBUG') else None
            }), 500
    
    @app.errorhandler(503)
    def service_unavailable(error):
        """Handle 503 Service Unavailable errors."""
        logger.error("Service unavailable", 
                    endpoint=request.endpoint,
                    method=request.method,
                    error=str(error))
        
        return jsonify({
            'error': 'Service unavailable',
            'code': 'SERVICE_UNAVAILABLE',
            'message': 'The service is temporarily unavailable. Please try again later.'
        }), 503
    
    @app.errorhandler(jwt.ExpiredSignatureError)
    def jwt_expired(error):
        """Handle expired JWT tokens."""
        logger.info("Expired JWT token", 
                   endpoint=request.endpoint,
                   ip=request.remote_addr)
        
        return jsonify({
            'error': 'Token expired',
            'code': 'TOKEN_EXPIRED',
            'message': 'Your session has expired. Please log in again.'
        }), 401
    
    @app.errorhandler(jwt.InvalidTokenError)
    def jwt_invalid(error):
        """Handle invalid JWT tokens."""
        logger.warning("Invalid JWT token", 
                      endpoint=request.endpoint,
                      ip=request.remote_addr,
                      error=str(error))
        
        return jsonify({
            'error': 'Invalid token',
            'code': 'INVALID_TOKEN',
            'message': 'The provided token is invalid.'
        }), 401
    
    @app.errorhandler(ValueError)
    def value_error(error):
        """Handle ValueError exceptions."""
        logger.warning("Value error", 
                      endpoint=request.endpoint,
                      method=request.method,
                      error=str(error))
        
        return jsonify({
            'error': 'Invalid value',
            'code': 'INVALID_VALUE',
            'message': str(error)
        }), 400
    
    @app.errorhandler(KeyError)
    def key_error(error):
        """Handle KeyError exceptions."""
        logger.warning("Missing required field", 
                      endpoint=request.endpoint,
                      method=request.method,
                      error=str(error))
        
        return jsonify({
            'error': 'Missing required field',
            'code': 'MISSING_FIELD',
            'message': f'Required field is missing: {str(error)}'
        }), 400
    
    @app.errorhandler(Exception)
    def generic_exception(error):
        """Handle all other exceptions."""
        correlation_id = getattr(g, 'correlation_id', 'unknown')
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.error("Unhandled exception", 
                    endpoint=request.endpoint,
                    method=request.method,
                    ip=request.remote_addr,
                    user_id=user_id,
                    correlation_id=correlation_id,
                    error=str(error),
                    error_type=type(error).__name__,
                    exc_info=True)
        
        # In production, don't expose internal error details
        if os.environ.get('FLASK_ENV') == 'production':
            return jsonify({
                'error': 'An unexpected error occurred',
                'code': 'UNEXPECTED_ERROR',
                'message': 'Please try again later or contact support if the problem persists.',
                'correlation_id': correlation_id
            }), 500
        else:
            # In development, provide more details
            return jsonify({
                'error': 'Unhandled exception',
                'code': 'UNEXPECTED_ERROR',
                'message': str(error),
                'error_type': type(error).__name__,
                'correlation_id': correlation_id,
                'traceback': traceback.format_exc().split('\n') if os.environ.get('DEBUG') else None
            }), 500

class CustomException(Exception):
    """Base class for custom application exceptions."""
    
    def __init__(self, message: str, code: str = None, status_code: int = 500):
        super().__init__(message)
        self.message = message
        self.code = code or 'CUSTOM_ERROR'
        self.status_code = status_code

class ValidationError(CustomException):
    """Exception for validation errors."""
    
    def __init__(self, message: str, field: str = None):
        super().__init__(message, 'VALIDATION_ERROR', 400)
        self.field = field

class AuthenticationError(CustomException):
    """Exception for authentication errors."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(message, 'AUTHENTICATION_ERROR', 401)

class AuthorizationError(CustomException):
    """Exception for authorization errors."""
    
    def __init__(self, message: str = "Access denied"):
        super().__init__(message, 'AUTHORIZATION_ERROR', 403)

class NotFoundError(CustomException):
    """Exception for resource not found errors."""
    
    def __init__(self, message: str = "Resource not found", resource_type: str = None):
        super().__init__(message, 'NOT_FOUND', 404)
        self.resource_type = resource_type

class ConflictError(CustomException):
    """Exception for resource conflict errors."""
    
    def __init__(self, message: str = "Resource conflict"):
        super().__init__(message, 'CONFLICT', 409)

class RateLimitError(CustomException):
    """Exception for rate limiting errors."""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 60):
        super().__init__(message, 'RATE_LIMIT_EXCEEDED', 429)
        self.retry_after = retry_after

def register_custom_error_handlers(app: Flask):
    """Register handlers for custom exceptions."""
    
    @app.errorhandler(ValidationError)
    def handle_validation_error(error):
        logger.warning("Validation error", 
                      endpoint=request.endpoint,
                      field=error.field,
                      error=error.message)
        
        response = {
            'error': 'Validation failed',
            'code': error.code,
            'message': error.message
        }
        
        if error.field:
            response['field'] = error.field
        
        return jsonify(response), error.status_code
    
    @app.errorhandler(AuthenticationError)
    def handle_authentication_error(error):
        logger.warning("Authentication error", 
                      endpoint=request.endpoint,
                      ip=request.remote_addr,
                      error=error.message)
        
        return jsonify({
            'error': 'Authentication failed',
            'code': error.code,
            'message': error.message
        }), error.status_code
    
    @app.errorhandler(AuthorizationError)
    def handle_authorization_error(error):
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.warning("Authorization error", 
                      endpoint=request.endpoint,
                      user_id=user_id,
                      error=error.message)
        
        return jsonify({
            'error': 'Access denied',
            'code': error.code,
            'message': error.message
        }), error.status_code
    
    @app.errorhandler(NotFoundError)
    def handle_not_found_error(error):
        logger.info("Resource not found", 
                   endpoint=request.endpoint,
                   resource_type=error.resource_type,
                   error=error.message)
        
        response = {
            'error': 'Resource not found',
            'code': error.code,
            'message': error.message
        }
        
        if error.resource_type:
            response['resource_type'] = error.resource_type
        
        return jsonify(response), error.status_code
    
    @app.errorhandler(ConflictError)
    def handle_conflict_error(error):
        logger.warning("Resource conflict", 
                      endpoint=request.endpoint,
                      error=error.message)
        
        return jsonify({
            'error': 'Resource conflict',
            'code': error.code,
            'message': error.message
        }), error.status_code
    
    @app.errorhandler(RateLimitError)
    def handle_rate_limit_error(error):
        user_id = getattr(g, 'current_user', {}).get('id', 'anonymous')
        
        logger.warning("Rate limit exceeded", 
                      endpoint=request.endpoint,
                      user_id=user_id,
                      error=error.message)
        
        return jsonify({
            'error': 'Rate limit exceeded',
            'code': error.code,
            'message': error.message,
            'retry_after': error.retry_after
        }), error.status_code