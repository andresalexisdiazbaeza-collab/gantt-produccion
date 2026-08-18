import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import NewConfectionOrderModal from '../components/NewConfectionOrderModal'
import type { ConfectionItem, ConfectionTeam } from '../types'

export default function ConfeccionOrders() {
  const { t } = useI18n()
  const [items, setItems] = useState<ConfectionItem[]>([])
  const [teams, setTeams] = useState<ConfectionTeam[]>([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState<number | null>(null)
  const [showNewOrder, setShowNewOrder] = useState(false)

  const load = () =>
    Promise.all([api.getConfectionItems('activa'), api.getConfectionTeams(true)])
      .then(([i, tms]) => {
        setItems(i)
        setTeams(tms)
      })
      .catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const patch = async (id: number, data: Record<string, unknown>) => {
    setSaving(id)
    try {
      const updated = await api.updateConfectionItem(id, data)
      setItems((prev) => prev.map((x) => (x.id === id ? updated : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setSaving(null)
    }
  }

  const complete = async (id: number) => {
    if (!confirm(t('confirmComplete'))) return
    await api.completeConfectionItem(id)
    setItems((prev) => prev.filter((x) => x.id !== id))
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 space-y-4">
      {showNewOrder && (
        <NewConfectionOrderModal
          teams={teams}
          onClose={() => setShowNewOrder(false)}
          onCreated={(item) => setItems(prev => [item, ...prev])}
        />
      )}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('confOrdersTitle')}</h2>
        <button
          type="button"
          onClick={() => setShowNewOrder(true)}
          className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700"
        >
          {t('newOrderBtn')}
        </button>
      </div>
      {!items.length ? (
        <p className="text-slate-500">{t('confOrdersEmpty')}</p>
      ) : (
        <div className="overflow-auto bg-white border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-2">PO</th>
                <th className="p-2">{t('colCustomer')}</th>
                <th className="p-2">ID</th>
                <th className="p-2">{t('confColHours')}</th>
                <th className="p-2">{t('confColTeam')}</th>
                <th className="p-2">{t('confColWorkers')}</th>
                <th className="p-2">{t('colStart')}</th>
                <th className="p-2">{t('colFinish')}</th>
                <th className="p-2">%</th>
                <th className="p-2">{t('colDelivery')}</th>
                <th className="p-2">{t('colDeliveryStatus')}</th>
                <th className="p-2">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={`border-t ${item.is_late ? 'bg-red-50' : ''}`}>
                  <td className="p-2 font-medium">{item.po_number}</td>
                  <td className="p-2 max-w-[160px] truncate">{item.customer}</td>
                  <td className="p-2 max-w-[120px] truncate">{item.id_code}</td>
                  <td className="p-2">{item.total_hours ?? '—'}</td>
                  <td className="p-2">
                    <select
                      className="border rounded px-1 py-0.5"
                      value={item.team_id ?? ''}
                      disabled={saving === item.id}
                      onChange={(e) =>
                        patch(item.id, { team_id: e.target.value ? Number(e.target.value) : null })
                      }
                    >
                      <option value="">—</option>
                      {teams.map((tm) => (
                        <option key={tm.id} value={tm.id}>{tm.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={1}
                      className="w-16 border rounded px-1 py-0.5"
                      defaultValue={item.workers_assigned ?? ''}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (v && v !== item.workers_assigned) patch(item.id, { workers_assigned: v })
                      }}
                    />
                  </td>
                  <td className="p-2">
                    <input
                      type="date"
                      className="border rounded px-1 py-0.5"
                      defaultValue={item.start_date ?? ''}
                      onChange={(e) => patch(item.id, { start_date: e.target.value || null })}
                    />
                  </td>
                  <td className="p-2">{item.finish_date ?? '—'}</td>
                  <td className="p-2">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      className="w-16 border rounded px-1 py-0.5"
                      defaultValue={item.pct_done}
                      onBlur={(e) => {
                        const v = Number(e.target.value)
                        if (!Number.isNaN(v) && v !== item.pct_done) patch(item.id, { pct_done: v })
                      }}
                    />
                  </td>
                  <td className="p-2">{item.delivery_offered ?? '—'}</td>
                  <td className="p-2">
                    <span className={item.is_late ? 'text-red-600 font-semibold' : 'text-slate-600'}>
                      {item.delivery_status}
                    </span>
                  </td>
                  <td className="p-2">
                    <button
                      type="button"
                      className="text-teal-700 hover:underline"
                      onClick={() => complete(item.id)}
                    >
                      {t('btnComplete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
