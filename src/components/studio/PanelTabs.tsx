import { useEffect, useState, type ReactNode } from 'react'
import { cn } from './studioUi'

export type PanelTab = {
  id: string
  label: string
  content: ReactNode
  /** Кнопка поверх скролла вкладки (слева снизу) */
  corner?: ReactNode
}

type PanelTabsProps = {
  tabs: PanelTab[]
  className?: string
  storageKey?: string
}

/** Табы с каруселью; каждая вкладка скроллит сама, corner не уезжает */
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

  if (tabs.length <= 1) {
    const only = tabs[0]
    if (!only) return null
    return (
      <div className={cn('flex min-h-0 flex-1 flex-col', className)}>
        <Pane corner={only.corner}>{only.content}</Pane>
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-2.5', className)}>
      <div
        className="flex shrink-0 gap-1 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] p-1"
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
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div
          className="flex h-full transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {tabs.map((tab, i) => (
            <div
              key={tab.id}
              role="tabpanel"
              aria-hidden={i !== index}
              className="h-full w-full shrink-0"
            >
              <Pane corner={tab.corner}>{tab.content}</Pane>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Pane({ children, corner }: { children: ReactNode; corner?: ReactNode }) {
  return (
    <div className="relative h-full min-h-0">
      <div
        className={cn(
          'h-full overflow-auto overscroll-contain px-0.5 eyepaint-scroll [-webkit-overflow-scrolling:touch]',
          corner ? 'pb-12' : undefined,
        )}
      >
        {children}
      </div>
      {corner ? (
        <div className="pointer-events-none absolute inset-0 z-[8]">
          <div className="pointer-events-auto absolute bottom-2 left-2">{corner}</div>
        </div>
      ) : null}
    </div>
  )
}
