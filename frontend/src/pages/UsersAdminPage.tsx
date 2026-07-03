import { useCallback, useEffect, useState } from 'react'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

interface AdminUser {
  username: string
  role: string
  display_name: string
  email: string | null
  active: boolean
}

export default function UsersAdminPage() {
  const { t } = useI18n()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [resetting, setResetting] = useState<string | null>(null)
  const [customPasswords, setCustomPasswords] = useState<Record<string, string>>({})

  const load = useCallback(() => {
    api.listUsers().then(setUsers).catch((e) => setError(e.message))
  }, [])

  useEffect(() => { load() }, [load])

  const resetPassword = async (username: string, newPassword?: string) => {
    setResetting(username)
    setError('')
    setMessage('')
    try {
      const res = await api.adminResetPassword(username, newPassword)
      setMessage(res.message)
      setCustomPasswords((prev) => ({ ...prev, [username]: '' }))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : t('error'))
    } finally {
      setResetting(null)
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <div>
        <h2 className="text-2xl font-bold">{t('usersAdminTitle')}</h2>
        <p className="text-sm text-slate-500 mt-1">{t('usersAdminSubtitle')}</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}
      {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}

      <div className="bg-white rounded-xl border divide-y">
        {users.map((u) => (
          <div key={u.username} className="p-4 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold">{u.display_name} <span className="text-slate-400 font-normal">({u.username})</span></p>
                <p className="text-xs text-slate-500">{u.role} · {u.email ?? t('noEmail')}</p>
              </div>
              <button
                type="button"
                onClick={() => resetPassword(u.username)}
                disabled={resetting === u.username}
                className="text-sm bg-amber-600 text-white px-3 py-1.5 rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                {resetting === u.username ? '...' : t('adminResetDefault', { pwd: '12345' })}
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                placeholder={t('adminCustomPassword')}
                className="border rounded-lg px-3 py-1.5 text-sm flex-1 min-w-40"
                value={customPasswords[u.username] ?? ''}
                onChange={(e) => setCustomPasswords((prev) => ({ ...prev, [u.username]: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => {
                  const pwd = customPasswords[u.username]?.trim()
                  if (pwd) void resetPassword(u.username, pwd)
                }}
                disabled={resetting === u.username || !customPasswords[u.username]?.trim()}
                className="text-sm border px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
              >
                {t('adminResetCustom')}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
