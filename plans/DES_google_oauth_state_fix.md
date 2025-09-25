# Google OAuth State Fix Design

## Overview
The OAuth service expects `oauth_states_v5.extra_data` to store JSON metadata (e.g., `link_user_id`). Missing column breaks the callback. We will:
1. Add `extra_data JSONB` column (nullable) via a new SQL migration.
2. Update `OAuthService.generate_secure_state` to persist metadata with the state row.

## Components Affected
- Database: `oauth_states_v5` table (PostgreSQL).
- Backend service: `backend/services/oauth_service_v5.py` (state creation & retrieval).
- Migration scripts: Add new SQL migration; update helper script if necessary.
- Documentation: Record change in docs (e.g., OAuth debug report or new note).

## Data Shape Changes
`oauth_states_v5`
```
state_token VARCHAR(255) PRIMARY KEY
provider VARCHAR(32)
return_to VARCHAR(500)
expires_at TIMESTAMPTZ
consumed_at TIMESTAMPTZ
extra_data JSONB NULL DEFAULT NULL
```

## Risks & Mitigations
- **Existing rows:** Add column with NULL default to avoid data rewrite.
- **Repeated migrations:** Use `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` to stay idempotent.
- **Code backward compatibility:** The service should handle `extra_data` = `{}` when column missing or NULL; guard with default in Python.

## Testing Strategy
- Manual verification by simulating state generation (unit test or REPL) ensuring insert no longer errors.
- Inspect migration for correctness; no automated tests added for this small fix.
