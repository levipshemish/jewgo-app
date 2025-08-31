import { useState, useEffect } from 'react'

interface UseImageLoaderOptions {
  src: string | null | undefined
  fallbackSrc?: string
  retryCount?: number
  retryDelay?: number
}

export function useImageLoader({ 
  src, 
  fallbackSrc, 
  retryCount = 2, 
  retryDelay = 1000 
}: UseImageLoaderOptions) {
  const [imageSrc, setImageSrc] = useState<string | null>(src || null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [retries, setRetries] = useState(0)

  useEffect(() => {
    if (!src) {
      setIsLoading(false)
      setHasError(true)
      return
    }

    setIsLoading(true)
    setHasError(false)
    setRetries(0)
    setImageSrc(src)

    const img = new Image()
    
    const handleLoad = () => {
      setIsLoading(false)
      setHasError(false)
    }

    const handleError = () => {
      if (retries < retryCount) {
        // Retry after delay
        setTimeout(() => {
          setRetries(prev => prev + 1)
          img.src = src
        }, retryDelay)
      } else if (fallbackSrc && imageSrc !== fallbackSrc) {
        // Try fallback
        setImageSrc(fallbackSrc)
        setRetries(0)
        img.src = fallbackSrc
      } else {
        // Give up
        setIsLoading(false)
        setHasError(true)
      }
    }

    img.onload = handleLoad
    img.onerror = handleError
    img.src = src

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [src, fallbackSrc, retryCount, retryDelay, retries, imageSrc])

  return {
    src: imageSrc,
    isLoading,
    hasError,
    retries
  }
}
