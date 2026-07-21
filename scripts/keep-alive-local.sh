#!/bin/bash
# Ping periódico al Gantt en Render (backup si GitHub Actions no corre).
# Uso: ./scripts/keep-alive-local.sh &
URL="${GANTT_HEALTH_URL:-https://gantt-produccion.onrender.com/api/health}"
INTERVAL="${GANTT_KEEPALIVE_SEC:-840}" # 14 minutos

echo "Keep-alive Gantt → $URL (cada ${INTERVAL}s)"
while true; do
  curl -fsS --max-time 120 "$URL" >/dev/null 2>&1 && echo "$(date '+%H:%M:%S') OK" || echo "$(date '+%H:%M:%S') fallo"
  sleep "$INTERVAL"
done
