import { getHelpTip } from '../../lib/helpTips'
import { useHelp } from '../HelpSystem'
import { HoverTooltip } from './HoverTooltip'
import { cn } from './studioUi'

type PanelHintProps = {
  tipId: string
  className?: string
}

/** «?» у заголовка панели: portal-тултип + клик открывает справку */
export function PanelHint({ tipId, className }: PanelHintProps) {
  const tip = getHelpTip(tipId)
  const { openTip } = useHelp()
  if (!tip) return null

  return (
    <HoverTooltip label={tip.body} className={className} onTriggerClick={() => openTip(tipId)}>
      <button
        type="button"
        className={cn(
          'grid h-6 w-6 place-items-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-fill-mid)] text-[0.7rem] font-bold leading-none text-[var(--fg-muted)] transition-colors hover:border-accent/45 hover:text-[var(--chip-accent-fg)]',
        )}
        aria-label="Краткая подсказка"
      >
        ?
      </button>
    </HoverTooltip>
  )
}
