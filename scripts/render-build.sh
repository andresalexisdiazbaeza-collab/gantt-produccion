#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Instalando dependencias Python"
pip install -r "$ROOT/backend/requirements.txt"

echo "==> Instalando y compilando frontend"
cd "$ROOT/frontend"
npm ci
if npm run build; then
  echo "==> Frontend compilado correctamente"
else
  echo "==> npm build falló; usando dist del repo si existe"
  if [ ! -f dist/index.html ]; then
    echo "ERROR: no hay dist/index.html"
    exit 1
  fi
fi

echo "==> Build completado (commit: $(git rev-parse --short HEAD 2>/dev/null || echo unknown))"
