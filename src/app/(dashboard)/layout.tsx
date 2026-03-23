import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createSessionClient } from '@/infrastructure/appwrite/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { GetUserUseCase } from '@/application/use-cases/GetUserUseCase'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { account } = await createSessionClient()
  const authRepository = new AUTH_REPOSITORY(account)
  const user = await new GetUserUseCase(authRepository).execute()

  if (!user) {
    const cookieStore = await cookies()
    // JWT cookie present but getUser() failed means the JWT expired.
    // Redirect to /auth/refresh so the client can silently mint a new one
    // using the still-valid Appwrite browser session.
    if (cookieStore.has('appwrite_jwt')) {
      redirect('/auth/refresh')
    }
    redirect('/auth/login')
  }

  return <>{children}</>
}
