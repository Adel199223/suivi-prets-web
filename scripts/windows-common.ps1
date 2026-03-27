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

function Get-LogTail {
  param([string[]]$Paths)

  $chunks = @()
  foreach ($path in $Paths) {
    if (Test-Path $path) {
      $content = (Get-Content $path -Tail 12 | Out-String).Trim()
      if ($content) {
        $chunks += $content
      }
    }
  }

  return ($chunks -join [Environment]::NewLine)
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

function Warn-About-Python {
  $python = Get-Command python3 -ErrorAction SilentlyContinue
  if (-not $python) {
    $python = Get-Command python -ErrorAction SilentlyContinue
  }

  if (-not $python) {
    Write-WarnMessage 'Python was not found. This is fine for normal app usage. It is only needed for optional preview and automation commands.'
  }
}

function Assert-NativeWindowsRepoPath {
  param([string]$RepoRoot)

  if ($RepoRoot.StartsWith('\\')) {
    Fail "This helper must run from a normal Windows folder, not from a UNC/WSL path like '$RepoRoot'. Clone the repo into something like C:\Users\<name>\Documents\suivi-prets-web and rerun from there."
  }
}

function Assert-RepoRoot {
  param([string]$MissingMessage)

  if (-not (Test-Path 'package.json')) {
    Fail $MissingMessage
  }
}

function Get-PortListeners {
  param([int]$Port)

  try {
    return @(Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction SilentlyContinue)
  } catch {
    return @()
  }
}

function Stop-PortProcessesById {
  param(
    [int[]]$ProcessIds,
    [int]$Port
  )

  foreach ($processId in $ProcessIds) {
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
}

function Stop-PortProcessesWithPrompt {
  param(
    [System.Array]$Listeners,
    [int]$Port
  )

  if (-not $Listeners -or $Listeners.Count -eq 0) {
    return $true
  }

  $pids = $Listeners | Select-Object -ExpandProperty OwningProcess -Unique
  Write-WarnMessage "Port $Port is already used by process ID(s): $($pids -join ', ')"
  $answer = Read-Host "Stop these process(es) to avoid port conflict? (y/N)"
  if ($answer -notmatch '^(y|Y)$') {
    Write-WarnMessage "Keeping existing process. If start fails, close the process using port $Port and rerun."
    return $false
  }

  Stop-PortProcessesById -ProcessIds $pids -Port $Port
  return $true
}

function Test-AppReadyResponse {
  param($Response)

  if (-not $Response) {
    return $false
  }

  if ($Response.StatusCode -lt 200 -or $Response.StatusCode -ge 300) {
    return $false
  }

  $contentType = ''
  if ($Response.Headers) {
    $contentType = (@($Response.Headers['Content-Type']) | ForEach-Object { [string]$_ }) -join '; '
    if ([string]::IsNullOrWhiteSpace($contentType) -and $Response.Headers.'Content-Type') {
      $contentType = [string]$Response.Headers.'Content-Type'
    }
  }

  return $contentType -match 'text/html'
}

function Get-ProcessCommandLine {
  param([int]$ProcessId)

  try {
    $process = Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId"
    if ($process -and $process.CommandLine) {
      return [string]$process.CommandLine
    }
  } catch {
  }

  return ''
}

function Stop-RepoPortProcessesOrFail {
  param(
    [System.Array]$Listeners,
    [int]$Port,
    [string]$RepoRoot
  )

  if (-not $Listeners -or $Listeners.Count -eq 0) {
    return
  }

  $repoRootLower = $RepoRoot.ToLowerInvariant()
  $pids = $Listeners | Select-Object -ExpandProperty OwningProcess -Unique
  $unknownOwners = @()

  foreach ($processId in $pids) {
    $commandLine = Get-ProcessCommandLine -ProcessId $processId
    $commandLineLower = $commandLine.ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($commandLine) -or -not $commandLineLower.Contains($repoRootLower)) {
      $unknownOwners += [pscustomobject]@{
        ProcessId   = $processId
        CommandLine = $commandLine
      }
    }
  }

  if ($unknownOwners.Count -gt 0) {
    $ownerSummary = ($unknownOwners | ForEach-Object {
      if ($_.CommandLine) {
        "PID $($_.ProcessId): $($_.CommandLine)"
      } else {
        "PID $($_.ProcessId): command line unavailable"
      }
    }) -join [Environment]::NewLine

    Fail "Port $Port is in use by a process that does not look like this repo. Close it manually first, then rerun the update.`n$ownerSummary"
  }

  Write-Step "Stopping the currently running local app on port $Port before update..."
  Stop-PortProcessesById -ProcessIds $pids -Port $Port
}

function Install-Dependencies {
  param([switch]$Repair)

  if (Test-Path 'package-lock.json') {
    if ($Repair) {
      Write-Step 'Windows dependencies look incomplete or were built in another environment. Running npm ci to repair them...'
    } else {
      Write-Step 'Dependencies missing. Running npm ci...'
    }
    npm ci --no-audit --no-fund
  } else {
    if ($Repair) {
      Write-Step 'Windows dependencies look incomplete or were built in another environment. Running npm install to repair them...'
    } else {
      Write-Step 'Dependencies missing. Running npm install...'
    }
    npm install --no-audit --no-fund
  }
}

function Test-WindowsDependencyHealth {
  $repoRoot = (Convert-Path '.')
  $viteBin = Join-Path $repoRoot 'node_modules\vite\bin\vite.js'
  if (-not (Test-Path $viteBin)) {
    return $false
  }

  $tempRoot = Join-Path $env:TEMP 'suivi-prets-web'
  New-Item -ItemType Directory -Path $tempRoot -Force | Out-Null
  $healthOut = Join-Path $tempRoot 'vite-health.out.log'
  $healthErr = Join-Path $tempRoot 'vite-health.err.log'
  Remove-Item $healthOut, $healthErr -ErrorAction SilentlyContinue

  try {
    $probe = Start-Process node -ArgumentList @($viteBin, '--version') -WorkingDirectory $repoRoot -PassThru -Wait -RedirectStandardOutput $healthOut -RedirectStandardError $healthErr
    return ($probe.ExitCode -eq 0)
  } catch {
    return $false
  } finally {
    Remove-Item $healthOut, $healthErr -ErrorAction SilentlyContinue
  }
}

function Ensure-WindowsDependencies {
  if (-not (Test-Path 'node_modules')) {
    Install-Dependencies
  } elseif (-not (Test-WindowsDependencyHealth)) {
    Install-Dependencies -Repair
  } else {
    Write-Step 'Windows dependencies look healthy, skipping reinstall.'
  }

  if (-not (Test-WindowsDependencyHealth)) {
    Fail 'Dependencies still do not look healthy for Windows after reinstall. Delete node_modules, rerun from a normal Windows folder, or reclone the repo.'
  }
}

function Wait-ForApp {
  param(
    [string]$Url,
    [int]$TimeoutSeconds,
    [System.Diagnostics.Process]$ServerProcess,
    [string[]]$LogPaths
  )

  $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
  while ($stopwatch.Elapsed.TotalSeconds -lt $TimeoutSeconds) {
    if ($ServerProcess.HasExited) {
      $logTail = Get-LogTail -Paths $LogPaths
      if ($logTail) {
        Fail "The local server stopped before the app became reachable.`n$logTail"
      }

      Fail 'The local server stopped before the app became reachable.'
    }

    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec 2
      if (Test-AppReadyResponse -Response $response) {
        return
      }
    } catch {
    }

    Start-Sleep -Milliseconds 750
  }

  if (-not $ServerProcess.HasExited) {
    Stop-Process -Id $ServerProcess.Id -Force -ErrorAction SilentlyContinue
  }

  $timeoutLogTail = Get-LogTail -Paths $LogPaths
  if ($timeoutLogTail) {
    Fail "The app did not answer on $Url within $TimeoutSeconds seconds.`n$timeoutLogTail"
  }

  Fail "The app did not answer on $Url within $TimeoutSeconds seconds."
}

