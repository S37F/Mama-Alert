import { useCallback, useState } from 'react'
import { getCurrentPosition } from '@/services/geolocation'

export function useGeolocation(): {
  lat: number | null
  lng: number | null
  accuracy: number | null
  error: string | null
  isLoading: boolean
  capture: () => void
} {
  const [lat, setLat] = useState<number | null>(null)
  const [lng, setLng] = useState<number | null>(null)
  const [accuracy, setAccuracy] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const capture = useCallback(() => {
    setIsLoading(true)
    setError(null)
    void getCurrentPosition()
      .then((pos) => {
        setLat(pos.lat)
        setLng(pos.lng)
        setAccuracy(pos.accuracyM)
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Geolocation error')
        setLat(null)
        setLng(null)
        setAccuracy(null)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [])

  return { lat, lng, accuracy, error, isLoading, capture }
}
