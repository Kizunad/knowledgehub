-- ============================================================
-- Hub Complete Database Schema
-- ============================================================
-- Run this in Supabase SQL Editor to set up all tables
-- https://supabase.com/dashboard/project/_/sql
-- ============================================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================
-- DIRECTORY SOURCES (目录来源)
-- ============================================================

CREATE TABLE IF NOT EXISTS directory_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  mode VARCHAR(20) NOT NULL CHECK (mode IN ('github', 'link', 'local_sync')),
  path TEXT NOT NULL,                    -- GitHub: owner/repo, Link: URL, LocalSync: 本地路径
  branch VARCHAR(100),                   -- GitHub 模式时的分支
  description TEXT,                      -- 可选备注
  synced_at TIMESTAMPTZ,                 -- 最后同步时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_directory_sources_mode ON directory_sources(mode);
CREATE INDEX IF NOT EXISTS idx_directory_sources_name ON directory_sources(name);

-- ============================================================
-- FILES (文件内容 - 用于同步后的文件存储)
-- ============================================================

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,
  path TEXT NOT NULL,                    -- 相对于 source 的路径
  name VARCHAR(255) NOT NULL,
  content TEXT,                          -- 文件内容 (可读文件)
  size BIGINT,
  mime_type VARCHAR(100),
  file_hash VARCHAR(64),                 -- 用于检测变更
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(source_id, path)
);

-- Index for path searches
CREATE INDEX IF NOT EXISTS idx_files_source_id ON files(source_id);
CREATE INDEX IF NOT EXISTS idx_files_path ON files(path);
CREATE INDEX IF NOT EXISTS idx_files_name ON files(name);

-- Full-text search index on content
CREATE INDEX IF NOT EXISTS idx_files_content_search ON files USING gin(to_tsvector('simple', COALESCE(content, '')));

-- ============================================================
-- CODE PROJECTS (代码项目视图)
-- ============================================================

CREATE TABLE IF NOT EXISTS code_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  directory_source_id UUID NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,
  pinned BOOLEAN NOT NULL DEFAULT FALSE,
  start_here_files TEXT[],               -- 入口文件列表
  key_areas TEXT[],                      -- 关键模块目录
  run_commands TEXT[],                   -- 运行命令
  last_accessed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(directory_source_id)
);

CREATE INDEX IF NOT EXISTS idx_code_projects_pinned ON code_projects(pinned);
CREATE INDEX IF NOT EXISTS idx_code_projects_last_accessed ON code_projects(last_accessed_at DESC);

-- ============================================================
-- STUDY SPACES (学习空间视图)
-- ============================================================

CREATE TABLE IF NOT EXISTS study_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  directory_source_id UUID NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,
  last_accessed_at TIMESTAMPTZ,
  last_accessed_file TEXT,               -- 上次打开的文件
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(directory_source_id)
);

CREATE INDEX IF NOT EXISTS idx_study_spaces_last_accessed ON study_spaces(last_accessed_at DESC);

-- ============================================================
-- CHATLOG SOURCES (对话来源)
-- ============================================================

CREATE TABLE IF NOT EXISTS chatlog_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,         -- e.g., 'openai', 'anthropic', 'custom'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHATS (对话)
-- ============================================================

CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES chatlog_sources(id) ON DELETE SET NULL,
  title VARCHAR(500),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chats_source_id ON chats(source_id);
CREATE INDEX IF NOT EXISTS idx_chats_started_at ON chats(started_at DESC);

-- ============================================================
-- CHAT MESSAGES (对话消息)
-- ============================================================

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created_at ON chat_messages(created_at);

-- Full-text search on messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_content_search ON chat_messages USING gin(to_tsvector('simple', content));

-- ============================================================
-- IDEAS (点子)
-- ============================================================

CREATE TABLE IF NOT EXISTS ideas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  content TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'inbox' CHECK (status IN ('inbox', 'active', 'archive')),
  done BOOLEAN NOT NULL DEFAULT FALSE,
  tags TEXT[],                           -- #tags
  refs TEXT[],                           -- @refs
  source_ref TEXT,                       -- 来源引用 (可选)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ideas_status ON ideas(status);
CREATE INDEX IF NOT EXISTS idx_ideas_done ON ideas(done);
CREATE INDEX IF NOT EXISTS idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ideas_tags ON ideas USING gin(tags);

-- Full-text search on ideas
CREATE INDEX IF NOT EXISTS idx_ideas_content_search ON ideas USING gin(to_tsvector('simple', content));

-- ============================================================
-- ACTIVITIES (活动记录 - 用于 Recents)
-- ============================================================

CREATE TABLE IF NOT EXISTS activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('view', 'edit', 'create', 'sync')),
  view_type VARCHAR(20) NOT NULL CHECK (view_type IN ('study', 'code', 'chatlog', 'ideas')),
  target_id UUID NOT NULL,               -- 引用的目标 ID
  target_name VARCHAR(500) NOT NULL,
  target_path TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activities_view_type ON activities(view_type);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_activities_target_id ON activities(target_id);

