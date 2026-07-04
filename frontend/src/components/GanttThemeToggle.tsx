import { useI18n } from '../i18n/I18nProvider'
import type { GanttTheme } from '../utils/ganttTheme'

interface Props {
  theme: GanttTheme
  onChange: (theme: GanttTheme) => void
}

export default function GanttThemeToggle({ theme, onChange }: Props) {
  const { t } = useI18n()

  return (
    <div
      className="inline-flex rounded-lg border border-slate-200 dark-theme:border-slate-600 overflow-hidden text-xs shadow-sm"
      role="group"
      aria-label={t('ganttViewMode')}
    >
      <button
        type="button"
        onClick={() => onChange('day')}
        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors ${
          theme === 'day'
            ? 'bg-amber-100 text-amber-900 font-semibold'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span aria-hidden>☀</span>
        {t('ganttDayMode')}
      </button>
      <button
        type="button"
        onClick={() => onChange('night')}
        className={`px-3 py-1.5 flex items-center gap-1.5 transition-colors border-l border-slate-200 ${
          theme === 'night'
            ? 'bg-slate-800 text-slate-100 font-semibold'
            : 'bg-white text-slate-600 hover:bg-slate-50'
        }`}
      >
        <span aria-hidden>☾</span>
        {t('ganttNightMode')}
      </button>
    </div>
  )
}
