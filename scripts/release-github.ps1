param(
  [ValidateSet("patch","minor","major")]
  [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"

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

$pendingChanges = git status --porcelain
if ($LASTEXITCODE -ne 0) {
  throw "No se pudo verificar el estado de Git."
}
if ($pendingChanges) {
  throw "No se puede crear un release con cambios sin confirmar. Confirma o guarda los cambios antes de ejecutar este script."
}

Write-Host "[release:github] Bumping version ($Bump)..." -ForegroundColor Cyan
Invoke-CheckedCommand "El incremento de version" { npm version $Bump }

Write-Host "[release:github] Pushing commit and tag..." -ForegroundColor Cyan
Invoke-CheckedCommand "El push del commit" { git push }
Invoke-CheckedCommand "El push del tag" { git push --tags }

Write-Host "[release:github] Done. GitHub Actions will build and publish the release." -ForegroundColor Green
