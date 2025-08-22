-- Migration: Fix Anonymous Auth Trigger
-- Adds anonymous-safe handle_new_user trigger to prevent 500 errors during anonymous signup

-- Drop existing trigger if it exists (for idempotent re-runs)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop existing function if it exists (for idempotent re-runs)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create anonymous-safe handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if this is an anonymous user
  -- Anonymous users have provider = 'anonymous' in raw_app_meta_data
  IF COALESCE(NEW.raw_app_meta_data->>'provider', '') = 'anonymous' THEN
    -- For anonymous users, create a minimal profile
    INSERT INTO public.profiles (user_id, name, created_at, updated_at)
    VALUES (
      NEW.id,
      'Guest User',
      NOW(),
      NOW()
    );
    RETURN NEW;
  END IF;

  -- For regular users (with email), create profile with available data
  INSERT INTO public.profiles (user_id, name, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'name',
      NEW.raw_user_meta_data->>'full_name',
      split_part(NEW.email, '@', 1)
    ),
    NOW(),
    NOW()
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
