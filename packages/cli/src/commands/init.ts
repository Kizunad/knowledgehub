import chalk from 'chalk'
import ora from 'ora'
import fs from 'node:fs/promises'
import path from 'node:path'
import inquirer from 'inquirer'
import type { CLIConfig } from '@hub/shared'

const CONFIG_FILE = '.hubrc'
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

interface InitOptions {
  force?: boolean
}

export async function initCommand(options: InitOptions): Promise<void> {
  const spinner = ora()
  const configPath = path.join(process.cwd(), CONFIG_FILE)

  console.log(chalk.cyan('\n🚀 Initializing Hub CLI...\n'))

  // Check if config already exists
  try {
    await fs.access(configPath)
    if (!options.force) {
      console.log(chalk.yellow(`⚠ Configuration file ${CONFIG_FILE} already exists.`))
      console.log(chalk.dim('  Use --force to overwrite.\n'))

      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite the existing configuration?',
          default: false,
        },
      ])

      if (!overwrite) {
        console.log(chalk.dim('Initialization cancelled.'))
        return
      }
    }
  } catch {
    // Config doesn't exist, continue
  }

  // Gather configuration
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiUrl',
      message: 'Hub API URL:',
      default: 'http://localhost:3000/api',
      validate: (input: string) => {
        try {
          new URL(input)
          return true
        } catch {
          return 'Please enter a valid URL'
        }
      },
    },
    {
      type: 'password',
      name: 'apiKey',
      message: 'API Key (optional, press Enter to skip):',
      mask: '*',
    },
    {
      type: 'confirm',
      name: 'addCurrentDir',
      message: 'Add current directory as a source?',
      default: true,
    },
  ])

  let sourceName = ''
  let sourceDescription = ''

  if (answers.addCurrentDir) {
    const dirAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'name',
        message: 'Name for this source:',
        default: path.basename(process.cwd()),
      },
      {
        type: 'input',
        name: 'description',
        message: 'Description (optional):',
      },
    ])
    sourceName = dirAnswers.name
    sourceDescription = dirAnswers.description
  }

  // Build configuration
  const config: CLIConfig = {
    apiUrl: answers.apiUrl,
    apiKey: answers.apiKey || undefined,
    sources: answers.addCurrentDir
      ? [
          {
            id: generateSourceId(),
            localPath: process.cwd(),
            include: ['**/*'],
            exclude: DEFAULT_EXCLUDES,
          },
        ]
      : [],
  }

  // Add metadata as comments in the config
  const configWithMeta = {
    ...config,
    _meta: {
      version: '0.1.0',
      createdAt: new Date().toISOString(),
    },
    sources: config.sources.map((s, i) => ({
      ...s,
      _name: i === 0 && answers.addCurrentDir ? sourceName : undefined,
      _description: i === 0 && answers.addCurrentDir ? sourceDescription : undefined,
    })),
  }

  // Write configuration
  spinner.start('Writing configuration...')

  try {
    await fs.writeFile(
      configPath,
      JSON.stringify(configWithMeta, null, 2),
      'utf-8'
    )
    spinner.succeed('Configuration saved')
  } catch (error) {
    spinner.fail('Failed to write configuration')
    console.error(chalk.red(`Error: ${error}`))
    process.exit(1)
  }

  // Create .gitignore entry suggestion
  console.log('')
  console.log(chalk.green('✓ Hub CLI initialized successfully!'))
  console.log('')
  console.log(chalk.dim('Next steps:'))
  console.log(chalk.dim('  1. Add more sources with: ') + chalk.cyan('hub add <path>'))
  console.log(chalk.dim('  2. Check status with: ') + chalk.cyan('hub status'))
  console.log(chalk.dim('  3. Sync content with: ') + chalk.cyan('hub sync'))
  console.log('')
  console.log(chalk.yellow('⚠ Remember to add .hubrc to your .gitignore if it contains sensitive data'))
  console.log('')
}

function generateSourceId(): string {
  return `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}
