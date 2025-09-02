import { useState, useEffect, useCallback } from 'react'
import { EateryDB } from '@/types/listing'

interface UseEateryDetailsReturn {
  data: EateryDB | null
  loading: boolean
  error: string | null
  refetch: () => void
}

export function useEateryDetails(eateryId: string): UseEateryDetailsReturn {
  const [data, setData] = useState<EateryDB | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchEateryDetails = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`/api/eateries/${eateryId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch eatery: ${response.statusText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch eatery details')
      }
      
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }, [eateryId])

  useEffect(() => {
    if (eateryId) {
      fetchEateryDetails()
    }
  }, [eateryId, fetchEateryDetails])

  return {
    data,
    loading,
    error,
    refetch: fetchEateryDetails
  }
}
