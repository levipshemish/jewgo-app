#!/usr/bin/env python3
"""
GitHub Webhook Handler for Jewgo App Deployment
This script receives GitHub webhook events and triggers deployment
"""

import os
import json
import subprocess
import hmac
import hashlib
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# Configuration
WEBHOOK_SECRET = os.getenv('WEBHOOK_SECRET', 'your-webhook-secret-here')
DEPLOY_SCRIPT = '/app/deploy.sh'
PORT = 8080

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Handle POST requests from GitHub webhooks"""
        import sys
        print(f"Received POST request to: {self.path}", file=sys.stderr)
        print(f"Headers: {dict(self.headers)}", file=sys.stderr)
        
        # Only handle /webhook/deploy path
        if self.path != '/webhook/deploy':
            print(f"Invalid path: {self.path}", file=sys.stderr)
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'Not Found')
            return
            
        try:
            # Get the content length and read the body
            content_length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(content_length)
            print(f"Body length: {content_length}", file=sys.stderr)
            
            # Verify the webhook signature
            if not self.verify_signature(body):
                print("Signature verification failed", file=sys.stderr)
                self.send_response(401)
                self.end_headers()
                self.wfile.write(b'Unauthorized')
                return
            
            # Parse the webhook payload
            payload = json.loads(body.decode('utf-8'))
            
            # Check if this is a push to the main branch
            if self.is_main_branch_push(payload):
                print("Main branch push detected, triggering deployment...", file=sys.stderr)
                self.trigger_deployment()
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'Deployment triggered')
            else:
                print("Push to non-main branch, ignoring...", file=sys.stderr)
                self.send_response(200)
                self.end_headers()
                self.wfile.write(b'Ignored')
                
        except Exception as e:
            print(f"Error processing webhook: {e}", file=sys.stderr)
            self.send_response(500)
            self.end_headers()
            self.wfile.write(b'Internal Server Error')
    
    def verify_signature(self, body):
        """Verify the GitHub webhook signature"""
        signature = self.headers.get('X-Hub-Signature-256', '')
        if not signature.startswith('sha256='):
            return False
        
        expected_signature = 'sha256=' + hmac.new(
            WEBHOOK_SECRET.encode('utf-8'),
            body,
            hashlib.sha256
        ).hexdigest()
        
        return hmac.compare_digest(signature, expected_signature)
    
    def is_main_branch_push(self, payload):
        """Check if this is a push to the main branch"""
        return (
            payload.get('ref') == 'refs/heads/main' and
            payload.get('repository', {}).get('full_name') == 'mml555/jewgo-app'
        )
    
    def trigger_deployment(self):
        """Trigger the deployment by executing the deployment script"""
        import sys
        import subprocess
        print(f"Triggering deployment execution", file=sys.stderr)
        try:
            # Execute the deployment script directly
            result = subprocess.run(
                ['/bin/sh', '/app/deploy.sh'],
                capture_output=True,
                text=True,
                timeout=600  # 10 minute timeout
            )
            
            if result.returncode == 0:
                print("✅ Deployment completed successfully", file=sys.stderr)
                print(f"Deployment output: {result.stdout}", file=sys.stderr)
            else:
                print(f"❌ Deployment failed with return code {result.returncode}", file=sys.stderr)
                print(f"Deployment error: {result.stderr}", file=sys.stderr)
                
        except subprocess.TimeoutExpired:
            print("❌ Deployment timed out after 5 minutes", file=sys.stderr)
        except Exception as e:
            print(f"❌ Error executing deployment: {e}", file=sys.stderr)
    
    def log_message(self, format, *args):
        """Override to use print instead of stderr"""
        print(f"{self.address_string()} - {format % args}")

def run_server():
    """Run the webhook server"""
    server = HTTPServer(('0.0.0.0', PORT), WebhookHandler)
    print(f"Webhook server running on port {PORT}")
    print(f"Listening for GitHub webhooks...")
    server.serve_forever()

if __name__ == '__main__':
    run_server()
