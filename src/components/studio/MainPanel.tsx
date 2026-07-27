import type {
  CalcModeSettings,
  GuideKind,
  GuideSettings,
  LoupeSettings,
} from '../../lib/studioTools'
import {
  GUIDE_LABELS,
  GUIDE_TITLES,
  LOUPE_SIZE_MAX,
  LOUPE_SIZE_MIN,
  LOUPE_ZOOM_OPTIONS,
} from '../../lib/studioTools'
import type { SessionShot } from '../../lib/sessionGallery'
import { SHOT_KIND_LABEL } from '../../lib/sessionGallery'
import { StableLabel } from './StableLabel'
import {
  chipAccentClass,
  chipNeutralClass,
  cn,
  mutedTextClass,
  panelCardClass,
  panelClass,
  rangeInputClass,
  rowClass,
  sectionTitleClass,
  sliderLabelsClass,
  toggleChipClass,
} from './studioUi'

const GUIDE_KIND_OPTIONS: GuideKind[] = ['none', 'thirds', 'face', 'figure']
const SESSION_OPTIONS = [25, 45, 90] as const

export type MainPanelFocus = 'all' | 'hand' | 'loupe' | 'calc' | 'guides'

type MainPanelProps = {
  focus?: MainPanelFocus
  opacity: number
  onOpacity: (value: number) => void
  calcMode: CalcModeSettings
  onCalcMode: (next: CalcModeSettings | ((prev: CalcModeSettings) => CalcModeSettings)) => void
  guides: GuideSettings
  onGuides: (next: GuideSettings | ((prev: GuideSettings) => GuideSettings)) => void
  loupe: LoupeSettings
  onLoupeChange: (next: LoupeSettings | ((prev: LoupeSettings) => LoupeSettings)) => void
  onLoupeToggle: () => void
  sessionMins: null | 25 | 45 | 90
  sessionRemainingLabel: string | null
  onStartSession: (minutes: 25 | 45 | 90) => void
  usingPhoneCam: boolean
  remoteFrozen: boolean
  remoteTorch: boolean
  onToggleFreeze: () => void
  onToggleTorch: () => void
  galleryEnabled: boolean
  autoSessionShot: boolean
  onAutoSessionShot: (value: boolean) => void
  shots: SessionShot[]
  onProgressShot: () => void
  onDownloadShot: (shot: SessionShot) => void
  onClearShots: () => void
  atmosphere: 'dark' | 'light'
  atmosphereEnabled: boolean
  onAtmosphere: (value: 'dark' | 'light') => void
}

