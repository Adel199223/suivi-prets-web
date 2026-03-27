import { spawn } from 'node:child_process'
import fs from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { setTimeout as delay } from 'node:timers/promises'
import { fileURLToPath } from 'node:url'
import { chromium, devices } from 'playwright'

const THIS_FILE = fileURLToPath(import.meta.url)
const TOOLING_DIR = path.dirname(THIS_FILE)
const DEFAULT_ROOT_DIR = path.resolve(TOOLING_DIR, '..')
export const DEFAULT_BASE_URL = 'http://127.0.0.1:4173'

export function getPackageManagerCommand(platform = process.platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm'
}

export function createArtifactPaths(outputDir) {
  return {
    desktopScreenshot: path.join(outputDir, 'ui-validation-desktop.png'),
    mobileScreenshot: path.join(outputDir, 'ui-validation-mobile.png'),
    summary: path.join(outputDir, 'ui-validation-summary.json'),
    failureScreenshot: path.join(outputDir, 'ui-validation-failure.png'),
    trace: path.join(outputDir, 'ui-validation-trace.zip')
  }
}

export function getWindowsBrowserCandidates(platform = process.platform) {
  const bundled = [{ engine: 'chromium', channel: null, label: 'bundled-chromium' }]
  if (platform !== 'win32') {
    return bundled
  }

  return [
    ...bundled,
    { engine: 'chromium', channel: 'msedge', label: 'edge-channel' },
    { engine: 'chromium', channel: 'chrome', label: 'chrome-channel' }
  ]
}

export function summarizeLaunchError(error) {
  return error instanceof Error ? error.message : String(error)
}

export async function launchValidationBrowser({
  platform = process.platform,
  chromiumLauncher = chromium
} = {}) {
  const candidates = getWindowsBrowserCandidates(platform)
  const browserAttempts = []

  for (const candidate of candidates) {
    try {
      const browser = await chromiumLauncher.launch({
        headless: true,
        ...(candidate.channel ? { channel: candidate.channel } : {})
      })

      browserAttempts.push({
        ...candidate,
        status: 'passed'
      })

      return {
        browser,
        browserInfo: candidate,
        browserAttempts
      }
    } catch (error) {
      browserAttempts.push({
        ...candidate,
        status: 'failed',
        reason: summarizeLaunchError(error)
      })
    }
  }

  const combinedReasons = browserAttempts
    .map((attempt) => `${attempt.label}: ${attempt.reason}`)
    .join('; ')

  const launchError = new Error(`Unable to launch a validation browser on ${platform}. ${combinedReasons}`)
  launchError.browserAttempts = browserAttempts
  throw launchError
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  let baseUrl = DEFAULT_BASE_URL
  let outputDir = path.join(DEFAULT_ROOT_DIR, 'output', 'playwright')
  let explicitBaseUrl = false

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--base-url') {
      baseUrl = argv[index + 1] ?? baseUrl
      explicitBaseUrl = true
      index += 1
      continue
    }
    if (argument === '--output-dir') {
      outputDir = argv[index + 1] ?? outputDir
      index += 1
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }

  return { baseUrl, outputDir, explicitBaseUrl }
}

export async function probeBaseUrl(baseUrl) {
  try {
    const response = await fetch(baseUrl, {
      method: 'GET',
      redirect: 'manual',
      signal: AbortSignal.timeout(2_000)
    })
    return response.ok || (response.status >= 300 && response.status < 400)
  } catch {
    return false
  }
}

export async function waitForBaseUrl(
  baseUrl,
  {
    timeoutMs = 20_000,
    intervalMs = 250,
    probe = probeBaseUrl,
    errorMessage = `Base URL ${baseUrl} did not become reachable within ${timeoutMs}ms.`
  } = {}
) {
  const deadline = Date.now() + timeoutMs

  while (Date.now() < deadline) {
    if (await probe(baseUrl)) {
      return
    }
    await delay(intervalMs)
  }

  throw new Error(errorMessage)
}

export function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: DEFAULT_ROOT_DIR,
      stdio: 'inherit',
      ...options
    })
    child.once('error', reject)
    child.once('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }
      reject(new Error(`Command failed: ${command} ${args.join(' ')} (exit code ${code ?? 'null'})`))
    })
  })
}

export function startCommand(command, args, options = {}) {
  return spawn(command, args, {
    cwd: DEFAULT_ROOT_DIR,
    stdio: 'inherit',
    ...options
  })
}

export async function stopCommand(child, { timeoutMs = 5_000 } = {}) {
  if (!child || child.exitCode !== null || child.killed) {
    return
  }

  const waitForExit = new Promise((resolve) => {
    child.once('exit', () => resolve())
    child.once('error', () => resolve())
  })

  child.kill('SIGTERM')
  const exited = await Promise.race([waitForExit.then(() => true), delay(timeoutMs).then(() => false)])
  if (!exited && child.exitCode === null) {
    child.kill('SIGKILL')
    await waitForExit
  }
}

