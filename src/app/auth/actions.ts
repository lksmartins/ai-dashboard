'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createAdminClient, createSessionClient } from '@/infrastructure/appwrite/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { SignInWithGitHubUseCase } from '@/application/use-cases/SignInWithGitHubUseCase'
import { SignOutUseCase } from '@/application/use-cases/SignOutUseCase'

export async function signInWithGitHub() {
  const origin = (await headers()).get('origin')
  const { account } = createAdminClient()
  const authRepository = new AUTH_REPOSITORY(account)
  const url = await new SignInWithGitHubUseCase(authRepository).execute(
    `${origin}/auth/callback`,
    `${origin}/auth/login`,
  )
  redirect(url)
}

export async function signOut() {
  const { account } = await createSessionClient()
  const authRepository = new AUTH_REPOSITORY(account)
  await new SignOutUseCase(authRepository).execute()
  redirect('/auth/login')
}
