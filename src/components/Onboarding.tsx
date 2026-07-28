import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { CoachStep } from '../lib/onboarding'

type OnboardingProps = {
  steps: readonly CoachStep[]
  onDone: () => void
  /** Подпись счётчика, напр. «Старт» / «Студия» */
  label?: string
}

type Rect = { top: number; left: number; width: number; height: number; cx: number; cy: number }
type Side = 'top' | 'bottom' | 'left' | 'right'

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
): Side {
  if (step.placement && step.placement !== 'auto') return step.placement
  if (!rect) return 'bottom'
  const gap = 20
  const space = {
    top: rect.top,
    bottom: window.innerHeight - rect.top - rect.height,
    left: rect.left,
    right: window.innerWidth - rect.left - rect.width,
  }
  const order: Side[] = ['bottom', 'top', 'right', 'left']
  for (const side of order) {
    const need = side === 'top' || side === 'bottom' ? cardH + gap + 36 : cardW + gap + 36
    if (space[side] >= need) return side
  }
  return space.bottom >= space.top ? 'bottom' : 'top'
}

/** Мягкий «стебель»: широкий у карточки, сужается к цели */
function buildStemPath(
  side: Side,
  card: { left: number; top: number; width: number; height: number },
  tip: { x: number; y: number },
): string {
  const baseHalf = 14
  let ax = 0
  let ay = 0
  let nx = 0
  let ny = 0

  if (side === 'bottom') {
    ax = card.left + card.width / 2
    ay = card.top
    nx = 1
    ny = 0
  } else if (side === 'top') {
    ax = card.left + card.width / 2
    ay = card.top + card.height
    nx = 1
    ny = 0
  } else if (side === 'right') {
    ax = card.left
    ay = card.top + Math.min(56, card.height * 0.28)
    nx = 0
    ny = 1
  } else {
    ax = card.left + card.width
    ay = card.top + Math.min(56, card.height * 0.28)
    nx = 0
    ny = 1
  }

  const b1x = ax - nx * baseHalf
  const b1y = ay - ny * baseHalf
  const b2x = ax + nx * baseHalf
  const b2y = ay + ny * baseHalf

  // контрольные точки: вытекание из карточки, потом к цели
  const pull = side === 'left' || side === 'right' ? 0.45 : 0.42
  const c1x = ax + (tip.x - ax) * 0.22
  const c1y = ay + (tip.y - ay) * 0.22
  const c2x = ax + (tip.x - ax) * pull
  const c2y = ay + (tip.y - ay) * pull

  // лёгкий изгиб перпендикулярно направлению
  const dx = tip.x - ax
  const dy = tip.y - ay
  const len = Math.hypot(dx, dy) || 1
  const px = (-dy / len) * Math.min(28, len * 0.12)
  const py = (dx / len) * Math.min(28, len * 0.12)

  const m1x = c1x + px * 0.35
  const m1y = c1y + py * 0.35
  const m2x = c2x + px
  const m2y = c2y + py

  // узкий «носик» у цели
  const tipHalf = 2.2
  const tdx = tip.x - m2x
  const tdy = tip.y - m2y
  const tlen = Math.hypot(tdx, tdy) || 1
  const tnx = -tdy / tlen
  const tny = tdx / tlen

  return [
    `M ${b1x} ${b1y}`,
    `L ${b2x} ${b2y}`,
    `C ${m1x + nx * baseHalf * 0.15} ${m1y + ny * baseHalf * 0.15}`,
    `  ${m2x + tnx * tipHalf} ${m2y + tny * tipHalf}`,
    `  ${tip.x + tnx * tipHalf} ${tip.y + tny * tipHalf}`,
    `L ${tip.x - tnx * tipHalf} ${tip.y - tny * tipHalf}`,
    `C ${m2x - tnx * tipHalf} ${m2y - tny * tipHalf}`,
    `  ${m1x - nx * baseHalf * 0.15} ${m1y - ny * baseHalf * 0.15}`,
    `  ${b1x} ${b1y}`,
    'Z',
  ].join(' ')
}

