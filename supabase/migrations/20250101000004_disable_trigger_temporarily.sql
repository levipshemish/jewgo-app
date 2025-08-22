-- Migration: Temporarily Disable Trigger for Testing
-- This will help us determine if the trigger is causing the 502 error

-- Drop the trigger temporarily
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Keep the function but don't execute it
-- This allows us to test if the trigger is the issue
