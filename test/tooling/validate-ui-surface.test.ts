import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import {
  createArtifactPaths,
  findHorizontalOrderIssue,
  getWindowsBrowserCandidates,
  launchValidationBrowser,
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
    expect(paths.debtTimelineScreenshot).toBe(path.join(outputDir, 'ui-validation-debt-timeline.png'))
    expect(paths.desktopScreenshot).toBe(path.join(outputDir, 'ui-validation-desktop.png'))
    expect(paths.summary).toBe(path.join(outputDir, 'ui-validation-summary.json'))
  })

  it('reports no issue when measured boxes stay in order with a safe gap', () => {
    expect(
      findHorizontalOrderIssue([
        { name: 'kind', left: 0, right: 80 },
        { name: 'detail', left: 96, right: 240 },
        { name: 'meta', left: 260, right: 380 },
        { name: 'actions', left: 400, right: 520 }
      ])
    ).toBeNull()
  })

  it('reports a horizontal overlap when adjacent boxes crowd each other', () => {
    expect(
      findHorizontalOrderIssue([
        { name: 'kind', left: 0, right: 110 },
        { name: 'detail', left: 108, right: 240 },
        { name: 'meta', left: 260, right: 380 }
      ])
    ).toContain('kind overlaps or crowds detail')
  })

  it('returns only bundled chromium on non-windows platforms', () => {
    expect(getWindowsBrowserCandidates('linux')).toEqual([{ engine: 'chromium', channel: null, label: 'bundled-chromium' }])
  })

  it('returns bundled chromium then Edge and Chrome on Windows', () => {
    expect(getWindowsBrowserCandidates('win32')).toEqual([
      { engine: 'chromium', channel: null, label: 'bundled-chromium' },
      { engine: 'chromium', channel: 'msedge', label: 'edge-channel' },
      { engine: 'chromium', channel: 'chrome', label: 'chrome-channel' }
    ])
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

  it('falls back to Edge on Windows when bundled Chromium fails to launch', async () => {
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new Error('browserType.launch: bundled chromium failed'))
      .mockResolvedValueOnce({ close: vi.fn() })

    const result = await launchValidationBrowser({
      platform: 'win32',
      chromiumLauncher: { launch }
    })

    expect(launch).toHaveBeenNthCalledWith(1, { headless: true })
    expect(launch).toHaveBeenNthCalledWith(2, { headless: true, channel: 'msedge' })
    expect(result.browserInfo).toEqual({ engine: 'chromium', channel: 'msedge', label: 'edge-channel' })
    expect(result.browserAttempts).toEqual([
      { engine: 'chromium', channel: null, label: 'bundled-chromium', status: 'failed', reason: 'browserType.launch: bundled chromium failed' },
      { engine: 'chromium', channel: 'msedge', label: 'edge-channel', status: 'passed' }
    ])
  })

  it('falls back to Chrome on Windows when Chromium and Edge fail', async () => {
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new Error('browserType.launch: bundled chromium failed'))
      .mockRejectedValueOnce(new Error('browserType.launch: edge failed'))
      .mockResolvedValueOnce({ close: vi.fn() })

    const result = await launchValidationBrowser({
      platform: 'win32',
      chromiumLauncher: { launch }
    })

    expect(launch).toHaveBeenNthCalledWith(3, { headless: true, channel: 'chrome' })
    expect(result.browserInfo).toEqual({ engine: 'chromium', channel: 'chrome', label: 'chrome-channel' })
    expect(result.browserAttempts[1]).toEqual({
      engine: 'chromium',
      channel: 'msedge',
      label: 'edge-channel',
      status: 'failed',
      reason: 'browserType.launch: edge failed'
    })
  })

  it('does not fall back when bundled Chromium launches successfully', async () => {
    const launch = vi.fn().mockResolvedValue({ close: vi.fn() })

    const result = await launchValidationBrowser({
      platform: 'win32',
      chromiumLauncher: { launch }
    })

    expect(launch).toHaveBeenCalledTimes(1)
    expect(result.browserInfo).toEqual({ engine: 'chromium', channel: null, label: 'bundled-chromium' })
  })

  it('throws a combined error when all Windows browser launch attempts fail', async () => {
    const launch = vi
      .fn()
      .mockRejectedValueOnce(new Error('browserType.launch: bundled chromium failed'))
      .mockRejectedValueOnce(new Error('browserType.launch: edge failed'))
      .mockRejectedValueOnce(new Error('browserType.launch: chrome failed'))

    await expect(
      launchValidationBrowser({
        platform: 'win32',
        chromiumLauncher: { launch }
      })
    ).rejects.toThrow(
      'Unable to launch a validation browser on win32. bundled-chromium: browserType.launch: bundled chromium failed; edge-channel: browserType.launch: edge failed; chrome-channel: browserType.launch: chrome failed'
    )
  })
})
