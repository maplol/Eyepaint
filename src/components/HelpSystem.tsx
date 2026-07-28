import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getHelpTip } from '../lib/helpTips'

type HelpContextValue = {
  helpMode: boolean
  setHelpMode: (value: boolean) => void
  toggleHelpMode: () => void
  activeTipId: string | null
  openTip: (id: string) => void
  closeTip: () => void
}

const HelpContext = createContext<HelpContextValue | null>(null)

export function HelpProvider({ children }: { children: ReactNode }) {
  const [helpMode, setHelpMode] = useState(false)
  const [activeTipId, setActiveTipId] = useState<string | null>(null)

  const openTip = useCallback((id: string) => setActiveTipId(id), [])
  const closeTip = useCallback(() => setActiveTipId(null), [])
  const toggleHelpMode = useCallback(() => {
    setHelpMode((value) => {
      const next = !value
      if (!next) setActiveTipId(null)
      return next
    })
  }, [])

  useEffect(() => {
    if (!helpMode) return
    const onClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      const hit = target.closest('[data-help]')
      if (!hit) return
      const id = hit.getAttribute('data-help')
      if (!id) return
      // сама кнопка «?» должна выключать режим, а не открывать карточку
      if (id === 'help-toggle') return
      event.preventDefault()
      event.stopPropagation()
      setActiveTipId(id)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [helpMode])

  useEffect(() => {
    document.documentElement.dataset.helpMode = helpMode ? '1' : '0'
    return () => {
      delete document.documentElement.dataset.helpMode
    }
  }, [helpMode])

  const value = useMemo(
    () => ({
      helpMode,
      setHelpMode,
      toggleHelpMode,
      activeTipId,
      openTip,
      closeTip,
    }),
    [helpMode, toggleHelpMode, activeTipId, openTip, closeTip],
  )

  const tip = getHelpTip(activeTipId)

  return (
    <HelpContext.Provider value={value}>
      {children}
      {tip && (
        <div
          className="fixed inset-0 z-[90] grid place-items-end bg-ink-deep/55 p-4 backdrop-blur-sm sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-label={tip.title}
          onClick={closeTip}
        >
          <div
            className="glass-panel animate-rise-in w-full max-w-md rounded-3xl p-5 text-paper"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-accent-soft">
              Справка
            </p>
            <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-xl font-bold">
              {tip.title}
            </h2>
            <p className="mt-2 text-[0.95rem] leading-relaxed text-mist/85">{tip.body}</p>
            <button
              type="button"
              className="mt-5 min-h-11 w-full rounded-full bg-accent font-bold text-accent-ink"
              onClick={closeTip}
            >
              Понятно
            </button>
          </div>
        </div>
      )}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  const ctx = useContext(HelpContext)
  if (!ctx) throw new Error('useHelp outside HelpProvider')
  return ctx
}

/** Кнопка «?» — включает режим подсказок по клику */
export function HelpToggleButton({ className = '' }: { className?: string }) {
  const { helpMode, toggleHelpMode } = useHelp()
  return (
    <button
      type="button"
      data-help="help-toggle"
      className={[
        'grid h-10 w-10 shrink-0 place-items-center rounded-full border text-[0.95rem] font-bold transition-colors',
        helpMode
          ? 'border-accent/55 bg-accent/25 text-[var(--chip-accent-fg)]'
          : 'border-[var(--glass-border)] bg-[var(--glass-fill-mid)] text-[var(--fg-strong)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={helpMode ? 'Выключить подсказки' : 'Включить подсказки'}
      aria-pressed={helpMode}
      title={helpMode ? 'Подсказки вкл — кликай по элементам' : 'Справка по элементам'}
      onClick={(event) => {
        event.stopPropagation()
        toggleHelpMode()
      }}
    >
      ?
    </button>
  )
}
