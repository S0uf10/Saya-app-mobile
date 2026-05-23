import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Client, Merchant } from '../types'
import { withTimeout } from '../lib/withTimeout'
import { bootLog } from '../lib/bootLogger'

// ─── Types ────────────────────────────────────────────────────────────────────

export type BootStep =
  | 'getting_session'
  | 'loading_profile'
  | 'ready'
  | 'error'

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: 'client' | 'merchant' | null
  client: Client | null
  merchant: Merchant | null
  /** Alias for isBootstrapping — kept for backward compatibility with screens */
  loading: boolean
  isBootstrapping: boolean
  bootStep: BootStep
  bootError: string | null
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  retryBoot: () => void
}

// ─── Timeouts ─────────────────────────────────────────────────────────────────

const SESSION_TIMEOUT_MS = 8_000
const PROFILE_TIMEOUT_MS = 8_000
const BG_SESSION_TIMEOUT_MS = 5_000

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  client: null,
  merchant: null,
  loading: true,
  isBootstrapping: true,
  bootStep: 'getting_session',
  bootError: null,
  signOut: async () => {},
  refreshProfile: async () => {},
  retryBoot: () => {},
})

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'client' | 'merchant' | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [bootStep, setBootStep] = useState<BootStep>('getting_session')
  const [bootError, setBootError] = useState<string | null>(null)

  /**
   * Monotonically-increasing boot ID. Each new boot() call gets a fresh ID.
   * Any async operation that runs under an older ID is silently dropped,
   * which prevents stale setState calls from a previous (cancelled) boot.
   */
  const bootIdRef = useRef(0)
  const isMountedRef = useRef(true)
  const userRef = useRef<User | null>(null)

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  // Keep a ref in sync with user so refreshProfile never captures a stale closure.
  useEffect(() => {
    userRef.current = user
  }, [user])

  // ── Core boot sequence ───────────────────────────────────────────────────────

  const boot = useCallback(async (bootId: number) => {
    // Guard: abort if this boot was superseded or the component unmounted.
    const alive = () => bootId === bootIdRef.current && isMountedRef.current
    if (!alive()) return

    const t0 = Date.now()
    setIsBootstrapping(true)
    setBootError(null)
    setBootStep('getting_session')
    bootLog('boot:start', { bootId })

    // ── Step 1: Retrieve session ─────────────────────────────────────────────

    let currentSession: Session | null = null

    try {
      const { data, error } = await withTimeout(
        supabase.auth.getSession(),
        SESSION_TIMEOUT_MS,
        'getSession'
      )
      if (!alive()) return
      if (error) throw error
      currentSession = data.session
      bootLog('boot:session', { hasSession: !!currentSession, ms: Date.now() - t0 })
    } catch (err) {
      if (!alive()) return
      const msg =
        err instanceof Error
          ? err.message
          : 'Impossible de récupérer la session'
      bootLog('boot:session:error', { msg })
      setBootStep('error')
      setBootError(msg)
      setIsBootstrapping(false)
      return
    }

    setSession(currentSession)
    setUser(currentSession?.user ?? null)

    // No session → go to login, nothing more to load.
    if (!currentSession?.user) {
      bootLog('boot:no_session', { ms: Date.now() - t0 })
      setRole(null)
      setClient(null)
      setMerchant(null)
      setBootStep('ready')
      setIsBootstrapping(false)
      return
    }

    // ── Step 2: Load profile ─────────────────────────────────────────────────

    setBootStep('loading_profile')
    const u = currentSession.user
    const userRole = u.user_metadata?.role as 'client' | 'merchant' | undefined

    if (!userRole) {
      // User exists in auth but has no role metadata — sign out and redirect.
      bootLog('boot:no_role')
      supabase.auth.signOut().catch(() => {})
      setSession(null)
      setUser(null)
      setRole(null)
      setClient(null)
      setMerchant(null)
      setBootStep('ready')
      setIsBootstrapping(false)
      return
    }

    setRole(userRole)

    try {
      if (userRole === 'client') {
        bootLog('boot:load_client:start')
        const { data, error } = await withTimeout(
          supabase.from('clients').select('*').eq('user_id', u.id).single(),
          PROFILE_TIMEOUT_MS,
          'load_client'
        )
        if (!alive()) return
        if (error || !data) {
          bootLog('boot:client:not_found')
          supabase.auth.signOut().catch(() => {})
          setSession(null)
          setUser(null)
          setRole(null)
          setClient(null)
          setMerchant(null)
          setBootStep('ready')
          setIsBootstrapping(false)
          return
        }
        setClient(data)
        setMerchant(null)
        bootLog('boot:load_client:done', { ms: Date.now() - t0 })
      } else {
        bootLog('boot:load_merchant:start')
        const { data, error } = await withTimeout(
          supabase.from('merchants').select('*').eq('user_id', u.id).single(),
          PROFILE_TIMEOUT_MS,
          'load_merchant'
        )
        if (!alive()) return
        if (error || !data) {
          bootLog('boot:merchant:not_found')
          supabase.auth.signOut().catch(() => {})
          setSession(null)
          setUser(null)
          setRole(null)
          setClient(null)
          setMerchant(null)
          setBootStep('ready')
          setIsBootstrapping(false)
          return
        }
        setMerchant(data)
        setClient(null)
        bootLog('boot:load_merchant:done', { ms: Date.now() - t0 })
      }
    } catch (err) {
      if (!alive()) return
      const msg =
        err instanceof Error ? err.message : 'Impossible de charger le profil'
      bootLog('boot:profile:error', { msg })
      setBootStep('error')
      setBootError(msg)
      setIsBootstrapping(false)
      return
    }

    if (!alive()) return
    setBootStep('ready')
    setIsBootstrapping(false)
    bootLog('boot:done', { ms: Date.now() - t0 })
  }, [])

  // ── Public: retry the full boot sequence ─────────────────────────────────

  const retryBoot = useCallback(() => {
    const id = ++bootIdRef.current
    boot(id)
  }, [boot])

  // ── Effects ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    // Initial boot on mount.
    boot(bootIdRef.current)

    // React to auth state changes that happen after the initial boot.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        // INITIAL_SESSION is handled by the explicit boot() above.
        if (event === 'INITIAL_SESSION') return
        // Password/update flows don't need a profile reload.
        if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') return

        if (event === 'TOKEN_REFRESHED') {
          // Only update the session object — no need to reload the profile.
          if (isMountedRef.current) setSession(newSession)
          return
        }

        bootLog('authStateChange', { event })

        if (newSession?.user) {
          // New sign-in → re-run full boot to load the profile.
          const id = ++bootIdRef.current
          boot(id)
        } else {
          // SIGNED_OUT → clear all state immediately.
          if (isMountedRef.current) {
            setSession(null)
            setUser(null)
            setRole(null)
            setClient(null)
            setMerchant(null)
            setBootStep('ready')
            setIsBootstrapping(false)
          }
        }
      }
    )

    // When the app returns from background, silently revalidate the session.
    // This catches expired tokens without forcing a full reload on the user.
    const appStateSub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state !== 'active' || !isMountedRef.current) return
        bootLog('appState:foreground')

        withTimeout(
          supabase.auth.getSession(),
          BG_SESSION_TIMEOUT_MS,
          'bg_getSession'
        )
          .then(({ data }) => {
            if (!isMountedRef.current) return
            if (data.session) {
              setSession(data.session)
            } else if (userRef.current) {
              // Session expired while in background → clear and let index redirect.
              setSession(null)
              setUser(null)
              setRole(null)
              setClient(null)
              setMerchant(null)
              setBootStep('ready')
            }
          })
          .catch(() => {
            // Network unavailable — keep the last known state.
          })
      }
    )

    return () => {
      subscription.unsubscribe()
      appStateSub.remove()
    }
  }, [boot])

  // ── Stable public API ────────────────────────────────────────────────────────

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    const id = ++bootIdRef.current
    await boot(id)
  }, [boot])

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        role,
        client,
        merchant,
        loading: isBootstrapping,
        isBootstrapping,
        bootStep,
        bootError,
        signOut,
        refreshProfile,
        retryBoot,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
