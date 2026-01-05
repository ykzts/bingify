-- Enable pgsodium extension for encryption
-- pgsodium provides transparent column encryption (TCE) capabilities
CREATE EXTENSION IF NOT EXISTS pgsodium;

-- Enable vault extension for secure key management
-- Supabase Vault stores encryption keys securely
CREATE EXTENSION IF NOT EXISTS vault;
