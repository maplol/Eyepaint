import type { Dispatch, SetStateAction } from 'react'
import type { FeatureFlags } from '../../lib/flags'
import {
  DEFAULT_HOTKEYS,
  HOTKEY_LABELS,
  type HotkeyAction,
  type HotkeyMap,
} from '../../lib/hotkeys'
import {
  chipBaseClass,
  chipNeutralClass,
  cn,
  panelClass,
  poseSaveClass,
  rowClass,
  sectionTitleClass,
  tipClass,
} from './studioUi'

type SettingsSection = 'link' | 'keys' | 'flags'

type SettingsPanelProps = {
  section: SettingsSection
  onSection: (section: SettingsSection) => void
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
}

const FLAG_LABELS: Array<[keyof FeatureFlags, string]> = [
  ['multiLayers', 'Слои референса'],
  ['brushMask', 'Кисть-маска'],
  ['sessionGallery', 'Галерея до/после'],
  ['lessons', 'Уроки на Welcome'],
  ['lightTheme', 'Светлая атмосфера'],
]

export function SettingsPanel(props: SettingsPanelProps) {
  return (
    <div className={panelClass}>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['link', 'Связь'],
            ['keys', 'Клавиши'],
            ['flags', 'Флаги'],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            className={cn(
              'min-h-10 rounded-xl border text-sm font-semibold',
              props.section === id
                ? 'border-accent/50 bg-accent/20 text-accent-soft'
                : 'border-white/15 bg-white/8 text-mist/85',
            )}
            onClick={() => props.onSection(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {props.section === 'link' && (
        <div className={panelClass}>
          <p className={sectionTitleClass}>Телефон как камера</p>
          <div className="grid gap-1.5 rounded-2xl border border-white/12 bg-ink-deep/45 px-3 py-3 text-[0.82rem] leading-snug text-mist/80">
            <p>
              <strong className="text-accent-soft">1.</strong> Создай комнату — появится код
            </p>
            <p>
              <strong className="text-accent-soft">2.</strong> На телефоне: QR или «Телефон как
              камера» → код
            </p>
            <p>
              <strong className="text-accent-soft">3.</strong> Смотри «С камеры» и «В эфир» — 2K часто
              стабильнее 4K
            </p>
          </div>

          {props.roomEnabled ? (
            <>
              <div className="grid gap-1 rounded-2xl border border-white/20 bg-ink-deep/55 px-4 py-3.5 text-center">
                <span className="text-[0.75rem] text-[var(--text-muted)]">Код комнаты</span>
                <strong className="font-[family-name:var(--font-display)] text-[clamp(1.4rem,4vw,1.8rem)] font-extrabold tracking-[0.18em] text-paper">
                  {props.roomCode}
                </strong>
              </div>
              {props.qrDataUrl && props.roomJoinUrl && (
                <div className="grid gap-2 rounded-2xl border border-white/12 bg-white/8 px-3 py-3 text-center">
                  <img
                    src={props.qrDataUrl}
                    alt="QR комнаты"
                    className="mx-auto h-[200px] w-[200px] rounded-2xl bg-paper p-2"
                  />
                  <p className="truncate text-[0.72rem] text-mist/60" title={props.roomJoinUrl}>
                    {props.roomJoinUrl}
                  </p>
                </div>
              )}
              <div className={rowClass}>
                <button type="button" className={chipNeutralClass} onClick={props.onCopyCode}>
                  Копировать
                </button>
                <button type="button" className={chipNeutralClass} onClick={props.onNewCode}>
                  Новый код
                </button>
                <button
                  type="button"
                  className={cn(chipBaseClass, 'border border-danger/40 bg-danger/15 text-danger-soft')}
                  onClick={props.onDisableRoom}
                >
                  Отключить
                </button>
              </div>
              <p className={tipClass}>
                {props.roomStatus === 'connected'
                  ? `Телефон подключён${props.trackInfo ? ` · ${props.trackInfo}` : ''}`
                  : props.roomError || `Жду телефон… код ${props.roomCode}`}
              </p>
            </>
          ) : (
            <>
              <button type="button" className={poseSaveClass} onClick={props.onEnableRoom}>
                Создать комнату
              </button>
              <p className={tipClass}>Код только на ПК. Качество стрима выбирается на телефоне.</p>
            </>
          )}
        </div>
      )}

      {props.section === 'keys' && (
        <div className={panelClass}>
          <p className={sectionTitleClass}>Горячие клавиши</p>
          <p className={tipClass}>Зажми клавишу и тяни мышью. Клик по кнопке → назначь новую.</p>
          <div className="grid gap-2">
            {(Object.keys(HOTKEY_LABELS) as HotkeyAction[]).map((action) => (
              <div
                key={action}
                className="grid grid-cols-[1fr_auto] items-center gap-2 rounded-xl border border-white/12 bg-white/8 px-3 py-2.5"
              >
                <span className="text-[0.82rem] text-mist/85">{HOTKEY_LABELS[action]}</span>
                <button
                  type="button"
                  className={cn(
                    'min-h-9 min-w-[4.5rem] rounded-[10px] border border-accent/40 px-2.5 text-[0.78rem] font-bold',
                    props.listeningFor === action
                      ? 'bg-accent/35 text-accent-ink'
                      : 'bg-accent/15 text-accent-soft',
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
          <button
            type="button"
            className={chipNeutralClass}
            onClick={() => {
              props.setHotkeys({ ...DEFAULT_HOTKEYS })
              props.onHotkeysResetToast()
            }}
          >
            Сбросить по умолчанию
          </button>
        </div>
      )}

      {props.section === 'flags' && (
        <div className={panelClass}>
          <p className={sectionTitleClass}>Фичефлаги</p>
          <p className={tipClass}>Выключи, если фича мешает — хранится в localStorage.</p>
          <div className="grid gap-2">
            {FLAG_LABELS.map(([key, label]) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/12 bg-white/8 px-3 py-2.5 text-[0.84rem] text-paper"
              >
                <span>{label}</span>
                <input
                  type="checkbox"
                  checked={props.flags[key]}
                  onChange={(event) =>
                    props.onFlags((prev) => ({
                      ...prev,
                      [key]: event.target.checked,
                    }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
