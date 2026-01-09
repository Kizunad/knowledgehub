# Hub

> 个人 Hub - 把 **Study（学习）/ Code（项目）/ ChatLog（对话）/ Ideas（点子）** 统一到一个地方

遵循 **KISS** 与 **Everything readable** 原则构建。

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | Next.js 14 + React 18 + Tailwind CSS + Zustand |
| 后端 | Supabase (PostgreSQL + Auth + Storage) |
| 搜索 | PostgreSQL Full-Text (后续可加 pgvector) |
| 部署 | Vercel + Supabase |
| 本地同步 | CLI 工具 |

## 项目结构

```
hub/
├── apps/
│   └── web/                # Next.js 14 前端应用
│       ├── src/
│       │   ├── app/        # App Router 页面
│       │   ├── components/ # React 组件
│       │   ├── lib/        # 工具库和 Supabase 客户端
│       │   └── store/      # Zustand 状态管理
│       └── ...
│
├── packages/
│   ├── cli/                # 本地同步 CLI 工具
│   │   └── src/
│   │       ├── commands/   # CLI 命令
│   │       └── index.ts    # CLI 入口
│   │
│   └── shared/             # 共享类型和工具
│       └── src/
│           └── types/      # TypeScript 类型定义
│
├── supabase/
│   ├── config.toml         # Supabase 本地配置
│   └── migrations/         # 数据库迁移文件
│
├── pnpm-workspace.yaml     # pnpm monorepo 配置
├── turbo.json              # Turborepo 配置
└── Project.md              # 项目设计文档
```

## 快速开始

### 前置要求

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Supabase CLI（可选，用于本地开发）

### 安装 pnpm（如果未安装）

```bash
npm install -g pnpm
```

### 安装依赖

```bash
cd hub
pnpm install
```

### 配置环境变量

```bash
# 复制示例文件
cp apps/web/.env.local.example apps/web/.env.local

# 编辑 .env.local，填入你的 Supabase 配置
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000 查看应用。

## CLI 工具使用

Hub CLI 用于将本地目录同步到 Hub。

### 初始化

```bash
cd your-project
pnpm --filter @hub/cli build
npx hub init
```

### 添加目录源

```bash
npx hub add ./path/to/directory
```

### 同步内容

```bash
npx hub sync
```

### 快速记录想法

```bash
npx hub idea "这是一个好主意" --tags feature,todo
```

## Directory Source 模式

Hub 支持三种目录来源模式：

| 模式 | 说明 | 适用场景 |
|------|------|----------|
| **GitHub** | 读取 GitHub 仓库内容 | 公开项目、Code 视图 |
| **Link Only** | 只存链接和备注 | 外部资源引用 |
| **Local Sync** | CLI 推送本地内容 | 私有项目、Study 资料 |

## 核心功能

### 🏠 Home（驾驶舱）
- Quick Capture 快速记录想法
- Ideas Inbox 展示
- Study/Code Recents 快速访问
- Pinned Projects 置顶项目

### 📚 Study（学习）
- 最近学习记录
- Study Spaces（学习空间）列表
- 目录索引和文件浏览

### 💻 Code（项目）
- 项目列表（Pinned/Recent/All）
- 入口地图（Start Here / Key Areas / Run Commands）
- 关联到 Study/Chat/Ideas 的链接

### 💬 ChatLog（对话）
- 纯时间线视图（Day/Week）
- 一键丢到 Ideas Inbox

### 💡 Ideas（点子）
- 单文件 `ideas.md` 管理
- Inbox / Active / Archive 状态
- #tags 和 @refs 支持

## 开发命令

```bash
# 启动所有开发服务
pnpm dev

# 构建所有包
pnpm build

# 运行 lint
pnpm lint

# 清理构建产物
pnpm clean

# 数据库迁移（需要 Supabase CLI）
pnpm db:migrate
```

### 单包命令

```bash
# 只构建 shared 包
pnpm --filter @hub/shared build

# 只启动 web 开发服务器
pnpm --filter @hub/web dev

# 构建 CLI 工具
pnpm --filter @hub/cli build

# 运行 CLI
node packages/cli/dist/index.js --help
```

### 脚本说明

| 脚本 | 说明 |
|------|------|
| `pnpm dev` | 启动所有包的开发模式（Turborepo 并行） |
| `pnpm build` | 构建所有包（按依赖顺序） |
| `pnpm lint` | 运行所有包的 lint 检查 |
| `pnpm clean` | 清理所有构建产物和 node_modules |
| `pnpm db:migrate` | 推送数据库迁移到 Supabase |
| `pnpm db:reset` | 重置数据库（开发用） |

## 引用约定

Hub 使用轻量文本引用格式：

```
@dir:<path>        # 引用目录
@file:<path>       # 引用文件
@chat:<date>#<id>  # 引用对话位置
```

## 设计原则

### Source-first（来源优先）
- 一切内容来自 Source（Directory/ChatLog/ideas.md）
- Hub 以引用/索引/跳转为主，不强制搬运内容

### View-first（视图优先）
- Study/Code/ChatLog 是视图，不是独立的库
- 同一个目录可以同时在多个视图中出现

### Everything readable
- 产物保持可读、可迁移
- `ideas.md` 是纯 Markdown，可独立存在

## License

MIT