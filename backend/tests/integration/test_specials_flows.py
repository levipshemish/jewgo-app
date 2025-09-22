#!/usr/bin/env python3
from uuid import uuid4


def test_claim_requires_json_or_guest(client):
    # Non-JSON should 400
    resp = client.post(f"/api/v5/specials/{uuid4()}/claim", data="x", content_type="text/plain")
    assert resp.status_code == 400


def test_redeem_requires_auth(client):
    # Without auth, redeem should 401 through route logic
    resp = client.post(f"/api/v5/specials/{uuid4()}/redeem", json={"claim_id": str(uuid4())})
    assert resp.status_code in (401, 400)


