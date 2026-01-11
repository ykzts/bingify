
-- ============================================================================
-- Test Auth Users
-- ============================================================================
-- Seed test auth users directly for SQL-only setup
-- User 1: Admin/Host - Main user who creates spaces
-- User 2: Guest - Participates in User 1's spaces
-- User 3: New User - Fresh user with no activity

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

-- ============================================================================
-- Profiles
-- ============================================================================
-- Profiles are created automatically by the `handle_new_user` trigger on `auth.users`
-- Insert profiles explicitly for seed data to ensure they exist
INSERT INTO public.profiles (id, email, full_name, avatar_url, created_at, updated_at)
VALUES 
	(
		'00000000-0000-0000-0000-000000000001'::uuid,
		'test.user1@example.com',
		'Test User One',
		'https://ui-avatars.com/api/?name=Test+User+One',
		NOW() - INTERVAL '7 days',
		NOW() - INTERVAL '7 days'
	),
	(
		'00000000-0000-0000-0000-000000000002'::uuid,
		'test.user2@example.com',
		'Test User Two',
		'https://ui-avatars.com/api/?name=Test+User+Two',
		NOW() - INTERVAL '3 days',
		NOW() - INTERVAL '1 day'
	),
	(
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

-- ============================================================================
-- Spaces
-- ============================================================================
-- Create 5 spaces with different configurations owned by User 1

-- Space A: Active standard space with participants
INSERT INTO spaces (
	id,
	share_key,
	view_token,
	owner_id,
	title,
	description,
	status,
	settings,
	gatekeeper_rules,
	max_participants,
	created_at,
	updated_at
) VALUES (
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
	'space-a-2025-bonenkai',
	'view-token-space-a-secure-256bit',
	'00000000-0000-0000-0000-000000000001'::uuid,
	'忘年会ビンゴ 2025',
	'年末恒例のビンゴ大会です。豪華景品をご用意しています！',
	'active',
	'{"cardSize": 5, "freeCenter": true}'::jsonb,
	NULL,
	50,
	NOW() - INTERVAL '2 days',
	NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
	SET title = EXCLUDED.title,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			settings = EXCLUDED.settings,
			updated_at = EXCLUDED.updated_at;

-- Space B: Draft/preparation space
INSERT INTO spaces (
	id,
	share_key,
	view_token,
	owner_id,
	title,
	description,
	status,
	settings,
	gatekeeper_rules,
	max_participants,
	created_at,
	updated_at
) VALUES (
	'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'::uuid,
	'space-b-test-draft',
	'view-token-space-b-secure-256bit',
	'00000000-0000-0000-0000-000000000001'::uuid,
	'テスト大会（準備中）',
	'来週開催予定のテストイベント',
	'draft',
	'{"cardSize": 5, "freeCenter": false}'::jsonb,
	NULL,
	30,
	NOW() - INTERVAL '1 day',
	NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
	SET title = EXCLUDED.title,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			settings = EXCLUDED.settings,
			updated_at = EXCLUDED.updated_at;

-- Space C: Archived space
INSERT INTO spaces (
	id,
	share_key,
	view_token,
	owner_id,
	title,
	description,
	status,
	settings,
	gatekeeper_rules,
	max_participants,
	created_at,
	updated_at
) VALUES (
	'cccccccc-cccc-cccc-cccc-cccccccccccc'::uuid,
	'space-c-closed-event',
	'view-token-space-c-secure-256bit',
	'00000000-0000-0000-0000-000000000001'::uuid,
	'先月のイベント',
	'11月に開催したビンゴイベントのアーカイブ',
	'closed',
	'{"cardSize": 5, "freeCenter": true}'::jsonb,
	NULL,
	50,
	NOW() - INTERVAL '30 days',
	NOW() - INTERVAL '25 days'
)
ON CONFLICT (id) DO UPDATE
	SET title = EXCLUDED.title,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			settings = EXCLUDED.settings,
			updated_at = EXCLUDED.updated_at;

-- Space D: YouTube restricted space
INSERT INTO spaces (
	id,
	share_key,
	view_token,
	owner_id,
	title,
	description,
	status,
	settings,
	gatekeeper_rules,
	max_participants,
	created_at,
	updated_at
) VALUES (
	'dddddddd-dddd-dddd-dddd-dddddddddddd'::uuid,
	'space-d-youtube-members',
	'view-token-space-d-secure-256bit',
	'00000000-0000-0000-0000-000000000001'::uuid,
	'YouTube登録者限定イベント',
	'YouTubeチャンネル登録者のみ参加可能なビンゴイベント',
	'active',
	'{"cardSize": 5, "freeCenter": true}'::jsonb,
	'{"youtube": {"channelId": "UC_TEST_CHANNEL", "required": true}}'::jsonb,
	100,
	NOW() - INTERVAL '5 hours',
	NOW() - INTERVAL '1 hour'
)
ON CONFLICT (id) DO UPDATE
	SET title = EXCLUDED.title,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			settings = EXCLUDED.settings,
			gatekeeper_rules = EXCLUDED.gatekeeper_rules,
			updated_at = EXCLUDED.updated_at;

-- Space E: Twitch restricted space
INSERT INTO spaces (
	id,
	share_key,
	view_token,
	owner_id,
	title,
	description,
	status,
	settings,
	gatekeeper_rules,
	max_participants,
	created_at,
	updated_at
) VALUES (
	'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'::uuid,
	'space-e-twitch-subs',
	'view-token-space-e-secure-256bit',
	'00000000-0000-0000-0000-000000000001'::uuid,
	'Twitchサブスク限定',
	'Twitchサブスクライバー限定のビンゴ大会',
	'active',
	'{"cardSize": 5, "freeCenter": true}'::jsonb,
	'{"twitch": {"broadcasterId": "12345", "requireSub": true}}'::jsonb,
	75,
	NOW() - INTERVAL '3 hours',
	NOW() - INTERVAL '30 minutes'
)
ON CONFLICT (id) DO UPDATE
	SET title = EXCLUDED.title,
			description = EXCLUDED.description,
			status = EXCLUDED.status,
			settings = EXCLUDED.settings,
			gatekeeper_rules = EXCLUDED.gatekeeper_rules,
			updated_at = EXCLUDED.updated_at;

-- ============================================================================
-- Participants
-- ============================================================================
-- Add participants to Space A (active standard space)

-- User 1 (owner) as participant
INSERT INTO participants (
	id,
	space_id,
	user_id,
	bingo_status,
	joined_at
) VALUES (
	'11111111-1111-1111-1111-111111111111'::uuid,
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
	'00000000-0000-0000-0000-000000000001'::uuid,
	'reach',
	NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO UPDATE
	SET bingo_status = EXCLUDED.bingo_status;

-- User 2 (guest) as participant
INSERT INTO participants (
	id,
	space_id,
	user_id,
	bingo_status,
	joined_at
) VALUES (
	'22222222-2222-2222-2222-222222222222'::uuid,
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
	'00000000-0000-0000-0000-000000000002'::uuid,
	'none',
	NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE
	SET bingo_status = EXCLUDED.bingo_status;

-- ============================================================================
-- Bingo Cards
-- ============================================================================
-- Create bingo cards for participants in Space A

-- Card for User 1 (with some hits)
INSERT INTO bingo_cards (
	id,
	space_id,
	user_id,
	numbers,
	created_at
) VALUES (
	'11111111-aaaa-aaaa-aaaa-111111111111'::uuid,
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
	'00000000-0000-0000-0000-000000000001'::uuid,
	'[
		[5, 12, 23, 34, 45],
		[7, 18, 25, 38, 52],
		[9, 21, 0, 41, 58],
		[11, 27, 32, 47, 63],
		[14, 29, 36, 50, 71]
	]'::jsonb,
	NOW() - INTERVAL '2 days'
)
ON CONFLICT (id) DO UPDATE
	SET numbers = EXCLUDED.numbers;

-- Card for User 2
INSERT INTO bingo_cards (
	id,
	space_id,
	user_id,
	numbers,
	created_at
) VALUES (
	'22222222-aaaa-aaaa-aaaa-222222222222'::uuid,
	'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
	'00000000-0000-0000-0000-000000000002'::uuid,
	'[
		[3, 16, 24, 37, 48],
		[6, 19, 28, 39, 51],
		[8, 22, 0, 42, 59],
		[13, 26, 33, 44, 61],
		[15, 30, 35, 49, 72]
	]'::jsonb,
	NOW() - INTERVAL '1 day'
)
ON CONFLICT (id) DO UPDATE
	SET numbers = EXCLUDED.numbers;

-- ============================================================================
-- Called Numbers
-- ============================================================================
-- Add some called numbers for Space A to show progress

INSERT INTO called_numbers (space_id, value, called_at)
VALUES
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 5, NOW() - INTERVAL '90 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 12, NOW() - INTERVAL '85 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 23, NOW() - INTERVAL '80 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 34, NOW() - INTERVAL '75 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 18, NOW() - INTERVAL '70 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 25, NOW() - INTERVAL '65 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 7, NOW() - INTERVAL '60 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 52, NOW() - INTERVAL '55 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 21, NOW() - INTERVAL '50 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 41, NOW() - INTERVAL '45 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 11, NOW() - INTERVAL '40 minutes'),
	('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid, 27, NOW() - INTERVAL '35 minutes')
ON CONFLICT (space_id, value) DO NOTHING;

-- ============================================================================
-- Seed Data Complete
-- ============================================================================
-- Summary:
-- - 3 test users (User 1: Admin/Host, User 2: Guest, User 3: New)
-- - 5 spaces with varied configurations:
--   * Space A: Active with participants and game progress
--   * Space B: Draft/preparation
--   * Space C: Archived
--   * Space D: YouTube restricted
--   * Space E: Twitch restricted
-- - 2 participants in Space A
-- - 2 bingo cards in Space A
-- - 12 called numbers in Space A (showing game in progress)
