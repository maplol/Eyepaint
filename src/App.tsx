import { useEffect, useState, type ReactNode } from 'react'
import { CameraRoom } from './components/CameraRoom'
import { HelpProvider } from './components/HelpSystem'
import { Onboarding } from './components/Onboarding'
import { Studio } from './components/Studio'
import { Welcome } from './components/Welcome'
import { type LessonCard } from './lib/lessons'
import {
  CAMERA_COACH_STEPS,
  isCameraTourDone,
  isOnboardingDone,
  isStudioTourDone,
  markCameraTourDone,
  markOnboardingDone,
  markStudioTourDone,
  STUDIO_COACH_STEPS,
  WELCOME_COACH_STEPS,
} from './lib/onboarding'
import {
  clearAutosave,
  loadAutosaveMeta,
  readAutosave,
  readProjectFile,
  type AutosaveMeta,
  type HydratedProject,
} from './lib/projectSession'
import { readJoinCodeFromLocation } from './lib/roomQr'

type Mode = 'welcome' | 'studio' | 'camera'

type LessonBoot = {
  guide: LessonCard['guide']
  opacity: number
  calcStrength?: number
  tip?: string
  title?: string
}

function App() {
  const joinFromUrl = readJoinCodeFromLocation()
  const [mode, setMode] = useState<Mode>(() => (joinFromUrl ? 'camera' : 'welcome'))
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [joinCode] = useState<string | null>(() => joinFromUrl)
  const [showWelcomeTour, setShowWelcomeTour] = useState(
    () => !isOnboardingDone() && !joinFromUrl,
  )
  const [showStudioTour, setShowStudioTour] = useState(() => !isStudioTourDone())
  const [showCameraTour, setShowCameraTour] = useState(
    () => !isCameraTourDone() && Boolean(joinFromUrl),
  )
  const [lessonBoot, setLessonBoot] = useState<LessonBoot | null>(null)
  const [projectBoot, setProjectBoot] = useState<HydratedProject | null>(null)
  const [autosaveMeta, setAutosaveMeta] = useState<AutosaveMeta | null>(() => loadAutosaveMeta())
  const [projectBusy, setProjectBusy] = useState(false)
  const [welcomeError, setWelcomeError] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (imageUrl?.startsWith('blob:')) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const resetStudioUrls = () => {
    setImageUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return null
    })
    setProjectBoot((prev) => {
      if (prev) {
        for (const layer of prev.layers) {
          if (layer.url.startsWith('blob:')) URL.revokeObjectURL(layer.url)
        }
      }
      return null
    })
    setLessonBoot(null)
  }

  const enterStudioFromProject = (project: HydratedProject) => {
    setLessonBoot(null)
    setProjectBoot(project)
    setImageUrl(project.imageUrl)
    setMode('studio')
    setWelcomeError(null)
  }

  const handlePickImage = (file: File) => {
    const next = URL.createObjectURL(file)
    setLessonBoot(null)
    setProjectBoot(null)
    setImageUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return next
    })
    setMode('studio')
  }

  const handleStartLesson = (lesson: LessonCard) => {
    setProjectBoot(null)
    setLessonBoot({
      guide: lesson.guide,
      opacity: lesson.opacity,
      calcStrength: lesson.calcStrength,
      tip: lesson.tip,
      title: lesson.title,
    })
    setImageUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return lesson.image
    })
    setMode('studio')
  }

  const handleOpenProjectFile = (file: File) => {
    setProjectBusy(true)
    setWelcomeError(null)
    void readProjectFile(file)
      .then((project) => {
        enterStudioFromProject(project)
      })
      .catch((error: unknown) => {
        setWelcomeError(error instanceof Error ? error.message : 'Не удалось открыть проект')
      })
      .finally(() => setProjectBusy(false))
  }

  const handleContinueSession = () => {
    setProjectBusy(true)
    setWelcomeError(null)
    void readAutosave()
      .then((project) => {
        if (!project) {
          setAutosaveMeta(null)
          setWelcomeError('Автосейв не найден')
          return
        }
        enterStudioFromProject(project)
      })
      .catch(() => setWelcomeError('Не удалось восстановить сессию'))
      .finally(() => setProjectBusy(false))
  }

  let screen: ReactNode
  if (mode === 'camera') {
    screen = (
      <>
        <CameraRoom
          initialCode={joinCode}
          onExit={() => {
            setMode('welcome')
          }}
        />
        {showCameraTour && (
          <Onboarding
            label="Камера"
            steps={CAMERA_COACH_STEPS}
            onDone={() => {
              markCameraTourDone()
              setShowCameraTour(false)
            }}
          />
        )}
      </>
    )
  } else if (mode === 'studio' && imageUrl) {
    screen = (
      <>
        <Studio
          imageUrl={imageUrl}
          lessonBoot={lessonBoot}
          projectBoot={projectBoot}
          onChangeImage={handlePickImage}
          onAutosaveWritten={(meta) => setAutosaveMeta(meta)}
          onExit={() => {
            resetStudioUrls()
            setAutosaveMeta(loadAutosaveMeta())
            setMode('welcome')
          }}
        />
        {showStudioTour && (
          <Onboarding
            label="Студия"
            steps={STUDIO_COACH_STEPS}
            onDone={() => {
              markStudioTourDone()
              setShowStudioTour(false)
            }}
          />
        )}
      </>
    )
  } else {
    screen = (
      <>
        <Welcome
          onPickImage={handlePickImage}
          onStartCameraRoom={() => {
            setMode('camera')
            if (!isCameraTourDone()) setShowCameraTour(true)
          }}
          onStartLesson={handleStartLesson}
          onOpenProjectFile={handleOpenProjectFile}
          onContinueSession={handleContinueSession}
          autosaveMeta={autosaveMeta}
          projectBusy={projectBusy}
        />
        {welcomeError && (
          <p className="fixed inset-x-4 bottom-[calc(var(--safe-bottom)+1rem)] z-20 rounded-2xl border border-[rgba(239,139,139,0.45)] bg-[rgba(20,26,29,0.88)] px-4 py-3 text-center text-sm text-[#ffb4b4] backdrop-blur-md">
            {welcomeError}
            <button
              type="button"
              className="ml-3 underline"
              onClick={() => {
                void clearAutosave().then(() => setAutosaveMeta(null))
                setWelcomeError(null)
              }}
            >
              Ок
            </button>
          </p>
        )}
        {showWelcomeTour && (
          <Onboarding
            label="Старт"
            steps={WELCOME_COACH_STEPS}
            onDone={() => {
              markOnboardingDone()
              setShowWelcomeTour(false)
            }}
          />
        )}
      </>
    )
  }

  return <HelpProvider>{screen}</HelpProvider>
}

export default App
