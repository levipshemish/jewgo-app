"""
Secure Password Handler
======================

This module provides secure password handling with immediate hashing,
strength validation, and protection against timing attacks.
"""

import os
import secrets
import time
import hashlib
import bcrypt
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from utils.logging_config import get_logger
from utils.error_handler import ValidationError

logger = get_logger(__name__)


@dataclass
class PasswordStrengthResult:
    """Password strength validation result."""
    is_valid: bool
    score: int  # 0-100
    issues: List[str]
    suggestions: List[str]


class SecurePasswordHandler:
    """Secure password handling with immediate hashing and validation."""
    
    def __init__(self):
        # Configuration
        self.min_length = int(os.getenv("PASSWORD_MIN_LENGTH", "8"))
        self.max_length = int(os.getenv("PASSWORD_MAX_LENGTH", "128"))
        self.require_uppercase = os.getenv("PASSWORD_REQUIRE_UPPERCASE", "true").lower() == "true"
        self.require_lowercase = os.getenv("PASSWORD_REQUIRE_LOWERCASE", "true").lower() == "true"
        self.require_numbers = os.getenv("PASSWORD_REQUIRE_NUMBERS", "true").lower() == "true"
        self.require_symbols = os.getenv("PASSWORD_REQUIRE_SYMBOLS", "true").lower() == "true"
        
        # bcrypt configuration
        self.bcrypt_rounds = int(os.getenv("BCRYPT_ROUNDS", "12"))
        if os.getenv("FLASK_ENV") == "development":
            self.bcrypt_rounds = max(8, self.bcrypt_rounds - 2)  # Reduce for development
        
        # Common passwords list (simplified - in production, use a comprehensive list)
        self.common_passwords = {
            "password", "123456", "123456789", "qwerty", "abc123",
            "password123", "admin", "letmein", "welcome", "monkey",
            "1234567890", "password1", "qwerty123", "dragon", "master"
        }
        
        logger.info(f"SecurePasswordHandler initialized with {self.bcrypt_rounds} bcrypt rounds")
    
    def hash_password(self, password: str) -> str:
        """
        Hash a password using bcrypt with salt.
        
        Args:
            password: Plain text password
            
        Returns:
            Hashed password string
            
        Raises:
            ValidationError: If password is invalid
        """
        # Validate password before hashing
        validation_result = self.validate_password_strength(password)
        if not validation_result.is_valid:
            raise ValidationError(f"Password validation failed: {'; '.join(validation_result.issues)}")
        
        try:
            # Generate salt and hash password
            salt = bcrypt.gensalt(rounds=self.bcrypt_rounds)
            password_hash = bcrypt.hashpw(password.encode('utf-8'), salt)
            
            # Clear password from memory immediately
            password = None
            
            return password_hash.decode('utf-8')
            
        except Exception as e:
            logger.error(f"Error hashing password: {e}")
            raise ValidationError("Password hashing failed")
    
    def verify_password(self, password: str, password_hash: str) -> bool:
        """
        Verify a password against its hash using constant-time comparison.
        
        Args:
            password: Plain text password to verify
            password_hash: Stored password hash
            
        Returns:
            True if password matches, False otherwise
        """
        try:
            # Use bcrypt's constant-time comparison
            is_valid = bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
            
            # Clear password from memory
            password = None
            
            return is_valid
            
        except Exception as e:
            logger.error(f"Error verifying password: {e}")
            return False
    
    def validate_password_strength(self, password: str) -> PasswordStrengthResult:
        """
        Validate password strength and provide feedback.
        
        Args:
            password: Password to validate
            
        Returns:
            PasswordStrengthResult with validation details
        """
        issues = []
        suggestions = []
        score = 0
        
        # Check length
        if len(password) < self.min_length:
            issues.append(f"Password must be at least {self.min_length} characters long")
        elif len(password) > self.max_length:
            issues.append(f"Password must be no more than {self.max_length} characters long")
        else:
            score += 20
        
        # Check for common passwords
        if password.lower() in self.common_passwords:
            issues.append("Password is too common")
            suggestions.append("Use a unique password")
        else:
            score += 20
        
        # Check character requirements
        has_uppercase = any(c.isupper() for c in password)
        has_lowercase = any(c.islower() for c in password)
        has_numbers = any(c.isdigit() for c in password)
        has_symbols = any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password)
        
        if self.require_uppercase and not has_uppercase:
            issues.append("Password must contain at least one uppercase letter")
        else:
            score += 15
        
        if self.require_lowercase and not has_lowercase:
            issues.append("Password must contain at least one lowercase letter")
        else:
            score += 15
        
        if self.require_numbers and not has_numbers:
            issues.append("Password must contain at least one number")
        else:
            score += 15
        
        if self.require_symbols and not has_symbols:
            issues.append("Password must contain at least one special character")
        else:
            score += 15
        
        # Additional strength checks
        if len(password) >= 12:
            score += 10
            suggestions.append("Good password length")
        
        if len(set(password)) >= len(password) * 0.7:  # 70% unique characters
            score += 10
            suggestions.append("Good character diversity")
        
        # Check for patterns
        if self._has_common_patterns(password):
            issues.append("Password contains common patterns")
            suggestions.append("Avoid sequential or repeated characters")
        else:
            score += 10
        
        is_valid = len(issues) == 0 and score >= 60
        
        return PasswordStrengthResult(
            is_valid=is_valid,
            score=min(score, 100),
            issues=issues,
            suggestions=suggestions
        )
    
    def generate_secure_password(self, length: int = 16) -> str:
        """
        Generate a secure random password.
        
        Args:
            length: Password length (default 16)
            
        Returns:
            Generated secure password
        """
        if length < 8:
            length = 8
        elif length > 128:
            length = 128
        
        # Character sets
        lowercase = "abcdefghijklmnopqrstuvwxyz"
        uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        numbers = "0123456789"
        symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?"
        
        # Ensure at least one character from each required set
        password_chars = []
        
        if self.require_lowercase:
            password_chars.append(secrets.choice(lowercase))
        if self.require_uppercase:
            password_chars.append(secrets.choice(uppercase))
        if self.require_numbers:
            password_chars.append(secrets.choice(numbers))
        if self.require_symbols:
            password_chars.append(secrets.choice(symbols))
        
        # Fill remaining length with random characters
        all_chars = lowercase + uppercase + numbers + symbols
        for _ in range(length - len(password_chars)):
            password_chars.append(secrets.choice(all_chars))
        
        # Shuffle the password
        secrets.SystemRandom().shuffle(password_chars)
        
        return ''.join(password_chars)
    
    def secure_password_reset(self, user_id: str, new_password: str) -> Tuple[bool, str]:
        """
        Securely handle password reset with additional validation.
        
        Args:
            user_id: User ID
            new_password: New password
            
        Returns:
            Tuple of (success, message)
        """
        try:
            # Validate password strength
            validation_result = self.validate_password_strength(new_password)
            if not validation_result.is_valid:
                return False, f"Password validation failed: {'; '.join(validation_result.issues)}"
            
            # Hash the password immediately
            password_hash = self.hash_password(new_password)
            
            # Clear password from memory
            new_password = None
            
            # Log password reset event
            logger.info(f"Password reset processed for user {user_id}")
            
            return True, password_hash
            
        except Exception as e:
            logger.error(f"Error in secure password reset for user {user_id}: {e}")
            return False, "Password reset failed"
    
    def _has_common_patterns(self, password: str) -> bool:
        """Check for common password patterns."""
        password_lower = password.lower()
        
        # Sequential patterns
        sequential_patterns = [
            "123456", "abcdef", "qwerty", "asdfgh", "zxcvbn"
        ]
        
        for pattern in sequential_patterns:
            if pattern in password_lower:
                return True
        
        # Repeated characters
        if len(set(password)) < len(password) * 0.5:  # Less than 50% unique
            return True
        
        # Keyboard patterns
        keyboard_rows = [
            "qwertyuiop",
            "asdfghjkl",
            "zxcvbnm"
        ]
        
        for row in keyboard_rows:
            for i in range(len(row) - 2):
                pattern = row[i:i+3]
                if pattern in password_lower:
                    return True
        
        return False
    
    def get_password_policy(self) -> Dict[str, any]:
        """Get current password policy configuration."""
        return {
            "min_length": self.min_length,
            "max_length": self.max_length,
            "require_uppercase": self.require_uppercase,
            "require_lowercase": self.require_lowercase,
            "require_numbers": self.require_numbers,
            "require_symbols": self.require_symbols,
            "bcrypt_rounds": self.bcrypt_rounds
        }


# Global password handler instance
password_handler = SecurePasswordHandler()


def get_password_handler() -> SecurePasswordHandler:
    """Get the global password handler instance."""
    return password_handler