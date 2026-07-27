type WelcomeProps = {
  onPickImage: (file: File) => void
  onStartCameraRoom: () => void
}

export function Welcome({ onPickImage, onStartCameraRoom }: WelcomeProps) {
  const handleFile = (file: File | undefined) => {
    if (file) onPickImage(file)
  }

  return (
    <section className="relative isolate grid min-h-dvh overflow-hidden px-[1.1rem] py-[calc(var(--safe-top)+1.5rem)] pb-[calc(var(--safe-bottom)+1.5rem)] text-[var(--paper)] md:pl-[clamp(2rem,8vw,7rem)]">
      <div
        className="absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(160deg,#243038_0%,#1c2428_42%,#151b1f_100%)]"
        aria-hidden="true"
      >
        <span className="animate-soft-float absolute -top-[8%] -right-[10%] size-[58vw] rounded-full bg-[radial-gradient(circle,rgba(224,154,106,0.38),transparent_68%)] blur-[8px]" />
        <span className="animate-soft-float absolute bottom-[8%] -left-[18%] size-[52vw] rounded-full bg-[radial-gradient(circle,rgba(130,176,186,0.28),transparent_70%)] blur-[8px] [animation-delay:-4s]" />
        <span className="animate-soft-float absolute top-[36%] left-[42%] size-[30vw] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)] blur-[8px] [animation-delay:-8s]" />
      </div>

      <div className="relative z-1 grid min-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-3rem)] content-end md:content-center md:justify-items-start min-[1100px]:max-w-[1200px]">
        <div className="glass-panel animate-rise-in w-full max-w-[420px] rounded-[28px] px-[1.35rem] pt-[1.55rem] pb-[1.4rem] md:max-w-[460px]">
          <p className="font-[family-name:var(--font-display)] text-[clamp(2.6rem,11vw,3.6rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-[var(--paper)]">
            EYEPAINT
          </p>
          <h1 className="mt-[1.1rem] max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(1.2rem,4.4vw,1.55rem)] font-semibold leading-[1.25] tracking-[-0.02em] text-[rgba(245,247,248,0.94)]">
            Смотри сквозь референс. Рисуй на бумаге.
          </h1>
          <p className="mt-3 max-w-[34ch] text-[0.96rem] leading-[1.55] text-[var(--text-muted)]">
            Сфотографируй или загрузи фото, наведи камеру на лист и подгони прозрачность — как через
            кальку. На ПК можно принять стрим с телефона.
          </p>

          <div className="mt-[1.6rem] grid gap-[0.65rem]">
            <label className="inline-flex min-h-[3.15rem] cursor-pointer items-center justify-center rounded-full bg-[rgba(224,154,106,0.92)] px-[1.2rem] py-[0.85rem] font-bold tracking-[0.01em] text-[#2a1a10] shadow-[0_10px_28px_rgba(224,154,106,0.22)] transition-[transform,background] duration-150 active:scale-[0.98]">
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

            <label className="inline-flex min-h-[3.15rem] cursor-pointer items-center justify-center rounded-full border border-[var(--line)] bg-white/8 px-[1.2rem] py-[0.85rem] font-bold tracking-[0.01em] text-[var(--paper)] backdrop-blur-[10px] transition-[transform,background] duration-150 active:scale-[0.98]">
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
              className="inline-flex min-h-[3.15rem] items-center justify-center rounded-full border border-[var(--line)] bg-white/8 px-[1.2rem] py-[0.85rem] font-bold tracking-[0.01em] text-[var(--paper)] backdrop-blur-[10px] transition-[transform,background] duration-150 active:scale-[0.98]"
              onClick={onStartCameraRoom}
            >
              Телефон как камера
            </button>
          </div>

          <p className="mt-[0.95rem] text-[0.84rem] text-[rgba(231,238,240,0.52)]">
            Порядок связи: ПК создаёт комнату (код) → телефон вводит этот код и стримит камеру.
          </p>
        </div>
      </div>
    </section>
  )
}
