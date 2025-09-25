-- Adds missing extra_data column to oauth_states_v5 for storing OAuth metadata

BEGIN;

ALTER TABLE oauth_states_v5
    ADD COLUMN IF NOT EXISTS extra_data JSONB;

COMMIT;
