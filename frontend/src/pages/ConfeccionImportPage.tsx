import { useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

export default function ConfeccionImportPage() {
  const { t } = useI18n()
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setLoading(true)
    setError('')
    setResult('')
    try {
      const res = await api.importConfection(file)
      setResult(
        t('confImportResult', {
          new: String(res.new_count),
          updated: String(res.updated_count),
          orders: String(res.orders_parsed),
          finished: String(res.finished_parsed),
        }),
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-4">
      <h2 className="text-2xl font-bold">{t('confImportTitle')}</h2>
      <p className="text-sm text-slate-600">{t('confImportHelp')}</p>
      <form onSubmit={onSubmit} className="bg-white border rounded-xl p-4 space-y-3">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <button
          type="submit"
          disabled={!file || loading}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white disabled:opacity-50"
        >
          {loading ? t('loading') : t('confImportBtn')}
        </button>
      </form>
      {error && <p className="text-red-600">{error}</p>}
      {result && <p className="text-green-700 whitespace-pre-wrap">{result}</p>}
    </div>
  )
}
