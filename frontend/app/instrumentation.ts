export async function register() {
  // Hook Sentry or console diagnostics here
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // eslint-disable-next-line no-console
    console.log('[boot] runtime=node');
  } else if (process.env.NEXT_RUNTIME === 'edge') {
    // eslint-disable-next-line no-console
    console.log('[boot] runtime=edge');
  }
}
