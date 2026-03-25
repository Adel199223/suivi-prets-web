import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createArtifactPaths,
  parseCliArgs,
  runUiValidation,
  waitForBaseUrl
} from '../../tooling/validate-ui-surface.mjs'

describe('validate-ui-surface helpers', () => {
  it('parses CLI overrides', () => {
    const parsed = parseCliArgs(['--base-url', 'http://localhost:5000', '--output-dir', path.join('tmp', 'demo')])
    expect(parsed.baseUrl).toBe('http://localhost:5000')
    expect(parsed.outputDir).toBe(path.join('tmp', 'demo'))
    expect(parsed.explicitBaseUrl).toBe(true)
  })

  it('creates deterministic artifact paths', () => {
    const outputDir = path.join('tmp', 'out')
    const paths = createArtifactPaths(outputDir)
    expect(paths.desktopScreenshot).toBe(path.join(outputDir, 'ui-validation-desktop.png'))
    expect(paths.summary).toBe(path.join(outputDir, 'ui-validation-summary.json'))
  })

  it('waits until a base URL becomes reachable', async () => {
    const probe = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)

    await waitForBaseUrl('http://127.0.0.1:4173', { timeoutMs: 100, intervalMs: 0, probe })
    expect(probe).toHaveBeenCalledTimes(3)
  })

  it('builds and previews automatically when no base URL override is provided', async () => {
    const runCommandFn = vi.fn(async () => {})
    const startCommandFn = vi.fn(() => ({ exitCode: null, killed: false }))
    const waitForBaseUrlFn = vi.fn(async () => {})
    const runBrowserValidationFn = vi.fn(async () => ({ status: 'passed' }))
    const stopCommandFn = vi.fn(async () => {})

    const result = await runUiValidation(
      {
        baseUrl: 'http://127.0.0.1:4173',
        outputDir: path.join('tmp', 'playwright'),
        explicitBaseUrl: false
      },
      {
        packageManagerCommand: 'npm',
        runCommandFn,
        startCommandFn,
        stopCommandFn,
        waitForBaseUrlFn,
        runBrowserValidationFn
      }
    )

    expect(result).toEqual({ status: 'passed' })
    expect(runCommandFn).toHaveBeenCalledWith('npm', ['run', 'build'])
    expect(startCommandFn).toHaveBeenCalledWith('npm', ['run', 'preview'])
    expect(waitForBaseUrlFn).toHaveBeenCalledWith('http://127.0.0.1:4173', {
      timeoutMs: 20_000,
      errorMessage: 'Preview server at http://127.0.0.1:4173 did not become reachable after running npm run preview.'
    })
    expect(runBrowserValidationFn).toHaveBeenCalledWith({
      baseUrl: 'http://127.0.0.1:4173',
      outputDir: path.join('tmp', 'playwright')
    })
    expect(stopCommandFn).toHaveBeenCalledTimes(1)
  })

  it('reuses an explicit external base URL without starting preview locally', async () => {
    const runCommandFn = vi.fn(async () => {})
    const startCommandFn = vi.fn(() => ({ exitCode: null, killed: false }))
    const waitForBaseUrlFn = vi.fn(async () => {})
    const runBrowserValidationFn = vi.fn(async () => ({ status: 'passed' }))
    const stopCommandFn = vi.fn(async () => {})

    await runUiValidation(
      {
        baseUrl: 'http://localhost:5000',
        outputDir: path.join('tmp', 'playwright'),
        explicitBaseUrl: true
      },
      {
        packageManagerCommand: 'npm',
        runCommandFn,
        startCommandFn,
        stopCommandFn,
        waitForBaseUrlFn,
        runBrowserValidationFn
      }
    )

    expect(runCommandFn).not.toHaveBeenCalled()
    expect(startCommandFn).not.toHaveBeenCalled()
    expect(waitForBaseUrlFn).toHaveBeenCalledWith('http://localhost:5000', {
      timeoutMs: 10_000,
      errorMessage:
        'Base URL http://localhost:5000 did not become reachable. Start the target server first or omit --base-url to let validate:ui build and preview the app automatically.'
    })
    expect(stopCommandFn).not.toHaveBeenCalled()
  })
})
