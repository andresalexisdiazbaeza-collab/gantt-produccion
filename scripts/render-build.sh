#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Instalando dependencias Python"
pip install -r "$ROOT/backend/requirements.txt"

echo "==> Instalando y compilando frontend"
cd "$ROOT/frontend"
npm ci
npm run build

echo "==> Build completado"
