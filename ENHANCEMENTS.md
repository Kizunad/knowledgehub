# Hub 增强功能文档

本文档描述了 Hub 项目新增的增强功能，包括拖拽排序、批量选择和导出功能。

## 📦 安装的依赖

```bash
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

---

## 🔀 拖拽排序 (Drag and Drop)

### 组件

#### `SortableContainer`
拖拽排序的容器组件，包裹需要排序的列表。

```tsx
import { SortableContainer, SortableItem } from "@/components/ui/Sortable";

<SortableContainer
  items={itemIds}                    // 项目 ID 数组
  onReorder={handleReorder}          // 重排序回调 (activeId, overId) => void
  strategy="vertical"                // 排序策略: "vertical" | "horizontal" | "grid"
  disabled={false}                   // 禁用拖拽
>
  {items.map((item) => (
    <SortableItem key={item.id} id={item.id}>
      {/* 你的内容 */}
    </SortableItem>
  ))}
</SortableContainer>
```

#### `SortableItem`
可排序的项目组件。

```tsx
<SortableItem
  id={item.id}                       // 唯一 ID
  handlePosition="start"             // 拖拽手柄位置: "start" | "end" | "none"
  showDropIndicator={true}           // 显示放置指示器
  disabled={false}                   // 禁用此项拖拽
>
  {/* 你的内容 */}
</SortableItem>
```

### Hooks

#### `useDragAndDrop`
基础拖拽排序钩子。

```tsx
import { useDragAndDrop } from "@/hooks";

const {
  items,                  // 当前排序后的项目
  activeId,               // 当前拖拽项 ID
  activeItem,             // 当前拖拽项
  sensors,                // DnD 传感器
  handleDragStart,        // 拖拽开始处理
  handleDragOver,         // 拖拽经过处理
  handleDragEnd,          // 拖拽结束处理
  setItems,               // 设置项目
  isDragging,             // 检查是否正在拖拽
  getIndex,               // 获取项目索引
} = useDragAndDrop({
  items: myItems,
  getId: (item) => item.id,
  onReorder: (items, oldIndex, newIndex) => { /* 处理重排序 */ },
  onDragStart: (item) => { /* 拖拽开始 */ },
  onDragEnd: (item, newItems) => { /* 拖拽结束 */ },
});
```

#### `useMultiContainerDragAndDrop`
多容器拖拽排序（如看板）。

```tsx
import { useMultiContainerDragAndDrop } from "@/hooks";

const {
  containers,             // 容器数组
  activeId,               // 当前拖拽项 ID
  activeItem,             // 当前拖拽项
  activeContainer,        // 当前拖拽项所在容器
  handleDragStart,
  handleDragOver,
  handleDragEnd,
  setContainers,
  findContainer,          // 查找项目所在容器
} = useMultiContainerDragAndDrop({
  containers: [
    { id: "todo", items: todoItems },
    { id: "done", items: doneItems },
  ],
  getId: (item) => item.id,
  onReorder: (containerId, items, oldIndex, newIndex) => {},
  onMove: (item, fromContainer, toContainer, newIndex) => {},
});
```

---

## ✅ 批量选择 (Batch Selection)

### Hook

#### `useBatchSelection`

```tsx
import { useBatchSelection } from "@/hooks";

const {
  selectedIds,            // 选中的 ID Set
  selectedItems,          // 选中的项目数组
  selectionCount,         // 选中数量
  isBatchMode,            // 是否批量模式
  isAllSelected,          // 是否全选
  isPartiallySelected,    // 是否部分选择

  // 操作方法
  select,                 // 选择单个 (id) => void
  deselect,               // 取消选择 (id) => void
  toggle,                 // 切换选择 (id) => void
  selectAll,              // 全选
  deselectAll,            // 取消全选
  toggleSelectAll,        // 切换全选
  selectRange,            // 范围选择 (toId) => void (Shift+Click)
  clearSelection,         // 清空选择
  setSelection,           // 设置选择 (ids[]) => void
  isSelected,             // 检查是否选中 (id) => boolean

  // 批量模式
  toggleBatchMode,        // 切换批量模式
  enableBatchMode,        // 开启批量模式
  disableBatchMode,       // 关闭批量模式

  // 表单属性
  getCheckboxProps,       // 获取复选框属性 (id)
  getSelectAllProps,      // 获取全选复选框属性
} = useBatchSelection({
  items: myItems,
  getId: (item) => item.id,
  maxSelection: 50,       // 可选: 最大选择数量
  initialSelection: [],   // 可选: 初始选择
  onSelectionChange: (ids, items) => {},  // 可选: 选择变化回调
});
```

### 组件

#### `BatchActionBar`
浮动批量操作栏。

```tsx
import { 
  BatchActionBar, 
  createDeleteAction,
  createArchiveAction,
  createExportAction 
} from "@/components/ui/BatchActionBar";

