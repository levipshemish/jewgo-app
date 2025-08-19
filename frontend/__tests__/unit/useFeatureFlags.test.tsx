import { renderHook, waitFor, render } from '@testing-library/react'
import React from 'react'

import { useFeatureFlags, useFeatureFlag } from '@/lib/hooks/useFeatureFlags'

// Mock fetch globally
global.fetch = jest.fn()

describe('useFeatureFlags', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch feature flags on mount', async () => {
    const mockResponse = {
      feature_flags: {
        test_flag: {
          enabled: true,
          description: 'Test flag',
          version: '1.0',
          rollout_percentage: 100,
          target_environments: ['development']
        }
      },
      environment: 'development',
      user_id: 'test_user'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.flags).toEqual(mockResponse.feature_flags)
    expect(result.current.environment).toBe('development')
    expect(result.current.userId).toBe('test_user')
  })

  it('should handle fetch errors', async () => {
    const error = new Error('Network error')
    ;(fetch as jest.Mock).mockRejectedValueOnce(error)

    const { result } = renderHook(() => useFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toEqual(error)
  })

  it('should check if feature is enabled', async () => {
    const mockResponse = {
      feature_flags: {
        enabled_flag: {
          enabled: true,
          description: 'Enabled flag',
          version: '1.0',
          rollout_percentage: 100,
          target_environments: ['development']
        },
        disabled_flag: {
          enabled: false,
          description: 'Disabled flag',
          version: '1.0',
          rollout_percentage: 0,
          target_environments: ['development']
        }
      },
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useFeatureFlags())

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.isFeatureEnabled('enabled_flag')).toBe(true)
    expect(result.current.isFeatureEnabled('disabled_flag')).toBe(false)
    expect(result.current.isFeatureEnabled('non_existent_flag', true)).toBe(true)
  })

  it('should auto-refresh when enabled', async () => {
    jest.useFakeTimers()

    const mockResponse = {
      feature_flags: {},
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    })

    renderHook(() => useFeatureFlags({ autoRefresh: true, refreshInterval: 1000 }))

    expect(fetch).toHaveBeenCalledTimes(1)

    // Fast-forward time
    jest.advanceTimersByTime(1000)

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(2)
    })

    jest.useRealTimers()
  })
})

describe('useFeatureFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return feature flag status', async () => {
    const mockResponse = {
      feature_flags: {
        test_flag: {
          enabled: true,
          description: 'Test flag',
          version: '1.0',
          rollout_percentage: 100,
          target_environments: ['development']
        }
      },
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useFeatureFlag('test_flag'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(true)
    expect(result.current.flag).toEqual(mockResponse.feature_flags.test_flag)
  })

  it('should use default value when flag not found', async () => {
    const mockResponse = {
      feature_flags: {},
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { result } = renderHook(() => useFeatureFlag('non_existent_flag', true))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.enabled).toBe(true)
    expect(result.current.flag).toBeUndefined()
  })
})

describe('FeatureFlag component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render children when feature is enabled', async () => {
    const mockResponse = {
      feature_flags: {
        test_flag: {
          enabled: true,
          description: 'Test flag',
          version: '1.0',
          rollout_percentage: 100,
          target_environments: ['development']
        }
      },
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { FeatureFlag } = await import('@/lib/hooks/useFeatureFlags')
    const { getByText } = render(
      <FeatureFlag name="test_flag" defaultEnabled={false}>
        <div>Feature content</div>
      </FeatureFlag>
    )

    await waitFor(() => {
      expect(getByText('Feature content')).toBeInTheDocument()
    })
  })

  it('should render fallback when feature is disabled', async () => {
    const mockResponse = {
      feature_flags: {
        test_flag: {
          enabled: false,
          description: 'Test flag',
          version: '1.0',
          rollout_percentage: 0,
          target_environments: ['development']
        }
      },
      environment: 'development'
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const { FeatureFlag } = await import('@/lib/hooks/useFeatureFlags')
    const { getByText } = render(
      <FeatureFlag name="test_flag" defaultEnabled={false} fallback={<div>Fallback content</div>}>
        <div>Feature content</div>
      </FeatureFlag>
    )

    await waitFor(() => {
      expect(getByText('Fallback content')).toBeInTheDocument()
    })
  })

  it('should show loading state', async () => {
    // Mock a slow response
    ;(fetch as jest.Mock).mockImplementationOnce(() => new Promise(resolve => setTimeout(resolve, 100)))

    const { FeatureFlag } = await import('@/lib/hooks/useFeatureFlags')
    const { getByText } = render(
      <FeatureFlag name="test_flag" defaultEnabled={false}>
        <div>Feature content</div>
      </FeatureFlag>
    )

    expect(getByText('Loading...')).toBeInTheDocument()
  })
}) 