Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Write-Step {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Cyan
}

function Write-ErrorMessage {
  param([string]$Message)
  Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function Write-WarnMessage {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Fail {
  param([string]$Message)
  Write-ErrorMessage $Message
  exit 1
}

function Ensure-Command {
  param(
    [string]$Name,
    [string]$InstallHint
  )
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    Fail "$Name is not available in PATH. $InstallHint"
  }
}

function Ensure-NodeVersion {
  try {
    $rawNodeVersion = (node --version).Trim()
    $nodeVersion = [version]$rawNodeVersion.TrimStart('v')
    if ($nodeVersion.Major -lt 20) {
      Write-WarnMessage "Node.js $($nodeVersion) detected. For best results, use Node.js 20+ (LTS recommended)."
    }
  } catch {
    Fail "Unable to read Node.js version. Confirm installation: https://nodejs.org/"
  }
}

function Check-Port {
  param([int]$Port)
  try {
    $listeners = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue
    return $listeners
  } catch {
    return @()
  }
}

function Stop-PortProcesses {
  param([System.Array]$Listeners, [int]$Port)
  if (-not $Listeners -or $Listeners.Count -eq 0) {
    return
  }

  $pids = $Listeners | Select-Object -ExpandProperty OwningProcess -Unique
  Write-WarnMessage "Port $Port is already used by process ID(s): $($pids -join ', ')"
  $answer = Read-Host "Stop these process(es) to avoid port conflict? (y/N)"
  if ($answer -notmatch '^(y|Y)$') {
    Write-WarnMessage "Keeping existing process. If start fails, close the process using port $Port and rerun."
    return
  }

  foreach ($pid in $pids) {
    try {
      Stop-Process -Id $pid -Force -ErrorAction Stop
      Write-Step "Stopped process $pid."
    } catch {
      Write-WarnMessage "Could not stop process $pid. You may need admin rights."
    }
  }
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
  Write-Step "Starting Suivi Prets (Windows helper)."

  if (-not (Test-Path '.git')) {
    Fail "This folder does not look like this repository root. Run from the repo root and retry."
  }

  Ensure-Command 'git' 'Install Git (https://git-scm.com/) and reopen your terminal.'
  Ensure-Command 'node' 'Install Node.js 20+ from https://nodejs.org/.'
  Ensure-Command 'npm' 'Install Node.js (includes npm) from https://nodejs.org/.'
  Ensure-NodeVersion

  $python = Get-Command python3 -ErrorAction SilentlyContinue
  if (-not $python) {
    $python = Get-Command python -ErrorAction SilentlyContinue
  }
  if (-not $python) {
    Write-WarnMessage 'Python was not found. This is fine for running the app. It is only needed for optional import preview/automation commands.'
  }

  if (-not (Test-Path 'node_modules')) {
    if (Test-Path 'package-lock.json') {
      Write-Step 'Dependencies missing. Running npm ci...'
      npm ci --no-audit --no-fund
    } else {
      Write-Step 'Dependencies missing. Running npm install...'
      npm install --no-audit --no-fund
    }
  } else {
    Write-Step 'Dependencies found, skipping install.'
  }

  Stop-PortProcesses -Listeners (Check-Port -Port 4173) -Port 4173

  $appUrl = 'http://127.0.0.1:4173'
  Write-Step "If your browser does not open automatically, visit $appUrl"
  Start-Process $appUrl

  Write-Step 'Running npm run dev ...'
  npm run dev
} finally {
  Pop-Location
}
