import { useEffect, useMemo, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import ExportButtons from '../components/ExportButtons'
import { useI18n } from '../i18n/I18nProvider'
import type { ProductionItem } from '../types'

export default function CompletedOrders() {
  const { t } = useI18n()
  const { canView } = useAuth()
  const [items, setItems] = useState<ProductionItem[]>([])
  const [error, setError] = useState('')

  useEffect(() => {
    api.getItems('terminada').then(setItems).catch((e) => setError(e.message))
  }, [])

  const uniqueItems = useMemo(() => {
    const seen = new Map<string, ProductionItem>()
    for (const item of items) {
      const key = item.fingerprint || String(item.id)
      const prev = seen.get(key)
      if (!prev) {
        seen.set(key, item)
        continue
      }
      const prevAt = prev.completed_at ?? ''
      const curAt = item.completed_at ?? ''
      if (curAt > prevAt) seen.set(key, item)
    }
    return Array.from(seen.values())
  }, [items])

  const reactivate = async (id: number) => {
    const updated = await api.reactivateItem(id)
    setItems((prev) => prev.filter((x) => x.id !== updated.id))
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">{t('completedTitle')}</h2>
        <ExportButtons basePath="/export/orders?status=terminada" filenameBase="ordenes_terminadas" />
      </div>
      {!uniqueItems.length ? (
        <p className="text-slate-500">{t('completedEmpty')}</p>
      ) : (
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
                <th className="p-2">{t('colKgTotal')}</th>
                <th className="p-2">{t('colMachine')}</th>
                <th className="p-2">{t('colTotalM')}</th>
                <th className="p-2">{t('colStart')}</th>
                <th className="p-2">{t('colFinish')}</th>
                <th className="p-2">{t('colCompleted')}</th>
                {canView('completed') && <th className="p-2">{t('colActions')}</th>}
              </tr>
            </thead>
            <tbody>
              {uniqueItems.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="p-2 font-mono text-xs">{item.order_number}</td>
                  <td className="p-2">{item.customer}</td>
                  <td className="p-2">{item.raw_material}</td>
                  <td className="p-2">{item.titulo ?? t('noData')}</td>
                  <td className="p-2">{item.color}</td>
                  <td className="p-2">{item.matriz_mm?.toFixed(1) ?? t('noData')}</td>
                  <td className="p-2">{item.kg_totales?.toFixed(2) ?? t('noData')}</td>
                  <td className="p-2">{item.machine_name ?? t('noData')}</td>
                  <td className="p-2">{item.total_length?.toFixed(1)}</td>
                  <td className="p-2 text-xs">{item.start_date ?? t('noData')}</td>
                  <td className="p-2 text-xs">{item.finish_date ?? t('noData')}</td>
                  <td className="p-2 text-xs">{item.completed_at?.slice(0, 10) ?? t('noData')}</td>
                  {canView('completed') && (
                    <td className="p-2">
                      <button type="button" className="text-blue-600 hover:underline" onClick={() => reactivate(item.id)}>
                        {t('confReactivate')}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {items.length > uniqueItems.length && (
            <p className="p-3 text-xs text-slate-500">
              {t('itemsOf', { filtered: uniqueItems.length, total: items.length })}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
