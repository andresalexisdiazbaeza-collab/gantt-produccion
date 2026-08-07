import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionOptimizePreview } from '../types'

export default function ConfeccionOptimizePage() {
  const { t } = useI18n()
  const [preview, setPreview] = useState<ConfectionOptimizePreview | null>(null)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = () =>
    api.getConfectionOptimizePreview().then(setPreview).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const apply = async () => {
    setMsg('')
    try {
      const res = await api.applyConfectionOptimization()
      setMsg(t('confOptimizeApplied', { count: String(res.applied_count) }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!preview) return <div className="p-6 text-slate-500">{t('loading')}</div>

  const cur = preview.current.metrics
  const opt = preview.optimized.metrics

  return (
    <div className="p-6 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t('confOptimizeTitle')}</h2>
        <button type="button" onClick={apply} className="px-4 py-2 rounded-lg bg-amber-500 text-white font-medium">
          {t('confOptimizeApply')}
        </button>
      </div>
      {msg && <p className="text-green-700">{msg}</p>}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-2">{t('confOptimizeCurrent')}</h3>
          <ul className="text-sm space-y-1">
            <li>{t('confOptimizeScheduled')}: {cur.scheduled}</li>
            <li>{t('deliveryOnTime')}: {cur.on_time}</li>
            <li>{t('deliveryLate')}: {cur.late}</li>
            <li>{t('confUnassigned')}: {cur.unassigned}</li>
          </ul>
        </div>
        <div className="bg-white border rounded-xl p-4">
          <h3 className="font-semibold mb-2">{t('confOptimizeOptimized')}</h3>
          <ul className="text-sm space-y-1">
            <li>{t('confOptimizeScheduled')}: {opt.scheduled}</li>
            <li>{t('deliveryOnTime')}: {opt.on_time}</li>
            <li>{t('deliveryLate')}: {opt.late}</li>
            <li>{t('confUnassigned')}: {opt.unassigned}</li>
          </ul>
        </div>
      </div>
      <div className="bg-white border rounded-xl p-4">
        <h3 className="font-semibold mb-2">{t('confColTeam')}</h3>
        <ul className="text-sm space-y-1">
          {preview.capacity.map((c) => (
            <li key={c.team_id}>
              {c.team_name}: {c.workers} {t('confColWorkers').toLowerCase()} · {c.daily_hours} h/día
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
