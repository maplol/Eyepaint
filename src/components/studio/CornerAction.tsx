import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn, scrollAreaClass } from './studioUi'

type CornerActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}

/** Кнопка-иконка в углу — только разметка; позиционирует PanelFrame */
export function CornerAction({ label, children, className, ...rest }: CornerActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--chip-solid)] text-[var(--fg-muted)] shadow-[var(--shadow-glass)] transition-colors hover:border-danger/45 hover:bg-danger/15 hover:text-[var(--danger-soft)] disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  )
}

type PanelFrameProps = {
  children: ReactNode
  /** Фиксированная кнопка слева снизу поверх скролла */
  corner?: ReactNode
  className?: string
}

/**
 * Оболочка панели: скролл внутри, corner — absolute вне скролла (всегда виден).
 */
export function PanelFrame({ children, corner, className }: PanelFrameProps) {
  return (
    <div className={cn('relative flex min-h-0 flex-1 flex-col', className)}>
      <div
        className={cn(
          'min-h-0 flex-1 overflow-auto overscroll-contain [-webkit-overflow-scrolling:touch]',
          corner ? 'pb-12' : undefined,
          scrollAreaClass,
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

export function ResetIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 12a9 9 0 1 0 3-6.7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M3 4v5h5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7h16M9 7V5h6v2M8 7l1 12h6l1-12"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
