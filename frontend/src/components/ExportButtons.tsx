import { useState } from 'react'
import { downloadFromApi } from '../utils/export'
import { useI18n } from '../i18n/I18nProvider'

type ExportFormat = 'xlsx' | 'pdf'

interface ExportButtonsProps {
  basePath: string
  filenameBase: string
  className?: string
}

export default function ExportButtons({ basePath, filenameBase, className = '' }: ExportButtonsProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState<ExportFormat | null>(null)

  const download = async (format: ExportFormat) => {
    setLoading(format)
    try {
      const ext = format === 'xlsx' ? 'xlsx' : 'pdf'
      await downloadFromApi(`${basePath}?format=${format}`, `${filenameBase}.${ext}`)
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
}

export function CompleteExportButtons({ className = '' }: CompleteExportProps) {
  const { t } = useI18n()
  const [loading, setLoading] = useState<'xlsx' | 'pdf' | 'zip' | null>(null)

  const download = async (format: 'xlsx' | 'pdf' | 'zip') => {
    setLoading(format)
    try {
      const ext = format
      await downloadFromApi(`/export/complete?format=${format}`, `gantt_produccion_completo.${ext}`)
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
