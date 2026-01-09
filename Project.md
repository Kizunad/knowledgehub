# 个人 Hub（KISS 版）形态总结

> 目标：做一个**个人用**的 Hub，把 **Study（学习）/ Code（项目）/ ChatLog（对话）/ Ideas（点子）**统一到一个地方；坚持 **KISS** 与 **Everything readable**。

---

## 核心原则

### Source-first（来源优先）
- 一切内容都来自 **Source**：
  - **Directory（目录）**：可读文件集合（md/txt/c/cpp…）
  - **ChatLog（对话流）**
  - **ideas.md（点子单文件）**
- Hub 不强制搬运内容：以**引用/索引/跳转**为主。

### View-first（视图优先）
- Study / Code / ChatLog 是**视图**，不是不同的“库”。
- 同一个目录 Source 可以同时挂在多个视图下：**不纠结归属，按意图切换**。

### Everything readable
- 产物尽量保持可读、可迁移。
- `ideas.md` 是纯 Markdown，可独立于 Hub 存在。

---

## 全局导航（无 Collections，保持极简）

- **Home**（驾驶舱）
- **Study**（最近学习优先）
- **Code**（项目列表/入口地图）
- **ChatLog**（按天/周分页的纯时间线）
- **Global Search**（全局搜索，跨所有 Sources）

---

## Sources（来源）

### Directory Source（你关心的目录）
- **手动添加**：只把你关心的目录加入 Hub（不扫描硬盘）。
- 加入时可选一条“备注”（可选，不强迫分类）。
- 加入后：
  - 在 Code 中视为一个 **Project**
  - 在 Study 中视为一个 **Study Space**

### ChatLog Source
- 作为对话事件流来源。
- 默认视图是**纯时间线**（不自动生成周报/摘要/聚类）。

### Ideas Source：单文件 `ideas.md`
- 用一个文件承载所有点子（KISS）。
- 以 **Inbox（随手记）** 为主。

---

## Home（驾驶舱）

### 必须存在：Ideas Inbox + Quick Capture
- Home 顶部有一个 **Quick Capture 临时输入框**：
  - 一句话输入 → 回车保存
  - **最终写入 `ideas.md` 的 Inbox**
  - **不加任何前缀**（不自动时间戳、不自动来源）
- 输入框下方展示 `ideas.md` Inbox 的最近 10–20 条（可打勾/取消勾）。

### 其他两块（尽量保持简单）
- **Study Recents**：最近学习过的目录/文件
- **Code Recents / Pinned**：最近项目 + 置顶项目

---

## Ideas（点子）— 单文件 + Inbox（随手记为主）

### 文件：`ideas.md`
结构建议（极简）：
- `# Ideas`
- `## Inbox`
- （可选）`## Active` / `## Archive`（以后再加也不迟）

### Inbox 记录格式（推荐）
- 一行一条，尽量不打断记录：
  - `- [ ] 一句话点子 #tag @ref`
- `#tag`、`@ref` 完全可选；你想写才写。

### 不自动前缀
- 记录时不自动追加时间戳/来源，保持纯净可读。

---

## ChatLog（对话）— 纯时间线 + 天/周分页

### 默认视图：纯时间线
- 不默认做：摘要、主题聚类、行动项提取。
- 页面切换：
  - **Week**（周）
  - **Day**（日）

### 允许的“轻动作”
- 从某条对话一键“丢到 Ideas Inbox”（只追加一句话，不自动总结/分类）。

---

## Study（学习）— 最近学习优先 + 目录索引

### Study 首页（最近学习优先）
- **Recent**：最近学习过的目录/文件（继续上次位置）
- **Spaces**：已加入的目录 Sources 列表（学习域）

### Study Space（某个目录）的视图
- 上方：最近在该目录学过什么（最近打开/最近关联）
- 下方：目录索引（可读文件树/入口文件链接）

> Study 是“怎么学它”的视图：阅读路径、学习记录、复习入口（后续可选），但不强迫把内容搬进 Hub。

---

## Code（项目）— 项目列表优先 + 入口地图

### 项目定义
- **一个项目 = 一个目录（repo 根目录）**（你选择的 A）。
- 项目只来自你手动添加的目录 Sources。

### Code 首页（项目区分优先）
- **Pinned**：置顶项目
- **Recent**：最近使用项目
- **All Projects**：所有项目（支持搜索）

### 项目页（入口地图）
只回答“从哪开始看 / 怎么跑 / 关键在哪”，保持极简：
- **Start Here**：入口文件/入口目录（可手动 pin，也可后续让系统建议）
- **Key Areas**：关键模块（目录级别即可）
- （可选）**Run / Use**：常用命令/运行方式
- **Links**：关联到 Study / Chat / Ideas 的跳转链接（只链接，不复制内容）

> Code 是“它怎么跑起来”的视图：入口/模块/主流程，不做 IDE。

---

## Directory Source Home（目录主页）— 作为枢纽页（推荐）

当你进入某个目录 Source 时，先看到一个很薄的主页（不叫 Study/Code）：
- Tabs：`Study` | `Code`
- Recent：该目录下最近打开的文件
- Anchors：最近关联的 Chat 周/日页（如果有）
- （可选）Pinned files：你置顶的入口文件

目的：进入目录后不纠结“这是 Study 还是 Code”，先把你带到正确的视图。

---

## 统一引用约定（可读、可搜索）

为保持“Everything readable”，使用轻量文本引用（格式不用过度严格，关键是可读）：
- `@dir:<path>` 引用目录
- `@file:<path>` 引用文件
- `@chat:<date>#<id>` 引用对话位置（你后续定义即可）

这些引用可以出现在：
- ideas.md
- 学习笔记
- Code 入口地图备注
- ChatLog 的轻量跳转/复制

---

## 非目标（为了 KISS）

默认不做/不强制：
- 自动扫描所有目录生成项目
- 强制分类体系（Collections）
- ChatLog 默认摘要/聚类/行动项
- 把 Study/Code 变成另一个 Notion/IDE

---

## 未来可选扩展（不影响当前形态）
- Hybrid Search（关键词 + 语义）用于更强检索
- “建议动作”以**可确认**的方式出现（你点一下才执行）
- 从 Chat/Study/Code 生成更多可读产物（如入口页、学习卡片、snippet 索引）

---
