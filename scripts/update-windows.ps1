Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

. (Join-Path $PSScriptRoot 'windows-common.ps1')

Push-Location (Join-Path $PSScriptRoot '..')
try {
  $repoRoot = (Convert-Path '.')
  Assert-NativeWindowsRepoPath -RepoRoot $repoRoot

  Write-Step 'Updating Suivi Prêts (Windows helper).'

  Assert-RepoRoot -MissingMessage 'This folder does not look like the repo root. Open the cloned repo folder and rerun npm run update:windows.'

  Ensure-Command 'git' 'Install Git for Windows from https://git-scm.com/download/win.'
  Ensure-Command 'node' 'Install Node.js 20+ from https://nodejs.org/.'
  Ensure-Command 'npm' 'Install Node.js (includes npm) from https://nodejs.org/.'
  Ensure-NodeVersion
  Warn-About-Python
  Write-Step 'Ubuntu/WSL is not required for this Windows updater.'

  Assert-GitCheckout

  $listeners = @(Get-PortListeners -Port 4173)
  if ($listeners.Count -gt 0) {
    Stop-RepoPortProcessesOrFail -Listeners $listeners -Port 4173 -RepoRoot $repoRoot
  }

  Assert-CleanGitWorktree
  Pull-LatestFastForward
  Ensure-WindowsDependencies
  Start-AppServerAndOpenBrowser -RepoRoot $repoRoot -Url 'http://127.0.0.1:4173' -Port 4173
} finally {
  Pop-Location
}
