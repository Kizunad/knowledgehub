# 开发者指南

本文档面向 Hub 项目的开发者，介绍项目结构、开发规范和贡献流程。

## 目录

- [项目架构](#项目架构)
- [开发环境设置](#开发环境设置)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [开发工作流](#开发工作流)
- [包开发指南](#包开发指南)

## 项目架构

### Monorepo 结构

Hub 使用 **pnpm workspace** + **Turborepo** 管理 monorepo：

```
hub/
├── apps/              # 应用程序
│   └── web/           # Next.js 前端
├── packages/          # 共享包
│   ├── shared/        # 类型定义和工具
│   └── cli/           # 命令行工具
└── supabase/          # 数据库配置和迁移
```

### 包依赖关系

```
@hub/web ─────┐
              ├──► @hub/shared
@hub/cli ─────┘
```

### 技术选型理由

| 技术 | 选择理由 |
|------|----------|
| **Next.js 14** | App Router、Server Components、API Routes 一体化 |
| **Tailwind CSS** | 快速迭代、易于定制、零运行时 |
| **Zustand** | 轻量、简单、TypeScript 友好 |
| **Supabase** | PostgreSQL + Auth + Storage 一站式、免费额度慷慨 |
| **pnpm** | 快速、节省磁盘空间、严格的依赖管理 |
| **Turborepo** | 增量构建、缓存、并行执行 |

## 开发环境设置

### 必需工具

- Node.js >= 20.0.0
- pnpm >= 9.0.0
- Git

### 推荐 IDE 设置

**VS Code 扩展：**
- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer

**推荐配置 (`.vscode/settings.json`)：**

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "tailwindCSS.experimental.classRegex": [
    ["cn\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ]
}
```

## 代码规范

### TypeScript

- 使用 **严格模式** (`"strict": true`)
- 优先使用 **interface** 而非 type（除非需要联合类型）
- 导出类型时使用 `export type`
- 避免 `any`，使用 `unknown` 代替

```typescript
// ✅ Good
export interface User {
  id: string
  name: string
}

// ❌ Bad
export type User = {
  id: any
  name: any
}
```

### React / Next.js

- 使用 **函数组件** + Hooks
- 组件文件使用 **PascalCase**（`QuickCapture.tsx`）
- 工具函数使用 **camelCase**（`formatDate.ts`）
- 优先使用 **Server Components**，只在必要时使用 `'use client'`

```tsx
// ✅ Server Component (默认)
export default function StudyPage() {
  return <div>...</div>
}

// ✅ Client Component (需要交互)
'use client'
export function QuickCapture() {
  const [input, setInput] = useState('')
  return <input value={input} onChange={e => setInput(e.target.value)} />
}
```

### Tailwind CSS

- 使用 `cn()` 工具函数合并类名
- 遵循项目定义的颜色系统（hub、study、code、chat、ideas）
- 使用 `@apply` 提取重复的类组合

```tsx
import { cn } from '@/lib/utils'

function Button({ primary, className }) {
  return (
    <button className={cn(
      'px-4 py-2 rounded-lg',
      primary && 'bg-primary text-primary-foreground',
      className
    )}>
      ...
    </button>
  )
}
```

### 文件组织

```
src/
├── app/                    # Next.js App Router
│   ├── (routes)/           # 路由分组
│   ├── api/                # API 路由
│   └── layout.tsx
├── components/
│   ├── ui/                 # 基础 UI 组件
│   ├── features/           # 功能组件
│   └── layout/             # 布局组件
├── lib/
│   ├── supabase/           # Supabase 客户端
│   ├── utils.ts            # 工具函数
│   └── constants.ts        # 常量
└── store/                  # Zustand stores
```

## 提交规范

### Commit Message 格式

使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Type 类型

| Type | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `docs` | 文档更新 |
| `style` | 代码格式（不影响逻辑） |
| `refactor` | 重构（不新增功能或修复 bug） |
| `perf` | 性能优化 |
| `test` | 测试相关 |
| `chore` | 构建/工具链相关 |

### Scope 范围

- `web` - 前端应用
- `cli` - CLI 工具
- `shared` - 共享包
- `db` - 数据库相关
- `deps` - 依赖更新

### 示例

```
feat(web): add Quick Capture component to Home page

- Implement input field with Enter key submission
- Save captured ideas to Supabase
- Display success/error feedback

Closes #12
```

## 开发工作流

### 日常开发

```bash
# 1. 启动开发服务器
pnpm dev

# 2. 在浏览器中查看
open http://localhost:3000

# 3. 修改代码，自动热更新
```

### 添加新功能

```bash
# 1. 创建功能分支
git checkout -b feat/quick-capture

# 2. 开发并测试
pnpm dev

# 3. 构建检查
pnpm build

# 4. 提交代码
git add .
git commit -m "feat(web): add Quick Capture component"

# 5. 推送并创建 PR
git push origin feat/quick-capture
```

### 添加新依赖

```bash
# 添加到特定包
pnpm --filter @hub/web add lucide-react

# 添加开发依赖
pnpm --filter @hub/web add -D @types/node

# 添加到根目录（工具链）
pnpm add -w -D prettier
```

## 包开发指南

### @hub/shared

共享类型和工具函数，被其他包依赖。

**添加新类型：**

```typescript
// packages/shared/src/types/index.ts
export interface NewType {
  id: string
  // ...
}
```

**构建：**

```bash
pnpm --filter @hub/shared build
```

### @hub/web

Next.js 前端应用。

**添加新页面：**

```bash
# 创建页面文件
touch apps/web/src/app/study/page.tsx
```

**添加新组件：**

```bash
# 创建组件文件
touch apps/web/src/components/features/StudySpace.tsx
```

### @hub/cli

命令行工具。

**添加新命令：**

1. 创建命令文件：
   ```bash
   touch packages/cli/src/commands/new-command.ts
   ```

2. 在 `index.ts` 中注册命令：
   ```typescript
   import { newCommand } from './commands/new-command.js'
   
   program
     .command('new-command')
     .description('Description')
     .action(newCommand)
   ```

3. 构建并测试：
   ```bash
   pnpm --filter @hub/cli build
   node packages/cli/dist/index.js new-command
   ```

## 数据库开发

### 添加新迁移

```sql
-- supabase/migrations/002_add_feature.sql

-- Add new table
CREATE TABLE new_feature (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index
CREATE INDEX idx_new_feature_name ON new_feature(name);
```

### 本地测试

```bash
# 使用 Supabase CLI（需要 Docker）
supabase start
supabase db push
```

### 更新类型定义

当数据库 schema 变更时，同步更新 `@hub/shared` 中的类型定义。

## 调试技巧

### Next.js 调试

```typescript
// 服务端日志
console.log('Server:', data)

// 客户端日志
'use client'
useEffect(() => {
  console.log('Client:', data)
}, [data])
```

### Supabase 调试

```typescript
const { data, error } = await supabase
  .from('ideas')
  .select('*')

if (error) {
  console.error('Supabase error:', error)
}
```

### CLI 调试

```bash
# 启用详细输出
DEBUG=* node packages/cli/dist/index.js sync
```

## 性能优化

### 前端

- 使用 `next/image` 优化图片
- 使用 `dynamic()` 懒加载组件
- 避免不必要的 `'use client'`

### 数据库

- 使用适当的索引
- 使用 `select()` 只获取需要的字段
- 使用分页避免大量数据

## 问题排查

### 常见问题

| 问题 | 解决方案 |
|------|----------|
| 类型错误 | `pnpm --filter @hub/shared build` |
| 依赖冲突 | `pnpm install --force` |
| 缓存问题 | `pnpm clean && pnpm install` |
| 端口占用 | `pnpm dev -- -p 3001` |

### 获取帮助

1. 查看项目文档（README.md、SETUP.md）
2. 检查 GitHub Issues
3. 查看依赖库的官方文档

---

**Happy Coding! 🚀**