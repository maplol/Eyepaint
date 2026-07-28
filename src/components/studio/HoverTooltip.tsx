import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { cn } from './studioUi'

type HoverTooltipProps = {
  label: string
  children: ReactNode
  className?: string
  onTriggerClick?: () => void
  side?: 'bottom' | 'top'
}

type Pos = { top: number; left: number; placement: 'bottom' | 'top' }

/** Тултип через portal — не режется overflow панели */
export function HoverTooltip({
  label,
  children,
  className,
  onTriggerClick,
  side = 'bottom',
}: HoverTooltipProps) {
  const tipId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [pos, setPos] = useState<Pos | null>(null)

  const updatePos = useCallback(() => {
    const el = anchorRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const gap = 8
    const below = r.bottom + gap
    const preferBottom = side === 'bottom'
    const placement =
      preferBottom && below + 72 < window.innerHeight
        ? 'bottom'
        : r.top - gap > 72
          ? 'top'
          : 'bottom'
    const left = Math.min(Math.max(12, r.left + r.width / 2), window.innerWidth - 12)
    setPos({
      top: placement === 'bottom' ? below : r.top - gap,
      left,
      placement,
    })
  }, [side])

  useLayoutEffect(() => {
    if (!open) return
    updatePos()
  }, [open, updatePos, label])

  useEffect(() => {
    if (!open) return
    const onScroll = () => updatePos()
    const onResize = () => updatePos()
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (anchorRef.current?.contains(event.target)) return
      setPinned(false)
      setOpen(false)
    }
    window.addEventListener('scroll', onScroll, true)
    window.addEventListener('resize', onResize)
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('scroll', onScroll, true)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open, updatePos])

  return (
    <span
      ref={anchorRef}
      className={cn('inline-flex shrink-0', className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {
        if (!pinned) setOpen(false)
      }}
      onFocus={() => setOpen(true)}
      onBlur={() => {
        if (!pinned) setOpen(false)
      }}
    >
      <span
        className="inline-flex"
        onClick={(event) => {
          event.stopPropagation()
          if (onTriggerClick) {
            onTriggerClick()
            return
          }
          setPinned((value) => {
            const next = !value
            setOpen(next)
            return next
          })
        }}
      >
        {children}
      </span>
      {open &&
        pos &&
        label &&
        createPortal(
          <span
            id={tipId}
            role="tooltip"
            className="eyepaint-glass-chip pointer-events-none fixed z-[120] max-w-[min(16.5rem,calc(100vw-1.5rem))] rounded-xl px-3 py-2 text-left text-[0.75rem] leading-snug text-[var(--fg-muted)]"
            style={{
              top: pos.top,
              left: pos.left,
              transform:
                pos.placement === 'bottom' ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
            }}
          >
            {label}
          </span>,
          document.body,
        )}
    </span>
  )
}
