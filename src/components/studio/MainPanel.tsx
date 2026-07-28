import type { ReactNode } from 'react'
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
import { CornerAction, TrashIcon } from './CornerAction'
import { PanelTabs } from './PanelTabs'
import {
  chipAccentClass,
  chipNeutralClass,
  cn,
  fieldLabelClass,
  panelClass,
  rangeInputClass,
  rowClass,
  sectionDividerClass,
  sliderLabelsClass,
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
}

function Section({
  show,
  first,
  children,
}: {
  show: boolean
  first: boolean
  children: ReactNode
}) {
  if (!show) return null
  return <div className={first ? undefined : sectionDividerClass}>{children}</div>
}

export function MainPanel(props: MainPanelProps) {
  const focus = props.focus ?? 'all'

  if (focus === 'hand') {
    const tabs = [
      {
        id: 'ref',
        label: 'Референс',
        content: (
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
        ),
      },
      {
        id: 'session',
        label: 'Сессия',
        content: (
          <div className="relative grid gap-2 pb-11">
            <div className="flex min-h-7 items-center justify-between gap-2">
              <p className={fieldLabelClass}>Таймер</p>
              <span
                className={cn(
                  'inline-flex min-h-7 min-w-[3.5rem] items-center justify-center rounded-full border px-2.5 py-1 text-center text-[0.78rem] font-bold leading-none [font-variant-numeric:tabular-nums]',
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
                <button type="button" className={chipNeutralClass} onClick={props.onProgressShot}>
                  Снимок прогресса
                </button>
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
                <CornerAction
                  label="Очистить галерею"
                  disabled={props.shots.length === 0}
                  onClick={props.onClearShots}
                >
                  <TrashIcon />
                </CornerAction>
              </>
            )}
          </div>
        ),
      },
      ...(props.usingPhoneCam
        ? [
            {
              id: 'phone',
              label: 'Телефон',
              content: (
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
              ),
            },
          ]
        : []),
    ]

    return <PanelTabs tabs={tabs} storageKey="eyepaint-hand-tab" />
  }

  const show = (section: MainPanelFocus) => focus === 'all' || focus === section
  const hasCalc = show('calc')
  const hasGuides = show('guides')
  const hasLoupe = show('loupe')

  let sectionIndex = 0
  const mark = (visible: boolean) => {
    if (!visible) return { show: false, first: false }
    const first = sectionIndex === 0
    sectionIndex += 1
    return { show: true, first }
  }
  const calcSec = mark(hasCalc)
  const guidesSec = mark(hasGuides)
  const loupeSec = mark(hasLoupe)

  return (
    <div className={cn(panelClass, 'gap-0')}>
      <Section show={calcSec.show} first={calcSec.first}>
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
      </Section>

      <Section show={guidesSec.show} first={guidesSec.first}>
        <div className="grid gap-2">
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
      </Section>

      <Section show={loupeSec.show} first={loupeSec.first}>
        <div className="grid gap-3">
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
        </div>
      </Section>
    </div>
  )
}
