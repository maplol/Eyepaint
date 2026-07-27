import { cn } from './studioUi'

type StableLabelProps = {
  active: boolean
  on: string
  off: string
  className?: string
}

/** Keeps button width stable when on/off labels differ in length. */
export function StableLabel({ active, on, off, className }: StableLabelProps) {
  const wider = on.length >= off.length ? on : off
  return (
    <span className={cn('relative inline-grid place-items-center', className)}>
      <span className="invisible col-start-1 row-start-1 whitespace-nowrap" aria-hidden="true">
        {wider}
      </span>
      <span className="col-start-1 row-start-1 whitespace-nowrap">{active ? on : off}</span>
    </span>
  )
}
