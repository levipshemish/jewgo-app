-- Migration: Add admin_config key/value table

CREATE TABLE IF NOT EXISTS public.admin_config (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP(6),
  updated_by VARCHAR(50)
);

