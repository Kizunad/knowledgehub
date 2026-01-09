-- ============================================================
-- Hub API Keys Schema
-- ============================================================
-- This migration adds API key support for CLI authentication

-- ============================================================
-- API KEYS (API 密钥 - CLI 认证用)
-- ============================================================

CREATE TABLE api_keys (
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
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_revoked ON api_keys(revoked);
CREATE INDEX idx_api_keys_expires_at ON api_keys(expires_at);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON api_keys
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- API KEY USAGE LOGS (API 密钥使用日志)
-- ============================================================

CREATE TABLE api_key_usage_logs (
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
CREATE INDEX idx_api_key_usage_logs_key_id ON api_key_usage_logs(key_id);
CREATE INDEX idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at DESC);

-- Cleanup old usage logs (keep last 30 days)
-- Can be called periodically via cron job
CREATE OR REPLACE FUNCTION cleanup_old_usage_logs()
RETURNS void AS $$
BEGIN
  DELETE FROM api_key_usage_logs
  WHERE created_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

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
-- ROW LEVEL SECURITY (RLS) - 可选，用于多用户场景
-- ============================================================

-- Enable RLS on api_keys (uncomment when user auth is implemented)
-- ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own keys
-- CREATE POLICY api_keys_user_policy ON api_keys
--   FOR ALL
--   USING (user_id = auth.uid());

-- ============================================================
-- COMMENTS
-- ============================================================

COMMENT ON TABLE api_keys IS 'API keys for CLI and external integrations';
COMMENT ON COLUMN api_keys.key_hash IS 'SHA-256 hash of the API key. Original key is never stored.';
COMMENT ON COLUMN api_keys.key_prefix IS 'First 8 characters of the key for identification';
COMMENT ON COLUMN api_keys.scopes IS 'Permission scopes: sync (file sync), read (read data), write (write data), admin (all)';
COMMENT ON TABLE api_key_usage_logs IS 'Audit log of API key usage for monitoring and debugging';
