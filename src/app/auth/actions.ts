'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/infrastructure/supabase/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { SignInWithGitHubUseCase } from '@/application/use-cases/SignInWithGitHubUseCase'
import { SignOutUseCase } from '@/application/use-cases/SignOutUseCase'

export async function signInWithGitHub() {
  const origin = (await headers()).get('origin')
  const client = await createClient()
  const authRepository = new AUTH_REPOSITORY(client)
  const url = await new SignInWithGitHubUseCase(authRepository).execute(
    `${origin}/auth/callback`
  )
  redirect(url)
}

export async function signOut() {
  const client = await createClient()
  const authRepository = new AUTH_REPOSITORY(client)
  await new SignOutUseCase(authRepository).execute()
  redirect('/auth/login')
}
