# Hub 安装指南

本文档将指导你完成 Hub 项目的安装和配置。

## 前置要求

确保你的系统已安装以下工具：

- **Node.js** >= 20.0.0
- **pnpm** >= 9.0.0
- **Git**

### 检查 Node.js 版本

```bash
node --version
# 应该输出 v20.x.x 或更高版本
```

### 安装 pnpm

如果尚未安装 pnpm：

```bash
npm install -g pnpm
```

验证安装：

```bash
pnpm --version
# 应该输出 9.x.x 或更高版本
```

## 安装步骤

### 1. 安装项目依赖

```bash
cd hub
pnpm install
```

这将安装所有 workspace 包的依赖。

### 2. 配置环境变量

```bash
# 复制示例环境变量文件
cp apps/web/.env.local.example apps/web/.env.local
```

编辑 `apps/web/.env.local`，填入你的配置：

```env
# Supabase 配置（必须）
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# 服务端 Supabase 密钥（可选，用于 API routes）
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# GitHub 集成（可选）
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

### 3. 设置 Supabase

#### 选项 A：使用 Supabase Cloud（推荐）

1. 访问 [supabase.com](https://supabase.com) 创建新项目
2. 在项目设置中获取 URL 和 API Keys
3. 填入 `.env.local`
4. 在 Supabase Dashboard 的 SQL Editor 中运行 `supabase/migrations/001_initial_schema.sql`

#### 选项 B：本地 Supabase（需要 Docker）

```bash
# 安装 Supabase CLI
npm install -g supabase

# 启动本地 Supabase
cd hub
supabase start

# 运行数据库迁移
supabase db push
```

本地 Supabase 默认配置：
- API URL: `http://127.0.0.1:54321`
- Studio URL: `http://127.0.0.1:54323`

### 4. 构建共享包

```bash
# 构建 shared 包（其他包依赖它）
pnpm --filter @hub/shared build
```

### 5. 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

## 验证安装

### 检查 Web 应用

1. 打开浏览器访问 http://localhost:3000
2. 应该看到 Hub 的 Home 页面
3. 确认导航栏显示：Home / Study / Code / ChatLog / Ideas

### 检查 CLI 工具

```bash
# 构建 CLI
pnpm --filter @hub/cli build

# 测试 CLI
node packages/cli/dist/index.js --help
```

应该看到 Hub CLI 的帮助信息。

## 常见问题

### Q: `pnpm install` 失败

确保使用正确版本的 pnpm：

```bash
pnpm --version  # 需要 9.x.x
```

如果版本不对，更新 pnpm：

```bash
npm install -g pnpm@latest
```

### Q: Next.js 启动报错 "Module not found"

确保先构建 shared 包：

```bash
pnpm --filter @hub/shared build
```

### Q: Supabase 连接失败

1. 检查 `.env.local` 中的 URL 和 Key 是否正确
2. 确保 Supabase 项目已创建并运行
3. 检查网络连接

### Q: TypeScript 类型错误

运行类型检查：

```bash
pnpm --filter @hub/web typecheck
```

如果是 shared 包的类型问题，重新构建：

```bash
pnpm --filter @hub/shared build
```

### Q: 端口 3000 被占用

修改启动端口：

```bash
pnpm --filter @hub/web dev -- -p 3001
```

## 下一步

安装完成后，你可以：

1. **探索代码结构**：查看 `apps/web/src/app/` 了解页面结构
2. **配置 CLI**：在你的项目目录运行 `hub init` 初始化同步
3. **阅读设计文档**：查看 `Project.md` 了解完整设计理念

## 开发工作流

```bash
# 日常开发
pnpm dev

# 提交前构建检查
pnpm build

# 运行 lint
pnpm lint

# 清理所有构建产物
pnpm clean
```

## 获取帮助

如果遇到问题：

1. 查看项目 README.md
2. 查看 Project.md 了解设计意图
3. 检查各包的 package.json 了解可用脚本