import { addDays, differenceInDays, format, isSameDay, parseISO, startOfDay } from 'date-fns'
import GanttBar, { type GanttBarItem } from './GanttBar'
import { useI18n } from '../i18n/I18nProvider'
import { GANTT_THEMES, type GanttTheme } from '../utils/ganttTheme'

export const GANTT_DAY_WIDTH = 34
export const GANTT_ROW_HEIGHT = 40
export const GANTT_MACHINE_WIDTH = 160

export interface GanttTimelineItem extends GanttBarItem {
  id: number | string
  start_date: string
  finish_date: string
  is_late?: boolean
  setup_shifts?: number
}

interface MachineRow {
  machine_name: string
  items: GanttTimelineItem[]
}

interface Props {
  theme: GanttTheme
  machines: MachineRow[]
  minDate: Date
  days: number
  variant?: 'default' | 'optimized'
  title?: string
}

function buildMonthSpans(minDate: Date, days: number) {
  const spans: { label: string; width: number }[] = []
  let i = 0
  while (i < days) {
    const d = addDays(minDate, i)
    const monthKey = format(d, 'yyyy-MM')
    let count = 0
    while (i + count < days && format(addDays(minDate, i + count), 'yyyy-MM') === monthKey) {
      count += 1
    }
    spans.push({ label: format(d, 'MMMM yyyy'), width: count * GANTT_DAY_WIDTH })
    i += count
  }
  return spans
}

export default function GanttTimeline({ theme, machines, minDate, days, variant = 'default', title }: Props) {
  const { t } = useI18n()
  const th = GANTT_THEMES[theme]
  const today = startOfDay(new Date())
  const monthSpans = buildMonthSpans(minDate, days)
  const todayOffset = differenceInDays(today, minDate)
  const showToday = todayOffset >= 0 && todayOffset < days

  const barClass = (late: boolean) => {
    if (late) return th.barLate
    return variant === 'optimized' ? th.barOnTimeOpt : th.barOnTime
  }

  return (
    <div className={`rounded-xl border overflow-hidden shadow-sm ${th.container}`}>
      {title && (
        <div className={`px-4 py-2.5 border-b font-semibold text-sm ${th.header}`}>{title}</div>
      )}
      <div className="overflow-auto max-h-[70vh]">
        <div style={{ minWidth: GANTT_MACHINE_WIDTH + days * GANTT_DAY_WIDTH }}>
          {/* Month row */}
          <div className={`flex border-b sticky top-0 z-20 ${th.monthHeader}`}>
            <div
              className={`shrink-0 border-r ${th.machineColHeader}`}
              style={{ width: GANTT_MACHINE_WIDTH }}
            />
            <div className="flex">
              {monthSpans.map((span, i) => (
                <div
                  key={i}
                  style={{ width: span.width }}
                  className={`text-center text-[10px] py-1 border-r uppercase tracking-wide ${th.monthHeader}`}
                >
                  {span.label}
                </div>
              ))}
            </div>
          </div>

          {/* Day row */}
          <div className={`flex border-b sticky top-[25px] z-20 ${th.header}`}>
            <div
              className={`shrink-0 p-2 font-semibold text-xs border-r flex items-end ${th.machineColHeader}`}
              style={{ width: GANTT_MACHINE_WIDTH }}
            >
              {t('colMachine')}
            </div>
            <div className="flex relative">
              {Array.from({ length: days }).map((_, i) => {
                const d = addDays(minDate, i)
                const isWeekend = d.getDay() === 0 || d.getDay() === 6
                const isToday = isSameDay(d, today)
                return (
                  <div
                    key={i}
                    style={{ width: GANTT_DAY_WIDTH }}
                    className={`text-center text-[10px] py-1.5 border-r ${
                      isToday ? th.dayCellToday : isWeekend ? th.dayCellWeekend : th.dayCell
                    }`}
                  >
                    <div className="leading-none opacity-60 text-[8px]">{format(d, 'EEE')}</div>
                    <div>{format(d, 'dd/MM')}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Machine rows */}
          {machines.map((machine) => {
            const rowHeight = Math.max(machine.items.length * GANTT_ROW_HEIGHT + 10, 48)
            return (
              <div key={machine.machine_name} className={`flex border-b ${th.row} ${th.rowHover}`}>
                <div
                  className={`shrink-0 p-2 text-xs font-semibold border-r flex items-center ${th.machineCol}`}
                  style={{ width: GANTT_MACHINE_WIDTH }}
                >
                  {t('machineShort', { name: machine.machine_name })}
                </div>
                <div className="relative flex-1" style={{ height: rowHeight }}>
                  {/* Day grid */}
                  <div className="absolute inset-0 flex pointer-events-none">
                    {Array.from({ length: days }).map((_, i) => {
                      const d = addDays(minDate, i)
                      const isWeekend = d.getDay() === 0 || d.getDay() === 6
                      return (
                        <div
                          key={i}
                          style={{ width: GANTT_DAY_WIDTH }}
                          className={`h-full border-r ${isWeekend ? th.gridLineWeekend : th.gridLine}`}
                        />
                      )
                    })}
                  </div>

                  {/* Today marker */}
                  {showToday && (
                    <div
                      className={`absolute top-0 bottom-0 w-0.5 z-10 pointer-events-none ${th.todayLine}`}
                      style={{ left: todayOffset * GANTT_DAY_WIDTH + GANTT_DAY_WIDTH / 2 }}
                      title={t('ganttToday')}
                    />
                  )}

                  {/* Bars */}
                  {machine.items.map((item, idx) => {
                    const start = parseISO(item.start_date)
                    const end = parseISO(item.finish_date)
                    const left = differenceInDays(start, minDate) * GANTT_DAY_WIDTH
                    const width = Math.max(
                      (differenceInDays(end, start) + 1) * GANTT_DAY_WIDTH - 2,
                      GANTT_DAY_WIDTH - 2,
                    )
                    const late = item.is_late ?? false
                    const top = idx * GANTT_ROW_HEIGHT + 5

                    return (
                      <div key={item.id}>
                        {item.setup_shifts != null && item.setup_shifts > 0 && (
                          <div
                            className={`absolute h-7 rounded border-2 ${th.setup}`}
                            style={{
                              left: Math.max(0, left - GANTT_DAY_WIDTH),
                              width: GANTT_DAY_WIDTH,
                              top,
                            }}
                            title={t('ganttSetupTooltip', { shifts: item.setup_shifts })}
                          />
                        )}
                        <GanttBar
                          item={item}
                          theme={theme}
                          className={`absolute h-7 rounded-md px-1.5 text-[10px] text-white truncate flex items-center font-medium ${barClass(late)}`}
                          style={{ left: left + 1, width, top }}
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
