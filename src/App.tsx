import { useEffect, useState } from 'react'
import { CameraRoom } from './components/CameraRoom'
import { Onboarding } from './components/Onboarding'
import { Studio } from './components/Studio'
import { Welcome } from './components/Welcome'
import { isOnboardingDone, markOnboardingDone } from './lib/onboarding'
import { readJoinCodeFromLocation } from './lib/roomQr'

type Mode = 'welcome' | 'studio' | 'camera'

function App() {
  const joinFromUrl = readJoinCodeFromLocation()
  const [mode, setMode] = useState<Mode>(() => (joinFromUrl ? 'camera' : 'welcome'))
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [joinCode] = useState<string | null>(() => joinFromUrl)
  const [showOnboarding, setShowOnboarding] = useState(() => !isOnboardingDone() && !joinFromUrl)

  useEffect(() => {
    return () => {
      if (imageUrl) URL.revokeObjectURL(imageUrl)
    }
  }, [imageUrl])

  const handlePickImage = (file: File) => {
    const next = URL.createObjectURL(file)
    setImageUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return next
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
          onChangeImage={handlePickImage}
          onExit={() => {
            setImageUrl((prev) => {
              if (prev) URL.revokeObjectURL(prev)
              return null
            })
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
