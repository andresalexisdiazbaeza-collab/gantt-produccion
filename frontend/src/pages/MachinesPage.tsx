import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { Machine } from '../types'

type MachineField = 'mts_per_shift' | 'shifts_per_day' | 'changeover_shifts'

export default function MachinesPage() {
  const { t } = useI18n()
  const [machines, setMachines] = useState<Machine[]>([])
  const [form, setForm] = useState({
    name: '',
    mts_per_shift: '125',
    shifts_per_day: '2',
    changeover_shifts: '3',
  })

  const load = () => api.getMachines().then(setMachines)
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!form.name.trim()) return
    await api.createMachine({
      name: form.name.trim(),
      mts_per_shift: parseFloat(form.mts_per_shift),
      shifts_per_day: parseInt(form.shifts_per_day),
      changeover_shifts: parseInt(form.changeover_shifts),
      active: true,
    })
    setForm({ name: '', mts_per_shift: '125', shifts_per_day: '2', changeover_shifts: '3' })
    load()
  }

  const toggle = async (m: Machine) => {
    await api.updateMachine(m.id, { active: !m.active })
    load()
  }

  const updateField = async (m: Machine, field: MachineField, value: number) => {
    await api.updateMachine(m.id, { [field]: value })
    load()
  }

  const remove = async (id: number) => {
    if (!confirm(t('confirmDeleteMachine'))) return
    await api.deleteMachine(id)
    load()
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl">
      <h2 className="text-2xl font-bold">{t('machinesTitle')}</h2>
      <p className="text-sm text-slate-600">
        {t('machinesFormula')}
        <br />
        {t('machinesChangeover')}
      </p>

      <div className="bg-white rounded-xl border divide-y">
        {machines.map((m) => (
          <div key={m.id} className={`flex flex-wrap items-center gap-3 p-3 ${!m.active ? 'opacity-50' : ''}`}>
            <span className="font-bold w-16">{t('machineShort', { name: m.name })}</span>
            <label className="text-xs text-slate-500">
              {t('machinesMtsShift')}
              <input
                type="number"
                className="border rounded px-2 py-1 w-20 ml-1 block"
                defaultValue={m.mts_per_shift}
                onBlur={(e) => updateField(m, 'mts_per_shift', parseFloat(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-500">
              {t('machinesShiftsDay')}
              <input
                type="number"
                className="border rounded px-2 py-1 w-16 ml-1 block"
                defaultValue={m.shifts_per_day}
                onBlur={(e) => updateField(m, 'shifts_per_day', parseInt(e.target.value))}
              />
            </label>
            <label className="text-xs text-slate-500">
              {t('machinesChangeoverShifts')}
              <input
                type="number"
                min={0}
                className="border rounded px-2 py-1 w-16 ml-1 block"
                defaultValue={m.changeover_shifts}
                onBlur={(e) => updateField(m, 'changeover_shifts', parseInt(e.target.value))}
              />
            </label>
            <button onClick={() => toggle(m)} className="text-xs text-blue-600 hover:underline">
              {m.active ? t('btnDeactivate') : t('btnActivate')}
            </button>
            <button onClick={() => remove(m.id)} className="text-xs text-red-500 hover:underline ml-auto">
              {t('btnDelete')}
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          placeholder={t('machinesNumberPlaceholder')}
          className="border rounded px-3 py-2 w-28"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <input
          type="number"
          placeholder={t('machinesMtsShift')}
          className="border rounded px-3 py-2 w-28"
          value={form.mts_per_shift}
          onChange={(e) => setForm({ ...form, mts_per_shift: e.target.value })}
        />
        <input
          type="number"
          placeholder={t('machinesShiftsDay')}
          className="border rounded px-3 py-2 w-28"
          value={form.shifts_per_day}
          onChange={(e) => setForm({ ...form, shifts_per_day: e.target.value })}
        />
        <input
          type="number"
          placeholder={t('machinesChangeoverShifts')}
          className="border rounded px-3 py-2 w-28"
          value={form.changeover_shifts}
          onChange={(e) => setForm({ ...form, changeover_shifts: e.target.value })}
        />
        <button onClick={add} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          {t('btnAdd')}
        </button>
      </div>
    </div>
  )
}