function Get-NpmLaunchCommand {
  $npmCmd = Get-Command 'npm.cmd' -ErrorAction SilentlyContinue
  if ($npmCmd) {
    return @{
      FilePath = $npmCmd.Source
      ArgumentList = @('run', 'dev')
    }
  }

  $npmPs = Get-Command 'npm' -ErrorAction SilentlyContinue
  if ($npmPs) {
    return @{
      FilePath = 'cmd.exe'
      ArgumentList = @('/c', 'npm run dev')
    }
  }

  Fail 'Unable to find npm.cmd for detached Windows startup.'
}

function Start-AppServerAndOpenBrowser {
  param(
    [string]$RepoRoot,
    [string]$Url = 'http://127.0.0.1:4173',
    [int]$Port = 4173
  )

  $logDir = Join-Path $RepoRoot 'output\windows'
  New-Item -ItemType Directory -Path $logDir -Force | Out-Null
  $serverOut = Join-Path $logDir 'dev-server.out.log'
  $serverErr = Join-Path $logDir 'dev-server.err.log'
  Remove-Item $serverOut, $serverErr -ErrorAction SilentlyContinue

  $npmLaunch = Get-NpmLaunchCommand
  Write-Step 'Starting the local server...'
  $serverProcess = Start-Process $npmLaunch.FilePath -ArgumentList $npmLaunch.ArgumentList -WorkingDirectory $RepoRoot -PassThru -RedirectStandardOutput $serverOut -RedirectStandardError $serverErr

  Write-Step "Waiting for $Url ..."
  Wait-ForApp -Url $Url -TimeoutSeconds 45 -ServerProcess $serverProcess -LogPaths @($serverOut, $serverErr)

  Write-Step "Opening $Url"
  Start-Process $Url
  Write-Step 'The app is ready in your browser.'
  Write-Step 'To stop it later, run: npm run stop:windows'
  Write-Step "Server logs are available in $logDir"
}

