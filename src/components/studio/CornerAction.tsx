import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from './studioUi'

type CornerActionProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string
  children: ReactNode
}

/** Фиксированная иконка-действие внизу справа панели */
export function CornerAction({ label, children, className, ...rest }: CornerActionProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        'absolute bottom-2 right-2 z-[5] grid h-9 w-9 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--chip-solid)] text-[var(--fg-muted)] shadow-[var(--shadow-glass)] transition-colors hover:border-danger/45 hover:bg-danger/15 hover:text-[var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-40',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
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
