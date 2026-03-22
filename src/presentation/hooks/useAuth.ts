'use client'

import { useState, useEffect } from 'react'
import { AuthUser } from '@/domain/repositories/IAuthRepository'
import { createBrowserClient, createBrowserAccount } from '@/infrastructure/appwrite/client'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const account = createBrowserAccount(createBrowserClient())
    const authRepository = new AUTH_REPOSITORY(account)

    Promise.all([
      authRepository.getUser(),
      authRepository.getAccessToken(),
    ]).then(([u, t]) => {
      setUser(u)
      setAccessToken(t)
      setLoading(false)
    })
  }, [])

  return { user, accessToken, loading }
}