export function Onboarding({ steps, onDone, label = 'Старт' }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const [cardBox, setCardBox] = useState({ width: 320, height: 200 })
  const cardRef = useRef<HTMLDivElement | null>(null)
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

  const measureCard = useCallback(() => {
    const node = cardRef.current
    if (!node) return
    const r = node.getBoundingClientRect()
    if (r.width > 0 && r.height > 0) {
      setCardBox({ width: r.width, height: r.height })
    }
  }, [])

  useLayoutEffect(() => {
    measure()
  }, [measure])

  useLayoutEffect(() => {
    measureCard()
  }, [measureCard, step, rect])

  useEffect(() => {
    const onWin = () => {
      measure()
      measureCard()
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    const t1 = window.setTimeout(onWin, 80)
    const t2 = window.setTimeout(onWin, 280)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
      window.clearTimeout(t1)
      window.clearTimeout(t2)
    }
  }, [measure, measureCard])

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
  const cardW = Math.min(340, typeof window !== 'undefined' ? window.innerWidth - 24 : 340)
  const placement = pickPlacement(current, rect, cardW, cardBox.height || 200)
  const pad = 10

  let cardStyle: CSSProperties = {
    position: 'fixed',
    width: cardW,
    zIndex: 82,
  }

  let tipPoint: { x: number; y: number } | null = null
  let cardGeom: { left: number; top: number; width: number; height: number } | null = null

  if (!rect) {
    cardStyle = {
      ...cardStyle,
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else {
    const gap = 22
    const h = cardBox.height || 200
    let left = 12
    let top = 12

    if (placement === 'bottom') {
      left = Math.min(Math.max(12, rect.cx - cardW / 2), window.innerWidth - cardW - 12)
      top = Math.min(rect.top + rect.height + gap, window.innerHeight - h - 12)
      tipPoint = { x: rect.cx, y: rect.top + rect.height + 1 }
    } else if (placement === 'top') {
      left = Math.min(Math.max(12, rect.cx - cardW / 2), window.innerWidth - cardW - 12)
      top = Math.max(12, rect.top - gap - h)
      tipPoint = { x: rect.cx, y: rect.top - 1 }
    } else if (placement === 'right') {
      left = Math.min(rect.left + rect.width + gap, window.innerWidth - cardW - 12)
      top = Math.min(Math.max(12, rect.cy - h / 2), window.innerHeight - h - 12)
      tipPoint = { x: rect.left + rect.width + 1, y: rect.cy }
    } else {
      left = Math.max(12, rect.left - gap - cardW)
      top = Math.min(Math.max(12, rect.cy - h / 2), window.innerHeight - h - 12)
      tipPoint = { x: rect.left - 1, y: rect.cy }
    }

    cardStyle.left = left
    cardStyle.top = top
    cardGeom = { left, top, width: cardW, height: h }
  }

  const stemPath =
    tipPoint && cardGeom ? buildStemPath(placement, cardGeom, tipPoint) : null

  const goNext = () => {
    if (isLast) onDone()
    else setStep((value) => value + 1)
  }

  return (
    <div className="fixed inset-0 z-[80]" role="dialog" aria-modal="true" aria-label="Обучение">
      {rect ? (
        <div
          className="pointer-events-none fixed rounded-2xl transition-[top,left,width,height] duration-200 eyepaint-coach-spot"
          style={{
            top: rect.top - pad,
            left: rect.left - pad,
            width: rect.width + pad * 2,
            height: rect.height + pad * 2,
          }}
          aria-hidden="true"
        />
      ) : (
        <div
          className="pointer-events-none fixed inset-0 bg-[rgba(10,14,18,0.78)]"
          aria-hidden="true"
        />
      )}

      <div className="fixed inset-0" aria-hidden="true" />

      {stemPath && (
        <svg
          className="pointer-events-none fixed inset-0 z-[81] h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="eyepaint-coach-stem" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--glass-fill-strong)" stopOpacity="0.95" />
              <stop offset="55%" stopColor="var(--glass-border)" stopOpacity="0.85" />
              <stop offset="100%" stopColor="var(--chip-accent-fg)" stopOpacity="0.55" />
            </linearGradient>
            <filter id="eyepaint-coach-stem-blur" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
            </filter>
          </defs>
          <path
            d={stemPath}
            fill="url(#eyepaint-coach-stem)"
            stroke="var(--glass-border)"
            strokeWidth="1"
            strokeOpacity="0.65"
            filter="url(#eyepaint-coach-stem-blur)"
          />
          <path
            d={stemPath}
            fill="url(#eyepaint-coach-stem)"
            fillOpacity="0.92"
            stroke="color-mix(in srgb, var(--fg-strong) 18%, transparent)"
            strokeWidth="0.75"
          />
        </svg>
      )}

      <div
        ref={cardRef}
        className="eyepaint-glass eyepaint-coach-card animate-rise-in rounded-3xl p-4 text-[var(--fg)] sm:p-5"
        style={cardStyle}
      >
        <p className="text-[0.72rem] font-semibold tracking-[0.08em] text-[var(--chip-accent-fg)] uppercase">
          {label} · {step + 1}/{total}
        </p>
        <h2 className="mt-1.5 font-[family-name:var(--font-display)] text-lg font-bold leading-snug text-[var(--fg-strong)] sm:text-xl">
          {current.title}
        </h2>
        <p className="mt-2 text-[0.9rem] leading-relaxed text-[var(--fg-muted)]">{current.body}</p>
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] font-semibold text-[var(--fg-strong)]"
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
