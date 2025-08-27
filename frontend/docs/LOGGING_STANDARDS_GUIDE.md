# Logging Standards Guide

This project uses a lightweight, structured logger for consistent server and client logging. Console logging is disallowed via ESLint (`no-console`). Use the provided logger utilities instead.

## Loggers

- `adminLogger` (server: admin API routes)
  - Import: `import { adminLogger } from '@/lib/utils/logger'`
  - Use for all `/api/admin/*` handlers
- `appLogger` (client/server: app pages, actions, non-admin API)
  - Import: `import { appLogger } from '@/lib/utils/logger'`
  - Use in app pages, server actions, and public/non-admin APIs

## API

```
adminLogger.debug(message: string, context?: Record<string, any>)
adminLogger.info(message: string, context?: Record<string, any>)
adminLogger.warn(message: string, context?: Record<string, any>)
adminLogger.error(message: string, context?: Record<string, any>)
```

- `debug|info|warn` only emit in development; `error` emits in all environments.
- `context` is JSON-stringified into the log line for easier troubleshooting.
- Messages are prefixed with ISO timestamp, logger prefix (e.g., `ADMIN`), and level.

## Usage Examples

```ts
import { adminLogger } from '@/lib/utils/logger'

export async function GET() {
  try {
    adminLogger.info('Fetching restaurants', { page, pageSize })
    // ...
  } catch (error) {
    adminLogger.error('Restaurant list error', { error: String(error) })
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

```ts
import { appLogger } from '@/lib/utils/logger'

export default function ErrorBoundary({ error }: { error: Error }) {
  useEffect(() => {
    appLogger.error('Global error caught', { error: String(error) })
  }, [error])
  return <div>Something went wrong</div>
}
```

## ESLint

- `no-console` is enabled; do not use `console.log|warn|error` directly.
- If you must temporarily allow console in very narrow cases, scope with `// eslint-disable-next-line no-console`.
- Prefer adding context objects over string concatenation.

## Production Transports (optional)

The current implementation writes to stdout. To forward logs to a provider:

- Add a transport in `lib/utils/logger.ts` based on `process.env.LOG_SINK` (e.g., HTTP endpoint, Logflare, Datadog).
- Keep error logging synchronous and robust. Non-blocking, best-effort for info/debug.

## Migration Checklist

- [x] Admin API routes use `adminLogger` exclusively
- [x] Non-admin pages and actions use `appLogger`
- [x] Removed `/* eslint-disable no-console */` from admin routes
- [x] Tests ensure logger methods don’t throw and dev branches work

