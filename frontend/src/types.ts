export interface OptimizedSlot {
  id: number
  order_number: string
  customer: string | null
  titulo: string | null
  color: string | null
  matriz_mm: number | null
  machine_id: number
  machine_name: string
  sequence: number
  start_date: string
  finish_date: string
  delivery_date: string | null
  working_days: number
  setup_shifts: number
  is_late: boolean
  days_late: number
}

export interface MachinePlan {
  machine_id: number
  machine_name: string
  anchor_date: string
  changeover_shifts: number
  total_changeovers: number
  total_setup_shifts: number
  items: OptimizedSlot[]
}

export interface OptimizeMetrics {
  scheduled_count: number
  on_time: number
  late: number
  no_delivery_date: number
  total_changeovers: number
  total_setup_shifts: number
}

export interface OptimizePreview {
  default_changeover_shifts: number
  global_anchor: string
  unassigned_count: number
  skipped_count: number
  warnings: string[]
  current: OptimizeMetrics
  optimized: OptimizeMetrics
  current_machines: MachinePlan[]
  optimized_machines: MachinePlan[]
  improvement: {
    changeovers_saved: number
    setup_shifts_saved: number
    late_reduced: number
  }
}

export interface PlanningImportResult {
  filename: string
  matched_count: number
  updated_count: number
  not_found_count: number
  machine_assigned: number
  dates_assigned: number
  comments_assigned: number
  details: string[]
}

export interface Material {
  material: string
  shrinking: number
  updated_at?: string
}

export interface Machine {
  id: number
  name: string
  mts_per_shift: number
  shifts_per_day: number
  changeover_shifts: number
  active: boolean
}

export interface ProductionItem {
  id: number
  fingerprint: string
  status: string
  raw_material: string | null
  titulo: string | null
  customer: string | null
  order_number: string
  order_type: string | null
  braiding: string | null
  knot: number | null
  model: string | null
  matriz_mm: number | null
  measure: string | null
  meshes: number | null
  color: string | null
  treatment: string | null
  pieces: number | null
  piece_length: number | null
  kg_totales: number | null
  delivered: number | null
  meters_produced: number | null
  remaining_length: number | null
  delivery_date: string | null
  source_status: string | null
  machine_id: number | null
  machine_name: string | null
  start_date: string | null
  comments: string | null
  notes: string | null
  shrinking: number | null
  total_length: number | null
  working_days: number | null
  mts_per_shift: number | null
  shifts: number | null
  finish_date: string | null
  delivery_status?: 'on_time' | 'late' | 'no_date' | 'pending' | string | null
  is_late?: boolean
  days_late?: number
  days_margin?: number
  created_at: string | null
  completed_at: string | null
}

export interface ImportResult {
  filename: string
  new_count: number
  skipped_count: number
  updated_count: number
  details: string[]
}

export interface DashboardStats {
  active_count: number
  completed_count: number
  machines_active: number
  total_planned_meters: number
  total_planned_kg: number
  total_produced_kg: number
  total_remaining_kg: number
  machine_load: { machine: string; working_days: number; kg: number }[]
  by_material: { material: string; count: number; kg: number }[]
  by_customer: { customer: string; count: number; kg: number }[]
  delivery_compliance: { on_time: number; late: number; no_date: number }
}

export interface ConfectionTeam {
  id: number
  name: string
  workers: number
  hours_daily: number
  extra_hours_day: number
  active: boolean
}

export interface ConfectionItem {
  id: number
  fingerprint: string
  status: string
  pcs_label: string | null
  quantity: number | null
  po_number: string
  purchase_order: string | null
  id_code: string | null
  customer: string | null
  tag_numbers: string | null
  circumference: string | null
  height: string | null
  cage_type: string | null
  mesh_mm: string | null
  twine_size: string | null
  color: string | null
  product_type: string | null
  received_date: string | null
  payment_terms: string | null
  requested_delivery_text: string | null
  delivery_offered: string | null
  netting_ready_date: string | null
  netting_status: string | null
  kg_cage: number | null
  netting_m2: number | null
  netting_kg: number | null
  total_hours: number | null
  coating_hours: number | null
  real_hours: number | null
  team_id: number | null
  team_name: string | null
  workers_assigned: number | null
  team_hours: number | null
  start_date: string | null
  finish_date: string | null
  working_days: number | null
  pct_done: number
  comments: string | null
  completed_at: string | null
  delivery_status?: string | null
  is_late?: boolean
  days_late?: number
  days_margin?: number
}

export interface ConfectionDashboardStats {
  active_count: number
  completed_count: number
  teams_active: number
  total_hours: number
  avg_pct_done: number
  team_load: { team: string; working_days: number; hours: number }[]
  by_type: { type: string; count: number; hours: number }[]
  by_customer: { customer: string; count: number; hours: number }[]
  delivery_compliance: { on_time: number; late: number; no_date: number }
}

export interface ConfectionOptimizePreview {
  anchor_date: string
  current: {
    slots: Array<Record<string, unknown>>
    metrics: { scheduled: number; on_time: number; late: number; unassigned: number }
  }
  optimized: {
    slots: Array<Record<string, unknown>>
    metrics: { scheduled: number; on_time: number; late: number; unassigned: number }
  }
  unassigned: Array<{ id: number; po_number: string; customer: string | null; id_code: string | null }>
  capacity: Array<{ team_id: number; team_name: string; daily_hours: number; workers: number }>
}

export interface ConfectionImportResult {
  new_count: number
  updated_count: number
  skipped_count: number
  orders_parsed: number
  finished_parsed: number
}
