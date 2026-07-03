import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../i18n/I18nProvider'
import { formatGanttBarLabel, formatGanttProductLabel } from '../utils/ganttLabel'

export interface GanttBarItem {
  order_number?: string
  customer?: string | null
  titulo?: string | null
  color?: string | null
  matriz_mm?: number | null
  start_date?: string | null
  finish_date?: string | null
  sequence?: number
}

interface GanttBarProps {
  item: GanttBarItem
  className: string
  style: React.CSSProperties
}

export default function GanttBar({ item, className, style }: GanttBarProps) {
  const { t } = useI18n()
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
        {formatGanttBarLabel(item)}
      </div>
      {tooltip && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none rounded-lg bg-slate-900 text-white text-xs shadow-xl border border-slate-700 px-3 py-2 max-w-sm"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {orderLabel && (
            <p><span className="text-slate-400">{t('colOrder')}:</span> {orderLabel}</p>
          )}
          {item.customer && (
            <p><span className="text-slate-400">{t('colCustomer')}:</span> {item.customer}</p>
          )}
          <p><span className="text-slate-400">{t('ganttTooltipProduct')}:</span> {formatGanttProductLabel(item)}</p>
          {item.start_date && item.finish_date && (
            <p><span className="text-slate-400">{t('ganttTooltipDates')}:</span> {item.start_date} → {item.finish_date}</p>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
