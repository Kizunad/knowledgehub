# ⚡ Hub 快速启动检查清单

按顺序执行以下步骤，快速启动 Hub 项目。

## ✅ 检查清单

### 1. 安装 pnpm

```powershell
npm install -g pnpm
```

验证：
```powershell
pnpm --version
# 期望输出：9.x.x 或更高
```

- [ ] pnpm 已安装

---

### 2. 安装项目依赖

```powershell
cd hub
pnpm install
```

- [ ] 依赖安装成功（无报错）

---

### 3. 配置环境变量

```powershell
# Windows PowerShell
Copy-Item apps/web/.env.local.example apps/web/.env.local

# 或者手动复制
```

编辑 `apps/web/.env.local`：

```env
NEXT_PUBLIC_SUPABASE_URL=你的Supabase项目URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

> 💡 如果还没有 Supabase 项目，访问 https://supabase.com 创建一个免费项目

- [ ] .env.local 已创建并配置

---

### 4. 构建共享包

```powershell
pnpm --filter @hub/shared build
```

- [ ] @hub/shared 构建成功

---

### 5. 初始化数据库

在 Supabase Dashboard 的 SQL Editor 中执行：

```sql
-- 复制 supabase/migrations/001_initial_schema.sql 的内容并执行
```

- [ ] 数据库表已创建

---

### 6. 启动开发服务器

```powershell
pnpm dev
```

- [ ] 服务器启动成功
- [ ] http://localhost:3000 可访问
- [ ] 页面正常显示

---

## 🎉 完成！

如果所有步骤都打勾，你的 Hub 项目就准备就绪了！

## 后续步骤

| 任务 | 命令 |
|------|------|
| 构建 CLI 工具 | `pnpm --filter @hub/cli build` |
| 构建所有包 | `pnpm build` |
| 运行 lint | `pnpm lint` |
| 清理构建 | `pnpm clean` |

## 遇到问题？

1. 查看 `SETUP.md` 获取详细安装说明
2. 查看 `INIT_COMPLETE.md` 了解项目结构
3. 查看 `Project.md` 了解设计理念

---

**开始 Hacking 吧！🚀**