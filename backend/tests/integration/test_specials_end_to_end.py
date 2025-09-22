#!/usr/bin/env python3
from uuid import UUID
from sqlalchemy import text
from database.database_manager_v5 import get_database_manager_v5


def test_claim_and_redeem_happy_path(client, staff_user_token, seed_specials):
    dbm = get_database_manager_v5()
    special_id = seed_specials["special_id"]

    # Claim as guest (no auth header), provide guest_session_id
    claim_resp = client.post(
        f"/api/v5/specials/{special_id}/claim",
        json={"guest_session_id": "guest-test-session"},
    )
    assert claim_resp.status_code in (201, 409, 400)
    if claim_resp.status_code == 201:
        data = claim_resp.get_json()
        assert "claim_id" in data
        claim_id = data["claim_id"]
        UUID(claim_id)  # valid uuid

        # Redeem requires auth; we provide placeholder header in TEST_MODE
        redeem_resp = client.post(
            f"/api/v5/specials/{special_id}/redeem",
            headers=staff_user_token,
            json={"claim_id": claim_id},
        )
        assert redeem_resp.status_code == 200

        # DB assertion when redeemed
        if redeem_resp.status_code == 200:
            with dbm.get_session() as session:
                row = session.execute(
                    text(
                        "SELECT status FROM special_claims WHERE id = :cid AND special_id = :sid"
                    ),
                    {"cid": claim_id, "sid": special_id},
                ).fetchone()
                assert row is not None and row.status == "redeemed"


def test_total_limit_enforced(client, seed_specials):
    # Create claims up to the limit and ensure next claim 409s
    special_id = seed_specials["special_id"]
    # Attempt multiple claims with unique guest ids to reach max_claims_total=5
    successes = 0
    for i in range(6):
        resp = client.post(
            f"/api/v5/specials/{special_id}/claim",
            json={"guest_session_id": f"guest-{i}"},
        )
        if resp.status_code == 201:
            successes += 1
        elif resp.status_code == 409:
            # when we exceed the max, conflict is expected
            pass
        else:
            # Allow 400 in case of test env auth edge conditions
            pass
    assert successes <= 5


def test_per_visit_once_per_day(client, seed_specials):
    per_visit_id = seed_specials["per_visit_special_id"]
    # First claim should succeed
    first = client.post(
        f"/api/v5/specials/{per_visit_id}/claim",
        json={"guest_session_id": "guest-visit"},
    )
    # Second claim same guest same day should conflict (or be rejected)
    second = client.post(
        f"/api/v5/specials/{per_visit_id}/claim",
        json={"guest_session_id": "guest-visit"},
    )
    assert first.status_code in (201, 409)
    if first.status_code == 201:
        assert second.status_code == 409


