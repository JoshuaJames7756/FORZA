import { useState, useEffect } from 'react'
import { supabase, supabaseAuth } from '../lib/supabase' // ✅ ambos clientes

export function useAuth() {
  const [user, setUser]       = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabaseAuth.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchProfile(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchProfile(session.user.id)
        else {
          setProfile(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId) {
    const { data, error } = await supabaseAuth  // ✅ cliente de datos
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    
    if (error) console.warn('fetchProfile error:', error.message)
    else setProfile(data)

    setLoading(false)
  }

  // ✅ ESTE ERA EL BUG — faltaba el return
  return {
    user,
    profile,
    loading,
    isPro:   profile?.is_pro   ?? false,
    isAdmin: profile?.is_admin ?? false,
  }
}