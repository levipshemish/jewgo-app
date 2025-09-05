from flask import Blueprint, request, jsonify
import os
import subprocess
import hmac
import hashlib

deploy_webhook_bp = Blueprint('deploy_webhook', __name__)

@deploy_webhook_bp.route('/deploy', methods=['POST'])
def github_webhook():
    try:
        webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET')
        if not webhook_secret:
            return jsonify({'error': 'Webhook secret not configured'}), 500
        
        signature = request.headers.get('X-Hub-Signature-256')
        if signature:
            expected_signature = 'sha256=' + hmac.new(
                webhook_secret.encode(),
                request.data,
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return jsonify({'error': 'Invalid signature'}), 401
        
        payload = request.get_json()
        
        if request.headers.get('X-GitHub-Event') != 'push':
            return jsonify({'message': 'Event ignored'}), 200
        
        ref = payload.get('ref', '')
        if ref != 'refs/heads/main':
            return jsonify({'message': 'Not main branch'}), 200
        
        # Run deployment script
        try:
            # Execute deployment script from container
            deploy_result = subprocess.run(['/app/deploy_container.sh'], 
                                         capture_output=True, text=True, 
                                         cwd='/app', timeout=300,
                                         env={'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'})
            if deploy_result.returncode != 0:
                return jsonify({
                    'error': 'Deployment script failed', 
                    'details': deploy_result.stderr,
                    'stdout': deploy_result.stdout
                }), 500
            
            return jsonify({
                'message': 'Deployment successful',
                'output': deploy_result.stdout
            }), 200
            
        except subprocess.TimeoutExpired:
            return jsonify({'error': 'Deployment script timed out'}), 500
        except FileNotFoundError:
            return jsonify({'error': 'Deployment script not found at /app/deploy_container.sh'}), 500
        except PermissionError:
            return jsonify({'error': 'Permission denied accessing deployment script'}), 500
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deploy_webhook_bp.route('/status', methods=['GET'])
def webhook_status():
    return jsonify({
        'webhook_configured': bool(os.environ.get('GITHUB_WEBHOOK_SECRET')),
        'git_repo_exists': os.path.exists('/home/ubuntu/.git')
    })
