import type { GuideKind } from '../lib/studioTools'

type GuideOverlayProps = {
  kind: GuideKind
  opacity: number
}

export function GuideOverlay({ kind, opacity }: GuideOverlayProps) {
  if (kind === 'none' || opacity <= 0.02) return null

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity }}
    >
      {kind === 'thirds' && (
        <>
          <line x1="33.3" y1="0" x2="33.3" y2="100" stroke="white" strokeWidth="0.35" />
          <line x1="66.6" y1="0" x2="66.6" y2="100" stroke="white" strokeWidth="0.35" />
          <line x1="0" y1="33.3" x2="100" y2="33.3" stroke="white" strokeWidth="0.35" />
          <line x1="0" y1="66.6" x2="100" y2="66.6" stroke="white" strokeWidth="0.35" />
        </>
      )}
      {kind === 'face' && (
        <>
          <ellipse cx="50" cy="42" rx="18" ry="24" fill="none" stroke="#ffd9bd" strokeWidth="0.5" />
          <line x1="50" y1="18" x2="50" y2="66" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="32" y1="40" x2="68" y2="40" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="36" y1="52" x2="64" y2="52" stroke="#ffd9bd" strokeWidth="0.3" strokeDasharray="1.5 1" />
        </>
      )}
      {kind === 'figure' && (
        <>
          <line x1="50" y1="8" x2="50" y2="92" stroke="#ffd9bd" strokeWidth="0.4" />
          <circle cx="50" cy="14" r="5" fill="none" stroke="#ffd9bd" strokeWidth="0.45" />
          <line x1="35" y1="28" x2="65" y2="28" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="50" y1="28" x2="38" y2="55" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="50" y1="28" x2="62" y2="55" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="50" y1="48" x2="40" y2="88" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="50" y1="48" x2="60" y2="88" stroke="#ffd9bd" strokeWidth="0.35" />
        </>
      )}
    </svg>
  )
}
