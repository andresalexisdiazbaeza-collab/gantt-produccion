import { getAuthToken } from '../api/client'

const LANG_STORAGE_KEY = 'gantt-lang'

export function getExportLang(): string {
  const saved = localStorage.getItem(LANG_STORAGE_KEY)
  if (saved === 'en' || saved === 'sk' || saved === 'it' || saved === 'es') return saved
  const nav = navigator.language.slice(0, 2)
  if (nav === 'en' || nav === 'sk' || nav === 'it') return nav
  return 'es'
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function buildExportPath(basePath: string, params: Record<string, string>): string {
  const [path, existing] = basePath.split('?')
  const search = new URLSearchParams(existing ?? '')
  for (const [key, value] of Object.entries(params)) {
    search.set(key, value)
  }
  const qs = search.toString()
  return qs ? `${path}?${qs}` : path
}

export async function downloadFromApi(path: string, filename: string) {
  const token = getAuthToken()
  const lang = getExportLang()
  const [pathname, existing] = path.split('?')
  const params = new URLSearchParams(existing ?? '')
  if (!params.get('lang')) params.set('lang', lang)
  const query = params.toString()
  const url = `/api${pathname}${query ? `?${query}` : ''}`
  const res = await fetch(url, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Accept-Language': lang,
    },
  })
  if (!res.ok) {
    let message = 'Error al descargar'
    try {
      const data = await res.json()
      if (typeof data.detail === 'string') message = data.detail
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
  const blob = await res.blob()
  const disposition = res.headers.get('Content-Disposition')
  const match = disposition?.match(/filename="?([^"]+)"?/)
  downloadBlob(blob, match?.[1] || filename)
}
