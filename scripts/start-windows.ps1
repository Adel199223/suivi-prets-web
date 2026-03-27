Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-common.ps1')

Push-Location (Join-Path $PSScriptRoot '..')
try {
  $repoRoot = (Convert-Path '.')
  Assert-NativeWindowsRepoPath -RepoRoot $repoRoot

  Write-Step "Starting Suivi Prêts (Windows helper)."

  Assert-RepoRoot -MissingMessage 'This folder does not look like the repo root. Open the cloned repo folder and rerun npm run start:windows.'
  Ensure-Command 'node' 'Install Node.js 20+ from https://nodejs.org/.'
  Ensure-Command 'npm' 'Install Node.js (includes npm) from https://nodejs.org/.'
  Ensure-NodeVersion
  Warn-About-Python

  Write-Step 'Ubuntu/WSL is not required for this Windows launcher.'
  Ensure-WindowsDependencies
  $canStart = Stop-PortProcessesWithPrompt -Listeners (Get-PortListeners -Port 4173) -Port 4173
  if (-not $canStart) {
    Fail 'Port 4173 is still in use. Close the existing service or rerun npm run start:windows and allow this helper to stop it before launching Suivi Prêts.'
  }
  Start-AppServerAndOpenBrowser -RepoRoot $repoRoot -Url 'http://127.0.0.1:4173' -Port 4173
} finally {
  Pop-Location
}
