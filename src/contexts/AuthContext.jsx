import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const isEmailConfirmed = (u) => u?.email_confirmed_at || u?.confirmed_at

    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        // Invalid refresh token — clear stale session
        supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }
      const u = session?.user ?? null
      if (u && !isEmailConfirmed(u)) {
        // Email not confirmed yet — don't treat as logged in
        supabase.auth.signOut()
        setUser(null)
        setLoading(false)
        return
      }
      setUser(u)
      if (u) fetchProfile(u.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      if (u && !isEmailConfirmed(u)) {
        // Signup fired a session but email not confirmed — sign out silently
        supabase.auth.signOut()
        setUser(null)
        setProfile(null)
        setLoading(false)
        return
      }
      setUser(u)
      if (u) fetchProfile(u.id)
      else { setProfile(null); setLoading(false) }
    })

    return () => subscription.unsubscribe()
  }, [])

  const fetchProfile = async (userId) => {
    const { data, error } = await supabase.from('profiles').select('id, email, display_name, avatar_url, created_at').eq('id', userId).single()
    if (error) console.error('fetchProfile failed:', error)
    setProfile(data)
    setLoading(false)
  }

  const signUp = async (email, password, displayName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: `${window.location.origin}/connexion?confirmed=true`,
      }
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    try {
      await supabase.auth.signOut()
    } catch (e) {
      console.error('signOut failed:', e)
    }
    setUser(null)
    setProfile(null)
    try { localStorage.removeItem('ws_active_project') } catch {}
  }

  const updateProfile = async (updates) => {
    if (!user) return
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .single()
    if (data) setProfile(data)
    return { data, error }
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
