#!/usr/bin/env python3
"""
Webhook signature verification service for secure webhook endpoints.
Provides HMAC-based signature verification for incoming webhook requests.
"""

import hmac
import hashlib
import time
from typing import Optional, Dict, Any
from flask import request, jsonify
from utils.logging_config import get_logger
import os

logger = get_logger(__name__)


class WebhookSignatureService:
    """Service for verifying webhook request signatures."""
    
    def __init__(self):
        self.secret_key = os.environ.get('WEBHOOK_SECRET_KEY')
        self.signature_header = 'X-Hub-Signature-256'
        self.timestamp_header = 'X-Hub-Timestamp'
        self.tolerance_seconds = 300  # 5 minutes
        
    def verify_signature(self, payload: bytes, signature: str, timestamp: Optional[str] = None) -> bool:
        """
        Verify webhook signature using HMAC-SHA256.
        
        Args:
            payload: Raw request body
            signature: Signature from X-Hub-Signature-256 header
            timestamp: Timestamp from X-Hub-Timestamp header
            
        Returns:
            bool: True if signature is valid, False otherwise
        """
        if not self.secret_key:
            logger.warning("Webhook secret key not configured")
            return False
            
        if not signature:
            logger.warning("No signature provided")
            return False
            
        # Verify timestamp if provided
        if timestamp:
            try:
                request_time = int(timestamp)
                current_time = int(time.time())
                if abs(current_time - request_time) > self.tolerance_seconds:
                    logger.warning(f"Request timestamp too old: {current_time - request_time}s ago")
                    return False
            except (ValueError, TypeError):
                logger.warning("Invalid timestamp format")
                return False
        
        # Generate expected signature
        expected_signature = self._generate_signature(payload)
        
        # Compare signatures using constant-time comparison
        return hmac.compare_digest(signature, expected_signature)
    
    def _generate_signature(self, payload: bytes) -> str:
        """Generate HMAC-SHA256 signature for payload."""
        signature = hmac.new(
            self.secret_key.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()
        return f"sha256={signature}"
    
    def verify_request(self) -> bool:
        """
        Verify the current Flask request signature.
        
        Returns:
            bool: True if signature is valid, False otherwise
        """
        signature = request.headers.get(self.signature_header)
        timestamp = request.headers.get(self.timestamp_header)
        
        # Get raw request data
        payload = request.get_data()
        
        return self.verify_signature(payload, signature, timestamp)
    
    def create_signature(self, payload: bytes) -> str:
        """
        Create signature for outgoing webhook requests.
        
        Args:
            payload: Request payload
            
        Returns:
            str: Signature string
        """
        return self._generate_signature(payload)
    
    def get_headers(self, payload: bytes) -> Dict[str, str]:
        """
        Get headers for outgoing webhook requests.
        
        Args:
            payload: Request payload
            
        Returns:
            Dict[str, str]: Headers including signature and timestamp
        """
        timestamp = str(int(time.time()))
        signature = self.create_signature(payload)
        
        return {
            self.signature_header: signature,
            self.timestamp_header: timestamp,
            'Content-Type': 'application/json'
        }


def require_webhook_signature(f):
    """
    Decorator to require valid webhook signature for endpoints.
    
    Usage:
        @require_webhook_signature
        def webhook_endpoint():
            return jsonify({'status': 'success'})
    """
    from functools import wraps
    
    @wraps(f)
    def decorated_function(*args, **kwargs):
        webhook_service = WebhookSignatureService()
        
        if not webhook_service.verify_request():
            logger.warning(
                "Invalid webhook signature",
                extra={
                    'endpoint': request.endpoint,
                    'ip': request.remote_addr,
                    'user_agent': request.headers.get('User-Agent'),
                    'signature_header': request.headers.get('X-Hub-Signature-256'),
                    'timestamp_header': request.headers.get('X-Hub-Timestamp')
                }
            )
            return jsonify({
                'error': 'Invalid signature',
                'code': 'INVALID_SIGNATURE'
            }), 401
        
        return f(*args, **kwargs)
    
    return decorated_function


# Global instance
webhook_signature_service = WebhookSignatureService()