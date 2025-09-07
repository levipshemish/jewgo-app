#!/usr/bin/env python3
"""
Test email service functionality.

This script tests the email service configuration and sends test emails
to verify password reset, email verification, and welcome email templates.
"""

import os
import sys
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Add parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

def test_email_service():
    """Test email service functionality."""
    try:
        from services.email_service import (
            email_service, 
            send_password_reset_email,
            send_email_verification,
            send_welcome_email,
            AuthEmailTemplates
        )
        
        print('📧 Email Service Test')
        print('═' * 50)
        
        # Check email service configuration
        print(f'Email Provider: {email_service.provider}')
        print(f'Email Enabled: {email_service.enabled}')
        
        if not email_service.enabled:
            print('\n⚠️  Email service is disabled - emails will be logged instead')
            print('   Set EMAIL_ENABLED=true in .env to enable actual sending')
        
        # Test email configuration
        print('\n🔧 Configuration Check:')
        
        if email_service.provider == 'smtp':
            required_vars = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD']
            for var in required_vars:
                value = os.getenv(var)
                if value:
                    # Mask password for security
                    display_value = '*' * 8 if 'PASSWORD' in var else value
                    print(f'   ✅ {var}: {display_value}')
                else:
                    print(f'   ❌ {var}: Not configured')
        
        frontend_url = os.getenv('FRONTEND_URL', os.getenv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000'))
        print(f'   📱 Frontend URL: {frontend_url}')
        
        # Test email templates (non-interactive)
        print('\n📝 Testing Email Templates:')
        
        # Check for test email in environment or use default
        test_email = os.getenv('TEST_EMAIL')
        
        if test_email and email_service.enabled:
            print(f'\n🚀 Sending test emails to {test_email}...')
            
            # Test password reset email
            print('   1. Testing password reset email...')
            reset_success = send_password_reset_email(test_email, 'test_reset_token_123', 'Test User')
            print(f'      {"✅ Success" if reset_success else "❌ Failed"}')
            
            # Test email verification
            print('   2. Testing email verification email...')
            verify_success = send_email_verification(test_email, 'test_verify_token_456', 'Test User')
            print(f'      {"✅ Success" if verify_success else "❌ Failed"}')
            
            # Test welcome email
            print('   3. Testing welcome email...')
            welcome_success = send_welcome_email(test_email, 'Test User')
            print(f'      {"✅ Success" if welcome_success else "❌ Failed"}')
            
            if reset_success and verify_success and welcome_success:
                print(f'\n🎉 All test emails sent successfully to {test_email}!')
            else:
                print(f'\n⚠️  Some emails failed - check logs for details')
        else:
            if not email_service.enabled:
                print('   Email service disabled - testing templates only')
            else:
                print('   No TEST_EMAIL configured - set TEST_EMAIL=your@email.com to test sending')
        
        # Show template preview
        print('\n👁️  Template Preview:')
        
        # Generate sample templates
        reset_template = AuthEmailTemplates.password_reset_email(
            f"{frontend_url}/auth/reset-password?token=sample_token",
            "Sample User"
        )
        
        verify_template = AuthEmailTemplates.email_verification_email(
            f"{frontend_url}/auth/verify-email?token=sample_token", 
            "Sample User"
        )
        
        welcome_template = AuthEmailTemplates.welcome_email("Sample User")
        
        print(f'   🔑 Password Reset Subject: {reset_template["subject"]}')
        print(f'   ✉️  Verification Subject: {verify_template["subject"]}')
        print(f'   🎉 Welcome Subject: {welcome_template["subject"]}')
        
        return True
        
    except ImportError as e:
        print(f'❌ Import error: {e}')
        print('   Make sure all dependencies are installed')
        return False
    except Exception as e:
        print(f'❌ Test error: {e}')
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_email_service()
    
    if success:
        print('\n📋 Email Service Setup Complete!')
        print('   1. ✅ Templates are working')
        print('   2. 📧 Configure EMAIL_* environment variables')
        print('   3. 🧪 Test with real email addresses')
        print('   4. 🔒 Enable in production with EMAIL_ENABLED=true')
    else:
        print('\n❌ Email service test failed - check configuration')
    
    sys.exit(0 if success else 1)