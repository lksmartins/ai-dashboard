import { redirect } from 'next/navigation'
import { createClient } from '@/infrastructure/supabase/server'
import { AUTH_REPOSITORY } from '@/infrastructure/di/container'
import { GetUserUseCase } from '@/application/use-cases/GetUserUseCase'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const client = await createClient()
  const authRepository = new AUTH_REPOSITORY(client)
  const user = await new GetUserUseCase(authRepository).execute()

  if (!user) redirect('/auth/login')

  return <>{children}</>
}
