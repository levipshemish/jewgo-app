#!/usr/bin/env python3
"""JSON Schemas for Specials API payload validation.

These schemas are used with the lightweight schema validator provided by
`middleware.security_middleware.validate_json_schema`.

Note: The validator supports type checks, required fields, and recursive
property validation. It does not enforce enums or advanced formats.
"""

# Create Special
CREATE_SPECIAL_SCHEMA = {
    "type": "object",
    "required": [
        "restaurant_id",
        "title",
        "discount_type",
        "discount_label",
        "valid_from",
        "valid_until",
    ],
    "properties": {
        "restaurant_id": {"type": "number"},
        "title": {"type": "string"},
        "subtitle": {"type": "string"},
        "description": {"type": "string"},
        "discount_type": {"type": "string"},
        "discount_value": {"type": "number"},
        "discount_label": {"type": "string"},
        "valid_from": {"type": "string"},
        "valid_until": {"type": "string"},
        "max_claims_total": {"type": "number"},
        "max_claims_per_user": {"type": "number"},
        "per_visit": {"type": "boolean"},
        "requires_code": {"type": "boolean"},
        "code_hint": {"type": "string"},
        "terms": {"type": "string"},
        "hero_image_url": {"type": "string"},
        "media_items": {
            "type": "array",
            "properties": {
                "items": {
                    "type": "object",
                    "required": ["url"],
                    "properties": {
                        "kind": {"type": "string"},
                        "url": {"type": "string"},
                        "alt_text": {"type": "string"},
                        "position": {"type": "number"},
                    },
                }
            },
        },
    },
}

# Update Special (all fields optional)
UPDATE_SPECIAL_SCHEMA = {
    "type": "object",
    "properties": {
        "title": {"type": "string"},
        "subtitle": {"type": "string"},
        "description": {"type": "string"},
        "discount_type": {"type": "string"},
        "discount_value": {"type": "number"},
        "discount_label": {"type": "string"},
        "valid_from": {"type": "string"},
        "valid_until": {"type": "string"},
        "max_claims_total": {"type": "number"},
        "max_claims_per_user": {"type": "number"},
        "per_visit": {"type": "boolean"},
        "requires_code": {"type": "boolean"},
        "code_hint": {"type": "string"},
        "terms": {"type": "string"},
        "hero_image_url": {"type": "string"},
        "is_active": {"type": "boolean"},
    },
}

# Claim Special
CLAIM_SPECIAL_SCHEMA = {
    "type": "object",
    "properties": {
        "guest_session_id": {"type": "string"},
    },
}

# Redeem Claim
REDEEM_CLAIM_SCHEMA = {
    "type": "object",
    "required": ["claim_id"],
    "properties": {
        "claim_id": {"type": "string"},
        "redeem_code": {"type": "string"},
    },
}

# Track Event
TRACK_EVENT_SCHEMA = {
    "type": "object",
    "required": ["event_type"],
    "properties": {
        "event_type": {"type": "string"},  # 'view' | 'share' | 'click'
        "guest_session_id": {"type": "string"},
    },
}


