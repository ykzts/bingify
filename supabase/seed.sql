-- Seed data for testing authentication and profiles

-- Note: In a real Supabase environment, auth.users is managed by Supabase Auth
-- This seed file is primarily for testing the profiles table with existing test users

-- Create test profiles (assuming test users exist in auth.users)
-- These would typically be created automatically via the trigger when users sign up

-- Test user 1: Google OAuth user
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test.user1@example.com',
  'Test User One',
  'https://ui-avatars.com/api/?name=Test+User+One',
  NOW() - INTERVAL '7 days',
  NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = EXCLUDED.updated_at;

-- Test user 2: Twitch OAuth user
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000002'::uuid,
  'test.user2@example.com',
  'Test User Two',
  'https://ui-avatars.com/api/?name=Test+User+Two',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = EXCLUDED.updated_at;

-- Test user 3: Recently created user
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000003'::uuid,
  'test.user3@example.com',
  'Test User Three',
  'https://ui-avatars.com/api/?name=Test+User+Three',
  NOW() - INTERVAL '1 hour',
  NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      full_name = EXCLUDED.full_name,
      avatar_url = EXCLUDED.avatar_url,
      updated_at = EXCLUDED.updated_at;
