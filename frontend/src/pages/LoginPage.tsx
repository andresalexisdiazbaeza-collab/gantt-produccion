import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthProvider'
import { useI18n } from '../i18n/I18nProvider'

export default function LoginPage() {
  const { t } = useI18n()
  const { login, token } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (token) return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await login(username.trim(), password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('loginError'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">{t('appTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('loginSubtitle')}</p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600">{t('loginUsername')}</span>
          <input
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </label>
        <label className="block text-sm">
          <span className="text-slate-600">{t('loginPassword')}</span>
          <input
            type="password"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('loading') : t('loginSubmit')}
        </button>
        <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">{t('forgotPasswordLink')}</Link>
        <p className="text-xs text-slate-400">{t('loginHint')}</p>
      </form>
    </div>
  )
}
