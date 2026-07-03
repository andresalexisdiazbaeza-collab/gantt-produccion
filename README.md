# Gantt Producción v0.2.0

App web para planificación de producción con diagrama de Gantt, importación desde Excel y cálculos automáticos.

## Inicio rápido

```bash
chmod +x start.sh
./start.sh
```

O manualmente:

```bash
# Terminal 1 — Backend (puerto 8002)
cd backend && pip install -r requirements.txt
python3 -m uvicorn app.main:app --reload --port 8002

# Terminal 2 — Frontend (puerto 5173)
cd frontend && npm install && npm run dev
```

Abrir **http://localhost:5173** (recarga forzada: `Cmd+Shift+R`)

API docs: **http://localhost:8002/docs**

---

## Desplegar en GitHub + Render

Ver **[DEPLOY.md](./DEPLOY.md)** para subir el repo a GitHub y publicar en Render (PostgreSQL + un solo servicio web).

---

## Flujo de trabajo

| Paso | Acción | ¿Obligatorio? |
|------|--------|---------------|
| 1 | **Importar → NuevoFormato.xlsx** | Sí — carga órdenes e ítems |
| 2a | **Órdenes activas** → asignar máquina y fecha inicio manualmente | Sí (si no usas paso 2b) |
| 2b | **Importar → Production Gantt** (opcional) | No — solo si ya tienes máquinas/fechas en Excel |
| 3 | **Gantt optimizada** (opcional) | No — alternativa automática al plan manual |

---

## Módulos

| Módulo | Ruta | Descripción |
|--------|------|-------------|
| Dashboard | `/` | KPIs, gráficos, descarga Excel |
| Gantt | `/gantt` | Timeline con **multifiltros**, descarga Excel |
| Gantt optimizada | `/optimizar` | Secuencia óptima (opcional), aceptar como plan |
| Órdenes activas | `/ordenes` | Asignar máquina/fecha, descarga Excel |
| Importar | `/importar` | NuevoFormato (principal) + Gantt (opcional) |
| Terminadas | `/terminadas` | Histórico, descarga Excel |
| Shrinking | `/materiales` | Factores por material |
| Máquinas | `/maquinas` | m/turno, turnos, **prep. cambio** (turnos setup) |

---

## Importación de archivos

### NuevoFormato.xlsx (obligatorio)
- Carga órdenes nuevas desde columnas A–S
- Ignora filas SUM
- No duplica ítems activos/terminados

### Production gantt2.xlsx (opcional)
- Completa **máquina** (col. V) y **fecha inicio** (col. W)
- Solo si ya tienes esos datos en Excel
- Si no, asigna manualmente en Órdenes activas

---

## Gantt — Filtros

En `/gantt` puedes filtrar por:
- Vista: todos / programados / sin programar / tardíos
- Máquina, cliente, material, título, color
- Número de orden
- Rango de fechas

---

## Descargas Excel

| Pantalla | Botón |
|----------|-------|
| Órdenes activas | ↓ Excel |
| Terminadas | ↓ Excel |
| Gantt | ↓ Descargar Gantt Excel |
| Dashboard | ↓ Descargar gráficos Excel |

API: `GET /api/export/orders`, `/api/export/gantt`, `/api/export/dashboard`

---

## Gantt optimizada (opcional)

1. Asigna **máquina** a cada orden
2. Ve a **Gantt optimizada** → *Generar optimización*
3. Revisa comparativa actual vs optimizado
4. *Aceptar como Gantt de trabajo* para aplicar fechas

Reglas configurables en **Máquinas** → prep. cambio (turnos al cambiar título/color).

---

## Fórmulas

```
total_length  = piece_length × pieces ÷ shrinking
working_days  = total_length ÷ mts_per_shift ÷ shifts
finish_date   = start_date + working_days (días hábiles Eslovaquia)
```

---

## Si no ves cambios

1. Detén procesos viejos: `lsof -ti:5173,8002 | xargs kill -9`
2. Ejecuta `./start.sh`
3. Abre http://localhost:5173 con **Cmd+Shift+R**
4. Verifica versión en menú lateral: debe decir **v0.2.0**
