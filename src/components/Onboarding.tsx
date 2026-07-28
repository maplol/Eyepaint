import { useCallback, useEffect, useLayoutEffect, useState, type CSSProperties } from 'react'
import type { CoachStep } from '../lib/onboarding'

type OnboardingProps = {
  steps: readonly CoachStep[]
  onDone: () => void
  /** Подпись счётчика, напр. «Старт» / «Студия» */
  label?: string
}

type Rect = { top: number; left: number; width: number; height: number; cx: number; cy: number }

function readRect(selector: string | null): Rect | null {
  if (!selector) return null
  const el = document.querySelector(selector)
  if (!(el instanceof HTMLElement)) return null
  const r = el.getBoundingClientRect()
  if (r.width < 2 && r.height < 2) return null
  return {
    top: r.top,
    left: r.left,
    width: r.width,
    height: r.height,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  }
}

function pickPlacement(
  step: CoachStep,
  rect: Rect | null,
  cardW: number,
  cardH: number,
): 'top' | 'bottom' | 'left' | 'right' {
  if (step.placement && step.placement !== 'auto') return step.placement
  if (!rect) return 'bottom'
  const gap = 16
  const space = {
    top: rect.top,
    bottom: window.innerHeight - rect.top - rect.height,
    left: rect.left,
    right: window.innerWidth - rect.left - rect.width,
  }
  const order: Array<'bottom' | 'top' | 'right' | 'left'> = ['bottom', 'top', 'right', 'left']
  for (const side of order) {
    const need = side === 'top' || side === 'bottom' ? cardH + gap + 28 : cardW + gap + 28
    if (space[side] >= need) return side
  }
  return space.bottom >= space.top ? 'bottom' : 'top'
}

export function Onboarding({ steps, onDone, label = 'Старт' }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const current = steps[step]
  const total = steps.length

  const measure = useCallback(() => {
    if (!current) return
    if (!current.target) {
      setRect(null)
      return
    }
    const el = document.querySelector(current.target)
    if (el instanceof HTMLElement) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
    }
    setRect(readRect(current.target))
  }, [current])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useEffect(() => {
    const onWin = () => measure()
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    const t1 = window.setTimeout(measure, 80)
    const t2 = window.setTimeout(measure, 280)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [measure])

  // если цели нет на экране (например нет автосейва) — перескакиваем
  useEffect(() => {
    if (!current?.target) return
    const timer = window.setTimeout(() => {
      if (document.querySelector(current.target!)) return
      if (step >= steps.length - 1) onDone()
      else setStep((value) => value + 1)
    }, 450)
    return () => window.clearTimeout(timer)
  }, [current, step, steps.length, onDone])

  if (!current) return null

  const isLast = step >= total - 1
  const cardW = Math.min(340, window.innerWidth - 24)
  const cardH = 200
  const placement = pickPlacement(current, rect, cardW, cardH)
  const pad = 8

  let cardStyle: CSSProperties = {
    position: 'fixed',
    width: cardW,
    zIndex: 82,
  }
  let arrow: { x1: number; y1: number; x2: number; y2: number } | null = null

  if (!rect) {
    cardStyle = {
      ...cardStyle,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else {
    const gap = 18
    if (placement === 'bottom') {
      cardStyle.left = Math.min(
        Math.max(12, rect.cx - cardW / 2),
        window.innerWidth - cardW - 12,
      )
      cardStyle.top = Math.min(rect.top + rect.height + gap, window.innerHeight - cardH - 12)
      arrow = {
        x1: cardStyle.left + cardW / 2,
        y1: (cardStyle.top as number) - 2,
        x2: rect.cx,
        y2: rect.top + rect.height + 2,
      }
    } else if (placement === 'top') {
      cardStyle.left = Math.min(
        Math.max(12, rect.cx - cardW / 2),
        window.innerWidth - cardW - 12,
      )
      cardStyle.top = Math.max(12, rect.top - gap - cardH)
      arrow = {
        x1: cardStyle.left + cardW / 2,
        y1: (cardStyle.top as number) + cardH + 2,
        x2: rect.cx,
        y2: rect.top - 2,
      }
    } else if (placement === 'right') {
      cardStyle.left = Math.min(rect.left + rect.width + gap, window.innerWidth - cardW - 12)
      cardStyle.top = Math.min(
        Math.max(12, rect.cy - cardH / 2),
        window.innerHeight - cardH - 12,
      )
      arrow = {
        x1: cardStyle.left - 2,
        y1: (cardStyle.top as number) + 48,
        x2: rect.left + rect.width + 2,
        y2: rect.cy,
      }
    } else {
      cardStyle.left = Math.max(12, rect.left - gap - cardW)
      cardStyle.top = Math.min(
        Math.max(12, rect.cy - cardH / 2),
        window.innerHeight - cardH - 12,
      )
      arrow = {
        x1: cardStyle.left + cardW + 2,
        y1: (cardStyle.top as number) + 48,
        x2: rect.left - 2,
        y2: rect.cy,
      }
    }
  }

  const goNext = () => {
    if (isLast) onDone()
    else setStep((value) => value + 1)
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Обучение">
      {/* затемнение с «дыркой» вокруг цели */}
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl ring-2 ring-[var(--accent)] transition-[top,left,width,height] duration-200"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
            boxShadow: '0 0 0 9999px rgba(14, 18, 22, 0.72)',
          }}
          aria-hidden="true"
        />
      ) : (
        <div className="pointer-events-none fixed inset-0 bg-[rgba(14,18,22,0.72)]" aria-hidden="true" />
      )}

      {/* клик по затемнению не закрывает — только кнопки */}
      <div className="fixed inset-0" aria-hidden="true" />

      {arrow && (
        <svg
          className="pointer-events-none fixed inset-0 z-[81] h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <marker
              id="eyepaint-coach-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L6,3 L0,6 Z" fill="var(--accent)" />
            </marker>
          </defs>
          <line
            x1={arrow.x1}
            y1={arrow.y1}
            x2={arrow.x2}
            y2={arrow.y2}
            stroke="var(--accent)"
            strokeWidth="2.5"
            strokeLinecap="round"
            markerEnd="url(#eyepaint-coach-arrow)"
          />
        </svg>
      )}

      <div
        className="glass-panel animate-rise-in rounded-3xl p-4 text-paper shadow-[0_16px_40px_rgba(0,0,0,0.45)] sm:p-5"
        style={cardStyle}
      >
        <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-accent-soft uppercase">
          {label} · {step + 1}/{total}
        </p>
        <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-bold leading-snug sm:text-xl">
          {current.title}
        </h2>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-mist/85">{current.body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full border border-white/20 bg-white/10 font-semibold"
            onClick={onDone}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full bg-accent font-bold text-accent-ink"
            onClick={goNext}
          >
            {isLast ? 'Готово' : 'Дальше'}
          </button>
        </div>
      </div>
    </div>
  )
}
