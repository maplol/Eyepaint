import { useState } from 'react'
import { ONBOARDING_STEPS } from '../lib/onboarding'

type OnboardingProps = {
  onDone: () => void
}

export function Onboarding({ onDone }: OnboardingProps) {
  const [step, setStep] = useState(0)
  const current = ONBOARDING_STEPS[step]
  if (!current) return null

  const isLast = step >= ONBOARDING_STEPS.length - 1

  return (
    <div className="fixed inset-0 z-[80] grid place-items-end bg-ink-deep/70 p-4 backdrop-blur-sm sm:place-items-center">
      <div className="glass-panel animate-rise-in w-full max-w-md rounded-3xl p-5 text-paper">
        <p className="text-[0.75rem] font-semibold tracking-[0.08em] text-accent-soft uppercase">
          Старт · {step + 1}/{ONBOARDING_STEPS.length}
        </p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-xl font-bold">
          {current.title}
        </h2>
        <p className="mt-2 text-[0.95rem] leading-relaxed text-mist/80">{current.body}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full border border-white/20 bg-white/10 font-semibold"
            onClick={onDone}
          >
            Пропустить
          </button>
          <button
            type="button"
            className="min-h-11 flex-1 rounded-full bg-accent font-bold text-accent-ink"
            onClick={() => {
              if (isLast) onDone()
              else setStep((value) => value + 1)
            }}
          >
            {isLast ? 'Понятно' : 'Дальше'}
          </button>
        </div>
      </div>
    </div>
  )
}
