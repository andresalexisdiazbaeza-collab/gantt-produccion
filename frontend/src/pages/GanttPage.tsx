import { useEffect, useMemo, useState } from 'react'
import { addDays, differenceInDays, format, parseISO, startOfDay } from 'date-fns'
import { api } from '../api/client'
import GanttFiltersBar from '../components/GanttFilters'
import { emptyGanttFilters } from '../utils/ganttFilters'
import { downloadFromApi } from '../utils/export'
import GanttBar from '../components/GanttBar'
import { applyGanttFilters, uniqueOptions } from '../utils/ganttFilters'
import { useI18n } from '../i18n/I18nProvider'
import type { ProductionItem } from '../types'

const DAY_WIDTH = 28

export default function GanttPage() {
  const { t } = useI18n()
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
      return { machines: [], minDate: today, days: 31 }
    }
    const machineSet = [...new Set(chartItems.map((i) => i.machine_name!))].sort()
    const starts = chartItems.map((i) => parseISO(i.start_date!))
    const ends = chartItems.map((i) => parseISO(i.finish_date!))
    const min = startOfDay(new Date(Math.min(...starts.map((d) => d.getTime()))))
    const max = startOfDay(new Date(Math.max(...ends.map((d) => d.getTime()))))
    const minD = addDays(min, -3)
    const maxD = addDays(max, 3)
    return { machines: machineSet, minDate: minD, days: differenceInDays(maxD, minD) + 1 }
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
        <button
          onClick={download}
          disabled={downloading}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {downloading ? t('downloading') : t('ganttDownload')}
        </button>
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
        <div className="bg-white rounded-xl border overflow-auto">
          <div style={{ minWidth: 200 + days * DAY_WIDTH }}>
            <div className="flex border-b bg-slate-50 sticky top-0 z-10">
              <div className="w-48 shrink-0 p-2 font-semibold text-sm border-r">{t('colMachine')}</div>
              <div className="flex">
                {Array.from({ length: days }).map((_, i) => {
                  const d = addDays(minDate, i)
                  const isWeekend = d.getDay() === 0 || d.getDay() === 6
                  return (
                    <div key={i} style={{ width: DAY_WIDTH }} className={`text-center text-[10px] py-1 border-r ${isWeekend ? 'bg-slate-100 text-slate-400' : ''}`}>
                      {format(d, 'dd/MM')}
                    </div>
                  )
                })}
              </div>
            </div>
            {machines.map((machine) => {
              const machineItems = scheduled.filter((i) => i.machine_name === machine)
              return (
                <div key={machine} className="flex border-b hover:bg-slate-50">
                  <div className="w-48 shrink-0 p-2 text-sm font-medium border-r">{t('machineShort', { name: machine })}</div>
                  <div className="relative flex-1" style={{ height: machineItems.length * 36 + 8 }}>
                    {machineItems.map((item, idx) => {
                      const start = parseISO(item.start_date!)
                      const end = parseISO(item.finish_date!)
                      const left = differenceInDays(start, minDate) * DAY_WIDTH
                      const width = Math.max((differenceInDays(end, start) + 1) * DAY_WIDTH, DAY_WIDTH)
                      const late = item.delivery_date && item.finish_date! > item.delivery_date
                      return (
                        <GanttBar
                          key={item.id}
                          item={item}
                          className={`absolute h-7 rounded px-1 text-[10px] text-white truncate flex items-center ${late ? 'bg-red-500' : 'bg-blue-500'}`}
                          style={{ left, width, top: idx * 36 + 4 }}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="flex gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded" /> {t('ganttOnTime')}</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded" /> {t('ganttLate')}</span>
      </div>
    </div>
  )
}
