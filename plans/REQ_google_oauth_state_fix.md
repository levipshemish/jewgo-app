# Google OAuth State Fix Requirements

## Problem Statement
Google OAuth callback fails with `oauth_failed` because the backend expects an `extra_data` column in `oauth_states_v5` yet the table and migration scripts omit it, causing every callback to raise a SQL error.

## Scope
- Align database schema with application expectations by adding an `extra_data` column to `oauth_states_v5`.
- Ensure OAuth state generation persists optional metadata so callbacks can recover it.

## Constraints
- Use JSONB to store arbitrary metadata with sensible defaults.
- Keep diff minimal; reuse existing OAuth service logic.
- No server restarts or live migrations in this task.

## Acceptance Criteria
- Database migration adds nullable `extra_data` JSONB (or JSON) column with default `NULL`.
- OAuth service writes `extra_data` when generating state and reads it without errors.
- Manual inspection of migration file shows idempotent structure (create-if-not-exists or safe alter).
- Documentation summarizes the change and migration steps.
