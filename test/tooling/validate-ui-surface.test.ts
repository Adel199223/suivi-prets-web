import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createArtifactPaths, parseCliArgs } from '../../tooling/validate-ui-surface.mjs'

describe('validate-ui-surface helpers', () => {
  it('parses CLI overrides', () => {
    const parsed = parseCliArgs(['--base-url', 'http://localhost:5000', '--output-dir', '/tmp/demo'])
    expect(parsed.baseUrl).toBe('http://localhost:5000')
    expect(parsed.outputDir).toBe('/tmp/demo')
  })

  it('creates deterministic artifact paths', () => {
    const paths = createArtifactPaths('/tmp/out')
    expect(paths.desktopScreenshot).toBe(path.join('/tmp/out', 'ui-validation-desktop.png'))
    expect(paths.summary).toBe(path.join('/tmp/out', 'ui-validation-summary.json'))
  })
})
