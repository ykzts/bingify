
-- Seed test auth users directly for SQL-only setup
-- Minimal fields: id, email, raw_user_meta_data, email_confirmed_at, created_at/updated_at
INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
VALUES (
	'00000000-0000-0000-0000-000000000001'::uuid,
	'test.user1@example.com',
	'{"full_name":"Test User One","avatar_url":"https://ui-avatars.com/api/?name=Test+User+One"}'::jsonb,
	NOW(),
	NOW() - INTERVAL '7 days',
	NOW() - INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE
	SET email = EXCLUDED.email,
			raw_user_meta_data = EXCLUDED.raw_user_meta_data,
			email_confirmed_at = EXCLUDED.email_confirmed_at,
			updated_at = EXCLUDED.updated_at;

INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
VALUES (
	'00000000-0000-0000-0000-000000000002'::uuid,
	'test.user2@example.com',
	'{"full_name":"Test User Two","avatar_url":"https://ui-avatars.com/api/?name=Test+User+Two"}'::jsonb,
	NOW(),
	NOW() - INTERVAL '3 days',
	NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE
	SET email = EXCLUDED.email,
			raw_user_meta_data = EXCLUDED.raw_user_meta_data,
			email_confirmed_at = EXCLUDED.email_confirmed_at,
			updated_at = EXCLUDED.updated_at;

INSERT INTO auth.users (id, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
VALUES (
	'00000000-0000-0000-0000-000000000003'::uuid,
	'test.user3@example.com',
	'{"full_name":"Test User Three","avatar_url":"https://ui-avatars.com/api/?name=Test+User+Three"}'::jsonb,
	NOW(),
	NOW() - INTERVAL '1 hour',
	NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
	SET email = EXCLUDED.email,
			raw_user_meta_data = EXCLUDED.raw_user_meta_data,
			email_confirmed_at = EXCLUDED.email_confirmed_at,
			updated_at = EXCLUDED.updated_at;

-- Note: In a real Supabase environment, auth.users is managed by Supabase Auth
-- This seed file is primarily for testing the profiles table with existing test users

-- Profiles are created automatically by the `handle_new_user` trigger on `auth.users`
