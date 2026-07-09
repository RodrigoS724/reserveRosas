param(
  [ValidateSet("patch","minor","major")]
  [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"

Write-Host "[release:local] Bumping version ($Bump)..." -ForegroundColor Cyan
npm version $Bump

Write-Host "[release:local] Building Windows release..." -ForegroundColor Cyan
npm run build:win

Write-Host "[release:local] Done. Artifacts are in release/<version>/" -ForegroundColor Green
