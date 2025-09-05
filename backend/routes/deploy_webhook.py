from flask import Blueprint, request, jsonify
import os
import subprocess
import hmac
import hashlib

deploy_webhook_bp = Blueprint('deploy_webhook', __name__)

@deploy_webhook_bp.route('/webhook/deploy', methods=['POST'])
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
        
        # Run deployment
        os.chdir('/home/ubuntu')
        
        # Git pull
        pull_result = subprocess.run(['git', 'pull', 'origin', 'main'], capture_output=True, text=True)
        if pull_result.returncode != 0:
            return jsonify({'error': 'Git pull failed', 'details': pull_result.stderr}), 500
        
        # Docker deployment
        subprocess.run(['docker-compose', 'down'], capture_output=True)
        subprocess.run(['docker-compose', 'build', '--no-cache'], capture_output=True)
        subprocess.run(['docker-compose', 'up', '-d'], capture_output=True)
        
        return jsonify({'message': 'Deployment successful'}), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@deploy_webhook_bp.route('/webhook/status', methods=['GET'])
def webhook_status():
    return jsonify({
        'webhook_configured': bool(os.environ.get('GITHUB_WEBHOOK_SECRET')),
        'git_repo_exists': os.path.exists('/home/ubuntu/.git')
    })
