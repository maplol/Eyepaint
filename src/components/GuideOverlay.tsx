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
          <line x1="33.33" y1="0" x2="33.33" y2="100" stroke="white" strokeWidth="0.32" />
          <line x1="66.67" y1="0" x2="66.67" y2="100" stroke="white" strokeWidth="0.32" />
          <line x1="0" y1="33.33" x2="100" y2="33.33" stroke="white" strokeWidth="0.32" />
          <line x1="0" y1="66.67" x2="100" y2="66.67" stroke="white" strokeWidth="0.32" />
        </>
      )}
      {kind === 'face' && (
        <>
          {/* 3/4-friendly oval, slightly off-center */}
          <ellipse cx="52" cy="40" rx="17" ry="23" fill="none" stroke="#ffd9bd" strokeWidth="0.5" />
          {/* vertical face axis */}
          <line x1="54" y1="17" x2="52" y2="63" stroke="#ffd9bd" strokeWidth="0.32" />
          {/* brow / eye line */}
          <line x1="36" y1="38" x2="68" y2="36" stroke="#ffd9bd" strokeWidth="0.32" />
          {/* nose base */}
          <line x1="40" y1="48" x2="64" y2="48" stroke="#ffd9bd" strokeWidth="0.28" strokeDasharray="1.4 1" />
          {/* mouth */}
          <line x1="42" y1="55" x2="62" y2="55" stroke="#ffd9bd" strokeWidth="0.28" strokeDasharray="1.4 1" />
        </>
      )}
      {kind === 'figure' && (
        <>
          {/* upright 8-head stick: straight spine, level shoulders/hips */}
          <line x1="50" y1="4" x2="50" y2="96" stroke="#ffd9bd" strokeWidth="0.35" />
          <circle cx="50" cy="10" r="5" fill="none" stroke="#ffd9bd" strokeWidth="0.45" />
          {/* shoulders */}
          <line x1="34" y1="20" x2="66" y2="20" stroke="#ffd9bd" strokeWidth="0.35" />
          {/* arms hang nearly vertical */}
          <line x1="34" y1="20" x2="32" y2="48" stroke="#ffd9bd" strokeWidth="0.32" />
          <line x1="66" y1="20" x2="68" y2="48" stroke="#ffd9bd" strokeWidth="0.32" />
          {/* hips */}
          <line x1="38" y1="48" x2="62" y2="48" stroke="#ffd9bd" strokeWidth="0.32" />
          {/* legs straight */}
          <line x1="42" y1="48" x2="40" y2="92" stroke="#ffd9bd" strokeWidth="0.35" />
          <line x1="58" y1="48" x2="60" y2="92" stroke="#ffd9bd" strokeWidth="0.35" />
        </>
      )}
    </svg>
  )
}
