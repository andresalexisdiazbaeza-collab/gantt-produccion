# Desplegar en GitHub + Render

## 1. Subir a GitHub

```bash
cd "/Users/andresdiaz/Desktop/PROGRAMAS/no tocar/Gantt produccion"

# Inicializar repositorio (solo la primera vez)
git init
git add .
git commit -m "Initial commit: Gantt Producción v0.2.0"

# Crear repo en GitHub y subir (requiere gh CLI o hacerlo desde github.com)
gh repo create gantt-produccion --private --source=. --remote=origin --push
```

Si prefieres crear el repo manualmente en [github.com/new](https://github.com/new):

```bash
git remote add origin https://github.com/TU_USUARIO/gantt-produccion.git
git branch -M main
git push -u origin main
```

**No subas** archivos `.env` ni `*.db` — ya están en `.gitignore`.

---

## 2. Desplegar en Render

### Opción A — Blueprint (recomendada)

1. Entra en [render.com](https://render.com) → **New** → **Blueprint**
2. Conecta tu repositorio de GitHub
3. Render detectará `render.yaml` y creará:
   - **Web Service** `gantt-produccion` (API + frontend)
   - **PostgreSQL** `gantt-produccion-db` (datos persistentes)
   - **Disco** de 1 GB (backup SQLite opcional)
4. Tras el deploy, en **Environment** del servicio web configura:
   - `GANTT_APP_URL` = URL pública de Render, ej. `https://gantt-produccion.onrender.com`
   - `GANTT_JWT_SECRET` — Render lo genera automáticamente con el blueprint
5. Abre la URL del servicio → login con usuario `admin` / contraseña `12345` (cámbiala en **Mi cuenta**)

### Opción B — Manual (un solo servicio)

| Campo | Valor |
|-------|-------|
| **Runtime** | Python 3 |
| **Build Command** | `chmod +x scripts/render-build.sh && ./scripts/render-build.sh` |
| **Start Command** | `cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check** | `/api/health` |

**Variables de entorno:**

| Variable | Valor |
|----------|-------|
| `GANTT_JWT_SECRET` | Secreto aleatorio largo |
| `GANTT_APP_URL` | `https://tu-servicio.onrender.com` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL de Render |

Crea una base **PostgreSQL** en Render (free) y pega su *Internal Database URL* en `DATABASE_URL`.

---

## 3. Cómo funciona en producción

- El **build** compila el frontend (`frontend/dist`) e instala Python.
- El **backend** sirve la API en `/api/*` y el frontend React en `/`.
- El frontend llama a `/api` en el mismo dominio (sin CORS extra).
- Los datos viven en **PostgreSQL** (recomendado en Render).

---

## 4. SMTP (opcional)

Para recuperación de contraseña por email, añade en Render:

```
GANTT_SMTP_HOST=smtp.tu-proveedor.com
GANTT_SMTP_PORT=587
GANTT_SMTP_USER=...
GANTT_SMTP_PASSWORD=...
GANTT_SMTP_FROM=noreply@tu-dominio.com
```

Sin SMTP, los enlaces de recuperación aparecen en los logs del servicio.

---

## 5. Notas

- El plan **free** de Render apaga el servicio tras inactividad (~50 s al despertar).
- Cambia las contraseñas por defecto (`12345`) tras el primer deploy.
- Para desarrollo local sigue usando `./start.sh`.
