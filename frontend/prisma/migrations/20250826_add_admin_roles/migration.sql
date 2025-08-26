-- Migration: Add admin_roles table
-- Creates public.admin_roles with indexes and foreign key

CREATE TABLE IF NOT EXISTS public.admin_roles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  role VARCHAR(50) NOT NULL,
  assigned_by VARCHAR(50),
  assigned_at TIMESTAMP(6) NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP(6),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_roles_user ON public.admin_roles(user_id);

-- Foreign key to users table
ALTER TABLE public.admin_roles
  ADD CONSTRAINT fk_admin_roles_user
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

