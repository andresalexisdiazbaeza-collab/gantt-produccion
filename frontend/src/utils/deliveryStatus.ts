import type { TranslationKey } from '../i18n/types'

type TFn = (key: TranslationKey, vars?: Record<string, string | number>) => string

export interface DeliveryDisplay {
  label: string
  className: string
  title?: string
}

export function formatDeliveryStatus(item: {
  delivery_date?: string | null
  finish_date?: string | null
  delivery_status?: string | null
  is_late?: boolean
  days_late?: number
  days_margin?: number
}, t: TFn): DeliveryDisplay {
  const status = item.delivery_status ?? inferStatus(item)

  if (status === 'no_date') {
    return { label: t('deliveryNoDate'), className: 'text-slate-400' }
  }
  if (status === 'pending') {
    return { label: t('deliveryPendingCalc'), className: 'text-slate-500' }
  }
  if (status === 'late' || item.is_late) {
    const days = item.days_late || 0
    return {
      label: t('deliveryLateDays', { days }),
      className: 'text-red-700 font-semibold',
      title: item.delivery_date && item.finish_date
        ? `${item.finish_date} > ${item.delivery_date}`
        : undefined,
    }
  }
  const margin = item.days_margin ?? 0
  if (margin > 0) {
    return {
      label: t('deliveryMarginDays', { days: margin }),
      className: 'text-emerald-700 font-medium',
    }
  }
  return { label: t('deliveryOnTime'), className: 'text-emerald-700 font-medium' }
}

function inferStatus(item: {
  delivery_date?: string | null
  finish_date?: string | null
  is_late?: boolean
}): string {
  if (!item.delivery_date) return 'no_date'
  if (!item.finish_date) return 'pending'
  if (item.is_late) return 'late'
  return 'on_time'
}

export function formatGanttDeliveryHint(item: {
  delivery_date?: string | null
  finish_date?: string | null
  delivery_status?: string | null
  is_late?: boolean
  days_late?: number
  days_margin?: number
}, t: TFn): string | null {
  const { label } = formatDeliveryStatus(item, t)
  if (!item.delivery_date) return null
  return label
}
