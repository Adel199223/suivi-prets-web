import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DEFAULT_ROOT_DIR, REQUIRED_FILES, validateAgentDocs } from '../../tooling/validate-agent-docs.mjs'

const tempRoots: string[] = []

function createAgentDocsFixture() {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agent-docs-'))
  tempRoots.push(rootDir)

  for (const relativePath of REQUIRED_FILES) {
    const sourcePath = path.join(DEFAULT_ROOT_DIR, relativePath)
    const targetPath = path.join(rootDir, relativePath)
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.copyFileSync(sourcePath, targetPath)
  }

  return rootDir
}

afterEach(() => {
  for (const rootDir of tempRoots.splice(0, tempRoots.length)) {
    fs.rmSync(rootDir, { recursive: true, force: true })
  }
})

describe('validateAgentDocs', () => {
  it('passes for the current repo', () => {
    expect(validateAgentDocs(DEFAULT_ROOT_DIR)).toEqual([])
  })

  it('detects a missing root file', () => {
    const errors = validateAgentDocs(path.join(DEFAULT_ROOT_DIR, '__missing__'))
    expect(errors.length).toBeGreaterThan(0)
  })

  it('detects a missing bootstrap profile file', () => {
    const rootDir = createAgentDocsFixture()
    fs.rmSync(path.join(rootDir, 'docs/assistant/HARNESS_PROFILE.json'))

    expect(validateAgentDocs(rootDir)).toContain('Missing required file: docs/assistant/HARNESS_PROFILE.json')
  })

  it('detects a missing project harness workflow id in the manifest', () => {
    const rootDir = createAgentDocsFixture()
    const manifestPath = path.join(rootDir, 'docs/assistant/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    manifest.workflows = manifest.workflows.filter((workflow: { id: string }) => workflow.id !== 'project_harness_sync')
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    expect(validateAgentDocs(rootDir)).toContain('Manifest is missing required workflow id: project_harness_sync')
  })

  it('detects a missing manifest bootstrap block', () => {
    const rootDir = createAgentDocsFixture()
    const manifestPath = path.join(rootDir, 'docs/assistant/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    delete manifest.bootstrap
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    expect(validateAgentDocs(rootDir)).toContain('Manifest bootstrap must be an object')
  })

  it('detects missing manifest bootstrap keys', () => {
    const rootDir = createAgentDocsFixture()
    const manifestPath = path.join(rootDir, 'docs/assistant/manifest.json')
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
    delete manifest.bootstrap.sync_workflow
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))

    expect(validateAgentDocs(rootDir)).toContain('Manifest bootstrap is missing required key: sync_workflow')
  })
})
