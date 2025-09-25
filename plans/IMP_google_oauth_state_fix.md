# Google OAuth State Fix Implementation Plan

## Steps
1. Update `backend/services/oauth_service_v5.py`:
   - When inserting new OAuth state, include `extra_data` parameter (JSON dump of optional metadata or NULL).
   - Ensure `validate_and_consume_state` safely defaults `extra_data` to `{}` if DB returns NULL.
2. Create new migration `backend/migrations/add_extra_data_to_oauth_states_v5.sql`:
   - `ALTER TABLE oauth_states_v5 ADD COLUMN IF NOT EXISTS extra_data JSONB DEFAULT NULL;`
   - Add comment describing purpose.
   - Include index creation only if necessary (not required for JSONB at this time).
3. Update helper script `scripts/run_oauth_migration.py` so schema creation includes `extra_data` column.
4. Document change (e.g., add section to `docs/OAUTH_DEBUG_REPORT.md` or new doc) highlighting fix and migration command.

## Rollback Plan
- If issues arise, run `ALTER TABLE oauth_states_v5 DROP COLUMN IF EXISTS extra_data;`
- Remove or revert code changes referencing the column.

## Verification
- Run static linting if available (not required here).
- Manually inspect database migration and service code to confirm coherence.
