-- ============================================================
-- Hub RLS (Row Level Security) Policies
-- ============================================================
-- Run this in Supabase SQL Editor after creating the schema
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE public.directory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.code_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chatlog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pinned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- DROP EXISTING POLICIES (if any)
-- ============================================================

DROP POLICY IF EXISTS "Allow all access to directory_sources" ON public.directory_sources;
DROP POLICY IF EXISTS "Allow all access to files" ON public.files;
DROP POLICY IF EXISTS "Allow all access to code_projects" ON public.code_projects;
DROP POLICY IF EXISTS "Allow all access to study_spaces" ON public.study_spaces;
DROP POLICY IF EXISTS "Allow all access to chatlog_sources" ON public.chatlog_sources;
DROP POLICY IF EXISTS "Allow all access to chats" ON public.chats;
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON public.chat_messages;
DROP POLICY IF EXISTS "Allow all access to ideas" ON public.ideas;
DROP POLICY IF EXISTS "Allow all access to activities" ON public.activities;
DROP POLICY IF EXISTS "Allow all access to pinned_items" ON public.pinned_items;
DROP POLICY IF EXISTS "Allow all access to sync_logs" ON public.sync_logs;
DROP POLICY IF EXISTS "Allow all access to api_keys" ON public.api_keys;
DROP POLICY IF EXISTS "Allow all access to api_key_usage_logs" ON public.api_key_usage_logs;

-- ============================================================
-- CREATE PERMISSIVE POLICIES (Development Mode)
-- ============================================================
-- These policies allow full access for development purposes.
-- For production, you should implement proper user-based policies.

-- directory_sources
CREATE POLICY "Allow all access to directory_sources"
ON public.directory_sources
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- files
CREATE POLICY "Allow all access to files"
ON public.files
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- code_projects
CREATE POLICY "Allow all access to code_projects"
ON public.code_projects
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- study_spaces
CREATE POLICY "Allow all access to study_spaces"
ON public.study_spaces
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- chatlog_sources
CREATE POLICY "Allow all access to chatlog_sources"
ON public.chatlog_sources
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- chats
CREATE POLICY "Allow all access to chats"
ON public.chats
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- chat_messages
CREATE POLICY "Allow all access to chat_messages"
ON public.chat_messages
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ideas
CREATE POLICY "Allow all access to ideas"
ON public.ideas
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- activities
CREATE POLICY "Allow all access to activities"
ON public.activities
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- pinned_items
CREATE POLICY "Allow all access to pinned_items"
ON public.pinned_items
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- sync_logs
CREATE POLICY "Allow all access to sync_logs"
ON public.sync_logs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- api_keys
CREATE POLICY "Allow all access to api_keys"
ON public.api_keys
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- api_key_usage_logs
CREATE POLICY "Allow all access to api_key_usage_logs"
ON public.api_key_usage_logs
FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

-- ============================================================
-- GRANT PERMISSIONS TO ROLES
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant all permissions on tables
GRANT ALL ON public.directory_sources TO anon, authenticated;
GRANT ALL ON public.files TO anon, authenticated;
GRANT ALL ON public.code_projects TO anon, authenticated;
GRANT ALL ON public.study_spaces TO anon, authenticated;
GRANT ALL ON public.chatlog_sources TO anon, authenticated;
GRANT ALL ON public.chats TO anon, authenticated;
GRANT ALL ON public.chat_messages TO anon, authenticated;
GRANT ALL ON public.ideas TO anon, authenticated;
GRANT ALL ON public.activities TO anon, authenticated;
GRANT ALL ON public.pinned_items TO anon, authenticated;
GRANT ALL ON public.sync_logs TO anon, authenticated;
GRANT ALL ON public.api_keys TO anon, authenticated;
GRANT ALL ON public.api_key_usage_logs TO anon, authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.global_search(text, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_api_key_valid(character varying) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_api_key(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_usage_logs() TO anon, authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'RLS policies created successfully!' as message;

-- Check RLS status for all tables
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
