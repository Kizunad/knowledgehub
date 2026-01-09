// ============================================================
// Hub Shared Utilities
// ============================================================

/**
 * File extensions that are considered readable/text-based
 */
export const READABLE_EXTENSIONS = new Set([
  // JavaScript/TypeScript
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.mts',
  '.cts',

  // Web
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.vue',
  '.svelte',
  '.astro',

  // Data/Config
  '.json',
  '.yaml',
  '.yml',
  '.toml',
  '.xml',
  '.csv',
  '.env',
  '.ini',
  '.conf',

  // Documentation
  '.md',
  '.mdx',
  '.txt',
  '.rst',
  '.adoc',

  // Programming Languages
  '.py',
  '.pyi',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.kts',
  '.scala',
  '.c',
  '.cpp',
  '.cc',
  '.cxx',
  '.h',
  '.hpp',
  '.cs',
  '.rb',
  '.php',
  '.swift',
  '.m',
  '.mm',
  '.r',
  '.R',
  '.lua',
  '.pl',
  '.pm',
  '.ex',
  '.exs',
  '.erl',
  '.hrl',
  '.clj',
  '.cljs',
  '.cljc',
  '.edn',
  '.hs',
  '.lhs',
  '.elm',
  '.ml',
  '.mli',
  '.fs',
  '.fsx',
  '.fsi',
  '.v',
  '.sv',
  '.vhd',
  '.vhdl',
  '.zig',
  '.nim',
  '.d',
  '.dart',
  '.groovy',
  '.gradle',

  // Shell/Scripts
  '.sh',
  '.bash',
  '.zsh',
  '.fish',
  '.ps1',
  '.psm1',
  '.bat',
  '.cmd',

  // Database
  '.sql',
  '.prisma',
  '.graphql',
  '.gql',

  // Build/Config
  '.dockerfile',
  '.dockerignore',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.eslintrc',
  '.prettierrc',
  '.babelrc',
  '.npmrc',
  '.nvmrc',

  // Other
  '.lock',
  '.log',
  '.diff',
  '.patch',
  '.tf',
  '.tfvars',
  '.hcl',
  '.proto',
  '.thrift',
  '.avsc',
])

/**
 * Files without extensions that are considered readable
 */
export const READABLE_FILENAMES = new Set([
  'Dockerfile',
  'Makefile',
  'Rakefile',
  'Gemfile',
  'Procfile',
  'Brewfile',
  'Vagrantfile',
  'Jenkinsfile',
  'Justfile',
  'CMakeLists.txt',
  'LICENSE',
  'LICENCE',
  'README',
  'CHANGELOG',
  'CONTRIBUTING',
  'AUTHORS',
  'CODEOWNERS',
  '.gitignore',
  '.gitattributes',
  '.editorconfig',
  '.env',
  '.env.local',
  '.env.development',
  '.env.production',
  '.env.test',
  '.dockerignore',
  '.eslintignore',
  '.prettierignore',
  '.npmignore',
  '.hubrc',
])

/**
 * Check if a file is readable (text-based) based on its path
 * @param filePath - The file path to check
 * @returns true if the file is considered readable/text-based
 */
export function isReadableFile(filePath: string): boolean {
  // Extract filename from path
  const parts = filePath.split(/[/\\]/)
  const filename = parts[parts.length - 1]

  // Check if it's a known readable filename
  if (READABLE_FILENAMES.has(filename)) {
    return true
  }

  // Extract extension
  const lastDotIndex = filename.lastIndexOf('.')
  if (lastDotIndex === -1) {
    // No extension - check if filename itself is known
    return READABLE_FILENAMES.has(filename)
  }

  const extension = filename.slice(lastDotIndex).toLowerCase()

  // Check if it's a known readable extension
  return READABLE_EXTENSIONS.has(extension)
}

/**
 * Get the language/type from file extension for syntax highlighting
 * @param filePath - The file path to analyze
 * @returns The language identifier
 */
export function getLanguageFromPath(filePath: string): string {
  const parts = filePath.split(/[/\\]/)
  const filename = parts[parts.length - 1]
  const lastDotIndex = filename.lastIndexOf('.')

  if (lastDotIndex === -1) {
    // Special filenames
    const lowerName = filename.toLowerCase()
    if (lowerName === 'dockerfile') return 'dockerfile'
    if (lowerName === 'makefile') return 'makefile'
    if (lowerName.includes('jenkinsfile')) return 'groovy'
    return 'plaintext'
  }

  const ext = filename.slice(lastDotIndex).toLowerCase()

  const languageMap: Record<string, string> = {
    '.js': 'javascript',
    '.jsx': 'javascriptreact',
    '.ts': 'typescript',
    '.tsx': 'typescriptreact',
    '.mjs': 'javascript',
    '.cjs': 'javascript',
    '.json': 'json',
    '.md': 'markdown',
    '.mdx': 'mdx',
    '.html': 'html',
    '.htm': 'html',
    '.css': 'css',
    '.scss': 'scss',
    '.sass': 'sass',
    '.less': 'less',
    '.py': 'python',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.c': 'c',
    '.cpp': 'cpp',
    '.cc': 'cpp',
    '.h': 'c',
    '.hpp': 'cpp',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.swift': 'swift',
    '.sql': 'sql',
    '.sh': 'shell',
    '.bash': 'shell',
    '.zsh': 'shell',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.toml': 'toml',
    '.xml': 'xml',
    '.vue': 'vue',
    '.svelte': 'svelte',
    '.graphql': 'graphql',
    '.gql': 'graphql',
    '.prisma': 'prisma',
    '.dockerfile': 'dockerfile',
    '.tf': 'terraform',
    '.hcl': 'hcl',
  }

  return languageMap[ext] || 'plaintext'
}

/**
 * Check if a file should be excluded from sync based on common patterns
 * @param filePath - The file path to check
 * @returns true if the file should be excluded
 */
export function shouldExcludeFile(filePath: string): boolean {
  const excludePatterns = [
    /node_modules/,
    /\.git\//,
    /\.next\//,
    /dist\//,
    /build\//,
    /\.turbo\//,
    /coverage\//,
    /\.cache\//,
    /__pycache__\//,
    /\.pytest_cache\//,
    /\.mypy_cache\//,
    /venv\//,
    /\.venv\//,
    /target\//,
    /\.cargo\//,
    /\.idea\//,
    /\.vscode\//,
    /\.DS_Store$/,
    /Thumbs\.db$/,
    /\.env\.local$/,
    /\.env\.\w+\.local$/,
    /package-lock\.json$/,
    /pnpm-lock\.yaml$/,
    /yarn\.lock$/,
    /\.lock$/,
  ]

  return excludePatterns.some((pattern) => pattern.test(filePath))
}