-- ============================================================
-- PINNED ITEMS (置顶项目)
-- ============================================================

CREATE TABLE IF NOT EXISTS pinned_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('directory', 'file', 'project', 'chat')),
  item_id UUID NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(item_type, item_id)
);

CREATE INDEX IF NOT EXISTS idx_pinned_items_type ON pinned_items(item_type);
CREATE INDEX IF NOT EXISTS idx_pinned_items_order ON pinned_items(display_order);

-- ============================================================
-- SYNC LOGS (同步日志 - CLI 用)
-- ============================================================

CREATE TABLE IF NOT EXISTS sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'syncing', 'success', 'error')),
  files_added INT DEFAULT 0,
  files_updated INT DEFAULT 0,
  files_deleted INT DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sync_logs_source_id ON sync_logs(source_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_started_at ON sync_logs(started_at DESC);

-- ============================================================
-- API KEYS (API 密钥 - CLI 认证用)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,                          -- 可选: 关联用户 (未来扩展)
  name VARCHAR(255) NOT NULL,            -- 密钥名称 (如 "My MacBook CLI")
  key_hash VARCHAR(64) NOT NULL UNIQUE,  -- SHA-256 哈希值 (不存储明文)
  key_prefix VARCHAR(8) NOT NULL,        -- 密钥前缀用于识别 (如 "hub_abc1")
  scopes TEXT[] DEFAULT ARRAY['sync'],   -- 权限范围: sync, read, write, admin
  expires_at TIMESTAMPTZ,                -- 过期时间 (可选)
  last_used_at TIMESTAMPTZ,              -- 最后使用时间
  revoked BOOLEAN NOT NULL DEFAULT FALSE,-- 是否已吊销
  revoked_at TIMESTAMPTZ,                -- 吊销时间
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for API keys
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_revoked ON api_keys(revoked);
CREATE INDEX IF NOT EXISTS idx_api_keys_expires_at ON api_keys(expires_at);

-- ============================================================
-- API KEY USAGE LOGS (API 密钥使用日志)
-- ============================================================

CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key_id UUID NOT NULL REFERENCES api_keys(id) ON DELETE CASCADE,
  endpoint VARCHAR(255) NOT NULL,        -- 调用的端点
  method VARCHAR(10) NOT NULL,           -- HTTP 方法
  ip_address INET,                       -- 来源 IP
  user_agent TEXT,                       -- User-Agent
  status_code INT,                       -- 响应状态码
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for usage logs
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_key_id ON api_key_usage_logs(key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS update_directory_sources_updated_at ON directory_sources;
CREATE TRIGGER update_directory_sources_updated_at
  BEFORE UPDATE ON directory_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_files_updated_at ON files;
CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_chatlog_sources_updated_at ON chatlog_sources;
CREATE TRIGGER update_chatlog_sources_updated_at
  BEFORE UPDATE ON chatlog_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ideas_updated_at ON ideas;
CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_api_keys_updated_at ON api_keys;
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS (便捷查询视图)
-- ============================================================

-- Recent study items
CREATE OR REPLACE VIEW recent_study_items AS
SELECT
  ss.id,
  ds.name,
  ds.path,
  ss.last_accessed_at,
  ss.last_accessed_file
FROM study_spaces ss
JOIN directory_sources ds ON ss.directory_source_id = ds.id
ORDER BY ss.last_accessed_at DESC NULLS LAST;

-- Recent code projects
CREATE OR REPLACE VIEW recent_code_projects AS
SELECT
  cp.id,
  ds.name,
  ds.path,
  ds.mode,
  cp.pinned,
  cp.last_accessed_at,
  cp.start_here_files
FROM code_projects cp
JOIN directory_sources ds ON cp.directory_source_id = ds.id
ORDER BY cp.pinned DESC, cp.last_accessed_at DESC NULLS LAST;

-- Ideas inbox (only inbox status, not done)
CREATE OR REPLACE VIEW ideas_inbox AS
SELECT *
FROM ideas
WHERE status = 'inbox' AND done = FALSE
ORDER BY created_at DESC;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Cleanup old usage logs (keep last 30 days)
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_key_usage_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Function to check if an API key is valid
CREATE OR REPLACE FUNCTION is_api_key_valid(p_key_hash VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  v_key RECORD;
BEGIN
  SELECT * INTO v_key
  FROM api_keys
  WHERE key_hash = p_key_hash
    AND revoked = FALSE
    AND (expires_at IS NULL OR expires_at > NOW())
  LIMIT 1;

  IF v_key IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Update last_used_at
  UPDATE api_keys
  SET last_used_at = NOW()
  WHERE id = v_key.id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Function to revoke an API key
CREATE OR REPLACE FUNCTION revoke_api_key(p_key_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE api_keys
  SET revoked = TRUE,
      revoked_at = NOW()
  WHERE id = p_key_id
    AND revoked = FALSE;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- FULL-TEXT SEARCH FUNCTION
-- ============================================================

-- Global search function
CREATE OR REPLACE FUNCTION global_search(search_query TEXT, result_limit INT DEFAULT 20)
RETURNS TABLE (
  result_type TEXT,
  id UUID,
  title TEXT,
  snippet TEXT,
  path TEXT,
  rank REAL
) AS $$
BEGIN
  RETURN QUERY
  -- Search in files
  SELECT
    'file'::TEXT as result_type,
    f.id,
    f.name as title,
    substring(f.content, 1, 200) as snippet,
    f.path,
    ts_rank(to_tsvector('simple', COALESCE(f.content, '')), plainto_tsquery('simple', search_query)) as rank
  FROM files f
  WHERE to_tsvector('simple', COALESCE(f.content, '')) @@ plainto_tsquery('simple', search_query)

  UNION ALL

  -- Search in chat messages
  SELECT
    'chat'::TEXT as result_type,
    cm.chat_id as id,
    c.title as title,
    substring(cm.content, 1, 200) as snippet,
    NULL as path,
    ts_rank(to_tsvector('simple', cm.content), plainto_tsquery('simple', search_query)) as rank
  FROM chat_messages cm
  JOIN chats c ON cm.chat_id = c.id
  WHERE to_tsvector('simple', cm.content) @@ plainto_tsquery('simple', search_query)

  UNION ALL

  -- Search in ideas
  SELECT
    'idea'::TEXT as result_type,
    i.id,
    substring(i.content, 1, 50) as title,
    i.content as snippet,
    NULL as path,
    ts_rank(to_tsvector('simple', i.content), plainto_tsquery('simple', search_query)) as rank
  FROM ideas i
  WHERE to_tsvector('simple', i.content) @@ plainto_tsquery('simple', search_query)

  ORDER BY rank DESC
  LIMIT result_limit;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - 开发阶段禁用
-- ============================================================

-- 开发阶段允许所有操作，生产环境请启用 RLS
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

-- 开发阶段: 允许匿名访问所有表 (anon 角色)
-- 生产环境请根据需要修改这些策略

CREATE POLICY "Allow anonymous access to directory_sources" ON directory_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to files" ON files FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to code_projects" ON code_projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to study_spaces" ON study_spaces FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to chatlog_sources" ON chatlog_sources FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to chats" ON chats FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to chat_messages" ON chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to ideas" ON ideas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to activities" ON activities FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to pinned_items" ON pinned_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to sync_logs" ON sync_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to api_keys" ON api_keys FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow anonymous access to api_key_usage_logs" ON api_key_usage_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- SEED DATA (测试数据)
-- ============================================================

-- 插入一些测试数据
INSERT INTO ideas (content, status, done, tags) VALUES
  ('研究 Zustand 的 persist 中间件', 'inbox', false, ARRAY['tech']),
  ('写一个 CLI 工具用于本地同步', 'inbox', false, ARRAY['hub', 'feature']),
  ('看看 pgvector 怎么集成', 'inbox', true, ARRAY['search']),
  ('设计 ChatLog 的数据结构', 'inbox', false, ARRAY['design']),
  ('KISS 原则要贯彻到底', 'inbox', false, ARRAY[]::TEXT[])
ON CONFLICT DO NOTHING;

-- ============================================================
-- COMMENTS (表注释)
-- ============================================================

COMMENT ON TABLE directory_sources IS '目录来源 - 管理所有导入的目录';
COMMENT ON TABLE files IS '文件内容 - 同步后的文件存储';
COMMENT ON TABLE code_projects IS '代码项目 - 代码项目视图配置';
COMMENT ON TABLE study_spaces IS '学习空间 - 学习资料视图配置';
COMMENT ON TABLE chatlog_sources IS '对话来源 - AI 对话日志来源';
COMMENT ON TABLE chats IS '对话 - AI 对话会话';
COMMENT ON TABLE chat_messages IS '对话消息 - AI 对话消息内容';
COMMENT ON TABLE ideas IS '点子 - 快速捕获的想法和任务';
COMMENT ON TABLE activities IS '活动记录 - 用于最近访问追踪';
COMMENT ON TABLE pinned_items IS '置顶项目 - 常用项目快速访问';
COMMENT ON TABLE sync_logs IS '同步日志 - CLI 同步历史记录';
COMMENT ON TABLE api_keys IS 'API 密钥 - CLI 和外部集成认证';
COMMENT ON TABLE api_key_usage_logs IS 'API 密钥使用日志 - 审计和监控';

-- ============================================================
-- DONE!
-- ============================================================

SELECT 'Hub database schema created successfully!' as message;
