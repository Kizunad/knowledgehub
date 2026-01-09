import chalk from 'chalk'
import ora from 'ora'
import fs from 'node:fs/promises'
import path from 'node:path'
import inquirer from 'inquirer'

interface AddOptions {
  name?: string
  description?: string
  include?: string[]
  exclude?: string[]
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

const DEFAULT_EXCLUDES = [
  'node_modules/**',
  '.git/**',
  '.next/**',
  'dist/**',
  'build/**',
  '.turbo/**',
  '*.log',
  '.DS_Store',
  'Thumbs.db',
  '.env',
  '.env.local',
  '.env.*.local',
]

export async function addCommand(
  inputPath: string,
  options: AddOptions
): Promise<void> {
  const spinner = ora()

  console.log(chalk.cyan('\n➕ Add Directory Source\n'))

  // Resolve the path
  const absolutePath = path.resolve(process.cwd(), inputPath)

  // Check if path exists
  try {
    const stats = await fs.stat(absolutePath)
    if (!stats.isDirectory()) {
      console.log(chalk.red(`✗ Path is not a directory: ${absolutePath}`))
      return
    }
  } catch {
    console.log(chalk.red(`✗ Path does not exist: ${absolutePath}`))
    return
  }

  console.log(chalk.dim(`Path: ${absolutePath}`))
  console.log('')

  // Load existing configuration
  const configPath = path.join(process.cwd(), '.hubrc')
  let config: ConfigFile

  try {
    const configContent = await fs.readFile(configPath, 'utf-8')
    config = JSON.parse(configContent)
  } catch {
    console.log(chalk.yellow('⚠ No .hubrc configuration found.'))
    console.log(chalk.dim('  Run `hub init` first to initialize Hub CLI.'))
    return
  }

  // Check if source already exists
  const existingSource = config.sources.find(
    (s) => path.resolve(s.localPath) === absolutePath
  )

  if (existingSource) {
    console.log(chalk.yellow('⚠ This directory is already configured as a source.'))
    console.log(chalk.dim(`  Name: ${existingSource._name || existingSource.id}`))

    const { update } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'update',
        message: 'Do you want to update its configuration?',
        default: false,
      },
    ])

    if (!update) {
      console.log(chalk.dim('Cancelled.'))
      return
    }

    // Update existing source
    await updateSource(existingSource, options, config, configPath, spinner)
    return
  }

  // Get name if not provided
  let sourceName = options.name
  if (!sourceName) {
    const { name } = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Name for this source:',
        default: path.basename(absolutePath),
      },
    ])
    sourceName = name
  }

  // Get description if not provided
  let sourceDescription = options.description
  if (!sourceDescription) {
    const { description } = await inquirer.prompt([
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
    ])
    sourceDescription = description
  }

  // Build new source configuration
  const newSource: SourceConfig = {
    id: generateSourceId(),
    localPath: absolutePath,
    include: options.include || ['**/*'],
    exclude: options.exclude || DEFAULT_EXCLUDES,
    _name: sourceName,
    _description: sourceDescription || undefined,
  }

  // Add to configuration
  config.sources.push(newSource)

  // Save configuration
  spinner.start('Saving configuration...')

  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    spinner.succeed('Source added successfully')
  } catch (error) {
    spinner.fail('Failed to save configuration')
    console.error(chalk.red(`Error: ${error}`))
    return
  }

  // Show summary
  console.log('')
  console.log(chalk.green('✓ Directory source added:'))
  console.log(chalk.dim(`  Name: `) + chalk.bold(sourceName))
  console.log(chalk.dim(`  Path: ${absolutePath}`))
  console.log(chalk.dim(`  ID: ${newSource.id}`))
  if (sourceDescription) {
    console.log(chalk.dim(`  Description: ${sourceDescription}`))
  }
  console.log('')
  console.log(chalk.dim('Sync this source with: ') + chalk.cyan(`hub sync ${sourceName}`))
  console.log('')
}

async function updateSource(
  source: SourceConfig,
  options: AddOptions,
  config: ConfigFile,
  configPath: string,
  spinner: ReturnType<typeof ora>
): Promise<void> {
  // Update fields
  if (options.name) {
    source._name = options.name
  }
  if (options.description) {
    source._description = options.description
  }
  if (options.include) {
    source.include = options.include
  }
  if (options.exclude) {
    source.exclude = options.exclude
  }

  // If no options provided, prompt for updates
  if (!options.name && !options.description && !options.include && !options.exclude) {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Name:',
        default: source._name || path.basename(source.localPath),
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description:',
        default: source._description || '',
      },
    ])

    source._name = answers.name
    source._description = answers.description || undefined
  }

  // Save configuration
  spinner.start('Updating configuration...')

  try {
    await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8')
    spinner.succeed('Source updated successfully')
  } catch (error) {
    spinner.fail('Failed to update configuration')
    console.error(chalk.red(`Error: ${error}`))
    return
  }

  console.log('')
  console.log(chalk.green('✓ Source updated:'))
  console.log(chalk.dim(`  Name: `) + chalk.bold(source._name || source.id))
  console.log(chalk.dim(`  Path: ${source.localPath}`))
  console.log('')
}

function generateSourceId(): string {
  return `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
