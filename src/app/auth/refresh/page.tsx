'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createBrowserAccount, createBrowserClient } from '@/infrastructure/appwrite/client'
import { setSessionJwt } from '@/app/auth/actions'

export default function RefreshPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const refresh = async () => {
      try {
        const account = createBrowserAccount(createBrowserClient())
        const { jwt } = await account.createJWT()
        await setSessionJwt(jwt)
        const qs = searchParams.toString()
        router.replace(qs ? `/?${qs}` : '/')
      } catch {
        router.replace('/auth/login')
      }
    }
    refresh()
  }, [router, searchParams])

  return <p className="p-8 text-sm text-muted-foreground">Refreshing session…</p>
}
