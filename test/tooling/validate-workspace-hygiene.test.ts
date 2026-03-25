import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  DEFAULT_ROOT_DIR,
  REQUIRED_EXCLUDES,
  REQUIRED_FILE_EXCLUDES,
  REQUIRED_GITIGNORE_PATTERNS,
  validateWorkspaceHygiene
} from '../../tooling/validate-workspace-hygiene.mjs'

const tempRoots: string[] = []

function createWorkspaceFixture({
  gitignorePatterns = REQUIRED_GITIGNORE_PATTERNS,
  watcherExcludes = REQUIRED_EXCLUDES,
  searchExcludes = REQUIRED_EXCLUDES,
  fileExcludes = REQUIRED_FILE_EXCLUDES
} = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-hygiene-'))
  tempRoots.push(rootDir)
  fs.mkdirSync(path.join(rootDir, '.vscode'), { recursive: true })
  fs.writeFileSync(path.join(rootDir, '.gitignore'), `${gitignorePatterns.join('\n')}\n`)
  fs.writeFileSync(
    path.join(rootDir, '.vscode/settings.json'),
    JSON.stringify(
      {
        'files.watcherExclude': Object.fromEntries(watcherExcludes.map((key: string) => [key, true])),
        'search.exclude': Object.fromEntries(searchExcludes.map((key: string) => [key, true])),
        'files.exclude': Object.fromEntries(fileExcludes.map((key: string) => [key, true]))
      },
      null,
      2
    )
  )
  return rootDir
}

afterEach(() => {
  for (const rootDir of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(rootDir, { recursive: true, force: true })
  }
})

describe('validateWorkspaceHygiene', () => {
  it('passes for the current repo', () => {
    expect(validateWorkspaceHygiene(DEFAULT_ROOT_DIR)).toEqual([])
  })

  it('requires Python cache ignores in .gitignore', () => {
    const rootDir = createWorkspaceFixture({
      gitignorePatterns: REQUIRED_GITIGNORE_PATTERNS.filter((pattern: string) => pattern !== '__pycache__/')
    })

    expect(validateWorkspaceHygiene(rootDir)).toContain('.gitignore must ignore __pycache__/')
  })

  it('requires Python cache exclusions in VS Code settings', () => {
    const rootDir = createWorkspaceFixture({
      watcherExcludes: REQUIRED_EXCLUDES.filter((key: string) => key !== '**/__pycache__/**')
    })

    expect(validateWorkspaceHygiene(rootDir)).toContain('Missing watcher exclude: **/__pycache__/**')
  })
})
