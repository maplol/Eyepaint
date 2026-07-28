import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from './studioUi'

export type PanelTab = {
  id: string
  label: string
  content: ReactNode
}

type PanelTabsProps = {
  tabs: PanelTab[]
  className?: string
  /** Сохранять активную вкладку между открытиями */
  storageKey?: string
}

/** Внутренние табы панели с горизонтальным «перелистыванием» */
export function PanelTabs({ tabs, className, storageKey }: PanelTabsProps) {
  const initial = (() => {
    if (!storageKey || typeof window === 'undefined') return 0
    try {
      const raw = sessionStorage.getItem(storageKey)
      const idx = raw ? Number(raw) : 0
      return Number.isFinite(idx) && idx >= 0 && idx < tabs.length ? idx : 0
    } catch {
      return 0
    }
  })()
  const [index, setIndex] = useState(initial)
  const [height, setHeight] = useState<number | 'auto'>('auto')
  const paneRefs = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    if (index >= tabs.length) setIndex(0)
  }, [index, tabs.length])

  useEffect(() => {
    if (!storageKey) return
    try {
      sessionStorage.setItem(storageKey, String(index))
    } catch {
      /* ignore */
    }
  }, [index, storageKey])

  useEffect(() => {
    const node = paneRefs.current[index]
    if (!node) return
    const measure = () => setHeight(node.offsetHeight)
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    ro?.observe(node)
    return () => ro?.disconnect()
  }, [index, tabs])

  if (tabs.length <= 1) {
    return <div className={className}>{tabs[0]?.content}</div>
  }

  return (
    <div className={cn('grid gap-2.5', className)}>
      <div
        className="flex gap-1 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] p-1"
        role="tablist"
      >
        {tabs.map((tab, i) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            className={cn(
              'min-h-8 flex-1 rounded-lg px-2 text-center text-[0.72rem] font-semibold leading-tight transition-colors',
              i === index
                ? 'bg-[var(--glass-fill-strong)] text-[var(--fg-strong)]'
                : 'text-[var(--fg-muted)] hover:text-[var(--fg-strong)]',
            )}
            onClick={() => setIndex(i)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        className="relative overflow-hidden transition-[height] duration-300 ease-out"
        style={{ height: height === 'auto' ? undefined : height }}
      >
        <div
          className="flex w-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {tabs.map((tab, i) => (
            <div
              key={tab.id}
              ref={(node) => {
                paneRefs.current[i] = node
              }}
              role="tabpanel"
              aria-hidden={i !== index}
              className="w-full shrink-0 px-0.5"
            >
              {tab.content}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
