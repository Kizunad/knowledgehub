import chalk from 'chalk'
import fs from 'node:fs/promises'
import path from 'node:path'

interface StatusOptions {
  verbose?: boolean
}

interface SourceConfig {
  id: string
  localPath: string
  include?: string[]
  exclude?: string[]
  _name?: string
  _description?: string
}

interface ConfigFile {
  apiUrl: string
  apiKey?: string
  sources: SourceConfig[]
  _meta?: {
    version: string
    createdAt: string
  }
}

export async function statusCommand(options: StatusOptions): Promise<void> {
  console.log(chalk.cyan('\n📊 Hub Status\n'))

  // Load configuration
  const configPath = path.join(process.cwd(), '.hubrc')
  let config: ConfigFile

  try {
    const configContent = await fs.readFile(configPath, 'utf-8')
    config = JSON.parse(configContent)
  } catch {
    console.log(chalk.red('✗ No .hubrc configuration found.'))
    console.log(chalk.dim('  Run `hub init` to initialize Hub CLI.'))
    return
  }

  // Show API configuration
  console.log(chalk.bold('Configuration:'))
  console.log(chalk.dim('  API URL: ') + config.apiUrl)
  console.log(chalk.dim('  API Key: ') + (config.apiKey ? chalk.green('configured') : chalk.yellow('not set')))

  if (config._meta) {
    console.log(chalk.dim('  Version: ') + config._meta.version)
    console.log(chalk.dim('  Created: ') + new Date(config._meta.createdAt).toLocaleDateString())
  }
  console.log('')

  // Show sources
  console.log(chalk.bold(`Sources (${config.sources.length}):`))

  if (config.sources.length === 0) {
    console.log(chalk.yellow('  No sources configured.'))
    console.log(chalk.dim('  Add a source with: hub add <path>'))
    return
  }

  for (const source of config.sources) {
    const name = source._name || source.id
    const status = await getSourceStatus(source)

    console.log('')
    console.log(`  ${status.icon} ${chalk.bold(name)}`)
    console.log(chalk.dim(`    ID: ${source.id}`))
    console.log(chalk.dim(`    Path: ${source.localPath}`))
    console.log(chalk.dim(`    Status: ${status.text}`))

    if (source._description) {
      console.log(chalk.dim(`    Description: ${source._description}`))
    }

    if (options.verbose) {
      console.log(chalk.dim(`    Include: ${(source.include || ['**/*']).join(', ')}`))
      console.log(chalk.dim(`    Exclude: ${(source.exclude || []).slice(0, 3).join(', ')}${(source.exclude?.length || 0) > 3 ? '...' : ''}`))

      if (status.fileCount !== undefined) {
        console.log(chalk.dim(`    Files: ${status.fileCount}`))
      }
    }
  }

  console.log('')
}

interface SourceStatus {
  icon: string
  text: string
  fileCount?: number
}

async function getSourceStatus(source: SourceConfig): Promise<SourceStatus> {
  // Check if path exists
  try {
    await fs.access(source.localPath)
  } catch {
    return {
      icon: chalk.red('✗'),
      text: chalk.red('Path not found'),
    }
  }

  // Check if it's a directory
  try {
    const stats = await fs.stat(source.localPath)
    if (!stats.isDirectory()) {
      return {
        icon: chalk.yellow('⚠'),
        text: chalk.yellow('Not a directory'),
      }
    }
  } catch {
    return {
      icon: chalk.red('✗'),
      text: chalk.red('Cannot access path'),
    }
  }

  // Count files (rough estimate)
  try {
    const entries = await fs.readdir(source.localPath, { recursive: true, withFileTypes: true })
    const fileCount = entries.filter(e => e.isFile()).length

    return {
      icon: chalk.green('✓'),
      text: chalk.green('Ready to sync'),
      fileCount,
    }
  } catch {
    return {
      icon: chalk.green('✓'),
      text: chalk.green('Ready'),
    }
  }
}
