import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { TitleMaterialEntry } from '../types'

type OptionRow = { id: number; category: string; value: string }

const CATEGORIES = ['order_type', 'braiding', 'model', 'meshes', 'knot'] as const

export default function OrderCatalogPage() {
  const { t } = useI18n()
  const [rows, setRows] = useState<TitleMaterialEntry[]>([])
  const [options, setOptions] = useState<OptionRow[]>([])
  const [titulo, setTitulo] = useState('')
  const [material, setMaterial] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('order_type')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [replaceImport, setReplaceImport] = useState(false)

  const load = async () => {
    const [catalog, list] = await Promise.all([api.getOrderCatalog(), api.getOrderCatalogOptions()])
    setRows(catalog.title_materials)
    setOptions(list)
  }

  useEffect(() => {
    load().catch((e: Error) => setError(e.message))
  }, [])

  const addRow = async () => {
    if (!titulo.trim() || !material.trim()) return
    await api.addTitleMaterialCatalogRow({ titulo: titulo.trim(), material: material.trim().toUpperCase() })
    setTitulo('')
    setMaterial('')
    await load()
  }

  const addOption = async () => {
    if (!value.trim()) return
    await api.addOrderCatalogOption({ category, value: value.trim() })
    setValue('')
    await load()
  }

  const importExcel = async (file: File) => {
    await api.importTitleMaterialCatalog(file, replaceImport)
    await load()
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{t('catalogAdminTitle')}</h2>
        <p className="text-sm text-slate-600">{t('catalogAdminSubtitle')}</p>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <section className="bg-white border rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h3 className="font-semibold">{t('catalogTitleMaterial')}</h3>
            <p className="text-sm text-slate-500">{t('catalogImportHint')}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="file"
              accept=".xlsx,.xlsm,.xls"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void importExcel(f).catch((err: Error) => setError(err.message))
                e.target.value = ''
              }}
            />
            <label className="text-sm flex items-center gap-2">
              <input type="checkbox" checked={replaceImport} onChange={(e) => setReplaceImport(e.target.checked)} />
              {t('catalogImportReplace')}
            </label>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <input
            className="border rounded px-3 py-2 flex-1 min-w-[220px]"
            placeholder={t('fieldTitulo')}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <input
            className="border rounded px-3 py-2 w-40"
            placeholder={t('fieldRawMaterial')}
            value={material}
            onChange={(e) => setMaterial(e.target.value)}
          />
          <button onClick={() => void addRow().catch((e: Error) => setError(e.message))} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            {t('btnAdd')}
          </button>
        </div>

        <div className="overflow-auto max-h-[420px] border rounded-lg">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="p-2 text-left">{t('fieldTitulo')}</th>
                <th className="p-2 text-left">{t('fieldRawMaterial')}</th>
                <th className="p-2 text-left">{t('colActions')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t">
                  <td className="p-2">{row.titulo}</td>
                  <td className="p-2 font-mono">{row.material}</td>
                  <td className="p-2">
                    <button
                      onClick={() => void api.deleteTitleMaterialCatalogRow(row.id).then(load).catch((e: Error) => setError(e.message))}
                      className="text-red-600 hover:underline"
                    >
                      {t('btnDelete')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="bg-white border rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold">{t('catalogDropdownsTitle')}</h3>
          <p className="text-sm text-slate-500">{t('catalogDropdownsSubtitle')}</p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <select className="border rounded px-3 py-2" value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <input
            className="border rounded px-3 py-2 flex-1 min-w-[220px]"
            placeholder={t('catalogOptionValue')}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <button onClick={() => void addOption().catch((e: Error) => setError(e.message))} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            {t('btnAdd')}
          </button>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
          {CATEGORIES.map((cat) => (
            <div key={cat} className="border rounded-lg">
              <div className="px-3 py-2 bg-slate-50 border-b font-medium">{cat}</div>
              <div className="divide-y">
                {options.filter((o) => o.category === cat).map((o) => (
                  <div key={o.id} className="px-3 py-2 flex items-center justify-between gap-3 text-sm">
                    <span>{o.value}</span>
                    <button
                      onClick={() => void api.deleteOrderCatalogOption(o.id).then(load).catch((e: Error) => setError(e.message))}
                      className="text-red-600 hover:underline"
                    >
                      {t('btnDelete')}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
