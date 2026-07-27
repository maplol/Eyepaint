import './Welcome.css'

type WelcomeProps = {
  onPickImage: (file: File) => void
}

export function Welcome({ onPickImage }: WelcomeProps) {
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

      <div className="welcome__panel">
        <p className="welcome__mark">EYEPAINT</p>
        <h1 className="welcome__title">Смотри сквозь референс. Рисуй на бумаге.</h1>
        <p className="welcome__lead">
          Сфотографируй или загрузи фото, наведи камеру на лист и подгони прозрачность — как
          через кальку.
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
        </div>

        <p className="welcome__hint">Удобнее с телефона: задняя камера смотрит на лист</p>
      </div>
    </section>
  )
}
