-- ============================================================
-- Hub User Data Isolation Migration
-- ============================================================
-- This migration adds user_id columns to all core tables and
-- implements proper Row Level Security (RLS) policies.
-- ============================================================
-- Run this in Supabase SQL Editor after 001 and 002 migrations
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- ============================================================
-- STEP 1: ADD user_id COLUMNS TO ALL CORE TABLES
-- ============================================================

-- directory_sources
ALTER TABLE directory_sources
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- files (inherits from directory_sources, but add for direct queries)
ALTER TABLE files
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- code_projects
ALTER TABLE code_projects
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- study_spaces
ALTER TABLE study_spaces
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- chatlog_sources
ALTER TABLE chatlog_sources
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- chats
ALTER TABLE chats
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- chat_messages (inherits from chats, but add for direct queries)
ALTER TABLE chat_messages
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ideas
ALTER TABLE ideas
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- activities
ALTER TABLE activities
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- pinned_items
ALTER TABLE pinned_items
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- sync_logs
ALTER TABLE sync_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- api_keys (already has user_id, ensure it references auth.users)
-- Skip if already exists with proper reference

-- api_key_usage_logs
ALTER TABLE api_key_usage_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ============================================================
-- STEP 2: CREATE INDEXES ON user_id COLUMNS
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_directory_sources_user_id ON directory_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_code_projects_user_id ON code_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_study_spaces_user_id ON study_spaces(user_id);
CREATE INDEX IF NOT EXISTS idx_chatlog_sources_user_id ON chatlog_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
CREATE INDEX IF NOT EXISTS idx_activities_user_id ON activities(user_id);
CREATE INDEX IF NOT EXISTS idx_pinned_items_user_id ON pinned_items(user_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_user_id ON sync_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_user_id ON api_key_usage_logs(user_id);

-- ============================================================
-- STEP 3: DROP OLD PERMISSIVE POLICIES
-- ============================================================

-- Drop all existing permissive policies
DROP POLICY IF EXISTS "Allow all access to directory_sources" ON directory_sources;
DROP POLICY IF EXISTS "Allow all access to files" ON files;
DROP POLICY IF EXISTS "Allow all access to code_projects" ON code_projects;
DROP POLICY IF EXISTS "Allow all access to study_spaces" ON study_spaces;
DROP POLICY IF EXISTS "Allow all access to chatlog_sources" ON chatlog_sources;
DROP POLICY IF EXISTS "Allow all access to chats" ON chats;
DROP POLICY IF EXISTS "Allow all access to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow all access to ideas" ON ideas;
DROP POLICY IF EXISTS "Allow all access to activities" ON activities;
DROP POLICY IF EXISTS "Allow all access to pinned_items" ON pinned_items;
DROP POLICY IF EXISTS "Allow all access to sync_logs" ON sync_logs;
DROP POLICY IF EXISTS "Allow all access to api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow all access to api_key_usage_logs" ON api_key_usage_logs;

-- Drop anonymous access policies
DROP POLICY IF EXISTS "Allow anonymous access to directory_sources" ON directory_sources;
DROP POLICY IF EXISTS "Allow anonymous access to files" ON files;
DROP POLICY IF EXISTS "Allow anonymous access to code_projects" ON code_projects;
DROP POLICY IF EXISTS "Allow anonymous access to study_spaces" ON study_spaces;
DROP POLICY IF EXISTS "Allow anonymous access to chatlog_sources" ON chatlog_sources;
DROP POLICY IF EXISTS "Allow anonymous access to chats" ON chats;
DROP POLICY IF EXISTS "Allow anonymous access to chat_messages" ON chat_messages;
DROP POLICY IF EXISTS "Allow anonymous access to ideas" ON ideas;
DROP POLICY IF EXISTS "Allow anonymous access to activities" ON activities;
DROP POLICY IF EXISTS "Allow anonymous access to pinned_items" ON pinned_items;
DROP POLICY IF EXISTS "Allow anonymous access to sync_logs" ON sync_logs;
DROP POLICY IF EXISTS "Allow anonymous access to api_keys" ON api_keys;
DROP POLICY IF EXISTS "Allow anonymous access to api_key_usage_logs" ON api_key_usage_logs;

-- ============================================================
-- STEP 4: ENABLE RLS ON ALL TABLES
-- ============================================================

ALTER TABLE directory_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;
ALTER TABLE code_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatlog_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE pinned_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 5: CREATE USER-BASED RLS POLICIES
-- ============================================================

-- === directory_sources ===
CREATE POLICY "Users can view own directory_sources"
ON directory_sources FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own directory_sources"
ON directory_sources FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own directory_sources"
ON directory_sources FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own directory_sources"
ON directory_sources FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === files ===
CREATE POLICY "Users can view own files"
ON files FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own files"
ON files FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own files"
ON files FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own files"
ON files FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === code_projects ===
CREATE POLICY "Users can view own code_projects"
ON code_projects FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own code_projects"
ON code_projects FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own code_projects"
ON code_projects FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own code_projects"
ON code_projects FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === study_spaces ===
CREATE POLICY "Users can view own study_spaces"
ON study_spaces FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own study_spaces"
ON study_spaces FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own study_spaces"
ON study_spaces FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own study_spaces"
ON study_spaces FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === chatlog_sources ===
CREATE POLICY "Users can view own chatlog_sources"
ON chatlog_sources FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chatlog_sources"
ON chatlog_sources FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chatlog_sources"
ON chatlog_sources FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chatlog_sources"
ON chatlog_sources FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === chats ===
CREATE POLICY "Users can view own chats"
ON chats FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chats"
ON chats FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chats"
ON chats FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chats"
ON chats FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === chat_messages ===
CREATE POLICY "Users can view own chat_messages"
ON chat_messages FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own chat_messages"
ON chat_messages FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat_messages"
ON chat_messages FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own chat_messages"
ON chat_messages FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === ideas ===
CREATE POLICY "Users can view own ideas"
ON ideas FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own ideas"
ON ideas FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own ideas"
ON ideas FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own ideas"
ON ideas FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === activities ===
CREATE POLICY "Users can view own activities"
ON activities FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own activities"
ON activities FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own activities"
ON activities FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own activities"
ON activities FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === pinned_items ===
CREATE POLICY "Users can view own pinned_items"
ON pinned_items FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own pinned_items"
ON pinned_items FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own pinned_items"
ON pinned_items FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own pinned_items"
ON pinned_items FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === sync_logs ===
CREATE POLICY "Users can view own sync_logs"
ON sync_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own sync_logs"
ON sync_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sync_logs"
ON sync_logs FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own sync_logs"
ON sync_logs FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === api_keys ===
CREATE POLICY "Users can view own api_keys"
ON api_keys FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api_keys"
ON api_keys FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own api_keys"
ON api_keys FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own api_keys"
ON api_keys FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- === api_key_usage_logs ===
CREATE POLICY "Users can view own api_key_usage_logs"
ON api_key_usage_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own api_key_usage_logs"
ON api_key_usage_logs FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STEP 6: SERVICE ROLE BYPASS POLICIES
-- ============================================================
-- Service role can access all data (for admin operations and CLI)

CREATE POLICY "Service role bypass for directory_sources"
ON directory_sources FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for files"
ON files FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for code_projects"
ON code_projects FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for study_spaces"
ON study_spaces FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for chatlog_sources"
ON chatlog_sources FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for chats"
ON chats FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for chat_messages"
ON chat_messages FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for ideas"
ON ideas FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for activities"
ON activities FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for pinned_items"
ON pinned_items FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for sync_logs"
ON sync_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for api_keys"
ON api_keys FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "Service role bypass for api_key_usage_logs"
ON api_key_usage_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- ============================================================
-- STEP 7: UPDATE global_search FUNCTION FOR USER ISOLATION
-- ============================================================

-- Drop existing function first to avoid return type conflict
DROP FUNCTION IF EXISTS global_search(TEXT, INT);
CREATE OR REPLACE FUNCTION global_search(search_query TEXT, max_results INT DEFAULT 20)
RETURNS TABLE (
    result_type TEXT,
    id UUID,
    title TEXT,
    snippet TEXT,
    relevance FLOAT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id UUID;
BEGIN
    -- Get the current user's ID
    current_user_id := auth.uid();

    -- If no user is authenticated, return empty
    IF current_user_id IS NULL THEN
        RETURN;
    END IF;

    RETURN QUERY
    -- Search ideas
    SELECT
        'idea'::TEXT as result_type,
        i.id,
        LEFT(i.content, 100) as title,
        LEFT(i.content, 200) as snippet,
        ts_rank(to_tsvector('simple', i.content), plainto_tsquery('simple', search_query)) as relevance,
        i.created_at
    FROM ideas i
    WHERE i.user_id = current_user_id
      AND to_tsvector('simple', i.content) @@ plainto_tsquery('simple', search_query)

    UNION ALL

    -- Search files
    SELECT
        'file'::TEXT as result_type,
        f.id,
        f.name as title,
        LEFT(COALESCE(f.content, ''), 200) as snippet,
        ts_rank(to_tsvector('simple', COALESCE(f.content, '')), plainto_tsquery('simple', search_query)) as relevance,
        f.created_at
    FROM files f
    WHERE f.user_id = current_user_id
      AND (
        to_tsvector('simple', COALESCE(f.content, '')) @@ plainto_tsquery('simple', search_query)
        OR f.name ILIKE '%' || search_query || '%'
      )

    UNION ALL

    -- Search chat messages
    SELECT
        'chat_message'::TEXT as result_type,
        cm.id,
        LEFT(cm.content, 100) as title,
        LEFT(cm.content, 200) as snippet,
        ts_rank(to_tsvector('simple', cm.content), plainto_tsquery('simple', search_query)) as relevance,
        cm.created_at
    FROM chat_messages cm
    WHERE cm.user_id = current_user_id
      AND to_tsvector('simple', cm.content) @@ plainto_tsquery('simple', search_query)

    ORDER BY relevance DESC
    LIMIT max_results;
END;
$$;

-- ============================================================
-- STEP 8: HELPER FUNCTION TO GET CURRENT USER ID
-- ============================================================

CREATE OR REPLACE FUNCTION get_current_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
    SELECT auth.uid();
$$;

-- ============================================================
-- STEP 9: TRIGGER TO AUTO-SET user_id ON INSERT
-- ============================================================

CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only set user_id if it's NULL (allows service role to set it explicitly)
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

-- Create triggers for all tables
DROP TRIGGER IF EXISTS set_user_id_directory_sources ON directory_sources;
CREATE TRIGGER set_user_id_directory_sources
    BEFORE INSERT ON directory_sources
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_files ON files;
CREATE TRIGGER set_user_id_files
    BEFORE INSERT ON files
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_code_projects ON code_projects;
CREATE TRIGGER set_user_id_code_projects
    BEFORE INSERT ON code_projects
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_study_spaces ON study_spaces;
CREATE TRIGGER set_user_id_study_spaces
    BEFORE INSERT ON study_spaces
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_chatlog_sources ON chatlog_sources;
CREATE TRIGGER set_user_id_chatlog_sources
    BEFORE INSERT ON chatlog_sources
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_chats ON chats;
CREATE TRIGGER set_user_id_chats
    BEFORE INSERT ON chats
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_chat_messages ON chat_messages;
CREATE TRIGGER set_user_id_chat_messages
    BEFORE INSERT ON chat_messages
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_ideas ON ideas;
CREATE TRIGGER set_user_id_ideas
    BEFORE INSERT ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_activities ON activities;
CREATE TRIGGER set_user_id_activities
    BEFORE INSERT ON activities
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_pinned_items ON pinned_items;
CREATE TRIGGER set_user_id_pinned_items
    BEFORE INSERT ON pinned_items
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_sync_logs ON sync_logs;
CREATE TRIGGER set_user_id_sync_logs
    BEFORE INSERT ON sync_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_api_keys ON api_keys;
CREATE TRIGGER set_user_id_api_keys
    BEFORE INSERT ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_user_id_api_key_usage_logs ON api_key_usage_logs;
CREATE TRIGGER set_user_id_api_key_usage_logs
    BEFORE INSERT ON api_key_usage_logs
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();

-- ============================================================
-- STEP 10: GRANT PERMISSIONS
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;

-- Grant permissions on tables to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON directory_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON files TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON code_projects TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON study_spaces TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chatlog_sources TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chats TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ideas TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON activities TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON pinned_items TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sync_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON api_keys TO authenticated;
GRANT SELECT, INSERT ON api_key_usage_logs TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION global_search(TEXT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_current_user_id() TO authenticated;

-- ============================================================
-- VERIFICATION
-- ============================================================

SELECT 'User isolation migration completed successfully!' as message;

-- Show all tables with RLS status
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Show all policies
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
