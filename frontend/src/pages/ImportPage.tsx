import { useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ImportResult, PlanningImportResult } from '../types'

function ImportResultCard({ title, result }: { title: string; result: ImportResult }) {
  const { t } = useI18n()
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">{title}: {result.filename}</h3>
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-green-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{result.new_count}</p>
          <p className="text-xs text-green-600">{t('importNew')}</p>
        </div>
        <div className="bg-slate-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-slate-700">{result.skipped_count}</p>
          <p className="text-xs text-slate-600">{t('importSkipped')}</p>
        </div>
        <div className="bg-blue-50 rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{result.updated_count}</p>
          <p className="text-xs text-blue-600">{t('importUpdated')}</p>
        </div>
      </div>
      {result.details.length > 0 && (
        <ul className="text-xs text-slate-600 max-h-48 overflow-auto space-y-1 border-t pt-2">
          {result.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}

function PlanningResultCard({ result }: { result: PlanningImportResult }) {
  const { t } = useI18n()
  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <h3 className="font-semibold">{t('importPlanningTitle')}: {result.filename}</h3>
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: t('importFound'), value: result.matched_count, cls: 'bg-slate-50 text-slate-700' },
          { label: t('importUpdated'), value: result.updated_count, cls: 'bg-blue-50 text-blue-700' },
          { label: t('importNotFound'), value: result.not_found_count, cls: 'bg-amber-50 text-amber-700' },
          { label: t('importMachines'), value: result.machine_assigned, cls: 'bg-purple-50 text-purple-700' },
          { label: t('importStartDates'), value: result.dates_assigned, cls: 'bg-emerald-50 text-emerald-700' },
          { label: t('importComments'), value: result.comments_assigned, cls: 'bg-cyan-50 text-cyan-700' },
        ].map((k) => (
          <div key={k.label} className={`${k.cls.split(' ')[0]} rounded-lg p-3 text-center`}>
            <p className={`text-xl font-bold ${k.cls.split(' ')[1]}`}>{k.value}</p>
            <p className={`text-xs ${k.cls.split(' ')[1]}`}>{k.label}</p>
          </div>
        ))}
      </div>
      {result.details.length > 0 && (
        <ul className="text-xs text-slate-600 max-h-48 overflow-auto space-y-1 border-t pt-2">
          {result.details.map((d, i) => <li key={i}>{d}</li>)}
        </ul>
      )}
    </div>
  )
}

export default function ImportPage() {
  const { t } = useI18n()
  const [nuevoResult, setNuevoResult] = useState<ImportResult | null>(null)
  const [ganttResult, setGanttResult] = useState<PlanningImportResult | null>(null)
  const [loadingNuevo, setLoadingNuevo] = useState(false)
  const [loadingGantt, setLoadingGantt] = useState(false)
  const [showGantt, setShowGantt] = useState(false)
  const [error, setError] = useState('')

  const handleNuevo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingNuevo(true)
    setError('')
    setNuevoResult(null)
    try {
      setNuevoResult(await api.importFile(file))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('importError'))
    } finally {
      setLoadingNuevo(false)
      e.target.value = ''
    }
  }

  const handleGanttLocal = async () => {
    setLoadingGantt(true)
    setError('')
    setGanttResult(null)
    try {
      setGanttResult(await api.importGanttLocal())
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('importGanttError'))
    } finally {
      setLoadingGantt(false)
    }
  }

  const handleGantt = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setLoadingGantt(true)
    setError('')
    setGanttResult(null)
    try {
      setGanttResult(await api.importGanttPlanning(file))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('importGanttError'))
    } finally {
      setLoadingGantt(false)
      e.target.value = ''
    }
  }

  return (
    <div className="p-6 space-y-8 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">{t('importTitle')}</h2>
        <p className="text-sm text-slate-600 mt-2">{t('importWorkflow')}</p>
      </div>

      <section className="space-y-4 border-l-4 border-blue-500 pl-4">
        <div>
          <h3 className="font-semibold text-lg">{t('importNuevoSectionTitle')}</h3>
          <p className="text-slate-600 text-sm">{t('importNuevoSectionDesc')}</p>
        </div>
        <label className="block">
          <div className="border-2 border-dashed border-blue-300 rounded-xl p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
            <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleNuevo} disabled={loadingNuevo} />
            <p className="font-medium">{loadingNuevo ? t('importImporting') : t('importSelectNuevo')}</p>
          </div>
        </label>
        {nuevoResult && <ImportResultCard title={t('importResult')} result={nuevoResult} />}
      </section>

      <section className="space-y-4 border-l-4 border-slate-300 pl-4">
        <button
          type="button"
          onClick={() => setShowGantt(!showGantt)}
          className="flex items-center gap-2 text-left w-full"
        >
          <span className="text-slate-400">{showGantt ? '▼' : '▶'}</span>
          <div>
            <h3 className="font-semibold text-lg">{t('importGanttSectionTitle')}</h3>
            <p className="text-slate-500 text-sm">{t('importGanttSectionDesc')}</p>
          </div>
        </button>
        {showGantt && (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleGanttLocal}
                disabled={loadingGantt}
                className="bg-slate-600 text-white px-4 py-2 rounded-lg hover:bg-slate-700 disabled:opacity-50 text-sm"
              >
                {loadingGantt ? t('importImporting') : t('importGanttDesktop')}
              </button>
            </div>
            <label className="block">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50">
                <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleGantt} disabled={loadingGantt} />
                <p className="text-sm text-slate-600">{t('importGanttManual')}</p>
              </div>
            </label>
            {ganttResult && <PlanningResultCard result={ganttResult} />}
          </>
        )}
      </section>

      {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>}
    </div>
  )
}
