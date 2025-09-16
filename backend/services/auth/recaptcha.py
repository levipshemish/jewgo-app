import os
import json


def _dev_bypass_enabled() -> bool:
    env = os.getenv("ENVIRONMENT", "development").lower()
    return env != "production" and os.getenv("RECAPTCHA_BYPASS_DEV", "true").lower() == "true"


def verify_or_429(request):
    """Verify reCAPTCHA token when configured.

    - Reads token from JSON body field 'recaptcha_token' or header 'X-Recaptcha-Token'
    - In non-production environments, bypass can be enabled via RECAPTCHA_BYPASS_DEV=true
    - Returns a Flask response tuple (json, status) on failure, or None on success.
    """
    from flask import jsonify
    secret = os.getenv("RECAPTCHA_SECRET_KEY")

    # If no secret configured, allow through (no-op)
    if not secret:
        return None

    # Dev bypass
    if _dev_bypass_enabled():
        return None

    try:
        token = None
        # Prefer explicit header
        token = request.headers.get("X-Recaptcha-Token")
        if not token:
            data = request.get_json(silent=True) or {}
            token = data.get("recaptcha_token")

        if not token:
            return jsonify({"error": "reCAPTCHA token missing"}), 429

        # Perform server-side verification
        import urllib.parse
        import urllib.request

        payload = urllib.parse.urlencode({
            "secret": secret,
            "response": token,
        }).encode()

        req = urllib.request.Request(
            "https://www.google.com/recaptcha/api/siteverify",
            data=payload,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            body = resp.read().decode("utf-8")
            result = json.loads(body)
            if not result.get("success"):
                return jsonify({
                    "error": "reCAPTCHA verification failed",
                    "details": result,
                }), 429

        return None
    except Exception:
        # On verification errors, fail closed in production, open in dev
        if os.getenv("ENVIRONMENT", "development").lower() == "production":
            return jsonify({"error": "reCAPTCHA verification error"}), 429
        return None

