#!/bin/bash
# Gantt Producción — script de arranque
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== Deteniendo procesos anteriores en puertos 5173 y 8002 ==="
lsof -ti:5173 2>/dev/null | xargs kill -9 2>/dev/null || true
lsof -ti:8002 2>/dev/null | xargs kill -9 2>/dev/null || true
sleep 1

echo "=== Backend (puerto 8002) ==="
cd "$ROOT/backend"
pip3 install -r requirements.txt -q 2>/dev/null || true
python3 -m uvicorn app.main:app --reload --port 8002 &
BACKEND_PID=$!

echo "=== Frontend (puerto 5173) ==="
cd "$ROOT/frontend"
npm run dev -- --port 5173 &
FRONTEND_PID=$!

sleep 3
echo ""
echo "============================================"
echo "  App lista: http://localhost:5173"
echo "  API docs:  http://localhost:8002/docs"
echo "  Backend PID: $BACKEND_PID"
echo "  Frontend PID: $FRONTEND_PID"
echo "============================================"
echo ""
echo "Flujo:"
echo "  1. Importar → NuevoFormato (obligatorio)"
echo "  2. Órdenes activas → máquina + fecha (manual)"
echo "     O Importar → Production Gantt (opcional)"
echo "  3. Gantt optimizada (opcional alternativa)"
echo ""
wait
