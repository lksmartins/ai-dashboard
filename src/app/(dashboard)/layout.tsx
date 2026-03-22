import { redirect } from 'next/navigation'
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

  if (!user) redirect('/auth/login')

  return <>{children}</>
}
