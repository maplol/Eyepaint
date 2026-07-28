import {
  formatDistanceCm,
  markerAssetUrl,
  type ArPhase,
  type ArViewMode,
} from '../../lib/arPlane'
import { cn } from './studioUi'

type ArModeBarProps = {
  mode: ArViewMode
  phase: ArPhase
  progress: number
  detectorReady: boolean
  /** Live estimate while hunting; locked value after fix */
  distanceCm?: number | null
  onMode: (mode: ArViewMode) => void
  onRecalibrate: () => void
}

export function ArModeBar({
  mode,
  phase,
  progress,
  detectorReady,
  distanceCm = null,
  onMode,
  onRecalibrate,
}: ArModeBarProps) {
  const distanceLabel = formatDistanceCm(distanceCm)

  const status =
    mode === 'free'
      ? null
      : phase === 'hunting'
        ? detectorReady
          ? 'Ищи маркер…'
          : 'Готовлю AR…'
        : phase === 'locked'
          ? 'Зафиксировано'
          : null

  const statusTitle =
    phase === 'locked'
      ? distanceLabel
        ? `Плоскость зафиксирована · ${distanceLabel} до маркера (оценка ±20%). Маркер можно убрать.`
        : 'Плоскость зафиксирована · маркер можно убрать'
      : distanceLabel
        ? `Оценка дистанции ${distanceLabel} по маркеру 90 мм (FOV≈65°)`
        : undefined

  return (
    <div className="flex min-w-0 max-w-full flex-col items-center gap-1 justify-self-center">
      <div
        className="flex max-w-full items-center gap-0.5 rounded-full border border-[var(--glass-border)] bg-[var(--chip-solid)] p-0.5 shadow-[var(--shadow-glass)]"
        role="tablist"
        aria-label="Режим сцены"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mode === 'free'}
          className={cn(
            'min-h-8 shrink-0 rounded-full px-2.5 text-[0.68rem] font-semibold leading-none transition-colors sm:px-3 sm:text-[0.72rem]',
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
            'min-h-8 shrink-0 rounded-full px-2.5 text-[0.68rem] font-semibold leading-none transition-colors sm:px-3 sm:text-[0.72rem]',
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
        <div className="flex max-w-full flex-wrap items-center justify-center gap-1 px-0.5">
          {status && (
            <p
              className="max-w-full truncate text-center text-[0.65rem] text-[var(--fg-muted)] sm:text-[0.68rem]"
              title={statusTitle}
            >
              {status}
            </p>
          )}
          {distanceLabel && (
            <span
              className="inline-flex min-h-7 items-center rounded-full border border-[var(--glass-border-soft)] bg-[var(--glass-fill-mid)] px-2 text-[0.65rem] font-semibold tabular-nums text-[var(--fg-strong)] sm:text-[0.68rem]"
              title={statusTitle}
              aria-label={`Дистанция ${distanceLabel}`}
            >
              {distanceLabel}
            </span>
          )}
          {phase === 'hunting' && (
            <div
              className="h-1 w-16 overflow-hidden rounded-full bg-[var(--glass-fill-strong)] sm:w-24"
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
              className="inline-flex min-h-7 items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-2 text-[0.65rem] font-semibold text-[var(--fg-strong)] sm:px-2.5 sm:text-[0.68rem]"
              onClick={onRecalibrate}
            >
              <span className="sm:hidden">Сброс</span>
              <span className="hidden sm:inline">Перекалибровать</span>
            </button>
          )}
          <a
            className="inline-flex min-h-7 items-center rounded-full border border-[var(--glass-border-soft)] px-2 text-[0.65rem] font-semibold text-[var(--fg-muted)] hover:text-[var(--fg-strong)] sm:px-2.5 sm:text-[0.68rem]"
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
