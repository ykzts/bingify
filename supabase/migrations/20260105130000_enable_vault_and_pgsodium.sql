-- Enable pgsodium extension for encryption
-- pgsodium provides transparent column encryption (TCE) capabilities
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Note: Supabase Vault is only available in hosted environments
-- For local development, we'll use pgsodium directly without vault
-- In production, tokens will be encrypted using pgsodium's built-in key derivation
