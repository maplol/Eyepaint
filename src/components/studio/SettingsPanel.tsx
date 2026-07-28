import type { Dispatch, SetStateAction, ReactNode } from 'react'
import type { FeatureFlags } from '../../lib/flags'
import {
  DEFAULT_HOTKEYS,
  HOTKEY_LABELS,
  type HotkeyAction,
  type HotkeyMap,
} from '../../lib/hotkeys'
import type { StudioAtmosphere } from '../../lib/theme'
import { getHelpTip } from '../../lib/helpTips'
import { CornerAction, PanelFrame, ResetIcon, TrashIcon } from './CornerAction'
import { HoverTooltip } from './HoverTooltip'
import {
  chipAccentClass,
  chipBaseClass,
  chipNeutralClass,
  cn,
  poseSaveClass,
  rowClass,
  sectionDividerClass,
  tipClass,
} from './studioUi'

export type SettingsSection = 'link' | 'keys' | 'flags' | 'project' | 'theme'

type SettingsPanelProps = {
  section: SettingsSection
  onSection: (section: SettingsSection) => void
  onClose: () => void
  roomEnabled: boolean
  roomCode: string
  qrDataUrl: string | null
  roomJoinUrl: string | null
  roomStatus: string
  roomError: string | null
  trackInfo: string | null
  onCopyCode: () => void
  onNewCode: () => void
  onDisableRoom: () => void
  onEnableRoom: () => void
  hotkeys: HotkeyMap
  listeningFor: HotkeyAction | null
  setListeningFor: Dispatch<SetStateAction<HotkeyAction | null>>
  formatHotkey: (code: string) => string
  setHotkeys: Dispatch<SetStateAction<HotkeyMap>>
  onHotkeysResetToast: () => void
  flags: FeatureFlags
  onFlags: Dispatch<SetStateAction<FeatureFlags>>
  onSaveProject: () => void
  onClearAutosave: () => void
  savingProject: boolean
  autosaveLabel: string | null
  atmosphere: StudioAtmosphere
  onAtmosphere: (value: StudioAtmosphere) => void
}

