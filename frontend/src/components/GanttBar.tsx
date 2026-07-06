import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider'
import { formatGanttBarLabel, formatGanttProductLabel } from '../utils/ganttLabel'
import { formatDeliveryStatus } from '../utils/deliveryStatus'
import { GANTT_THEMES, type GanttTheme } from '../utils/ganttTheme'

export interface GanttBarItem {
  order_number?: string
  customer?: string | null
  titulo?: string | null
  color?: string | null
  matriz_mm?: number | null
  start_date?: string | null
  finish_date?: string | null
  delivery_date?: string | null
  delivery_status?: string | null
  is_late?: boolean
  days_late?: number
  days_margin?: number
  sequence?: number
}

interface GanttBarProps {
  item: GanttBarItem
  className: string
  style: React.CSSProperties
  theme?: GanttTheme
}

export default function GanttBar({ item, className, style, theme = 'day' }: GanttBarProps) {
  const { t } = useI18n()
  const th = GANTT_THEMES[theme]
  const ref = useRef<HTMLDivElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null)

  const showTooltip = () => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    setTooltip({ x: rect.left, y: rect.bottom + 6 })
  }

  const hideTooltip = () => setTooltip(null)

  const orderLabel = item.sequence != null
    ? `#${item.sequence} ${item.order_number ?? ''}`.trim()
    : item.order_number

  const compliance = formatDeliveryStatus(item, t)
  const barText = formatGanttBarLabel(item)
  const lateSuffix = item.is_late && item.days_late ? ` +${item.days_late}d` : ''

  return (
    <>
      <div
        ref={ref}
        className={`${className} cursor-default`}
        style={style}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        onFocus={showTooltip}
        onBlur={hideTooltip}
        tabIndex={0}
      >
        {barText}
        {lateSuffix && <span className="opacity-90">{lateSuffix}</span>}
      </div>
      {tooltip && createPortal(
        <div
          className={`fixed z-[9999] pointer-events-none rounded-lg text-xs px-3 py-2 max-w-sm ${th.tooltip}`}
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {orderLabel && (
            <p><span className={th.tooltipLabel}>{t('colOrder')}:</span> {orderLabel}</p>
          )}
          {item.customer && (
            <p><span className={th.tooltipLabel}>{t('colCustomer')}:</span> {item.customer}</p>
          )}
          <p><span className={th.tooltipLabel}>{t('ganttTooltipProduct')}:</span> {formatGanttProductLabel(item)}</p>
          {item.start_date && item.finish_date && (
            <p><span className={th.tooltipLabel}>{t('ganttTooltipDates')}:</span> {item.start_date} → {item.finish_date}</p>
          )}
          {item.delivery_date && (
            <p><span className={th.tooltipLabel}>{t('ganttTooltipDelivery')}:</span> {item.delivery_date}</p>
          )}
          {item.delivery_date && (
            <p>
              <span className={th.tooltipLabel}>{t('ganttTooltipCompliance')}:</span>{' '}
              <span className={compliance.className.replace('font-semibold', '').replace('font-medium', '')}>
                {compliance.label}
              </span>
            </p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
