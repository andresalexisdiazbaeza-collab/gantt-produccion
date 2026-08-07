import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionItem } from '../types'

function daysBetween(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime()
  return Math.max(1, Math.round(ms / 86400000))
}

export default function ConfeccionGanttPage() {
  const { t } = useI18n()
  const [items, setItems] = useState<ConfectionItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getConfectionItems('activa').then(setItems).catch((e) => setError(e.message))
  }, [])

  const scheduled = useMemo(
    () => items.filter((i) => i.start_date && i.finish_date),
    [items],
  )

  const range = useMemo(() => {
    if (!scheduled.length) return null
    const starts = scheduled.map((i) => i.start_date!)
    const ends = scheduled.map((i) => i.finish_date!)
    const min = starts.reduce((a, b) => (a < b ? a : b))
    const max = ends.reduce((a, b) => (a > b ? a : b))
    return { min, max, span: daysBetween(min, max) }
  }, [scheduled])

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!items.length && !error) return <div className="p-6 text-slate-500">{t('loading')}</div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">{t('confGanttTitle')}</h2>
      {!scheduled.length ? (
        <p className="text-slate-500">{t('confGanttEmpty')}</p>
      ) : (
        <div className="bg-white border rounded-xl overflow-auto">
          <div className="min-w-[900px] p-4 space-y-2">
            {scheduled.map((item) => {
              const left = range ? (daysBetween(range.min, item.start_date!) / range.span) * 100 : 0
              const width = range
                ? Math.max(2, (daysBetween(item.start_date!, item.finish_date!) / range.span) * 100)
                : 10
              const late = item.is_late || item.delivery_status === 'late'
              return (
                <div key={item.id} className="grid grid-cols-[220px_1fr] gap-3 items-center">
                  <div className="text-xs truncate">
                    <div className="font-semibold">{item.po_number}</div>
                    <div className="text-slate-500 truncate">{item.customer}</div>
                    <div className="text-slate-400">{item.team_name || t('confUnassigned')}</div>
                  </div>
                  <div className="relative h-8 bg-slate-100 rounded">
                    <div
                      className={`absolute top-1 bottom-1 rounded ${late ? 'bg-red-500' : 'bg-teal-500'}`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                      title={`${item.start_date} → ${item.finish_date} · ${item.pct_done}%`}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
