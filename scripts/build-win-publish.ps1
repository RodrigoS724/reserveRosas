param(
  [string[]]$EnvFiles = @('.env.release.local', '.env.local', '.env.dev')
)

$ErrorActionPreference = 'Stop'
$repoRoot = Join-Path $PSScriptRoot '..'
Set-Location $repoRoot
$env:Path = (Join-Path $repoRoot 'node_modules\.bin') + ';' + $env:Path

function Invoke-CheckedCommand {
  param(
    [string]$Description,
    [scriptblock]$Command
  )

  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Description fallo con codigo de salida $LASTEXITCODE."
  }
}

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  Get-Content $Path | ForEach-Object {
    $line = $_.Trim()
    if (-not $line -or $line.StartsWith('#')) {
      return
    }

    $pair = $line -split '=', 2
    if ($pair.Count -ne 2) {
      return
    }

    $key = $pair[0].Trim()
    if (-not $key) {
      return
    }

    $value = $pair[1].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if (-not [string]::IsNullOrWhiteSpace($value) -and -not (Test-Path "Env:$key")) {
      Set-Item -Path "Env:$key" -Value $value
    }
  }
}

function Resolve-EnvironmentValue {
  param([string]$Name)

  $value = [Environment]::GetEnvironmentVariable($Name, 'Process')
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    return $value
  }

  $value = [Environment]::GetEnvironmentVariable($Name, 'User')
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    return $value
  }

  $value = [Environment]::GetEnvironmentVariable($Name, 'Machine')
  if (-not [string]::IsNullOrWhiteSpace($value)) {
    return $value
  }

  return $null
}

foreach ($envFile in $EnvFiles) {
  Import-EnvFile -Path (Join-Path (Join-Path $PSScriptRoot '..') $envFile)
}

if ([string]::IsNullOrWhiteSpace((Resolve-EnvironmentValue -Name 'GH_TOKEN'))) {
  throw "GH_TOKEN no esta configurado. Define GH_TOKEN en el entorno o crea .env.release.local con GH_TOKEN=tu_token."
}

$env:GH_TOKEN = Resolve-EnvironmentValue -Name 'GH_TOKEN'

Invoke-CheckedCommand "Vue typecheck" { vue-tsc }
Invoke-CheckedCommand "Vite build" { vite build }
Invoke-CheckedCommand "Electron publish" { electron-builder --win --publish always }