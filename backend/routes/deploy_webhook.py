from flask import Blueprint, request, jsonify
import os, hmac, hashlib, json, logging, uuid, shutil

deploy_webhook_bp = Blueprint('deploy_webhook', __name__)
# Accept both /webhook/deploy and /webhook/deploy/
deploy_webhook_bp.strict_slashes = False
log = logging.getLogger(__name__)

def _verify_sig(secret: bytes, raw: bytes, header: str) -> bool:
    # Expect 'sha256=...'
    if not header or not header.startswith("sha256="):
        return False
    sent = header.split("=", 1)[1].strip()
    mac = hmac.new(secret, raw, hashlib.sha256).hexdigest()
    return hmac.compare_digest(mac, sent)

@deploy_webhook_bp.route('/deploy', methods=['POST'])
def github_webhook():
    try:
        req_id = uuid.uuid4().hex[:8]
        webhook_secret = os.environ.get('GITHUB_WEBHOOK_SECRET')
        if not webhook_secret:
            return jsonify({'error': 'webhook secret not configured'}), 500

        # Read once, cache for safe re-use
        raw = request.get_data(cache=True)
        signature = request.headers.get('X-Hub-Signature-256', '')
        if not _verify_sig(webhook_secret.encode('utf-8'), raw, signature):
            return jsonify({'error': 'invalid signature'}), 401

        event = request.headers.get('X-GitHub-Event', 'unknown')
        if event == 'ping':
            return jsonify({'ok': True, 'event': 'ping'}), 200

        # Parse JSON from the same raw bytes to avoid double-read bugs
        ctype = (request.headers.get('Content-Type') or '').lower()
        try:
            if ctype.startswith('application/json') or not ctype:
                payload = json.loads(raw.decode('utf-8') or '{}')
            elif ctype.startswith('application/x-www-form-urlencoded'):
                payload = json.loads((request.form.get('payload') or '{}'))
            else:
                payload = json.loads(raw.decode('utf-8') or '{}')
        except Exception:
            log.exception("[wb:%s] JSON parse failed", req_id)
            return jsonify({'error': 'invalid json payload'}), 400

        if event != 'push':
            return jsonify({'message': 'event ignored', 'event': event}), 200

        ref = (payload.get('ref') or '')
        if ref != 'refs/heads/main':
            return jsonify({'message': 'not main branch', 'ref': ref}), 200

        repo = payload.get('repository', {}).get('full_name', 'unknown')
        head = payload.get('head_commit', {}).get('id', 'unknown')
        author = payload.get('head_commit', {}).get('author', {}).get('name', 'unknown')
        log.info("[wb:%s] deploy requested repo=%s head=%s author=%s", req_id, repo, head, author)

        # ACK quickly; actual deploy should be done off-path (queue/worker)
        return jsonify({'ok': True, 'accepted': True, 'repo': repo, 'head': head, 'request_id': req_id}), 202

    except Exception as e:
        log.exception("unhandled webhook error")
        # Fail-soft to avoid GitHub retry storms; investigate via logs
        return jsonify({'ok': False, 'accepted': False, 'error': 'internal error'}), 202

@deploy_webhook_bp.route('/status', methods=['GET'])
def webhook_status():
    workdir = os.getenv('APP_WORKDIR', os.getcwd())
    return jsonify({
        'webhook_configured': bool(os.environ.get('GITHUB_WEBHOOK_SECRET')),
        'git_installed': bool(shutil.which('git')),
        'workdir': workdir,
        'git_repo_exists': os.path.isdir(os.path.join(workdir, '.git')),
    }), 200