<BatchActionBar
  selectedCount={selection.selectionCount}
  totalCount={items.length}
  actions={[
    createArchiveAction(handleArchive, isLoading),
    createDeleteAction(handleDelete, isLoading),
    createExportAction(handleExport, isLoading),
  ]}
  onClearSelection={selection.clearSelection}
  onSelectAll={selection.selectAll}
  visible={selection.selectionCount > 0}
  position="bottom"       // "top" | "bottom" | "floating"
/>
```

### 键盘快捷键

```tsx
import { useBatchKeyboardShortcuts } from "@/hooks";

useBatchKeyboardShortcuts({
  isBatchMode,
  enableBatchMode,
  disableBatchMode,
  selectAll,
  deselectAll,
  selectedIds,
});
```

快捷键：
- `B` - 切换批量模式
- `Ctrl/Cmd + A` - 全选（批量模式下）
- `Esc` - 清空选择或退出批量模式

---

## 📤 导出功能 (Export)

### Hook

#### `useExport`

```tsx
import { useExport } from "@/hooks";

const {
  exportItems,            // 导出到文件
  exportToClipboard,      // 导出到剪贴板
  getExportContent,       // 获取导出内容（不下载）
  isExporting,            // 是否正在导出
  lastResult,             // 上次导出结果
} = useExport<MyType>({
  defaultFilename: "my-export",
  onExportSuccess: (result) => { /* 成功回调 */ },
  onExportError: (error) => { /* 错误回调 */ },
});

// 导出到文件
await exportItems(items, {
  format: "json",          // "json" | "markdown" | "csv" | "text"
  filename: "custom-name", // 可选自定义文件名
  includeMetadata: true,   // 包含元数据
  prettyPrint: true,       // JSON 美化
  includeFields: ["id", "content"],  // 只包含特定字段
  excludeFields: ["internal"],       // 排除特定字段
});

// 导出到剪贴板
await exportToClipboard(items, { format: "markdown" });
```

### 预置导出钩子

```tsx
import { useIdeasExport, useSourcesExport, useChatsExport } from "@/hooks";

const ideasExport = useIdeasExport();
const sourcesExport = useSourcesExport();
const chatsExport = useChatsExport();
```

### 组件

#### `ExportDialog`
导出对话框组件。

```tsx
import { ExportDialog } from "@/components/ui/ExportDialog";

<ExportDialog
  isOpen={showDialog}
  onClose={() => setShowDialog(false)}
  onExport={(format, options) => handleExport(format, options)}
  onCopy={(format) => handleCopy(format)}
  title="Export Ideas"
  description="Export your ideas to a file"
  itemCount={items.length}
  itemType="ideas"
  availableFormats={["json", "markdown", "csv", "text"]}
  isExporting={isExporting}
  showCopyOption={true}
  filenamePrefix="ideas"
/>
```

### 批量导出

```tsx
import { bulkExport } from "@/hooks";

await bulkExport([
  { type: "ideas", items: ideas, filename: "ideas" },
  { type: "sources", items: sources, filename: "sources" },
  { type: "chats", items: chats, filename: "chats" },
], "json");
```

### 自定义 Markdown 格式化器

```tsx
import { MarkdownFormatter, ideaMarkdownFormatter } from "@/hooks";

const customFormatter: MarkdownFormatter<MyType> = {
  formatHeader: () => `# My Export\n\n`,
  formatItem: (item, index) => `## ${item.title}\n${item.content}\n\n---\n`,
  formatFooter: (items) => `\n**Total: ${items.length}**\n`,
};
```

---

## 📁 文件结构

```
apps/web/src/
├── components/ui/
│   ├── Sortable.tsx          # 拖拽排序组件
│   ├── BatchActionBar.tsx    # 批量操作栏
│   └── ExportDialog.tsx      # 导出对话框
├── hooks/
│   ├── useDragAndDrop.ts     # 拖拽排序钩子
│   ├── useBatchSelection.ts  # 批量选择钩子
│   ├── useExport.ts          # 导出钩子
│   └── index.ts              # 导出所有钩子
```

---

## 🎯 使用示例：Ideas 页面

Ideas 页面已集成所有增强功能：

1. **拖拽排序** - 拖动左侧手柄可重新排序
2. **批量模式** - 点击工具栏的复选框图标进入批量模式
3. **批量选择** - 点击项目左侧的复选框选择
4. **批量操作** - 选中后底部显示操作栏，支持归档、删除、导出
5. **导出** - 点击工具栏的下载图标打开导出对话框

---

## 📱 离线支持 (PWA)

Hub 支持 Progressive Web App (PWA) 功能，提供离线访问、安装到主屏幕和后台同步等能力。

### 功能特性

- **离线访问** - 缓存静态资源和 API 响应，离线时仍可使用
- **安装提示** - 支持"添加到主屏幕"功能
- **后台同步** - 离线时的操作会在恢复连接后自动同步
- **更新提示** - 新版本可用时提示用户更新
- **推送通知** - 支持推送通知（需要服务端配置）

### Hooks

#### `useOffline`

检测和管理离线状态。

```tsx
import { useOffline, useIsOnline } from "@/hooks";

