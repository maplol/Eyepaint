import { useEffect, useState } from 'react'
import { CameraRoom } from './components/CameraRoom'
import { Onboarding } from './components/Onboarding'
import { Studio } from './components/Studio'
import { Welcome } from './components/Welcome'
import { type LessonCard } from './lib/lessons'
import { isOnboardingDone, markOnboardingDone } from './lib/onboarding'
import { readJoinCodeFromLocation } from './lib/roomQr'

type Mode = 'welcome' | 'studio' | 'camera'

type LessonBoot = {
  guide: LessonCard['guide']
  opacity: number
  calcStrength?: number
}

function App() {
  const joinFromUrl = readJoinCodeFromLocation()
  const [mode, setMode] = useState<Mode>(() => (joinFromUrl ? 'camera' : 'welcome'))
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [joinCode] = useState<string | null>(() => joinFromUrl)
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone() && !joinFromUrl)
  const [lessonBoot, setLessonBoot] = useState<LessonBoot | null>(null)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const handlePickImage = (file: File) => {
    const next = URL.createObjectURL(file)
    setLessonBoot(null)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next
    })
    setMode('studio')
  }

  const handleStartLesson = (lesson: LessonCard) => {
    setLessonBoot({
      guide: lesson.guide,
      opacity: lesson.opacity,
      calcStrength: lesson.calcStrength,
    })
    setImageUrl((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
      return lesson.image
    })
    setMode('studio')
  }

  if (mode === 'camera') {
    return (
      <CameraRoom
        initialCode={joinCode}
        onExit={() => {
          setMode('welcome')
        }}
      />
    )
  }

  if (mode === 'studio' && imageUrl) {
    return (
      <>
        <Studio
          imageUrl={imageUrl}
          lessonBoot={lessonBoot}
          onChangeImage={handlePickImage}
          onExit={() => {
            setImageUrl((prev) => {
              if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev)
              return null
            })
            setLessonBoot(null)
            setMode('welcome')
          }}
        />
        {showOnboarding && (
          <Onboarding
            onDone={() => {
              markOnboardingDone()
              setShowOnboarding(false)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <Welcome
        onPickImage={handlePickImage}
        onStartCameraRoom={() => setMode('camera')}
        onStartLesson={handleStartLesson}
      />
      {showOnboarding && (
        <Onboarding
          onDone={() => {
            markOnboardingDone()
            setShowOnboarding(false)
          }}
        />
      )}
    </>
  )
}

export default App
