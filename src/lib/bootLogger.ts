/**
 * Structured dev-only logger for the app boot sequence.
 * Never logs in production. Automatically redacts sensitive field names.
 */

const SENSITIVE = ['token', 'password', 'secret', 'key', 'email', 'qr', 'session', 'auth']

function sanitize(data: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(data).map(([k, v]) => [
      k,
      SENSITIVE.some((s) => k.toLowerCase().includes(s)) ? '[REDACTED]' : v,
    ])
  )
}

export function bootLog(step: string, data?: Record<string, unknown>): void {
  if (__DEV__) {
    if (data) {
      console.log(`[Boot] ${step}`, sanitize(data))
    } else {
      console.log(`[Boot] ${step}`)
    }
  }
}
