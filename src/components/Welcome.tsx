type WelcomeProps = {
  onPickImage: (file: File) => void
  onStartCameraRoom: () => void
}

const ctaBase =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-5 py-3.5 font-bold tracking-[0.01em] transition-[transform,background] duration-150 active:scale-[0.98]'

export function Welcome({ onPickImage, onStartCameraRoom }: WelcomeProps) {
  const handleFile = (file: File | undefined) => {
    if (file) onPickImage(file)
  }

  return (
    <section className="relative isolate grid min-h-dvh overflow-hidden px-4 py-[calc(var(--safe-top)+1.5rem)] pb-[calc(var(--safe-bottom)+1.5rem)] text-paper md:pl-[clamp(2rem,8vw,7rem)]">
      <div
        className="absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(160deg,#243038_0%,#1c2428_42%,#151b1f_100%)]"
        aria-hidden="true"
      >
        <span className="animate-soft-float absolute -top-[8%] -right-[10%] size-[58vw] rounded-full bg-[radial-gradient(circle,rgba(224,154,106,0.38),transparent_68%)] blur-lg" />
        <span className="animate-soft-float absolute bottom-[8%] -left-[18%] size-[52vw] rounded-full bg-[radial-gradient(circle,rgba(130,176,186,0.28),transparent_70%)] blur-lg [animation-delay:-4s]" />
        <span className="animate-soft-float absolute top-[36%] left-[42%] size-[30vw] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)] blur-lg [animation-delay:-8s]" />
      </div>

      <div className="relative z-[1] grid min-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-3rem)] content-end md:content-center md:justify-items-start min-[1100px]:max-w-[1200px]">
        <div className="glass-panel animate-rise-in w-full max-w-[420px] rounded-[28px] px-5 pt-6 pb-5 md:max-w-[460px]">
          <p className="font-[family-name:var(--font-display)] text-[clamp(2.6rem,11vw,3.6rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-paper">
            EYEPAINT
          </p>
          <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(1.2rem,4.4vw,1.55rem)] font-semibold leading-snug tracking-[-0.02em] text-paper/95">
            Смотри сквозь референс. Рисуй на бумаге.
          </h1>
          <p className="mt-3 max-w-[34ch] text-[0.96rem] leading-relaxed text-[var(--text-muted)]">
            Сфотографируй или загрузи фото, наведи камеру на лист и подгони прозрачность — как через
            кальку. На ПК можно принять стрим с телефона.
          </p>

          <div className="mt-6 grid gap-2.5">
            <label
              className={`${ctaBase} bg-accent text-accent-ink shadow-[0_10px_28px_rgba(224,154,106,0.22)]`}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="pointer-events-none absolute h-px w-px opacity-0"
                onChange={(event) => {
                  handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              Сфотографировать
            </label>

            <label
              className={`${ctaBase} border border-white/25 bg-white/10 text-paper backdrop-blur-md`}
            >
              <input
                type="file"
                accept="image/*"
                className="pointer-events-none absolute h-px w-px opacity-0"
                onChange={(event) => {
                  handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              Из галереи
            </label>

            <button
              type="button"
              className={`${ctaBase} border border-white/25 bg-white/10 text-paper backdrop-blur-md`}
              onClick={onStartCameraRoom}
            >
              Телефон как камера
            </button>
          </div>

          <p className="mt-4 text-[0.84rem] text-mist/50">
            Порядок связи: ПК создаёт комнату (код) → телефон вводит этот код и стримит камеру.
          </p>
        </div>
      </div>
    </section>
  )
}
