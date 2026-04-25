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
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadProfile(session.user)
      } else {
        setLoading(false)
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
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

    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(u: User) {
    const userRole = u.user_metadata?.role as 'client' | 'merchant' | undefined
    setRole(userRole ?? null)

    try {
      if (userRole === 'client') {
        const { data } = await supabase
          .from('clients')
          .select('*')
          .eq('user_id', u.id)
          .single()
        setClient(data ?? null)
        setMerchant(null)
      } else if (userRole === 'merchant') {
        const { data } = await supabase
          .from('merchants')
          .select('*')
          .eq('user_id', u.id)
          .single()
        setMerchant(data ?? null)
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
