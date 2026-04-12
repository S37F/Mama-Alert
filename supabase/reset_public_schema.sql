-- =============================================================================
-- NUCLEAR RESET: entire `public` schema (all tables, functions, types, data)
-- =============================================================================
-- Run in Supabase → SQL Editor as a single script.
--
-- After this file succeeds, run IN ORDER:
--   1. supabase/schema.sql
--   2. supabase/functions.sql
--   3. supabase/grant_public_privileges.sql
--   4. (optional) supabase/seed.sql
--
-- Does NOT delete:
--   - auth.users (Authentication users stay; re-link demo worker UUID in seed if needed)
--   - Storage buckets / Edge functions / other schemas (extensions, vault, etc.)
--
-- PostGIS lives in schema `extensions`; schema.sql re-creates the extension if needed.
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;

CREATE SCHEMA public;

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
