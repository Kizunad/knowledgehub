-- ============================================================
-- Hub Initial Database Schema
-- ============================================================
-- This migration creates the core tables for the Hub application
-- Following the KISS principle with minimal but complete structure

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For text search

-- ============================================================
-- DIRECTORY SOURCES (目录来源)
-- ============================================================

CREATE TABLE directory_sources (
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
CREATE INDEX idx_directory_sources_mode ON directory_sources(mode);
CREATE INDEX idx_directory_sources_name ON directory_sources(name);

-- ============================================================
-- FILES (文件内容 - 用于同步后的文件存储)
-- ============================================================

CREATE TABLE files (
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
CREATE INDEX idx_files_source_id ON files(source_id);
CREATE INDEX idx_files_path ON files(path);
CREATE INDEX idx_files_name ON files(name);

-- Full-text search index on content
CREATE INDEX idx_files_content_search ON files USING gin(to_tsvector('simple', COALESCE(content, '')));

-- ============================================================
-- CODE PROJECTS (代码项目视图)
-- ============================================================

CREATE TABLE code_projects (
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

CREATE INDEX idx_code_projects_pinned ON code_projects(pinned);
CREATE INDEX idx_code_projects_last_accessed ON code_projects(last_accessed_at DESC);

-- ============================================================
-- STUDY SPACES (学习空间视图)
-- ============================================================

CREATE TABLE study_spaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  directory_source_id UUID NOT NULL REFERENCES directory_sources(id) ON DELETE CASCADE,
  last_accessed_at TIMESTAMPTZ,
  last_accessed_file TEXT,               -- 上次打开的文件
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(directory_source_id)
);

CREATE INDEX idx_study_spaces_last_accessed ON study_spaces(last_accessed_at DESC);

-- ============================================================
-- CHATLOG SOURCES (对话来源)
-- ============================================================

CREATE TABLE chatlog_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  provider VARCHAR(50) NOT NULL,         -- e.g., 'openai', 'anthropic', 'custom'
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- CHATS (对话)
-- ============================================================

CREATE TABLE chats (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES chatlog_sources(id) ON DELETE SET NULL,
  title VARCHAR(500),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chats_source_id ON chats(source_id);
CREATE INDEX idx_chats_started_at ON chats(started_at DESC);

-- ============================================================
-- CHAT MESSAGES (对话消息)
-- ============================================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chat_messages_chat_id ON chat_messages(chat_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at);

-- Full-text search on messages
CREATE INDEX idx_chat_messages_content_search ON chat_messages USING gin(to_tsvector('simple', content));

-- ============================================================
-- IDEAS (点子)
-- ============================================================

CREATE TABLE ideas (
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

CREATE INDEX idx_ideas_status ON ideas(status);
CREATE INDEX idx_ideas_done ON ideas(done);
CREATE INDEX idx_ideas_created_at ON ideas(created_at DESC);
CREATE INDEX idx_ideas_tags ON ideas USING gin(tags);

-- Full-text search on ideas
CREATE INDEX idx_ideas_content_search ON ideas USING gin(to_tsvector('simple', content));

-- ============================================================
-- ACTIVITIES (活动记录 - 用于 Recents)
-- ============================================================

CREATE TABLE activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  activity_type VARCHAR(20) NOT NULL CHECK (activity_type IN ('view', 'edit', 'create', 'sync')),
  view_type VARCHAR(20) NOT NULL CHECK (view_type IN ('study', 'code', 'chatlog', 'ideas')),
  target_id UUID NOT NULL,               -- 引用的目标 ID
  target_name VARCHAR(500) NOT NULL,
  target_path TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_activities_view_type ON activities(view_type);
CREATE INDEX idx_activities_timestamp ON activities(timestamp DESC);
CREATE INDEX idx_activities_target_id ON activities(target_id);

-- ============================================================
-- PINNED ITEMS (置顶项目)
-- ============================================================

CREATE TABLE pinned_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('directory', 'file', 'project', 'chat')),
  item_id UUID NOT NULL,
  display_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(item_type, item_id)
);

CREATE INDEX idx_pinned_items_type ON pinned_items(item_type);
CREATE INDEX idx_pinned_items_order ON pinned_items(display_order);

-- ============================================================
-- SYNC LOGS (同步日志 - CLI 用)
-- ============================================================

CREATE TABLE sync_logs (
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

CREATE INDEX idx_sync_logs_source_id ON sync_logs(source_id);
CREATE INDEX idx_sync_logs_started_at ON sync_logs(started_at DESC);

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
CREATE TRIGGER update_directory_sources_updated_at
  BEFORE UPDATE ON directory_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_files_updated_at
  BEFORE UPDATE ON files
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chatlog_sources_updated_at
  BEFORE UPDATE ON chatlog_sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON ideas
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEWS (便捷查询视图)
-- ============================================================

-- Recent study items
CREATE VIEW recent_study_items AS
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
CREATE VIEW recent_code_projects AS
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
CREATE VIEW ideas_inbox AS
SELECT *
FROM ideas
WHERE status = 'inbox' AND done = FALSE
ORDER BY created_at DESC;

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
-- SEED DATA (可选 - 用于测试)
-- ============================================================

-- Uncomment to add seed data for development
/*
INSERT INTO ideas (content, status, done, tags) VALUES
  ('研究 Zustand 的 persist 中间件', 'inbox', false, ARRAY['tech']),
  ('写一个 CLI 工具用于本地同步', 'inbox', false, ARRAY['hub', 'feature']),
  ('看看 pgvector 怎么集成', 'inbox', true, ARRAY['search']),
  ('设计 ChatLog 的数据结构', 'inbox', false, ARRAY['design']),
  ('KISS 原则要贯彻到底', 'inbox', false, ARRAY[]::TEXT[]);
*/
