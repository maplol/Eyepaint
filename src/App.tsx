import { useEffect, useState } from 'react'
import { CameraRoom } from './components/CameraRoom'
import { Studio } from './components/Studio'
import { Welcome } from './components/Welcome'

type Mode = 'welcome' | 'studio' | 'camera'

function App() {
  const [mode, setMode] = useState<Mode>('welcome')
  const [imageUrl, setImageUrl] = useState<string | null>(null)

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
    return <CameraRoom onExit={() => setMode('welcome')} />
  }

  if (mode === 'studio' && imageUrl) {
    return (
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
    )
  }

  return (
    <Welcome
      onPickImage={handlePickImage}
      onStartCameraRoom={() => setMode('camera')}
    />
  )
}

export default App
