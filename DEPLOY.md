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

### Bases de datos (gratis, sin PostgreSQL de Render)

| App | Base de datos | Proveedor |
|-----|---------------|-----------|
| **Gantt** | PostgreSQL | [Neon](https://neon.tech) (free) |
| **Inventario** | MongoDB | [MongoDB Atlas](https://www.mongodb.com/atlas) (free) |

La PostgreSQL de Render (`gantt-produccion-db`) **expira a los 90 días** — no la uses. Usa Neon.

---

### 2.1 Crear base en Neon (Gantt)

1. Entra en [console.neon.tech](https://console.neon.tech) → **New project**
2. Región: **Frankfurt** (cerca de Render EU)
3. Copia la **connection string** (modo **Pooled**, con `sslmode=require`)
4. En Render → servicio `gantt-produccion` → **Environment**:
   - `DATABASE_URL` = la URL de Neon
   - `GANTT_APP_URL` = `https://gantt-produccion.onrender.com`
5. **Manual Deploy** → Deploy latest commit

O desde terminal (con API key de Render en `~/.render/cli.yaml`):

```bash
export NEON_DATABASE_URL='postgresql://...'
python3 scripts/configure-render-databases.py
```

---

### 2.2 MongoDB Atlas (Inventario)

Si ya tienes cluster Atlas (como `cluster01`):

1. Atlas → **Database** → **Connect** → Drivers → copia `mongodb+srv://...`
2. En Render → servicio `respaldo-inventario-master` → **Environment**:
   - `MONGODB_URI` = la URL de Atlas
3. **Manual Deploy**

O con el script:

```bash
export MONGODB_URI='mongodb+srv://...'
python3 scripts/configure-render-databases.py
```

---

### Opción A — Blueprint (recomendada)

1. Entra en [render.com](https://render.com) → **New** → **Blueprint**
2. Conecta tu repositorio de GitHub
3. Render creará solo el **Web Service** `gantt-produccion` (sin base de datos Render)
4. Configura `DATABASE_URL` (Neon) y `GANTT_APP_URL` como arriba
5. Abre la URL → login `admin` / `12345` (cámbiala en **Mi cuenta**)

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
| `GANTT_APP_URL` | `https://gantt-produccion.onrender.com` |
| `DATABASE_URL` | Connection string de **Neon** (PostgreSQL) |

---

## 3. Cómo funciona en producción

- El **build** compila el frontend (`frontend/dist`) e instala Python.
- El **backend** sirve la API en `/api/*` y el frontend React en `/`.
- El frontend llama a `/api` en el mismo dominio (sin CORS extra).
- Los datos de Gantt viven en **Neon PostgreSQL** (persistente, sin límite de 90 días de Render).

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
