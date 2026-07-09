#!/usr/bin/env bash
set -euo pipefail

# Flujo de release para la app principal reserveRosas.
# Uso:
#   bash scripts/build-main-app.sh [patch|minor|major] [local|github]
# Ejemplos:
#   bash scripts/build-main-app.sh patch local
#   bash scripts/build-main-app.sh minor github

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

BUMP="${1:-patch}"
TARGET="${2:-local}"

if [[ "$BUMP" != "patch" && "$BUMP" != "minor" && "$BUMP" != "major" ]]; then
  echo "Error: bump invalido '$BUMP'. Usa: patch | minor | major"
  exit 1
fi

if [[ "$TARGET" != "local" && "$TARGET" != "github" ]]; then
  echo "Error: target invalido '$TARGET'. Usa: local | github"
  exit 1
fi

cd "$APP_DIR"

echo "[1/7] Verificando estado git..."
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Error: hay cambios sin commitear. Commit/stash antes de release."
  exit 1
fi

echo "[2/7] Actualizando rama actual..."
git pull --ff-only

echo "[3/7] Instalando dependencias..."
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
elif command -v yarn >/dev/null 2>&1; then
  yarn install --frozen-lockfile
else
  npm ci
fi

echo "[4/7] Bumping version ($BUMP)..."
npm version "$BUMP"

NEW_VERSION="$(node -p "require('./package.json').version")"
echo "Nueva version: v$NEW_VERSION"

echo "[5/7] Ejecutando build Windows..."
npm run build:win

if [[ "$TARGET" == "github" ]]; then
  echo "[6/7] Publicando commit y tag..."
  git push
  git push --tags
else
  echo "[6/7] Modo local: sin push."
fi

echo "[7/7] Release completado: v$NEW_VERSION"
echo "Artifacts esperados en release/$NEW_VERSION/"
