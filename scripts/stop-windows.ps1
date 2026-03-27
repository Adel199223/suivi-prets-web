param(
  [int]$Port = 4173
)

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

function Fail {
  param([string]$Message)
  Write-ErrorMessage $Message
  exit 1
}

function Get-PortListeners {
  param([int]$Port)
  try {
    return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
  } catch {
    return @()
  }
}

Push-Location (Join-Path $PSScriptRoot '..')
try {
  Write-Step "Stopping Suivi Prêts on port $Port if it is running."

  if (-not (Test-Path 'package.json')) {
    Fail "This folder does not look like the repo root. Open the repo folder and retry."
  }

  $listeners = @(Get-PortListeners -Port $Port)
  if (-not $listeners -or $listeners.Count -eq 0) {
    Write-Step "Nothing is currently listening on port $Port. The app is already stopped."
    exit 0
  }

  $pids = $listeners | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $pids) {
    try {
      Stop-Process -Id $processId -Force -ErrorAction Stop
      Write-Step "Stopped process $processId."
    } catch {
      Fail "Could not stop process $processId on port $Port. You may need to close it manually."
    }
  }

  Start-Sleep -Milliseconds 300
  $remaining = @(Get-PortListeners -Port $Port)
  if ($remaining -and $remaining.Count -gt 0) {
    $remainingPids = $remaining | Select-Object -ExpandProperty OwningProcess -Unique
    Fail "Port $Port is still in use by process ID(s): $($remainingPids -join ', ')"
  }

  Write-Step "Suivi Prêts is now stopped on port $Port."
} finally {
  Pop-Location
}
