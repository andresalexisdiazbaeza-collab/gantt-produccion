import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api/client'
import { useI18n } from '../i18n/I18nProvider'

export default function ForgotPasswordPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    try {
      const res = await api.forgotPassword(email.trim())
      setMessage(res.message)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('error'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <form onSubmit={submit} className="bg-white rounded-xl shadow-lg p-8 w-full max-w-sm space-y-4">
        <div>
          <h1 className="text-xl font-bold">{t('forgotPasswordTitle')}</h1>
          <p className="text-sm text-slate-500 mt-1">{t('forgotPasswordSubtitle')}</p>
        </div>
        <label className="block text-sm">
          <span className="text-slate-600">{t('profileEmail')}</span>
          <input
            type="email"
            className="mt-1 w-full border rounded-lg px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {message && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">{message}</p>}
        <button
          type="submit"
          disabled={loading || !!message}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? t('loading') : t('forgotPasswordSubmit')}
        </button>
        <Link to="/login" className="block text-center text-sm text-blue-600 hover:underline">{t('backToLogin')}</Link>
      </form>
    </div>
  )
}
