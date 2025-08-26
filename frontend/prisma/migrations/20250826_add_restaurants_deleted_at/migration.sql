-- Add soft-delete column to restaurants table if missing
-- Ensures Prisma queries that include the Restaurant.deleted_at field succeed

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'restaurants'
      AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE "public"."restaurants"
    ADD COLUMN "deleted_at" TIMESTAMP(6) NULL;
  END IF;
END $$;

