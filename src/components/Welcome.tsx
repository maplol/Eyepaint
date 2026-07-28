import { HelpToggleButton } from './HelpSystem'
import { LESSONS, type LessonCard } from '../lib/lessons'
import { loadFlags } from '../lib/flags'
import { PROJECT_ACCEPT, formatAutosaveTime, type AutosaveMeta } from '../lib/projectSession'

type WelcomeProps = {
  onPickImage: (file: File) => void
  onStartCameraRoom: () => void
  onStartLesson?: (lesson: LessonCard) => void
  onOpenProjectFile?: (file: File) => void
  onContinueSession?: () => void
  autosaveMeta?: AutosaveMeta | null
  projectBusy?: boolean
}

const ctaBase =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-full px-5 py-3.5 font-bold tracking-[0.01em] transition-[transform,background] duration-150 active:scale-[0.98]'

export function Welcome({
  onPickImage,
  onStartCameraRoom,
  onStartLesson,
  onOpenProjectFile,
  onContinueSession,
  autosaveMeta,
  projectBusy,
}: WelcomeProps) {
  const handleFile = (file: File | undefined) => {
    if (file) onPickImage(file)
  }
  const lessonsEnabled = loadFlags().lessons

  return (
    <section className="relative isolate grid min-h-dvh overflow-x-hidden overflow-y-auto px-4 py-[calc(var(--safe-top)+1.5rem)] pb-[calc(var(--safe-bottom)+1.5rem)] text-paper md:pl-[clamp(2rem,8vw,7rem)]">
      <div
        className="absolute inset-0 -z-10 overflow-hidden bg-[linear-gradient(160deg,#243038_0%,#1c2428_42%,#151b1f_100%)]"
        aria-hidden="true"
      >
        <span className="animate-soft-float absolute -top-[8%] -right-[10%] size-[58vw] rounded-full bg-[radial-gradient(circle,rgba(224,154,106,0.38),transparent_68%)] blur-lg" />
        <span className="animate-soft-float absolute bottom-[8%] -left-[18%] size-[52vw] rounded-full bg-[radial-gradient(circle,rgba(130,176,186,0.28),transparent_70%)] blur-lg [animation-delay:-4s]" />
        <span className="animate-soft-float absolute top-[36%] left-[42%] size-[30vw] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.12),transparent_70%)] blur-lg [animation-delay:-8s]" />
      </div>

      <div className="absolute right-4 top-[calc(var(--safe-top)+1rem)] z-[2]">
        <HelpToggleButton />
      </div>

      <div className="relative z-[1] grid min-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-3rem)] content-end md:content-center md:justify-items-start min-[1100px]:max-w-[1200px]">
        <div className="glass-panel animate-rise-in w-full max-w-[420px] rounded-[28px] px-5 pt-6 pb-5 md:max-w-[460px]">
          <p
            data-help="welcome-brand"
            className="font-[family-name:var(--font-display)] text-[clamp(2.6rem,11vw,3.6rem)] font-extrabold leading-[0.92] tracking-[-0.04em] text-paper"
          >
            EYEPAINT
          </p>
          <h1 className="mt-4 max-w-[16ch] font-[family-name:var(--font-display)] text-[clamp(1.2rem,4.4vw,1.55rem)] font-semibold leading-snug tracking-[-0.02em] text-paper/95">
            Смотри сквозь референс. Рисуй на бумаге.
          </h1>
          <p className="mt-3 max-w-[34ch] text-[0.96rem] leading-relaxed text-[var(--text-muted)]">
            Сфотографируй или загрузи фото, наведи камеру на лист и подгони прозрачность — как через
            кальку. На ПК можно принять стрим с телефона. Жми «?» и кликай по кнопкам — расскажем, что
            делает каждая.
          </p>

          <div className="mt-6 grid gap-2.5">
            {autosaveMeta && onContinueSession && (
              <button
                type="button"
                data-help="welcome-continue"
                className={`${ctaBase} bg-accent text-accent-ink shadow-[0_10px_28px_rgba(224,154,106,0.22)]`}
                disabled={projectBusy}
                onClick={onContinueSession}
              >
                Продолжить сессию
                <span className="ml-2 text-[0.78rem] font-semibold opacity-80">
                  · {formatAutosaveTime(autosaveMeta.savedAt)}
                </span>
              </button>
            )}

            <label
              data-help="welcome-capture"
              className={`${ctaBase} ${autosaveMeta ? 'border border-white/25 bg-white/10 text-paper backdrop-blur-md' : 'bg-accent text-accent-ink shadow-[0_10px_28px_rgba(224,154,106,0.22)]'}`}
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
              data-help="welcome-gallery"
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

            {onOpenProjectFile && (
              <label
                data-help="welcome-project"
                className={`${ctaBase} border border-white/25 bg-white/10 text-paper backdrop-blur-md`}
              >
                <input
                  type="file"
                  accept={PROJECT_ACCEPT}
                  className="pointer-events-none absolute h-px w-px opacity-0"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) onOpenProjectFile(file)
                    event.target.value = ''
                  }}
                />
                Открыть проект
              </label>
            )}

            <button
              type="button"
              data-help="welcome-phone"
              className={`${ctaBase} border border-white/25 bg-white/10 text-paper backdrop-blur-md`}
              onClick={onStartCameraRoom}
            >
              Телефон как камера
            </button>
          </div>

          {lessonsEnabled && onStartLesson && (
            <div className="mt-5 grid gap-2">
              <p className="text-[0.78rem] font-semibold uppercase tracking-[0.06em] text-mist/55">
                Уроки
              </p>
              {LESSONS.map((lesson) => (
                <button
                  key={lesson.id}
                  type="button"
                  data-help={`welcome-lesson-${lesson.id}`}
                  className="rounded-2xl border border-white/15 bg-white/8 px-3.5 py-3 text-left transition-colors hover:bg-white/12"
                  onClick={() => onStartLesson(lesson)}
                >
                  <p className="text-[0.92rem] font-bold text-paper">{lesson.title}</p>
                  <p className="mt-0.5 text-[0.78rem] text-mist/60">{lesson.description}</p>
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-[0.84rem] text-mist/50">
            Порядок связи: ПК создаёт комнату (код) → телефон вводит этот код и стримит камеру.
          </p>
        </div>
      </div>
    </section>
  )
}
