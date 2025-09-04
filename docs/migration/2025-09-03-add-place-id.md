Title: Add restaurants.place_id column
Date: 2025-09-03

Summary
- Adds a nullable column `place_id VARCHAR(255)` to the `restaurants` table to match the ORM model and stop errors like: column restaurants.place_id does not exist.

Why
- Backend ORM queries selected `restaurants.place_id`. Some environments were missing this column, causing ProgrammingError from psycopg2/SQLAlchemy.

Scope
- App DB only. No Supabase schema changes.

Migration (Up)
- Run: python backend/database/migrations/add_place_id_to_restaurants.py
- Effect: Adds `place_id` if it does not already exist. Safe to run multiple times.

Rollback (Down)
- Run: python -c "from backend.database.migrations.add_place_id_to_restaurants import downgrade; import sys; sys.exit(0 if downgrade() else 1)"
- Effect: Drops `place_id` if present.

Risk & Rollback Notes
- Low risk. New nullable column. Existing queries begin to work; no existing data is modified.
- Rollback simply removes the column if needed.

