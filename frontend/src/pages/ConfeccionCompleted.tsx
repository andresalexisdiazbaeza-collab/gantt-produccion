import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionItem } from '../types'

export default function ConfeccionCompleted() {
  const { t } = useI18n()
  const [items, setItems] = useState<ConfectionItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getConfectionItems('terminada').then(setItems).catch((e) => setError(e.message))
  }, [])

  const reactivate = async (id: number) => {
    const updated = await api.reactivateConfectionItem(id)
    setItems((prev) => prev.filter((x) => x.id !== updated.id))
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 space-y-4">
      <h2 className="text-2xl font-bold">{t('confCompletedTitle')}</h2>
      {!items.length ? (
        <p className="text-slate-500">{t('confCompletedEmpty')}</p>
      ) : (
        <div className="overflow-auto bg-white border rounded-xl">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-2">PO</th>
                <th className="p-2">{t('colCustomer')}</th>
                <th className="p-2">ID</th>
                <th className="p-2">{t('confColHours')}</th>
                <th className="p-2">{t('colCompleted')}</th>
                <th className="p-2">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {items.slice(0, 200).map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2">{item.po_number}</td>
                  <td className="p-2">{item.customer}</td>
                  <td className="p-2">{item.id_code}</td>
                  <td className="p-2">{item.real_hours ?? item.total_hours ?? '—'}</td>
                  <td className="p-2">{item.completed_at?.slice(0, 10) ?? '—'}</td>
                  <td className="p-2">
                    <button type="button" className="text-blue-600 hover:underline" onClick={() => reactivate(item.id)}>
                      {t('confReactivate')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > 200 && (
            <p className="p-3 text-xs text-slate-500">{t('itemsOf', { filtered: 200, total: items.length })}</p>
          )}
        </div>
      )}
    </div>
  )
}
