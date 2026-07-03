import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n/I18nProvider'

export default function AccountPage() {
  const { t } = useI18n()
  const { user, refreshUser } = useAuth()
  const [email, setEmail] = useState(user?.email ?? '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [profileMsg, setProfileMsg] = useState('')
  const [passwordMsg, setPasswordMsg] = useState('')
  const [error, setError] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  useEffect(() => {
    setEmail(user?.email ?? '')
  }, [user?.email])

  const saveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingProfile(true)
    setError('')
    setProfileMsg('')
    try {
      const updated = await api.updateProfile(email.trim())
      await refreshUser()
      setProfileMsg(t('profileEmailSaved'))
      void updated
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setSavingProfile(false)
    }
  }

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    setSavingPassword(true)
    setError('')
    setPasswordMsg('')
    try {
      const res = await api.changePassword(currentPassword, newPassword)
      setPasswordMsg(res.message)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="p-6 max-w-lg space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{t('accountTitle')}</h2>
        <p className="text-sm text-slate-500 mt-1">{user?.display_name} · {user?.role}</p>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

      <form onSubmit={saveEmail} className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold">{t('profileEmail')}</h3>
        <p className="text-xs text-slate-500">{t('profileEmailHint')}</p>
        <input
          type="email"
          className="w-full border rounded-lg px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        {profileMsg && <p className="text-sm text-green-700">{profileMsg}</p>}
        <button
          type="submit"
          disabled={savingProfile}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-900 disabled:opacity-50"
        >
          {savingProfile ? t('loading') : t('profileSaveEmail')}
        </button>
      </form>

      <form onSubmit={savePassword} className="bg-white rounded-xl border p-4 space-y-3">
        <h3 className="font-semibold">{t('changePasswordTitle')}</h3>
        <label className="block text-sm">
          <span className="text-slate-600">{t('currentPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">{t('newPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">{t('confirmPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {passwordMsg && <p className="text-sm text-green-700">{passwordMsg}</p>}
        <button
          type="submit"
          disabled={savingPassword}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
        >
          {savingPassword ? t('loading') : t('changePasswordSubmit')}
        </button>
      </form>
    </div>
  )
}
