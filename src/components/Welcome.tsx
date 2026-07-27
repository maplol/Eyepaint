import './Welcome.css'

type WelcomeProps = {
  onPickImage: (file: File) => void
}

export function Welcome({ onPickImage }: WelcomeProps) {
  return (
    <section className="welcome">
      <div className="welcome__atmosphere" aria-hidden="true" />
      <div className="welcome__grain" aria-hidden="true" />

      <header className="welcome__brand">
        <p className="welcome__mark">EYEPAINT</p>
        <h1 className="welcome__title">Смотри сквозь референс. Рисуй на бумаге.</h1>
        <p className="welcome__lead">
          Загрузи фото, наведи камеру на лист, подгони прозрачность — и срисовывай как через
          кальку.
        </p>
      </header>

      <div className="welcome__actions">
        <label className="welcome__cta">
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) onPickImage(file)
            }}
          />
          Загрузить референс
        </label>
        <p className="welcome__hint">Лучше с телефона: задняя камера смотрит на лист</p>
      </div>
    </section>
  )
}
