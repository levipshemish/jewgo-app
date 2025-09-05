from flask import Blueprint, jsonify

test_webhook_bp = Blueprint('test_webhook', __name__)

@test_webhook_bp.route('/test/webhook', methods=['GET'])
def test_webhook():
    return jsonify({'message': 'Test webhook working!'})
