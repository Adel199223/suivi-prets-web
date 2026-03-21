import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const THIS_FILE = fileURLToPath(import.meta.url)
const TOOLING_DIR = path.dirname(THIS_FILE)
export const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..')
export const REQUIRED_EXCLUDES = ['**/node_modules/**', '**/dist/**', '**/output/**']

export function validateWorkspaceHygiene(rootDir = DEFAULT_ROOT_DIR) {
  const errors = []
  const gitignore = fs.readFileSync(path.join(rootDir, '.gitignore'), 'utf8')
  if (!gitignore.includes('output/')) {
    errors.push('.gitignore must ignore output/')
  }

  const settings = JSON.parse(fs.readFileSync(path.join(rootDir, '.vscode/settings.json'), 'utf8'))
  for (const key of REQUIRED_EXCLUDES) {
    if (settings['files.watcherExclude']?.[key] !== true) {
      errors.push(`Missing watcher exclude: ${key}`)
    }
    if (settings['search.exclude']?.[key] !== true) {
      errors.push(`Missing search exclude: ${key}`)
    }
  }
  if (settings['files.exclude']?.['**/dist'] !== true) {
    errors.push('Missing files.exclude for **/dist')
  }
  if (settings['files.exclude']?.['**/output'] !== true) {
    errors.push('Missing files.exclude for **/output')
  }
  return errors
}

function main() {
  const errors = validateWorkspaceHygiene()
  if (errors.length > 0) {
    console.error('Workspace hygiene validation failed:')
    for (const error of errors) {
      console.error(`- ${error}`)
    }
    process.exitCode = 1
    return
  }
  console.log('Workspace hygiene validation passed.')
}

if (process.argv[1] === THIS_FILE) {
  main()
}
