Title: Neon Pooler Compatibility
Date: 2025-09-03

Context
- Neon’s connection pooler rejects startup options like `options=-c statement_timeout=...`.
- Previous DB managers passed `statement_timeout` and `idle_in_transaction_session_timeout` in `connect_args['options']`, which failed against pooler hosts (e.g., `*.neon.tech`, `*pooler*`).

Change
- For hosts whose name contains `pooler` or `neon.tech`, DB managers no longer pass startup options.
- Timeouts are instead applied via `SET` after connect with a best-effort try/except.

Files
- backend/database/database_manager_v3.py: detect pooler/neon host; remove startup options; set timeouts post-connect.
- backend/utils/database_connection_manager.py: same behavior for the unified manager.
- backend/database/connection_manager.py: wraps `SET` statements in try/except to avoid failures on pooled providers.

Notes
- No environment variable changes required. If `PG_STATEMENT_TIMEOUT`/`PG_IDLE_TX_TIMEOUT` are set, they are applied post-connect when possible.
- This keeps compatibility with Neon while preserving defensive timeouts elsewhere.

