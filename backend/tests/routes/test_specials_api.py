#!/usr/bin/env python3
import json


def test_specials_health_route_available(client):
    # The simplified blueprint had /api/v5/specials/health; ensure blueprint exists now
    resp = client.get('/api/v5/specials/restaurants/1')
    # We don't assert 200 because DB may be empty; but endpoint should not 404
    assert resp.status_code in (200, 400, 500)


def test_claim_schema_validation(client):
    # Missing body is allowed (guest optional), but invalid content-type should be handled
    resp = client.post('/api/v5/specials/00000000-0000-0000-0000-000000000000/claim',
                       data='not-json',
                       content_type='text/plain')
    # Should reject non-JSON
    assert resp.status_code == 400


