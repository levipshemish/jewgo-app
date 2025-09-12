from flask import Blueprint, jsonify

health_bp = Blueprint("health", __name__)

@health_bp.route("/healthz")
def healthz():
    return jsonify({"ok": True})

@health_bp.route("/readyz")
def readyz():
    return jsonify({"status": "ready"})

@health_bp.route("/health")
def health():
    return jsonify({"status": "healthy"})

@health_bp.route("/livez")
def livez():
    return jsonify({"status": "alive"})
