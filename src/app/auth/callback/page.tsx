'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserAccount, createBrowserClient } from '@/infrastructure/appwrite/client'
import { setSessionJwt } from '@/app/auth/actions'

export default function CallbackPage() {
  const router = useRouter()

  useEffect(() => {
    const bridge = async () => {
      try {
        const account = createBrowserAccount(createBrowserClient())
        const { jwt } = await account.createJWT()
        await setSessionJwt(jwt)
        router.replace('/')
      } catch {
        router.replace('/auth/login')
      }
    }
    bridge()
  }, [router])

  return <p className="p-8 text-sm text-muted-foreground">Signing in…</p>
}
