import '@testing-library/jest-dom'

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock environment variables
process.env.NEXT_PUBLIC_BACKEND_URL = 'https://jewgo.onrender.com'
process.env.NEXT_PUBLIC_ADMIN_TOKEN = 'test-admin-token'
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.APPLE_OAUTH_ENABLED = 'true'
process.env.ANONYMOUS_AUTH = 'true'

// Mock fetch globally
global.fetch = jest.fn()

// Mock Next.js/WHATWG Request class
global.Request = class Request {
  constructor(url, options = {}) {
    this._url = typeof url === 'string' ? url : url?.toString?.() || '';
    this.method = options.method || 'GET';
    this.headers = new Map(Object.entries(options.headers || {}));
    this.body = options.body;
  }

  get url() {
    return this._url;
  }

  get(name) {
    return this.headers.get(name);
  }
}

// Mock Next.js Response class
global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.headers = new Map(Object.entries(options.headers || {}));
  }
  
  get(name) {
    return this.headers.get(name);
  }
  
  json() {
    return Promise.resolve(this.body);
  }
}

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
}

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  // error: jest.fn(),
}

// Mock rate-limiting module
jest.mock('@/lib/rate-limiting', () => ({
  checkRateLimit: jest.fn().mockResolvedValue({
    allowed: true,
    remaining_attempts: 10,
    reset_in_seconds: 3600,
    retry_after: 0
  }),
  checkIdempotency: jest.fn().mockResolvedValue({
    exists: false,
    result: null
  }),
  storeIdempotencyResult: jest.fn().mockResolvedValue(true),
  generateIdempotencyKey: jest.fn().mockReturnValue('test-key'),
  clearRateLimit: jest.fn().mockResolvedValue(true)
}))

// Allow tests to control Supabase mocks per-suite

// Mock Next.js cookies
jest.mock('next/headers', () => ({
  cookies: jest.fn(() => ({
    get: jest.fn(() => ({ value: 'test-cookie' })),
    set: jest.fn(),
    delete: jest.fn()
  }))
})) 
