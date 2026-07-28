import { markerAssetUrl, type ArPhase, type ArViewMode } from '../../lib/arPlane'
import { cn } from './studioUi'

type ArModeBarProps = {
  mode: ArViewMode
  phase: ArPhase
  progress: number
  detectorReady: boolean
  onMode: (mode: ArViewMode) => void
  onRecalibrate: () => void
}

export function ArModeBar({
  mode,
  phase,
  progress,
  detectorReady,
  onMode,
  onRecalibrate,
}: ArModeBarProps) {
  const status =
    mode === 'free'
      ? null
      : phase === 'hunting'
        ? detectorReady
          ? 'Ищи маркер…'
          : 'Готовлю AR…'
        : phase === 'locked'
          ? 'Плоскость зафиксирована · маркер можно убрать'
          : null

  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 justify-self-center">
      <div
        className="flex items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--chip-solid)] p-0.5 shadow-[var(--shadow-glass)]"
        role="tablist"
        aria-label="Режим сцены"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'free'}
          className={cn(
            'min-h-8 rounded-full px-3 text-[0.72rem] font-semibold leading-none transition-colors',
            mode === 'free'
              ? 'bg-accent/90 text-accent-ink'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-strong)]',
          )}
          onClick={() => onMode('free')}
        >
          Свободный
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'ar'}
          className={cn(
            'min-h-8 rounded-full px-3 text-[0.72rem] font-semibold leading-none transition-colors',
            mode === 'ar'
              ? 'bg-accent/90 text-accent-ink'
              : 'text-[var(--fg-muted)] hover:text-[var(--fg-strong)]',
          )}
          onClick={() => onMode('ar')}
        >
          AR
        </button>
      </div>

      {mode === 'ar' && (
        <div className="flex max-w-[min(92vw,22rem)] flex-wrap items-center justify-center gap-1.5">
          {status && (
            <p className="truncate text-center text-[0.68rem] text-[var(--fg-muted)]">{status}</p>
          )}
          {phase === 'hunting' && (
            <div
              className="h-1 w-24 overflow-hidden rounded-full bg-[var(--glass-fill-strong)]"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-accent transition-[width] duration-200"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
          )}
          {phase === 'locked' && (
            <button
              type="button"
              className="inline-flex min-h-7 items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-2.5 text-[0.68rem] font-semibold text-[var(--fg-strong)]"
              onClick={onRecalibrate}
            >
              Перекалибровать
            </button>
          )}
          <a
            className="inline-flex min-h-7 items-center rounded-full border border-[var(--glass-border-soft)] px-2.5 text-[0.68rem] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg-strong)]"
            href={markerAssetUrl('eyepaint-ar-marker-card.png')}
            download="eyepaint-ar-marker.png"
            target="_blank"
            rel="noreferrer"
          >
            Маркер
          </a>
        </div>
      )}
    </div>
  )
}
