import os
from typing import Optional

try:
    from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
except Exception:  # pragma: no cover - optional in dev
    Counter = None  # type: ignore
    Histogram = None  # type: ignore
    generate_latest = None  # type: ignore
    CONTENT_TYPE_LATEST = "text/plain"


METRICS_ENABLED = os.getenv("METRICS_ENABLED", "false").lower() == "true"


auth_logins_total = None
auth_refresh_total = None
auth_guest_total = None
auth_refresh_latency = None
auth_logout_total = None
auth_oauth_total = None


def _ensure_metrics():
    global auth_logins_total, auth_refresh_total, auth_guest_total, auth_refresh_latency
    if not METRICS_ENABLED or Counter is None or Histogram is None:
        return False
    if auth_logins_total is None:
        auth_logins_total = Counter("auth_logins_total", "Total auth login attempts", ["result", "method"])  # type: ignore
    if auth_refresh_total is None:
        auth_refresh_total = Counter("auth_refresh_total", "Total refresh attempts", ["result"])  # type: ignore
    if auth_guest_total is None:
        auth_guest_total = Counter("auth_guest_total", "Guest auth events", ["event"])  # type: ignore
    if auth_refresh_latency is None:
        auth_refresh_latency = Histogram("auth_refresh_latency_seconds", "Refresh latency seconds")  # type: ignore
    if auth_logout_total is None:
        auth_logout_total = Counter("auth_logout_total", "Total logout events", ["result"])  # type: ignore
    if auth_oauth_total is None:
        auth_oauth_total = Counter("auth_oauth_total", "OAuth events", ["step", "result"])  # type: ignore
    return True


def inc_login(result: str, method: str = "password"):
    if _ensure_metrics():
        auth_logins_total.labels(result=result, method=method).inc()  # type: ignore


def inc_refresh(result: str):
    if _ensure_metrics():
        auth_refresh_total.labels(result=result).inc()  # type: ignore


def inc_guest(event: str):
    if _ensure_metrics():
        auth_guest_total.labels(event=event).inc()  # type: ignore


def observe_refresh_latency(seconds: float):
    if _ensure_metrics():
        auth_refresh_latency.observe(seconds)  # type: ignore


def inc_logout(result: str):
    if _ensure_metrics():
        auth_logout_total.labels(result=result).inc()  # type: ignore


def inc_oauth(step: str, result: str):
    if _ensure_metrics():
        auth_oauth_total.labels(step=step, result=result).inc()  # type: ignore


def register_metrics_endpoint(app):
    if not METRICS_ENABLED or generate_latest is None:
        return

    @app.route("/metrics")
    def metrics():
        data = generate_latest()  # type: ignore
        return data, 200, {"Content-Type": CONTENT_TYPE_LATEST}
