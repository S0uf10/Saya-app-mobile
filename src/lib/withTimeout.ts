/**
 * Wraps a promise with a hard deadline. If the promise doesn't settle within
 * `ms` milliseconds, the returned promise rejects with a descriptive error.
 *
 * Use this around every Supabase call at startup so that no network hiccup
 * can leave the app stuck on a loader indefinitely.
 */
export function withTimeout<T>(
  promise: PromiseLike<T>,
  ms: number,
  label = 'Operation'
): Promise<T> {
  let timerId: ReturnType<typeof setTimeout>

  const timeout = new Promise<never>((_, reject) => {
    timerId = setTimeout(
      () => reject(new Error(`[Timeout] ${label} a dépassé ${ms}ms`)),
      ms
    )
  })

  // Promise.resolve() converts PromiseLike (e.g. PostgrestBuilder) to a full
  // Promise so that Promise.race() can compete it against the timeout.
  return Promise.race([Promise.resolve(promise), timeout]).finally(() =>
    clearTimeout(timerId)
  )
}
