import { useEffect, useMemo, useState } from 'react'
import { addDays, differenceInDays, parseISO, startOfDay } from 'date-fns'
import { api } from '../api/client'
import GanttFiltersBar from '../components/GanttFilters'
import GanttThemeToggle from '../components/GanttThemeToggle'
import GanttTimeline, { type GanttTimelineItem } from '../components/GanttTimeline'
import { emptyGanttFilters } from '../utils/ganttFilters'
import { downloadFromApi } from '../utils/export'
import { applyGanttFilters, uniqueOptions } from '../utils/ganttFilters'
import { useGanttTheme } from '../hooks/useGanttTheme'
import { useI18n } from '../i18n/I18nProvider'
import { GANTT_THEMES } from '../utils/ganttTheme'
import type { ProductionItem } from '../types'

export default function GanttPage() {
  const { t } = useI18n()
  const { theme, setTheme } = useGanttTheme()
  const th = GANTT_THEMES[theme]
  const [items, setItems] = useState<ProductionItem[]>([])
  const [filters, setFilters] = useState(emptyGanttFilters())
  const [error, setError] = useState('')
  const [downloading, setDownloading] = useState(false)

  useEffect(() => {
    api.getItems('activa').then(setItems).catch((e) => setError(e.message))
  }, [])

  const options = useMemo(() => uniqueOptions(items), [items])
  const filtered = useMemo(() => applyGanttFilters(items, filters), [items, filters])
  const scheduled = filtered.filter((i) => i.start_date && i.finish_date && i.machine_name)

  const { machines, minDate, days } = useMemo(() => {
    const chartItems = scheduled.length > 0 ? scheduled : filtered.filter((i) => i.machine_name && i.start_date && i.finish_date)
    if (chartItems.length === 0) {
      const today = startOfDay(new Date())
      return { machines: [] as { machine_name: string; items: GanttTimelineItem[] }[], minDate: today, days: 31 }
    }
    const machineSet = [...new Set(chartItems.map((i) => i.machine_name!))].sort()
    const starts = chartItems.map((i) => parseISO(i.start_date!))
    const ends = chartItems.map((i) => parseISO(i.finish_date!))
    const min = startOfDay(new Date(Math.min(...starts.map((d) => d.getTime()))))
    const max = startOfDay(new Date(Math.max(...ends.map((d) => d.getTime()))))
    const minD = addDays(min, -3)
    const maxD = addDays(max, 3)
    const machineRows = machineSet.map((name) => ({
      machine_name: name,
      items: scheduled
        .filter((i) => i.machine_name === name)
        .map((item): GanttTimelineItem => ({
          id: item.id,
          order_number: item.order_number,
          customer: item.customer,
          titulo: item.titulo,
          color: item.color,
          matriz_mm: item.matriz_mm,
          start_date: item.start_date!,
          finish_date: item.finish_date!,
          is_late: Boolean(item.delivery_date && item.finish_date! > item.delivery_date),
        })),
    }))
    return { machines: machineRows, minDate: minD, days: differenceInDays(maxD, minD) + 1 }
  }, [scheduled, filtered])

  const download = async () => {
    setDownloading(true)
    try {
      await downloadFromApi('/export/gantt', 'gantt.xlsx')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setDownloading(false)
    }
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">{t('ganttTitle')}</h2>
          <p className="text-sm text-slate-500 mt-1">{t('ganttSubtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <GanttThemeToggle theme={theme} onChange={setTheme} />
          <button
            onClick={download}
            disabled={downloading}
            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
          >
            {downloading ? t('downloading') : t('ganttDownload')}
          </button>
        </div>
      </div>

      <GanttFiltersBar
        filters={filters}
        options={options}
        total={items.length}
        filtered={filtered.length}
        onChange={setFilters}
        onReset={() => setFilters(emptyGanttFilters())}
      />

      {scheduled.length === 0 ? (
        <div className="bg-white rounded-xl border p-8 text-center text-slate-500">
          {filtered.length === 0 ? t('ganttNoFilter') : t('ganttNoSchedule')}
        </div>
      ) : (
        <GanttTimeline theme={theme} machines={machines} minDate={minDate} days={days} />
      )}

      <div className={`flex flex-wrap gap-4 text-xs ${th.legend}`}>
        <span className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${theme === 'day' ? 'bg-blue-500' : 'bg-cyan-400'}`} />
          {t('ganttOnTime')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${theme === 'day' ? 'bg-red-500' : 'bg-rose-400'}`} />
          {t('ganttLate')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${theme === 'day' ? 'bg-sky-400' : 'bg-cyan-400/80'}`} />
          {t('ganttToday')}
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`w-3.5 h-3.5 rounded ${theme === 'day' ? 'bg-amber-50 border border-amber-200' : 'bg-indigo-950 border border-indigo-800'}`} />
          {t('ganttWeekend')}
        </span>
      </div>
    </div>
  )
}
