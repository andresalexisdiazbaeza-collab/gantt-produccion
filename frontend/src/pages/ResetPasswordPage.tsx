import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setError(t('passwordMismatch'))
      return
    }
    if (!token) {
      setError(t('resetInvalidLink'))
      return
    }
    setLoading(true)
    setError('')
    try {
      await api.resetPassword(token, password)
      navigate('/login', { replace: true, state: { resetOk: true } })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4 text-center">
          <p className="text-red-600">{t('resetInvalidLink')}</p>
          <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">{t('forgotPasswordTitle')}</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">{t('resetPasswordTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('resetPasswordSubtitle')}</p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600">{t('newPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">{t('confirmPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('loading') : t('resetPasswordSubmit')}
        </button>
        <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">{t('backToLogin')}</Link>
      </form>
    </div>
  )
}
