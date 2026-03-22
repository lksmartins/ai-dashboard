'use client'

import { useState, useEffect } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/infrastructure/supabase/client'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const client = createClient()

    client.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setAccessToken(session?.provider_token ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = client.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setAccessToken(session?.provider_token ?? null)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  return { user, accessToken, loading }
}
