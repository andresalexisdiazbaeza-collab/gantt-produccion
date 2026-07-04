export type GanttTheme = 'day' | 'night'

export const GANTT_THEME_KEY = 'gantt-theme'

export function loadGanttTheme(): GanttTheme {
  const stored = localStorage.getItem(GANTT_THEME_KEY)
  return stored === 'night' ? 'night' : 'day'
}

export function saveGanttTheme(theme: GanttTheme) {
  localStorage.setItem(GANTT_THEME_KEY, theme)
}

export interface GanttThemeStyles {
  container: string
  header: string
  monthHeader: string
  machineCol: string
  machineColHeader: string
  row: string
  rowHover: string
  dayCell: string
  dayCellWeekend: string
  dayCellToday: string
  gridLine: string
  gridLineWeekend: string
  barOnTime: string
  barLate: string
  barOnTimeOpt: string
  setup: string
  legend: string
  todayLine: string
  tooltip: string
  tooltipLabel: string
}

export const GANTT_THEMES: Record<GanttTheme, GanttThemeStyles> = {
  day: {
    container: 'bg-white border-slate-200',
    header: 'bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200 text-slate-700',
    monthHeader: 'bg-slate-100/80 border-slate-200 text-slate-500 font-medium',
    machineCol: 'bg-slate-50 border-slate-200 text-slate-800',
    machineColHeader: 'bg-gradient-to-b from-slate-50 to-slate-100 border-slate-200 text-slate-700',
    row: 'border-slate-100',
    rowHover: 'hover:bg-blue-50/30',
    dayCell: 'border-slate-200/80 text-slate-600',
    dayCellWeekend: 'bg-amber-50/60 text-amber-700/70',
    dayCellToday: 'bg-sky-100 text-sky-800 font-semibold ring-1 ring-inset ring-sky-300',
    gridLine: 'border-slate-100',
    gridLineWeekend: 'bg-amber-50/40',
    barOnTime: 'bg-gradient-to-r from-blue-600 to-blue-500 shadow-md shadow-blue-500/25 ring-1 ring-blue-400/30',
    barLate: 'bg-gradient-to-r from-red-600 to-red-500 shadow-md shadow-red-500/25 ring-1 ring-red-400/30',
    barOnTimeOpt: 'bg-gradient-to-r from-emerald-600 to-emerald-500 shadow-md shadow-emerald-500/25 ring-1 ring-emerald-400/30',
    setup: 'border-amber-400 bg-amber-50/90 border-dashed',
    legend: 'text-slate-500',
    todayLine: 'bg-sky-500/70',
    tooltip: 'bg-slate-900 text-white border-slate-700 shadow-xl',
    tooltipLabel: 'text-slate-400',
  },
  night: {
    container: 'bg-slate-900 border-slate-700',
    header: 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-slate-200',
    monthHeader: 'bg-slate-800/90 border-slate-700 text-slate-400 font-medium',
    machineCol: 'bg-slate-800 border-slate-700 text-slate-100',
    machineColHeader: 'bg-gradient-to-b from-slate-800 to-slate-900 border-slate-700 text-slate-200',
    row: 'border-slate-800',
    rowHover: 'hover:bg-slate-800/60',
    dayCell: 'border-slate-700 text-slate-400',
    dayCellWeekend: 'bg-indigo-950/50 text-indigo-300/70',
    dayCellToday: 'bg-cyan-900/50 text-cyan-200 font-semibold ring-1 ring-inset ring-cyan-500/50',
    gridLine: 'border-slate-800',
    gridLineWeekend: 'bg-indigo-950/30',
    barOnTime: 'bg-gradient-to-r from-cyan-500 to-sky-400 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-300/40',
    barLate: 'bg-gradient-to-r from-rose-500 to-red-400 shadow-md shadow-rose-500/20 ring-1 ring-rose-300/40',
    barOnTimeOpt: 'bg-gradient-to-r from-teal-500 to-emerald-400 shadow-md shadow-teal-500/20 ring-1 ring-teal-300/40',
    setup: 'border-amber-500/60 bg-amber-950/40 border-dashed',
    legend: 'text-slate-400',
    todayLine: 'bg-cyan-400/80',
    tooltip: 'bg-slate-950 text-slate-100 border-slate-600 shadow-xl shadow-black/50',
    tooltipLabel: 'text-slate-500',
  },
}
