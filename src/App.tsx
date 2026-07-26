import { useEffect, useState } from 'react'
import { Welcome } from './components/Welcome'
import { Studio } from './components/Studio'

function App() {
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
  }

  if (!imageUrl) {
    return <Welcome onPickImage={handlePickImage} />
  }

  return (
    <Studio
      imageUrl={imageUrl}
      onChangeImage={handlePickImage}
      onExit={() => {
        setImageUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev)
          return null
        })
      }}
    />
  )
}

export default App
