import os
import importlib


def test_supabase_url_normalization_and_endpoints(monkeypatch):
    # Provide SUPABASE_URL with spaces and trailing slash
    monkeypatch.setenv("SUPABASE_URL", " https://xyzabcdef.supabase.co/ ")
    # Avoid touching redis or other envs
    monkeypatch.delenv("SUPABASE_ANON_KEY", raising=False)
    # Reload module to reconstruct manager with env
    from utils import supabase_auth as sa
    importlib.reload(sa)

    m = sa.SupabaseAuthManager()
    assert m.supabase_url == "https://xyzabcdef.supabase.co"
    assert m.jwks_url == "https://xyzabcdef.supabase.co/auth/v1/keys"
    assert m.jwks_well_known_url == "https://xyzabcdef.supabase.co/.well-known/jwks.json"