export function MainPanel(props: MainPanelProps) {
  const focus = props.focus ?? 'all'
  const show = (section: MainPanelFocus | 'session' | 'phone') => {
    if (focus === 'all') return true
    if (focus === 'hand') return section === 'hand' || section === 'session' || section === 'phone'
    return focus === section
  }

  return (
    <div className={panelClass}>
      {show('hand') && (
        <div>
          <div className={sliderLabelsClass}>
            <span>Прозрачность</span>
            <span>{Math.round(props.opacity * 100)}%</span>
          </div>
          <input
            className={rangeInputClass}
            type="range"
            min={0.05}
            max={1}
            step={0.01}
            value={props.opacity}
            onChange={(event) => props.onOpacity(Number(event.target.value))}
            aria-label="Прозрачность референса"
          />
        </div>
      )}

      {show('calc') && (
        <div className={panelCardClass}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div>
              <p className={sectionTitleClass}>Режим кальки</p>
              <p className={`mt-0.5 ${mutedTextClass}`}>Подсвечивает лист через камеру</p>
            </div>
            <button
              type="button"
              className={`${chipAccentClass(props.calcMode.enabled)} ${toggleChipClass}`}
              aria-pressed={props.calcMode.enabled}
              onClick={() =>
                props.onCalcMode((prev) => ({
                  ...prev,
                  enabled: !prev.enabled,
                }))
              }
            >
              <StableLabel active={props.calcMode.enabled} on="Вкл" off="Выкл" />
            </button>
          </div>
          {props.calcMode.enabled && (
            <div>
              <div className={sliderLabelsClass}>
                <span>Сила</span>
                <span>{Math.round(props.calcMode.strength * 100)}%</span>
              </div>
              <input
                className={rangeInputClass}
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={props.calcMode.strength}
                onChange={(event) =>
                  props.onCalcMode((prev) => ({
                    ...prev,
                    strength: Number(event.target.value),
                  }))
                }
                aria-label="Сила режима кальки"
              />
            </div>
          )}
        </div>
      )}

      {show('hand') && props.atmosphereEnabled && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={chipAccentClass(props.atmosphere === 'dark')}
            onClick={() => props.onAtmosphere('dark')}
          >
            Тёмная
          </button>
          <button
            type="button"
            className={chipAccentClass(props.atmosphere === 'light')}
            onClick={() => props.onAtmosphere('light')}
          >
            Светлая
          </button>
        </div>
      )}

      {show('guides') && (
        <div className={panelCardClass}>
          <p className={sectionTitleClass}>Направляющие</p>
          <div className="grid grid-cols-4 gap-2">
            {GUIDE_KIND_OPTIONS.map((kind) => (
              <button
                key={kind}
                type="button"
                title={GUIDE_TITLES[kind]}
                className={chipAccentClass(props.guides.kind === kind)}
                onClick={() => props.onGuides((prev) => ({ ...prev, kind }))}
              >
                {GUIDE_LABELS[kind]}
              </button>
            ))}
          </div>
          {props.guides.kind !== 'none' && (
            <div>
              <div className={sliderLabelsClass}>
                <span>Прозрачность сетки</span>
                <span>{Math.round(props.guides.opacity * 100)}%</span>
              </div>
              <input
                className={rangeInputClass}
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={props.guides.opacity}
                onChange={(event) =>
                  props.onGuides((prev) => ({
                    ...prev,
                    opacity: Number(event.target.value),
                  }))
                }
                aria-label="Прозрачность направляющих"
              />
            </div>
          )}
        </div>
      )}

      {show('loupe') && (
        <div className={panelCardClass}>
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <div>
              <p className={sectionTitleClass}>Лупа</p>
              <p className={`mt-0.5 ${mutedTextClass}`}>
                Увеличивает камеру и референс под курсором
              </p>
            </div>
            <button
              type="button"
              className={`${chipAccentClass(props.loupe.enabled)} ${toggleChipClass}`}
              aria-pressed={props.loupe.enabled}
              onClick={props.onLoupeToggle}
            >
              <StableLabel active={props.loupe.enabled} on="Вкл" off="Выкл" />
            </button>
          </div>
          {props.loupe.enabled && (
            <>
              <div>
                <div className={sliderLabelsClass}>
                  <span>Размер</span>
                  <span>{Math.round(props.loupe.size)}px</span>
                </div>
                <input
                  className={rangeInputClass}
                  type="range"
                  min={LOUPE_SIZE_MIN}
                  max={LOUPE_SIZE_MAX}
                  step={4}
                  value={props.loupe.size}
                  onChange={(event) =>
                    props.onLoupeChange((prev) => ({
                      ...prev,
                      size: Number(event.target.value),
                    }))
                  }
                  aria-label="Размер лупы"
                />
              </div>
              <div>
                <div className={sliderLabelsClass}>
                  <span>Увеличение</span>
                  <span>{props.loupe.zoom}×</span>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {LOUPE_ZOOM_OPTIONS.map((zoom) => (
                    <button
                      key={zoom}
                      type="button"
                      className={chipAccentClass(props.loupe.zoom === zoom)}
                      onClick={() => props.onLoupeChange((prev) => ({ ...prev, zoom }))}
                    >
                      {zoom}×
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {show('session') && (
        <div className={panelCardClass}>
          <div className="flex min-h-8 items-center justify-between gap-2">
            <p className={sectionTitleClass}>Сессия</p>
            <span
              className={cn(
                'min-w-[3.5rem] rounded-full border px-2.5 py-1 text-center text-[0.78rem] font-bold [font-variant-numeric:tabular-nums]',
                props.sessionRemainingLabel
                  ? 'border-accent/35 bg-accent/15 text-[var(--chip-accent-fg)]'
                  : 'border-transparent text-transparent',
              )}
              aria-hidden={!props.sessionRemainingLabel}
            >
              {props.sessionRemainingLabel ?? '0:00'}
            </span>
          </div>
          <div className={rowClass}>
            {SESSION_OPTIONS.map((minutes) => (
              <button
                key={minutes}
                type="button"
                className={chipAccentClass(props.sessionMins === minutes)}
                onClick={() => props.onStartSession(minutes)}
              >
                {minutes} мин
              </button>
            ))}
          </div>
          {props.galleryEnabled && (
            <>
              <label className="flex min-h-8 items-center justify-between gap-2 text-[0.78rem] text-[var(--fg-muted)]">
                <span className="min-w-0 leading-snug">Авто-снимок «до»</span>
                <input
                  type="checkbox"
                  className="shrink-0"
                  checked={props.autoSessionShot}
                  onChange={(event) => props.onAutoSessionShot(event.target.checked)}
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" className={chipNeutralClass} onClick={props.onProgressShot}>
                  Снимок прогресса
                </button>
                <button
                  type="button"
                  className={chipNeutralClass}
                  disabled={props.shots.length === 0}
                  onClick={props.onClearShots}
                >
                  Очистить галерею
                </button>
              </div>
              {props.shots.length > 0 && (
                <div className="flex gap-2 overflow-x-auto py-1 eyepaint-scroll">
                  {props.shots.map((shot) => (
                    <button
                      key={shot.id}
                      type="button"
                      className="relative h-16 w-16 flex-none overflow-hidden rounded-xl border border-[var(--glass-border)]"
                      title={`${SHOT_KIND_LABEL[shot.kind]} · скачать`}
                      onClick={() => props.onDownloadShot(shot)}
                    >
                      <img src={shot.dataUrl} alt="" className="h-full w-full object-cover" />
                      <span className="absolute inset-x-0 bottom-0 bg-[color-mix(in_srgb,var(--ink-deep)_75%,transparent)] text-center text-[0.62rem] text-[var(--fg-strong)]">
                        {SHOT_KIND_LABEL[shot.kind]}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {show('phone') && props.usingPhoneCam && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={chipAccentClass(props.remoteFrozen)}
            aria-pressed={props.remoteFrozen}
            onClick={props.onToggleFreeze}
          >
            Заморозка
          </button>
          <button
            type="button"
            className={chipAccentClass(props.remoteTorch)}
            aria-pressed={props.remoteTorch}
            onClick={props.onToggleTorch}
          >
            Фонарик
          </button>
        </div>
      )}
    </div>
  )
}
