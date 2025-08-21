-- Migration: Apple OAuth Profiles
-- Creates profiles table, RPC function for name UPSERT, and RLS policies

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on user_id for performance
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);

-- Create RPC function for race-safe name UPSERT
CREATE OR REPLACE FUNCTION upsert_profile_with_name(p_user_id UUID, p_name TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO profiles (user_id, name, updated_at)
    VALUES (p_user_id, p_name, NOW())
    ON CONFLICT (user_id)
    DO UPDATE SET
        name = COALESCE(NULLIF(TRIM(profiles.name), ''), EXCLUDED.name),
        updated_at = NOW()
    WHERE EXCLUDED.name IS NOT NULL AND TRIM(EXCLUDED.name) != '';
END;
$$;

-- Enable RLS on profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can read their own profile
CREATE POLICY "Users can view own profile" ON profiles
    FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can update their own profile
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policy: Allow RPC function to insert/update profiles
CREATE POLICY "RPC can upsert profiles" ON profiles
    FOR ALL USING (true);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON profiles TO authenticated;
GRANT EXECUTE ON FUNCTION upsert_profile_with_name(UUID, TEXT) TO authenticated;
