'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserAccount, createBrowserClient } from '@/infrastructure/appwrite/client'
import { setSessionJwt } from '@/app/auth/actions'

export default function RefreshPage() {
  const router = useRouter()

  useEffect(() => {
    const refresh = async () => {
      try {
        const account = createBrowserAccount(createBrowserClient())
        const { jwt } = await account.createJWT()
        await setSessionJwt(jwt)
        router.replace('/')
      } catch {
        router.replace('/auth/login')
      }
    }
    refresh()
  }, [router])

  return <p className="p-8 text-sm text-muted-foreground">Refreshing session…</p>
}
