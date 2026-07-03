import type { ProductionItem } from '../types'

export interface GanttFilterState {
  machine: string
  customer: string
  material: string
  titulo: string
  color: string
  orderSearch: string
  dateFrom: string
  dateTo: string
  viewMode: 'all' | 'scheduled' | 'unscheduled' | 'late'
}

export const emptyGanttFilters = (): GanttFilterState => ({
  machine: '',
  customer: '',
  material: '',
  titulo: '',
  color: '',
  orderSearch: '',
  dateFrom: '',
  dateTo: '',
  viewMode: 'scheduled',
})

export function applyGanttFilters(items: ProductionItem[], f: GanttFilterState): ProductionItem[] {
  return items.filter((item) => {
    const scheduled = !!(item.start_date && item.finish_date && item.machine_name)
    const late = !!(item.delivery_date && item.finish_date && item.finish_date > item.delivery_date)

    if (f.viewMode === 'scheduled' && !scheduled) return false
    if (f.viewMode === 'unscheduled' && scheduled) return false
    if (f.viewMode === 'late' && !late) return false

    if (f.machine && item.machine_name !== f.machine) return false
    if (f.customer && !(item.customer || '').toLowerCase().includes(f.customer.toLowerCase())) return false
    if (f.material && item.raw_material !== f.material) return false
    if (f.titulo && !(item.titulo || '').toLowerCase().includes(f.titulo.toLowerCase())) return false
    if (f.color && !(item.color || '').toLowerCase().includes(f.color.toLowerCase())) return false
    if (f.orderSearch && !item.order_number.includes(f.orderSearch)) return false

    if (f.dateFrom && item.start_date && item.start_date < f.dateFrom) return false
    if (f.dateTo && item.finish_date && item.finish_date > f.dateTo) return false

    return true
  })
}

export function uniqueOptions(items: ProductionItem[]) {
  const uniq = (vals: (string | null | undefined)[]) =>
    [...new Set(vals.filter(Boolean) as string[])].sort()
  return {
    machines: uniq(items.map((i) => i.machine_name)),
    customers: uniq(items.map((i) => i.customer)),
    materials: uniq(items.map((i) => i.raw_material)),
    titulos: uniq(items.map((i) => i.titulo)),
    colors: uniq(items.map((i) => i.color)),
  }
}
