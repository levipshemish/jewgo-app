"""
Email service for authentication system.

This module provides email sending functionality for password resets,
email verification, and other authentication-related notifications.
Supports multiple email providers (SMTP, SendGrid, Mailgun, etc.).
"""

import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict
from utils.logging_config import get_logger

logger = get_logger(__name__)


class EmailServiceError(Exception):
    """Exception raised for email service errors."""
    pass


class EmailService:
    """Email service with multiple provider support."""
    
    def __init__(self):
        self.provider = os.getenv('EMAIL_PROVIDER', 'smtp').lower()
        self.enabled = os.getenv('EMAIL_ENABLED', 'false').lower() == 'true'
        
        if not self.enabled:
            logger.info("Email service is disabled - emails will be logged instead")
    
    def send_email(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """Send email using configured provider."""
        if not self.enabled:
            logger.info(f"Email service disabled - would send email to {to_email}: {subject}")
            return True
            
        try:
            if self.provider == 'smtp':
                return self._send_smtp(to_email, subject, html_body, text_body)
            elif self.provider == 'sendgrid':
                return self._send_sendgrid(to_email, subject, html_body, text_body)
            elif self.provider == 'mailgun':
                return self._send_mailgun(to_email, subject, html_body, text_body)
            else:
                logger.error(f"Unsupported email provider: {self.provider}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def _send_smtp(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """Send email via SMTP."""
        smtp_host = os.getenv('SMTP_HOST')
        smtp_port = int(os.getenv('SMTP_PORT', '587'))
        smtp_user = os.getenv('SMTP_USER')
        smtp_password = os.getenv('SMTP_PASSWORD')
        smtp_from = os.getenv('SMTP_FROM_EMAIL', smtp_user)
        smtp_from_name = os.getenv('SMTP_FROM_NAME', 'JewGo Authentication')
        
        if not all([smtp_host, smtp_user, smtp_password]):
            logger.error("SMTP configuration incomplete")
            return False
        
        # Create message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{smtp_from_name} <{smtp_from}>"
        msg['To'] = to_email
        
        # Add text part if provided
        if text_body:
            text_part = MIMEText(text_body, 'plain')
            msg.attach(text_part)
        
        # Add HTML part
        html_part = MIMEText(html_body, 'html')
        msg.attach(html_part)
        
        # Send email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_password)
            server.send_message(msg)
        
        logger.info(f"SMTP email sent successfully to {to_email}")
        return True
    
    def _send_sendgrid(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """Send email via SendGrid API."""
        try:
            import sendgrid
            from sendgrid.helpers.mail import Mail
            
            api_key = os.getenv('SENDGRID_API_KEY')
            from_email = os.getenv('SENDGRID_FROM_EMAIL')
            
            if not all([api_key, from_email]):
                logger.error("SendGrid configuration incomplete")
                return False
            
            sg = sendgrid.SendGridAPIClient(api_key=api_key)
            
            message = Mail(
                from_email=from_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_body,
                plain_text_content=text_body
            )
            
            response = sg.send(message)
            
            if response.status_code in [200, 201, 202]:
                logger.info(f"SendGrid email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"SendGrid error: {response.status_code} - {response.body}")
                return False
                
        except ImportError:
            logger.error("SendGrid library not installed: pip install sendgrid")
            return False
        except Exception as e:
            logger.error(f"SendGrid error: {e}")
            return False
    
    def _send_mailgun(self, to_email: str, subject: str, html_body: str, text_body: Optional[str] = None) -> bool:
        """Send email via Mailgun API."""
        try:
            import requests
            
            api_key = os.getenv('MAILGUN_API_KEY')
            domain = os.getenv('MAILGUN_DOMAIN')
            from_email = os.getenv('MAILGUN_FROM_EMAIL')
            
            if not all([api_key, domain, from_email]):
                logger.error("Mailgun configuration incomplete")
                return False
            
            data = {
                "from": from_email,
                "to": [to_email],
                "subject": subject,
                "html": html_body
            }
            
            if text_body:
                data["text"] = text_body
            
            response = requests.post(
                f"https://api.mailgun.net/v3/{domain}/messages",
                auth=("api", api_key),
                data=data
            )
            
            if response.status_code == 200:
                logger.info(f"Mailgun email sent successfully to {to_email}")
                return True
            else:
                logger.error(f"Mailgun error: {response.status_code} - {response.text}")
                return False
                
        except ImportError:
            logger.error("Requests library required for Mailgun")
            return False
        except Exception as e:
            logger.error(f"Mailgun error: {e}")
            return False


class AuthEmailTemplates:
    """Email templates for authentication flows."""
    
    @staticmethod
    def password_reset_email(reset_url: str, user_name: str = "User") -> Dict[str, str]:
        """Generate password reset email."""
        subject = "Password Reset Request - JewGo"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Password Reset</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                
                <p>Hello {user_name},</p>
                
                <p>We received a request to reset your password for your JewGo account. If you made this request, click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Reset Password</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_url}</p>
                
                <p style="color: #666; margin-top: 30px;">
                    <strong>Security Note:</strong> This link will expire in 1 hour for your security.
                    If you didn't request this password reset, you can safely ignore this email.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This email was sent from JewGo Authentication System. 
                    If you have any questions, please contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Password Reset Request - JewGo
        
        Hello {user_name},
        
        We received a request to reset your password for your JewGo account.
        
        To reset your password, click this link:
        {reset_url}
        
        This link will expire in 1 hour for your security.
        
        If you didn't request this password reset, you can safely ignore this email.
        
        ---
        JewGo Authentication System
        """
        
        return {
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body
        }
    
    @staticmethod
    def email_verification_email(verification_url: str, user_name: str = "User") -> Dict[str, str]:
        """Generate email verification email."""
        subject = "Please Verify Your Email - JewGo"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Email Verification</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">Welcome to JewGo!</h2>
                
                <p>Hello {user_name},</p>
                
                <p>Thank you for creating an account with JewGo! To complete your registration and secure your account, please verify your email address by clicking the button below:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_url}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Verify Email Address</a>
                </div>
                
                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_url}</p>
                
                <p style="color: #666; margin-top: 30px;">
                    <strong>Security Note:</strong> This verification link will expire in 24 hours.
                    If you didn't create this account, you can safely ignore this email.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This email was sent from JewGo Authentication System. 
                    If you have any questions, please contact our support team.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to JewGo!
        
        Hello {user_name},
        
        Thank you for creating an account with JewGo! 
        
        To complete your registration, please verify your email address:
        {verification_url}
        
        This verification link will expire in 24 hours.
        
        If you didn't create this account, you can safely ignore this email.
        
        ---
        JewGo Authentication System
        """
        
        return {
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body
        }
    
    @staticmethod
    def oauth_welcome_email(user_name: str = "User", provider: str = "Google") -> Dict[str, str]:
        """Generate welcome email for OAuth users with password setup instructions."""
        subject = f"Welcome to JewGo - Account Created via {provider}!"
        
        frontend_url = os.getenv('FRONTEND_URL', 'https://jewgo.app')
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to JewGo</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">🎉 Welcome to JewGo!</h2>
                
                <p>Hello {user_name},</p>
                
                <p>Your JewGo account has been successfully created using your {provider} account! You can now access all of JewGo's features.</p>
                
                <div style="background-color: #e3f2fd; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <h3 style="color: #1976d2; margin-top: 0;">🔐 Set Up Direct Login (Optional)</h3>
                    <p>While you can always sign in with {provider}, you can also set up a password for direct login:</p>
                    <div style="text-align: center; margin: 15px 0;">
                        <a href="{frontend_url}/auth/forgot-password" style="background-color: #1976d2; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Set Up Password</a>
                    </div>
                    <p style="font-size: 14px; color: #666;">This will allow you to sign in directly with your email and password in the future.</p>
                </div>
                
                <p>You can now enjoy all the features of JewGo:</p>
                <ul>
                    <li>🍽️ Discover kosher restaurants and businesses</li>
                    <li>⭐ Leave reviews and ratings</li>
                    <li>📅 Find community events and services</li>
                    <li>🤝 Connect with the Jewish community</li>
                    <li>🏪 Browse the Jewish marketplace</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{frontend_url}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Exploring JewGo</a>
                </div>
                
                <p style="color: #666; margin-top: 30px;">
                    If you have any questions or need help getting started, don't hesitate to reach out to our support team.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This email was sent from JewGo Authentication System. You signed up using {provider}.
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to JewGo!
        
        Hello {user_name},
        
        Your JewGo account has been successfully created using your {provider} account! You can now access all of JewGo's features.
        
        SET UP DIRECT LOGIN (OPTIONAL):
        While you can always sign in with {provider}, you can also set up a password for direct login.
        Visit: {frontend_url}/auth/forgot-password
        This will allow you to sign in directly with your email and password in the future.
        
        You can now enjoy all the features of JewGo:
        - Discover kosher restaurants and businesses
        - Leave reviews and ratings  
        - Find community events and services
        - Connect with the Jewish community
        - Browse the Jewish marketplace
        
        Start exploring: {frontend_url}
        
        If you have any questions, please contact our support team.
        
        ---
        JewGo Authentication System
        You signed up using {provider}.
        """
        
        return {
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body
        }

    @staticmethod
    def welcome_email(user_name: str = "User") -> Dict[str, str]:
        """Generate welcome email after successful verification."""
        subject = "Welcome to JewGo - Your Account is Ready!"
        
        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Welcome to JewGo</title>
        </head>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px;">
                <h2 style="color: #333; margin-top: 0;">🎉 Welcome to JewGo!</h2>
                
                <p>Hello {user_name},</p>
                
                <p>Your email has been successfully verified and your JewGo account is now active!</p>
                
                <p>You can now enjoy all the features of JewGo:</p>
                <ul>
                    <li>Discover kosher restaurants and businesses</li>
                    <li>Leave reviews and ratings</li>
                    <li>Find community events and services</li>
                    <li>Connect with the Jewish community</li>
                </ul>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{os.getenv('FRONTEND_URL', 'https://jewgo.app')}" style="background-color: #007bff; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">Start Exploring</a>
                </div>
                
                <p style="color: #666; margin-top: 30px;">
                    If you have any questions or need help getting started, don't hesitate to reach out to our support team.
                </p>
                
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
                
                <p style="color: #999; font-size: 12px;">
                    This email was sent from JewGo Authentication System. 
                </p>
            </div>
        </body>
        </html>
        """
        
        text_body = f"""
        Welcome to JewGo!
        
        Hello {user_name},
        
        Your email has been successfully verified and your JewGo account is now active!
        
        You can now enjoy all the features of JewGo:
        - Discover kosher restaurants and businesses
        - Leave reviews and ratings  
        - Find community events and services
        - Connect with the Jewish community
        
        Start exploring: {os.getenv('FRONTEND_URL', 'https://jewgo.app')}
        
        If you have any questions, please contact our support team.
        
        ---
        JewGo Authentication System
        """
        
        return {
            "subject": subject,
            "html_body": html_body,
            "text_body": text_body
        }


# Global email service instance
email_service = EmailService()


def send_password_reset_email(email: str, reset_token: str, user_name: str = "User") -> bool:
    """Send password reset email with token."""
    frontend_url = os.getenv('FRONTEND_URL', os.getenv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000'))
    reset_url = f"{frontend_url}/auth/reset-password?token={reset_token}"
    
    template = AuthEmailTemplates.password_reset_email(reset_url, user_name)
    
    return email_service.send_email(
        to_email=email,
        subject=template["subject"],
        html_body=template["html_body"],
        text_body=template["text_body"]
    )


def send_email_verification(email: str, verification_token: str, user_name: str = "User") -> bool:
    """Send email verification email with token."""
    frontend_url = os.getenv('FRONTEND_URL', os.getenv('NEXT_PUBLIC_FRONTEND_URL', 'http://localhost:3000'))
    verification_url = f"{frontend_url}/auth/verify-email?token={verification_token}"
    
    template = AuthEmailTemplates.email_verification_email(verification_url, user_name)
    
    return email_service.send_email(
        to_email=email,
        subject=template["subject"],
        html_body=template["html_body"],
        text_body=template["text_body"]
    )


def send_oauth_welcome_email(email: str, user_name: str = "User", provider: str = "Google") -> bool:
    """Send welcome email for OAuth users with password setup instructions."""
    template = AuthEmailTemplates.oauth_welcome_email(user_name, provider)
    
    return email_service.send_email(
        to_email=email,
        subject=template["subject"],
        html_body=template["html_body"],
        text_body=template["text_body"]
    )


def send_welcome_email(email: str, user_name: str = "User") -> bool:
    """Send welcome email after successful verification."""
    template = AuthEmailTemplates.welcome_email(user_name)
    
    return email_service.send_email(
        to_email=email,
        subject=template["subject"],
        html_body=template["html_body"],
        text_body=template["text_body"]
    )