const NAV: Array<{
  id: SettingsSection
  label: string
  tipId: string
  icon: ReactNode
}> = [
  {
    id: 'link',
    label: 'Связь',
    tipId: 'settings-link',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M10 14a5 5 0 0 0 7.1.1l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
        <path
          d="M14 10a5 5 0 0 0-7.1-.1l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'keys',
    label: 'Клавиши',
    tipId: 'settings-keys',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'theme',
    label: 'Тема',
    tipId: 'settings-theme',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.7" />
        <path
          d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    id: 'flags',
    label: 'Флаги',
    tipId: 'settings-flags',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M5 4v16M5 5h11l-1.5 3.5L16 12H5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'project',
    label: 'Проект',
    tipId: 'settings-project',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

const FLAG_LABELS: Array<[keyof FeatureFlags, string, string]> = [
  ['multiLayers', 'Слои референса', 'Несколько картинок, DnD и меню слоёв'],
  ['brushMask', 'Кисть-маска', 'Рисовать зону для фильтра цветов'],
  ['sessionGallery', 'Галерея до/после', 'Снимки прогресса в сессии'],
  ['lessons', 'Уроки на Welcome', 'Карточки уроков на старте'],
  ['lightTheme', 'Светлая тема', 'Разрешить светлую атмосферу UI'],
  ['arPlaneLock', 'AR плоскость', 'Режим Свободный|AR: маркер → lock плоскости листа'],
  ['guideLayers', 'Гиды как слой', 'Пресеты и фигуры на отдельном слое с тем же transform'],
]

const STATUS_LABEL: Record<string, string> = {
  idle: 'Не активна',
  connecting: 'Подключаюсь…',
  connected: 'Телефон на связи',
  error: 'Ошибка связи',
}

export function SettingsPanel(props: SettingsPanelProps) {
  const statusText =
    props.roomStatus === 'connected'
      ? `${STATUS_LABEL.connected}${props.trackInfo ? ` · ${props.trackInfo}` : ''}`
      : props.roomError || STATUS_LABEL[props.roomStatus] || props.roomStatus

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-ink-deep/55 p-3 pb-[max(0.75rem,var(--safe-bottom))] pt-[max(0.75rem,var(--safe-top))] backdrop-blur-sm sm:p-5"
      role="presentation"
      onClick={props.onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки"
        translate="no"
        className="eyepaint-glass relative flex max-h-[min(88dvh,640px)] w-full max-w-[560px] flex-col overflow-hidden rounded-3xl animate-[rise-in_0.28s_ease_both]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[var(--glass-border-soft)] px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-[var(--fg-strong)]">Настройки</p>
            <HoverTooltip label={getHelpTip('studio-settings')?.body ?? ''}>
              <button
                type="button"
                className="grid h-6 w-6 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] text-[0.7rem] font-bold text-[var(--fg-muted)]"
                aria-label="Краткая подсказка"
              >
                ?
              </button>
            </HoverTooltip>
          </div>
          <button
            type="button"
            className="inline-flex min-h-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] px-3 py-1.5 text-[0.78rem] font-semibold leading-none text-[var(--fg-strong)]"
            onClick={props.onClose}
          >
            Закрыть
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[auto_1fr] overflow-hidden">
          <nav
            className="flex w-[4.25rem] flex-col items-center gap-0 self-stretch border-r border-[var(--glass-border-soft)] py-2 sm:w-[4.6rem]"
            aria-label="Разделы настроек"
          >
            {NAV.map((item, index) => (
              <div key={item.id} className="flex w-full flex-col items-center">
                {index > 0 && (
                  <span className="my-1 h-px w-7 bg-[var(--glass-border-soft)]" aria-hidden="true" />
                )}
                <button
                  type="button"
                  className={cn(
                    'grid h-11 w-11 place-items-center rounded-xl transition-colors',
                    props.section === item.id
                      ? 'bg-accent/20 text-[var(--chip-accent-fg)] ring-1 ring-accent/45'
                      : 'text-[var(--fg-muted)] hover:bg-[var(--glass-fill)] hover:text-[var(--fg-strong)]',
                  )}
                  aria-label={item.label}
                  aria-current={props.section === item.id ? 'page' : undefined}
                  title={item.label}
                  data-help={item.tipId}
                  onClick={() => props.onSection(item.id)}
                >
                  {item.icon}
                </button>
              </div>
            ))}
          </nav>

          <div className="relative flex min-h-0 flex-col overflow-hidden px-4 py-3.5">
            {props.section === 'link' && (
              <div className="min-h-0 flex-1 overflow-auto overscroll-contain eyepaint-scroll">
              <div className="grid gap-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[0.78rem] font-semibold text-[var(--fg-muted)]">Телефон как камера</p>
                  <span
                    className={cn(
                      'inline-flex min-h-7 items-center rounded-full border px-2.5 text-[0.7rem] font-semibold',
                      props.roomEnabled && props.roomStatus === 'connected'
                        ? 'border-accent/45 bg-accent/18 text-[var(--chip-accent-fg)]'
                        : 'border-[var(--glass-border-soft)] bg-[var(--glass-fill)] text-[var(--fg-muted)]',
                    )}
                  >
                    {props.roomEnabled ? statusText : 'Выкл'}
                  </span>
                </div>
                <ol className="mt-2 grid list-decimal gap-1 pl-4 text-[0.82rem] leading-snug text-[var(--fg-muted)]">
                  <li>Создай комнату — появится код и QR</li>
                  <li>На телефоне открой EYEPAINT → код или ссылка</li>
                  <li>На слабой сети бери качество 720p / 2K</li>
                </ol>

                {props.roomEnabled ? (
                  <>
                    <div className={cn(sectionDividerClass, 'grid gap-1 text-center')}>
                      <span className="text-[0.75rem] text-[var(--fg-muted)]">Код комнаты</span>
                      <strong className="font-[family-name:var(--font-display)] text-[clamp(1.4rem,4vw,1.8rem)] font-extrabold tracking-[0.18em] text-[var(--fg-strong)]">
                        {props.roomCode}
                      </strong>
                    </div>
                    {props.qrDataUrl && props.roomJoinUrl && (
                      <div className={cn(sectionDividerClass, 'grid gap-2 text-center')}>
                        <img
                          src={props.qrDataUrl}
                          alt="QR комнаты"
                          className="mx-auto h-[180px] w-[180px] rounded-2xl bg-white p-2"
                        />
                        <p className="truncate text-[0.72rem] text-[var(--fg-muted)]" title={props.roomJoinUrl}>
                          {props.roomJoinUrl}
                        </p>
                      </div>
                    )}
                    <div className={cn(sectionDividerClass, rowClass)}>
                      <button type="button" className={chipNeutralClass} onClick={props.onCopyCode}>
                        Копировать
                      </button>
                      <button type="button" className={chipNeutralClass} onClick={props.onNewCode}>
                        Новый код
                      </button>
                      <button
                        type="button"
                        className={cn(
                          chipBaseClass,
                          'border border-danger/40 bg-danger/15 text-[var(--danger-soft)]',
                        )}
                        onClick={props.onDisableRoom}
                      >
                        Отключить
                      </button>
                    </div>
                  </>
                ) : (
                  <div className={sectionDividerClass}>
                    <button type="button" className={poseSaveClass} onClick={props.onEnableRoom}>
                      Создать комнату
                    </button>
                    <p className={cn(tipClass, 'mt-2')}>
                      Код только на ПК. Качество стрима выбирается на телефоне.
                    </p>
                    </div>
                  )}
              </div>
              </div>
            )}

            {props.section === 'keys' && (
              <PanelFrame
                corner={
                  <CornerAction
                    label="Сбросить хоткеи"
                    onClick={() => {
                      props.setHotkeys({ ...DEFAULT_HOTKEYS })
                      props.onHotkeysResetToast()
                    }}
                  >
                    <ResetIcon />
                  </CornerAction>
                }
              >
                <div className="grid gap-0">
                  <p className={tipClass}>Зажми клавишу и тяни мышью. Клик по кнопке → назначь новую.</p>
                  <div className={cn(sectionDividerClass, 'grid gap-2')}>
                    {(Object.keys(HOTKEY_LABELS) as HotkeyAction[]).map((action) => (
                      <div
                        key={action}
                        className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-3 py-2.5"
                      >
                        <span className="text-[0.82rem] text-[var(--fg)]">{HOTKEY_LABELS[action]}</span>
                        <button
                          type="button"
                          className={cn(
                            'inline-flex min-h-9 min-w-[5.5rem] items-center justify-center rounded-[10px] border border-accent/40 px-2.5 text-center text-[0.78rem] font-bold leading-tight',
                            props.listeningFor === action
                              ? 'bg-accent/35 text-accent-ink'
                              : 'bg-accent/15 text-[var(--chip-accent-fg)]',
                          )}
                          onClick={() =>
                            props.setListeningFor((prev) => (prev === action ? null : action))
                          }
                        >
                          {props.listeningFor === action
                            ? 'Нажми…'
                            : props.formatHotkey(props.hotkeys[action])}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </PanelFrame>
            )}

            {props.section === 'theme' && (
              <div className="min-h-0 flex-1 overflow-auto overscroll-contain eyepaint-scroll">
                <div className="grid gap-3">
                  <p className={tipClass}>Атмосфера студии — стекло, текст и акценты.</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      className={chipAccentClass(props.atmosphere === 'dark')}
                      disabled={!props.flags.lightTheme && props.atmosphere === 'light'}
                      onClick={() => props.onAtmosphere('dark')}
                    >
                      Тёмная
                    </button>
                    <button
                      type="button"
                      className={chipAccentClass(props.atmosphere === 'light')}
                      disabled={!props.flags.lightTheme}
                      onClick={() => props.onAtmosphere('light')}
                    >
                      Светлая
                    </button>
                  </div>
                  {!props.flags.lightTheme && (
                    <p className={tipClass}>
                      Светлая тема выключена флагом — включи во вкладке «Флаги».
                    </p>
                  )}
                </div>
              </div>
            )}

            {props.section === 'flags' && (
              <div className="min-h-0 flex-1 overflow-auto overscroll-contain eyepaint-scroll">
                <div className="grid gap-0">
                  <p className={tipClass}>Фичи хранятся в localStorage этого браузера.</p>
                  <div className={cn(sectionDividerClass, 'grid gap-2')}>
                    {FLAG_LABELS.map(([key, label, hint]) => (
                      <label
                        key={key}
                        className="grid gap-1 rounded-xl border border-[var(--glass-border-soft)] bg-[var(--glass-fill)] px-3 py-2.5"
                      >
                        <span className="flex items-center justify-between gap-3 text-[0.84rem] text-[var(--fg-strong)]">
                          <span>{label}</span>
                          <input
                            type="checkbox"
                            checked={props.flags[key]}
                            onChange={(event) => {
                              const checked = event.target.checked
                              props.onFlags((prev) => ({ ...prev, [key]: checked }))
                              if (key === 'lightTheme' && !checked && props.atmosphere === 'light') {
                                props.onAtmosphere('dark')
                              }
                            }}
                          />
                        </span>
                        <span className="text-[0.72rem] text-[var(--fg-faint)]">{hint}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {props.section === 'project' && (
              <PanelFrame
                corner={
                  <CornerAction
                    label="Очистить автосейв"
                    disabled={!props.autosaveLabel}
                    onClick={props.onClearAutosave}
                  >
                    <TrashIcon />
                  </CornerAction>
                }
              >
                <div className="grid gap-0">
                  <p className={tipClass}>
                    Файл `.eyepaint.json` — слои и настройки. Автосейв переживает перезагрузку.
                  </p>
                  {props.autosaveLabel ? (
                    <p className={cn(sectionDividerClass, 'text-[0.78rem] text-[var(--fg-muted)]')}>
                      Автосейв: {props.autosaveLabel}
                    </p>
                  ) : (
                    <p className={cn(sectionDividerClass, tipClass)}>Автосейва пока нет</p>
                  )}
                  <div className={sectionDividerClass}>
                    <button
                      type="button"
                      className={poseSaveClass}
                      disabled={props.savingProject}
                      onClick={props.onSaveProject}
                    >
                      {props.savingProject ? 'Сохраняю…' : 'Сохранить проект в файл'}
                    </button>
                  </div>
                </div>
              </PanelFrame>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