function Assert-GitCheckout {
  if (-not (Test-Path '.git')) {
    Fail 'This folder is not a Git clone. Clone the repo again from GitHub into a normal Windows folder, then rerun npm run update:windows.'
  }
}

function Assert-CleanGitWorktree {
  Write-Step 'Checking for local code changes...'
  $statusOutput = & git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    Fail 'Unable to read Git status for this folder. Confirm this is a healthy Git clone, then rerun npm run update:windows.'
  }

  if (-not [string]::IsNullOrWhiteSpace(($statusOutput | Out-String))) {
    Fail 'Local code changes were detected. To keep the update safe, this helper will not pull over them. Commit them, discard them, or reclone the repo, then rerun npm run update:windows.'
  }
}

function Pull-LatestFastForward {
  Write-Step 'Fetching latest code...'
  & git fetch --prune
  if ($LASTEXITCODE -ne 0) {
    Fail 'Unable to fetch the latest code. Check internet access and Git authentication, then rerun npm run update:windows.'
  }

  $upstream = (& git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or [string]::IsNullOrWhiteSpace($upstream)) {
    Fail 'This Git clone has no upstream branch configured. Reclone from GitHub or configure the upstream branch, then rerun npm run update:windows.'
  }

  $headBefore = (& git rev-parse HEAD | Out-String).Trim()
  Write-Step "Pulling latest code from $upstream ..."
  & git pull --ff-only
  if ($LASTEXITCODE -ne 0) {
    Fail 'Fast-forward update failed. Resolve the Git issue manually or reclone the repo, then rerun npm run update:windows.'
  }

  $headAfter = (& git rev-parse HEAD | Out-String).Trim()
  if ($headBefore -eq $headAfter) {
    Write-Step 'Already up to date. Restarting the app anyway...'
  } else {
    Write-Step 'Update downloaded successfully.'
  }
}
