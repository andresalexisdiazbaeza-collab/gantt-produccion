import { useCallback, useState } from 'react'
import { api } from '../api/client'
import GanttChart from '../components/GanttChart'
import GanttThemeToggle from '../components/GanttThemeToggle'
import { useGanttTheme } from '../hooks/useGanttTheme'
import { useI18n } from '../i18n/I18nProvider'
import type { OptimizePreview } from '../types'

function MetricCard({ label, current, optimized, invert, currentLabel, optimizedLabel }: {
  label: string
  current: number
  optimized: number
  invert?: boolean
  currentLabel: string
  optimizedLabel: string
}) {
  const better = invert ? optimized < current : optimized > current
  const same = optimized === current
  return (
    <div className="bg-white rounded-xl border p-4">
      <p className="text-xs text-slate-500 mb-2">{label}</p>
      <div className="flex items-end gap-3">
        <div>
          <p className="text-xs text-slate-400">{currentLabel}</p>
          <p className="text-xl font-bold">{current}</p>
        </div>
        <span className="text-slate-300 pb-1">→</span>
        <div>
          <p className="text-xs text-slate-400">{optimizedLabel}</p>
          <p className={`text-xl font-bold ${same ? '' : better ? 'text-emerald-600' : 'text-amber-600'}`}>
            {optimized}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function OptimizePage() {
  const { t } = useI18n()
  const { theme, setTheme } = useGanttTheme()
  const [preview, setPreview] = useState<OptimizePreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState('')
  const [view, setView] = useState<'optimized' | 'current' | 'both'>('both')
  const [applied, setApplied] = useState(false)

  const loadPreview = useCallback(async () => {
    setLoading(true)
    setError('')
    setApplied(false)
    try {
      const data = await api.getOptimizePreview()
      setPreview(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
      setPreview(null)
    } finally {
      setLoading(false)
    }
  }, [])

  const apply = async () => {
    if (!preview || !confirm(t('optimizeConfirmApply'))) return
    setApplying(true)
    setError('')
    try {
      await api.applyOptimization()
      setApplied(true)
      await loadPreview()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setApplying(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('optimizeTitle')}</h2>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            <span className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded mr-2">{t('optimizeOptional')}</span>
            {t('optimizeDesc')}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadPreview}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
          >
            {loading ? t('loading') : t('optimizeGenerate')}
          </button>
          {preview && (
            <button
              onClick={apply}
              disabled={applying || applied}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 text-sm"
            >
              {applying ? t('optimizeApplying') : applied ? '✓' : t('optimizeAccept')}
            </button>
          )}
        </div>
      </div>

      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}

      {!preview && !loading && (
        <div className="bg-white rounded-xl border p-10 text-center text-slate-500">
          Asigna máquinas a las órdenes activas y pulsa <strong>Generar optimización</strong>.
        </div>
      )}

      {preview && (
        <>
          {preview.warnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
              {preview.warnings.map((w, i) => <p key={i}>{w}</p>)}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard label={t('ganttOnTime')} current={preview.current.on_time} optimized={preview.optimized.on_time} currentLabel={t('optimizeCurrent')} optimizedLabel={t('optimizeOptimized')} />
            <MetricCard label={t('ganttLate')} current={preview.current.late} optimized={preview.optimized.late} invert currentLabel={t('optimizeCurrent')} optimizedLabel={t('optimizeOptimized')} />
            <MetricCard
              label={t('machinesChangeoverShifts')}
              current={preview.current.total_changeovers}
              optimized={preview.optimized.total_changeovers}
              invert
              currentLabel={t('optimizeCurrent')}
              optimizedLabel={t('optimizeOptimized')}
            />
            <MetricCard
              label={t('machinesChangeoverShifts')}
              current={preview.current.total_setup_shifts}
              optimized={preview.optimized.total_setup_shifts}
              invert
              currentLabel={t('optimizeCurrent')}
              optimizedLabel={t('optimizeOptimized')}
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <GanttThemeToggle theme={theme} onChange={setTheme} />
            {(['both', 'current', 'optimized'] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-1.5 rounded-lg text-sm ${
                  view === v ? 'bg-slate-900 text-white' : 'bg-white border text-slate-600'
                }`}
              >
                {v === 'both' ? t('filterAll') : v === 'current' ? t('optimizeCurrent') : t('optimizeOptimized')}
              </button>
            ))}
          </div>

          <div className={`grid gap-6 ${view === 'both' ? 'lg:grid-cols-2' : 'grid-cols-1'}`}>
            {(view === 'both' || view === 'current') && (
              <GanttChart machines={preview.current_machines} title={t('optimizeCurrent')} theme={theme} />
            )}
            {(view === 'both' || view === 'optimized') && (
              <GanttChart machines={preview.optimized_machines} title={t('optimizeOptimized')} theme={theme} />
            )}
          </div>

          <div className="bg-white rounded-xl border overflow-auto">
            <div className="px-4 py-3 border-b font-semibold text-sm">Secuencia optimizada por máquina</div>
            {preview.optimized_machines.map((machine) => (
              <div key={machine.machine_id} className="border-b last:border-b-0">
                <div className="px-4 py-2 bg-slate-50 text-sm font-medium">
                  Máquina {machine.machine_name} — {machine.total_changeovers} cambios ({machine.total_setup_shifts} turnos setup, {machine.changeover_shifts} turnos/cambio)
                </div>
                <table className="w-full text-xs">
                  <thead className="text-left text-slate-500">
                    <tr>
                      <th className="p-2 pl-4">#</th>
                      <th className="p-2">{t('colOrder')}</th>
                      <th className="p-2">{t('colCustomer')}</th>
                      <th className="p-2">{t('colTitulo')}</th>
                      <th className="p-2">{t('colColor')}</th>
                      <th className="p-2">{t('colMm')}</th>
                      <th className="p-2">{t('machinesChangeoverShifts')}</th>
                      <th className="p-2">{t('colStart')}</th>
                      <th className="p-2">{t('colFinish')}</th>
                      <th className="p-2">{t('colDelivery')}</th>
                      <th className="p-2">{t('colActions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {machine.items.map((item) => (
                      <tr key={item.id} className="border-t hover:bg-slate-50">
                        <td className="p-2 pl-4 font-mono">{item.sequence}</td>
                        <td className="p-2 font-mono">{item.order_number}</td>
                        <td className="p-2">{item.customer ?? t('noData')}</td>
                        <td className="p-2">{item.titulo}</td>
                        <td className="p-2">{item.color}</td>
                        <td className="p-2">{item.matriz_mm}</td>
                        <td className="p-2">
                          {item.setup_shifts > 0 ? (
                            <span className="text-amber-600 font-medium">{item.setup_shifts} turnos</span>
                          ) : '—'}
                        </td>
                        <td className="p-2">{item.start_date}</td>
                        <td className="p-2">{item.finish_date}</td>
                        <td className="p-2">{item.delivery_date ?? '—'}</td>
                        <td className="p-2">
                          {item.is_late ? (
                            <span className="text-red-600">+{item.days_late}d</span>
                          ) : (
                            <span className="text-emerald-600">OK</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
