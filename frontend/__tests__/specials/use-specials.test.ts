import { renderHook, act } from '@testing-library/react'
import { useSpecials } from '@/hooks/use-specials'

jest.mock('@/lib/api/specials', () => ({
  specialsApi: {
    getRestaurantSpecials: jest.fn().mockResolvedValue({ specials: [], total: 0, has_more: false }),
  },
}))

describe('useSpecials', () => {
  it('initializes and fetches specials', async () => {
    const { result } = renderHook(() => useSpecials(123, { window: 'now' }))
    expect(result.current.loading).toBe(true)
    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
    expect(Array.isArray(result.current.specials)).toBe(true)
  })
})


