import React, { createContext, useContext, useEffect, useState } from 'react'
import { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Client, Merchant } from '../types'

interface AuthContextValue {
  session: Session | null
  user: User | null
  role: 'client' | 'merchant' | null
  client: Client | null
  merchant: Merchant | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>({
  session: null,
  user: null,
  role: null,
  client: null,
  merchant: null,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<'client' | 'merchant' | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Safety timeout: if INITIAL_SESSION never fires (edge case on cold start)
    const timeout = setTimeout(() => setLoading(false), 8000)

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Clear the safety timeout as soon as any event arrives
      clearTimeout(timeout)

      // PASSWORD_RECOVERY / USER_UPDATED : flow de reset mot de passe
      // Ne pas charger le profil ni déclencher de redirect
      if (event === 'PASSWORD_RECOVERY' || event === 'USER_UPDATED') return

      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadProfile(session.user)
      } else {
        setRole(null)
        setClient(null)
        setMerchant(null)
        setLoading(false)
      }
    })

    return () => {
      clearTimeout(timeout)
      subscription.unsubscribe()
    }
  }, [])

  async function loadProfile(u: User) {
    const userRole = u.user_metadata?.role as 'client' | 'merchant' | undefined

    if (!userRole) {
      await supabase.auth.signOut()
      setRole(null)
      setClient(null)
      setMerchant(null)
      setLoading(false)
      return
    }

    setRole(userRole)

    try {
      if (userRole === 'client') {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', u.id)
          .single()
        if (!data) {
          await supabase.auth.signOut()
          setRole(null)
          return
        }
        setClient(data)
        setMerchant(null)
      } else if (userRole === 'merchant') {
        const { data } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', u.id)
          .single()
        if (!data) {
          await supabase.auth.signOut()
          setRole(null)
          return
        }
        setMerchant(data)
        setClient(null)
      }
    } finally {
      setLoading(false)
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function refreshProfile() {
    if (user) await loadProfile(user)
  }

  return (
    <AuthContext.Provider
      value={{ session, user, role, client, merchant, loading, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
