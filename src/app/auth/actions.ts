'use server'

import { redirect } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { createAdminClient, createSessionClient } from '@/infrastructure/appwrite/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { SignInWithGitHubUseCase } from '@/application/use-cases/SignInWithGitHubUseCase'
import { SignOutUseCase } from '@/application/use-cases/SignOutUseCase'

export async function signInWithGitHub() {
  const origin = (await headers()).get('origin') ?? ''
  const { account } = createAdminClient()
  const authRepository = new AUTH_REPOSITORY(account)
  const url = await new SignInWithGitHubUseCase(authRepository).execute(
    `${origin}/auth/callback`,
    `${origin}/auth/login`,
  )
  redirect(url)
}

export async function setSessionJwt(jwt: string) {
  const cookieStore = await cookies()
  cookieStore.set('appwrite_jwt', jwt, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30-day cookie; the JWT inside expires after 15 min
  })
}

export async function signOut() {
  const { account } = await createSessionClient()
  const authRepository = new AUTH_REPOSITORY(account)
  await new SignOutUseCase(authRepository).execute()

  const cookieStore = await cookies()
  cookieStore.delete('appwrite_jwt')

  redirect('/auth/login')
}
