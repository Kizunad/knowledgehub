# Hub 用户数据隔离

本文档描述了 Hub 项目中用户数据隔离的实现方案。

## 概述

用户数据隔离确保每个用户只能访问自己的数据。这是通过以下机制实现的：

1. **数据库层面**: 所有核心表添加 `user_id` 字段
2. **RLS 策略**: Supabase Row Level Security 自动过滤数据
3. **API 层面**: 所有 API 路由显式验证用户身份并过滤数据

## 数据库迁移

### 运行迁移脚本

#### 方法 1: 使用 PowerShell 脚本 (推荐)

```powershell
cd hub/scripts
.\apply-migrations.ps1
```

脚本选项：
- `-Migration "003"` - 只运行特定迁移
- `-DryRun` - 显示 SQL 但不执行
- `-UseSupabaseCLI` - 使用 Supabase CLI 而不是直接 SQL

#### 方法 2: 手动在 Supabase SQL Editor 执行

1. 打开 [Supabase Dashboard](https://supabase.com/dashboard/project/_/sql)
2. 复制 `supabase/migrations/003_user_isolation.sql` 的内容
3. 粘贴并执行

### 迁移内容

迁移文件 `003_user_isolation.sql` 包含以下更改：

#### 1. 添加 `user_id` 字段

为所有核心表添加 `user_id` 字段：

| 表名 | 说明 |
|------|------|
| `directory_sources` | 目录来源 |
| `files` | 文件内容 |
| `code_projects` | 代码项目 |
| `study_spaces` | 学习空间 |
| `chatlog_sources` | 对话来源 |
| `chats` | 对话 |
| `chat_messages` | 对话消息 |
| `ideas` | 点子 |
| `activities` | 活动记录 |
| `pinned_items` | 置顶项目 |
| `sync_logs` | 同步日志 |
| `api_keys` | API 密钥 |
| `api_key_usage_logs` | API 密钥使用日志 |

#### 2. 创建索引

为所有 `user_id` 字段创建索引以优化查询性能：

```sql
CREATE INDEX IF NOT EXISTS idx_ideas_user_id ON ideas(user_id);
-- ... 其他表类似
```

#### 3. RLS 策略

为每个表创建 4 个策略：

```sql
-- 查看自己的数据
CREATE POLICY "Users can view own ideas"
ON ideas FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 插入自己的数据
CREATE POLICY "Users can insert own ideas"
ON ideas FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- 更新自己的数据
CREATE POLICY "Users can update own ideas"
ON ideas FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- 删除自己的数据
CREATE POLICY "Users can delete own ideas"
ON ideas FOR DELETE
TO authenticated
USING (user_id = auth.uid());
```

#### 4. Service Role 绕过策略

Service Role (用于 CLI 和管理操作) 可以访问所有数据：

```sql
CREATE POLICY "Service role bypass for ideas"
ON ideas FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
```

#### 5. 自动设置 `user_id` 触发器

插入数据时自动设置 `user_id`：

```sql
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.user_id IS NULL THEN
        NEW.user_id := auth.uid();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_user_id_ideas
    BEFORE INSERT ON ideas
    FOR EACH ROW
    EXECUTE FUNCTION set_user_id();
```

## API 路由更新

### 认证辅助函数

在 `lib/supabase/server.ts` 中添加了以下辅助函数：

#### `requireAuth()`

验证用户身份，返回用户信息或错误响应：

```typescript
import { requireAuth, isAuthError } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
    const authResult = await requireAuth();
    if (isAuthError(authResult)) {
        return authResult; // 返回 401 错误
    }
    const { user, userId } = authResult;
    // 继续处理...
}
```

#### `requireAuthWithDevBypass()`

与 `requireAuth()` 相同，但在开发模式下可绕过认证：

```typescript
const authResult = await requireAuthWithDevBypass();
```

设置 `DEV_AUTH_BYPASS=true` 环境变量启用开发模式绕过。

#### `getCurrentUser()` / `getCurrentUserId()`

获取当前用户信息（不强制要求认证）：

```typescript
const user = await getCurrentUser();
const userId = await getCurrentUserId();
```

### API 路由示例

更新后的 API 路由示例 (`api/ideas/route.ts`)：

```typescript
export async function POST(request: NextRequest) {
    // 1. 验证用户身份
    const authResult = await requireAuthWithDevBypass();
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { userId } = authResult;

    // 2. 创建数据时显式设置 user_id
    const { data, error } = await supabase
        .from("ideas")
        .insert({
            content: body.content,
            user_id: userId, // 显式设置
        })
        .select()
        .single();
}

export async function GET(request: NextRequest) {
    const authResult = await requireAuthWithDevBypass();
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { userId } = authResult;

    // 查询时显式过滤 (虽然 RLS 也会过滤)
    const { data } = await supabase
        .from("ideas")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
}
```

## 已更新的 API 路由

| 路由 | 状态 |
|------|------|
| `/api/ideas` | ✅ 已更新 |
| `/api/chats` | ✅ 已更新 |
| `/api/chats/[id]` | ✅ 已更新 |
| `/api/sources` | ✅ 已更新 |
| `/api/sources/[id]` | ✅ 已更新 |
| `/api/activities` | ✅ 已更新 |
| `/api/files` | ✅ 已更新 |
| `/api/files/[id]` | ✅ 已更新 |
| `/api/files/upload` | ✅ 已更新 |
| `/api/sync` | ✅ 已更新 |
| `/api/sync/github` | ✅ 已更新 |
| `/api/search` | ✅ 已更新 |

## 开发模式

在开发过程中，可以启用认证绕过以方便测试：

1. 在 `.env.local` 中添加：
   ```
   DEV_AUTH_BYPASS=true
   ```

2. API 路由会使用 mock 用户：
   ```
   User ID: dev-user-00000000-0000-0000-0000-000000000000
   Email: dev@localhost
   ```

⚠️ **警告**: 生产环境绝不要启用 `DEV_AUTH_BYPASS`！

## 数据迁移

如果你有现有数据没有 `user_id`，可以运行以下 SQL 为其分配用户：

```sql
-- 将所有没有 user_id 的数据分配给特定用户
UPDATE ideas 
SET user_id = 'your-user-uuid-here' 
WHERE user_id IS NULL;

-- 或者如果只有一个用户，可以从 auth.users 获取
UPDATE ideas 
SET user_id = (SELECT id FROM auth.users LIMIT 1)
WHERE user_id IS NULL;
```

## 验证

运行以下 SQL 验证 RLS 是否正确配置：

```sql
-- 检查 RLS 状态
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 检查所有策略
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
```

## 安全注意事项

1. **双重保护**: 虽然 RLS 会自动过滤数据，API 路由仍然显式添加 `user_id` 过滤作为深度防御
2. **Service Role**: 只在必要时使用 service role，如 CLI 操作和管理功能
3. **审计日志**: `api_key_usage_logs` 记录所有 API 密钥使用情况
4. **不要信任客户端**: 永远不要让客户端指定 `user_id`，始终从服务器端的 session 获取

## 下一步

1. ~~更新剩余的 API 路由~~ ✅ 已完成
2. 更新前端组件以处理 401 错误
3. 添加自动化测试验证数据隔离
4. 实现用户数据导出功能
5. 执行数据库迁移 `003_user_isolation.sql`
6. 迁移现有数据（为没有 `user_id` 的数据分配用户）