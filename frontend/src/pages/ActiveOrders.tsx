import { Link, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import GanttFiltersBar from '../components/GanttFilters'
import { applyGanttFilters, emptyGanttFilters, uniqueOptions, type GanttFilterState } from '../utils/ganttFilters'
import ExportButtons from '../components/ExportButtons'
import { useI18n } from '../i18n/I18nProvider'
import { formatDeliveryStatus } from '../utils/deliveryStatus'
import NewOrderModal from '../components/NewOrderModal'
import type { Machine, ProductionItem } from '../types'

export default function ActiveOrders() {
  const { t } = useI18n()
  const { canModifyItem, canView } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<ProductionItem[]>([])
  const [machines, setMachines] = useState<Machine[]>([])
  const [filters, setFilters] = useState<GanttFilterState>({ ...emptyGanttFilters(), viewMode: 'all' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [deletingAll, setDeletingAll] = useState(false)
  const [showNewOrder, setShowNewOrder] = useState(false)

  const load = useCallback(() => {
    Promise.all([api.getItems('activa'), api.getMachines(true)])
      .then(([i, m]) => { setItems(i); setMachines(m) })
      .catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const options = useMemo(() => uniqueOptions(items), [items])
  const filtered = useMemo(() => applyGanttFilters(items, filters), [items, filters])

  const update = async (id: number, data: {
    machine_id?: number | null
    start_date?: string | null
    notes?: string | null
    meters_produced?: number
    pieces?: number
    piece_length?: number
  }) => {
    setSaving(id)
    try {
      const updated = await api.updateItem(id, data)
      setItems((prev) => prev.map((i) => (i.id === id ? updated : i)))
      setError('')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setSaving(null)
    }
  }

  const updateNumeric = (id: number, field: 'pieces' | 'piece_length', raw: string, current: number | null | undefined) => {
    const perm = field === 'pieces' ? 'pieces' : 'piece_length'
    if (!canModifyItem(perm)) return
    const value = parseFloat(raw)
    if (!raw.trim() || Number.isNaN(value) || value <= 0) return
    if (current !== null && current !== undefined && Math.abs(current - value) < 0.0001) return
    void update(id, { [field]: value })
  }

  const updateNotes = (id: number, notes: string, current: string | null | undefined) => {
    const next = notes.trim() || null
    if ((current ?? null) === next) return
    void update(id, { notes: next })
  }

  const updateMetersProduced = (id: number, raw: string, current: number | null | undefined, totalLength: number | null | undefined) => {
    const value = parseFloat(raw)
    if (!raw.trim() || Number.isNaN(value) || value < 0) return
    if (totalLength !== null && totalLength !== undefined && value > totalLength) {
      setError(t('metersProducedExceedsTotal'))
      return
    }
    if (current !== null && current !== undefined && Math.abs(current - value) < 0.0001) return
    void update(id, { meters_produced: value })
  }

  const complete = async (id: number) => {
    if (!canModifyItem('complete') || !confirm(t('confirmComplete'))) return
    const updated = await api.completeItem(id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    void updated
  }

  const deleteAll = async () => {
    if (!canModifyItem('delete_all') || !confirm(t('confirmDeleteAll'))) return
    setDeletingAll(true)
    setError('')
    setSuccess('')
    try {
      const { deleted_count } = await api.deleteAllItems()
      setItems([])
      setSuccess(t('deleteAllSuccess', { count: deleted_count }))
      navigate('/importar')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setDeletingAll(false)
    }
  }

  if (error && items.length === 0 && !deletingAll) {
    return <div className="p-6 text-red-600">{error}</div>
  }

  return (
    <div className="p-6 space-y-4">
      {showNewOrder && (
        <NewOrderModal
          machines={machines}
          onClose={() => setShowNewOrder(false)}
          onCreated={(item) => setItems(prev => [item, ...prev])}
        />
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('activeOrdersTitle')}</h2>
        <div className="flex items-center gap-3">
          {canView('optimize') && (
            <Link to="/optimizar" className="text-sm text-amber-600 hover:underline">{t('optimizeLink')}</Link>
          )}
          {canModifyItem('machine') && (
            <button
              type="button"
              onClick={() => setShowNewOrder(true)}
              className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
            >
              {t('newOrderBtn')}
            </button>
          )}
          {canModifyItem('delete_all') && (
            <button
              type="button"
              onClick={deleteAll}
              disabled={deletingAll}
              className="text-sm bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              {deletingAll ? '...' : t('btnDeleteAll')}
            </button>
          )}
          <ExportButtons
            basePath="/export/orders?status=activa"
            filenameBase="ordenes_activas_gantt"
            onError={setError}
          />
          <span className="text-sm text-slate-500">{t('itemsOf', { filtered: filtered.length, total: items.length })}</span>
        </div>
      </div>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
      )}

      {success && (
        <div className="text-green-700 text-sm bg-green-50 border border-green-200 rounded-lg p-3">{success}</div>
      )}

      <GanttFiltersBar
        filters={filters}
        options={options}
        total={items.length}
        filtered={filtered.length}
        onChange={setFilters}
        onReset={() => setFilters({ ...emptyGanttFilters(), viewMode: 'all' })}
      />

      <div className="bg-white rounded-xl border overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left">
            <tr>
              <th className="p-2">{t('colOrder')}</th>
              <th className="p-2">{t('colCustomer')}</th>
              <th className="p-2">{t('colMaterial')}</th>
              <th className="p-2">{t('colTitulo')}</th>
              <th className="p-2">{t('colColor')}</th>
              <th className="p-2">{t('colMm')}</th>
              <th className="p-2">{t('colMeshes')}</th>
              <th className="p-2">{t('colPieces')}</th>
              <th className="p-2">{t('colPieceLength')}</th>
              <th className="p-2">{t('colKgTotal')}</th>
              <th className="p-2">{t('colShrinking')}</th>
              <th className="p-2">{t('colTotalM')}</th>
              <th className="p-2">{t('colMetersProduced')}</th>
              <th className="p-2">{t('colRemainingM')}</th>
              <th className="p-2">{t('colMachine')}</th>
              <th className="p-2">{t('colStart')}</th>
              <th className="p-2">{t('colFinish')}</th>
              <th className="p-2">{t('colDays')}</th>
              <th className="p-2">{t('colDelivery')}</th>
              <th className="p-2">{t('colDeliveryStatus')}</th>
              <th className="p-2">{t('colNotes')}</th>
              {canModifyItem('complete') && <th className="p-2"></th>}
            </tr>
          </thead>
          <tbody>
            {filtered.map((item) => (
              <tr key={item.id} className="border-t hover:bg-slate-50">
                <td className="p-2 font-mono text-xs">{item.order_number}</td>
                <td className="p-2">{item.customer}</td>
                <td className="p-2">{item.raw_material}</td>
                <td className="p-2">{item.titulo ?? t('noData')}</td>
                <td className="p-2">{item.color}</td>
                <td className="p-2">{item.matriz_mm?.toFixed(1) ?? t('noData')}</td>
                <td className="p-2">{item.meshes != null ? item.meshes : t('noData')}</td>
                <td className="p-2">
                  {canModifyItem('pieces') ? (
                    <input
                      key={`pieces-${item.id}-${item.pieces}`}
                      type="number"
                      min={0.01}
                      step={1}
                      className="border rounded px-2 py-1 text-xs w-20"
                      defaultValue={item.pieces ?? ''}
                      disabled={saving === item.id}
                      onBlur={(e) => updateNumeric(item.id, 'pieces', e.target.value, item.pieces)}
                    />
                  ) : (item.pieces ?? t('noData'))}
                </td>
                <td className="p-2">
                  {canModifyItem('piece_length') ? (
                    <input
                      key={`length-${item.id}-${item.piece_length}`}
                      type="number"
                      min={0.01}
                      step={0.01}
                      className="border rounded px-2 py-1 text-xs w-24"
                      defaultValue={item.piece_length ?? ''}
                      disabled={saving === item.id}
                      onBlur={(e) => updateNumeric(item.id, 'piece_length', e.target.value, item.piece_length)}
                    />
                  ) : (item.piece_length?.toFixed(2) ?? t('noData'))}
                </td>
                <td className="p-2">{item.kg_totales?.toFixed(2) ?? t('noData')}</td>
                <td className="p-2">{item.shrinking?.toFixed(2)}</td>
                <td className="p-2 font-medium bg-blue-50" title={`${item.piece_length ?? '?'} × ${item.pieces ?? '?'} ÷ ${item.shrinking ?? '?'}`}>
                  {item.total_length?.toFixed(1) ?? t('noData')}
                </td>
                <td className="p-2">
                  {canModifyItem('meters_produced') ? (
                  <input
                    key={`meters-${item.id}-${item.meters_produced ?? 0}`}
                    type="number"
                    min={0}
                    step={0.1}
                    className="border rounded px-2 py-1 text-xs w-24"
                    defaultValue={item.meters_produced ?? 0}
                    disabled={saving === item.id}
                    onBlur={(e) => updateMetersProduced(item.id, e.target.value, item.meters_produced, item.total_length)}
                  />
                  ) : (item.meters_produced ?? 0)}
                </td>
                <td className="p-2 font-medium bg-amber-50 text-xs" title={t('colRemainingM')}>
                  {item.remaining_length?.toFixed(1) ?? item.total_length?.toFixed(1) ?? t('noData')}
                </td>
                <td className="p-2">
                  {canModifyItem('machine') ? (
                    <select
                      className="border rounded px-2 py-1 text-xs"
                      value={item.machine_id ?? ''}
                      disabled={saving === item.id}
                      onChange={(e) => update(item.id, { machine_id: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">{t('noData')}</option>
                      {machines.map((m) => (
                        <option key={m.id} value={m.id}>{m.name} ({m.mts_per_shift}m)</option>
                      ))}
                    </select>
                  ) : (item.machine_name ?? t('noData'))}
                </td>
                <td className="p-2">
                  {canModifyItem('start_date') ? (
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-xs"
                      value={item.start_date ?? ''}
                      disabled={saving === item.id}
                      onChange={(e) => update(item.id, { start_date: e.target.value || null })}
                    />
                  ) : (item.start_date ?? t('noData'))}
                </td>
                <td className="p-2 text-xs">{item.finish_date ?? t('noData')}</td>
                <td className="p-2 text-xs" title={t('colRemainingM')}>{item.working_days?.toFixed(2) ?? t('noData')}</td>
                <td className="p-2 text-xs">{item.delivery_date ?? t('noData')}</td>
                <td className="p-2 text-xs whitespace-nowrap">
                  {(() => {
                    const status = formatDeliveryStatus(item, t)
                    return (
                      <span className={status.className} title={status.title}>
                        {status.label}
                      </span>
                    )
                  })()}
                </td>
                <td className="p-2 min-w-40">
                  {canModifyItem('notes') ? (
                  <input
                    key={`notes-${item.id}-${item.notes ?? ''}`}
                    type="text"
                    className="border rounded px-2 py-1 text-xs w-full min-w-32"
                    defaultValue={item.notes ?? ''}
                    placeholder={t('colNotes')}
                    disabled={saving === item.id}
                    onBlur={(e) => updateNotes(item.id, e.target.value, item.notes)}
                  />
                  ) : (item.notes ?? t('noData'))}
                </td>
                {canModifyItem('complete') && (
                  <td className="p-2">
                    <button
                      onClick={() => complete(item.id)}
                      className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                    >
                      {t('btnComplete')}
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('activeOrdersEmpty')}</p>
        ) : filtered.length === 0 ? (
          <p className="p-8 text-center text-slate-500">{t('activeOrdersNoFilter')}</p>
        ) : null}
      </div>
    </div>
  )
}
