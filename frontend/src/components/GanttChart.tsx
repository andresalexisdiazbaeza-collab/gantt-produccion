import { addDays, differenceInDays, parseISO, startOfDay } from 'date-fns'
import GanttTimeline, { type GanttTimelineItem } from './GanttTimeline'
import type { OptimizedSlot } from '../types'
import type { GanttTheme } from '../utils/ganttTheme'

interface GanttChartProps {
  machines: { machine_name: string; items: OptimizedSlot[] }[]
  title?: string
  theme?: GanttTheme
}

export default function GanttChart({ machines, title, theme = 'day' }: GanttChartProps) {
  const allItems = machines.flatMap((m) => m.items)
  if (allItems.length === 0) {
    return (
      <div className="bg-white rounded-xl border p-6 text-center text-slate-500 text-sm">
        Sin ítems programados
      </div>
    )
  }

  const starts = allItems.map((i) => parseISO(i.start_date))
  const ends = allItems.map((i) => parseISO(i.finish_date))
  const minDate = startOfDay(addDays(new Date(Math.min(...starts.map((d) => d.getTime()))), -2))
  const maxDate = startOfDay(addDays(new Date(Math.max(...ends.map((d) => d.getTime()))), 2))
  const days = differenceInDays(maxDate, minDate) + 1

  const rows = machines.map((machine) => ({
    machine_name: machine.machine_name,
    items: machine.items.map((item): GanttTimelineItem => ({
      id: item.id,
      order_number: item.order_number,
      customer: item.customer,
      titulo: item.titulo,
      color: item.color,
      matriz_mm: item.matriz_mm,
      start_date: item.start_date,
      finish_date: item.finish_date,
      sequence: item.sequence,
      is_late: item.is_late,
      setup_shifts: item.setup_shifts,
    })),
  }))

  return (
    <GanttTimeline
      theme={theme}
      machines={rows}
      minDate={minDate}
      days={days}
      variant="optimized"
      title={title}
    />
  )
}
