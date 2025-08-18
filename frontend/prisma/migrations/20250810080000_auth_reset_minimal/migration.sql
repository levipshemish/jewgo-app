-- Auth reset: remove legacy lockout table and ensure isSuperAdmin column exists

-- Drop legacy table if present
DROP TABLE IF EXISTS "AccountLockout";

-- Ensure isSuperAdmin exists on User
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'User' AND column_name = 'isSuperAdmin'
  ) THEN
    ALTER TABLE "User" ADD COLUMN "isSuperAdmin" BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;


