export function formatGanttProductLabel(item: {
  titulo?: string | null
  color?: string | null
  matriz_mm?: number | null
}): string {
  const titleColor = [item.titulo, item.color].filter(Boolean).join('-')
  const mm = item.matriz_mm != null ? `${item.matriz_mm}mm` : ''
  return [titleColor, mm].filter(Boolean).join(' ') || '—'
}

export function formatGanttBarLabel(item: {
  customer?: string | null
  titulo?: string | null
  color?: string | null
  matriz_mm?: number | null
  order_number?: string
  start_date?: string | null
  finish_date?: string | null
}): string {
  const customer = item.customer?.trim()
  const product = formatGanttProductLabel(item)
  if (customer && product !== '—') return `${customer} · ${product}`
  return customer || product
}

export function formatGanttBarTitle(item: {
  order_number?: string
  customer?: string | null
  titulo?: string | null
  color?: string | null
  matriz_mm?: number | null
  start_date?: string | null
  finish_date?: string | null
  sequence?: number
}): string {
  const lines = [
    item.sequence != null ? `#${item.sequence} ${item.order_number ?? ''}`.trim() : item.order_number,
    item.customer ?? '',
    formatGanttProductLabel(item),
    item.start_date && item.finish_date ? `${item.start_date} → ${item.finish_date}` : '',
  ].filter(Boolean)
  return lines.join('\n')
}
