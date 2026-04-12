-- =============================================================================
-- Re-apply Supabase-friendly privileges on everything in `public`
-- =============================================================================
-- Run after schema.sql and functions.sql (and after any migration that creates
-- new objects). Safe to run multiple times.
--
-- The SQL Editor often uses a new session per run, so default privileges from
-- reset_public_schema.sql may not attach to objects created in a later script.
-- This file fixes that for PostgREST + RLS clients.
-- =============================================================================

GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO postgres, anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON ROUTINES TO postgres, anon, authenticated, service_role;
