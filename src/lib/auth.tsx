import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, type Profile, type UserRole } from './supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  role: UserRole | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [bootstrapped, setBootstrapped] = useState(false)

  // Boot — resolve initial session. Only after this completes do we know whether
  // there is a user to fetch a profile for.
  useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setBootstrapped(true)
      // If there is no user, we are done loading. If there IS a user, the profile
      // effect below will take over and clear loading once the profile is fetched.
      if (!data.session?.user) setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess)
      setUser(sess?.user ?? null)
    })
    return () => { mounted = false; sub.subscription.unsubscribe() }
  }, [])

  // Profile fetch — runs whenever user changes (sign in / sign out / refresh).
  useEffect(() => {
    let mounted = true
    if (!user) {
      setProfile(null)
      // Don't touch loading here BEFORE getSession completes — that's the bug
      // that bounced authenticated users to /login on hard refresh.
      if (bootstrapped) setLoading(false)
      return
    }
    setLoading(true)
    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (!mounted) return
      if (error) console.warn('Profile fetch error:', error.message)
      setProfile((data as Profile) ?? null)
      setLoading(false)
    })()
    return () => { mounted = false }
  }, [user, bootstrapped])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signUp(email: string, password: string, fullName: string) {
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role: 'citizen' } },
    })
    return { error: error?.message ?? null }
  }

  async function signOut() { await supabase.auth.signOut() }

  async function refreshProfile() {
    if (!user) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile((data as Profile) ?? null)
  }

  return (
    <AuthContext.Provider value={{
      session, user, profile, role: profile?.role ?? null,
      loading, signIn, signUp, signOut, refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
