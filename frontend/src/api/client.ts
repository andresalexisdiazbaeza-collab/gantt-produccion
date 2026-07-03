import type { AuthUser } from '../auth/types'
import type { DashboardStats, ImportResult, Machine, Material, OptimizePreview, PlanningImportResult, ProductionItem } from '../types'

const BASE = import.meta.env.VITE_API_URL ?? '/api'

let authToken: string | null = null

export function setAuthToken(token: string | null) {
  authToken = token
}

export function getAuthToken() {
  return authToken
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = {}
  if (authToken) headers.Authorization = `Bearer ${authToken}`
  if (extra) {
    if (extra instanceof Headers) {
      extra.forEach((v, k) => { headers[k] = v })
    } else if (Array.isArray(extra)) {
      for (const [k, v] of extra) headers[k] = v
    } else {
      Object.assign(headers, extra)
    }
  }
  return headers
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: authHeaders(options?.headers),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    const detail = err.detail
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : 'Error en la solicitud'
    throw new Error(message || 'Error en la solicitud')
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

export const api = {
  login: (username: string, password: string) =>
    request<{ access_token: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    }),

  me: () => request<AuthUser>('/auth/me'),

  updateProfile: (email: string) =>
    request<AuthUser>('/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  changePassword: (current_password: string, new_password: string) =>
    request<{ message: string }>('/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password, new_password }),
    }),

  forgotPassword: (email: string) =>
    request<{ message: string }>('/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }),

  resetPassword: (token: string, new_password: string) =>
    request<{ message: string }>('/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password }),
    }),

  listUsers: () => request<Array<{
    username: string
    role: string
    display_name: string
    email: string | null
    active: boolean
  }>>('/auth/users'),

  adminResetPassword: (username: string, new_password?: string) =>
    request<{ message: string }>('/auth/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, new_password: new_password || null }),
    }),

  getMaterials: () => request<Material[]>('/materials'),
  createMaterial: (data: { material: string; shrinking: number }) =>
    request<Material>('/materials', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateMaterial: (material: string, shrinking: number) =>
    request<Material>(`/materials/${encodeURIComponent(material)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shrinking }),
    }),
  deleteMaterial: (material: string) =>
    request<void>(`/materials/${encodeURIComponent(material)}`, { method: 'DELETE' }),

  getMachines: (activeOnly = false) =>
    request<Machine[]>(`/machines${activeOnly ? '?active_only=true' : ''}`),
  createMachine: (data: Omit<Machine, 'id'>) =>
    request<Machine>('/machines', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  updateMachine: (id: number, data: Partial<Machine>) =>
    request<Machine>(`/machines/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  deleteMachine: (id: number) =>
    request<void>(`/machines/${id}`, { method: 'DELETE' }),

  getItems: (status?: string) =>
    request<ProductionItem[]>(`/items${status ? `?status=${status}` : ''}`),
  updateItem: (id: number, data: {
    machine_id?: number | null
    start_date?: string | null
    comments?: string
    notes?: string | null
    meters_produced?: number
    pieces?: number
    piece_length?: number
  }) =>
    request<ProductionItem>(`/items/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),
  completeItem: (id: number) =>
    request<ProductionItem>(`/items/${id}/complete`, { method: 'POST' }),
  deleteAllItems: (status?: string) =>
    request<{ deleted_count: number }>(
      `/items/all${status ? `?status=${status}` : ''}`,
      { method: 'DELETE' },
    ),
  reactivateItem: (id: number) =>
    request<ProductionItem>(`/items/${id}/reactivate`, { method: 'POST' }),

  importFile: async (file: File): Promise<ImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/import/nuevo-formato`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    if (!res.ok) throw new Error('Error al importar archivo')
    return res.json()
  },

  importGanttPlanning: async (file: File): Promise<PlanningImportResult> => {
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(`${BASE}/import/gantt-planning`, {
      method: 'POST',
      headers: authHeaders(),
      body: form,
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }))
      throw new Error(err.detail || 'Error al importar planificación Gantt')
    }
    return res.json()
  },

  importGanttLocal: () =>
    request<PlanningImportResult>('/import/gantt-planning/local', { method: 'POST' }),

  getDashboard: () => request<DashboardStats>('/dashboard'),

  getOptimizePreview: () => request<OptimizePreview>('/optimize/preview'),
  applyOptimization: () =>
    request<{ applied_count: number }>('/optimize/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
}
