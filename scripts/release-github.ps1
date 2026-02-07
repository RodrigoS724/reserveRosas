param(
  [ValidateSet("patch","minor","major")]
  [string]$Bump = "patch"
)

$ErrorActionPreference = "Stop"

Write-Host "[release:github] Bumping version ($Bump)..." -ForegroundColor Cyan
npm version $Bump

Write-Host "[release:github] Pushing commit and tag..." -ForegroundColor Cyan
git push
git push --tags

Write-Host "[release:github] Done. GitHub Actions will build and publish the release." -ForegroundColor Green
