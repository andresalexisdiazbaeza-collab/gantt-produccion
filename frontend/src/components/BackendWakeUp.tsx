import { useEffect, useState, type ReactNode } from 'react'

const base = (import.meta.env.VITE_API_URL ?? '/api').replace(/\/$/, '')
const HEALTH_URL = `${base}/health`

async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetch(HEALTH_URL, { cache: 'no-store' })
    return res.ok
  } catch {
    return false
  }
}

export default function BackendWakeUp({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout>

    const check = async () => {
      if (cancelled) return
      if (await pingHealth()) {
        setReady(true)
        return
      }
      setAttempt((n) => n + 1)
      timer = setTimeout(check, 2500)
    }

    check()
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [])

  if (ready) return <>{children}</>

  const seconds = Math.max(0, (attempt - 1) * 2.5)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100 px-6">
      <div className="w-12 h-12 rounded-full border-2 border-slate-600 border-t-sky-400 animate-spin mb-6" />
      <h1 className="text-xl font-semibold mb-2">Iniciando Gantt Producción</h1>
      <p className="text-slate-400 text-center max-w-md">
        El servidor web está despertando. Esto puede tardar hasta 30 segundos la primera vez.
      </p>
      {seconds > 0 && (
        <p className="text-slate-500 text-sm mt-4">Esperando… {Math.round(seconds)}s</p>
      )}
    </div>
  )
}
