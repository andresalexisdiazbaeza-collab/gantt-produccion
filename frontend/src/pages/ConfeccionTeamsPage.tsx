import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'
import type { ConfectionTeam } from '../types'

export default function ConfeccionTeamsPage() {
  const { t } = useI18n()
  const [teams, setTeams] = useState<ConfectionTeam[]>([])
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [workers, setWorkers] = useState(4)

  const load = () => api.getConfectionTeams().then(setTeams).catch((e) => setError(e.message))

  useEffect(() => {
    load()
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    await api.createConfectionTeam({
      name: name.trim(),
      workers,
      hours_daily: 7.5,
      extra_hours_day: 0,
      active: true,
    })
    setName('')
    await load()
  }

  const remove = async (id: number) => {
    if (!confirm(t('confConfirmDeleteTeam'))) return
    await api.deleteConfectionTeam(id)
    await load()
  }

  if (error) return <div className="p-6 text-red-600">{error}</div>

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h2 className="text-2xl font-bold">{t('confTeamsTitle')}</h2>
      <form onSubmit={create} className="flex flex-wrap gap-2 items-end bg-white border rounded-xl p-4">
        <label className="text-sm">
          {t('confTeamName')}
          <input className="block border rounded px-2 py-1 mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
        <label className="text-sm">
          {t('confColWorkers')}
          <input
            type="number"
            min={1}
            className="block border rounded px-2 py-1 mt-1 w-20"
            value={workers}
            onChange={(e) => setWorkers(Number(e.target.value))}
          />
        </label>
        <button type="submit" className="px-3 py-2 rounded bg-teal-600 text-white text-sm">{t('confAddTeam')}</button>
      </form>
      <ul className="bg-white border rounded-xl divide-y">
        {teams.map((tm) => (
          <li key={tm.id} className="p-3 flex justify-between items-center text-sm">
            <div>
              <div className="font-medium">{tm.name}</div>
              <div className="text-slate-500">
                {tm.workers} workers · {tm.hours_daily}h +{tm.extra_hours_day} extra
              </div>
            </div>
            <button type="button" className="text-red-600 hover:underline" onClick={() => remove(tm.id)}>
              {t('confDelete')}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
