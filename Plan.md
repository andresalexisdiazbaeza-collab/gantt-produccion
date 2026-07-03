# Plan — Gantt Producción v0.2.0

## Estado actual — Implementado

### Flujo de trabajo

```
[NuevoFormato.xlsx] ──obligatorio──► Órdenes activas
                                        │
                    ┌───────────────────┼───────────────────┐
                    ▼                   ▼                   ▼
         Production Gantt         Manual            Gantt optimizada
           (opcional)          máquina+fecha          (opcional)
                    │                   │                   │
                    └───────────────────┴───────────────────┘
                                        ▼
                              Gantt de trabajo
```

| Paso | Fuente | Obligatorio | Qué hace |
|------|--------|-------------|----------|
| 1 | NuevoFormato.xlsx | **Sí** | Carga órdenes e ítems (cols A–S) |
| 2a | Órdenes activas (UI) | Sí* | Asignar máquina y fecha inicio manualmente |
| 2b | Production gantt2.xlsx | No | Importa máquina (V) y fecha inicio (W) si ya existen en Excel |
| 3 | Gantt optimizada | No | Genera secuencia óptima; aceptar aplica fechas |

\* Obligatorio si no se usa Production Gantt.

---

## Módulos implementados

| # | Módulo | Ruta | Estado |
|---|--------|------|--------|
| 1 | Dashboard | `/` | KPIs + gráficos + export Excel |
| 2 | Gantt | `/gantt` | Timeline + **multifiltros** + export Excel |
| 3 | Gantt optimizada | `/optimizar` | Comparativa + aceptar plan (opcional) |
| 4 | Órdenes activas | `/ordenes` | Edición máquina/fecha + export Excel |
| 5 | Importar | `/importar` | NuevoFormato + Gantt opcional colapsable |
| 6 | Terminadas | `/terminadas` | Histórico + export Excel |
| 7 | Shrinking | `/materiales` | CRUD factores por material |
| 8 | Máquinas | `/maquinas` | m/turno, turnos, prep. cambio |

---

## Archivos Excel

### NuevoFormato-1282.xlsx — Entrada principal
Columnas A–S: material, título, cliente, orden, tipo, braiding, knot, model, matriz, measure, meshes, color, treatment, pieces, piece length, kg, delivered, delivery date, status.

### Production gantt2.xlsx — Planificación opcional
Mismas cols A–S + columnas de planificación:
- **V** Machine → máquina asignada
- **W** start date → fecha inicio
- **AB** Comentarios Sales

---

## Fórmulas (motor de cálculo)

```
shrinking      = lookup(material)           // módulo Materiales
total_length   = piece_length × pieces / shrinking
working_days   = total_length / mts_per_shift / shifts
finish_date    = WORKDAY(start_date, working_days)  // días hábiles SK
```

---

## Gantt optimizada — Reglas

- Agrupa por máquina, título, color, matriz mm
- Cambio de **título** o **color** = **N turnos** de preparación (configurable por máquina, default 3)
- Prioriza cumplir fechas de entrega
- Aceptar plan → actualiza fechas inicio en órdenes activas

---

## Gantt — Multifiltros

- Vista: todos / programados / sin programar / tardíos
- Máquina, cliente, material, título, color
- Búsqueda por número de orden
- Rango de fechas (desde / hasta)

---

## Exportación Excel

| Endpoint | Contenido |
|----------|-----------|
| `GET /api/export/orders?status=activa` | Órdenes activas |
| `GET /api/export/orders?status=terminada` | Terminadas |
| `GET /api/export/gantt` | Plan Gantt activo |
| `GET /api/export/dashboard` | KPIs + hojas por máquina/material/cliente |

---

## Stack técnico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + TypeScript + Vite + Tailwind |
| Gráficos | Recharts |
| Gantt UI | Componente custom + frappe-style bars |
| Backend | FastAPI + SQLAlchemy |
| BD | SQLite |
| Excel | openpyxl |

---

## Arranque

```bash
./start.sh
# o
cd backend && python3 -m uvicorn app.main:app --reload --port 8002
cd frontend && npm run dev
```

**http://localhost:5173** — versión visible en menú: **v0.2.0**

---

## Próximos pasos posibles

- [ ] Encadenamiento automático de fechas por máquina al asignar
- [ ] Export PDF del Gantt
- [ ] Autenticación de usuarios
- [ ] PostgreSQL para producción
