#!/usr/bin/env python3
"""Test webhook API."""

from app import app

with app.test_client() as client:
    response = client.get('/api/v5/webhook/test')
    print(f'Status: {response.status_code}')
    print(f'Response: {response.get_json()}')
    
    response2 = client.get('/api/v5/webhook/status')
    print(f'Status 2: {response2.status_code}')
    print(f'Response 2: {response2.get_json()}')