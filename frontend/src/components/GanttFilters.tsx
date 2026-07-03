import type { GanttFilterState } from '../utils/ganttFilters'
import { useI18n } from '../i18n/I18nProvider'

interface Props {
  filters: GanttFilterState
  options: {
    machines: string[]
    customers: string[]
    materials: string[]
    titulos: string[]
    colors: string[]
  }
  total: number
  filtered: number
  onChange: (f: GanttFilterState) => void
  onReset: () => void
}

export default function GanttFiltersBar({ filters, options, total, filtered, onChange, onReset }: Props) {
  const { t } = useI18n()
  const set = (patch: Partial<GanttFilterState>) => onChange({ ...filters, ...patch })

  return (
    <div className="bg-white rounded-xl border p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold text-sm">{t('filters')}</h3>
        <span className="text-xs text-slate-500">{t('itemsOf', { filtered, total })}</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2">
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.viewMode} onChange={(e) => set({ viewMode: e.target.value as GanttFilterState['viewMode'] })}>
          <option value="all">{t('filterAll')}</option>
          <option value="scheduled">{t('filterScheduled')}</option>
          <option value="unscheduled">{t('filterUnscheduled')}</option>
          <option value="late">{t('filterLate')}</option>
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.machine} onChange={(e) => set({ machine: e.target.value })}>
          <option value="">{t('filterAllMachines')}</option>
          {options.machines.map((m) => <option key={m} value={m}>{t('machineShort', { name: m })}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.customer} onChange={(e) => set({ customer: e.target.value })}>
          <option value="">{t('filterAllCustomers')}</option>
          {options.customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.material} onChange={(e) => set({ material: e.target.value })}>
          <option value="">{t('filterAllMaterials')}</option>
          {options.materials.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.titulo} onChange={(e) => set({ titulo: e.target.value })}>
          <option value="">{t('filterAllTitles')}</option>
          {options.titulos.map((tit) => <option key={tit} value={tit}>{tit}</option>)}
        </select>
        <select className="border rounded px-2 py-1.5 text-xs" value={filters.color} onChange={(e) => set({ color: e.target.value })}>
          <option value="">{t('filterAllColors')}</option>
          {options.colors.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="text"
          placeholder={t('filterSearchOrder')}
          className="border rounded px-2 py-1.5 text-xs"
          value={filters.orderSearch}
          onChange={(e) => set({ orderSearch: e.target.value })}
        />
        <input type="date" className="border rounded px-2 py-1.5 text-xs" value={filters.dateFrom} onChange={(e) => set({ dateFrom: e.target.value })} title={t('filterDateFrom')} />
        <input type="date" className="border rounded px-2 py-1.5 text-xs" value={filters.dateTo} onChange={(e) => set({ dateTo: e.target.value })} title={t('filterDateTo')} />
        <button type="button" onClick={onReset} className="text-xs border rounded px-2 py-1.5 hover:bg-slate-50">
          {t('filterClear')}
        </button>
      </div>
    </div>
  )
}
