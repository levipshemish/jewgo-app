-- Migration: Add Admin Tokens and MFA Tables
-- Date: 2024-12-19
-- Description: Add AdminToken and MFASecret tables to nextauth schema

-- Create AdminToken table
CREATE TABLE IF NOT EXISTS "nextauth"."AdminToken" (
    "id" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "name" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdminToken_pkey" PRIMARY KEY ("id")
);

-- Create unique index on token
CREATE UNIQUE INDEX IF NOT EXISTS "AdminToken_token_key" ON "nextauth"."AdminToken"("token");

-- Create index on adminId for performance
CREATE INDEX IF NOT EXISTS "AdminToken_adminId_idx" ON "nextauth"."AdminToken"("adminId");

-- Create MFASecret table
CREATE TABLE IF NOT EXISTS "nextauth"."MFASecret" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "secret" TEXT NOT NULL,
    "backupCodes" TEXT[] NOT NULL DEFAULT '{}',
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MFASecret_pkey" PRIMARY KEY ("id")
);

-- Create unique index on userId (one MFA secret per user)
CREATE UNIQUE INDEX IF NOT EXISTS "MFASecret_userId_key" ON "nextauth"."MFASecret"("userId");

-- Add foreign key constraints
ALTER TABLE "nextauth"."AdminToken" ADD CONSTRAINT "AdminToken_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "nextauth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "nextauth"."MFASecret" ADD CONSTRAINT "MFASecret_userId_fkey" FOREIGN KEY ("userId") REFERENCES "nextauth"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add comments for documentation
COMMENT ON TABLE "nextauth"."AdminToken" IS 'Admin token management for API access';
COMMENT ON TABLE "nextauth"."MFASecret" IS 'MFA secrets storage for two-factor authentication';
