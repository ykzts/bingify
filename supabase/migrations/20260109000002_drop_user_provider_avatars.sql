-- user_provider_avatars テーブルを削除
-- auth.identities の identity_data を直接利用するため、このテーブルは不要になった

DROP TABLE IF EXISTS user_provider_avatars CASCADE;
