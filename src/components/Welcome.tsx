import './Welcome.css'

type WelcomeProps = {
  onPickImage: (file: File) => void
  onStartCameraRoom: () => void
}

export function Welcome({ onPickImage, onStartCameraRoom }: WelcomeProps) {
  const handleFile = (file: File | undefined) => {
    if (file) onPickImage(file)
  }

  return (
    <section className="welcome">
      <div className="welcome__atmosphere" aria-hidden="true">
        <span className="welcome__orb welcome__orb--one" />
        <span className="welcome__orb welcome__orb--two" />
        <span className="welcome__orb welcome__orb--three" />
      </div>

      <div className="welcome__shell">
        <div className="welcome__panel">
          <p className="welcome__mark">EYEPAINT</p>
          <h1 className="welcome__title">Смотри сквозь референс. Рисуй на бумаге.</h1>
          <p className="welcome__lead">
            Сфотографируй или загрузи фото, наведи камеру на лист и подгони прозрачность — как через
            кальку. На ПК можно принять стрим с телефона.
          </p>

          <div className="welcome__actions">
            <label className="welcome__cta welcome__cta--primary">
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(event) => {
                  handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              Сфотографировать
            </label>

            <label className="welcome__cta welcome__cta--ghost">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  handleFile(event.target.files?.[0])
                  event.target.value = ''
                }}
              />
              Из галереи
            </label>

            <button type="button" className="welcome__cta welcome__cta--ghost" onClick={onStartCameraRoom}>
              Телефон как камера
            </button>
          </div>

          <p className="welcome__hint">
            Мобилка — над листом. ПК — студия и референс. Связь через комнату во вкладке «Связь».
          </p>
        </div>
      </div>
    </section>
  )
}
