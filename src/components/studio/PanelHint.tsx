import { getHelpTip } from '../../lib/helpTips'
import { useHelp } from '../HelpSystem'
import { cn } from './studioUi'

type PanelHintProps = {
  tipId: string
  className?: string
}

/** «?» у заголовка панели: hover-подсказка + клик открывает справку */
export function PanelHint({ tipId, className }: PanelHintProps) {
  const tip = getHelpTip(tipId)
  const { openTip } = useHelp()
  if (!tip) return null

  return (
    <span className={cn('group relative inline-flex shrink-0', className)}>
      <button
        type="button"
        className="grid h-6 w-6 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] text-[0.7rem] font-bold leading-none text-[var(--fg-muted)] transition-colors hover:border-accent/45 hover:text-[var(--chip-accent-fg)]"
        aria-label="Краткая подсказка"
        title={tip.body}
        onClick={(event) => {
          event.stopPropagation()
          openTip(tipId)
        }}
      >
        ?
      </button>
      <span
        role="tooltip"
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-[calc(100%+0.4rem)] z-[60] hidden w-[min(16.5rem,calc(100vw-3rem))] rounded-xl border border-[var(--glass-border)] bg-[var(--panel-solid)] px-3 py-2 text-left text-[0.75rem] leading-snug text-[var(--fg-muted)] shadow-[var(--shadow-glass)] group-hover:block group-focus-within:block"
      >
        {tip.body}
      </span>
    </span>
  )
}
