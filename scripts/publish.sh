#!/usr/bin/env bash
# Crea repo GitHub, sube código y despliega blueprint en Render.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO_NAME="${REPO_NAME:-gantt-produccion}"
GITHUB_OWNER="${GITHUB_OWNER:-andresalexisdiazbaeza-collab}"
VISIBILITY="${VISIBILITY:-private}"

GH="${GH:-gh}"
if ! command -v "$GH" >/dev/null 2>&1; then
  if [ -x /tmp/gh_2.67.0_macOS_arm64/bin/gh ]; then
    GH=/tmp/gh_2.67.0_macOS_arm64/bin/gh
  else
    echo "Instala GitHub CLI: https://cli.github.com"
    exit 1
  fi
fi

"$GH" auth status >/dev/null || {
  echo "Primero autentícate: $GH auth login --web"
  exit 1
}

cd "$ROOT"

if ! git remote get-url origin >/dev/null 2>&1; then
  echo "==> Creando repositorio GitHub: $GITHUB_OWNER/$REPO_NAME"
  "$GH" repo create "$REPO_NAME" \
    --${VISIBILITY} \
    --source=. \
    --remote=origin \
    --description "Gantt Producción — planificación de producción"
else
  echo "==> Remote origin ya existe"
fi

echo "==> Subiendo a GitHub"
git push -u origin main

echo ""
echo "==> GitHub listo: https://github.com/$GITHUB_OWNER/$REPO_NAME"
echo ""
echo "Siguiente paso — Render:"
echo "  1. https://dashboard.render.com/blueprints"
echo "  2. New Blueprint Instance → conecta $GITHUB_OWNER/$REPO_NAME"
echo "  3. Tras el deploy, en Environment del servicio web:"
echo "     GANTT_APP_URL = https://<tu-servicio>.onrender.com"
echo ""
echo "Login inicial: admin / 12345 (cámbiala en Mi cuenta)"
