// ============================================================
// Hub Shared Types
// ============================================================

// ------------------------------------------------------------
// Source Types (来源类型)
// ------------------------------------------------------------

/** Directory Source 的模式 */
export type DirectorySourceMode =
  | 'github'      // A. GitHub 集成 — 读取仓库内容
  | 'link'        // C. Link Only — 只存链接+备注
  | 'local_sync'  // D. Local Sync — CLI 推送本地内容

/** Directory Source */
export interface DirectorySource {
  id: string
  name: string
  mode: DirectorySourceMode
  path: string              // GitHub: owner/repo, Link: URL, LocalSync: 本地路径
  branch?: string           // GitHub 模式时的分支
  description?: string      // 可选备注
  syncedAt?: Date           // 最后同步时间
  createdAt: Date
  updatedAt: Date
}

/** ChatLog Source */
export interface ChatLogSource {
  id: string
  name: string
  provider: string          // e.g., 'openai', 'anthropic', 'custom'
  createdAt: Date
  updatedAt: Date
}

/** Ideas Source (单文件 ideas.md) */
export interface IdeasSource {
  id: string
  storageType: 'local' | 'supabase'  // ideas.md 存储位置
  filePath?: string                   // local 时的路径
  createdAt: Date
  updatedAt: Date
}

// ------------------------------------------------------------
// View Types (视图类型)
// ------------------------------------------------------------

/** 视图类型 */
export type ViewType = 'study' | 'code' | 'chatlog' | 'ideas'

/** Study Space (学习空间) */
export interface StudySpace {
  id: string
  directorySourceId: string
  lastAccessedAt?: Date
  lastAccessedFile?: string
  createdAt: Date
}

/** Code Project (代码项目) */
export interface CodeProject {
  id: string
  directorySourceId: string
  pinned: boolean
  startHereFiles?: string[]     // 入口文件
  keyAreas?: string[]           // 关键模块目录
  runCommands?: string[]        // 运行命令
  lastAccessedAt?: Date
  createdAt: Date
}

// ------------------------------------------------------------
// ChatLog Types (对话类型)
// ------------------------------------------------------------

/** 对话消息角色 */
export type MessageRole = 'user' | 'assistant' | 'system'

/** 单条对话消息 */
export interface ChatMessage {
  id: string
  chatId: string
  role: MessageRole
  content: string
  createdAt: Date
}

/** 对话 */
export interface Chat {
  id: string
  sourceId: string
  title?: string
  startedAt: Date
  endedAt?: Date
  messages?: ChatMessage[]
}

/** ChatLog 页面视图 (Day/Week) */
export type ChatLogView = 'day' | 'week'

// ------------------------------------------------------------
// Ideas Types (点子类型)
// ------------------------------------------------------------

/** 点子状态 */
export type IdeaStatus = 'inbox' | 'active' | 'archive'

/** 单条点子 */
export interface Idea {
  id: string
  content: string
  status: IdeaStatus
  done: boolean              // checkbox 状态
  tags?: string[]            // #tag
  refs?: string[]            // @ref
  createdAt: Date
  updatedAt: Date
}

// ------------------------------------------------------------
// Reference Types (引用类型)
// ------------------------------------------------------------

/** 引用类型 */
export type ReferenceType = 'dir' | 'file' | 'chat'

/** 统一引用格式 */
export interface Reference {
  type: ReferenceType
  path: string               // @dir:<path>, @file:<path>, @chat:<date>#<id>
  displayText?: string
}

// ------------------------------------------------------------
// File & Directory Types
// ------------------------------------------------------------

/** 文件信息 */
export interface FileInfo {
  name: string
  path: string
  type: 'file' | 'directory'
  size?: number
  mtime?: Date
  content?: string
}

/** 目录树节点 */
export interface DirectoryNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: DirectoryNode[]
}

// ------------------------------------------------------------
// Search Types
// ------------------------------------------------------------

/** 搜索结果项 */
export interface SearchResult {
  type: 'file' | 'chat' | 'idea'
  id: string
  title: string
  snippet: string
  path?: string
  score: number
  highlightedContent?: string
}

/** 搜索选项 */
export interface SearchOptions {
  query: string
  scope?: ViewType[]         // 搜索范围
  limit?: number
  offset?: number
}

// ------------------------------------------------------------
// Activity & Recents
// ------------------------------------------------------------

/** 活动类型 */
export type ActivityType = 'view' | 'edit' | 'create' | 'sync'

/** 活动记录 */
export interface Activity {
  id: string
  type: ActivityType
  viewType: ViewType
  targetId: string
  targetName: string
  targetPath?: string
  timestamp: Date
}

/** 最近项目 */
export interface RecentItem {
  id: string
  type: ViewType
  name: string
  path?: string
  lastAccessedAt: Date
}

// ------------------------------------------------------------
// API Response Types
// ------------------------------------------------------------

/** 通用 API 响应 */
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

// ------------------------------------------------------------
// CLI Sync Types
// ------------------------------------------------------------

/** 同步状态 */
export type SyncStatus = 'pending' | 'syncing' | 'success' | 'error'

/** 同步结果 */
export interface SyncResult {
  sourceId: string
  status: SyncStatus
  filesAdded: number
  filesUpdated: number
  filesDeleted: number
  errors?: string[]
  syncedAt: Date
}

/** CLI 配置 */
export interface CLIConfig {
  apiUrl: string
  apiKey?: string
  sources: {
    id: string
    localPath: string
    include?: string[]       // glob patterns
    exclude?: string[]       // glob patterns
  }[]
}
