import { useState } from 'react'
import { buildExportPath, downloadFromApi } from '../utils/export'
import { useI18n } from '../i18n/I18nProvider'

type ExportFormat = 'xlsx' | 'pdf'

interface ExportButtonsProps {
  basePath: string
  filenameBase: string
  className?: string
  onError?: (message: string) => void
}

export default function ExportButtons({ basePath, filenameBase, className = '', onError }: ExportButtonsProps) {
  const { t, lang } = useI18n()
  const [loading, setLoading] = useState<ExportFormat | null>(null)

  const download = async (format: ExportFormat) => {
    setLoading(format)
    try {
      const ext = format === 'xlsx' ? 'xlsx' : 'pdf'
      const path = buildExportPath(basePath, { format, lang })
      await downloadFromApi(path, `${filenameBase}.${ext}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('error')
      onError?.(message)
    } finally {
      setLoading(null)
    }
  }

  const btn = 'text-sm px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors'

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => void download('xlsx')}
        disabled={loading !== null}
        className={`${btn} bg-emerald-700 text-white hover:bg-emerald-800`}
      >
        {loading === 'xlsx' ? '...' : t('downloadExcel')}
      </button>
      <button
        type="button"
        onClick={() => void download('pdf')}
        disabled={loading !== null}
        className={`${btn} bg-red-700 text-white hover:bg-red-800`}
      >
        {loading === 'pdf' ? '...' : t('downloadPdf')}
      </button>
    </div>
  )
}

interface CompleteExportProps {
  className?: string
  onError?: (message: string) => void
}

export function CompleteExportButtons({ className = '', onError }: CompleteExportProps) {
  const { t, lang } = useI18n()
  const [loading, setLoading] = useState<'xlsx' | 'pdf' | 'zip' | null>(null)

  const download = async (format: 'xlsx' | 'pdf' | 'zip') => {
    setLoading(format)
    try {
      const path = buildExportPath('/export/complete', { format, lang })
      await downloadFromApi(path, `gantt_produccion_completo.${format}`)
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : t('error')
      onError?.(message)
    } finally {
      setLoading(null)
    }
  }

  const btn = 'w-full text-xs px-2 py-1.5 rounded-lg disabled:opacity-50 transition-colors'

  return (
    <div className={`space-y-1.5 ${className}`}>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{t('exportCompleteTitle')}</p>
      <button
        type="button"
        onClick={() => void download('zip')}
        disabled={loading !== null}
        className={`${btn} bg-blue-600 text-white hover:bg-blue-700`}
      >
        {loading === 'zip' ? '...' : t('downloadCompleteZip')}
      </button>
      <button
        type="button"
        onClick={() => void download('xlsx')}
        disabled={loading !== null}
        className={`${btn} bg-emerald-700 text-white hover:bg-emerald-800`}
      >
        {loading === 'xlsx' ? '...' : t('downloadCompleteExcel')}
      </button>
      <button
        type="button"
        onClick={() => void download('pdf')}
        disabled={loading !== null}
        className={`${btn} bg-red-700 text-white hover:bg-red-800`}
      >
        {loading === 'pdf' ? '...' : t('downloadCompletePdf')}
      </button>
    </div>
  )
}
