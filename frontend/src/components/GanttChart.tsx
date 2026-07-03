import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import GanttBar from './GanttBar'
import type { OptimizedSlot } from '../types'

const DAY_WIDTH = 26

interface GanttChartProps {
  machines: { machine_name: string; items: OptimizedSlot[] }[]
  title?: string
}

export default function GanttChart({ machines, title }: GanttChartProps) {
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

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      {title && <div className="px-4 py-2 border-b bg-slate-50 font-semibold text-sm">{title}</div>}
      <div className="overflow-auto">
        <div style={{ minWidth: 180 + days * DAY_WIDTH }}>
          <div className="flex border-b bg-slate-50 sticky top-0 z-10">
            <div className="w-40 shrink-0 p-2 font-semibold text-xs border-r">Máquina</div>
            <div className="flex">
              {Array.from({ length: days }).map((_, i) => {
                const d = addDays(minDate, i)
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                return (
                  <div
                    key={i}
                    style={{ width: DAY_WIDTH }}
                    className={`text-center text-[9px] py-1 border-r ${isWeekend ? 'bg-slate-100 text-slate-400' : ''}`}
                  >
                    {format(d, 'dd/MM')}
                  </div>
                )
              })}
            </div>
          </div>

          {machines.map((machine) => {
            const rowHeight = Math.max(machine.items.length * 32 + 8, 40)
            return (
              <div key={machine.machine_name} className="flex border-b">
                <div className="w-40 shrink-0 p-2 text-xs font-medium border-r flex items-center">
                  Máq. {machine.machine_name}
                </div>
                <div className="relative flex-1" style={{ height: rowHeight }}>
                  {machine.items.map((item, idx) => {
                    const start = parseISO(item.start_date)
                    const end = parseISO(item.finish_date)
                    const left = differenceInDays(start, minDate) * DAY_WIDTH
                    const width = Math.max((differenceInDays(end, start) + 1) * DAY_WIDTH, DAY_WIDTH)
                    return (
                      <div key={item.id}>
                        {item.setup_shifts > 0 && (
                          <div
                            className="absolute h-6 rounded border-2 border-dashed border-amber-400 bg-amber-50"
                            style={{ left: Math.max(0, left - DAY_WIDTH), width: DAY_WIDTH, top: idx * 32 + 4 }}
                            title={`Cambio título/color: ${item.setup_shifts} turnos`}
                          />
                        )}
                        <GanttBar
                          item={item}
                          className={`absolute h-6 rounded px-1 text-[9px] text-white truncate flex items-center ${
                            item.is_late ? 'bg-red-500' : 'bg-emerald-600'
                          }`}
                          style={{ left, width, top: idx * 32 + 4 }}
                        />
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