// 完整版本
const {
  isOnline,              // 是否在线
  isOffline,             // 是否离线
  wasOffline,            // 是否曾经离线（用于显示重连提示）
  lastOnlineAt,          // 上次在线时间
  connectionType,        // 连接类型 (wifi, cellular 等)
  effectiveType,         // 有效连接类型 (4g, 3g 等)
} = useOffline({
  onOnline: () => console.log('Back online!'),
  onOffline: () => console.log('Went offline'),
  enablePingCheck: true,  // 启用 ping 检测真实连接
  pingUrl: '/api/health', // ping 检测 URL
  pingInterval: 30000,    // ping 间隔 (ms)
});

// 简化版本
const isOnline = useIsOnline();
```

#### `usePWA`

管理 PWA 安装和更新。

```tsx
import { usePWA } from "@/hooks";

const {
  // 安装状态
  isInstallable,          // 是否可安装
  isInstalled,            // 是否已安装
  isStandalone,           // 是否以独立模式运行

  // Service Worker 状态
  isServiceWorkerInstalled, // SW 是否已注册
  isUpdateAvailable,        // 是否有更新可用
  isUpdating,               // 是否正在更新

  // 网络状态
  isOnline,                 // 是否在线

  // 操作方法
  install,                  // 触发安装提示
  update,                   // 应用更新
  dismissInstall,           // 忽略安装提示
} = usePWA();

// 触发安装
const handleInstall = async () => {
  const success = await install();
  if (success) {
    console.log('App installed!');
  }
};

// 应用更新
const handleUpdate = async () => {
  await update(); // 页面会自动刷新
};
```

#### `useOfflineData`

离线优先的数据获取。

```tsx
import { useOfflineData } from "@/hooks";

const {
  data,           // 数据（可能来自缓存或网络）
  isLoading,      // 是否加载中
  isFromCache,    // 是否来自缓存
  isStale,        // 缓存是否过期
  error,          // 错误
  refetch,        // 重新获取
} = useOfflineData(
  'my-data-key',  // 缓存键
  () => fetch('/api/data').then(r => r.json()),  // 获取函数
  {
    staleTime: 5 * 60 * 1000,  // 5 分钟后视为过期
    enabled: true,
  }
);
```

### 组件

#### `OfflineBanner`

离线状态横幅。

```tsx
import { OfflineBanner, OfflineIndicator } from "@/components/pwa";

// 完整横幅
<OfflineBanner
  position="top"              // "top" | "bottom"
  dismissible={true}          // 允许关闭
  autoDismissOnOnline={3000}  // 恢复连接后自动隐藏 (ms)
/>

// 小型指示器
<OfflineIndicator className="my-class" />
```

#### `InstallPrompt`

安装提示组件。

```tsx
import { InstallPrompt } from "@/components/pwa";

<InstallPrompt
  variant="banner"          // "banner" | "modal" | "minimal"
  showAfterDelay={5000}     // 延迟显示 (ms)
  onDismiss={() => {}}      // 关闭回调
/>
```

#### `UpdatePrompt`

更新提示组件。

```tsx
import { UpdatePrompt, UpdateIndicator } from "@/components/pwa";

// 完整提示
<UpdatePrompt
  autoShow={true}           // 自动显示
  position="bottom-right"   // 位置
  onUpdate={() => {}}       // 更新回调
  onDismiss={() => {}}      // 关闭回调
/>

// 小型指示器
<UpdateIndicator onClick={() => {}} />
```

#### `PWAProvider`

PWA 功能提供者（包含所有 PWA 组件）。

```tsx
import { PWAProvider, usePWAContext } from "@/components/pwa/PWAProvider";