export async function runBrowserValidation({ baseUrl, outputDir }) {
  await fs.mkdir(outputDir, { recursive: true })
  const artifacts = createArtifactPaths(outputDir)
  const checks = []
  const startedAt = new Date().toISOString()
  let browser = null
  let browserInfo = null
  let browserAttempts = []

  try {
    const launchedBrowser = await launchValidationBrowser()
    browser = launchedBrowser.browser
    browserInfo = launchedBrowser.browserInfo
    browserAttempts = launchedBrowser.browserAttempts

    const desktopContext = await browser.newContext({ viewport: { width: 1440, height: 900 } })
    await desktopContext.tracing.start({ screenshots: true, snapshots: true })
    const page = await desktopContext.newPage()
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20_000 })
    await page.getByLabel('Nom').fill('Validation UI')
    await page.getByRole('button', { name: /créer l’emprunteur/i }).click()
    await page.getByRole('heading', { name: 'Validation UI' }).waitFor()
    await page.getByLabel('Libellé').fill('Dette test')
    await page.getByLabel('Solde initial (€)').fill('900')
    await page.getByLabel('Date précise dette').fill('2026-03-01')
    await page.getByRole('button', { name: /créer la dette/i }).click()
    await page.getByRole('heading', { name: 'Dette test', level: 1 }).waitFor()
    await page.getByRole('button', { name: /enregistrer un paiement/i }).click()
    await page.getByLabel('Montant (€)').fill('100')
    await page.getByLabel('Date précise').fill('2026-03-15')
    await page.getByRole('button', { name: /valider le paiement/i }).click()
    await page.getByRole('link', { name: /import & sauvegarde/i }).click()
    await page.getByRole('heading', { name: /importer un classeur/i }).waitFor()
    await page.getByRole('button', { name: /ouvrir les réglages/i }).click()
    await page.getByRole('dialog', { name: /réglages/i }).waitFor()
    await page.getByRole('button', { name: /^sombre$/i }).click()
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await page.screenshot({ path: artifacts.desktopScreenshot, fullPage: true })
    await desktopContext.tracing.stop({ path: artifacts.trace })
    checks.push(
      { name: 'borrower flow visible', status: 'passed' },
      { name: 'debt flow visible', status: 'passed' },
      { name: 'import page visible', status: 'passed' },
      { name: 'settings drawer visible', status: 'passed' },
      { name: 'dark mode toggle visible', status: 'passed' }
    )
    await desktopContext.close()

    const mobileContext = await browser.newContext({ ...devices['iPhone 13'] })
    const mobilePage = await mobileContext.newPage()
    await mobilePage.goto(baseUrl, { waitUntil: 'networkidle', timeout: 20_000 })
    await mobilePage.getByRole('button', { name: /ouvrir les réglages/i }).click()
    await mobilePage.getByRole('dialog', { name: /réglages/i }).waitFor()
    await mobilePage.screenshot({ path: artifacts.mobileScreenshot, fullPage: true })
    await mobileContext.close()

    const summary = {
      baseUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'passed',
      browser: browserInfo,
      browserAttempts,
      checks,
      artifacts
    }
    await fs.writeFile(artifacts.summary, JSON.stringify(summary, null, 2))
    return summary
  } catch (error) {
    if (Array.isArray(error?.browserAttempts) && error.browserAttempts.length > 0) {
      browserAttempts = error.browserAttempts
    }

    if (browser) {
      const failureContext = await browser.newContext({ viewport: { width: 1280, height: 800 } })
      const failurePage = await failureContext.newPage()
      try {
        await failurePage.goto(baseUrl, { waitUntil: 'networkidle', timeout: 10_000 })
        await failurePage.screenshot({ path: artifacts.failureScreenshot, fullPage: true })
      } catch {
        // Ignore screenshot fallback failure.
      }
      await failureContext.close()
    }

    const summary = {
      baseUrl,
      startedAt,
      finishedAt: new Date().toISOString(),
      status: 'failed',
      browser: browserInfo,
      browserAttempts,
      checks,
      artifacts,
      error: error instanceof Error ? error.message : String(error)
    }
    await fs.writeFile(artifacts.summary, JSON.stringify(summary, null, 2))
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

export async function runUiValidation(
  { baseUrl, outputDir, explicitBaseUrl = false },
  {
    packageManagerCommand = getPackageManagerCommand(),
    runCommandFn = runCommand,
    startCommandFn = startCommand,
    stopCommandFn = stopCommand,
    waitForBaseUrlFn = waitForBaseUrl,
    runBrowserValidationFn = runBrowserValidation
  } = {}
) {
  let previewProcess = null

  try {
    if (explicitBaseUrl) {
      await waitForBaseUrlFn(baseUrl, {
        timeoutMs: 10_000,
        errorMessage: `Base URL ${baseUrl} did not become reachable. Start the target server first or omit --base-url to let validate:ui build and preview the app automatically.`
      })
    } else {
      await runCommandFn(packageManagerCommand, ['run', 'build'])
      previewProcess = startCommandFn(packageManagerCommand, ['run', 'preview'])
      await waitForBaseUrlFn(baseUrl, {
        timeoutMs: 20_000,
        errorMessage: `Preview server at ${baseUrl} did not become reachable after running npm run preview.`
      })
    }

    return await runBrowserValidationFn({ baseUrl, outputDir })
  } finally {
    if (previewProcess) {
      await stopCommandFn(previewProcess)
    }
  }
}

async function main() {
  const { baseUrl, outputDir, explicitBaseUrl } = parseCliArgs()
  await runUiValidation({ baseUrl, outputDir, explicitBaseUrl })
}

if (process.argv[1] === THIS_FILE) {
  void main()
}
