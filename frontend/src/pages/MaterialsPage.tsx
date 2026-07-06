import { useEffect, useState } from 'react'
import ExportButtons from '../components/ExportButtons'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { Material } from '../types'

export default function MaterialsPage() {
  const { t } = useI18n()
  const [materials, setMaterials] = useState<Material[]>([])
  const [newMat, setNewMat] = useState('')
  const [newShrink, setNewShrink] = useState('1.0')

  const load = () => api.getMaterials().then(setMaterials)
  useEffect(() => { load() }, [])

  const save = async (material: string, shrinking: number) => {
    await api.updateMaterial(material, shrinking)
    load()
  }

  const add = async () => {
    if (!newMat.trim()) return
    await api.createMaterial({ material: newMat.trim().toUpperCase(), shrinking: parseFloat(newShrink) })
    setNewMat('')
    setNewShrink('1.0')
    load()
  }

  const remove = async (material: string) => {
    if (!confirm(t('confirmDeleteMaterial', { material }))) return
    await api.deleteMaterial(material)
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-bold">{t('materialsTitle')}</h2>
        <ExportButtons basePath="/export/materials" filenameBase="materiales" />
      </div>
      <p className="text-sm text-slate-600">{t('materialsFormula')}</p>

      <div className="bg-white rounded-xl border divide-y">
        {materials.map((m) => (
          <div key={m.material} className="flex items-center gap-3 p-3">
            <span className="font-mono font-medium w-24">{m.material}</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              className="border rounded px-2 py-1 w-24"
              defaultValue={m.shrinking}
              onBlur={(e) => save(m.material, parseFloat(e.target.value))}
            />
            <button onClick={() => remove(m.material)} className="text-red-500 text-xs ml-auto hover:underline">
              {t('btnDelete')}
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          placeholder={t('materialsNewPlaceholder')}
          className="border rounded px-3 py-2 flex-1"
          value={newMat}
          onChange={(e) => setNewMat(e.target.value)}
        />
        <input
          type="number"
          step="0.01"
          className="border rounded px-3 py-2 w-24"
          value={newShrink}
          onChange={(e) => setNewShrink(e.target.value)}
        />
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {t('btnAdd')}
        </button>
      </div>
    </div>
  )
}
