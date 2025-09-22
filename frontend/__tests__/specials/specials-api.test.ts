import { getRestaurantSpecials } from '@/lib/api/specials'

describe('specials API client', () => {
  const originalFetch = global.fetch

  beforeEach(() => {
    // @ts-ignore
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ specials: [], total: 0, has_more: false, window: 'now' }),
    })
  })

  afterEach(() => {
    global.fetch = originalFetch
    jest.resetAllMocks()
  })

  it('calls the restaurant specials endpoint with window param', async () => {
    await getRestaurantSpecials(123, { window: 'now' })
    expect(global.fetch).toHaveBeenCalled()
    const call = (global.fetch as jest.Mock).mock.calls[0][0]
    expect(String(call)).toMatch(/\/api\/v5\/specials\/restaurants\/123\?window=now/)
  })
})


