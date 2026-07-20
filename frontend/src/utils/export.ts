import { getAuthToken } from '../api/client'

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
  const res = await fetch(`/api${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
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
