import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Merge Tailwind CSS classes with clsx
 * Handles conditional classes and deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to relative time (e.g., "2 小时前", "昨天")
 */
export function formatRelativeTime(date: Date | string): string {
  const now = new Date()
  const target = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - target.getTime()
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)
  const diffWeeks = Math.floor(diffDays / 7)
  const diffMonths = Math.floor(diffDays / 30)

  if (diffSecs < 60) {
    return '刚刚'
  } else if (diffMins < 60) {
    return `${diffMins} 分钟前`
  } else if (diffHours < 24) {
    return `${diffHours} 小时前`
  } else if (diffDays === 1) {
    return '昨天'
  } else if (diffDays < 7) {
    return `${diffDays} 天前`
  } else if (diffWeeks < 4) {
    return `${diffWeeks} 周前`
  } else if (diffMonths < 12) {
    return `${diffMonths} 个月前`
  } else {
    return target.toLocaleDateString('zh-CN')
  }
}

/**
 * Format a date to a specific format
 */
export function formatDate(date: Date | string, format: 'short' | 'long' | 'iso' = 'short'): string {
  const target = typeof date === 'string' ? new Date(date) : date

  switch (format) {
    case 'short':
      return target.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      })
    case 'long':
      return target.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    case 'iso':
      return target.toISOString().split('T')[0]
    default:
      return target.toLocaleDateString('zh-CN')
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1) + '…'
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

/**
 * Parse idea content for tags and refs
 * Returns { content, tags, refs }
 */
export function parseIdeaContent(raw: string): {
  content: string
  tags: string[]
  refs: string[]
} {
  const tags: string[] = []
  const refs: string[] = []

  // Extract #tags
  const tagMatches = raw.match(/#[\w\u4e00-\u9fa5]+/g)
  if (tagMatches) {
    tags.push(...tagMatches.map((t) => t.slice(1)))
  }

  // Extract @refs (e.g., @dir:path, @file:path, @chat:date#id)
  const refMatches = raw.match(/@[\w]+:[^\s]+/g)
  if (refMatches) {
    refs.push(...refMatches)
  }

  // Clean content (remove tags and refs for display if needed)
  const content = raw
    .replace(/#[\w\u4e00-\u9fa5]+/g, '')
    .replace(/@[\w]+:[^\s]+/g, '')
    .trim()

  return { content: content || raw, tags, refs }
}

/**
 * Format file size
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${units[i]}`
}

/**
 * Check if a file is readable (text-based)
 */
export function isReadableFile(filename: string): boolean {
  const readableExtensions = [
    // Documents
    '.md', '.txt', '.markdown', '.rst', '.org',
    // Code
    '.js', '.ts', '.jsx', '.tsx', '.py', '.rs', '.go', '.rb', '.java',
    '.c', '.cpp', '.h', '.hpp', '.cs', '.swift', '.kt', '.scala',
    '.php', '.pl', '.r', '.lua', '.sh', '.bash', '.zsh', '.fish',
    // Config
    '.json', '.yaml', '.yml', '.toml', '.xml', '.ini', '.conf', '.cfg',
    // Web
    '.html', '.htm', '.css', '.scss', '.sass', '.less', '.vue', '.svelte',
    // Data
    '.csv', '.sql',
    // Other
    '.env', '.gitignore', '.dockerignore', '.editorconfig',
  ]

  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'))
  return readableExtensions.includes(ext) || !filename.includes('.')
}

/**
 * Get file extension
 */
export function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot + 1).toLowerCase()
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
