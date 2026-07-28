import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import type { CoachStep } from '../lib/onboarding'
import { cn, ctaPrimaryClass, ctaSecondaryClass } from './studio/studioUi'

type OnboardingProps = {
  steps: readonly CoachStep[]
  onDone: () => void
  /** Подпись счётчика, напр. «Старт» / «Студия» */
  label?: string
}

type Rect = { top: number; left: number; width: number; height: number; cx: number; cy: number }
type Side = 'top' | 'bottom' | 'left' | 'right'
type ViewportBox = {
  left: number
  top: number
  width: number
  height: number
  padX: number
  padY: number
}

function readSafeInset(side: 'top' | 'right' | 'bottom' | 'left') {
  if (typeof window === 'undefined') return 0
  const raw = getComputedStyle(document.documentElement)
    .getPropertyValue(`--safe-${side}`)
    .trim()
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

function readViewport(): ViewportBox {
  const vv = window.visualViewport
  const width = vv?.width ?? window.innerWidth
  const height = vv?.height ?? window.innerHeight
  const left = vv?.offsetLeft ?? 0
  const top = vv?.offsetTop ?? 0
  const padX = Math.max(12, readSafeInset('left') + 8, readSafeInset('right') + 8)
  const padY = Math.max(12, readSafeInset('top') + 8, readSafeInset('bottom') + 8)
  return { left, top, width, height, padX, padY }
}

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

function sideFits(side: Side, space: Record<Side, number>, cardW: number, cardH: number) {
  const gap = 20
  const need = side === 'top' || side === 'bottom' ? cardH + gap + 24 : cardW + gap + 24
  return space[side] >= need
}

function pickPlacement(
  step: CoachStep,
  rect: Rect | null,
  cardW: number,
  cardH: number,
  viewport: ViewportBox,
  narrow: boolean,
): Side {
  if (!rect) return 'bottom'
  const space: Record<Side, number> = {
    top: rect.top - viewport.top,
    bottom: viewport.top + viewport.height - (rect.top + rect.height),
    left: rect.left - viewport.left,
    right: viewport.left + viewport.width - (rect.left + rect.width),
  }

  const preferred =
    step.placement && step.placement !== 'auto' ? (step.placement as Side) : null

  // На узком экране боковые карточки часто вылезают — предпочитаем верх/низ.
  const order: Side[] = narrow
    ? ['bottom', 'top', 'right', 'left']
    : ['bottom', 'top', 'right', 'left']

  if (preferred && (!narrow || preferred === 'top' || preferred === 'bottom')) {
    if (sideFits(preferred, space, cardW, cardH)) return preferred
  }

  for (const side of order) {
    if (sideFits(side, space, cardW, cardH)) return side
  }
  return space.bottom >= space.top ? 'bottom' : 'top'
}

function clampCard(
  left: number,
  top: number,
  cardW: number,
  cardH: number,
  viewport: ViewportBox,
) {
  const minL = viewport.left + viewport.padX
  const maxL = viewport.left + viewport.width - cardW - viewport.padX
  const minT = viewport.top + viewport.padY
  const maxT = viewport.top + viewport.height - cardH - viewport.padY
  return {
    left: Math.min(Math.max(left, minL), Math.max(minL, maxL)),
    top: Math.min(Math.max(top, minT), Math.max(minT, maxT)),
  }
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

  const pull = side === 'left' || side === 'right' ? 0.45 : 0.42
  const c1x = ax + (tip.x - ax) * 0.22
  const c1y = ay + (tip.y - ay) * 0.22
  const c2x = ax + (tip.x - ax) * pull
  const c2y = ay + (tip.y - ay) * pull

  const dx = tip.x - ax
  const dy = tip.y - ay
  const len = Math.hypot(dx, dy) || 1
  const px = (-dy / len) * Math.min(28, len * 0.12)
  const py = (dx / len) * Math.min(28, len * 0.12)

  const m1x = c1x + px * 0.35
  const m1y = c1y + py * 0.35
  const m2x = c2x + px
  const m2y = c2y + py

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
  const [cardBox, setCardBox] = useState({ width: 320, height: 220 })
  const [viewport, setViewport] = useState<ViewportBox>(() =>
    typeof window !== 'undefined'
      ? readViewport()
      : { left: 0, top: 0, width: 390, height: 844, padX: 12, padY: 12 },
  )
  const cardRef = useRef<HTMLDivElement | null>(null)
  const current = steps[step]
  const total = steps.length

  const measure = useCallback(() => {
    if (!current) return
    setViewport(readViewport())
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
  }, [measureCard, step, rect, viewport])

  useEffect(() => {
    const onWin = () => {
      measure()
      measureCard()
    }
    window.addEventListener('resize', onWin)
    window.addEventListener('scroll', onWin, true)
    window.visualViewport?.addEventListener('resize', onWin)
    window.visualViewport?.addEventListener('scroll', onWin)
    const t1 = window.setTimeout(onWin, 80)
    const t2 = window.setTimeout(onWin, 280)
    return () => {
      window.removeEventListener('resize', onWin)
      window.removeEventListener('scroll', onWin, true)
      window.visualViewport?.removeEventListener('resize', onWin)
      window.visualViewport?.removeEventListener('scroll', onWin)
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
  const narrow = viewport.width < 640
  const cardW = Math.min(340, Math.max(240, viewport.width - viewport.padX * 2))
  const maxCardH = Math.max(160, viewport.height - viewport.padY * 2)
  const cardH = Math.min(cardBox.height || 220, maxCardH)
  const placement = pickPlacement(current, rect, cardW, cardH, viewport, narrow)
  const pad = 10

  let cardStyle: CSSProperties = {
    position: 'fixed',
    width: cardW,
    maxWidth: `calc(100vw - ${viewport.padX * 2}px)`,
    maxHeight: maxCardH,
    overflowY: 'auto',
    WebkitOverflowScrolling: 'touch',
    zIndex: 82,
    boxSizing: 'border-box',
  }

  let tipPoint: { x: number; y: number } | null = null
  let cardGeom: { left: number; top: number; width: number; height: number } | null = null

  if (!rect) {
    const left = viewport.left + (viewport.width - cardW) / 2
    const top = viewport.top + (viewport.height - cardH) / 2
    const clamped = clampCard(left, top, cardW, cardH, viewport)
    cardStyle.left = clamped.left
    cardStyle.top = clamped.top
    cardGeom = { left: clamped.left, top: clamped.top, width: cardW, height: cardH }
  } else {
    const gap = 18
    let left = viewport.left + viewport.padX
    let top = viewport.top + viewport.padY

    if (placement === 'bottom') {
      left = rect.cx - cardW / 2
      top = rect.top + rect.height + gap
      tipPoint = { x: rect.cx, y: rect.top + rect.height + 1 }
    } else if (placement === 'top') {
      left = rect.cx - cardW / 2
      top = rect.top - gap - cardH
      tipPoint = { x: rect.cx, y: rect.top - 1 }
    } else if (placement === 'right') {
      left = rect.left + rect.width + gap
      top = rect.cy - cardH / 2
      tipPoint = { x: rect.left + rect.width + 1, y: rect.cy }
    } else {
      left = rect.left - gap - cardW
      top = rect.cy - cardH / 2
      tipPoint = { x: rect.left - 1, y: rect.cy }
    }

    const clamped = clampCard(left, top, cardW, cardH, viewport)
    cardStyle.left = clamped.left
    cardStyle.top = clamped.top
    cardGeom = { left: clamped.left, top: clamped.top, width: cardW, height: cardH }
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
          className="pointer-events-none fixed inset-0 z-[81] h-full w-full overflow-hidden"
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
          <button type="button" className={cn(ctaSecondaryClass, 'flex-1')} onClick={onDone}>
            Пропустить
          </button>
          <button type="button" className={cn(ctaPrimaryClass, 'flex-1')} onClick={goNext}>
            {isLast ? 'Готово' : 'Дальше'}
          </button>
        </div>
      </div>
    </div>
  )
}
