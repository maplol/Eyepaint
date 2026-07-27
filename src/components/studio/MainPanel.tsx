import type { CalcModeSettings, GuideKind, GuideSettings } from '../../lib/studioTools'
import { GUIDE_LABELS, GUIDE_TITLES } from '../../lib/studioTools'
import type { RefLayer } from '../../lib/layers'
import type { SessionShot } from '../../lib/sessionGallery'
import { SHOT_KIND_LABEL } from '../../lib/sessionGallery'
import { StableLabel } from './StableLabel'
import {
  chipAccentClass,
  chipFileClass,
  chipNeutralClass,
  cn,
  hiddenFileInputClass,
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

type MainPanelProps = {
  opacity: number
  onOpacity: (value: number) => void
  calcMode: CalcModeSettings
  onCalcMode: (next: CalcModeSettings | ((prev: CalcModeSettings) => CalcModeSettings)) => void
  guides: GuideSettings
  onGuides: (next: GuideSettings | ((prev: GuideSettings) => GuideSettings)) => void
  loupeOn: boolean
  onLoupeToggle: () => void
  sessionMins: null | 25 | 45 | 90
  sessionRemainingLabel: string | null
  onStartSession: (minutes: 25 | 45 | 90) => void
  usingPhoneCam: boolean
  remoteFrozen: boolean
  remoteTorch: boolean
  onToggleFreeze: () => void
  onToggleTorch: () => void
  ready: boolean
  capturing: boolean
  onCapture: () => void
  onPickFile: (file: File | undefined, source: 'gallery' | 'camera') => void
  flipped: boolean
  onFlip: () => void
  locked: boolean
  onToggleLock: () => void
  onReset: () => void
  layersEnabled: boolean
  layers: RefLayer[]
  onLayerOpacity: (id: string, opacity: number) => void
  onLayerVisible: (id: string) => void
  onRemoveLayer: (id: string) => void
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
  return (
    <div className={panelClass}>
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

      {props.atmosphereEnabled && (
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

      <div className={panelCardClass}>
        <div className="grid grid-cols-[1fr_auto] items-center gap-2">
          <div>
            <p className={sectionTitleClass}>Лупа</p>
            <p className={`mt-0.5 ${mutedTextClass}`}>
              Круг показывает точку внимания, колесо зумит 2×
            </p>
          </div>
          <button
            type="button"
            className={`${chipAccentClass(props.loupeOn)} ${toggleChipClass}`}
            aria-pressed={props.loupeOn}
            onClick={props.onLoupeToggle}
          >
            <StableLabel active={props.loupeOn} on="Вкл" off="Выкл" />
          </button>
        </div>
      </div>

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
              <div className="flex gap-2 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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

      {props.layersEnabled && props.layers.length > 0 && (
        <div className={panelCardClass}>
          <p className={sectionTitleClass}>Слои референса</p>
          {props.layers.map((layer) => (
            <div
              key={layer.id}
              className="grid gap-1.5 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-2.5 py-2"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[0.82rem] font-semibold text-[var(--fg-strong)]">
                  {layer.name}
                </span>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    className={`${chipAccentClass(layer.visible)} ${toggleChipClass}`}
                    aria-pressed={layer.visible}
                    onClick={() => props.onLayerVisible(layer.id)}
                  >
                    <StableLabel active={layer.visible} on="Вкл" off="Выкл" />
                  </button>
                  {layer.kind === 'aux' && (
                    <button
                      type="button"
                      className={`${chipNeutralClass} w-10 shrink-0`}
                      onClick={() => props.onRemoveLayer(layer.id)}
                      aria-label={`Удалить ${layer.name}`}
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
              <input
                className={rangeInputClass}
                type="range"
                min={0.05}
                max={1}
                step={0.01}
                value={layer.opacity}
                onChange={(event) => props.onLayerOpacity(layer.id, Number(event.target.value))}
                aria-label={`Прозрачность ${layer.name}`}
              />
            </div>
          ))}
          <p className={`text-center ${mutedTextClass}`}>
            Галерея/камера добавят вспомогательный слой, если основной занят
          </p>
        </div>
      )}

      {props.usingPhoneCam && (
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

      <div className="grid grid-cols-[auto_1fr] items-center gap-[0.85rem] px-[0.15rem] pb-[0.05rem] pt-[0.15rem]">
        <button
          type="button"
          className="group grid h-[4.1rem] w-[4.1rem] place-items-center rounded-full border-2 border-[var(--glass-border)] bg-[var(--glass-fill-mid)] backdrop-blur-[8px] disabled:cursor-not-allowed disabled:opacity-45"
          onClick={props.onCapture}
          disabled={!props.ready || props.capturing}
          aria-label="Сфотографировать композит"
        >
          <span className="h-[3.1rem] w-[3.1rem] rounded-full bg-[rgba(245,247,248,0.92)] shadow-[inset_0_0_0_2px_rgba(20,26,29,0.08)] transition-transform group-active:scale-[0.92]" />
        </button>
        <div>
          <p className="font-[family-name:var(--font-display)] text-base font-bold text-[var(--fg-strong)]">
            Снять фото
          </p>
          <p className="mt-[0.15rem] text-[0.82rem] text-[var(--fg-muted)]">
            Камера + референс → сохранить
          </p>
        </div>
      </div>

      <div className={rowClass}>
        <label className={chipFileClass}>
          Галерея
          <input
            className={hiddenFileInputClass}
            type="file"
            accept="image/*"
            onChange={(event) => {
              props.onPickFile(event.target.files?.[0], 'gallery')
              event.target.value = ''
            }}
          />
        </label>
        <label className={chipFileClass}>
          Камера
          <input
            className={hiddenFileInputClass}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => {
              props.onPickFile(event.target.files?.[0], 'camera')
              event.target.value = ''
            }}
          />
        </label>
        <button
          type="button"
          className={chipAccentClass(props.flipped)}
          aria-pressed={props.flipped}
          onClick={props.onFlip}
        >
          Отражение
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className={chipNeutralClass} onClick={props.onReset}>
          Сброс
        </button>
        <button
          type="button"
          className={chipAccentClass(props.locked)}
          aria-pressed={props.locked}
          onClick={props.onToggleLock}
        >
          Фиксация
        </button>
      </div>
    </div>
  )
}
