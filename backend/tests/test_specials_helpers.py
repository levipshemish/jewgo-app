#!/usr/bin/env python3
from datetime import datetime, timezone
from utils.specials_helpers import parse_time_window, generate_redeem_code, is_special_active


def test_parse_time_window_now():
    start, end = parse_time_window('now', None, None)
    assert isinstance(start, datetime) and isinstance(end, datetime)


def test_generate_redeem_code_entropy():
    code1 = generate_redeem_code()
    code2 = generate_redeem_code()
    assert code1 and code2 and code1 != code2


def test_is_special_active_true():
    now = datetime.now(timezone.utc)
    assert is_special_active(now, now, now, True) is True