// 在 layout 中包裹
<PWAProvider
  showOfflineBanner={true}       // 显示离线横幅
  installPromptDelay={10000}     // 安装提示延迟
  showUpdatePrompt={true}        // 显示更新提示
  offlineBannerPosition="top"    // 离线横幅位置
  installPromptVariant="banner"  // 安装提示样式
>
  {children}
</PWAProvider>

// 在子组件中使用
function MyComponent() {
  const { isOnline, isInstallable, install, offline } = usePWAContext();
  // ...
}
```

### Service Worker

Service Worker (`public/sw.js`) 提供以下缓存策略：

| 请求类型 | 策略 | 说明 |
|---------|------|------|
| API 请求 | Network First | 优先网络，失败时用缓存 |
| 静态资源 | Cache First | 优先缓存，无缓存时请求网络 |
| HTML 页面 | Stale While Revalidate | 先返回缓存，同时更新 |
| 其他 | Network First | 优先网络 |

### 缓存管理

```tsx
// 发送消息给 Service Worker
if (navigator.serviceWorker.controller) {
  // 跳过等待，立即激活新版本
  navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });

  // 缓存特定 URL
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_URLS',
    payload: { urls: ['/api/ideas', '/api/sources'] }
  });

  // 清除缓存
  navigator.serviceWorker.controller.postMessage({
    type: 'CLEAR_CACHE',
    payload: { cacheName: 'hub-v1-api' }  // 可选，不传则清除所有
  });
}
```

### 文件结构

```
apps/web/
├── public/
│   ├── manifest.json         # PWA 配置
│   ├── sw.js                 # Service Worker
│   ├── browserconfig.xml     # Microsoft 磁贴配置
│   └── icons/                # PWA 图标
│       ├── icon.svg          # 源 SVG 图标
│       ├── icon-*.png        # 各尺寸 PNG
│       └── ...
├── src/
│   ├── app/
│   │   └── offline/
│   │       └── page.tsx      # 离线页面
│   ├── components/pwa/
│   │   ├── OfflineBanner.tsx # 离线横幅
│   │   ├── InstallPrompt.tsx # 安装提示
│   │   ├── UpdatePrompt.tsx  # 更新提示
│   │   ├── PWAProvider.tsx   # PWA 提供者
│   │   └── index.ts
│   └── hooks/
│       ├── useOffline.ts     # 离线状态钩子
│       └── usePWA.ts         # PWA 管理钩子
└── scripts/
    └── generate-icons.md     # 图标生成指南
```

### 生成 PWA 图标

参考 `apps/web/scripts/generate-icons.md` 了解如何从 SVG 源文件生成所需的各种尺寸图标。

### 验证 PWA

1. 打开 Chrome DevTools
2. 转到 Application 标签
3. 检查 Manifest 和 Service Worker
4. 使用 Lighthouse 运行 PWA 审核

```bash
npx lighthouse http://localhost:3000 --only-categories=pwa --view
```

---

## 📁 文件结构

```
apps/web/src/
├── components/ui/
│   ├── Sortable.tsx          # 拖拽排序组件
│   ├── BatchActionBar.tsx    # 批量操作栏
│   └── ExportDialog.tsx      # 导出对话框
├── components/pwa/
│   ├── OfflineBanner.tsx     # 离线横幅
│   ├── InstallPrompt.tsx     # 安装提示
│   ├── UpdatePrompt.tsx      # 更新提示
│   └── PWAProvider.tsx       # PWA 提供者
├── hooks/
│   ├── useDragAndDrop.ts     # 拖拽排序钩子
│   ├── useBatchSelection.ts  # 批量选择钩子
│   ├── useExport.ts          # 导出钩子
│   ├── useOffline.ts         # 离线状态钩子
│   ├── usePWA.ts             # PWA 管理钩子
│   └── index.ts              # 导出所有钩子
```

---

## 🎯 使用示例：Ideas 页面

Ideas 页面已集成所有增强功能：

1. **拖拽排序** - 拖动左侧手柄可重新排序
2. **批量模式** - 点击工具栏的复选框图标进入批量模式
3. **批量选择** - 点击项目左侧的复选框选择
4. **批量操作** - 选中后底部显示操作栏，支持归档、删除、导出
5. **导出** - 点击工具栏的下载图标打开导出对话框

---

## 📝 下一步

- [x] ~~离线支持 (PWA)~~ ✅
- [ ] 拖拽排序持久化到数据库
- [ ] 更多页面集成增强功能