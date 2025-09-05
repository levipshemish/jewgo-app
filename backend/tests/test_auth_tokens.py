import os
from services.auth import tokens


def test_mint_and_verify_access_token(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test_secret")
    tok, ttl = tokens.mint_access("user123", "u@example.com", roles=[{"role": "user", "level": 1}])
    assert isinstance(tok, str) and ttl > 0
    payload = tokens.verify(tok, expected_type="access")
    assert payload is not None
    assert payload["uid"] == "user123"
    assert payload["email"] == "u@example.com"
    assert payload["type"] == "access"
    assert "roles" in payload


def test_mint_and_verify_refresh_token_guest(monkeypatch):
    monkeypatch.setenv("JWT_SECRET_KEY", "test_secret")
    monkeypatch.setenv("GUEST_REFRESH_TTL_SECONDS", "604800")
    tok, ttl = tokens.mint_refresh("guest123", sid="sid1", fid="fid1", is_guest=True)
    assert isinstance(tok, str) and ttl == 604800
    payload = tokens.verify(tok, expected_type="refresh")
    assert payload is not None
    assert payload["uid"] == "guest123"
    assert payload["sid"] == "sid1"
    assert payload["fid"] == "fid1"
    assert payload["type"] == "refresh"

