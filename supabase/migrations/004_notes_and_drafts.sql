-- ============================================================
-- Migration 004: Notes and Drafts
-- ============================================================
-- Adds support for:
-- 1. Notes - For writing notes within a Space
-- 2. Drafts - Scratch pad for temporary content with auto-save
-- ============================================================

-- ============================================================
-- NOTES (笔记 - 关联到 Space)
-- ============================================================

CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  source_id UUID REFERENCES directory_sources(id) ON DELETE CASCADE,
  title VARCHAR(500),
  content TEXT NOT NULL DEFAULT '',
  content_type VARCHAR(20) NOT NULL DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'plaintext', 'code')),
  language VARCHAR(50),                  -- For code notes (e.g., 'javascript', 'python')
  tags TEXT[],                           -- Tags for organization
  is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
  user_id UUID,                          -- For user isolation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS idx_notes_source_id ON notes(source_id);
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_is_pinned ON notes(is_pinned);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON notes USING gin(tags);

-- Full-text search on notes
CREATE INDEX IF NOT EXISTS idx_notes_content_search ON notes USING gin(to_tsvector('simple', COALESCE(title, '') || ' ' || content));

-- ============================================================
-- DRAFTS (草稿本 - 临时存储，可选保存到指定位置)
-- ============================================================

CREATE TABLE IF NOT EXISTS drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(500),
  content TEXT NOT NULL DEFAULT '',
  content_type VARCHAR(20) NOT NULL DEFAULT 'markdown' CHECK (content_type IN ('markdown', 'plaintext', 'code')),
  language VARCHAR(50),                  -- For code drafts
  target_source_id UUID REFERENCES directory_sources(id) ON DELETE SET NULL,  -- Optional: target location to save
  is_auto_saved BOOLEAN NOT NULL DEFAULT TRUE,  -- Whether this was auto-saved or explicitly saved
  user_id UUID,                          -- For user isolation
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for drafts
CREATE INDEX IF NOT EXISTS idx_drafts_user_id ON drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_drafts_target_source_id ON drafts(target_source_id);
CREATE INDEX IF NOT EXISTS idx_drafts_is_auto_saved ON drafts(is_auto_saved);
CREATE INDEX IF NOT EXISTS idx_drafts_updated_at ON drafts(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_drafts_created_at ON drafts(created_at DESC);

-- Full-text search on drafts
CREATE INDEX IF NOT EXISTS idx_drafts_content_search ON drafts USING gin(to_tsvector('simple', COALESCE(title, '') || ' ' || content));

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Optional, for user isolation
-- ============================================================

-- Enable RLS on notes
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own notes
CREATE POLICY notes_user_isolation ON notes
  FOR ALL
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Enable RLS on drafts
ALTER TABLE drafts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own drafts
CREATE POLICY drafts_user_isolation ON drafts
  FOR ALL
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- ============================================================
-- TRIGGERS for updated_at
-- ============================================================

-- Trigger function (if not already exists from previous migrations)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for notes
DROP TRIGGER IF EXISTS update_notes_updated_at ON notes;
CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for drafts
DROP TRIGGER IF EXISTS update_drafts_updated_at ON drafts;
CREATE TRIGGER update_drafts_updated_at
  BEFORE UPDATE ON drafts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
